"""O que a API escolhe na montagem, e que nenhum outro teste veria cair.

As escolhas de montagem nao mudam resposta nenhuma -- e exatamente por isso a
suite inteira continua verde se alguem as desfizer. Este arquivo existe para que
desfazer custe um teste vermelho em vez de uma lentidao que ninguem associa a
causa.
"""

from __future__ import annotations

from fitradeoff.solvers import HighsLinearSolver, ScipyIntegerSolver

from fitradeoff_api.deps import get_service


def test_a_api_resolve_os_lp_pelo_highs(tmp_path):
    """Sem isto, trocar o solver de volta nao quebra nada e ninguem percebe.

    A diferenca e de vazao, nao de resultado: medido nesta maquina, com dezesseis
    conexoes simultaneas, 16,3 req/s pelo scipy contra 56,8 por aqui.
    """
    servico = get_service(tmp_path)
    assert isinstance(servico.container.solver, HighsLinearSolver)


def test_cada_requisicao_tem_o_proprio_solver(tmp_path):
    """Compartilhar um solver entre requisicoes custa mais do que economiza.

    O modelo do HiGHS guarda estado, entao um solver compartilhado precisa de
    trava, e a trava serializa o LP -- medido, 41,7 req/s compartilhado contra
    56,8 com um por requisicao. Se alguem promover o solver a instancia de modulo
    para "aproveitar o cache", isto avisa.
    """
    primeiro = get_service(tmp_path).container.solver
    segundo = get_service(tmp_path).container.solver
    assert primeiro is not segundo


def test_a_mochila_continua_no_scipy(tmp_path):
    """O solver inteiro nao foi trocado, e nem se pretendeu trocar.

    ``build_container`` ganhou ``solver``, e nao ``integer_solver``: a mochila das
    problematicas de carteira segue no scipy, sem ter sido perfilada. Registrado
    aqui para que a troca do LP nao seja lida como troca de tudo.
    """
    assert isinstance(get_service(tmp_path).container.integer_solver, ScipyIntegerSolver)
