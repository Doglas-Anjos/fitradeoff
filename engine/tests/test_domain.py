"""Camada de dominio: escalas, problema, preferencias e auditoria."""

import numpy as np
import pytest

from conftest import make_problem
from fitradeoff.domain import (
    AuditLog,
    ContinuousScale,
    CriteriaRanking,
    Criterion,
    DegenerateScale,
    Direction,
    DiscreteScale,
    HolisticJudgement,
    Preference,
    Sense,
    TradeoffAnswer,
    WeightSpace,
    statement_from_dict,
)

# --- escalas ------------------------------------------------------------------


def test_escala_continua_converte_nos_dois_sentidos():
    escala = ContinuousScale(10.0, 20.0, ascending=True)
    assert escala.value_of(15.0) == pytest.approx(0.5)
    assert escala.consequence_at(0.5) == pytest.approx(15.0)
    assert (escala.worst, escala.best) == pytest.approx((10.0, 20.0))


def test_escala_continua_decrescente_inverte_melhor_e_pior():
    escala = ContinuousScale(10.0, 20.0, ascending=False)
    assert escala.value_of(10.0) == pytest.approx(1.0)
    assert escala.best == pytest.approx(10.0)
    assert escala.worst == pytest.approx(20.0)


def test_escala_construida_usa_posicao_do_nivel():
    escala = DiscreteScale((1.0, 2.0, 3.0, 4.0))
    assert escala.value_of(2.0) == pytest.approx(1 / 3)
    assert escala.consequence_at(1.0) == 4.0
    # so os niveis estritamente intermediarios servem a uma pergunta
    assert escala.intermediate_values() == pytest.approx((1 / 3, 2 / 3))


def test_escala_construida_recusa_consequencia_fora_dos_niveis():
    with pytest.raises(ValueError, match="nao pertence aos niveis"):
        DiscreteScale((1.0, 2.0)).value_of(7.0)


def test_escala_continua_aceita_qualquer_desempenho():
    assert ContinuousScale(0.0, 1.0, True).intermediate_values() is None


def test_criterio_sem_discriminacao_vira_escala_degenerada():
    problem = make_problem([[5.0, 1.0], [5.0, 2.0]])
    assert isinstance(problem.scales[0], DegenerateScale)
    # contribui igualmente para as duas alternativas, entao nao afeta diferencas
    assert (problem.values[0] - problem.values[1])[0] == pytest.approx(0.0)


# --- problema -----------------------------------------------------------------


def test_matriz_com_forma_errada_e_recusada():
    with pytest.raises(ValueError, match="esperado"):
        make_problem([[1.0, 2.0]], names=["A", "B"])


def test_criterios_repetidos_sao_recusados():
    with pytest.raises(ValueError, match="chaves repetidas"):
        from fitradeoff.domain import Problem

        Problem(
            "x",
            (Criterion("k", "A"), Criterion("k", "B")),
            ("a", "b"),
            np.zeros((2, 2)),
        )


def test_custo_nao_positivo_e_recusado():
    with pytest.raises(ValueError, match="estritamente positivos"):
        make_problem([[1.0, 2.0], [3.0, 4.0]], costs=[1.0, 0.0])


def test_matriz_de_valor_respeita_direcao():
    problem = make_problem(
        [[10.0, 10.0], [20.0, 20.0]], directions=[Direction.MAX, Direction.MIN]
    )
    assert problem.values[:, 0] == pytest.approx([0.0, 1.0])
    assert problem.values[:, 1] == pytest.approx([1.0, 0.0])


def test_matriz_de_valor_e_calculada_uma_vez():
    problem = make_problem([[1.0, 2.0], [3.0, 4.0]])
    assert problem.values is problem.values


# --- preferencias -------------------------------------------------------------


def test_ordenacao_gera_uma_restricao_por_par_consecutivo():
    problem = make_problem([[1.0, 2.0, 3.0], [3.0, 2.0, 1.0]])
    ranking = CriteriaRanking((2, 0, 1))
    restricoes = ranking.constraints(problem, epsilon=0.0)

    assert len(restricoes) == 2
    assert all(r.sense is Sense.GE for r in restricoes)
    # k[2] - k[0] >= 0, depois k[0] - k[1] >= 0
    assert restricoes[0].coefficients == (-1.0, 0.0, 1.0)
    assert restricoes[1].coefficients == (1.0, -1.0, 0.0)
    assert "Criterio 2 > Criterio 0 > Criterio 1" in ranking.describe(problem)


def test_ordenacao_incompleta_e_recusada():
    problem = make_problem([[1.0, 2.0], [3.0, 4.0]])
    with pytest.raises(ValueError, match="exatamente uma vez"):
        CriteriaRanking((0,)).constraints(problem, 0.0)


def test_tradeoff_preferindo_a_impoe_desigualdade_a_favor_do_foco():
    problem = make_problem([[1.0, 2.0], [3.0, 4.0]])
    answer = TradeoffAnswer(0, 1, 0.5, Preference.FIRST)
    (restricao,) = answer.constraints(problem, epsilon=0.0)

    # 0.5 * k0 - k1 >= 0
    assert restricao.coefficients == (0.5, -1.0)
    assert restricao.sense is Sense.GE


def test_tradeoff_preferindo_b_inverte_o_sentido():
    problem = make_problem([[1.0, 2.0], [3.0, 4.0]])
    (restricao,) = TradeoffAnswer(0, 1, 0.5, Preference.SECOND).constraints(problem, 0.0)
    assert restricao.sense is Sense.LE


def test_indiferenca_fixa_a_razao_entre_os_pesos():
    problem = make_problem([[1.0, 2.0], [3.0, 4.0]])
    (restricao,) = TradeoffAnswer(0, 1, 0.5, Preference.INDIFFERENT).constraints(
        problem, 0.0
    )
    assert restricao.sense is Sense.EQ
    assert restricao.rhs == 0.0


def test_desempenho_intermediario_deve_ser_estritamente_interno():
    with pytest.raises(ValueError, match="em \\(0, 1\\)"):
        TradeoffAnswer(0, 1, 1.0, Preference.FIRST)


def test_descricao_usa_unidade_do_criterio():
    problem = make_problem([[10.0, 1.0], [20.0, 2.0]])
    texto = TradeoffAnswer(0, 1, 0.5, Preference.FIRST).describe(problem)
    assert "15" in texto and "50% da escala" in texto


def test_julgamento_holistico_vira_restricao_entre_alternativas():
    problem = make_problem([[1.0, 0.0], [0.0, 1.0]])
    (restricao,) = HolisticJudgement(0, 1).constraints(problem, epsilon=0.0)
    # v[1] - v[0] <= 0
    assert restricao.coefficients == pytest.approx((-1.0, 1.0))
    assert restricao.sense is Sense.LE


@pytest.mark.parametrize(
    "statement",
    [
        CriteriaRanking((1, 0)),
        TradeoffAnswer(0, 1, 0.25, Preference.SECOND),
        HolisticJudgement(1, 0),
    ],
)
def test_declaracoes_sobrevivem_ao_ciclo_de_serializacao(statement):
    assert statement_from_dict(statement.to_dict()) == statement


# --- espaco de pesos ----------------------------------------------------------


def test_espaco_de_pesos_e_imutavel():
    space = WeightSpace(3)
    outro = space.with_constraints(CriteriaRanking((0, 1, 2)).constraints(
        make_problem([[1.0, 2.0, 3.0], [3.0, 2.0, 1.0]]), 0.0
    ))
    assert len(space.constraints) == 0
    assert len(outro.constraints) == 2


def test_restricao_com_tamanho_errado_e_recusada():
    from fitradeoff.domain import LinearConstraint

    with pytest.raises(ValueError, match="esperado 3"):
        WeightSpace(3).with_constraints([LinearConstraint((1.0,), Sense.GE, 0.0)])


# --- auditoria ----------------------------------------------------------------


def test_log_registra_sequencia_autor_e_instante(clock):
    log = AuditLog().record(CriteriaRanking((0, 1)), clock, actor="ana")
    (entrada,) = log.entries
    assert entrada.sequence == 1
    assert entrada.actor == "ana"
    assert entrada.recorded_at == clock.now()


def test_desfazer_trunca_o_log(clock):
    log = AuditLog().record(CriteriaRanking((0, 1)), clock)
    log = log.record(TradeoffAnswer(0, 1, 0.5, Preference.FIRST), clock)
    assert len(log.without_last()) == 1
    assert len(log) == 2  # o original nao muda


def test_log_sobrevive_ao_ciclo_de_serializacao(clock):
    log = AuditLog().record(CriteriaRanking((1, 0)), clock, actor="bruno")
    log = log.record(TradeoffAnswer(1, 0, 0.75, Preference.INDIFFERENT), clock)
    restaurado = AuditLog.from_list(log.to_list())

    assert restaurado.statements() == log.statements()
    assert restaurado.entries[0].actor == "bruno"
    assert restaurado.entries[1].recorded_at == log.entries[1].recorded_at


def test_narrativa_conta_a_decisao_na_ordem(clock):
    problem = make_problem([[1.0, 2.0], [3.0, 4.0]])
    log = AuditLog().record(CriteriaRanking((0, 1)), clock)
    log = log.record(TradeoffAnswer(0, 1, 0.5, Preference.FIRST), clock)

    narrativa = log.narrative(problem)
    assert len(narrativa) == 2
    assert narrativa[0].startswith("Ordenou os critérios")
    assert "Preferiu" in narrativa[1]


# --- curva de valor elicitada -------------------------------------------------


def test_curva_de_valor_interpola_entre_os_pontos():
    """Ganhar os primeiros dias vale mais que os ultimos: e exatamente isso que
    a linearidade esconderia."""
    from fitradeoff.domain.scales import PiecewiseScale

    curva = PiecewiseScale(((12.0, 1.0), (30.0, 0.35), (45.0, 0.0)))
    assert curva.value_of(12.0) == 1.0
    assert curva.value_of(45.0) == 0.0
    assert curva.value_of(30.0) == pytest.approx(0.35)
    # a meio caminho entre 12 e 30, o valor nao e a media de 12 e 45
    assert curva.value_of(21.0) == pytest.approx(0.675)


def test_curva_de_valor_inverte_corretamente():
    from fitradeoff.domain.scales import PiecewiseScale

    curva = PiecewiseScale(((12.0, 1.0), (30.0, 0.35), (45.0, 0.0)))
    assert curva.consequence_at(1.0) == pytest.approx(12.0)
    assert curva.consequence_at(0.0) == pytest.approx(45.0)
    assert curva.consequence_at(0.5) == pytest.approx(25.846, abs=1e-3)


def test_curva_de_valor_satura_fora_da_faixa():
    from fitradeoff.domain.scales import PiecewiseScale

    curva = PiecewiseScale(((0.0, 0.0), (10.0, 1.0)))
    assert curva.value_of(-5.0) == 0.0
    assert curva.value_of(99.0) == 1.0


@pytest.mark.parametrize(
    "pontos,esperado",
    [
        (((0.0, 0.0),), "ao menos dois pontos"),
        (((10.0, 0.0), (0.0, 1.0)), "ordenados pela consequencia"),
        (((0.0, 0.0), (0.0, 1.0)), "consequencias repetidas"),
        (((0.0, 0.0), (5.0, 2.0), (10.0, 1.0)), r"em \[0, 1\]"),
        (((0.0, 0.0), (5.0, 1.0), (10.0, 0.5)), "monotona"),
        (((0.0, 0.2), (10.0, 0.9)), "pior desempenho"),
    ],
)
def test_curva_de_valor_malformada_e_recusada(pontos, esperado):
    from fitradeoff.domain.scales import PiecewiseScale

    with pytest.raises(ValueError, match=esperado):
        PiecewiseScale(pontos)


def test_criterio_com_curva_usa_a_curva_e_nao_a_linear():
    problem = make_problem([[12.0, 1.0], [30.0, 2.0], [45.0, 3.0]])
    linear = problem.values[1][0]

    from dataclasses import replace

    com_curva = replace(
        problem,
        criteria=(
            replace(
                problem.criteria[0],
                value_points=((12.0, 1.0), (30.0, 0.35), (45.0, 0.0)),
            ),
            problem.criteria[1],
        ),
    )
    assert com_curva.values[1][0] == pytest.approx(0.35)
    assert com_curva.values[1][0] != pytest.approx(linear)


def test_curva_tem_precedencia_sobre_niveis():
    from dataclasses import replace

    problem = make_problem([[1.0, 1.0], [3.0, 2.0]], levels=[(1.0, 2.0, 3.0), None])
    com_curva = replace(
        problem,
        criteria=(
            replace(problem.criteria[0], value_points=((1.0, 0.0), (3.0, 1.0))),
            problem.criteria[1],
        ),
    )
    # pela escala construida 3.0 valeria 1.0 tambem, mas o ponto e a precedencia
    assert com_curva.values[0][0] == 0.0
    assert com_curva.values[1][0] == 1.0
