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
    "list_problematics",
    "create_problem",
    "list_problems",
    "get_problem",
    "rank_criteria",
    "next_question",
    "answer",
    "record_judgment",
    "undo",
    "status",
    "explain",
    "change_problematic",
    "sensitivity_analysis",
    "set_equivalence_threshold",
    "consequence_sensitivity",
    "diagnose_inconsistency",
    "resolve_inconsistency",
    "max_differences",
    "set_value_curve",
}


@pytest.fixture(autouse=True)
def isolated_storage(tmp_path, monkeypatch):
    """Cada teste escreve num diretorio proprio."""
    monkeypatch.setenv("FITRADEOFF_DATA", str(tmp_path))


@pytest.fixture
def problema():
    return srv.create_problem("Fornecedores", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS)


# --- protocolo ----------------------------------------------------------------


def test_ferramentas_expostas():
    tools = asyncio.run(srv.server.list_tools())
    assert {t.name for t in tools} == FERRAMENTAS
    for tool in tools:
        assert tool.description, f"{tool.name} sem descricao"


def test_assinaturas_preservadas_apesar_do_decorador():
    tools = {t.name: t for t in asyncio.run(srv.server.list_tools())}
    propriedades = set(tools["create_problem"].input_schema["properties"])
    assert propriedades == {
        "nome", "alternativas", "criterios", "consequencias",
        "problematica", "configuracao", "custos", "limiar_de_equivalencia",
    }


def test_instrucoes_orientam_o_agente():
    assert "not invent answers" in srv.INSTRUCTIONS
    assert "approximate result" in srv.INSTRUCTIONS


def test_instrucoes_conduzem_sem_engessar():
    # fala a lingua do decisor, mas os parametros ficam como documentados
    assert "the language they write in" in srv.INSTRUCTIONS
    # entender o caso antes de registrar, e sem impor a problematica
    assert "Understand the case before creating it" in srv.INSTRUCTIONS
    assert "how deep they want to go" in srv.INSTRUCTIONS
    assert "Save the DM's decisions" in srv.INSTRUCTIONS
    # o tom acompanha o publico
    assert "Read your audience" in srv.INSTRUCTIONS
    # caso fora do formato do metodo e enquadrado, nao forcado
    assert "Frame the problem" in srv.INSTRUCTIONS
    # recomecar nao herda nada sem confirmacao
    assert "Starting over is a new decision" in srv.INSTRUCTIONS
    # a comparacao direta e oferecida, nao imposta
    assert "The path is the DM's choice" in srv.INSTRUCTIONS
    # ordenar criterios nao e a problematica ranking
    assert "nothing to do with the `ranking`" in srv.INSTRUCTIONS


# --- erros viram resposta, nao excecao ----------------------------------------


@pytest.mark.parametrize(
    "chamada",
    [
        lambda: srv.status("fantasma"),
        lambda: srv.get_problem("fantasma"),
        lambda: srv.explain("fantasma"),
        lambda: srv.undo("fantasma"),
        lambda: srv.rank_criteria("fantasma", ["a"]),
        lambda: srv.create_problem("x", ALTERNATIVAS, CRITERIOS, [[1.0, 2.0, 3.0]]),
        lambda: srv.create_problem(
            "x", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS, problematica="magica"
        ),
    ],
)
def test_falhas_previsiveis_devolvem_erro_legivel(chamada):
    resposta = chamada()
    assert "erro" in resposta
    assert isinstance(resposta["erro"], str) and resposta["erro"]


def test_perguntar_antes_de_ordenar_orienta(problema):
    assert "ordene os criterios" in srv.next_question(problema["id"])["erro"]


def test_ordenacao_incompleta_aponta_o_que_falta(problema):
    resposta = srv.rank_criteria(problema["id"], ["qualidade", "custo"])
    assert "prazo" in resposta["erro"]


def test_resposta_invalida_e_recusada(problema):
    srv.rank_criteria(problema["id"], ["qualidade", "custo", "prazo"])
    assert "erro" in srv.answer(problema["id"], "talvez")


# --- fluxo --------------------------------------------------------------------


def test_fluxo_completo(problema):
    id_ = problema["id"]
    assert "ordene os critérios" in problema["proximo_passo"]

    estado = srv.rank_criteria(id_, ["qualidade", "custo", "prazo"])
    assert estado["consistente"]

    for _ in range(30):
        pergunta = srv.next_question(id_)
        if pergunta.get("pergunta", "sentinela") is None:
            break
        assert "pior desempenho possivel" in pergunta["enunciado"]
        assert 0.0 < pergunta["posicao_na_escala"] < 1.0
        estado = srv.answer(id_, "A")
        assert "erro" not in estado
    else:
        pytest.fail("A elicitacao nao encerrou.")

    final = srv.status(id_)
    assert final["encerrado"]
    assert final["analise"]["resumo"]


def test_estado_sobrevive_entre_chamadas(problema):
    """O servidor nao guarda nada: tudo vem de replay do que esta em disco."""
    id_ = problema["id"]
    srv.rank_criteria(id_, ["qualidade", "custo", "prazo"])
    srv.answer(id_, "A")

    # cada ferramenta monta um servico novo, como um processo reiniciado faria
    assert srv.status(id_)["declaracoes"] == 2


def test_desfazer(problema):
    id_ = problema["id"]
    srv.rank_criteria(id_, ["qualidade", "custo", "prazo"])
    srv.answer(id_, "A")
    assert srv.undo(id_)["declaracoes"] == 1
    srv.undo(id_)
    assert "Nao ha declaracao" in srv.undo(id_)["erro"]


def test_julgamento_holistico(problema):
    id_ = problema["id"]
    srv.rank_criteria(id_, ["qualidade", "custo", "prazo"])
    estado = srv.record_judgment(id_, preferida="Fornecedor B", sobre="Fornecedor C")
    assert estado["declaracoes"] == 2
    assert "erro" in srv.record_judgment(id_, preferida="Inexistente", sobre="Fornecedor C")


def test_explicar_fala_em_portugues(problema):
    id_ = problema["id"]
    srv.rank_criteria(id_, ["qualidade", "custo", "prazo"])
    srv.answer(id_, "B")

    trilha = srv.explain(id_)
    texto = " ".join(d["declaracao"] for d in trilha["declaracoes"])
    assert "Indice de qualidade" in texto
    assert "k[" not in texto
    assert trilha["declaracoes"][0]["autor"] == "decisor"


# --- as problematicas ---------------------------------------------------------


def test_listar_problematicas():
    disponiveis = srv.list_problematics()["disponiveis"]
    assert set(disponiveis) == {
        "escolha", "ranking", "sorting", "portfolio", "beneficio_custo"
    }


def test_criar_com_cada_problematica():
    escolha = srv.create_problem("E", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS)
    ranking = srv.create_problem(
        "R", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS, problematica="ranking"
    )
    sorting = srv.create_problem(
        "S", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS,
        problematica="sorting", configuracao={"perfis": [0.5]},
    )
    portfolio = srv.create_problem(
        "P", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS,
        problematica="portfolio",
        configuracao={"orcamento": 25.0},
        custos=[10.0, 12.0, 8.0, 11.0],
    )
    razao = srv.create_problem(
        "B", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS,
        problematica="beneficio_custo",
        configuracao={"orcamento": 25.0},
        custos=[10.0, 12.0, 8.0, 11.0],
    )
    for criada in (escolha, ranking, sorting, portfolio, razao):
        assert "erro" not in criada


def test_sorting_sem_perfis_e_recusado():
    resposta = srv.create_problem(
        "S", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS, problematica="sorting"
    )
    assert "perfil" in resposta["erro"]


def test_portfolio_sem_custos_e_recusado():
    resposta = srv.create_problem(
        "P", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS,
        problematica="portfolio", configuracao={"orcamento": 25.0},
    )
    assert "custo" in resposta["erro"]


def test_portfolio_declara_a_ressalva():
    criada = srv.create_problem(
        "P", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS,
        problematica="portfolio",
        configuracao={"orcamento": 25.0, "amostras": 6},
        custos=[10.0, 12.0, 8.0, 11.0],
    )
    srv.rank_criteria(criada["id"], ["qualidade", "custo", "prazo"])
    analise = srv.status(criada["id"])["analise"]
    assert "aproximado" in analise["ressalva"]
    for carteira in analise["portfolios_encontrados"]:
        assert carteira["custo"] <= 25.0 + 1e-9


def test_beneficio_custo_publica_as_faixas_de_razao():
    criada = srv.create_problem(
        "B", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS,
        problematica="beneficio_custo",
        configuracao={"orcamento": 25.0, "amostras": 6},
        custos=[10.0, 12.0, 8.0, 11.0],
    )
    srv.rank_criteria(criada["id"], ["qualidade", "custo", "prazo"])
    analise = srv.status(criada["id"])["analise"]

    assert set(analise["razoes"]) == set(ALTERNATIVAS)
    assert "Aproximado" in analise["ressalva"]
    for carteira in analise["portfolios_encontrados"]:
        assert carteira["custo"] <= 25.0 + 1e-9


def test_mudar_de_problematica_reaproveita_as_respostas(problema):
    id_ = problema["id"]
    srv.rank_criteria(id_, ["qualidade", "custo", "prazo"])
    srv.answer(id_, "A")

    como_ranking = srv.change_problematic(id_, "ranking")
    assert como_ranking["declaracoes"] == 2
    assert "posicoes_possiveis" in como_ranking["analise"]

    como_sorting = srv.change_problematic(id_, "sorting", {"perfis": [0.5]})
    assert "alocacao" in como_sorting["analise"]

    assert "erro" in srv.change_problematic(id_, "sorting", {})


def test_analise_de_sensibilidade_nao_altera_o_log(problema):
    id_ = problema["id"]
    srv.rank_criteria(id_, ["qualidade", "custo", "prazo"])
    srv.answer(id_, "A")

    resultado = srv.sensitivity_analysis(id_, [0.0, 0.01, 0.5])
    assert len(resultado["cenarios"]) == 3
    assert srv.status(id_)["declaracoes"] == 2


def test_listar_problemas(problema):
    srv.create_problem("Outro", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS)
    decisoes = srv.list_problems()["decisoes"]
    assert len(decisoes) == 2


def test_limiar_de_equivalencia_e_configuravel(problema):
    """O padrao continua 0,01, e a troca atravessa a fronteira do processo:
    cada chamada monta um servico novo e rele o arquivo."""
    assert srv.status(problema["id"])["limiar_de_equivalencia"] == 0.01

    ajustada = srv.set_equivalence_threshold(problema["id"], 0.05)
    assert ajustada["limiar_de_equivalencia"] == 0.05
    assert srv.status(problema["id"])["limiar_de_equivalencia"] == 0.05

    srv.set_equivalence_threshold(problema["id"], None)
    assert srv.status(problema["id"])["limiar_de_equivalencia"] == 0.01


def test_limiar_absurdo_devolve_erro_legivel(problema):
    erro = srv.set_equivalence_threshold(problema["id"], 42.0)
    assert "entre 0 e 0.5" in erro["erro"]


def test_criar_com_limiar_proprio(problema):
    criada = srv.create_problem(
        "Com limiar", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS,
        limiar_de_equivalencia=0.05,
    )
    assert srv.status(criada["id"])["limiar_de_equivalencia"] == 0.05


# --- o que o motor ja tinha e o MCP passou a expor -----------------------------


def test_curva_de_valor_so_antes_da_ordenacao(problema):
    pontos = [[0.71, 0.0], [0.85, 0.8], [0.95, 1.0]]
    com_curva = srv.set_value_curve(problema["id"], "qualidade", pontos)
    assert "erro" not in com_curva

    srv.rank_criteria(problema["id"], ["qualidade", "custo", "prazo"])
    depois = srv.set_value_curve(problema["id"], "qualidade", None)
    assert "antes de ordenar" in depois["erro"]


def test_curva_invalida_devolve_erro_legivel(problema):
    erro = srv.set_value_curve(problema["id"], "qualidade", [[0.71, 0.0], [0.95, 0.5]])
    assert "valor 0" in erro["erro"]


def test_diagnostico_de_decisao_coerente(problema):
    srv.rank_criteria(problema["id"], ["qualidade", "custo", "prazo"])
    assert srv.diagnose_inconsistency(problema["id"])["inconsistente"] is False


def test_saida_de_inconsistencia_desconhecida_devolve_erro(problema):
    srv.rank_criteria(problema["id"], ["qualidade", "custo", "prazo"])
    erro = srv.resolve_inconsistency(problema["id"], "apagar_tudo")
    assert "erro" in erro


def test_sensibilidade_das_consequencias(problema):
    srv.rank_criteria(problema["id"], ["qualidade", "custo", "prazo"])
    analise = srv.consequence_sensitivity(
        problema["id"], [{"criterio": "custo", "para_baixo": 5, "para_cima": 5}],
        cenarios=20,
    )
    assert "erro" not in analise


def test_sensibilidade_das_consequencias_exige_a_ordem(problema):
    erro = srv.consequence_sensitivity(problema["id"], [{"criterio": "custo"}])
    assert "ordenacao" in erro["erro"]


def test_diferencas_maximas_no_ranking():
    criada = srv.create_problem(
        "Ordem", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS, problematica="ranking"
    )
    srv.rank_criteria(criada["id"], ["qualidade", "custo", "prazo"])
    assert "diferencas_maximas" in srv.max_differences(criada["id"])


# --- conflito: onde as alternativas disputam ----------------------------------

CRITERIOS_CARRO = [
    {"chave": "preco", "nome": "Preco", "direcao": "min"},
    {"chave": "porta_malas", "nome": "Porta-malas", "direcao": "max"},
    {"chave": "km", "nome": "Quilometragem", "direcao": "min"},
    {"chave": "ano", "nome": "Ano", "direcao": "max"},
    {"chave": "consumo", "nome": "Consumo", "direcao": "max"},
]
CARROS = ["Logan", "Voyage", "Fiesta", "Prisma", "207"]
MATRIZ_CARRO = [
    [20900, 510, 149800, 2013, 12.4],
    [28000, 480, 124232, 2011, 10.7],
    [29900, 440, 140692, 2011, 11.9],
    [29900, 439, 106000, 2008, 10.4],
    [15990, 420, 162000, 2012, 10.6],
]


def test_conflito_aponta_quem_lidera_quase_tudo():
    """O caso que motivou o mapa: a decisao se resolveu com uma pergunta, e o
    decisor achou que o metodo tinha decidido por ele. Quem decidiu foram os
    criterios, e isso precisa aparecer ANTES das perguntas."""
    criada = srv.create_problem("Carro", CARROS, CRITERIOS_CARRO, MATRIZ_CARRO)
    conflito = criada["conflito"]

    [lider] = conflito["lider_amplo"]
    assert lider["alternativa"] == "Logan"
    assert (lider["melhor_em"], lider["de"]) == (3, 5)
    assert lider["perde_em"] == ["Preco", "Quilometragem"]
    assert set(conflito["sem_vantagem_propria"]) == {"Voyage", "Fiesta"}
    assert conflito["leitura"]

    # e continua disponivel depois, para quando a ordem eliminar quase todas
    assert srv.get_problem(criada["id"])["conflito"] == conflito


def test_matriz_com_disputa_nao_acusa_lider():
    """Cada fornecedor e o melhor num criterio: ha trade-off em todo par."""
    matriz = [[0.95, 15.0, 30], [0.70, 10.0, 25], [0.80, 12.0, 10]]
    criada = srv.create_problem("Disputa", ALTERNATIVAS[:3], CRITERIOS, matriz)
    assert criada["conflito"]["lider_amplo"] == []
    assert criada["conflito"]["sem_vantagem_propria"] == []


def test_criterio_igual_em_todas_nao_diferencia():
    criterios = [*CRITERIOS, {"chave": "garantia", "nome": "Garantia", "direcao": "max"}]
    matriz = [linha + [12] for linha in CONSEQUENCIAS]
    criada = srv.create_problem("Garantia igual", ALTERNATIVAS, criterios, matriz)
    assert criada["conflito"]["criterios_que_nao_diferenciam"] == ["Garantia"]
