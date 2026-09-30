"""Escalas de valor intra-criterio.

Cada tipo de escala sabe converter nos dois sentidos -- consequencia na unidade
original <-> valor em [0, 1] -- e dizer quais desempenhos consegue realizar.
O polimorfismo aqui e o que evita espalhar ``if criterio.e_discreto`` por todo
o motor: quem pergunta a escala nunca precisa saber de que tipo ela e.

Convencao MAVT: v = 1 na melhor consequencia, v = 0 na pior.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

import numpy as np


class Scale(ABC):
    """Conversao entre consequencia e valor, nos dois sentidos."""

    @abstractmethod
    def value_of(self, consequence: float) -> float:
        """Valor da consequencia dada: em [0, 1] dentro do que a escala cobre.

        Fora disso cada escala decide: a continua extrapola, a curva satura na
        ponta, a discreta recusa (ver cada subclasse).
        """

    @abstractmethod
    def consequence_at(self, value: float) -> float:
        """Consequencia, na unidade original, cujo valor e ``value``."""

    @abstractmethod
    def intermediate_values(self) -> tuple[float, ...] | None:
        """Valores estritamente entre o pior e o melhor que a escala realiza.

        ``None`` significa que qualquer valor serve (escala continua). Uma
        pergunta de tradeoff so pode usar um desempenho que a escala realize --
        perguntar por um nivel inexistente produziria uma restricao que a
        pergunta feita ao decisor nao sustenta.
        """

    @property
    def best(self) -> float:
        return self.consequence_at(1.0)

    @property
    def worst(self) -> float:
        return self.consequence_at(0.0)


@dataclass(frozen=True)
class ContinuousScale(Scale):
    """Normalizacao linear sobre a faixa observada entre as alternativas.

    A pior consequencia observada vale 0 e a melhor vale 1. ``value_of`` nao
    corta: uma consequencia fora da faixa observada -- um limite de veto, por
    exemplo -- extrapola a reta e sai abaixo de 0 ou acima de 1. E o que
    ``Criterion.veto_factor`` precisa para comparar um limite fora da faixa com
    as alternativas.

    Unidade: valor normalizado, [0, 1] dentro da faixa observada
    """

    lower: float
    upper: float
    ascending: bool  # True quando mais e melhor

    def _span(self) -> float:
        return self.upper - self.lower

    def value_of(self, consequence: float) -> float:
        fraction = (consequence - self.lower) / self._span()
        return fraction if self.ascending else 1.0 - fraction

    def consequence_at(self, value: float) -> float:
        fraction = value if self.ascending else 1.0 - value
        return self.lower + fraction * self._span()

    def intermediate_values(self) -> tuple[float, ...] | None:
        return None


@dataclass(frozen=True)
class DiscreteScale(Scale):
    """Escala construida: niveis declarados, do pior para o melhor.

    Todos os niveis entram na escala mesmo que nenhuma alternativa se situe
    neles, conforme a avaliacao intra-criterio do FITradeoff.

    Os niveis sao igualmente espacados em valor: o nivel de indice ``i`` vale
    ``i / (n - 1)``. ``consequence_at`` arredonda para o nivel mais proximo,
    porque entre dois niveis nao ha consequencia que a escala realize.

    Unidade: valor normalizado [0, 1]
    Erros: ValueError em ``value_of`` para uma consequencia fora dos niveis
    """

    levels: tuple[float, ...]

    def __post_init__(self) -> None:
        if len(self.levels) < 2:
            raise ValueError("Uma escala construida precisa de ao menos dois niveis.")

    def value_of(self, consequence: float) -> float:
        matches = np.flatnonzero(np.isclose(np.asarray(self.levels), consequence))
        if matches.size == 0:
            raise ValueError(
                f"Consequencia {consequence} nao pertence aos niveis declarados "
                f"{self.levels}."
            )
        return float(matches[0]) / (len(self.levels) - 1)

    def consequence_at(self, value: float) -> float:
        index = int(round(value * (len(self.levels) - 1)))
        return float(self.levels[min(max(index, 0), len(self.levels) - 1)])

    def intermediate_values(self) -> tuple[float, ...] | None:
        last = len(self.levels) - 1
        return tuple(i / last for i in range(1, last))


@dataclass(frozen=True)
class DegenerateScale(Scale):
    """Criterio em que todas as alternativas empatam.

    Nao discrimina nada: atribui valor 1 a todas, o que o torna irrelevante para
    as diferencas entre alternativas sem quebrar a convencao v(melhor) = 1.
    """

    consequence: float

    def value_of(self, consequence: float) -> float:
        return 1.0

    def consequence_at(self, value: float) -> float:
        return self.consequence

    def intermediate_values(self) -> tuple[float, ...] | None:
        return ()


@dataclass(frozen=True)
class PiecewiseScale(Scale):
    """Curva de valor elicitada, interpolada entre os pontos informados.

    O metodo nao supoe que valor cresce linearmente com desempenho: ir de 45
    para 30 dias pode valer muito mais do que ir de 30 para 15. A avaliacao
    intra-criterio do FITradeoff existe para levantar essa curva, ponto a ponto,
    e e ela que entra no modelo aditivo.

    ``pontos`` sao pares (consequencia, valor) com valor em [0, 1], incluindo as
    extremidades. Entre dois pontos consecutivos a curva e um segmento de reta,
    que e como o sistema de referencia a desenha.

    ``realizaveis``, quando existe, e o conjunto de consequencias que uma
    pergunta de tradeoff pode mostrar -- e o caso da escala construida com curva
    (ver ``Criterion.scale_for``). Sem ele, qualquer ponto da curva serve.

    Fora dos pontos extremos a curva e constante: ``value_of`` devolve o valor
    da ponta mais proxima, ao contrario de ``ContinuousScale``, que extrapola.

    Unidade: valor normalizado [0, 1]
    Erros: ValueError na construcao, se a curva tiver menos de dois pontos, nao
    for ordenada e monotona, ou nao incluir os valores 0 e 1
    """

    pontos: tuple[tuple[float, float], ...]
    realizaveis: tuple[float, ...] | None = None

    def __post_init__(self) -> None:
        if len(self.pontos) < 2:
            raise ValueError("Uma curva de valor precisa de ao menos dois pontos.")

        consequencias = [c for c, _ in self.pontos]
        if consequencias != sorted(consequencias):
            raise ValueError(
                "Os pontos da curva devem vir ordenados pela consequencia."
            )
        if len(set(consequencias)) != len(consequencias):
            raise ValueError("Ha consequencias repetidas na curva de valor.")

        valores = [v for _, v in self.pontos]
        if any(not 0.0 <= v <= 1.0 for v in valores):
            raise ValueError("Os valores da curva devem estar em [0, 1].")
        if valores != sorted(valores) and valores != sorted(valores, reverse=True):
            raise ValueError(
                "A curva de valor precisa ser monotona: mais desempenho nunca "
                "pode valer menos e depois valer mais de novo."
            )
        if {0.0, 1.0} - set(valores):
            raise ValueError(
                "A curva precisa incluir o pior desempenho (valor 0) e o melhor "
                "(valor 1)."
            )

    @property
    def _crescente(self) -> bool:
        return self.pontos[-1][1] > self.pontos[0][1]

    def value_of(self, consequence: float) -> float:
        xs = [c for c, _ in self.pontos]
        ys = [v for _, v in self.pontos]
        if consequence <= xs[0]:
            return ys[0]
        if consequence >= xs[-1]:
            return ys[-1]
        # np.interp exige xs crescente, o que o __post_init__ garante
        return float(np.interp(consequence, xs, ys))

    def consequence_at(self, value: float) -> float:
        xs = [c for c, _ in self.pontos]
        ys = [v for _, v in self.pontos]
        if not self._crescente:  # np.interp precisa de ys crescente
            xs, ys = list(reversed(xs)), list(reversed(ys))
        return float(np.interp(value, ys, xs))

    def intermediate_values(self) -> tuple[float, ...] | None:
        if self.realizaveis is None:
            return None
        valores = {self.value_of(c) for c in self.realizaveis}
        return tuple(sorted(v for v in valores if 0.0 < v < 1.0))


def scale_from_column(column: np.ndarray, ascending: bool) -> Scale:
    """Escala continua deduzida da faixa observada, ou degenerada se ha empate.

    A faixa e a das alternativas, e nao uma declarada pelo decisor: acrescentar
    ou remover uma alternativa extrema muda o valor de todas as outras naquele
    criterio. O empate usa ``np.isclose``, com as tolerancias padrao do numpy.
    """
    lower, upper = float(column.min()), float(column.max())
    if np.isclose(lower, upper):
        return DegenerateScale(lower)
    return ContinuousScale(lower, upper, ascending)
