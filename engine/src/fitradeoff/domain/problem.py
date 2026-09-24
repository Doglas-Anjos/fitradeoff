"""Entidades do problema de decisao.

Camada mais interna: nao conhece solver, persistencia nem protocolo. Tudo aqui
e imutavel -- o que permite comparar, cachear e reconstruir estados sem medo.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from functools import cached_property

import numpy as np

from .scales import DiscreteScale, PiecewiseScale, Scale, scale_from_column


class Direction(str, Enum):
    """Direcao de preferencia do criterio."""

    MAX = "max"
    MIN = "min"

    @property
    def ascending(self) -> bool:
        return self is Direction.MAX


@dataclass(frozen=True)
class Criterion:
    """Criterio de avaliacao.

    ``levels`` presente indica escala construida (discreta), com os niveis
    ordenados do pior para o melhor; nesse caso ``direction`` nao se aplica.
    """

    key: str
    name: str
    direction: Direction = Direction.MAX
    unit: str = ""
    levels: tuple[float, ...] | None = None
    # curva de valor elicitada; ausente, a escala e linear sobre a faixa
    value_points: tuple[tuple[float, float], ...] | None = None

    @property
    def is_discrete(self) -> bool:
        return self.levels is not None

    def scale_for(self, column: np.ndarray) -> Scale:
        """Escala deste criterio, dadas as consequencias observadas.

        A curva elicitada tem precedencia: quando o decisor disse quanto vale
        cada desempenho, nao ha por que supor linearidade.
        """
        if self.value_points is not None:
            return PiecewiseScale(
                tuple((float(c), float(v)) for c, v in self.value_points)
            )
        if self.levels is not None:
            return DiscreteScale(tuple(float(v) for v in self.levels))
        return scale_from_column(column, self.direction.ascending)


# eq=False: a matriz de consequencias e um ndarray, que nao se compara nem se
# resume a um hash -- e a identidade do problema e o seu registro, nao o seu
# conteudo. Tambem e o que permite o cache das escalas e da matriz de valor.
@dataclass(frozen=True, eq=False)
class Problem:
    """Alternativas avaliadas em criterios, na unidade original de cada um."""

    name: str
    criteria: tuple[Criterion, ...]
    alternatives: tuple[str, ...]
    consequences: np.ndarray = field(repr=False)
    costs: tuple[float, ...] | None = None  # usado pela problematica de portfolio

    def __post_init__(self) -> None:
        matrix = np.asarray(self.consequences, dtype=float)
        object.__setattr__(self, "consequences", matrix)

        if matrix.ndim != 2:
            raise ValueError("A matriz de consequencias deve ser bidimensional.")
        expected = (len(self.alternatives), len(self.criteria))
        if matrix.shape != expected:
            raise ValueError(
                f"Matriz de consequencias com forma {matrix.shape}; esperado {expected}."
            )
        if not np.isfinite(matrix).all():
            raise ValueError("A matriz de consequencias contem valores nao finitos.")
        if len(self.criteria) < 2:
            raise ValueError("O problema exige ao menos dois criterios.")
        if len(self.alternatives) < 2:
            raise ValueError("O problema exige ao menos duas alternativas.")

        keys = [c.key for c in self.criteria]
        if len(set(keys)) != len(keys):
            raise ValueError("Ha criterios com chaves repetidas.")
        if len(set(self.alternatives)) != len(self.alternatives):
            raise ValueError("Ha alternativas com nomes repetidos.")

        if self.costs is not None:
            if len(self.costs) != len(self.alternatives):
                raise ValueError("A lista de custos nao cobre todas as alternativas.")
            if any(c <= 0 for c in self.costs):
                raise ValueError("Os custos devem ser estritamente positivos.")

    @property
    def n_alternatives(self) -> int:
        return len(self.alternatives)

    @property
    def n_criteria(self) -> int:
        return len(self.criteria)

    @cached_property
    def scales(self) -> tuple[Scale, ...]:
        """Escala de cada criterio, deduzida uma unica vez."""
        return tuple(
            criterion.scale_for(self.consequences[:, j])
            for j, criterion in enumerate(self.criteria)
        )

    @cached_property
    def values(self) -> np.ndarray:
        """Matriz de valor intra-criterio, com forma (alternativas, criterios)."""
        matrix = np.empty_like(self.consequences)
        for j, scale in enumerate(self.scales):
            for i, consequence in enumerate(self.consequences[:, j]):
                matrix[i, j] = scale.value_of(float(consequence))
        return matrix

    def index_of_criterion(self, key: str) -> int:
        for j, criterion in enumerate(self.criteria):
            if criterion.key == key:
                return j
        raise KeyError(f"Criterio desconhecido: {key!r}")

    def index_of_alternative(self, name: str) -> int:
        for i, alternative in enumerate(self.alternatives):
            if alternative == name:
                return i
        raise KeyError(f"Alternativa desconhecida: {name!r}")

    def names_of(self, indices) -> list[str]:
        return [self.alternatives[i] for i in indices]

    def require_costs(self) -> tuple[float, ...]:
        if self.costs is None:
            raise ValueError(
                "A problematica de portfolio exige o custo de cada alternativa."
            )
        return self.costs
