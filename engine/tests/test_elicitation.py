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

    brackets = brackets_from_log(problem, log, abertura=False)
    assert len(brackets) == 2
    assert brackets[0].upper == 0.5  # par (0, 1) foi estreitado
    assert brackets[1].width == 1.0  # par (1, 2) segue intacto


def test_abertura_confronta_o_mais_importante_com_o_menos(clock):
    """O primeiro par oferecido e (topo, base), nao dois consecutivos."""
    problem = make_problem([[1.0, 2.0, 3.0], [3.0, 2.0, 1.0]])
    log = AuditLog().record(CriteriaRanking((0, 1, 2)), clock)

    brackets = brackets_from_log(problem, log)
    assert len(brackets) == 3
    assert (brackets[0].criterion, brackets[0].rival) == (0, 2)


def test_abertura_sai_da_lista_depois_de_respondida(clock):
    """Pergunta de abertura e feita uma vez so: respondida, nao volta."""
    problem = make_problem([[1.0, 2.0, 3.0], [3.0, 2.0, 1.0]])
    log = AuditLog().record(CriteriaRanking((0, 1, 2)), clock)
    log = log.record(TradeoffAnswer(0, 2, 0.5, Preference.FIRST), clock)

    pares = [(b.criterion, b.rival) for b in brackets_from_log(problem, log)]
    assert (0, 2) not in pares
    assert pares == [(0, 1), (1, 2)]


def test_piso_da_abertura_alcanca_os_pares_consecutivos(clock):
    """A razao extrema e o produto das consecutivas: piso nela e piso em todas.

    Sem isto o seletor perguntaria sobre um par no meio de uma faixa que ja nao
    existe, e uma das respostas esvaziaria o espaco de pesos.
    """
    problem = make_problem([[1.0, 2.0, 3.0], [3.0, 2.0, 1.0]])
    log = AuditLog().record(CriteriaRanking((0, 1, 2)), clock)
    log = log.record(TradeoffAnswer(0, 2, 0.9, Preference.SECOND), clock)

    for b in brackets_from_log(problem, log):
        assert b.lower >= 0.9, (b.criterion, b.rival, b.lower)


def test_preferir_A_na_abertura_nao_move_piso_nenhum(clock):
    """Teto no produto nao implica teto em cada fator: os outros podem valer 1."""
    problem = make_problem([[1.0, 2.0, 3.0], [3.0, 2.0, 1.0]])
    log = AuditLog().record(CriteriaRanking((0, 1, 2)), clock)
    log = log.record(TradeoffAnswer(0, 2, 0.9, Preference.FIRST), clock)

    assert all(b.lower == 0.0 for b in brackets_from_log(problem, log))


def test_piso_desconta_os_fatores_ja_fixados(clock):
    """Com fatores ja fixados, o piso dos outros sobe: piso / produto dos tetos.

    Foi o que o estresse achou (28/09/2026): abertura indiferente em 0,5 e dois
    fatores indiferentes em 0,8 -- o terceiro precisa ser ao menos
    0,5 / (0,8 * 0,8) = 0,78, e o piso antigo (0,5) deixava perguntar abaixo.
    """
    problem = make_problem([[1.0, 2.0, 3.0, 4.0], [4.0, 3.0, 2.0, 1.0]])
    log = AuditLog().record(CriteriaRanking((0, 1, 2, 3)), clock)
    log = log.record(TradeoffAnswer(0, 3, 0.5, Preference.INDIFFERENT), clock)
    log = log.record(TradeoffAnswer(0, 1, 0.8, Preference.INDIFFERENT), clock)
    log = log.record(TradeoffAnswer(1, 2, 0.8, Preference.INDIFFERENT), clock)

    faixa = {(b.criterion, b.rival): b for b in brackets_from_log(problem, log)}
    assert faixa[(2, 3)].lower == pytest.approx(0.5 / 0.64)


def test_teto_da_abertura_desce_com_os_pisos_dos_outros(clock):
    """Teto no produto vira teto num fator quando os outros ja tem piso."""
    problem = make_problem([[1.0, 2.0, 3.0, 4.0], [4.0, 3.0, 2.0, 1.0]])
    log = AuditLog().record(CriteriaRanking((0, 1, 2, 3)), clock)
    log = log.record(TradeoffAnswer(0, 3, 0.3, Preference.FIRST), clock)
    log = log.record(TradeoffAnswer(0, 1, 0.6, Preference.SECOND), clock)
    log = log.record(TradeoffAnswer(1, 2, 0.6, Preference.SECOND), clock)

    faixa = {(b.criterion, b.rival): b for b in brackets_from_log(problem, log)}
    assert faixa[(2, 3)].upper == pytest.approx(0.3 / 0.36)


@pytest.mark.parametrize("semente", [11, 59, 66, 86])
def test_respostas_aleatorias_nunca_se_contradizem(semente):
    """O motor so pergunta dentro da faixa possivel: nenhuma resposta contradiz.

    As sementes sao as que, com a propagacao antiga, terminavam em "as
    declaracoes se contradizem" -- numa varredura de 200 decisoes com respostas
    aleatorias, cerca de 1 em 10 terminava assim, nas quatro problematicas.
    """
    import random

    from fitradeoff import DecisionService, build_container

    rng = random.Random(semente)
    k, n = 5 + semente % 3, 7
    crits = [{"chave": "c%d" % j, "nome": "C%d" % j, "direcao": "max"} for j in range(k)]
    matriz = [[rng.uniform(0, 10) for _ in range(k)] for _ in range(n)]
    servico = DecisionService(build_container(epsilon=0.0))
    d = servico.create("f", ["A%d" % i for i in range(n)], crits, matriz,
                       problematica="escolha")["id"]
    servico.rank_criteria(d, [c["chave"] for c in crits])
    for _ in range(25):
        if "enunciado" not in servico.next_question(d):
            break
        servico.answer(d, rng.choice(["B", "indiferente", "indiferente"]))
        assert servico.state(d)["consistente"]


def test_com_dois_criterios_nao_ha_abertura_separada(clock):
    """O par extremo ja e o consecutivo: abrir por ele seria repetir."""
    problem = make_problem([[1.0, 2.0], [3.0, 4.0]])
    log = AuditLog().record(CriteriaRanking((0, 1)), clock)
    assert len(brackets_from_log(problem, log)) == 1


def test_ordem_das_respostas_nao_muda_os_intervalos(clock):
    """Restricoes se intersectam, e intersecao comuta.

    E o que autoriza rever a abertura depois, em vez de so no comeco.
    """
    problem = make_problem([[1.0, 2.0, 3.0], [3.0, 2.0, 1.0]])
    base = AuditLog().record(CriteriaRanking((0, 1, 2)), clock)
    a = TradeoffAnswer(0, 2, 0.5, Preference.FIRST)
    b = TradeoffAnswer(0, 1, 0.25, Preference.FIRST)

    antes = brackets_from_log(problem, base.record(a, clock).record(b, clock))
    depois = brackets_from_log(problem, base.record(b, clock).record(a, clock))
    assert sorted(antes, key=lambda x: (x.criterion, x.rival)) == sorted(
        depois, key=lambda x: (x.criterion, x.rival)
    )


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


def test_seletor_abandona_o_par_com_faixa_estreita_em_consequencia(fornecedores, evaluator):
    """O par se encerra quando a faixa, na unidade do criterio, fica abaixo de 0,01."""
    from fitradeoff.domain import WeightSpace

    selector = WidestBracketSelector()
    # qualidade de 0,71 a 0,95: valor 0,5 a 0,501 da 0,8300 a 0,8302
    colapsado = (Bracket(0, 1, 0.5, 0.501),)
    assert selector.select(
        fornecedores, AuditLog(), colapsado, WeightSpace(3), ChoiceProblematic(evaluator)
    ) is None


def test_mesma_largura_em_valor_ainda_e_perguntada_noutra_escala(fornecedores, evaluator):
    """A regra e em consequencia: a mesma faixa de valor, num custo, ainda serve."""
    from fitradeoff.domain import WeightSpace

    selector = WidestBracketSelector()
    # custo de 15,80 a 10,20: valor 0,2 a 0,202 da 14,68 a 14,669 -- 0,011
    faixa = (Bracket(1, 2, 0.2, 0.202),)
    pergunta = selector.select(
        fornecedores, AuditLog(), faixa, WeightSpace(3), ChoiceProblematic(evaluator)
    )
    assert pergunta is not None and (pergunta.criterion, pergunta.rival) == (1, 2)


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


def _seletor_pergunta(problem, bracket, evaluator):
    from fitradeoff.domain import WeightSpace

    return WidestBracketSelector().select(
        problem, AuditLog(), (bracket,), WeightSpace(problem.n_criteria),
        ChoiceProblematic(evaluator),
    )


def _qualidade_e_custo(pior_qualidade):
    criterios = (
        Criterion("q", "Qualidade", Direction.MAX),
        Criterion("c", "Custo", Direction.MIN),
    )
    return Problem("q", criterios, ("A", "B"),
                   np.array([[pior_qualidade, 10.0], [0.95, 16.0]]))


def test_para_com_a_faixa_abaixo_de_um_centesimo(evaluator):
    """Qualidade de 0,70 a 0,95, faixa de valor ate 1/32: 0,70 a 0,7078 -- para."""
    assert _seletor_pergunta(_qualidade_e_custo(0.70), Bracket(0, 1, 0.0, 1 / 32), evaluator) is None


def test_pergunta_com_a_faixa_acima_de_um_centesimo(evaluator):
    """Com o pior em 0,609 a escala e mais larga: a mesma faixa da 0,609 a 0,6197."""
    pergunta = _seletor_pergunta(_qualidade_e_custo(0.609), Bracket(0, 1, 0.0, 1 / 32), evaluator)
    assert pergunta is not None


def test_criterio_discreto_com_curva_so_pergunta_nivel_tercos_e_meio(evaluator):
    """Nota de 1 a 5 com curva: entre os niveis 1 e 2, so 1,33, 1,5 e 1,67."""
    criterios = (
        Criterion("n", "Nota", Direction.MAX, levels=(1, 2, 3, 4, 5),
                  value_points=((1, 0.0), (2, 0.5), (3, 0.75), (5, 1.0))),
        Criterion("c", "Custo", Direction.MIN),
    )
    problema = Problem("n", criterios, ("A", "B"), np.array([[1, 10.0], [5, 16.0]]))
    nota = problema.scales[0]
    # faixa de valor 0 a 0,25 (nota de 1 a 1,5): o meio seria 1,25, mas o que se
    # pergunta e 1,33, o terco
    pergunta = _seletor_pergunta(problema, Bracket(0, 1, 0.0, 0.25), evaluator)
    assert nota.consequence_at(pergunta.value) == pytest.approx(4 / 3)
    # respondido A, a faixa vai de 1 a 1,33 -- a ponta e o valor perguntado, e
    # entre os dois nao ha mais nada
    assert _seletor_pergunta(problema, Bracket(0, 1, 0.0, pergunta.value), evaluator) is None
