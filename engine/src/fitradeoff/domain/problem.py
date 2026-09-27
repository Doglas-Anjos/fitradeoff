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
    # limites de veto, na unidade original do criterio; ver `veto_factor`
    veto_upper: float | None = None
    veto_lower: float | None = None

    def __post_init__(self) -> None:
        self._check_veto()

    @property
    def is_discrete(self) -> bool:
        return self.levels is not None

    @property
    def has_veto(self) -> bool:
        return self.veto_upper is not None or self.veto_lower is not None

    def _check_veto(self) -> None:
        """Recusa um par de limites que nao diz o que o decisor quis dizer.

        Mora aqui, e nao na validacao de entrada da API, porque o servidor MCP
        e qualquer script constroem o `Criterion` direto. Invertido, o calculo
        nao quebra -- `veto_factor` reordena os limites e segue aplicando o
        oposto do que foi declarado, sem aviso. Numa escala construida, um
        limite fora dos niveis rebenta muito depois, na matriz de valor, com uma
        mensagem que fala de consequencia e nao de veto.
        """
        if not self.has_veto:
            return

        if self.levels is not None:
            niveis = np.asarray(self.levels, dtype=float)
            indices = {}
            for papel, limite in (("aceitável", self.veto_upper),
                                  ("inaceitável", self.veto_lower)):
                if limite is None:
                    continue
                achado = np.flatnonzero(np.isclose(niveis, float(limite)))
                if achado.size == 0:
                    raise ValueError(
                        f"O critério '{self.key}' tem escala construída: o limite "
                        f"de veto {papel} ({limite}) precisa ser um dos níveis "
                        f"declarados {self.levels}."
                    )
                indices[papel] = int(achado[0])
            if len(indices) == 2:
                self._check_ordem(
                    indices["aceitável"], indices["inaceitável"], "nível"
                )
            return

        if self.veto_upper is not None and self.veto_lower is not None:
            # a escala continua ainda nao existe aqui (depende das consequencias),
            # entao a ordem se confere pela direcao declarada
            sinal = 1.0 if self.direction is Direction.MAX else -1.0
            self._check_ordem(
                sinal * self.veto_upper, sinal * self.veto_lower, "desempenho"
            )

    def _check_ordem(self, aceitavel: float, inaceitavel: float, termo: str) -> None:
        if aceitavel == inaceitavel:
            raise ValueError(
                f"O critério '{self.key}' declara o mesmo {termo} como aceitável "
                f"e como inaceitável. Para um corte seco, declare apenas um dos "
                f"dois limites."
            )
        if aceitavel < inaceitavel:
            melhor = "maior" if self.direction is Direction.MAX else "menor"
            comparacao = (
                f"o nível aceitável deve vir depois do inaceitável"
                if termo == "nível"
                else f"o limite aceitável deve ser {melhor} que o inaceitável"
            )
            raise ValueError(
                f"Os limites de veto do critério '{self.key}' estão invertidos: "
                f"{comparacao}."
            )

    def veto_factor(self, consequence: float, scale: Scale) -> float:
        """Quanto este criterio ainda conta, para uma alternativa com este
        desempenho -- o ``z_i(x)`` de de Almeida (2013).

        O decisor declara dois limites na unidade do criterio: acima do superior
        o desempenho e aceitavel e nada muda (``z = 1``); no inferior ou abaixo
        dele e inaceitavel e o criterio deixa de contar (``z = 0``); entre os
        dois ha hesitacao, e o fator cai linearmente.

        Os limites chegam na unidade original -- "80 pontos de qualidade", "20
        dias" -- porque e assim que o decisor pensa, e e assim que o sistema de
        referencia os pede. A comparacao acontece em valor, pela escala do
        criterio, e isso resolve de uma vez a direcao (num criterio de
        minimizacao "acima do limite superior" quer dizer numero menor) e a
        curva elicitada, quando existe.

        Declarar so um dos limites elimina a regiao de hesitacao: o fator vira
        degrau em 0 ou 1 naquele ponto, que e o que o guia do sistema de
        referencia descreve ao dizer que sem os dois "you will not count the
        hesitation region".
        """
        if not self.has_veto:
            return 1.0

        alto = self.veto_upper if self.veto_upper is not None else self.veto_lower
        baixo = self.veto_lower if self.veto_lower is not None else self.veto_upper

        v = scale.value_of(float(consequence))
        v_alto = scale.value_of(float(alto))
        v_baixo = scale.value_of(float(baixo))
        # a escala ja resolveu a direcao: em valor, "melhor" e sempre maior
        if v_baixo > v_alto:
            v_alto, v_baixo = v_baixo, v_alto

        if v >= v_alto:
            return 1.0
        if v <= v_baixo:
            return 0.0
        return (v - v_baixo) / (v_alto - v_baixo)

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
    costs: tuple[float, ...] | None = None  # usado pelas problematicas de carteira

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
            # `not c > 0`, e nao `c <= 0`: NaN falha em qualquer comparacao, e
            # `NaN <= 0` e falso -- um custo NaN passava pela forma antiga.
            if any(not (c > 0) or c == float("inf") for c in self.costs):
                raise ValueError("Os custos devem ser estritamente positivos e finitos.")

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

    @cached_property
    def has_veto(self) -> bool:
        return any(c.has_veto for c in self.criteria)

    @cached_property
    def veto_factors(self) -> np.ndarray:
        """Matriz ``z``, com a mesma forma da matriz de valor.

        Sem veto declarado em criterio nenhum, e toda de uns -- e entao o valor
        penalizado coincide com o valor comum, que e o que garante que ligar a
        funcionalidade nao muda nada para quem nao a usa.
        """
        matrix = np.ones_like(self.consequences)
        for j, (criterion, scale) in enumerate(zip(self.criteria, self.scales)):
            if not criterion.has_veto:
                continue
            for i, consequence in enumerate(self.consequences[:, j]):
                matrix[i, j] = criterion.veto_factor(float(consequence), scale)
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
                "As problematicas de carteira (portfolio e beneficio-custo) "
                "exigem o custo de cada alternativa."
            )
        return self.costs
