"""Declaracoes de preferencia do decisor.

Cada declaracao sabe fazer duas coisas: virar restricao linear e se explicar em
portugues. Manter as duas juntas e o que garante que a auditoria nunca divirja
do modelo -- a frase lida pelo decisor e a restricao imposta ao LP saem do mesmo
objeto, e nao de dois trechos de codigo que alguem pode esquecer de sincronizar.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum

from .formatting import format_amount
from .problem import Problem
from .weights import (
    LinearConstraint,
    Sense,
    ordering_constraints,
    tradeoff_coefficients,
)


class Preference(str, Enum):
    """Resposta possivel a uma pergunta de tradeoff.

    ``NO_ANSWER`` nao e indiferenca. Indiferenca afirma que as duas consequencias
    valem o mesmo -- e uma informacao, e restringe o espaco de pesos. Nao saber
    responder nao afirma nada: nao gera restricao, so encerra aquele par de
    criterios para que a pergunta nao volte.
    """

    FIRST = "A"
    SECOND = "B"
    INDIFFERENT = "indifferent"
    NO_ANSWER = "no_answer"


def _amount(problem: Problem, criterion: int, value: float) -> str:
    """Consequencia formatada com a unidade do criterio."""
    return format_amount(
        problem.scales[criterion].consequence_at(value),
        problem.criteria[criterion].unit,
    )


class PreferenceStatement(ABC):
    """Algo que o decisor declarou, e que restringe o espaco de pesos.

    ``validate`` faz parte do contrato porque uma declaracao pode chegar de
    fora -- de um arquivo gravado por outra versao, ou adulterado. Indices sao
    conferidos contra o problema antes de virarem restricao, senao um numero
    fora da faixa estoura la dentro, longe da origem do erro.
    """

    @abstractmethod
    def validate(self, problem: Problem) -> None:
        """Verifica que a declaracao faz sentido para este problema."""

    def constraints(
        self, problem: Problem, epsilon: float
    ) -> tuple[LinearConstraint, ...]:
        """Restricoes lineares que esta declaracao impoe."""
        self.validate(problem)
        return self._constraints(problem, epsilon)

    @abstractmethod
    def _constraints(
        self, problem: Problem, epsilon: float
    ) -> tuple[LinearConstraint, ...]:
        """Implementacao especifica, ja com a declaracao validada."""

    @abstractmethod
    def describe(self, problem: Problem) -> str:
        """A mesma declaracao em portugues, para o decisor e para a auditoria."""

    @abstractmethod
    def to_dict(self) -> dict:
        """Forma serializavel, para persistencia."""


@dataclass(frozen=True)
class CriteriaRanking(PreferenceStatement):
    """Ordenacao dos criterios, do maior peso para o menor."""

    order: tuple[int, ...]

    def validate(self, problem: Problem) -> None:
        if sorted(self.order) != list(range(problem.n_criteria)):
            raise ValueError(
                "A ordenacao deve citar cada criterio exatamente uma vez."
            )

    def _constraints(self, problem: Problem, epsilon: float):
        return ordering_constraints(
            problem.n_criteria, self.order, epsilon, source=self.describe(problem)
        )

    def describe(self, problem: Problem) -> str:
        nomes = " > ".join(problem.criteria[j].name for j in self.order)
        return f"Ordenou os critérios por importância: {nomes}."

    def to_dict(self) -> dict:
        return {"tipo": "ordenacao", "ordem": list(self.order)}


@dataclass(frozen=True)
class TradeoffAnswer(PreferenceStatement):
    """Resposta a uma pergunta de tradeoff por decomposicao.

    Confronta a consequencia A -- ``criterion`` no desempenho intermediario de
    valor ``value``, pior em todos os outros -- com a consequencia B --
    ``rival`` no melhor desempenho, pior em todos os outros. A primeira vale
    ``value * k[criterion]``; a segunda vale ``k[rival]``.
    """

    criterion: int
    rival: int
    value: float
    preference: Preference

    def __post_init__(self) -> None:
        if not 0.0 < self.value < 1.0:
            raise ValueError("O desempenho intermediario deve estar em (0, 1).")
        if self.criterion == self.rival:
            raise ValueError("A pergunta confronta dois criterios distintos.")

    def validate(self, problem: Problem) -> None:
        for index, papel in ((self.criterion, "em foco"), (self.rival, "rival")):
            if not 0 <= index < problem.n_criteria:
                raise ValueError(
                    f"Criterio {papel} de indice {index} nao existe neste "
                    f"problema, que tem {problem.n_criteria} criterios."
                )

    def _constraints(self, problem: Problem, epsilon: float):
        # nao saber nao e informacao: nada entra no modelo
        if self.preference is Preference.NO_ANSWER:
            return ()
        coefficients = tradeoff_coefficients(
            problem.n_criteria, self.criterion, self.rival, self.value
        )
        source = self.describe(problem)
        if self.preference is Preference.FIRST:
            return (LinearConstraint(coefficients, Sense.GE, epsilon, source),)
        if self.preference is Preference.SECOND:
            return (LinearConstraint(coefficients, Sense.LE, -epsilon, source),)
        return (LinearConstraint(coefficients, Sense.EQ, 0.0, source),)

    def describe(self, problem: Problem) -> str:
        foco = problem.criteria[self.criterion].name
        rival = problem.criteria[self.rival].name
        valor_foco = _amount(problem, self.criterion, self.value)
        melhor_rival = _amount(problem, self.rival, 1.0)
        posicao = f"{self.value * 100:.0f}% da escala"

        if self.preference is Preference.FIRST:
            return (
                f"Preferiu ter '{foco}' em {valor_foco} ({posicao}) a ter '{rival}' "
                f"no melhor nível ({melhor_rival}): o peso de '{foco}' vezes "
                f"{self.value:.2f} supera o peso de '{rival}'."
            )
        if self.preference is Preference.SECOND:
            return (
                f"Preferiu ter '{rival}' no melhor nível ({melhor_rival}) a ter "
                f"'{foco}' em {valor_foco} ({posicao}): o peso de '{rival}' supera "
                f"o peso de '{foco}' vezes {self.value:.2f}."
            )
        if self.preference is Preference.INDIFFERENT:
            return (
                f"Considerou indiferente '{foco}' em {valor_foco} ({posicao}) e "
                f"'{rival}' no melhor nível ({melhor_rival}): o peso de '{foco}' "
                f"vezes {self.value:.2f} iguala o peso de '{rival}'."
            )
        return (
            f"Não soube comparar '{foco}' em {valor_foco} ({posicao}) com "
            f"'{rival}' no melhor nível ({melhor_rival}). Nada foi assumido sobre "
            f"os pesos; o par foi encerrado."
        )

    def to_dict(self) -> dict:
        return {
            "tipo": "tradeoff",
            "criterio": self.criterion,
            "rival": self.rival,
            "valor": self.value,
            "preferencia": self.preference.value,
        }


@dataclass(frozen=True)
class HolisticJudgement(PreferenceStatement):
    """Comparacao direta entre duas alternativas reais.

    O decisor olha o desempenho completo de duas alternativas e declara que uma
    e melhor. Combina o paradigma holistico ao de decomposicao, dentro do mesmo
    espaco de pesos.
    """

    preferred: int
    over: int

    def __post_init__(self) -> None:
        if self.preferred == self.over:
            raise ValueError("A comparacao exige duas alternativas distintas.")

    def validate(self, problem: Problem) -> None:
        for index, papel in ((self.preferred, "preferida"), (self.over, "preterida")):
            if not 0 <= index < problem.n_alternatives:
                raise ValueError(
                    f"Alternativa {papel} de indice {index} nao existe neste "
                    f"problema, que tem {problem.n_alternatives} alternativas."
                )

    def _constraints(self, problem: Problem, epsilon: float):
        difference = problem.values[self.over] - problem.values[self.preferred]
        return (
            LinearConstraint(
                tuple(float(d) for d in difference),
                Sense.LE,
                -epsilon,
                self.describe(problem),
            ),
        )

    def describe(self, problem: Problem) -> str:
        return (
            f"Julgou '{problem.alternatives[self.preferred]}' melhor que "
            f"'{problem.alternatives[self.over]}', olhando todos os critérios."
        )

    def to_dict(self) -> dict:
        return {"tipo": "holistico", "preferida": self.preferred, "sobre": self.over}


def statement_from_dict(data: dict) -> PreferenceStatement:
    """Reconstroi uma declaracao persistida."""
    tipo = data.get("tipo")
    if tipo == "ordenacao":
        return CriteriaRanking(tuple(data["ordem"]))
    if tipo == "tradeoff":
        return TradeoffAnswer(
            criterion=data["criterio"],
            rival=data["rival"],
            value=data["valor"],
            preference=Preference(data["preferencia"]),
        )
    if tipo == "holistico":
        return HolisticJudgement(preferred=data["preferida"], over=data["sobre"])
    raise ValueError(f"Declaracao de tipo desconhecido: {tipo!r}")
