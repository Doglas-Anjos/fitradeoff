# -*- coding: utf-8 -*-
"""O que sustenta o custo de uma resposta no tempo.

Nenhum destes testes cronometra nada: teste que mede relogio falha por carga da
maquina e acaba desligado, que e pior do que nao existir. O que eles travam sao
as duas propriedades de onde a economia veio -- se alguma se perder, o custo
volta em silencio, e so aparece como "a tela ficou lenta" meses depois.

O historico: cada clique numa pergunta custava tres chamadas ao motor
(responder, estado, pergunta), e a analise e O(n^2) programas lineares. A do
meio era duplicata integral, e as faixas de valor eram calculadas para todas as
alternativas quando so as indecisas sao publicadas.
"""

import numpy as np
import pytest

from conftest import make_problem
from fitradeoff import DecisionService
from fitradeoff.domain import CriteriaRanking, Criterion, Direction, Problem, WeightSpace


def espaco_ordenado(problem):
    """Espaco com a ordenacao declarada, que e onde as faixas tem largura."""
    ordem = tuple(range(problem.n_criteria))
    return WeightSpace(problem.n_criteria).with_constraints(
        CriteriaRanking(ordem).constraints(problem, 0.0)
    )


CRITERIOS = [
    {"chave": f"c{j}", "nome": f"Criterio {j}", "direcao": "max"} for j in range(4)
]


def espalhadas(n, semente=7):
    """``n`` alternativas em que ninguem domina ninguem.

    Cada criterio percorre uma senoide com fase propria, entao quem lidera um
    perde noutro. Sorteio uniforme nao serve: com quatro criterios ele produz
    quase sempre uma alternativa que ganha de todas, o problema se resolve sem
    pergunta nenhuma e o teste passa sem exercitar nada. E o mesmo gerador da
    suite de paridade, pelo mesmo motivo.
    """
    rng = np.random.default_rng(semente)
    linhas = []
    for i in range(n):
        t = i / max(n - 1, 1)
        base = [50 + 45 * np.sin(6.0 * t + fase) for fase in (0.0, 1.6, 3.1, 4.7)]
        linhas.append([float(v * (1 + rng.uniform(-0.02, 0.02))) for v in base])
    return linhas


@pytest.fixture
def decisao(container):
    """Dez alternativas: o bastante para sobrar alternativa decidida e indecisa."""
    service = DecisionService(container)
    consequencias = espalhadas(10)
    criada = service.create(
        "desempenho", [f"A{i}" for i in range(10)], CRITERIOS, consequencias
    )
    service.rank_criteria(criada["id"], [c["chave"] for c in CRITERIOS])
    return service, criada["id"]


def test_responder_ja_devolve_o_estado_que_a_tela_mostraria(decisao):
    """A tela usa a resposta do POST em vez de pedir o estado logo depois.

    Se as duas deixarem de coincidir, a tela passa a exibir algo que o servidor
    nao confirmaria -- e sem nenhum erro, porque as duas cargas tem o mesmo
    formato. Por isso a igualdade e verificada campo a campo, e a cada passo:
    ela e a premissa de `sincronizar` em `web/app/decisao/page.tsx`.
    """
    service, rid = decisao
    passos = 0
    for _ in range(8):
        if service.next_question(rid).get("pergunta", "ha") is None:
            break
        assert service.answer(rid, "A") == service.state(rid)
        passos += 1
    assert passos >= 3, "o caso precisa exercitar varias respostas para valer"


def test_desfazer_e_julgar_tambem_devolvem_o_estado_resultante(decisao):
    """A mesma premissa vale para as outras mutacoes, que seguem o mesmo caminho."""
    service, rid = decisao
    service.answer(rid, "A")
    service.answer(rid, "A")

    assert service.undo(rid) == service.state(rid)

    julgado = service.judge(rid, "A0", "A1")
    assert julgado == service.state(rid)


def test_faixas_publicadas_saem_das_mesmas_contas_que_as_de_todas(evaluator):
    """Calcular so as faixas publicadas nao pode mudar o valor de nenhuma.

    A economia esta em resolver menos LPs, nao em resolver outros.

    A referencia aqui e `value_bounds`, e nao `penalized_bounds`: esta ultima
    passou a delegar para `bounds_by_index`, entao compara-las provaria apenas
    que uma funcao concorda consigo mesma. `value_bounds` calcula por conta
    propria, alternativa por alternativa, e serve de ancora independente.
    """
    problem = make_problem(espalhadas(8))
    space = espaco_ordenado(problem)
    assert not problem.has_veto

    todas = evaluator.value_bounds(problem, space)
    recorte = evaluator.bounds_by_index(problem, space, (1, 4, 6))

    assert set(recorte) == {1, 4, 6}
    for i in recorte:
        assert recorte[i] == todas[i]
    # e as faixas tem largura: com espaco degenerado o teste passaria a toa
    assert any(todas[i].upper - todas[i].lower > 1e-6 for i in recorte)


def test_o_recorte_tambem_vale_sob_veto(evaluator):
    """Com veto a faixa e um envelope de produto, e o recorte tem de acompanhar.

    Vale testar separado porque o caminho e outro: sem veto sao dois LPs por
    alternativa, com veto sao quatro, e uma implementacao pode economizar num
    ramo e esquecer o outro.
    """
    criterios = tuple(
        Criterion(key=f"c{j}", name=f"C{j}", direction=Direction.MAX)
        for j in range(3)
    )
    consequencias = np.array(
        [[80.0, 20.0, 60.0], [30.0, 90.0, 40.0], [55.0, 55.0, 55.0]]
    )
    problem = Problem(
        "com veto",
        criterios[:2] + (criterios[2].__class__(
            key="c2", name="C2", direction=Direction.MAX, veto_lower=45.0
        ),),
        ("A", "B", "C"),
        consequencias,
    )
    assert problem.has_veto
    space = espaco_ordenado(problem)

    # o esperado e montado aqui, dos dois LPs que compoem o envelope, em vez de
    # sair de `penalized_bounds` -- que hoje delega para a funcao sob teste
    valores = evaluator.value_bounds(problem, space)
    fatores = evaluator.veto_bounds(problem, space)
    # inclui a alternativa que o veto de fato atinge -- "B" fica em 40 num
    # criterio cujo piso e 45. Um recorte so de alternativas ilesas exercitaria
    # o ramo do veto sem nunca aplicar penalidade nenhuma.
    recorte = evaluator.bounds_by_index(problem, space, (0, 1))

    assert set(recorte) == {0, 1}
    for i in recorte:
        assert recorte[i].lower == pytest.approx(
            max(0.0, fatores[i].lower) * max(0.0, valores[i].lower)
        )
        assert recorte[i].upper == pytest.approx(
            max(0.0, fatores[i].upper) * max(0.0, valores[i].upper)
        )
    # o ramo do veto tem de estar sendo exercitado de verdade. A verificacao e
    # sobre o fator, e nao sobre o envelope: "B" e penalizada, mas o piso do seu
    # valor e zero, entao o produto coincide por acaso com a faixa crua. Exigir
    # que o envelope diferisse reprovaria uma implementacao correta.
    assert fatores[1].lower < 1.0


def test_indice_repetido_nao_dobra_o_trabalho(evaluator):
    """O chamador passa o que a analise devolveu; repetido, seria LP a mais."""
    problem = make_problem(espalhadas(5))
    space = espaco_ordenado(problem)

    assert set(evaluator.bounds_by_index(problem, space, (2, 2, 3))) == {2, 3}
