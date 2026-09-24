"""Perguntas, seletores e a sessao de decisao."""

import numpy as np
import pytest

from conftest import make_problem
from fitradeoff.domain import (
    AuditLog,
    CriteriaRanking,
    Criterion,
    Direction,
    Preference,
    Problem,
    TradeoffAnswer,
)
from fitradeoff.elicitation import (
    Bracket,
    DecisionSession,
    InformationGainSelector,
    QuestionPresenter,
    TradeoffQuestion,
    WidestBracketSelector,
    brackets_from_log,
)
from fitradeoff.problematics import ChoiceProblematic, RankingProblematic


def session_for(problem, evaluator, clock, selector=None, epsilon=0.0):
    return DecisionSession(
        problem=problem,
        problematic=ChoiceProblematic(evaluator),
        selector=selector or WidestBracketSelector(),
        clock=clock,
        epsilon=epsilon,
    )


# --- intervalos de busca ------------------------------------------------------


def test_intervalo_encolhe_conforme_a_resposta():
    bracket = Bracket(0, 1)
    preferiu_a = bracket.narrowed_by(TradeoffAnswer(0, 1, 0.5, Preference.FIRST))
    preferiu_b = bracket.narrowed_by(TradeoffAnswer(0, 1, 0.5, Preference.SECOND))

    assert (preferiu_a.lower, preferiu_a.upper) == (0.0, 0.5)
    assert (preferiu_b.lower, preferiu_b.upper) == (0.5, 1.0)


def test_indiferenca_fecha_o_intervalo():
    fechado = Bracket(0, 1).narrowed_by(
        TradeoffAnswer(0, 1, 0.25, Preference.INDIFFERENT)
    )
    assert fechado.width == 0.0


def test_resposta_de_outro_par_nao_afeta_o_intervalo():
    bracket = Bracket(0, 1)
    assert bracket.narrowed_by(TradeoffAnswer(2, 3, 0.5, Preference.FIRST)) == bracket


def test_intervalos_sao_derivados_do_log(clock):
    problem = make_problem([[1.0, 2.0, 3.0], [3.0, 2.0, 1.0]])
    log = AuditLog().record(CriteriaRanking((0, 1, 2)), clock)
    log = log.record(TradeoffAnswer(0, 1, 0.5, Preference.FIRST), clock)

    brackets = brackets_from_log(problem, log)
    assert len(brackets) == 2
    assert brackets[0].upper == 0.5  # par (0, 1) foi estreitado
    assert brackets[1].width == 1.0  # par (1, 2) segue intacto


def test_sem_ordenacao_nao_ha_intervalos(clock):
    problem = make_problem([[1.0, 2.0], [3.0, 4.0]])
    assert brackets_from_log(problem, AuditLog()) == ()


def test_escala_construida_so_admite_niveis_existentes():
    problem = make_problem(
        [[1.0, 0.0], [3.0, 1.0]], levels=[(1.0, 2.0, 3.0), None]
    )
    # o unico nivel intermediario vale 0.5
    assert Bracket(0, 1).candidate_value(problem) == pytest.approx(0.5)
    # nenhum nivel cabe nesta faixa: o par se esgota
    assert Bracket(0, 1, 0.6, 0.9).candidate_value(problem) is None


# --- enunciado ----------------------------------------------------------------


def test_enunciado_traz_os_dois_lados_por_inteiro(fornecedores):
    brief = QuestionPresenter().present(fornecedores, TradeoffQuestion(0, 1, 0.5))

    assert len(brief.option_a.lines) == fornecedores.n_criteria
    assert len(brief.option_b.lines) == fornecedores.n_criteria
    texto = brief.as_text()
    assert "pior desempenho possivel" in texto
    assert "R$/un" in texto  # unidades aparecem


def test_enunciado_usa_unidades_reais_nao_escala_normalizada(fornecedores):
    brief = QuestionPresenter().present(fornecedores, TradeoffQuestion(2, 0, 0.5))
    foco = brief.option_a.lines[0]
    # prazo vai de 12 (melhor) a 45 (pior); meio da escala = 28.5 dias
    assert foco.consequence == pytest.approx(28.5)
    assert foco.unit == "dias"


# --- sessao -------------------------------------------------------------------


def test_sessao_comeca_sem_ordenacao(fornecedores, evaluator, clock):
    session = session_for(fornecedores, evaluator, clock)
    assert not session.started
    assert session.next_question() is None
    assert session.finished


def test_ordenar_criterios_inicia_a_elicitacao(fornecedores, evaluator, clock):
    session = session_for(fornecedores, evaluator, clock).rank_criteria([0, 1, 2])
    assert session.started
    assert session.next_question() is not None
    assert len(session.log) == 1


def test_sessao_e_imutavel(fornecedores, evaluator, clock):
    original = session_for(fornecedores, evaluator, clock)
    derivada = original.rank_criteria([0, 1, 2])
    assert len(original.log) == 0
    assert len(derivada.log) == 1


def test_desfazer_devolve_ao_estado_anterior(fornecedores, evaluator, clock):
    session = session_for(fornecedores, evaluator, clock).rank_criteria([0, 1, 2])
    antes = session.analyse().undecided
    depois = session.answer(session.next_question(), Preference.FIRST)

    voltou = depois.undo()
    assert len(voltou.log) == 1
    assert voltou.analyse().undecided == antes


def test_espaco_de_pesos_e_derivado_do_log(fornecedores, evaluator, clock):
    session = session_for(fornecedores, evaluator, clock).rank_criteria([0, 1, 2])
    session = session.answer(session.next_question(), Preference.SECOND)

    # 2 restricoes de ordem + 1 de tradeoff
    assert len(session.weight_space.constraints) == 3
    assert all(source for source in session.constraint_sources())


def test_reconstruir_do_log_reproduz_a_sessao(fornecedores, evaluator, clock):
    session = session_for(fornecedores, evaluator, clock).rank_criteria([0, 1, 2])
    session = session.answer(session.next_question(), Preference.FIRST)

    reconstruida = DecisionSession(
        problem=fornecedores,
        problematic=ChoiceProblematic(evaluator),
        clock=clock,
        epsilon=0.0,
        log=session.log,
    )
    assert reconstruida.analyse().undecided == session.analyse().undecided
    assert reconstruida.constraint_sources() == session.constraint_sources()


def test_mesma_elicitacao_serve_a_outra_problematica(fornecedores, evaluator, clock):
    """Quem respondeu pensando em escolher pode ver o ranking sem reelicitar."""
    session = session_for(fornecedores, evaluator, clock).rank_criteria([0, 1, 2])
    session = session.answer(session.next_question(), Preference.FIRST)

    como_ranking = session.with_problematic(RankingProblematic(evaluator))
    assert como_ranking.log is session.log
    assert como_ranking.analyse().problematic == "ranking"
    assert "posicoes_possiveis" in como_ranking.analyse().detail


def test_outro_limiar_reinterpreta_o_mesmo_log(fornecedores, evaluator, clock):
    session = session_for(fornecedores, evaluator, clock).rank_criteria([0, 1, 2])
    apertado = session.with_epsilon(0.05)

    assert apertado.log is session.log
    # o limiar mais alto restringe mais o espaco de pesos
    assert len(apertado.analyse().undecided) <= len(session.analyse().undecided)


def test_declaracoes_contraditorias_sao_detectadas(fornecedores, evaluator, clock):
    session = session_for(fornecedores, evaluator, clock, epsilon=1e-3)
    session = session.rank_criteria([0, 1, 2])
    session = session.record(CriteriaRanking((2, 1, 0)))

    assert not session.is_consistent
    assert session.finished
    assert session.next_question() is None


def test_narrativa_acompanha_o_log(fornecedores, evaluator, clock):
    session = session_for(fornecedores, evaluator, clock).rank_criteria([0, 1, 2])
    session = session.answer(session.next_question(), Preference.SECOND)

    narrativa = session.narrative()
    assert len(narrativa) == 2
    assert "Indice de qualidade" in narrativa[0]
    assert "Preferiu" in narrativa[1]


# --- seletores ----------------------------------------------------------------


def test_seletor_ataca_o_par_mais_incerto(fornecedores, evaluator):
    from fitradeoff.domain import WeightSpace

    selector = WidestBracketSelector()
    brackets = (Bracket(0, 1, 0.40, 0.50), Bracket(1, 2, 0.0, 1.0))
    question = selector.select(
        fornecedores,
        AuditLog(),
        brackets,
        WeightSpace(3),
        ChoiceProblematic(evaluator),
    )
    assert (question.criterion, question.rival) == (1, 2)  # o par mais largo
    assert question.value == pytest.approx(0.5)


def test_seletor_ignora_pares_ja_suficientemente_estreitos(fornecedores, evaluator):
    from fitradeoff.domain import WeightSpace

    selector = WidestBracketSelector()
    estreitos = (Bracket(0, 1, 0.5, 0.501), Bracket(1, 2, 0.2, 0.201))
    assert (
        selector.select(
            fornecedores,
            AuditLog(),
            estreitos,
            WeightSpace(3),
            ChoiceProblematic(evaluator),
        )
        is None
    )


def test_ganho_de_informacao_nao_perde_a_alternativa_otima(evaluator, clock):
    """O seletor pode ser trocado sem afetar a corretude do metodo."""
    rng = np.random.default_rng(5)
    problem = make_problem(rng.random((7, 4)), names=[f"a{i}" for i in range(7)])

    pesos = np.sort(rng.random(4))[::-1]
    pesos = pesos / pesos.sum()
    otima = int(np.argmax(problem.values @ pesos))

    session = DecisionSession(
        problem=problem,
        problematic=ChoiceProblematic(evaluator),
        selector=InformationGainSelector(),
        clock=clock,
        epsilon=0.0,
    ).rank_criteria(range(4))

    for _ in range(40):
        question = session.next_question()
        if question is None:
            break
        prefere_a = pesos[question.criterion] * question.value >= pesos[question.rival]
        session = session.answer(
            question, Preference.FIRST if prefere_a else Preference.SECOND
        )
        assert otima in session.problematic.evaluator.potentially_optimal(
            problem, session.weight_space
        )

    assert otima in session.problematic.evaluator.potentially_optimal(
        problem, session.weight_space
    )


@pytest.mark.parametrize("seed", range(8))
def test_decisor_oraculo_nunca_perde_a_alternativa_otima(seed, evaluator, clock):
    """Invariante central do metodo: com informacao parcial consistente, a
    alternativa verdadeiramente otima jamais sai do conjunto de POAs."""
    rng = np.random.default_rng(seed)
    problem = make_problem(rng.random((8, 4)), names=[f"a{i}" for i in range(8)])

    pesos = np.sort(rng.random(4))[::-1]
    pesos = pesos / pesos.sum()
    otima = int(np.argmax(problem.values @ pesos))

    session = session_for(problem, evaluator, clock).rank_criteria(range(4))
    inicial = len(session.analyse().undecided)

    while (question := session.next_question()) is not None:
        prefere_a = pesos[question.criterion] * question.value >= pesos[question.rival]
        session = session.answer(
            question, Preference.FIRST if prefere_a else Preference.SECOND
        )
        assert session.is_consistent
        poas = session.problematic.evaluator.potentially_optimal(
            problem, session.weight_space
        )
        assert otima in poas

    final = session.problematic.evaluator.potentially_optimal(
        problem, session.weight_space
    )
    assert otima in final
    assert len(final) <= max(inicial, 1)
