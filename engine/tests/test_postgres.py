"""O que o PostgreSQL garante alem do contrato comum dos adaptadores.

O contrato (ler o que foi gravado, listar, remover) esta em
``test_repositories.py`` e roda contra os tres adaptadores. Aqui ficam as
garantias pelas quais o banco foi escolhido: isolamento entre donos mesmo sem o
filtro da aplicacao, recusa da gravacao que apagaria a de outra janela, e
escrita proporcional ao que mudou.

Pulados sem ``FITRADEOFF_TEST_DATABASE_URL`` (ver conftest).
"""

from __future__ import annotations

import json
import threading

import pytest

# O driver e dependencia opcional do motor: sem ele, este arquivo inteiro e
# pulado -- e nao derruba a coleta da suite, como um `import psycopg` faria.
psycopg = pytest.importorskip("psycopg")

from conftest import make_problem
from fitradeoff import DecisionService, build_container
from fitradeoff.domain import AuditLog, CriteriaRanking, Preference, TradeoffAnswer
from fitradeoff.repositories import (
    ConcurrentModification,
    DecisionRecord,
    DecisionSummary,
    JsonFileDecisionRepository,
    RecordNotFound,
)
from fitradeoff.repositories.postgres import (
    DONO_DA_PLATAFORMA,
    PostgresDecisionRepository,
    aplicar_esquema,
    dono_do_acervo,
    importar_instalacao,
    pool_para,
)
from fitradeoff.repositories import StorageUnavailable


@pytest.fixture
def record(clock):
    problem = make_problem([[1.0, 2.0, 3.0], [3.0, 2.0, 1.0]], names=["X", "Y"])
    log = AuditLog().record(CriteriaRanking((0, 1, 2)), clock, actor="ana")
    log = log.record(TradeoffAnswer(0, 1, 0.25, Preference.SECOND), clock)
    return DecisionRecord(
        id="abc123", problem=problem, log=log, problematic_key="escolha",
        created_at=clock.now(),
    )


@pytest.fixture
def repo(pg_pool, novo_dono):
    return lambda dono=None: PostgresDecisionRepository(pg_pool, dono or novo_dono())


def _sql(pg_url, consulta, parametros=(), dono=None):
    """Consulta crua, como o papel da aplicacao, fora do adaptador."""
    with psycopg.connect(pg_url) as conn:
        if dono is not None:
            conn.execute("SELECT set_config('fitradeoff.dono', %s, true)", (dono,))
        return conn.execute(consulta, parametros).fetchall()


# --- isolamento -------------------------------------------------------------


def test_um_dono_nao_alcanca_a_decisao_de_outro(repo, record):
    ana, bia = repo(), repo()
    ana.save(record)

    with pytest.raises(RecordNotFound):
        bia.get(record.id)
    assert bia.summaries() == []
    assert bia.list() == []
    assert not bia.exists(record.id)
    with pytest.raises(RecordNotFound):
        bia.delete(record.id)
    # e a de ana continua la, intacta
    assert ana.get(record.id).log.to_list() == record.log.to_list()


def test_mesmo_id_em_donos_diferentes_sao_duas_decisoes(repo, record, clock):
    ana, bia = repo(), repo()
    ana.save(record)
    outra = DecisionRecord(id=record.id, problem=record.problem, log=AuditLog(),
                           created_at=clock.now())
    bia.save(outra)

    assert len(ana.get(record.id).log) == 2
    assert len(bia.get(record.id).log) == 0


def test_rls_esconde_linhas_de_outro_dono_mesmo_pedidas_pelo_nome(pg_url, repo, record):
    """A segunda camada: uma consulta que esquecesse o filtro nao vaza nada."""
    ana = repo()
    ana.save(record)

    pedida_por_outro = _sql(
        pg_url, "SELECT count(*) FROM decisoes WHERE dono = %s", (ana.dono,),
        dono="outra-pessoa",
    )
    assert pedida_por_outro == [(0,)]
    trilha_por_outro = _sql(
        pg_url, "SELECT count(*) FROM declaracoes WHERE dono = %s", (ana.dono,),
        dono="outra-pessoa",
    )
    assert trilha_por_outro == [(0,)]
    # o proprio dono ve
    assert _sql(pg_url, "SELECT count(*) FROM decisoes WHERE dono = %s",
                (ana.dono,), dono=ana.dono) == [(1,)]


def test_sem_dono_declarado_nenhuma_linha_aparece(pg_url, repo, record):
    """Esquecer o set_config falha fechado, nao aberto."""
    repo().save(record)
    assert _sql(pg_url, "SELECT count(*) FROM decisoes") == [(0,)]


def test_rls_recusa_gravar_em_nome_de_outro_dono(pg_url):
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        _sql(
            pg_url,
            "INSERT INTO decisoes (dono, id, nome, problematica, n_alternativas,"
            " n_criterios, problema) VALUES ('vitima', 'x1', 'n', 'escolha', 2, 2,"
            " '{}') RETURNING 1",
            dono="atacante",
        )


def test_o_dono_nao_sobrevive_a_transacao(pg_pool, repo, record):
    """Conexao devolvida ao pool nao leva o dono do pedido anterior."""
    repo().save(record)
    with pg_pool.connection() as conn:
        assert conn.execute(
            "SELECT current_setting('fitradeoff.dono', true)"
        ).fetchone()[0] in (None, "")


def test_papel_dos_testes_nao_ignora_rls(pg_url):
    """Sem isto, todos os testes de RLS acima passariam com a trava desligada."""
    linha = _sql(pg_url, "SELECT rolsuper, rolbypassrls FROM pg_roles"
                         " WHERE rolname = current_user")
    assert linha == [(False, False)], (
        "o banco de teste precisa de um papel comum; superusuario ignora RLS"
    )


# --- duas janelas -----------------------------------------------------------


def test_segunda_gravacao_concorrente_e_recusada_sem_perder_a_primeira(
    pg_pool, repo, record, clock
):
    ana = repo()
    ana.save(record)
    aba_1 = PostgresDecisionRepository(pg_pool, ana.dono)
    aba_2 = PostgresDecisionRepository(pg_pool, ana.dono)

    na_aba_1 = aba_1.get(record.id)
    na_aba_2 = aba_2.get(record.id)

    na_aba_1.log = na_aba_1.log.record(TradeoffAnswer(1, 2, 0.5, Preference.FIRST), clock)
    aba_1.save(na_aba_1)

    na_aba_2.log = na_aba_2.log.record(TradeoffAnswer(1, 2, 0.5, Preference.SECOND), clock)
    with pytest.raises(ConcurrentModification):
        aba_2.save(na_aba_2)

    guardada = ana.get(record.id)
    assert len(guardada.log) == 3
    assert guardada.log.entries[-1].statement.preference is Preference.FIRST


def test_quem_releu_depois_do_conflito_grava(pg_pool, repo, record, clock):
    ana = repo()
    ana.save(record)
    aba_1 = PostgresDecisionRepository(pg_pool, ana.dono)
    aba_2 = PostgresDecisionRepository(pg_pool, ana.dono)
    r1, r2 = aba_1.get(record.id), aba_2.get(record.id)
    r1.favorite = True
    aba_1.save(r1)
    with pytest.raises(ConcurrentModification):
        aba_2.save(r2)

    relida = aba_2.get(record.id)
    relida.log = relida.log.without_last()
    aba_2.save(relida)
    assert len(ana.get(record.id).log) == 1
    assert ana.get(record.id).favorite is True


def test_gravar_decisao_apagada_por_outra_janela_diz_que_nao_existe(
    pg_pool, repo, record
):
    ana = repo()
    ana.save(record)
    aba = PostgresDecisionRepository(pg_pool, ana.dono)
    lida = aba.get(record.id)
    ana.delete(record.id)
    with pytest.raises(RecordNotFound):
        aba.save(lida)


# --- escrita proporcional ao que mudou ---------------------------------------


def _xmins(pg_url, dono, ident):
    """A versao fisica de cada linha da trilha: muda quando a linha e reescrita."""
    return dict(_sql(
        pg_url,
        "SELECT sequencia, xmin::text FROM declaracoes"
        " WHERE dono = %s AND decisao_id = %s ORDER BY sequencia",
        (dono, ident), dono=dono,
    ))


def test_responder_acrescenta_uma_linha_e_nao_reescreve_as_outras(
    pg_url, repo, record, clock
):
    ana = repo()
    ana.save(record)
    antes = _xmins(pg_url, ana.dono, record.id)

    lida = ana.get(record.id)
    lida.log = lida.log.record(TradeoffAnswer(1, 2, 0.5, Preference.FIRST), clock)
    ana.save(lida)
    depois = _xmins(pg_url, ana.dono, record.id)

    assert set(depois) == {1, 2, 3}
    assert {k: depois[k] for k in antes} == antes


def test_desfazer_apaga_so_a_ultima(pg_url, repo, record):
    ana = repo()
    ana.save(record)
    antes = _xmins(pg_url, ana.dono, record.id)

    lida = ana.get(record.id)
    lida.log = lida.log.without_last()
    ana.save(lida)

    assert _xmins(pg_url, ana.dono, record.id) == {1: antes[1]}


def test_desfazer_e_responder_outra_coisa_troca_a_ponta(pg_url, repo, record, clock):
    """Mesma sequencia, declaracao diferente: a linha velha nao pode ficar."""
    ana = repo()
    ana.save(record)
    lida = ana.get(record.id)
    lida.log = lida.log.without_last().record(
        TradeoffAnswer(0, 1, 0.75, Preference.FIRST), clock
    )
    ana.save(lida)

    guardada = ana.get(record.id)
    assert guardada.log.to_list() == lida.log.to_list()
    assert guardada.log.entries[-1].statement.preference is Preference.FIRST


def test_favorita_nao_reescreve_o_documento_do_problema(pg_url, repo, record):
    """O documento e a parte grande; marcar favorita nao pode tocar nele.

    Medido pelo ponteiro TOAST: um documento reescrito ganha outro, mesmo com o
    mesmo conteudo. Com um documento pequeno nao ha TOAST, entao o teste usa um
    problema grande o bastante para ir para fora da linha.
    """
    import numpy as np

    grande = make_problem(np.arange(200 * 10, dtype=float).reshape(200, 10).tolist())
    registro = DecisionRecord(id="grande1", problem=grande, log=AuditLog(),
                              created_at=record.created_at)
    ana = repo()
    ana.save(registro)

    def ponteiro():
        # pg_column_toast_chunk_id existe desde o PostgreSQL 17
        return _sql(pg_url, "SELECT pg_column_toast_chunk_id(problema) FROM decisoes"
                            " WHERE dono = %s AND id = %s",
                    (ana.dono, registro.id), dono=ana.dono)[0][0]

    antes = ponteiro()
    assert antes is not None, "o documento deveria estar fora da linha (TOAST)"

    lida = ana.get(registro.id)
    lida.favorite = True
    ana.save(lida)
    assert ponteiro() == antes

    # e quando o problema muda de fato, ele e regravado
    lida = ana.get(registro.id)
    lida.problem = make_problem((np.arange(2000, dtype=float) + 1).reshape(200, 10).tolist())
    ana.save(lida)
    assert ponteiro() != antes


# --- listagem ---------------------------------------------------------------


def test_listagem_bate_com_o_resumo_do_registro(repo, record):
    ana = repo()
    ana.save(record)
    [resumo] = ana.summaries()
    assert resumo == DecisionSummary.of(record)


def test_listagem_acompanha_respostas_e_favorita(repo, record, clock):
    ana = repo()
    ana.save(record)
    lida = ana.get(record.id)
    lida.log = lida.log.without_last()
    lida.favorite = True
    ana.save(lida)
    [resumo] = ana.summaries()
    assert (resumo.declaracoes, resumo.favorita) == (1, True)


# --- esquema e migracao -----------------------------------------------------


def test_esquema_aplicado_de_novo_nao_faz_nada(pg_url):
    with psycopg.connect(pg_url) as conn:
        assert aplicar_esquema(conn) == []


def test_dono_do_acervo():
    marca = "0123456789abcdef0123456789abcdef"
    assert dono_do_acervo(f"/dados/pessoas/{marca}") == marca
    assert dono_do_acervo("/dados/decisoes") == DONO_DA_PLATAFORMA
    # um diretorio qualquer chamado 'pessoas' nao basta: precisa ser uma marca
    assert dono_do_acervo("/dados/pessoas/../../etc") == DONO_DA_PLATAFORMA
    assert dono_do_acervo("/dados/pessoas/joao") == DONO_DA_PLATAFORMA


def test_importar_instalacao_leva_cada_acervo_ao_seu_dono(pg_url, tmp_path, record, clock):
    storage = tmp_path / "decisoes"
    marca = "fedcba9876543210fedcba9876543210"
    pessoa = tmp_path / "pessoas" / marca
    JsonFileDecisionRepository(storage).save(record)
    da_pessoa = DecisionRecord(id="dela01", problem=record.problem, log=AuditLog(),
                               created_at=clock.now())
    JsonFileDecisionRepository(pessoa).save(da_pessoa)
    # o rascunho mora ao lado da pasta da pessoa; nao e acervo
    (tmp_path / "pessoas" / f"{marca}.rascunho.json").write_text("{}", encoding="utf-8")

    # a plataforma e compartilhada entre os testes deste banco: apaga antes o
    # que tiver estes identificadores, para a contagem ser so deste teste
    pool = pool_para(pg_url)
    for dono, ident in ((DONO_DA_PLATAFORMA, record.id), (marca, "dela01")):
        try:
            PostgresDecisionRepository(pool, dono).delete(ident)
        except RecordNotFound:
            pass

    assert importar_instalacao(pg_url, storage) == {"importadas": 2, "ja_existiam": 0}
    assert importar_instalacao(pg_url, storage) == {"importadas": 0, "ja_existiam": 2}

    assert PostgresDecisionRepository(pool, marca).get("dela01").id == "dela01"
    with pytest.raises(RecordNotFound):
        PostgresDecisionRepository(pool, marca).get(record.id)
    assert (
        PostgresDecisionRepository(pool, DONO_DA_PLATAFORMA).get(record.id).log.to_list()
        == record.log.to_list()
    )


# --- o motor inteiro sobre o banco -----------------------------------------


def _roteiro(service: DecisionService) -> list[dict]:
    """Uma elicitacao curta, com desfazer no meio. Devolve cada estado."""
    criado = service.create(
        nome="Fornecedores",
        alternativas=["A", "B", "C", "D"],
        criterios=[
            {"chave": "preco", "nome": "Preco", "direcao": "min"},
            {"chave": "prazo", "nome": "Prazo", "direcao": "min"},
            {"chave": "qualidade", "nome": "Qualidade", "direcao": "max"},
        ],
        consequencias=[[100, 10, 7], [80, 15, 6], [120, 5, 9], [90, 12, 5]],
    )
    ident = criado["id"]
    estados = [service.rank_criteria(ident, ["qualidade", "preco", "prazo"])]
    for resposta in ("A", "B", "A"):
        if estados[-1].get("encerrado"):
            break
        estados.append(service.answer(ident, resposta))
    estados.append(service.undo(ident))
    estados.append(service.state(ident))
    return estados


def test_elicitacao_no_banco_da_o_mesmo_resultado_que_em_arquivo(
    pg_url, tmp_path, clock, novo_dono
):
    from fitradeoff.solvers import HighsLinearSolver

    def service(**onde):
        return DecisionService(
            build_container(clock=clock, solver=HighsLinearSolver(), **onde),
            make_id=lambda: "roteiro01",
        )

    em_arquivo = _roteiro(service(storage=tmp_path / "arquivos"))
    dono = tmp_path / "pessoas" / novo_dono()
    no_banco = _roteiro(service(storage=dono, database_url=pg_url))

    assert json.dumps(no_banco, sort_keys=True) == json.dumps(em_arquivo, sort_keys=True)


# --- banco fora do ar -------------------------------------------------------
# Estes nao precisam de banco: precisam justamente de nenhum.

INALCANCAVEL = "postgresql://ninguem:x@127.0.0.1:1/nada"


def test_banco_fora_do_ar_nao_deixa_pool_nem_thread_para_tras(monkeypatch):
    """Cada pedido deixava um pool reconectando e threads orfas."""
    from fitradeoff.repositories import postgres

    monkeypatch.setenv("FITRADEOFF_DB_ESPERA", "2")
    antes = threading.active_count()
    for _ in range(2):
        with pytest.raises(StorageUnavailable):
            pool_para(INALCANCAVEL)
    assert INALCANCAVEL not in postgres._pools
    assert threading.active_count() == antes


def test_sem_conexao_livre_vira_storage_unavailable(pg_pool, novo_dono, record):
    """Pool esgotado ou banco caido no meio: nome proprio, para a API dar 503."""
    from psycopg_pool import ConnectionPool

    pequeno = ConnectionPool(pg_pool.conninfo, min_size=1, max_size=1, timeout=0.3, open=True)
    try:
        repo = PostgresDecisionRepository(pequeno, novo_dono())
        with pequeno.connection():  # a unica conexao, presa
            with pytest.raises(StorageUnavailable):
                repo.summaries()
    finally:
        pequeno.close()
