"""Porta de otimizacao: o contrato que o motor usa para falar com um solver.

O motor nao conhece scipy, HiGHS nem OR-Tools -- so estas tres operacoes. Trocar
a implementacao e uma linha na composicao (ver ``fitradeoff.container``), e um
adaptador novo nao exige tocar em regra de negocio nenhuma.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

import numpy as np

from ..domain.weights import Sense, WeightSpace

# Folga numerica para comparar o valor otimo de um LP com zero.
TOLERANCE = 1e-7


@dataclass(frozen=True)
class Bounds:
    """Intervalo ``[lower, upper]`` de uma grandeza sobre o espaco de pesos."""

    lower: float
    upper: float

    @property
    def width(self) -> float:
        return self.upper - self.lower

    def contains(self, value: float, tolerance: float = TOLERANCE) -> bool:
        return self.lower - tolerance <= value <= self.upper + tolerance


class InfeasibleWeightSpace(Exception):
    """Nenhum vetor de pesos satisfaz as preferencias declaradas."""


def build_rows(space: WeightSpace, extra: np.ndarray | None = None):
    """Traduz o espaco de pesos para as matrizes de um LP.

    Acrescenta as restricoes implicitas do modelo aditivo: soma dos pesos igual
    a 1 e ``0 <= k_j <= 1``. ``extra`` sao linhas ``A . k <= 0`` especificas da
    consulta em curso.
    """
    n = space.n_criteria
    a_ub: list[list[float]] = []
    b_ub: list[float] = []
    a_eq: list[list[float]] = [[1.0] * n]
    b_eq: list[float] = [1.0]

    for constraint in space.constraints:
        if constraint.sense is Sense.EQ:
            a_eq.append(list(constraint.coefficients))
            b_eq.append(constraint.rhs)
        else:
            coefficients, rhs = constraint.as_upper_bound()
            a_ub.append(list(coefficients))
            b_ub.append(rhs)

    if extra is not None and len(extra) > 0:
        a_ub.extend(np.asarray(extra, dtype=float).tolist())
        b_ub.extend([0.0] * len(extra))

    return (
        np.array(a_ub) if a_ub else None,
        np.array(b_ub) if b_ub else None,
        np.array(a_eq),
        np.array(b_eq),
    )


class LinearSolver(ABC):
    """Operacoes de otimizacao sobre o espaco de pesos."""

    @abstractmethod
    def is_feasible(self, space: WeightSpace, extra: np.ndarray | None = None) -> bool:
        """Existe algum vetor de pesos que satisfaca tudo?"""

    @abstractmethod
    def maximize(
        self,
        space: WeightSpace,
        objective: np.ndarray,
        extra: np.ndarray | None = None,
    ) -> float | None:
        """Maior valor de ``objective . k``, ou ``None`` se nao houver solucao."""

    @abstractmethod
    def argmax(
        self,
        space: WeightSpace,
        objective: np.ndarray,
        extra: np.ndarray | None = None,
    ) -> np.ndarray | None:
        """Vetor de pesos que atinge esse maximo -- um vertice do espaco viavel."""

    def bounds_of(self, space: WeightSpace, objective: np.ndarray) -> Bounds:
        """Faixa de ``objective . k`` sobre o espaco de pesos."""
        upper = self.maximize(space, objective)
        lower = self.maximize(space, -np.asarray(objective, dtype=float))
        if upper is None or lower is None:
            raise InfeasibleWeightSpace(
                "As preferencias declaradas sao inconsistentes: nenhum conjunto "
                "de pesos as satisfaz simultaneamente."
            )
        return Bounds(-lower, upper)


class IntegerSolver(ABC):
    """Otimizacao binaria, usada pela problematica de portfolio combinatorial."""

    @abstractmethod
    def knapsack(
        self, benefits: np.ndarray, costs: np.ndarray, budget: float
    ) -> tuple[int, ...]:
        """Subconjunto de maior beneficio cujo custo cabe no orcamento."""
