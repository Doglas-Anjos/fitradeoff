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
"""

from __future__ import annotations

import hashlib
import hmac
import json
import secrets
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

from .config import Settings

PREFIXO = "fit_"
"""Marca o texto como chave desta plataforma quando aparece fora de contexto."""

# 32 bytes de aleatoriedade, em base64url: 256 bits, o mesmo porte de um token
# de API de servico. Nao ha razao para economizar aqui -- ninguem digita isto,
# copia-se.
_BYTES = 32

LIMITE = 50
"""Teto de chaves vivas.

Nao e restricao de negocio: e o mesmo motivo do teto do rascunho -- um cliente
com defeito chamando a criacao em laco nao deve encher o disco em silencio.
"""

LIMITE_ROTULO = 60

# A gravacao do ultimo uso e reduzida a esta granularidade. Sem isso, cada
# chamada de ferramenta reescreveria o arquivo inteiro, e uma conversa de vinte
# perguntas viraria vinte reescritas para registrar o mesmo minuto.
GRANULARIDADE_DE_USO = timedelta(minutes=1)


@dataclass(frozen=True)
class Chave:
    """O que se sabe de uma chave depois que o texto dela foi esquecido."""

    id: str
    rotulo: str
    prefixo: str
    resumo: str
    criada_em: str
    ultimo_uso: str | None = None

    def publica(self) -> dict[str, str | None]:
        """A forma que pode sair na resposta: tudo menos o resumo."""
        return {
            "id": self.id,
            "rotulo": self.rotulo,
            "prefixo": self.prefixo,
            "criada_em": self.criada_em,
            "ultimo_uso": self.ultimo_uso,
        }


def caminho(settings: Settings) -> Path:
    """Fora do diretorio das decisoes, pelo mesmo motivo do rascunho.

    O repositorio do motor lista decisoes com ``glob("*.json")``: um arquivo de
    chaves ali dentro apareceria na lista de decisoes salvas como registro
    corrompido.
    """
    return settings.storage.parent / "chaves.json"


def _agora() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _resumir(chave: str) -> str:
    return hashlib.sha256(chave.encode("utf-8")).hexdigest()


def _ler(settings: Settings) -> list[Chave]:
    arquivo = caminho(settings)
    if not arquivo.exists():
        return []
    try:
        bruto = json.loads(arquivo.read_text(encoding="utf-8"))
        registros = bruto["chaves"]
    except (json.JSONDecodeError, KeyError, TypeError):
        # Arquivo truncado por escrita interrompida. Tratar como vazio nao
        # perde acesso a decisao alguma -- perde chaves, que se regeram -- e e
        # melhor do que a tela inteira quebrar na abertura.
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
                )
            )
        except (KeyError, TypeError):
            # Registro sem o que uma chave precisa nao autentica ninguem;
            # ignora-lo mantem as outras chaves valendo.
            continue
    return chaves


def _gravar(settings: Settings, chaves: list[Chave]) -> None:
    arquivo = caminho(settings)
    arquivo.parent.mkdir(parents=True, exist_ok=True)
    texto = json.dumps(
        {"chaves": [asdict(c) for c in chaves]}, ensure_ascii=False, indent=1
    )
    # Escrita em dois passos, como a do rascunho: um corte no meio do write
    # deixaria JSON pela metade, e a leitura seguinte trataria o arquivo como
    # vazio -- ou seja, revogaria todas as chaves de uma vez.
    provisorio = arquivo.with_suffix(".json.parcial")
    provisorio.write_text(texto, encoding="utf-8")
    provisorio.replace(arquivo)


def listar(settings: Settings) -> list[Chave]:
    """As chaves vivas, da mais nova para a mais velha."""
    return sorted(_ler(settings), key=lambda c: c.criada_em, reverse=True)


def criar(settings: Settings, rotulo: str) -> tuple[Chave, str]:
    """Emite uma chave. O texto dela sai daqui e nao volta a existir.

    Devolve o registro e o texto, nessa ordem, para que quem chama nao confunda
    um com o outro: o registro pode ir para a tela e para o disco, o texto so
    para a resposta desta chamada.
    """
    rotulo = rotulo.strip()
    if not rotulo:
        raise ValueError("A chave precisa de um rotulo para ser reconhecida depois.")
    if len(rotulo) > LIMITE_ROTULO:
        raise ValueError(f"Rotulo longo demais (maximo {LIMITE_ROTULO} caracteres).")

    chaves = _ler(settings)
    if len(chaves) >= LIMITE:
        raise ValueError(
            f"Limite de {LIMITE} chaves alcancado. Revogue as que nao estao em uso."
        )

    texto = PREFIXO + secrets.token_urlsafe(_BYTES)
    chave = Chave(
        id=secrets.token_hex(8),
        rotulo=rotulo,
        # Prefixo e sufixo: o inicio diz que e nossa, o fim e o que distingue
        # duas chaves na tela. Oito caracteres de 256 bits nao ajudam a
        # adivinhar o resto.
        prefixo=f"{texto[: len(PREFIXO) + 4]}...{texto[-4:]}",
        resumo=_resumir(texto),
        criada_em=_agora(),
    )
    _gravar(settings, [*chaves, chave])
    return chave, texto


def revogar(settings: Settings, id: str) -> bool:
    """Apaga o registro. Devolve se havia o que apagar.

    Apaga, e nao marca como revogada: uma chave revogada nao tem uso futuro, e
    a trilha de auditoria da plataforma e sobre decisoes, nao sobre credenciais.
    """
    chaves = _ler(settings)
    restantes = [c for c in chaves if c.id != id]
    if len(restantes) == len(chaves):
        return False
    _gravar(settings, restantes)
    return True


def _marcar_uso(settings: Settings, id: str, quando: datetime) -> None:
    """Registra o uso relendo antes de gravar.

    A releitura existe porque duas escritas simultaneas -- uma chamada de
    ferramenta e uma emissao pela tela -- reescrevem o mesmo arquivo inteiro, e
    gravar a partir de uma lista lida ha varios minutos apagaria a chave que a
    outra acabou de criar. A janela entre esta leitura e a gravacao continua
    existindo; o que se perde nela e um carimbo de ultimo uso, nunca uma chave.
    """
    chaves = _ler(settings)
    atualizadas: list[Chave] = []
    mudou = False
    for chave in chaves:
        if chave.id != id:
            atualizadas.append(chave)
            continue
        anterior = chave.ultimo_uso
        if anterior is not None:
            try:
                if quando - datetime.fromisoformat(anterior) < GRANULARIDADE_DE_USO:
                    return
            except ValueError:
                pass  # carimbo ilegivel: reescreve
        atualizadas.append(
            Chave(
                id=chave.id,
                rotulo=chave.rotulo,
                prefixo=chave.prefixo,
                resumo=chave.resumo,
                criada_em=chave.criada_em,
                ultimo_uso=quando.isoformat(timespec="seconds"),
            )
        )
        mudou = True
    if mudou:
        _gravar(settings, atualizadas)


def resolver(settings: Settings):
    """O ``Resolvedor`` que o MCP remoto usa: chave apresentada -> onde gravar.

    Toda chave valida abre o mesmo acervo -- o que a tela mostra. A plataforma
    tem um acervo so, e separar o que a chave ve do que a tela ve faria o
    decisor criar uma decisao pelo Claude e nao encontra-la no site.

    E aqui, e so aqui, que isolar dados por chave passaria a existir: bastaria
    devolver um diretorio derivado de ``chave.id``. Por isso a assinatura
    devolve caminho, e nao um "sim" -- a decisao de escopo mora num lugar so.
    """

    def para(apresentada: str) -> Path | None:
        alvo = _resumir(apresentada)
        for chave in _ler(settings):
            # Tempo constante: comparar resumos com `==` daria, em principio,
            # uma medida de quantos caracteres batem.
            if hmac.compare_digest(chave.resumo, alvo):
                _marcar_uso(settings, chave.id, datetime.now(timezone.utc))
                return settings.storage
        return None

    return para


def _cli(argumentos: list[str] | None = None) -> int:
    """Emitir, listar e revogar sem navegador.

        python -m fitradeoff_api.chaves criar "Claude na web"

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
    comandos.add_parser("listar", help="as chaves vivas")
    novo = comandos.add_parser("criar", help="emite uma chave")
    novo.add_argument("rotulo", help="onde a chave vai ser usada")
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
            print(f"{chave.id}  {chave.prefixo}  {chave.rotulo}  (uso: {uso})")
        return 0

    if opcoes.comando == "criar":
        try:
            chave, texto = criar(settings, opcoes.rotulo)
        except ValueError as exc:
            print(f"Erro: {exc}")
            return 1
        print(texto)
        print()
        print(
            f"Chave {chave.id} ({chave.rotulo}). Este texto nao fica gravado em "
            "lugar nenhum: copie agora."
        )
        return 0

    if revogar(settings, opcoes.id):
        print("Chave revogada.")
        return 0
    print("Chave nao encontrada.")
    return 1


if __name__ == "__main__":
    raise SystemExit(_cli())
