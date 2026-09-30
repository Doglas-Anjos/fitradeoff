"""Decisoes no PostgreSQL.

    FITRADEOFF_DATABASE_URL=postgresql://fitradeoff_app:...@host/fitradeoff

O desenho segue o padrao de acesso do motor, e nao uma normalizacao de manual.
Tres fatos o definem:

1. **O motor sempre carrega a decisao inteira.** Toda pergunta resolve LPs
   sobre a matriz de consequencias completa. Espalhar alternativas, criterios e
   consequencias em tabelas proprias obrigaria cada leitura a remontar 15 mil
   linhas (500 x 30) por junção -- mais lento, nao mais rapido. O problema vai
   num ``jsonb`` so, lido e escrito de uma vez.

2. **A listagem nao usa nada disso.** Ela mostra nome, problematica, contagens
   e datas. Essas colunas ficam de fora do ``jsonb``, e a consulta da listagem
   nem toca no documento: o PostgreSQL guarda valores grandes fora da linha
   (TOAST), entao uma consulta que nao pede ``problema`` nao o le do disco.

3. **A escrita mais frequente e uma resposta.** Regravar o documento inteiro a
   cada clique e o que o arquivo JSON faz hoje. Aqui a trilha tem tabela
   propria, uma linha por declaracao, e responder vira um ``INSERT`` pequeno;
   desfazer, um ``DELETE`` da ultima. O documento do problema so e reescrito
   quando o problema muda de fato (a curva de valor, por exemplo).

**Isolamento por dono, em duas camadas.** Toda consulta filtra por ``dono`` --
e a chave primaria comeca por ele, entao o filtro e tambem o caminho do indice.
Por baixo, Row-Level Security: o banco recusa linhas de outro dono mesmo que um
dia alguem escreva uma consulta sem o filtro. O dono vai para a sessao com
``set_config(..., true)``, que vale so ate o fim da transacao: uma conexao
devolvida ao pool nao carrega o dono do pedido anterior para o seguinte.

Superusuario e papeis com ``BYPASSRLS`` ignoram RLS por definicao do
PostgreSQL. A aplicacao precisa de um papel proprio, sem esses atributos; a
partida avisa no log quando nao for o caso.

**Duas janelas, uma decisao.** Cada caso de uso le, calcula e grava. A linha
tem ``versao``, e a gravacao so acontece se a versao ainda for a que foi lida;
senao sai ``ConcurrentModification``, e nenhuma declaracao some. Nao ha trava
segurada durante o calculo -- que leva segundos --, so a checagem no fim.
"""

from __future__ import annotations

import logging
import os
import re
import threading
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import psycopg
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool, PoolTimeout

from .base import (
    ConcurrentModification,
    DecisionRecord,
    DecisionRepository,
    DecisionSummary,
    RecordNotFound,
    StorageUnavailable,
)
from .serialization import record_from_dict, record_to_dict

logger = logging.getLogger(__name__)

#: O dono de quem roda a plataforma sem login: a maquina do decisor, o MCP por
#: stdio, a chave do cofre. E o equivalente ao diretorio de dados padrao.
DONO_DA_PLATAFORMA = "plataforma"

_MARCA = re.compile(r"^[0-9a-f]{32}$")

# Mesmo alfabeto do adaptador de arquivo. Aqui nao ha caminho a proteger, mas o
# contrato da porta e um so: um identificador recusado la e recusado aqui.
_VALID_ID = re.compile(r"^[A-Za-z0-9_-]{1,64}$")

# Campos do registro que moram no documento do problema. O resto vira coluna.
_NO_DOCUMENTO = ("alternativas", "criterios", "consequencias", "custos", "criado_em")


def dono_do_acervo(caminho: Path | str) -> str:
    """O dono no banco, a partir do acervo que a identidade ja resolveu.

    A API e o MCP resolvem quem esta chamando para um diretorio: o da
    plataforma, ou ``pessoas/<marca>`` -- a marca sendo o resumo de emissor e
    ``sub`` feito em ``fitradeoff_api.identidade.acervo_de``. O banco reaproveita
    essa resolucao em vez de refaze-la: o dono e a marca, e a plataforma e
    ``plataforma``. Assim o isolamento continua decidido num lugar so.
    """
    caminho = Path(caminho)
    if caminho.parent.name == "pessoas" and _MARCA.match(caminho.name):
        return caminho.name
    return DONO_DA_PLATAFORMA


# --- esquema ----------------------------------------------------------------

#: Aplicadas em ordem, cada uma uma vez, numa transacao so. Nunca edite uma
#: migracao ja publicada: acrescente outra. O banco de quem ja a aplicou nao
#: roda a versao editada, e os dois bancos passariam a divergir em silencio.
MIGRACOES: tuple[tuple[int, str], ...] = (
    (
        1,
        """
        CREATE TABLE decisoes (
            dono           text        NOT NULL,
            id             text        NOT NULL
                                       CHECK (id ~ '^[A-Za-z0-9_-]{1,64}$'),
            versao         bigint      NOT NULL DEFAULT 1,
            nome           text        NOT NULL,
            problematica   text        NOT NULL,
            favorita       boolean     NOT NULL DEFAULT false,
            limiar         double precision,
            n_alternativas integer     NOT NULL,
            n_criterios    integer     NOT NULL,
            n_declaracoes  integer     NOT NULL DEFAULT 0,
            criado_em      timestamptz,
            atualizado_em  timestamptz,
            -- alternativas, criterios, consequencias e custos: lidos sempre
            -- juntos, pelo motor, e nunca pela listagem
            problema       jsonb       NOT NULL,
            configuracao   jsonb       NOT NULL DEFAULT '{}'::jsonb,
            -- o dono na frente: a mesma chave serve a leitura por id e a
            -- listagem de um dono, sem indice adicional
            PRIMARY KEY (dono, id)
        )
        -- folga em cada pagina para que a atualizacao de cada resposta (versao,
        -- contagem, data) reescreva a linha na mesma pagina (HOT) em vez de
        -- mexer no indice. Funciona porque nenhuma dessas colunas e indexada --
        -- e por isso nao ha indice em favorita nem em atualizado_em.
        WITH (fillfactor = 90);

        CREATE TABLE declaracoes (
            dono          text        NOT NULL,
            decisao_id    text        NOT NULL,
            sequencia     integer     NOT NULL CHECK (sequencia > 0),
            registrado_em timestamptz NOT NULL,
            -- a entrada exatamente como o dominio a serializa, para que a
            -- trilha volte identica; `registrado_em` repete o instante como
            -- coluna so para consulta
            entrada       jsonb       NOT NULL,
            -- ordem da trilha e caminho da exclusao em cascata, na mesma chave
            PRIMARY KEY (dono, decisao_id, sequencia),
            FOREIGN KEY (dono, decisao_id)
                REFERENCES decisoes (dono, id) ON DELETE CASCADE
        );

        -- Row-Level Security. FORCE faz a regra valer tambem para o dono das
        -- tabelas, que e o papel da aplicacao. Sem o dono na sessao,
        -- current_setting(..., true) e NULL, a comparacao nunca e verdadeira, e
        -- nenhuma linha aparece: esquecer de declarar o dono falha fechado.
        ALTER TABLE decisoes ENABLE ROW LEVEL SECURITY;
        ALTER TABLE decisoes FORCE ROW LEVEL SECURITY;
        CREATE POLICY so_do_dono ON decisoes
            USING (dono = current_setting('fitradeoff.dono', true))
            WITH CHECK (dono = current_setting('fitradeoff.dono', true));

        ALTER TABLE declaracoes ENABLE ROW LEVEL SECURITY;
        ALTER TABLE declaracoes FORCE ROW LEVEL SECURITY;
        CREATE POLICY so_do_dono ON declaracoes
            USING (dono = current_setting('fitradeoff.dono', true))
            WITH CHECK (dono = current_setting('fitradeoff.dono', true));
        """,
    ),
)


def aplicar_esquema(conn: psycopg.Connection) -> list[int]:
    """Leva o banco a versao mais recente. Devolve as migracoes aplicadas agora.

    A trava consultiva serializa processos que sobem juntos -- a API e o MCP
    remoto, por exemplo --, e o DDL do PostgreSQL e transacional: uma migracao
    que falha no meio e desfeita inteira, sem deixar tabela pela metade.
    """
    aplicadas: list[int] = []
    with conn.transaction():
        conn.execute("SELECT pg_advisory_xact_lock(hashtext('fitradeoff.esquema'))")
        conn.execute(
            "CREATE TABLE IF NOT EXISTS esquema_versoes ("
            " versao integer PRIMARY KEY,"
            " aplicada_em timestamptz NOT NULL DEFAULT now())"
        )
        feitas = {
            linha[0]
            for linha in conn.execute("SELECT versao FROM esquema_versoes").fetchall()
        }
        for versao, sql in MIGRACOES:
            if versao in feitas:
                continue
            conn.execute(sql)
            conn.execute("INSERT INTO esquema_versoes (versao) VALUES (%s)", (versao,))
            aplicadas.append(versao)

    linha = conn.execute(
        "SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user"
    ).fetchone()
    conn.commit()
    if linha and linha[0]:
        logger.warning(
            "O papel do banco ignora Row-Level Security (superusuario ou "
            "BYPASSRLS). O filtro por dono continua em toda consulta, mas a "
            "segunda camada esta desligada. Use um papel proprio para a aplicacao."
        )
    return aplicadas


# --- pool -------------------------------------------------------------------

_BANCO_FORA = (
    "O banco de dados nao respondeu. Nada foi alterado; tente de novo em "
    "alguns segundos."
)

_pools: dict[str, ConnectionPool] = {}
_trava_pools = threading.Lock()


def _configurar(conn: psycopg.Connection) -> None:
    # Instantes gravados sem fuso sao lidos como UTC, que e como o relogio do
    # motor os produz. Sem isto, o fuso do servidor decidiria.
    conn.execute("SET TIME ZONE 'UTC'")
    conn.commit()


def pool_para(url: str) -> ConnectionPool:
    """Um pool por URL, por processo, criado na primeira vez que for pedido.

    Por processo, e nao por requisicao: abrir conexao custa alguns
    milissegundos e um processo no servidor, e o repositorio e montado a cada
    requisicao. As conexoes so ficam presas durante a leitura e a gravacao --
    nunca durante o calculo, que e o que leva tempo --, entao um pool pequeno
    atende muitos pedidos simultaneos.
    """
    with _trava_pools:
        pool = _pools.get(url)
        if pool is None:
            espera = float(os.environ.get("FITRADEOFF_DB_ESPERA", "10"))
            # Primeiro uma conexao direta, e so depois o pool. Um pool criado com
            # o banco fora do ar fica reconectando em segundo plano, e fecha-lo
            # nao basta: as threads presas numa tentativa de conexao sobrevivem ao
            # `close()`. Medido antes desta ordem: cada pedido com o banco caido
            # deixava duas a quatro threads orfas.
            try:
                with psycopg.connect(url, connect_timeout=max(2, int(espera))) as conn:
                    aplicar_esquema(conn)
            except psycopg.OperationalError as exc:
                raise StorageUnavailable(_BANCO_FORA) from exc
            pool = ConnectionPool(
                url,
                min_size=1,
                max_size=int(os.environ.get("FITRADEOFF_DB_POOL", "10")),
                timeout=espera,
                configure=_configurar,
                name="fitradeoff",
                open=True,
            )
            _pools[url] = pool
        return pool


def fechar_pools() -> None:
    """Fecha os pools abertos. Para os testes e para o fim do processo."""
    with _trava_pools:
        for pool in _pools.values():
            pool.close()
        _pools.clear()


# --- adaptador --------------------------------------------------------------


@dataclass
class _Lido:
    """O que este pedido leu, para gravar so a diferenca."""

    versao: int
    trilha: list[dict]
    problema: dict
    configuracao: dict


_CONSULTA_REGISTRO = """
    SELECT d.id, d.versao, d.nome, d.problematica, d.favorita, d.limiar,
           d.problema, d.configuracao,
           COALESCE(
               (SELECT jsonb_agg(x.entrada ORDER BY x.sequencia)
                  FROM declaracoes x
                 WHERE x.dono = d.dono AND x.decisao_id = d.id),
               '[]'::jsonb
           ) AS trilha
      FROM decisoes d
     WHERE d.dono = %s
"""


class PostgresDecisionRepository(DecisionRepository):
    """As decisoes de um dono, no PostgreSQL.

    Um por requisicao, como o de arquivo: guarda a versao do que leu para que a
    gravacao do mesmo pedido saiba se alguem mexeu no meio.
    """

    def __init__(self, pool: ConnectionPool, dono: str) -> None:
        if not dono:
            raise ValueError("O repositorio precisa de um dono.")
        self._pool = pool
        self._dono = dono
        self._lido: dict[str, _Lido] = {}

    @property
    def dono(self) -> str:
        return self._dono

    # -- infraestrutura --

    @contextmanager
    def _conexao(self) -> Iterator[psycopg.Connection]:
        """Uma conexao do pool, numa transacao, com o dono declarado.

        O ``with`` do pool confirma a transacao na saida normal e a desfaz se
        algo levantar -- inclusive ``ConcurrentModification``, o que garante
        que uma gravacao recusada nao deixa metade das declaracoes para tras.
        """
        try:
            with self._pool.connection() as conn:
                conn.execute(
                    "SELECT set_config('fitradeoff.dono', %s, true)", (self._dono,)
                )
                yield conn
        except (PoolTimeout, psycopg.OperationalError) as exc:
            # Sem conexao livre ou sem banco: a transacao ja foi desfeita pelo
            # pool, e quem chamou precisa saber que pode tentar de novo.
            raise StorageUnavailable(_BANCO_FORA) from exc

    @staticmethod
    def _check(record_id: str) -> str:
        if not _VALID_ID.match(record_id or ""):
            raise ValueError(
                f"Identificador invalido: {record_id!r}. Sao aceitos ate 64 "
                f"caracteres entre letras, digitos, hifen e sublinhado."
            )
        return record_id

    def _montar(self, linha: tuple) -> DecisionRecord:
        (ident, versao, nome, problematica, favorita, limiar,
         problema, configuracao, trilha) = linha
        self._lido[ident] = _Lido(
            versao=versao, trilha=list(trilha), problema=dict(problema),
            configuracao=dict(configuracao),
        )
        return record_from_dict({
            **problema,
            "id": ident,
            "nome": nome,
            "problematica": problematica,
            "configuracao": configuracao,
            "limiar_de_equivalencia": limiar,
            "favorita": favorita,
            "auditoria": trilha,
        })

    # -- leitura --

    def get(self, record_id: str) -> DecisionRecord:
        """Le a decisao e a trilha numa consulta so, e memoriza a versao lida.

        A versao guardada aqui e o que permite a ``save`` do mesmo pedido
        recusar uma gravacao concorrente.

        Erros: RecordNotFound se nao houver decisao desse dono com esse id;
        ValueError se o id for invalido; StorageUnavailable se o banco nao
        responder.
        """
        self._check(record_id)
        with self._conexao() as conn:
            linha = conn.execute(
                _CONSULTA_REGISTRO + " AND d.id = %s", (self._dono, record_id)
            ).fetchone()
        if linha is None:
            raise RecordNotFound(f"Decisao '{record_id}' nao encontrada.")
        return self._montar(linha)

    def list(self) -> list[DecisionRecord]:
        with self._conexao() as conn:
            linhas = conn.execute(
                _CONSULTA_REGISTRO + " ORDER BY d.id", (self._dono,)
            ).fetchall()
        return [self._montar(linha) for linha in linhas]

    def summaries(self) -> list[DecisionSummary]:
        # Nenhuma coluna do documento nem da trilha: e o que mantem a listagem
        # do mesmo tamanho com 3 ou com 500 alternativas por decisao.
        with self._conexao() as conn:
            linhas = conn.execute(
                "SELECT id, nome, problematica, n_alternativas, n_criterios,"
                "       n_declaracoes, criado_em, atualizado_em, favorita"
                "  FROM decisoes WHERE dono = %s ORDER BY id",
                (self._dono,),
            ).fetchall()
        return [DecisionSummary(*linha) for linha in linhas]

    def exists(self, record_id: str) -> bool:
        """Ha decisao desse dono com esse id?

        Sobrescreve a da porta para nao montar o registro nem memorizar versao.

        Erros: ValueError se o id for invalido; StorageUnavailable.
        """
        self._check(record_id)
        with self._conexao() as conn:
            return conn.execute(
                "SELECT 1 FROM decisoes WHERE dono = %s AND id = %s",
                (self._dono, record_id),
            ).fetchone() is not None

    # -- escrita --

    def save(self, record: DecisionRecord) -> None:
        """Grava so a diferenca em relacao ao que este repositorio leu.

        Registro lido antes por esta instancia: ``UPDATE`` condicionado a versao
        lida, apaga as declaracoes depois do prefixo comum e insere as novas.
        Registro nunca lido por esta instancia: gravacao as cegas (upsert que
        substitui a linha e a trilha inteiras), SEM conferencia de versao --
        a protecao contra concorrencia so existe para quem fez ``get`` antes.
        Tudo numa transacao: uma recusa nao deixa trilha pela metade.

        Erros: ConcurrentModification se a versao mudou desde o ``get``;
        RecordNotFound se a decisao lida foi apagada nesse meio tempo;
        ValueError se o id for invalido; StorageUnavailable se o banco nao
        responder.
        """
        self._check(record.id)
        dados = record_to_dict(record)
        trilha: list[dict] = dados["auditoria"]
        problema = {chave: dados[chave] for chave in _NO_DOCUMENTO}
        configuracao = dados["configuracao"] or {}
        resumo = DecisionSummary.of(record)
        colunas = {
            "nome": dados["nome"],
            "problematica": dados["problematica"],
            "favorita": bool(dados["favorita"]),
            "limiar": dados["limiar_de_equivalencia"],
            "n_alternativas": resumo.alternativas,
            "n_criterios": resumo.criterios,
            "n_declaracoes": resumo.declaracoes,
            "criado_em": resumo.criado_em,
            "atualizado_em": resumo.atualizado_em,
        }
        lido = self._lido.get(record.id)

        with self._conexao() as conn:
            if lido is None:
                versao = self._inserir(conn, record.id, colunas, problema, configuracao)
                conn.execute(
                    "DELETE FROM declaracoes WHERE dono = %s AND decisao_id = %s",
                    (self._dono, record.id),
                )
                comum = 0
            else:
                versao = self._atualizar(conn, record.id, lido, colunas, problema,
                                         configuracao)
                comum = _prefixo_comum(lido.trilha, trilha)
                if comum < len(lido.trilha):
                    conn.execute(
                        "DELETE FROM declaracoes"
                        " WHERE dono = %s AND decisao_id = %s AND sequencia > %s",
                        (self._dono, record.id, comum),
                    )
            novas = trilha[comum:]
            if novas:
                with conn.cursor() as cur:
                    cur.executemany(
                        "INSERT INTO declaracoes"
                        " (dono, decisao_id, sequencia, registrado_em, entrada)"
                        " VALUES (%s, %s, %s, %s, %s)",
                        [
                            (self._dono, record.id, entrada["sequencia"],
                             datetime.fromisoformat(entrada["registrado_em"]),
                             Jsonb(entrada))
                            for entrada in novas
                        ],
                    )

        self._lido[record.id] = _Lido(
            versao=versao, trilha=trilha, problema=problema, configuracao=configuracao
        )

    def _inserir(self, conn, ident: str, colunas: dict, problema: dict,
                 configuracao: dict) -> int:
        """Registro novo -- ou gravacao as cegas, que substitui por inteiro.

        As cegas e o contrato da porta para quem grava sem ter lido (o adaptador
        de arquivo sobrescreve). Os casos de uso sempre leem antes; aqui so
        chega a criacao, cujo identificador de 128 bits nao colide.
        """
        nomes = list(colunas)
        return conn.execute(
            f"INSERT INTO decisoes (dono, id, {', '.join(nomes)}, problema, configuracao)"
            f" VALUES (%s, %s, {', '.join(['%s'] * len(nomes))}, %s, %s)"
            " ON CONFLICT (dono, id) DO UPDATE SET "
            + ", ".join(f"{n} = EXCLUDED.{n}" for n in nomes)
            + ", problema = EXCLUDED.problema, configuracao = EXCLUDED.configuracao,"
            " versao = decisoes.versao + 1"
            " RETURNING versao",
            (self._dono, ident, *colunas.values(), Jsonb(problema), Jsonb(configuracao)),
        ).fetchone()[0]

    def _atualizar(self, conn, ident: str, lido: _Lido, colunas: dict,
                   problema: dict, configuracao: dict) -> int:
        valores = dict(colunas)
        # O documento so e reescrito quando mudou. Responder, desfazer, marcar
        # favorita ou trocar o limiar nao tocam nele -- e ele e a parte grande.
        if problema != lido.problema:
            valores["problema"] = Jsonb(problema)
        if configuracao != lido.configuracao:
            valores["configuracao"] = Jsonb(configuracao)
        linha = conn.execute(
            "UPDATE decisoes SET "
            + ", ".join(f"{n} = %s" for n in valores)
            + ", versao = versao + 1"
            " WHERE dono = %s AND id = %s AND versao = %s RETURNING versao",
            (*valores.values(), self._dono, ident, lido.versao),
        ).fetchone()
        if linha is not None:
            return linha[0]
        ainda_existe = conn.execute(
            "SELECT 1 FROM decisoes WHERE dono = %s AND id = %s", (self._dono, ident)
        ).fetchone()
        if ainda_existe:
            raise ConcurrentModification(
                "A decisao foi alterada em outra janela enquanto este pedido era "
                "processado. Recarregue para ver o que mudou e responda de novo."
            )
        raise RecordNotFound(f"Decisao '{ident}' nao encontrada.")

    def delete(self, record_id: str) -> None:
        """Apaga a decisao; a trilha vai junto pela exclusao em cascata.

        Nao confere versao: apaga mesmo que outra janela tenha gravado depois
        da leitura deste pedido.

        Erros: RecordNotFound se nao existir; ValueError se o id for invalido;
        StorageUnavailable.
        """
        self._check(record_id)
        with self._conexao() as conn:
            apagada = conn.execute(
                "DELETE FROM decisoes WHERE dono = %s AND id = %s RETURNING 1",
                (self._dono, record_id),
            ).fetchone()
        if apagada is None:
            raise RecordNotFound(f"Decisao '{record_id}' nao encontrada.")
        self._lido.pop(record_id, None)


def _prefixo_comum(antes: list[dict], depois: list[dict]) -> int:
    """Quantas declaracoes do inicio continuam iguais.

    A trilha e uma pilha: responder empilha, desfazer desempilha. Entre a
    leitura e a gravacao de um pedido acontece uma operacao so, entao o prefixo
    comum e quase tudo, e so a ponta muda no banco.
    """
    comum = 0
    for a, b in zip(antes, depois):
        if a != b:
            break
        comum += 1
    return comum


# --- migracao dos arquivos --------------------------------------------------


def importar_instalacao(url: str, storage: Path | str) -> dict[str, int]:
    """Copia para o banco as decisoes em arquivo de uma instalacao inteira.

    O acervo da plataforma (``storage``) e o de cada pessoa
    (``storage.parent/pessoas/<marca>``). Pode rodar de novo sem estrago: o
    que ja existe no banco nao e sobrescrito -- o banco pode ter recebido
    respostas depois da primeira importacao, e essas valem mais que o arquivo.
    """
    from .adapters import JsonFileDecisionRepository

    storage = Path(storage)
    acervos = [storage]
    pessoas = storage.parent / "pessoas"
    if pessoas.is_dir():
        acervos += sorted(p for p in pessoas.iterdir() if p.is_dir())

    pool = pool_para(url)
    contagem = {"importadas": 0, "ja_existiam": 0}
    for acervo in acervos:
        destino = PostgresDecisionRepository(pool, dono_do_acervo(acervo))
        for record in JsonFileDecisionRepository(acervo).list():
            if destino.exists(record.id):
                contagem["ja_existiam"] += 1
                continue
            destino.save(record)
            contagem["importadas"] += 1
    return contagem


def _cli(argumentos: list[str] | None = None) -> int:
    import argparse

    analisador = argparse.ArgumentParser(
        prog="python -m fitradeoff.repositories.postgres",
        description="Esquema e migracao das decisoes para o PostgreSQL. A URL "
                    "vem de FITRADEOFF_DATABASE_URL.",
    )
    comandos = analisador.add_subparsers(dest="comando", required=True)
    comandos.add_parser("esquema", help="cria ou atualiza as tabelas")
    importar = comandos.add_parser("importar", help="copia os arquivos JSON para o banco")
    importar.add_argument("diretorio", help="o diretorio de dados (FITRADEOFF_DATA)")
    opcoes = analisador.parse_args(argumentos)

    url = os.environ.get("FITRADEOFF_DATABASE_URL")
    if not url:
        analisador.error("defina FITRADEOFF_DATABASE_URL")

    if opcoes.comando == "esquema":
        with psycopg.connect(url) as conn:
            aplicadas = aplicar_esquema(conn)
        print(f"esquema em dia; aplicadas agora: {aplicadas or 'nenhuma'}")
        return 0

    contagem = importar_instalacao(url, Path(opcoes.diretorio).expanduser().resolve())
    fechar_pools()
    print(f"importadas: {contagem['importadas']}; ja existiam: {contagem['ja_existiam']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(_cli())
