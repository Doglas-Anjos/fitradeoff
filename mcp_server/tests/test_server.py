"""Servidor MCP: traducao de protocolo e tratamento de erro.

A regra de decisao e testada no motor; aqui verificamos que as ferramentas
existem, recebem o que dizem receber e nunca vazam excecao para o agente.
"""

import asyncio

import pytest

from fitradeoff_mcp import server as srv

CRITERIOS = [
    {"chave": "qualidade", "nome": "Indice de qualidade", "direcao": "max"},
    {"chave": "custo", "nome": "Custo unitario", "direcao": "min", "unidade": "R$/un"},
    {"chave": "prazo", "nome": "Prazo de entrega", "direcao": "min", "unidade": "dias"},
]
CONSEQUENCIAS = [
    [0.82, 12.50, 30],
    [0.95, 15.80, 12],
    [0.71, 10.20, 45],
    [0.88, 14.10, 20],
]
ALTERNATIVAS = ["Fornecedor A", "Fornecedor B", "Fornecedor C", "Fornecedor D"]

FERRAMENTAS = {
    "listar_problematicas",
    "criar_problema",
    "listar_problemas",
    "ver_problema",
    "ordenar_criterios",
    "proxima_pergunta",
    "responder",
    "julgar",
    "desfazer",
    "situacao",
    "explicar",
    "mudar_problematica",
    "analise_sensibilidade",
}


@pytest.fixture(autouse=True)
def isolated_storage(tmp_path, monkeypatch):
    """Cada teste escreve num diretorio proprio."""
    monkeypatch.setenv("FITRADEOFF_DATA", str(tmp_path))


@pytest.fixture
def problema():
    return srv.criar_problema("Fornecedores", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS)


# --- protocolo ----------------------------------------------------------------


def test_ferramentas_expostas():
    tools = asyncio.run(srv.server.list_tools())
    assert {t.name for t in tools} == FERRAMENTAS
    for tool in tools:
        assert tool.description, f"{tool.name} sem descricao"


def test_assinaturas_preservadas_apesar_do_decorador():
    tools = {t.name: t for t in asyncio.run(srv.server.list_tools())}
    propriedades = set(tools["criar_problema"].input_schema["properties"])
    assert propriedades == {
        "nome", "alternativas", "criterios", "consequencias",
        "problematica", "configuracao", "custos",
    }


def test_instrucoes_orientam_o_agente():
    assert "Nao invente respostas" in srv.INSTRUCTIONS
    assert "aproximado" in srv.INSTRUCTIONS


# --- erros viram resposta, nao excecao ----------------------------------------


@pytest.mark.parametrize(
    "chamada",
    [
        lambda: srv.situacao("fantasma"),
        lambda: srv.ver_problema("fantasma"),
        lambda: srv.explicar("fantasma"),
        lambda: srv.desfazer("fantasma"),
        lambda: srv.ordenar_criterios("fantasma", ["a"]),
        lambda: srv.criar_problema("x", ALTERNATIVAS, CRITERIOS, [[1.0, 2.0, 3.0]]),
        lambda: srv.criar_problema(
            "x", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS, problematica="magica"
        ),
    ],
)
def test_falhas_previsiveis_devolvem_erro_legivel(chamada):
    resposta = chamada()
    assert "erro" in resposta
    assert isinstance(resposta["erro"], str) and resposta["erro"]


def test_perguntar_antes_de_ordenar_orienta(problema):
    assert "ordene os criterios" in srv.proxima_pergunta(problema["id"])["erro"]


def test_ordenacao_incompleta_aponta_o_que_falta(problema):
    resposta = srv.ordenar_criterios(problema["id"], ["qualidade", "custo"])
    assert "prazo" in resposta["erro"]


def test_resposta_invalida_e_recusada(problema):
    srv.ordenar_criterios(problema["id"], ["qualidade", "custo", "prazo"])
    assert "erro" in srv.responder(problema["id"], "talvez")


# --- fluxo --------------------------------------------------------------------


def test_fluxo_completo(problema):
    id_ = problema["id"]
    assert "ordenar_criterios" in problema["proximo_passo"]

    estado = srv.ordenar_criterios(id_, ["qualidade", "custo", "prazo"])
    assert estado["consistente"]

    for _ in range(30):
        pergunta = srv.proxima_pergunta(id_)
        if pergunta.get("pergunta", "sentinela") is None:
            break
        assert "pior desempenho possivel" in pergunta["enunciado"]
        assert 0.0 < pergunta["posicao_na_escala"] < 1.0
        estado = srv.responder(id_, "A")
        assert "erro" not in estado
    else:
        pytest.fail("A elicitacao nao encerrou.")

    final = srv.situacao(id_)
    assert final["encerrado"]
    assert final["analise"]["resumo"]


def test_estado_sobrevive_entre_chamadas(problema):
    """O servidor nao guarda nada: tudo vem de replay do que esta em disco."""
    id_ = problema["id"]
    srv.ordenar_criterios(id_, ["qualidade", "custo", "prazo"])
    srv.responder(id_, "A")

    # cada ferramenta monta um servico novo, como um processo reiniciado faria
    assert srv.situacao(id_)["declaracoes"] == 2


def test_desfazer(problema):
    id_ = problema["id"]
    srv.ordenar_criterios(id_, ["qualidade", "custo", "prazo"])
    srv.responder(id_, "A")
    assert srv.desfazer(id_)["declaracoes"] == 1
    srv.desfazer(id_)
    assert "Nao ha declaracao" in srv.desfazer(id_)["erro"]


def test_julgamento_holistico(problema):
    id_ = problema["id"]
    srv.ordenar_criterios(id_, ["qualidade", "custo", "prazo"])
    estado = srv.julgar(id_, preferida="Fornecedor B", sobre="Fornecedor C")
    assert estado["declaracoes"] == 2
    assert "erro" in srv.julgar(id_, preferida="Inexistente", sobre="Fornecedor C")


def test_explicar_fala_em_portugues(problema):
    id_ = problema["id"]
    srv.ordenar_criterios(id_, ["qualidade", "custo", "prazo"])
    srv.responder(id_, "B")

    trilha = srv.explicar(id_)
    texto = " ".join(d["declaracao"] for d in trilha["declaracoes"])
    assert "Indice de qualidade" in texto
    assert "k[" not in texto
    assert trilha["declaracoes"][0]["autor"] == "decisor"


# --- as problematicas ---------------------------------------------------------


def test_listar_problematicas():
    disponiveis = srv.listar_problematicas()["disponiveis"]
    assert set(disponiveis) == {
        "escolha", "ranking", "sorting", "portfolio", "beneficio_custo"
    }


def test_criar_com_cada_problematica():
    escolha = srv.criar_problema("E", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS)
    ranking = srv.criar_problema(
        "R", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS, problematica="ranking"
    )
    sorting = srv.criar_problema(
        "S", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS,
        problematica="sorting", configuracao={"perfis": [0.5]},
    )
    portfolio = srv.criar_problema(
        "P", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS,
        problematica="portfolio",
        configuracao={"orcamento": 25.0},
        custos=[10.0, 12.0, 8.0, 11.0],
    )
    razao = srv.criar_problema(
        "B", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS,
        problematica="beneficio_custo",
        configuracao={"orcamento": 25.0},
        custos=[10.0, 12.0, 8.0, 11.0],
    )
    for criada in (escolha, ranking, sorting, portfolio, razao):
        assert "erro" not in criada


def test_sorting_sem_perfis_e_recusado():
    resposta = srv.criar_problema(
        "S", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS, problematica="sorting"
    )
    assert "perfil" in resposta["erro"]


def test_portfolio_sem_custos_e_recusado():
    resposta = srv.criar_problema(
        "P", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS,
        problematica="portfolio", configuracao={"orcamento": 25.0},
    )
    assert "custo" in resposta["erro"]


def test_portfolio_declara_a_ressalva():
    criada = srv.criar_problema(
        "P", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS,
        problematica="portfolio",
        configuracao={"orcamento": 25.0, "amostras": 6},
        custos=[10.0, 12.0, 8.0, 11.0],
    )
    srv.ordenar_criterios(criada["id"], ["qualidade", "custo", "prazo"])
    analise = srv.situacao(criada["id"])["analise"]
    assert "aproximado" in analise["ressalva"]
    for carteira in analise["portfolios_encontrados"]:
        assert carteira["custo"] <= 25.0 + 1e-9


def test_beneficio_custo_publica_as_faixas_de_razao():
    criada = srv.criar_problema(
        "B", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS,
        problematica="beneficio_custo",
        configuracao={"orcamento": 25.0, "amostras": 6},
        custos=[10.0, 12.0, 8.0, 11.0],
    )
    srv.ordenar_criterios(criada["id"], ["qualidade", "custo", "prazo"])
    analise = srv.situacao(criada["id"])["analise"]

    assert set(analise["razoes"]) == set(ALTERNATIVAS)
    assert "Aproximado" in analise["ressalva"]
    for carteira in analise["portfolios_encontrados"]:
        assert carteira["custo"] <= 25.0 + 1e-9


def test_mudar_de_problematica_reaproveita_as_respostas(problema):
    id_ = problema["id"]
    srv.ordenar_criterios(id_, ["qualidade", "custo", "prazo"])
    srv.responder(id_, "A")

    como_ranking = srv.mudar_problematica(id_, "ranking")
    assert como_ranking["declaracoes"] == 2
    assert "posicoes_possiveis" in como_ranking["analise"]

    como_sorting = srv.mudar_problematica(id_, "sorting", {"perfis": [0.5]})
    assert "alocacao" in como_sorting["analise"]

    assert "erro" in srv.mudar_problematica(id_, "sorting", {})


def test_analise_de_sensibilidade_nao_altera_o_log(problema):
    id_ = problema["id"]
    srv.ordenar_criterios(id_, ["qualidade", "custo", "prazo"])
    srv.responder(id_, "A")

    resultado = srv.analise_sensibilidade(id_, [0.0, 0.01, 0.5])
    assert len(resultado["cenarios"]) == 3
    assert srv.situacao(id_)["declaracoes"] == 2


def test_listar_problemas(problema):
    srv.criar_problema("Outro", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS)
    decisoes = srv.listar_problemas()["decisoes"]
    assert len(decisoes) == 2
