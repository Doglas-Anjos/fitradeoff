"""Espaco de pesos: o conjunto de vetores de constantes de escala ainda viaveis.

Composicao imutavel de restricoes lineares. Cada restricao carrega a origem --
qual declaracao do decisor a produziu --, o que torna o espaco autoexplicativo:
dado um resultado, da para percorrer as restricoes e dizer de onde cada uma veio.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from enum import Enum
from typing import Iterable

# Limiar de equivalencia: preferencia estrita vira desigualdade com folga, para
# que o espaco de pesos nao degenere em faces de medida nula. Corresponde ao
# "equivalence threshold" ajustavel do sistema original.
DEFAULT_EPSILON = 1e-4


class Sense(str, Enum):
    LE = "<="
    GE = ">="
    EQ = "=="


@dataclass(frozen=True)
class LinearConstraint:
    """``coefficients . k <sense> rhs`` sobre o vetor de pesos k."""

    coefficients: tuple[float, ...]
    sense: Sense
    rhs: float
    source: str = ""

    def as_upper_bound(self) -> tuple[tuple[float, ...], float] | None:
        """Forma ``a . k <= b``, ou ``None`` se for igualdade."""
        if self.sense is Sense.LE:
            return self.coefficients, self.rhs
        if self.sense is Sense.GE:
            return tuple(-c for c in self.coefficients), -self.rhs
        return None


@dataclass(frozen=True)
class WeightSpace:
    """Restricoes acumuladas sobre as constantes de escala.

    As restricoes implicitas do modelo aditivo -- soma igual a 1 e nao
    negatividade -- nao entram nesta lista: pertencem ao modelo, nao as
    preferencias, e sao acrescentadas pelo solver.
    """

    n_criteria: int
    constraints: tuple[LinearConstraint, ...] = ()

    def with_constraints(self, new: Iterable[LinearConstraint]) -> "WeightSpace":
        added = tuple(new)
        for constraint in added:
            if len(constraint.coefficients) != self.n_criteria:
                raise ValueError(
                    f"Restricao com {len(constraint.coefficients)} coeficientes; "
                    f"esperado {self.n_criteria}."
                )
        return replace(self, constraints=self.constraints + added)

    @property
    def sources(self) -> tuple[str, ...]:
        return tuple(c.source for c in self.constraints)


def ordering_constraints(
    n_criteria: int,
    order: tuple[int, ...],
    epsilon: float,
    source: str = "",
) -> tuple[LinearConstraint, ...]:
    """k[order[0]] >= k[order[1]] >= ... , para a ordem do maior peso ao menor."""
    built = []
    for higher, lower in zip(order, order[1:]):
        coefficients = [0.0] * n_criteria
        coefficients[higher] = 1.0
        coefficients[lower] = -1.0
        built.append(
            LinearConstraint(tuple(coefficients), Sense.GE, epsilon, source)
        )
    return tuple(built)


def tradeoff_coefficients(
    n_criteria: int, criterion: int, rival: int, value: float
) -> tuple[float, ...]:
    """Coeficientes de ``value * k[criterion] - k[rival]``.

    E a diferenca entre as duas consequencias hipoteticas da pergunta de
    tradeoff: a primeira vale ``value * k[criterion]``, a segunda ``k[rival]``.
    """
    coefficients = [0.0] * n_criteria
    coefficients[criterion] = value
    coefficients[rival] = -1.0
    return tuple(coefficients)
