"""O que o servidor MCP escolhe na montagem.

Mesmo motivo do arquivo irmao na API: a escolha do solver nao muda resposta, so
vazao, entao desfaze-la nao quebraria nenhum outro teste.
"""

from __future__ import annotations

from fitradeoff.solvers import HighsLinearSolver

from fitradeoff_mcp.server import service


def test_o_mcp_resolve_os_lp_pelo_highs():
    assert isinstance(service().container.solver, HighsLinearSolver)


def test_o_solver_nao_sobrevive_entre_chamadas():
    """O servidor nao guarda estado entre chamadas, e o solver nao e excecao.

    A regra e do proprio ``_build_service``. Um solver de modulo a contrariaria --
    e, alem disso, seria mais lento, porque compartilhar exige trava.
    """
    assert service().container.solver is not service().container.solver
