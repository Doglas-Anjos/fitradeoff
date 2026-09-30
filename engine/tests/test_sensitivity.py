"""Sensibilidade sobre as consequências.

Responde "e se os números estiverem um pouco errados?" — diferente da
sensibilidade sobre o limiar, que responde "e se eu for mais ou menos exigente
ao chamar duas coisas de equivalentes?".
"""

import numpy as np
import pytest

from conftest import ALTERNATIVAS, CONSEQUENCIAS, CRITERIOS_SPEC, make_problem
from fitradeoff import DecisionService, InvalidRequest
from fitradeoff.application.sensitivity import VariacaoCriterio, analisar
from fitradeoff.domain import HolisticJudgement, Preference
from fitradeoff.elicitation import DecisionSession
from fitradeoff.problematics import ChoiceProblematic


def sessao(evaluator, clock, problem, ordem=(0, 1), respostas=()):
    s = DecisionSession(
        problem=problem,
        problematic=ChoiceProblematic(evaluator),
        clock=clock,
        epsilon=0.0,
    ).rank_criteria(ordem)
    for preferencia in respostas:
        pergunta = s.next_question()
        if pergunta is None:
            break
        s = s.answer(pergunta, preferencia)
    return s


@pytest.fixture
def base(evaluator, clock):
    problem = make_problem(
        [[0.8, 12.0], [0.9, 16.0], [0.7, 10.0]], names=["A", "B", "C"]
    )
    return sessao(evaluator, clock, problem, respostas=[Preference.FIRST])


# --- contrato -----------------------------------------------------------------


def test_exige_ao_menos_um_criterio(base):
    with pytest.raises(ValueError, match="ao menos um criterio"):
        analisar(base, [])


def test_criterio_desconhecido_e_recusado(base):
    with pytest.raises(ValueError, match="desconhecido"):
        analisar(base, [VariacaoCriterio("inexistente")])


def test_variacao_negativa_e_recusada():
    with pytest.raises(ValueError, match="nao negativos"):
        VariacaoCriterio("c0", para_baixo=-5)


def test_variacao_maior_que_cem_por_cento_para_baixo_e_recusada():
    with pytest.raises(ValueError, match="inverte o sinal"):
        VariacaoCriterio("c0", para_baixo=150)


def test_zero_cenarios_e_recusado(base):
    with pytest.raises(ValueError, match="ao menos um cenario"):
        analisar(base, [VariacaoCriterio("c0")], cenarios=0)


# --- comportamento ------------------------------------------------------------


def test_sem_variacao_a_solucao_nunca_muda(base):
    """Variação de 0% é o caso degenerado: todo cenário reproduz o original."""
    r = analisar(base, [VariacaoCriterio("c0", 0.0, 0.0)], cenarios=30)
    assert r.estabilidade == 1.0
    assert r.entraram == {}
    assert r.sairam == {}


def test_variacao_grande_desestabiliza_mais_que_variacao_pequena(base):
    pequena = analisar(base, [VariacaoCriterio("c0", 1, 1)], cenarios=150)
    grande = analisar(base, [VariacaoCriterio("c0", 40, 40)], cenarios=150)
    assert pequena.estabilidade >= grande.estabilidade


def test_e_deterministico_por_semente(base):
    a = analisar(base, [VariacaoCriterio("c0", 15, 15)], cenarios=80, semente=7)
    b = analisar(base, [VariacaoCriterio("c0", 15, 15)], cenarios=80, semente=7)
    assert a.to_dict() == b.to_dict()


def test_sementes_diferentes_dao_amostras_diferentes(base):
    a = analisar(base, [VariacaoCriterio("c0", 30, 30)], cenarios=80, semente=1)
    b = analisar(base, [VariacaoCriterio("c0", 30, 30)], cenarios=80, semente=2)
    assert a.frequencia != b.frequencia or a.estabilidade != b.estabilidade


def test_frequencias_ficam_entre_zero_e_um(base):
    r = analisar(base, [VariacaoCriterio("c0", 20, 20)], cenarios=60)
    assert 0.0 <= r.estabilidade <= 1.0
    for valor in r.frequencia.values():
        assert 0.0 <= valor <= 1.0


def test_a_solucao_original_e_registrada(base):
    r = analisar(base, [VariacaoCriterio("c0", 10, 10)], cenarios=40)
    assert r.solucao_original == list(base.analyse().detail["potencialmente_otimas"])


def test_varia_mais_de_um_criterio_de_uma_vez(base):
    r = analisar(
        base,
        [VariacaoCriterio("c0", 10, 10), VariacaoCriterio("c1", 20, 5)],
        cenarios=50,
    )
    assert len(r.criterios_variados) == 2
    assert r.criterios_variados[1]["para_baixo"] == 20
    assert r.criterios_variados[1]["para_cima"] == 5


def test_as_respostas_do_decisor_nao_mudam(base):
    """A análise varia os números do problema, nunca o log."""
    antes = len(base.log)
    analisar(base, [VariacaoCriterio("c0", 25, 25)], cenarios=40)
    assert len(base.log) == antes


def test_alternativa_dominada_em_tudo_quase_nunca_aparece(evaluator, clock):
    problem = make_problem(
        [[1.0, 1.0], [0.9, 0.9], [0.1, 0.1]], names=["Boa", "Media", "Pessima"]
    )
    s = sessao(evaluator, clock, problem)
    r = analisar(s, [VariacaoCriterio("c0", 5, 5)], cenarios=80)
    assert r.frequencia["Pessima"] == 0.0
    assert r.frequencia["Boa"] > r.frequencia["Pessima"]


def test_serializacao_traz_a_leitura(base):
    d = analisar(base, [VariacaoCriterio("c0")], cenarios=20).to_dict()
    assert set(d) >= {
        "cenarios", "criterios_variados", "solucao_original",
        "estabilidade", "frequencia", "entraram", "sairam", "leitura",
    }
    assert "estabilidade" in d["leitura"]


# --- with_problem -------------------------------------------------------------


def test_with_problem_preserva_o_log(evaluator, clock, base):
    outro = make_problem(
        [[0.85, 11.0], [0.95, 15.0], [0.65, 9.0]], names=["A", "B", "C"]
    )
    variante = base.with_problem(outro)
    assert variante.log is base.log
    assert variante.problem is outro


def test_with_problem_recusa_estrutura_diferente(base):
    """O log guarda índices: trocar o nº de critérios os faria apontar errado."""
    menor = make_problem([[1.0, 2.0, 3.0], [3.0, 2.0, 1.0]])
    with pytest.raises(ValueError, match="mesmos criterios"):
        base.with_problem(menor)


# --- a solucao de cada problematica ------------------------------------------


ORDEM = ["qualidade", "custo", "prazo"]
VARIACAO_GRANDE = [
    {"criterio": "qualidade", "para_baixo": 40, "para_cima": 40},
    {"criterio": "custo", "para_baixo": 40, "para_cima": 40},
    {"criterio": "prazo", "para_baixo": 40, "para_cima": 40},
]


@pytest.fixture
def servico(container):
    return DecisionService(container, make_id=lambda: "d1")


def _elicitada(servico, problematica, configuracao=None, custos=None):
    servico.create(
        "Fornecedores", ALTERNATIVAS, CRITERIOS_SPEC, CONSEQUENCIAS,
        problematica=problematica, configuracao=configuracao, custos=custos,
    )
    servico.rank_criteria("d1", ORDEM)
    pesos = {0: 0.5, 1: 0.3, 2: 0.2}
    for _ in range(40):
        question = servico.session("d1").next_question()
        if question is None:
            break
        prefere_a = pesos[question.criterion] * question.value >= pesos[question.rival]
        servico.answer("d1", "A" if prefere_a else "B")


def test_ranking_mede_se_a_ordem_mudou(servico):
    """Antes, fora da escolha, a solucao comparada era sempre o conjunto vazio e
    a estabilidade saia 100% sem medir nada."""
    _elicitada(servico, "ranking")
    parado = servico.consequence_sensitivity(
        "d1", [{"criterio": "custo", "para_baixo": 0, "para_cima": 0}], cenarios=5
    )
    assert parado["estabilidade"] == 1.0
    assert parado["problematica"] == "ranking"
    assert parado["solucao_original"]  # o topo do ranking

    agitado = servico.consequence_sensitivity("d1", VARIACAO_GRANDE, cenarios=30)
    assert agitado["estabilidade"] < 1.0


def test_sorting_mede_se_a_alocacao_mudou(servico):
    _elicitada(
        servico, "sorting",
        configuracao={"perfis": [0.35, 0.7], "classes": ["Baixa", "Media", "Alta"]},
    )
    parado = servico.consequence_sensitivity(
        "d1", [{"criterio": "custo", "para_baixo": 0, "para_cima": 0}], cenarios=5
    )
    assert parado["estabilidade"] == 1.0
    agitado = servico.consequence_sensitivity("d1", VARIACAO_GRANDE, cenarios=30)
    assert agitado["estabilidade"] < 1.0


@pytest.mark.parametrize("problematica", ["portfolio", "beneficio_custo"])
def test_carteiras_comparam_a_carteira(servico, problematica):
    _elicitada(
        servico, problematica,
        configuracao={"orcamento": 25.0, "amostras": 8},
        custos=[10.0, 12.0, 8.0, 11.0],
    )
    analise = servico.state("d1")["analise"]
    esperado = (
        analise["sempre_selecionados"]
        if problematica == "portfolio"
        else analise["carteira_mais_frequente"]["projetos"]
    )
    resultado = servico.consequence_sensitivity(
        "d1", [{"criterio": "custo", "para_baixo": 0, "para_cima": 0}], cenarios=3
    )
    assert resultado["problematica"] == problematica
    assert sorted(resultado["solucao_original"]) == sorted(esperado)
    assert resultado["solucao_original"]
    assert resultado["estabilidade"] == 1.0


def test_problematica_sem_definicao_de_solucao_e_recusada():
    from fitradeoff.application.sensitivity import _solucao

    with pytest.raises(InvalidRequest, match="nao sabe o que comparar"):
        _solucao("inventada", {})


def test_cenarios_inconsistentes_sao_contados_a_parte(evaluator, clock):
    """Cenarios em que as respostas deixam de caber juntas eram pulados mas
    ficavam no denominador, e a resposta nao dizia quantos foram."""
    problem = make_problem(
        [[10.0, 10.0], [9.9, 9.9], [1.0, 1.0]], names=["A", "B", "C"]
    )
    s = sessao(evaluator, clock, problem).record(HolisticJudgement(preferred=0, over=1))
    resultado = analisar(
        s,
        [VariacaoCriterio("c0", 5, 5), VariacaoCriterio("c1", 5, 5)],
        cenarios=60,
    ).to_dict()

    inconsistentes = resultado["cenarios_inconsistentes"]
    assert 0 < inconsistentes < 60
    assert resultado["cenarios_consistentes"] == 60 - inconsistentes
    # A esta na solucao em todo cenario consistente: com o denominador certo,
    # a frequencia e 1, e nao a fracao de cenarios consistentes
    assert resultado["frequencia"]["A"] == 1.0
