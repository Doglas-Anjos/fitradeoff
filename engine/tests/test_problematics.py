"""As quatro problematicas, e o avaliador que as sustenta."""

import numpy as np
import pytest

from conftest import make_problem
from fitradeoff.domain import CriteriaRanking, WeightSpace
from fitradeoff.problematics import (
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


def test_sorting_deixa_indefinida_a_alternativa_que_atravessa_perfil(evaluator):
    problem = make_problem([[1.0, 0.0], [0.0, 1.0]], names=["X", "Y"])
    sorting = SortingProblematic(evaluator, profiles=(0.5,))
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


# --- registro -----------------------------------------------------------------


def test_registro_cria_as_quatro_problematicas(evaluator):
    registry = default_registry()
    assert registry.keys == ("escolha", "portfolio", "ranking", "sorting")

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
