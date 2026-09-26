"""As cinco problematicas, e o avaliador que as sustenta."""

import numpy as np
import pytest

from conftest import make_problem
from fitradeoff.domain import CriteriaRanking, WeightSpace
from fitradeoff.problematics import (
    BenefitCostProblematic,
    ChoiceProblematic,
    Evaluator,
    PortfolioProblematic,
    RankingProblematic,
    SortingProblematic,
    default_registry,
)
from fitradeoff.problematics.registry import UnknownProblematic
from fitradeoff.solvers import ScipyIntegerSolver


def space_for(problem, order, epsilon=0.0):
    return WeightSpace(problem.n_criteria).with_constraints(
        CriteriaRanking(tuple(order)).constraints(problem, epsilon)
    )


# --- avaliador ----------------------------------------------------------------


def test_ordenacao_limita_faixa_das_constantes_de_escala(evaluator):
    problem = make_problem([[1.0, 0.0], [0.0, 1.0]])
    space = space_for(problem, [0, 1])
    k0, k1 = evaluator.weight_bounds(problem, space)
    # k0 >= k1 com soma 1 implica k0 em [0.5, 1] e k1 em [0, 0.5]
    assert (k0.lower, k0.upper) == pytest.approx((0.5, 1.0))
    assert (k1.lower, k1.upper) == pytest.approx((0.0, 0.5))


def test_preferencias_contraditorias_esvaziam_o_espaco(evaluator):
    problem = make_problem([[1.0, 0.0], [0.0, 1.0]])
    space = space_for(problem, [0, 1], epsilon=1e-3)
    contraditorio = space.with_constraints(
        CriteriaRanking((1, 0)).constraints(problem, 1e-3)
    )
    assert evaluator.is_consistent(space)
    assert not evaluator.is_consistent(contraditorio)


def test_alternativa_pior_em_tudo_e_dominada(evaluator):
    problem = make_problem([[0.5, 0.5], [0.4, 0.4], [1.0, 0.0], [0.0, 1.0]])
    space = space_for(problem, [0, 1])
    assert evaluator.dominates(problem, space, 0, 1)
    assert not evaluator.dominates(problem, space, 1, 0)
    assert 1 not in evaluator.potentially_optimal(problem, space)


def test_dominancia_restrita_ao_subconjunto_coincide_com_a_completa(evaluator):
    rng = np.random.default_rng(3)
    problem = make_problem(rng.random((12, 4)), names=[f"a{i}" for i in range(12)])
    space = space_for(problem, range(4))

    completa = evaluator.dominance_matrix(problem, space)
    poas = evaluator.potentially_optimal(problem, space)
    restrita = evaluator.dominance_matrix(problem, space, subset=poas)

    for i in poas:
        for l in poas:
            assert restrita[i, l] == completa[i, l]


def test_limiar_de_equivalencia_resolve_empate(evaluator):
    problem = make_problem([[1.0, 0.0], [0.0, 1.0], [0.5, 0.5]])
    # k0 >= k1 nao estrito admite k0 = k1 = 0.5, onde as tres empatam
    assert evaluator.potentially_optimal(problem, space_for(problem, [0, 1])) == (0, 1, 2)
    # k0 > k1 estrito deixa so a melhor no criterio de maior peso
    estrito = space_for(problem, [0, 1], epsilon=1e-3)
    assert evaluator.potentially_optimal(problem, estrito) == (0,)


def test_vertices_amostrados_sao_viaveis(evaluator):
    problem = make_problem([[1.0, 0.0, 0.5], [0.0, 1.0, 0.5], [0.5, 0.5, 1.0]])
    space = space_for(problem, [0, 1, 2])
    vertices = evaluator.sample_weight_vertices(problem, space, extra=6, seed=1)

    assert vertices
    for weights in vertices:
        assert weights.sum() == pytest.approx(1.0)
        assert (weights >= -1e-9).all()
        assert weights[0] >= weights[1] - 1e-9  # respeita a ordem declarada


# --- escolha ------------------------------------------------------------------


def test_escolha_resolve_quando_sobra_uma_poa(evaluator):
    problem = make_problem([[1.0, 0.0], [0.0, 1.0], [0.5, 0.5]])
    analysis = ChoiceProblematic(evaluator).analyse(
        problem, space_for(problem, [0, 1], epsilon=1e-3)
    )
    assert analysis.resolved
    assert analysis.detail["recomendacao"] == "A"
    assert analysis.undecided == ()


def test_escolha_lista_poas_quando_indefinido(evaluator):
    problem = make_problem([[1.0, 0.0], [0.0, 1.0], [0.5, 0.5]])
    analysis = ChoiceProblematic(evaluator).analyse(problem, space_for(problem, [0, 1]))
    assert not analysis.resolved
    assert len(analysis.undecided) == 3
    assert analysis.detail["recomendacao"] is None


# --- ranking ------------------------------------------------------------------


def test_ranking_com_dominancia_total_fica_completo(evaluator):
    # cada alternativa domina a seguinte em todos os criterios
    problem = make_problem([[3.0, 3.0], [2.0, 2.0], [1.0, 1.0]], names=["X", "Y", "Z"])
    analysis = RankingProblematic(evaluator).analyse(problem, space_for(problem, [0, 1]))

    assert analysis.resolved
    assert analysis.detail["ordem_definida"] == ["X", "Y", "Z"]
    assert analysis.detail["posicoes_possiveis"]["X"] == [1, 1]


def test_ranking_parcial_aponta_os_pares_indefinidos(evaluator):
    # X ganha de Y quando o primeiro criterio pesa muito, Y ganha quando pesa
    # pouco: a ordem entre os dois depende de informacao que ainda falta
    problem = make_problem(
        [[1.0, 0.0], [0.4, 1.0], [0.0, 0.5]], names=["X", "Y", "Z"]
    )
    analysis = RankingProblematic(evaluator).analyse(problem, space_for(problem, [0, 1]))

    assert not analysis.resolved
    assert analysis.detail["posicoes_possiveis"]["X"] == [1, 2]
    assert "X vs Y" in analysis.detail["pares_indefinidos"]


def test_empate_no_limiar_fecha_a_ordem_como_pre_ordem(evaluator):
    """Duas alternativas indistinguiveis nao deixam o ranking em aberto.

    Com o limiar de equivalencia a dominancia deixa de ser antissimetrica: as
    duas "superam" uma a outra. Isso e empate, e empate e resultado -- diz que
    nenhuma pergunta futura as separaria.
    """
    from fitradeoff.problematics.evaluator import Evaluator

    # X domina folgado; Y e Z ficam a 0,004 de distancia, dentro do limiar
    problem = make_problem(
        [[1.0, 1.0], [0.5, 0.5], [0.496, 0.504]], names=["X", "Y", "Z"]
    )
    folgado = Evaluator(evaluator.solver, equivalence=0.01)
    analysis = RankingProblematic(folgado).analyse(problem, space_for(problem, [0, 1]))

    assert analysis.resolved
    assert "Pré-ordem completa" in analysis.headline
    assert analysis.detail["posicoes_possiveis"]["X"] == [1, 1]
    # Y e Z dividem a mesma faixa, e ela nao pode estar invertida
    for nome in ("Y", "Z"):
        primeira, ultima = analysis.detail["posicoes_possiveis"][nome]
        assert primeira <= ultima, (nome, primeira, ultima)
        assert [primeira, ultima] == [2, 3]


def test_faixa_de_posicao_nunca_sai_invertida(evaluator):
    """Regressao: somar empate como dominancia dupla dava [12-11].

    A aritmetica de posicao conta quantas superam e quantas sao superadas. Se o
    empate entrasse nas duas contagens, os dois extremos se cruzavam e a tela
    exibia uma faixa que nao existe.
    """
    from fitradeoff.problematics.evaluator import Evaluator

    problem = make_problem(
        [[0.500, 0.500], [0.502, 0.498], [0.498, 0.502], [0.0, 0.0]],
        names=["A", "B", "C", "D"],
    )
    folgado = Evaluator(evaluator.solver, equivalence=0.05)
    analysis = RankingProblematic(folgado).analyse(problem, space_for(problem, [0, 1]))

    for nome, (primeira, ultima) in analysis.detail["posicoes_possiveis"].items():
        assert primeira <= ultima, (nome, primeira, ultima)


def test_alternativa_sempre_ao_menos_tao_boa_fica_a_frente(evaluator):
    # X nunca perde para Y, ainda que empate em k0 = k1 = 0.5: dominancia fraca
    # basta para fixar a posicao no ranking
    problem = make_problem([[1.0, 0.0], [0.0, 1.0]], names=["X", "Y"])
    analysis = RankingProblematic(evaluator).analyse(problem, space_for(problem, [0, 1]))
    assert analysis.resolved
    assert analysis.detail["ordem_definida"] == ["X", "Y"]


# --- sorting ------------------------------------------------------------------


def test_sorting_exige_perfis(evaluator):
    with pytest.raises(ValueError, match="ao menos um perfil"):
        SortingProblematic(evaluator, profiles=())


def test_sorting_recusa_perfil_fora_do_intervalo(evaluator):
    with pytest.raises(ValueError, match="em \\(0, 1\\)"):
        SortingProblematic(evaluator, profiles=(1.5,))


def test_sorting_recusa_nomes_de_classe_em_numero_errado(evaluator):
    with pytest.raises(ValueError, match="foram dados"):
        SortingProblematic(evaluator, profiles=(0.5,), class_names=("a", "b", "c"))


def test_sorting_classifica_quando_a_faixa_cabe_numa_classe(evaluator):
    # com pesos quaisquer, a melhor vale 1.0 e a pior vale 0.0
    problem = make_problem([[1.0, 1.0], [0.0, 0.0]], names=["Otima", "Pessima"])
    sorting = SortingProblematic(
        evaluator, profiles=(0.5,), class_names=("Rejeitada", "Aprovada")
    )
    analysis = sorting.analyse(problem, space_for(problem, [0, 1]))

    assert analysis.resolved
    alocacao = analysis.detail["alocacao"]
    assert alocacao["Otima"]["classes_possiveis"] == ["Aprovada"]
    assert alocacao["Pessima"]["classes_possiveis"] == ["Rejeitada"]


def test_sorting_ignora_cruzamento_menor_que_meio_limiar(evaluator):
    """A faixa encolhe pelo limiar antes de se perguntar que classes ela toca.

    A **metade** de cada lado nao e arbitraria: e o que reproduz as quatro
    medidas feitas contra o sistema oficial. Com o limiar inteiro, a primeira
    delas ja classificaria, e o oficial seguiu perguntando:

        largura  sobra menor   oficial
        0.0171     0.0083      segue
        0.0088     0.0005      classifica
        0.0401     0.0186      segue
        0.0207     0.0021      classifica
    """
    from fitradeoff.problematics.evaluator import Evaluator

    sorting = SortingProblematic(
        Evaluator(evaluator.solver, equivalence=0.01), profiles=(0.5,)
    )
    # sobra de 0.002 de um lado: abaixo de metade do limiar, nao conta
    assert sorting._classes_for(0.498, 0.530) == (1,)
    # sobra de 0.008: acima da metade, atravessa mesmo
    assert sorting._classes_for(0.492, 0.530) == (0, 1)
    # simetrico, do outro lado do corte
    assert sorting._classes_for(0.470, 0.502) == (0,)


def test_sorting_faixa_mais_estreita_que_o_limiar_cai_no_meio(evaluator):
    """Encolher uma faixa menor que o limiar a inverteria: vale o meio."""
    from fitradeoff.problematics.evaluator import Evaluator

    sorting = SortingProblematic(
        Evaluator(evaluator.solver, equivalence=0.05), profiles=(0.5,)
    )
    # 0.498..0.502 mede 0.004, menos que o limiar; o meio (0.500) decide
    classes = sorting._classes_for(0.498, 0.502)
    assert len(classes) == 1


def test_sorting_deixa_indefinida_a_alternativa_que_atravessa_perfil(evaluator):
    # corte em 0.4 para que Y, em [0, 0.5], atravesse por 0.1 -- bem acima de
    # metade do limiar, que e o que o encolhimento perdoa
    problem = make_problem([[1.0, 0.0], [0.0, 1.0]], names=["X", "Y"])
    sorting = SortingProblematic(evaluator, profiles=(0.4,))
    analysis = sorting.analyse(problem, space_for(problem, [0, 1]))

    assert not analysis.resolved
    assert len(analysis.detail["alocacao"]["Y"]["classes_possiveis"]) == 2


# --- portfolio ----------------------------------------------------------------


def test_portfolio_exige_custos(evaluator):
    problem = make_problem([[1.0, 0.0], [0.0, 1.0]])
    portfolio = PortfolioProblematic(evaluator, ScipyIntegerSolver(), budget=10)
    with pytest.raises(ValueError, match="custo de cada alternativa"):
        portfolio.analyse(problem, space_for(problem, [0, 1]))


def test_portfolio_recusa_orcamento_menor_que_tudo(evaluator):
    problem = make_problem([[1.0, 0.0], [0.0, 1.0]], costs=[10.0, 20.0])
    portfolio = PortfolioProblematic(evaluator, ScipyIntegerSolver(), budget=5)
    with pytest.raises(ValueError, match="Nenhuma alternativa cabe"):
        portfolio.analyse(problem, space_for(problem, [0, 1]))


def test_portfolio_com_orcamento_folgado_nao_descarta_ninguem(evaluator):
    problem = make_problem(
        [[1.0, 0.0], [0.0, 1.0], [0.5, 0.5]], costs=[1.0, 1.0, 1.0], names=["P", "Q", "R"]
    )
    portfolio = PortfolioProblematic(evaluator, ScipyIntegerSolver(), budget=99)
    analysis = portfolio.analyse(problem, space_for(problem, [0, 1]))

    # todo projeto agrega valor em algum vetor de pesos viavel
    assert analysis.detail["nunca_selecionados"] == []
    # P e a melhor no criterio de maior peso: entra em qualquer cenario
    assert "P" in analysis.detail["sempre_selecionados"]


def test_carteiras_de_mesmo_beneficio_desempatam_pela_mais_barata(evaluator):
    """Sem desempate, um projeto de beneficio zero num vertice deixaria o MILP
    indiferente e a carteira passaria a depender do solver."""
    solver = ScipyIntegerSolver()
    beneficios = np.array([1.0, 0.0, 0.5])
    custos = np.array([1.0, 1.0, 1.0])
    # o projeto de beneficio nulo nao entra, ainda que caiba no orcamento
    assert solver.knapsack(beneficios, custos, budget=99) == (0, 2)


def test_portfolio_respeita_o_orcamento(evaluator):
    problem = make_problem(
        [[1.0, 0.0], [0.0, 1.0], [0.9, 0.9]],
        costs=[10.0, 10.0, 10.0],
        names=["P", "Q", "R"],
    )
    portfolio = PortfolioProblematic(evaluator, ScipyIntegerSolver(), budget=20)
    analysis = portfolio.analyse(problem, space_for(problem, [0, 1]))

    for carteira in analysis.detail["portfolios_encontrados"]:
        assert carteira["custo"] <= 20.0 + 1e-9
        assert len(carteira["projetos"]) == 2


def test_portfolio_declara_a_ressalva_de_aproximacao(evaluator):
    problem = make_problem([[1.0, 0.0], [0.0, 1.0]], costs=[1.0, 1.0])
    portfolio = PortfolioProblematic(evaluator, ScipyIntegerSolver(), budget=5)
    analysis = portfolio.analyse(problem, space_for(problem, [0, 1]))
    assert "aproximado" in analysis.detail["ressalva"]


def test_portfolio_e_deterministico_por_semente(evaluator):
    rng = np.random.default_rng(11)
    problem = make_problem(
        rng.random((6, 3)), costs=[2.0] * 6, names=[f"p{i}" for i in range(6)]
    )
    space = space_for(problem, [0, 1, 2])
    resultados = [
        PortfolioProblematic(
            evaluator, ScipyIntegerSolver(), budget=6, seed=7
        ).analyse(problem, space)
        for _ in range(2)
    ]
    assert resultados[0].detail == resultados[1].detail


# --- beneficio-custo ----------------------------------------------------------


def beneficio_custo(evaluator, budget, **kwargs):
    return BenefitCostProblematic(evaluator, budget=budget, **kwargs)


def test_beneficio_custo_exige_custos(evaluator):
    problem = make_problem([[1.0, 0.0], [0.0, 1.0]])
    with pytest.raises(ValueError, match="custo de cada alternativa"):
        beneficio_custo(evaluator, 10).analyse(problem, space_for(problem, [0, 1]))


def test_beneficio_custo_exige_orcamento_positivo(evaluator):
    with pytest.raises(ValueError, match="orçamento positivo"):
        beneficio_custo(evaluator, 0.0)
    with pytest.raises(ValueError, match="orçamento positivo"):
        beneficio_custo(evaluator, -5.0)


def test_beneficio_custo_recusa_orcamento_menor_que_tudo(evaluator):
    problem = make_problem([[1.0, 0.0], [0.0, 1.0]], costs=[10.0, 20.0])
    with pytest.raises(ValueError, match="Nenhuma alternativa cabe"):
        beneficio_custo(evaluator, 5).analyse(problem, space_for(problem, [0, 1]))


def test_faixa_de_razao_e_a_faixa_de_valor_dividida_pelo_custo(evaluator):
    """Conta na unha: com k0 >= k1 e soma 1, k0 percorre [0.5, 1].

    P vale k0, entao o seu beneficio vai de 0.5 a 1.0 e, dividido pelo custo 2,
    a razao vai de 0.25 a 0.5. Q vale k1 = 1 - k0, entao o beneficio vai de 0 a
    0.5 e a razao, com custo 4, de 0 a 0.125.
    """
    problem = make_problem([[1.0, 0.0], [0.0, 1.0]], costs=[2.0, 4.0], names=["P", "Q"])
    analysis = beneficio_custo(evaluator, 6.0).analyse(
        problem, space_for(problem, [0, 1])
    )

    razoes = analysis.detail["razoes"]
    assert razoes["P"]["beneficio_minimo"] == pytest.approx(0.5)
    assert razoes["P"]["beneficio_maximo"] == pytest.approx(1.0)
    assert razoes["P"]["razao_minima"] == pytest.approx(0.25)
    assert razoes["P"]["razao_maxima"] == pytest.approx(0.5)
    assert razoes["Q"]["razao_minima"] == pytest.approx(0.0)
    assert razoes["Q"]["razao_maxima"] == pytest.approx(0.125)


def test_razao_minima_acima_da_maxima_do_outro_e_dominancia(evaluator):
    """Mesmo caso: a faixa de P ([0.25, 0.5]) fica inteira acima da de Q
    ([0, 0.125]). Nao ha vetor de pesos viavel em que Q seja mais eficiente."""
    problem = make_problem([[1.0, 0.0], [0.0, 1.0]], costs=[2.0, 4.0], names=["P", "Q"])
    analysis = beneficio_custo(evaluator, 6.0).analyse(
        problem, space_for(problem, [0, 1])
    )

    assert analysis.detail["dominancia_por_razao"] == [
        {"dominante": "P", "dominado": "Q"}
    ]
    assert analysis.detail["dominantes"] == ["P"]


def test_beneficio_maior_e_custo_menor_domina_em_qualquer_peso(evaluator):
    """Dominancia obvia, conferivel sem o solver: A e melhor que B em todos os
    criterios (beneficio 1.0 contra 0.4) e ainda custa menos (2 contra 5)."""
    problem = make_problem(
        [[1.0, 1.0], [0.4, 0.4], [0.0, 0.0]],
        costs=[2.0, 5.0, 1.0],
        names=["A", "B", "C"],
    )
    analysis = beneficio_custo(evaluator, 8.0).analyse(
        problem, space_for(problem, [0, 1])
    )

    razoes = analysis.detail["razoes"]
    assert razoes["A"]["razao_minima"] == pytest.approx(0.5)  # 1.0 / 2
    assert razoes["B"]["razao_maxima"] == pytest.approx(0.08)  # 0.4 / 5
    pares = analysis.detail["dominancia_por_razao"]
    assert {"dominante": "A", "dominado": "B"} in pares
    assert {"dominante": "B", "dominado": "A"} not in pares
    # C nao vale nada em nenhum peso: nao entra na carteira nem de graca
    assert "C" in analysis.detail["nunca_selecionados"]


def test_faixas_sobrepostas_nao_geram_dominancia(evaluator):
    """X e Y tem o mesmo custo e faixas de valor que se cruzam: a ordem entre os
    dois depende de informacao que o decisor ainda nao deu."""
    problem = make_problem([[1.0, 0.0], [0.0, 1.0]], costs=[3.0, 3.0], names=["X", "Y"])
    analysis = beneficio_custo(evaluator, 3.0).analyse(problem, WeightSpace(2))

    assert analysis.detail["dominancia_por_razao"] == []
    assert analysis.detail["dominantes"] == []


def test_carteira_por_razao_nunca_estoura_o_orcamento(evaluator):
    rng = np.random.default_rng(5)
    problem = make_problem(
        rng.random((7, 3)),
        costs=[3.0, 7.0, 1.0, 5.0, 2.0, 9.0, 4.0],
        names=[f"p{i}" for i in range(7)],
    )
    analysis = beneficio_custo(evaluator, 12.0).analyse(
        problem, space_for(problem, [0, 1, 2])
    )

    for carteira in analysis.detail["portfolios_encontrados"]:
        assert carteira["custo"] <= 12.0 + 1e-9
    assert analysis.detail["carteira_mais_frequente"]["custo"] <= 12.0 + 1e-9


def test_beneficio_custo_separa_o_exato_do_amostrado_na_ressalva(evaluator):
    problem = make_problem([[1.0, 0.0], [0.0, 1.0]], costs=[1.0, 2.0])
    analysis = beneficio_custo(evaluator, 3.0).analyse(
        problem, space_for(problem, [0, 1])
    )

    ressalva = analysis.detail["ressalva"]
    assert "Exato" in ressalva and "Aproximado" in ressalva
    assert "amostrados" in ressalva


def test_beneficio_custo_e_deterministico_por_semente(evaluator):
    rng = np.random.default_rng(13)
    problem = make_problem(
        rng.random((6, 3)), costs=[2.0] * 6, names=[f"p{i}" for i in range(6)]
    )
    space = space_for(problem, [0, 1, 2])
    resultados = [
        beneficio_custo(evaluator, 7.0, seed=4).analyse(problem, space)
        for _ in range(2)
    ]
    assert resultados[0].detail == resultados[1].detail


def test_razao_e_mochila_podem_escolher_carteiras_diferentes(evaluator):
    """Documenta a divergencia, que e o motivo de existirem dois modulos.

    Orcamento 10. X custa 1 e vale 0.2 (razao 0.2); Y custa 10 e vale 1.0
    (razao 0.1). A leitura por razao pega X primeiro, e ai Y nao cabe mais: fica
    com 0.2 de beneficio. A mochila ignora a eficiencia e pega Y, que sozinho
    vale 1.0. Nenhuma das duas esta errada -- elas respondem a perguntas
    diferentes, e o decisor escolhe qual quer fazer.
    """
    problem = make_problem(
        [[0.2, 0.2], [1.0, 1.0], [0.0, 0.0]],
        costs=[1.0, 10.0, 1.0],
        names=["X", "Y", "Z"],
    )
    space = space_for(problem, [0, 1])

    por_razao = beneficio_custo(evaluator, 10.0).analyse(problem, space)
    mochila = PortfolioProblematic(
        evaluator, ScipyIntegerSolver(), budget=10.0
    ).analyse(problem, space)

    # o valor nao depende dos pesos aqui, logo cada leitura tem carteira unica
    assert por_razao.resolved and mochila.resolved
    assert por_razao.detail["carteira_mais_frequente"]["projetos"] == ["X"]
    assert mochila.detail["portfolios_encontrados"][0]["projetos"] == ["Y"]
    assert por_razao.detail["sempre_selecionados"] != mochila.detail[
        "sempre_selecionados"
    ]


# --- registro -----------------------------------------------------------------


def test_registro_cria_todas_as_problematicas(evaluator):
    registry = default_registry()
    assert registry.keys == (
        "beneficio_custo", "escolha", "portfolio", "ranking", "sorting"
    )

    integer = ScipyIntegerSolver()
    assert isinstance(registry.create("escolha", evaluator, integer), ChoiceProblematic)
    assert isinstance(registry.create("ranking", evaluator, integer), RankingProblematic)
    assert isinstance(
        registry.create("sorting", evaluator, integer, {"perfis": [0.5]}),
        SortingProblematic,
    )
    assert isinstance(
        registry.create("portfolio", evaluator, integer, {"orcamento": 10}),
        PortfolioProblematic,
    )
    assert isinstance(
        registry.create("beneficio_custo", evaluator, integer, {"orcamento": 10}),
        BenefitCostProblematic,
    )


def test_registro_recusa_chave_desconhecida_listando_as_validas(evaluator):
    with pytest.raises(UnknownProblematic, match="escolha"):
        default_registry().create("inexistente", evaluator, ScipyIntegerSolver())


# --- diagrama de Hasse --------------------------------------------------------


def test_hasse_mantem_so_a_cobertura_transitiva(evaluator):
    """Desenhar todas as relacoes deixaria o grafo ilegivel: numa cadeia de
    quatro, so as tres arestas consecutivas aparecem."""
    problem = make_problem(
        [[3.0, 3.0], [2.0, 2.0], [1.0, 1.0], [0.0, 0.0]], names=["X", "Y", "Z", "W"]
    )
    analysis = RankingProblematic(evaluator).analyse(problem, space_for(problem, [0, 1]))

    arestas = {(a["de"], a["para"]) for a in analysis.detail["dominancia_direta"]}
    assert arestas == {("X", "Y"), ("Y", "Z"), ("Z", "W")}
    # a transitiva X->Z existe como dominancia, mas nao como aresta do diagrama
    assert ("X", "Z") not in arestas


def test_hasse_agrupa_em_niveis(evaluator):
    problem = make_problem(
        [[3.0, 3.0], [2.0, 2.0], [1.0, 1.0]], names=["X", "Y", "Z"]
    )
    analysis = RankingProblematic(evaluator).analyse(problem, space_for(problem, [0, 1]))
    assert analysis.detail["niveis"] == [["X"], ["Y"], ["Z"]]


def test_hasse_poe_incomparaveis_no_mesmo_nivel(evaluator):
    """X e Y trocam de lugar conforme os pesos: ficam lado a lado, nao em fila."""
    problem = make_problem(
        [[1.0, 0.0], [0.4, 1.0], [0.0, 0.0]], names=["X", "Y", "Pior"]
    )
    analysis = RankingProblematic(evaluator).analyse(problem, space_for(problem, [0, 1]))
    niveis = analysis.detail["niveis"]
    assert set(niveis[0]) == {"X", "Y"}
    assert niveis[-1] == ["Pior"]


def test_hasse_de_alternativas_todas_incomparaveis(evaluator):
    problem = make_problem([[1.0, 0.0], [0.0, 1.0]], names=["X", "Y"])
    # com epsilon zero X domina fracamente Y; sem ordem declarada seriam pares
    analysis = RankingProblematic(evaluator).analyse(problem, space_for(problem, [0, 1]))
    assert sum(len(n) for n in analysis.detail["niveis"]) == 2
