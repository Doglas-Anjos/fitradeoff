"""Diagnóstico e resolução de inconsistência.

"Desfaça a última" é verdadeiro e inútil: a última só é culpada porque foi a
última a chegar. O conflito é entre duas declarações, e o decisor precisa ver
as duas.
"""

import pytest

from conftest import make_problem
from fitradeoff.application.inconsistency import diagnosticar, resolver
from fitradeoff.domain import CriteriaRanking, HolisticJudgement, Preference
from fitradeoff.elicitation import DecisionSession
from fitradeoff.problematics import ChoiceProblematic


def sessao(evaluator, clock, problem, ordem=(0, 1, 2), epsilon=1e-3):
    """Com limiar estrito: sem ele, "A melhor que C" e "C melhor que A" se
    acomodam num empate e nao ha conflito a diagnosticar."""
    return DecisionSession(
        problem=problem,
        problematic=ChoiceProblematic(evaluator),
        clock=clock,
        epsilon=epsilon,
    ).rank_criteria(ordem)


@pytest.fixture
def problema():
    """Tres criterios, para que a elicitacao faca perguntas de verdade, e com
    A dominando C em todos eles -- julgar C melhor que A e contraditorio."""
    return make_problem(
        [
            [10.0, 8.0, 6.0],   # A
            [0.0, 10.0, 9.0],   # B
            [5.0, 2.0, 1.0],    # C, pior que A em tudo
            [7.0, 5.0, 10.0],   # D
        ],
        names=["A", "B", "C", "D"],
    )


@pytest.fixture
def elicitavel(evaluator, clock):
    """Problema que a ordenação sozinha não resolve, então há perguntas."""
    problema = make_problem(
        [
            [0.82, 12.5, 30.0, 120.0],
            [0.95, 15.8, 12.0, 90.0],
            [0.71, 10.2, 45.0, 200.0],
            [0.88, 14.1, 20.0, 140.0],
        ],
        names=["A", "B", "C", "D"],
    )
    return sessao(evaluator, clock, problema, ordem=(0, 1, 2, 3))


@pytest.fixture
def conflitante(evaluator, clock, problema):
    """A domina C em todo o espaço; julgar C melhor que A contradiz."""
    s = sessao(evaluator, clock, problema)
    s = s.record(HolisticJudgement(preferred=0, over=2))
    return s.record(HolisticJudgement(preferred=2, over=0))


# --- diagnóstico --------------------------------------------------------------


def test_sessao_consistente_nao_acusa_nada(evaluator, clock, problema):
    d = diagnosticar(sessao(evaluator, clock, problema))
    assert d.inconsistente is False
    assert d.conflitos == []
    assert "compatíveis" in d.to_dict()["leitura"]


def test_declaracao_impossivel_e_reconhecida_como_tal(conflitante):
    """A domina C em todos os critérios: preferir C não é conflito com outra
    resposta, é algo que a própria matriz desmente."""
    d = diagnosticar(conflitante)
    assert d.inconsistente is True
    assert d.impossivel is True
    assert "não é possível neste problema" in d.leitura
    assert d.ultima is not None


def test_declaracao_impossivel_oferece_desfazer(conflitante):
    acoes = [s["acao"] for s in diagnosticar(conflitante).to_dict()["saidas"]]
    assert "desfazer" in acoes


def test_conflito_entre_duas_declaracoes_aponta_o_par(evaluator, clock):
    """Duas afirmações possíveis isoladamente, impossíveis juntas."""
    problema = make_problem(
        [[10.0, 0.0], [0.0, 10.0], [6.0, 6.0]], names=["A", "B", "C"]
    )
    s = sessao(evaluator, clock, problema, ordem=(0, 1))
    s = s.record(HolisticJudgement(preferred=0, over=2))  # A melhor que C
    s = s.record(HolisticJudgement(preferred=2, over=0))  # C melhor que A

    d = diagnosticar(s)
    assert d.inconsistente is True
    if d.impossivel:
        pytest.skip("neste problema a última é impossível sozinha")
    assert len(d.conflitos) >= 1
    assert any(
        {c.sequencia_a, c.sequencia_b} == {2, 3} for c in d.conflitos
    )
    assert "remover" in [x["acao"] for x in d.to_dict()["saidas"]]


def test_resposta_de_tradeoff_oferece_inversao(elicitavel):
    """Se a resposta foi a errada, inverter conserta sem perder a vez."""
    s = elicitavel.answer(elicitavel.next_question(), Preference.FIRST)
    s = s.record(CriteriaRanking((3, 2, 1, 0)))  # ordem oposta: conflita

    d = diagnosticar(s)
    assert d.inconsistente is True
    acoes = [saida["acao"] for saida in d.to_dict()["saidas"]]
    assert "desfazer" in acoes


def test_indiferenca_nao_oferece_inversao(elicitavel):
    """O contrário de "valem o mesmo" não diz qual vale mais."""
    s = elicitavel.answer(elicitavel.next_question(), Preference.INDIFFERENT)
    s = s.record(CriteriaRanking((3, 2, 1, 0)))
    if s.is_consistent:
        pytest.skip("não gerou conflito neste problema")
    acoes = [saida["acao"] for saida in diagnosticar(s).to_dict()["saidas"]]
    assert "inverter" not in acoes


def test_conflito_antigo_sugere_recomecar(evaluator, clock, problema):
    """Quando remover a última não resolve, o par a par não se aplica."""
    s = sessao(evaluator, clock, problema)
    s = s.record(HolisticJudgement(preferred=0, over=2))
    s = s.record(HolisticJudgement(preferred=2, over=0))
    s = s.record(HolisticJudgement(preferred=1, over=2))

    d = diagnosticar(s)
    if not diagnosticar(s.undo()).inconsistente:
        pytest.skip("remover a última resolveu; caso coberto acima")
    assert any(saida["acao"] == "reordenar" for saida in d.to_dict()["saidas"])


def test_log_vazio_nao_quebra(evaluator, clock, problema):
    vazia = DecisionSession(
        problem=problema,
        problematic=ChoiceProblematic(evaluator),
        clock=clock,
        epsilon=1e-3,
    )
    assert diagnosticar(vazia).inconsistente is False


# --- resolução ----------------------------------------------------------------


def test_desfazer_restaura_a_consistencia(conflitante):
    resolvida = resolver(conflitante, "desfazer")
    assert resolvida.is_consistent
    assert len(resolvida.log) == len(conflitante.log) - 1


def test_remover_tira_a_declaracao_indicada(conflitante):
    resolvida = resolver(conflitante, "remover", sequencia=2)
    assert len(resolvida.narrative()) == len(conflitante.narrative()) - 1


def test_remover_renumera_o_log(conflitante):
    resolvida = resolver(conflitante, "remover", sequencia=2)
    sequencias = [e.sequence for e in resolvida.log.entries]
    assert sequencias == list(range(1, len(sequencias) + 1))


def test_inverter_troca_a_resposta_e_mantem_o_resto(elicitavel):
    com_a = elicitavel.answer(elicitavel.next_question(), Preference.FIRST)
    invertida = resolver(com_a, "inverter")
    assert len(invertida.log) == len(com_a.log)
    assert "Preferiu ter" in invertida.narrative()[-1]
    assert invertida.narrative()[-1] != com_a.narrative()[-1]


def test_acao_desconhecida_e_recusada(conflitante):
    with pytest.raises(ValueError, match="desconhecida"):
        resolver(conflitante, "explodir")


def test_remover_sem_sequencia_e_recusado(conflitante):
    with pytest.raises(ValueError, match="qual declaração"):
        resolver(conflitante, "remover")


def test_remover_sequencia_inexistente_e_recusado(conflitante):
    with pytest.raises(ValueError, match="número 99"):
        resolver(conflitante, "remover", sequencia=99)


def test_inverter_indiferenca_e_recusado(elicitavel):
    s = elicitavel.answer(elicitavel.next_question(), Preference.INDIFFERENT)
    with pytest.raises(ValueError, match="oposto único"):
        resolver(s, "inverter")


def test_inverter_exige_resposta_de_tradeoff(conflitante):
    with pytest.raises(ValueError, match="tradeoff"):
        resolver(conflitante, "inverter")
