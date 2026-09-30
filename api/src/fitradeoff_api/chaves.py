"""Cofre das chaves do MCP remoto.

Uma chave e uma credencial portadora: quem a tem, entra. Tres decisoes deste
arquivo vem disso.

**Guardamos o resumo, nunca a chave.** O texto da chave existe uma vez, na
resposta que a criou, e nunca e gravado. Se o arquivo daqui for lido por quem
nao devia, nao ha nada para reusar. E por isso que perder a chave nao tem
recuperacao: so revogar e emitir outra.

**Resumo por SHA-256, e nao por bcrypt ou argon2.** Isso seria erro se a chave
fosse senha escolhida por gente -- mas ela e aleatoria de 256 bits, e nao existe
dicionario que a alcance. O custo artificial de um KDF protegeria contra um
ataque que nao se aplica, e cobraria esse custo em toda chamada de ferramenta.
A comparacao e em tempo constante, que e a protecao que aqui importa.

**Um prefixo visivel.** Sem ele, a tela mostraria tres linhas indistinguiveis e
quem fosse revogar a errada nao teria como perceber. O prefixo e curto o
bastante para nao ajudar quem quer adivinhar o resto.

**Toda chave vence.** Uma credencial portadora sem prazo vale para sempre
depois de vazar num log ou num historico. A de pessoa vence em
``FITRADEOFF_CHAVE_DIAS`` (90 por padrao); a do dono tambem, salvo quando ele
pede ``--dias 0`` na linha de comando -- escolha explicita, nunca padrao.
Chaves gravadas antes deste campo existir: a de pessoa vence 90 dias depois de
criada (``VALIDADE_LEGADA``); a do dono continua sem prazo, porque derrubar o
assistente do dono num deploy, sem aviso, seria pior do que o risco que ela ja
carregava -- revogar e emitir outra resolve quando ele quiser.

**Dois processos, um arquivo.** A API e o MCP gravam o mesmo cofre. Toda
leitura-alteracao-gravacao passa por uma trava de arquivo (``_trava``); sem
ela, revogar enquanto o MCP carimbava o ultimo uso ressuscitava a chave
revogada, porque o carimbo regravava a lista lida antes da revogacao.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import tempfile
import threading
import time
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import asdict, dataclass, replace
from datetime import datetime, timedelta, timezone
from pathlib import Path

from .config import Settings

logger = logging.getLogger(__name__)

PREFIXO = "fit_"
"""Marca o texto como chave desta plataforma quando aparece fora de contexto."""

# 32 bytes de aleatoriedade, em base64url: 256 bits, o mesmo porte de um token
# de API de servico. Nao ha razao para economizar aqui -- ninguem digita isto,
# copia-se.
_BYTES = 32

LIMITE = 50
"""Teto de chaves vivas do DONO da plataforma.

Nao e restricao de negocio: e o mesmo motivo do teto do rascunho -- um cliente
com defeito chamando a criacao em laco nao deve encher o disco em silencio.
"""

LIMITE_POR_PESSOA = 10
"""Teto de chaves vivas de cada pessoa. Um assistente por aparelho cabe folgado."""

LIMITE_TOTAL = 5000
"""Teto do cofre inteiro, somando todo mundo -- o arquivo e reescrito inteiro a
cada emissao, e sem teto um laco de criacao em varias contas o faria crescer
sem limite."""

# O dono de uma chave de pessoa e o nome do diretorio do acervo dela: o resumo
# de 32 hexadecimais que identidade.acervo_de calcula. Conferido na leitura e na
# resolucao -- um arquivo adulterado com "../" no dono nao pode apontar para
# fora de /dados/pessoas.
_DONO_VALIDO = re.compile(r"^[0-9a-f]{32}$")

LIMITE_ROTULO = 60

# A gravacao do ultimo uso e reduzida a esta granularidade. Sem isso, cada
# chamada de ferramenta reescreveria o arquivo inteiro, e uma conversa de vinte
# perguntas viraria vinte reescritas para registrar o mesmo minuto.
GRANULARIDADE_DE_USO = timedelta(minutes=1)

VALIDADE_LEGADA = timedelta(days=90)
"""Prazo das chaves de PESSOA gravadas antes de ``expira_em`` existir.

Fixo, e nao ``FITRADEOFF_CHAVE_DIAS``: mudar a validade das chaves novas nao
deve mudar, de tabela, o prazo das que ja estao nas maos das pessoas.
"""

PURGA = timedelta(days=30)
"""Uma chave vencida ha mais que isto sai do arquivo na proxima emissao.

Fica visivel como "vencida" por um tempo -- quem estranhar o assistente parado
descobre o motivo na tela --, mas nao para sempre: sem purga, cada rodada de
chaves vencidas somaria linhas mortas ao arquivo que se reescreve inteiro.
"""


class CofreCorrompido(Exception):
    """O arquivo existe mas nao e um cofre legivel. Gravar por cima apagaria tudo."""


@dataclass(frozen=True)
class Chave:
    """O que se sabe de uma chave depois que o texto dela foi esquecido."""

    id: str
    rotulo: str
    prefixo: str
    resumo: str
    criada_em: str
    ultimo_uso: str | None = None
    # De quem e a chave. None: do dono da plataforma (emitida pela linha de
    # comando ou com o token de administracao) -- abre o acervo principal,
    # como toda chave abria antes. Preenchido: de uma pessoa que entrou pelo
    # FasorX -- abre so o acervo dela.
    dono: str | None = None
    # Quando deixa de valer. None: nada gravado -- ver ``vence_em`` para o que
    # isso quer dizer em cada tipo de chave.
    expira_em: str | None = None

    def vence_em(self) -> datetime | None:
        """O vencimento efetivo, ja com a regra das chaves antigas.

        None so para chave do dono sem prazo. Data ilegivel conta como vencida:
        uma chave de prazo desconhecido nao deve abrir nada.
        """
        try:
            if self.expira_em:
                return datetime.fromisoformat(self.expira_em)
            if self.dono is not None:
                return datetime.fromisoformat(self.criada_em) + VALIDADE_LEGADA
        except ValueError:
            return datetime.min.replace(tzinfo=timezone.utc)
        return None

    def vencida(self, agora: datetime | None = None) -> bool:
        vence = self.vence_em()
        if vence is None:
            return False
        return (agora or datetime.now(timezone.utc)) >= vence

    def publica(self) -> dict[str, str | None]:
        """A forma que pode sair na resposta: tudo menos o resumo.

        ``expira_em`` sai ja calculado, inclusive para as chaves antigas: a tela
        mostra o prazo que de fato vale, e nao o que esta gravado.
        """
        vence = self.vence_em()
        return {
            "id": self.id,
            "rotulo": self.rotulo,
            "prefixo": self.prefixo,
            "criada_em": self.criada_em,
            "ultimo_uso": self.ultimo_uso,
            "expira_em": vence.isoformat(timespec="seconds") if vence else None,
        }


def caminho(settings: Settings) -> Path:
    """Fora do diretorio das decisoes, pelo mesmo motivo do rascunho.

    O repositorio do motor lista decisoes com ``glob("*.json")``: um arquivo de
    chaves ali dentro apareceria na lista de decisoes salvas como registro
    corrompido.
    """
    return settings.storage.parent / "chaves.json"


def _resumir(chave: str) -> str:
    return hashlib.sha256(chave.encode("utf-8")).hexdigest()


def _ler(settings: Settings, estrito: bool = False) -> list[Chave]:
    """As chaves do arquivo.

    ``estrito`` e para quem vai gravar em seguida: com o arquivo corrompido,
    levanta ``CofreCorrompido`` em vez de devolver lista vazia -- porque a
    gravacao seguinte, feita a partir dessa lista vazia, apagaria todas as
    chaves de uma vez. Quem so le (a tela, a resolucao) trata o corrompido como
    "nenhuma chave": fecha a porta sem derrubar nada.
    """
    arquivo = caminho(settings)
    if not arquivo.exists():
        return []
    try:
        bruto = json.loads(arquivo.read_text(encoding="utf-8"))
        registros = bruto["chaves"]
        if not isinstance(registros, list):
            raise TypeError("chaves nao e lista")
    except (json.JSONDecodeError, UnicodeDecodeError, KeyError, TypeError) as exc:
        if estrito:
            raise CofreCorrompido(
                f"O arquivo de chaves ({arquivo.name}) esta ilegivel. Nada foi "
                "gravado, para nao apagar as chaves que ele ainda guarda; "
                "restaure-o ou remova-o manualmente."
            ) from exc
        logger.warning("cofre de chaves ilegivel: %s", type(exc).__name__)
        return []
    chaves: list[Chave] = []
    for registro in registros:
        try:
            chaves.append(
                Chave(
                    id=str(registro["id"]),
                    rotulo=str(registro["rotulo"]),
                    prefixo=str(registro["prefixo"]),
                    resumo=str(registro["resumo"]),
                    criada_em=str(registro["criada_em"]),
                    ultimo_uso=(
                        str(registro["ultimo_uso"])
                        if registro.get("ultimo_uso")
                        else None
                    ),
                    dono=(str(registro["dono"]) if registro.get("dono") else None),
                    expira_em=(
                        str(registro["expira_em"])
                        if registro.get("expira_em")
                        else None
                    ),
                )
            )
        except (KeyError, TypeError, AttributeError):
            # Registro sem o que uma chave precisa nao autentica ninguem;
            # ignora-lo mantem as outras chaves valendo.
            continue
    return chaves


def _gravar(settings: Settings, chaves: list[Chave]) -> None:
    """Grava a lista inteira. So se chama com ``_trava`` na mao."""
    arquivo = caminho(settings)
    arquivo.parent.mkdir(parents=True, exist_ok=True)
    texto = json.dumps(
        {"chaves": [asdict(c) for c in chaves]}, ensure_ascii=False, indent=1
    )
    # Escrita em dois passos: um corte no meio do write deixaria JSON pela
    # metade. O provisorio tem nome unico (mkstemp), e nao fixo: com o nome fixo
    # de antes, dois processos gravando juntos escreviam no MESMO provisorio, e
    # um publicava o arquivo que o outro ainda escrevia. O fsync antes do
    # replace garante que o conteudo chegou ao disco antes de o nome apontar
    # para ele -- sem isso, uma queda de energia podia deixar o nome novo
    # apontando para um arquivo vazio.
    descritor, provisorio = tempfile.mkstemp(
        dir=arquivo.parent, prefix=".chaves-", suffix=".tmp"
    )
    try:
        with os.fdopen(descritor, "w", encoding="utf-8") as saida:
            saida.write(texto)
            saida.flush()
            os.fsync(saida.fileno())
        os.replace(provisorio, arquivo)
    except BaseException:
        try:
            os.unlink(provisorio)
        except OSError:
            pass
        raise


# A trava de arquivo serializa processos; esta serializa as threads de um
# mesmo processo antes de elas chegarem ao arquivo. No Windows a espera pela
# trava de arquivo e por sondagem, e threads do proprio processo disputando o
# arquivo assim so gastariam tempo.
_trava_local = threading.Lock()


@contextmanager
def _trava(settings: Settings) -> Iterator[None]:
    """Exclusao mutua entre os processos que gravam o cofre (api e mcp).

    A trava fica num arquivo ao lado, e nao no proprio ``chaves.json``: a
    gravacao troca o arquivo por ``os.replace``, e uma trava presa ao arquivo
    antigo nao protegeria quem abrisse o novo.
    """
    arquivo = caminho(settings)
    arquivo.parent.mkdir(parents=True, exist_ok=True)
    trava = arquivo.with_name(arquivo.name + ".trava")
    with _trava_local:
        with open(trava, "a+b") as alca:
            _travar(alca.fileno())
            try:
                yield
            finally:
                _destravar(alca.fileno())


if os.name == "nt":  # pragma: no cover - depende do sistema
    import msvcrt

    def _travar(descritor: int) -> None:
        # LK_LOCK desiste com OSError depois de ~10 s; o laco transforma isso em
        # espera sem prazo, que e o que o flock faz no Linux. Trava o primeiro
        # byte a partir do inicio -- no Windows e permitido travar alem do fim
        # do arquivo, entao o arquivo de trava pode ficar vazio.
        while True:
            os.lseek(descritor, 0, os.SEEK_SET)
            try:
                msvcrt.locking(descritor, msvcrt.LK_LOCK, 1)
                return
            except OSError:
                time.sleep(0.05)

    def _destravar(descritor: int) -> None:
        os.lseek(descritor, 0, os.SEEK_SET)
        msvcrt.locking(descritor, msvcrt.LK_UNLCK, 1)

else:
    import fcntl

    def _travar(descritor: int) -> None:
        fcntl.flock(descritor, fcntl.LOCK_EX)

    def _destravar(descritor: int) -> None:
        fcntl.flock(descritor, fcntl.LOCK_UN)


def listar(settings: Settings, dono: str | None = None) -> list[Chave]:
    """As chaves DESTE dono, da mais nova para a mais velha -- vencidas inclusive.

    Cada um ve so as proprias: a lista de chaves de outra pessoa diria quem usa
    a plataforma e de onde. A vencida continua na lista (ate a ``PURGA``) para
    que quem estranhar o assistente parado descubra o motivo na tela.
    """
    return sorted(
        (c for c in _ler(settings) if c.dono == dono),
        key=lambda c: c.criada_em,
        reverse=True,
    )


def criar(
    settings: Settings,
    rotulo: str,
    dono: str | None = None,
    dias: int | None = None,
) -> tuple[Chave, str]:
    """Emite uma chave. O texto dela sai daqui e nao volta a existir.

    Devolve o registro e o texto, nessa ordem, para que quem chama nao confunda
    um com o outro: o registro pode ir para a tela e para o disco, o texto so
    para a resposta desta chamada.

    ``dias``: validade. None usa ``settings.chave_dias``. Zero e "sem prazo", e
    so vale para o dono da plataforma -- a chave de pessoa sempre vence, porque
    quem a emite pela tela nao escolhe prazo e nao deve herdar um infinito.
    """
    rotulo = rotulo.strip()
    if not rotulo:
        raise ValueError("A chave precisa de um rotulo para ser reconhecida depois.")
    if len(rotulo) > LIMITE_ROTULO:
        raise ValueError(f"Rotulo longo demais (maximo {LIMITE_ROTULO} caracteres).")

    if dono is not None and not _DONO_VALIDO.match(dono):
        raise ValueError("Dono de chave invalido.")

    if dias is None:
        dias = settings.chave_dias
    if dias < 0:
        raise ValueError("A validade da chave nao pode ser negativa.")
    if dias == 0 and dono is not None:
        raise ValueError("Chave de pessoa precisa de validade.")

    agora = datetime.now(timezone.utc)
    with _trava(settings):
        chaves = _ler(settings, estrito=True)
        # Vencidas ha muito saem aqui, na emissao, que ja vai reescrever o
        # arquivo de qualquer jeito.
        chaves = [
            c for c in chaves if (v := c.vence_em()) is None or agora - v < PURGA
        ]
        teto = LIMITE if dono is None else LIMITE_POR_PESSOA
        # A vencida nao conta no teto: ela nao abre nada, e obrigar a pessoa a
        # revogar chave morta antes de emitir a nova seria so atrito.
        vivas = sum(1 for c in chaves if c.dono == dono and not c.vencida(agora))
        if vivas >= teto:
            raise ValueError(
                f"Limite de {teto} chaves alcancado. Revogue as que nao estao em uso."
            )
        if len(chaves) >= LIMITE_TOTAL:
            raise ValueError("O cofre de chaves esta cheio. Fale com o administrador.")

        texto = PREFIXO + secrets.token_urlsafe(_BYTES)
        chave = Chave(
            id=secrets.token_hex(8),
            rotulo=rotulo,
            # Prefixo e sufixo: o inicio diz que e nossa, o fim e o que
            # distingue duas chaves na tela. Oito caracteres de 256 bits nao
            # ajudam a adivinhar o resto.
            prefixo=f"{texto[: len(PREFIXO) + 4]}...{texto[-4:]}",
            resumo=_resumir(texto),
            criada_em=agora.isoformat(timespec="seconds"),
            dono=dono,
            expira_em=(
                (agora + timedelta(days=dias)).isoformat(timespec="seconds")
                if dias
                else None
            ),
        )
        _gravar(settings, [*chaves, chave])
    return chave, texto


def revogar(settings: Settings, id: str, dono: str | None = None) -> bool:
    """Apaga o registro, se for deste dono. Devolve se havia o que apagar.

    O dono entra na busca, e nao so o id: sem isso, quem soubesse (ou
    adivinhasse) o id da chave de outra pessoa a revogaria.

    Apaga, e nao marca como revogada: uma chave revogada nao tem uso futuro, e
    a trilha de auditoria da plataforma e sobre decisoes, nao sobre credenciais.
    """
    with _trava(settings):
        chaves = _ler(settings, estrito=True)
        restantes = [c for c in chaves if not (c.id == id and c.dono == dono)]
        if len(restantes) == len(chaves):
            return False
        _gravar(settings, restantes)
    return True


def _carimbo_velho(chave: Chave, quando: datetime) -> bool:
    """Se o ultimo uso gravado ja passou da granularidade (ou nao existe)."""
    if chave.ultimo_uso is None:
        return True
    try:
        return quando - datetime.fromisoformat(chave.ultimo_uso) >= GRANULARIDADE_DE_USO
    except ValueError:
        return True  # carimbo ilegivel: reescreve


def _marcar_uso(settings: Settings, id: str, quando: datetime) -> None:
    """Registra o uso relendo, sob a trava, antes de gravar.

    A releitura sob trava e o que impede a ressurreicao: se a chave foi revogada
    entre a resolucao e este carimbo, ela nao esta mais na lista relida, e nao
    ha o que carimbar. Sem a trava, a lista lida antes da revogacao era
    regravada inteira -- com a chave revogada dentro.

    Arquivo corrompido: desiste em silencio. Perder um carimbo e aceitavel;
    derrubar a chamada de ferramenta por isso, nao.
    """
    with _trava(settings):
        try:
            chaves = _ler(settings, estrito=True)
        except CofreCorrompido:
            return
        atualizadas: list[Chave] = []
        mudou = False
        for chave in chaves:
            if chave.id != id:
                atualizadas.append(chave)
                continue
            if not _carimbo_velho(chave, quando):
                return
            # replace, e nao Chave(...) campo a campo: montada a mao, a copia
            # perderia qualquer campo novo -- foi o que quase aconteceu com o
            # dono.
            atualizadas.append(
                replace(chave, ultimo_uso=quando.isoformat(timespec="seconds"))
            )
            mudou = True
        if mudou:
            _gravar(settings, atualizadas)


# Indice resumo -> chave, por arquivo, valido enquanto o arquivo nao mudar. Sem
# ele, cada chamada de ferramenta do MCP relia e analisava o cofre inteiro --
# ate 5000 registros -- so para achar uma linha. A assinatura do arquivo e
# (inode, mtime_ns, tamanho): o os.replace da gravacao troca o inode, entao
# qualquer gravacao invalida o indice mesmo que caia no mesmo tique do relogio
# com o mesmo tamanho.
_indices: dict[str, tuple[tuple[int, int, int], dict[str, Chave]]] = {}
_indices_trava = threading.Lock()


def _indice(settings: Settings) -> dict[str, Chave]:
    arquivo = caminho(settings)
    try:
        estado = arquivo.stat()
    except FileNotFoundError:
        return {}
    assinatura = (estado.st_ino, estado.st_mtime_ns, estado.st_size)
    nome = str(arquivo)
    with _indices_trava:
        guardado = _indices.get(nome)
        if guardado is not None and guardado[0] == assinatura:
            return guardado[1]
    novo = {c.resumo: c for c in _ler(settings)}
    with _indices_trava:
        _indices[nome] = (assinatura, novo)
    return novo


def resolver(settings: Settings):
    """O ``Resolvedor`` que o MCP remoto usa: chave apresentada -> onde gravar.

    A chave abre o acervo do DONO dela -- o mesmo que ele ve na tela:

      - chave de pessoa (emitida por quem entrou pelo FasorX): o acervo dessa
        pessoa, /dados/pessoas/<dono>. O mesmo diretorio que a API abre para o
        token dela, entao a decisao criada pelo Claude aparece no site;
      - chave do dono da plataforma (linha de comando, token de admin): o
        acervo principal, como toda chave abria antes.

    Chave vencida nao abre nada, e nao ganha carimbo de uso: o carimbo diria na
    tela que ela esta em uso quando na verdade foi recusada.

    A decisao de escopo mora aqui, num lugar so -- por isso a assinatura
    devolve caminho, e nao um "sim".
    """

    def para(apresentada: str) -> Path | None:
        alvo = _resumir(apresentada)
        # A busca no dicionario compara por hash, nao em tempo constante. Nao
        # vaza nada util: quem ataca escolhe a chave, nao o resumo SHA-256 dela,
        # entao nao consegue conduzir a comparacao. A conferencia final, abaixo,
        # e em tempo constante mesmo assim.
        chave = _indice(settings).get(alvo)
        if chave is None or not hmac.compare_digest(chave.resumo, alvo):
            return None
        agora = datetime.now(timezone.utc)
        if chave.vencida(agora):
            logger.warning("chave do cofre recusada: vencida (%s)", chave.id)
            return None
        if chave.dono is None:
            destino = settings.storage
        elif _DONO_VALIDO.match(chave.dono):
            destino = settings.storage.parent / "pessoas" / chave.dono
        else:
            # Dono adulterado no arquivo: nao abre nada.
            return None
        # Confere o carimbo no indice antes de pegar a trava: na imensa maioria
        # das chamadas ele e do mesmo minuto, e nao ha o que gravar.
        if _carimbo_velho(chave, agora):
            _marcar_uso(settings, chave.id, agora)
        return destino

    return para


def _cli(argumentos: list[str] | None = None) -> int:
    """Emitir, listar e revogar sem navegador.

        python -m fitradeoff_api.chaves criar "Claude na web"
        python -m fitradeoff_api.chaves criar "Servidor de CI" --dias 0

    Existe por causa do servidor publicado. A tela de chaves mora no aplicativo
    local, que de proposito nao vai junto para o hospedeiro -- entao, num
    servidor, a alternativa seria abrir um tunel ate a API so para clicar num
    botao. Aqui e um comando, no mesmo volume, com o mesmo cofre.
    """
    import argparse

    from .config import load_settings

    leitor = argparse.ArgumentParser(
        prog="python -m fitradeoff_api.chaves",
        description="Chaves do MCP remoto do FITradeoff.",
    )
    comandos = leitor.add_subparsers(dest="comando", required=True)
    comandos.add_parser("listar", help="as chaves emitidas")
    novo = comandos.add_parser("criar", help="emite uma chave")
    novo.add_argument("rotulo", help="onde a chave vai ser usada")
    novo.add_argument(
        "--dias",
        type=int,
        default=None,
        help="validade em dias (padrao: FITRADEOFF_CHAVE_DIAS, 90); 0 = sem prazo",
    )
    fora = comandos.add_parser("revogar", help="apaga uma chave")
    fora.add_argument("id", help="o identificador que `listar` mostra")

    opcoes = leitor.parse_args(argumentos)
    settings = load_settings()

    if opcoes.comando == "listar":
        chaves = listar(settings)
        if not chaves:
            print("Nenhuma chave emitida.")
            return 0
        for chave in chaves:
            uso = chave.ultimo_uso or "nunca usada"
            vence = chave.vence_em()
            if vence is None:
                prazo = "sem prazo"
            elif chave.vencida():
                prazo = "VENCIDA"
            else:
                prazo = f"vence {vence:%Y-%m-%d}"
            print(f"{chave.id}  {chave.prefixo}  {chave.rotulo}  (uso: {uso}; {prazo})")
        return 0

    if opcoes.comando == "criar":
        try:
            chave, texto = criar(settings, opcoes.rotulo, dias=opcoes.dias)
        except (ValueError, CofreCorrompido) as exc:
            print(f"Erro: {exc}")
            return 1
        prazo = f"vence em {chave.expira_em}" if chave.expira_em else "sem prazo"
        print(texto)
        print()
        print(
            f"Chave {chave.id} ({chave.rotulo}, {prazo}). Este texto nao fica "
            "gravado em lugar nenhum: copie agora."
        )
        return 0

    try:
        revogada = revogar(settings, opcoes.id)
    except CofreCorrompido as exc:
        print(f"Erro: {exc}")
        return 1
    if revogada:
        print("Chave revogada.")
        return 0
    print("Chave nao encontrada.")
    return 1


if __name__ == "__main__":
    raise SystemExit(_cli())
