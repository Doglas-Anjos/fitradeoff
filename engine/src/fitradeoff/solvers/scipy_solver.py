"""Adaptador do solver HiGHS, via scipy.

Unico ponto do motor que importa scipy. A otimizacao seguinte -- trocar por
``highspy`` com reuso do modelo entre chamadas -- se resume a escrever outro
adaptador com a mesma interface: hoje cerca de 1 ms por LP e quase todo
overhead de montagem, nao de solucao.
"""

from __future__ import annotations

import numpy as np
from scipy.optimize import linprog, milp
from scipy.optimize import Bounds as ScipyBounds
from scipy.optimize import LinearConstraint as ScipyLinearConstraint

from ..domain.weights import WeightSpace
from .base import IntegerSolver, LinearSolver, build_rows

_OPTIMAL = 0


class ScipyLinearSolver(LinearSolver):
    """Programacao linear pelo HiGHS embutido no scipy."""

    def __init__(self, method: str = "highs") -> None:
        self._method = method

    def _solve(
        self,
        space: WeightSpace,
        objective: np.ndarray | None,
        extra: np.ndarray | None,
    ):
        a_ub, b_ub, a_eq, b_eq = build_rows(space, extra)
        cost = (
            np.zeros(space.n_criteria)
            if objective is None
            else np.asarray(objective, dtype=float)
        )
        return linprog(
            c=cost,
            A_ub=a_ub,
            b_ub=b_ub,
            A_eq=a_eq,
            b_eq=b_eq,
            bounds=(0.0, 1.0),
            method=self._method,
        )

    def is_feasible(self, space: WeightSpace, extra: np.ndarray | None = None) -> bool:
        return self._solve(space, None, extra).status == _OPTIMAL

    def maximize(
        self,
        space: WeightSpace,
        objective: np.ndarray,
        extra: np.ndarray | None = None,
    ) -> float | None:
        # linprog minimiza; maximizar e minimizar o simetrico
        result = self._solve(space, -np.asarray(objective, dtype=float), extra)
        if result.status != _OPTIMAL:
            return None
        return float(-result.fun)

    def argmax(
        self,
        space: WeightSpace,
        objective: np.ndarray,
        extra: np.ndarray | None = None,
    ) -> np.ndarray | None:
        result = self._solve(space, -np.asarray(objective, dtype=float), extra)
        if result.status != _OPTIMAL:
            return None
        return np.asarray(result.x, dtype=float)


class ScipyIntegerSolver(IntegerSolver):
    """Mochila binaria pelo HiGHS MIP."""

    def knapsack(
        self, benefits: np.ndarray, costs: np.ndarray, budget: float
    ) -> tuple[int, ...]:
        benefits = np.asarray(benefits, dtype=float)
        costs = np.asarray(costs, dtype=float)

        affordable = costs <= budget + 1e-12
        if not affordable.any():
            return ()

        # Desempate: entre carteiras de mesmo beneficio, fica a mais barata.
        # Sem isso, um projeto de beneficio zero num dado vetor de pesos deixa o
        # MILP indiferente, e a carteira devolvida passa a depender do solver --
        # o que arruinaria tanto o determinismo quanto a leitura de quais
        # projetos "sempre" ou "nunca" entram. O peso e pequeno o bastante para
        # nunca inverter uma diferenca real de beneficio.
        tie_break = 1e-9 / max(float(costs.max()), 1.0)

        result = milp(
            c=-benefits + tie_break * costs,  # milp minimiza
            constraints=ScipyLinearConstraint(costs.reshape(1, -1), -np.inf, budget),
            integrality=np.ones_like(benefits),
            bounds=ScipyBounds(0, 1),
        )
        if not result.success:
            return ()
        chosen = np.flatnonzero(np.asarray(result.x) > 0.5)
        return tuple(int(i) for i in chosen)
