"""Paridade entre os dois adaptadores de programacao linear.

``HighsLinearSolver`` existe para ser mais rapido que ``ScipyLinearSolver``, e o
unico jeito de essa troca ser segura e provar que ela nao muda resposta nenhuma.
E o mesmo HiGHS por baixo dos dois, mas por caminhos diferentes: um passa pela
montagem e validacao do ``scipy.optimize.linprog``, o outro monta o modelo uma
vez e reusa. Reuso de modelo e justamente onde um erro se esconderia -- uma
consulta contaminando a seguinte --, e e o que estes testes cercam.

O que se compara nao e sempre igualdade exata. Em empate, dois solvers podem
devolver vertices diferentes do mesmo otimo, e isso e legitimo: o que precisa
coincidir e o valor do objetivo, nao o vertice escolhido.
"""

from __future__ import annotations

import threading

import numpy as np
import pytest

from fitradeoff import DecisionService, build_container
from fitradeoff.domain.weights import (
    DEFAULT_EPSILON,
    LinearConstraint,
    Sense,
    WeightSpace,
    ordering_constraints,
)
from fitradeoff.solvers import HighsLinearSolver, ScipyLinearSolver

from conftest import CONSEQUENCIAS, CRITERIOS_SPEC, ALTERNATIVAS

TOLERANCIA = 1e-9


@pytest.fixture
def par():
    """Os dois adaptadores, para comparar chamada por chamada."""
    return ScipyLinearSolver(), HighsLinearSolver()


def espacos_de_teste() -> list[WeightSpace]:
    """Espacos que aparecem de verdade numa elicitacao, do vazio ao inconsistente."""
    n = 5
    vazio = WeightSpace(n_criteria=n)
    ordenado = vazio.with_constraints(
        ordering_constraints(n, tuple(range(n)), DEFAULT_EPSILON, "ordem")
    )

    def tradeoff(i, fator, fonte):
        co = [0.0] * n
        co[i] = 1.0
        co[i + 1] = -fator
        return LinearConstraint(tuple(co), Sense.GE, 0.0, fonte)

    com_respostas = ordenado.with_constraints(
        [tradeoff(0, 0.6, "r0"), tradeoff(1, 0.5, "r1"), tradeoff(2, 0.7, "r2")]
    )
    # Inconsistente de proposito: k0 >= k1 pela ordem, e aqui o contrario.
    contraditorio = ordenado.with_constraints(
        [LinearConstraint((-1.0, 1.0, 0.0, 0.0, 0.0), Sense.GE, 0.1, "contradicao")]
    )
    return [vazio, ordenado, com_respostas, contraditorio]


def objetivos(n: int, quantos: int = 12) -> list[np.ndarray]:
    gerador = np.random.default_rng(20260927)
    fixos = [np.eye(n)[i] for i in range(n)]
    return fixos + [gerador.random(n) for _ in range(quantos)]


def test_mesma_resposta_sobre_viabilidade(par):
    antigo, novo = par
    for espaco in espacos_de_teste():
        assert antigo.is_feasible(espaco) == novo.is_feasible(espaco), (
            "os dois adaptadores discordam sobre existir vetor de pesos viavel"
        )


def test_mesmo_maximo(par):
    antigo, novo = par
    for espaco in espacos_de_teste():
        for objetivo in objetivos(espaco.n_criteria):
            a = antigo.maximize(espaco, objetivo)
            b = novo.maximize(espaco, objetivo)
            assert (a is None) == (b is None)
            if a is not None:
                assert a == pytest.approx(b, abs=TOLERANCIA)


def test_argmax_atinge_o_mesmo_valor(par):
    """Em empate o vertice pode diferir; o valor do objetivo, nao."""
    antigo, novo = par
    for espaco in espacos_de_teste():
        for objetivo in objetivos(espaco.n_criteria):
            a = antigo.argmax(espaco, objetivo)
            b = novo.argmax(espaco, objetivo)
            assert (a is None) == (b is None)
            if a is not None:
                assert float(np.dot(objetivo, a)) == pytest.approx(
                    float(np.dot(objetivo, b)), abs=TOLERANCIA
                )
                # o vertice ainda precisa ser um ponto viavel do modelo aditivo
                assert b.sum() == pytest.approx(1.0, abs=1e-9)
                assert (b >= -1e-9).all() and (b <= 1 + 1e-9).all()


def test_mesma_faixa_em_bounds_of(par):
    """``bounds_of`` e derivado na porta; confere que o derivado tambem coincide."""
    antigo, novo = par
    espaco = espacos_de_teste()[2]
    for objetivo in objetivos(espaco.n_criteria, quantos=6):
        fa, fb = antigo.bounds_of(espaco, objetivo), novo.bounds_of(espaco, objetivo)
        assert fa.lower == pytest.approx(fb.lower, abs=TOLERANCIA)
        assert fa.upper == pytest.approx(fb.upper, abs=TOLERANCIA)


def test_linhas_extra_nao_contaminam_a_consulta_seguinte():
    """O risco do reuso de modelo, cercado.

    O adaptador guarda um modelo por (espaco, linhas extra). Se a chave ou a
    limpeza estivessem erradas, uma consulta com restricao extra devolveria o
    resultado da anterior -- e o erro seria silencioso, nao uma excecao.
    """
    antigo, novo = ScipyLinearSolver(), HighsLinearSolver()
    n = 4
    espaco = WeightSpace(n_criteria=n).with_constraints(
        ordering_constraints(n, tuple(range(n)), DEFAULT_EPSILON, "ordem")
    )
    objetivo = np.array([1.0, 0.0, 0.0, 0.0])
    extra = np.array([[1.0, -2.0, 0.0, 0.0]])  # k0 - 2*k1 <= 0, aperta k0

    # intercalado, e duas voltas: se houvesse contaminacao, a segunda volta
    # devolveria o valor da consulta anterior em vez do seu
    for _ in range(2):
        for linhas in (None, extra, None, extra):
            a = antigo.maximize(espaco, objetivo, linhas)
            b = novo.maximize(espaco, objetivo, linhas)
            assert a == pytest.approx(b, abs=TOLERANCIA)

    sem = novo.maximize(espaco, objetivo, None)
    com = novo.maximize(espaco, objetivo, extra)
    assert com < sem, "a restricao extra deveria apertar o maximo, e nao foi aplicada"


def test_argmax_devolve_vetor_que_sobrevive_ao_proximo_solve():
    """O vetor devolvido nao pode mudar quando o modelo e usado de novo.

    Hoje isto vale de graca: o ``highspy`` devolve ``col_value`` como lista do
    Python, entao ``np.array`` sempre copia e o teste nao teria como falhar. Fica
    como arame de tropeco -- se uma versao futura passar a devolver um buffer
    sobre a memoria do solver, o modelo reaproveitado sobrescreveria o vetor nas
    maos de quem chamou, e o erro apareceria aqui em vez de num resultado torto.
    """
    novo = HighsLinearSolver()
    n = 4
    espaco = WeightSpace(n_criteria=n).with_constraints(
        ordering_constraints(n, tuple(range(n)), DEFAULT_EPSILON, "ordem")
    )
    primeiro = novo.argmax(espaco, np.array([1.0, 0.0, 0.0, 0.0]))
    guardado = primeiro.copy()
    novo.argmax(espaco, np.array([0.0, 0.0, 0.0, 1.0]))
    assert np.array_equal(primeiro, guardado)


def _espaco_com_empate(n=5):
    """Espaco em que o objetivo abaixo tem mais de um otimo.

    Epsilon zero deixa ``k0 >= k1`` valer com igualdade, e um objetivo que pesa os
    dois igual torna otimos tanto ``[1, 0, ...]`` quanto ``[0.5, 0.5, 0, ...]``.
    """
    return WeightSpace(n_criteria=n).with_constraints(
        ordering_constraints(n, tuple(range(n)), 0.0, "ordem")
    )


def test_argmax_nao_depende_de_quais_consultas_correram_antes():
    """Mesma pergunta, mesma resposta -- inclusive o vertice, inclusive em empate.

    Um modelo reaproveitado pode partir da base do solve anterior, e ai o vertice
    devolvido passa a depender do historico do solver. Os vertices sao todos
    otimos, entao comparar so o valor do objetivo nao pega isso: pega aqui. Uma
    decisao que responde diferente na segunda vez nao e auditavel.
    """
    espaco = _espaco_com_empate()
    empatado = np.array([1.0, 1.0, 0.0, 0.0, 0.0])
    outro = np.array([0.0, 0.0, 0.0, 0.0, 1.0])

    sozinho = HighsLinearSolver().argmax(espaco, empatado)

    com_historico = HighsLinearSolver()
    com_historico.argmax(espaco, outro)
    com_historico.is_feasible(espaco)
    depois = com_historico.argmax(espaco, empatado)

    assert np.allclose(sozinho, depois), (
        f"o vertice mudou com o historico do solver: {sozinho} -> {depois}"
    )


def test_o_vertice_escolhido_em_empate_e_o_mesmo_dos_dois_adaptadores():
    """Nao basta ser estavel: trocar de adaptador nao pode mudar o vertice.

    Se mudasse, uma decisao reaberta depois da troca poderia mostrar outra
    carteira -- com o mesmo valor global, o que a tornaria dificil de explicar.
    """
    espaco = _espaco_com_empate()
    empatado = np.array([1.0, 1.0, 0.0, 0.0, 0.0])
    assert np.allclose(
        ScipyLinearSolver().argmax(espaco, empatado),
        HighsLinearSolver().argmax(espaco, empatado),
    )


def test_o_cache_de_modelos_nao_satura_num_problema_grande():
    """O cache guarda espacos de peso, nao consultas.

    As linhas ``extra`` sao de uma consulta so e quase nunca repetem. Se elas
    entrassem no cache, um problema com muitas alternativas o encheria de modelos
    de uso unico e o teto passaria a recusar justamente a chave que se
    reaproveita -- a otimizacao se desligaria sozinha, sem erro nenhum.
    """
    solver = HighsLinearSolver(max_modelos=64)
    servico = DecisionService(build_container(epsilon=0.0, solver=solver))
    n_alt = 40
    consequencias = [
        [float((i * 7 + j * 13) % 100) for j in range(4)] for i in range(n_alt)
    ]
    criterios = [
        {"chave": f"c{j}", "nome": f"C{j}", "direcao": "max"} for j in range(4)
    ]
    decisao = servico.create(
        nome="grande",
        alternativas=[f"A{i}" for i in range(n_alt)],
        criterios=criterios,
        consequencias=consequencias,
        problematica="escolha",
    )
    did = decisao["id"]
    servico.rank_criteria(did, [c["chave"] for c in criterios])
    for volta in range(3):
        if servico.next_question(did).get("pergunta", "ausente") is None:
            break
        servico.answer(did, "A" if volta % 2 else "B")

    # poucos espacos de peso: o inicial mais um por resposta registrada
    assert len(solver._modelos) < 16, (
        f"o cache guardou {len(solver._modelos)} modelos; deveria guardar so os "
        f"espacos de peso, que sao poucos"
    )


def test_uso_concorrente_do_mesmo_solver_da_o_mesmo_resultado():
    """Um modelo do HiGHS nao aceita duas threads dentro dele.

    Sem serializacao isso nao levanta excecao: corrompe memoria e derrubaria o
    processo inteiro. O teste existe para que remover a trava quebre aqui, e nao
    em producao.
    """
    novo = HighsLinearSolver()
    n = 5
    espaco = WeightSpace(n_criteria=n).with_constraints(
        ordering_constraints(n, tuple(range(n)), DEFAULT_EPSILON, "ordem")
    )
    lista = objetivos(n, quantos=8)
    esperado = [novo.maximize(espaco, o) for o in lista]

    obtidos: list[list[float]] = []
    trava = threading.Lock()

    def tarefa():
        local = [novo.maximize(espaco, o) for o in lista]
        with trava:
            obtidos.append(local)

    threads = [threading.Thread(target=tarefa) for _ in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(obtidos) == 8
    for resultado in obtidos:
        assert resultado == pytest.approx(esperado, abs=TOLERANCIA)


def _sem_volateis(dado):
    """Tira do dicionario o que muda entre duas execucoes iguais (o id)."""
    if isinstance(dado, dict):
        return {k: _sem_volateis(v) for k, v in dado.items() if k != "id"}
    if isinstance(dado, list):
        return [_sem_volateis(v) for v in dado]
    return dado


def _elicita(solver, problematica, extra_corpo=None):
    """Roda uma elicitacao inteira e devolve o que o decisor teria visto."""
    servico = DecisionService(build_container(epsilon=0.0, solver=solver))
    corpo = dict(
        nome="paridade",
        alternativas=ALTERNATIVAS,
        criterios=CRITERIOS_SPEC,
        consequencias=CONSEQUENCIAS,
        problematica=problematica,
    )
    if extra_corpo:
        corpo.update(extra_corpo)
    decisao = servico.create(**corpo)
    did = decisao["id"]
    servico.rank_criteria(did, [c["chave"] for c in CRITERIOS_SPEC])

    perguntas = []
    voltas = 0
    while True:
        pergunta = servico.next_question(did)
        perguntas.append(_sem_volateis(pergunta))
        if pergunta.get("pergunta", "ausente") is None:
            break
        voltas += 1
        if voltas > 40:
            pytest.fail("a elicitacao nao encerrou; o teste travaria")
        servico.answer(did, "A" if voltas % 2 else "B")

    return perguntas, _sem_volateis(servico.state(did))


@pytest.mark.parametrize(
    "problematica, extra_corpo",
    [
        ("escolha", None),
        ("ranking", None),
        ("sorting", {"configuracao": {"perfis": [0.35, 0.65]}}),
        ("portfolio", {"custos": [12.0, 18.0, 9.0, 15.0], "configuracao": {"orcamento": 30.0}}),
        ("beneficio_custo", {"custos": [12.0, 18.0, 9.0, 15.0], "configuracao": {"orcamento": 30.0}}),
    ],
)
def test_elicitacao_completa_da_o_mesmo_resultado(problematica, extra_corpo):
    """A prova que importa: mesma conversa, mesmas perguntas, mesma conclusao.

    Vale para as cinco problematicas. As de carteira sao aproximadas por
    amostragem, mas a amostragem e deterministica -- entao paridade tambem se
    aplica a elas, e divergir aqui significaria que o solver mudou a amostra.
    """
    perguntas_antigo, estado_antigo = _elicita(
        ScipyLinearSolver(), problematica, extra_corpo
    )
    perguntas_novo, estado_novo = _elicita(
        HighsLinearSolver(), problematica, extra_corpo
    )

    assert len(perguntas_antigo) == len(perguntas_novo), (
        "os dois solvers levaram a elicitacao por caminhos de tamanhos diferentes"
    )
    for antes, depois in zip(perguntas_antigo, perguntas_novo):
        assert antes == depois
    assert estado_antigo == estado_novo
