"""Perguntas de tradeoff: o que perguntar e como enunciar.

Os intervalos de busca sao **derivados do log**, nunca guardados a parte. Se
fossem estado proprio, uma correcao no log poderia deixa-los dessincronizados --
e a auditoria passaria a mentir. Derivar custa microssegundos e elimina a classe
inteira de bugs.
"""

from __future__ import annotations

from dataclasses import dataclass, replace

from ..domain.audit import AuditLog
from ..domain.formatting import format_amount
from ..domain.preferences import CriteriaRanking, Preference, TradeoffAnswer
from ..domain.problem import Problem


@dataclass(frozen=True)
class TradeoffQuestion:
    """Confronta duas consequencias hipoteticas, ambas pessimas em tudo mais.

    * A -- ``criterion`` num desempenho intermediario de valor ``value``;
    * B -- ``rival`` no melhor desempenho possivel.
    """

    criterion: int
    rival: int
    value: float

    def answered_with(self, preference: Preference) -> TradeoffAnswer:
        return TradeoffAnswer(self.criterion, self.rival, self.value, preference)


@dataclass(frozen=True)
class Bracket:
    """Faixa ainda possivel para a razao ``k[rival] / k[criterion]``.

    Cada resposta corta a faixa: e uma busca binaria sobre a razao entre dois
    pesos consecutivos na ordem declarada.
    """

    criterion: int
    rival: int
    lower: float = 0.0
    upper: float = 1.0

    @property
    def width(self) -> float:
        return self.upper - self.lower

    @property
    def midpoint(self) -> float:
        return (self.lower + self.upper) / 2.0

    def narrowed_by(self, answer: TradeoffAnswer) -> "Bracket":
        """Aplica uma resposta.

        Seja r a razao. Preferir A significa ``value * k >= k_rival``, ou seja
        ``r <= value``, o que baixa o teto; preferir B eleva o piso; a
        indiferenca fixa ``r = value``.
        """
        if answer.criterion != self.criterion or answer.rival != self.rival:
            return self
        if answer.preference is Preference.FIRST:
            return replace(self, upper=min(self.upper, answer.value))
        if answer.preference is Preference.SECOND:
            return replace(self, lower=max(self.lower, answer.value))
        if answer.preference is Preference.INDIFFERENT:
            return replace(self, lower=answer.value, upper=answer.value)
        # sem resposta: o par se encerra sem que nada seja afirmado sobre a
        # razao entre os pesos -- o intervalo colapsa apenas para que a pergunta
        # nao volte, e nenhuma restricao entrou no modelo
        return replace(self, lower=self.midpoint, upper=self.midpoint)

    def candidate_value(self, problem: Problem) -> float | None:
        """Desempenho intermediario a usar na proxima pergunta deste par.

        Escala continua aceita o ponto medio. Escala construida so admite os
        niveis declarados: usamos o que estiver dentro da faixa e mais perto do
        meio. Sem nenhum nivel disponivel, o par se esgota -- perguntar por um
        desempenho inexistente produziria uma restricao que a pergunta feita ao
        decisor nao sustenta.
        """
        realizable = problem.scales[self.criterion].intermediate_values()
        if realizable is None:
            return self.midpoint
        inside = [v for v in realizable if self.lower < v < self.upper]
        if not inside:
            return None
        return min(inside, key=lambda v: abs(v - self.midpoint))


def brackets_from_log(problem: Problem, log: AuditLog) -> tuple[Bracket, ...]:
    """Reconstroi os intervalos de busca a partir das declaracoes registradas."""
    ranking = log.last_of_type(CriteriaRanking)
    if ranking is None:
        return ()

    brackets = [
        Bracket(criterion=higher, rival=lower)
        for higher, lower in zip(ranking.order, ranking.order[1:])
    ]
    for answer in log.of_type(TradeoffAnswer):
        brackets = [bracket.narrowed_by(answer) for bracket in brackets]
    return tuple(brackets)


# --- enunciado ----------------------------------------------------------------


@dataclass(frozen=True)
class ConsequenceLine:
    """Desempenho de uma consequencia hipotetica num criterio."""

    criterion_key: str
    criterion_name: str
    unit: str
    consequence: float
    value: float
    role: str  # "foco" | "melhor" | "pior"

    def as_text(self) -> str:
        marker = {"melhor": " (o melhor possivel)", "pior": " (o pior possivel)"}
        amount = format_amount(self.consequence, self.unit)
        return f"{self.criterion_name}: {amount}{marker.get(self.role, '')}"


@dataclass(frozen=True)
class Option:
    label: str
    lines: tuple[ConsequenceLine, ...]

    def as_text(self) -> str:
        body = "\n".join(f"    - {line.as_text()}" for line in self.lines)
        return f"  Opcao {self.label}:\n{body}"


@dataclass(frozen=True)
class QuestionBrief:
    """Pergunta pronta para apresentacao, em estrutura e em texto."""

    question: TradeoffQuestion
    focus_criterion: str
    rival_criterion: str
    option_a: Option
    option_b: Option

    def as_text(self) -> str:
        return (
            "Compare duas situacoes hipoteticas. Em ambas, tudo o que nao for "
            "mencionado abaixo esta no pior desempenho possivel.\n\n"
            f"{self.option_a.as_text()}\n\n"
            f"{self.option_b.as_text()}\n\n"
            "Qual das duas voce prefere? (ou responda 'indiferente')"
        )


class QuestionPresenter:
    """Traduz a pergunta para os termos concretos do problema.

    O motor raciocina em valor normalizado; o decisor raciocina em reais e dias.
    Enunciar os dois lados por inteiro, e nao so a parte que muda, e o que evita
    que o decisor responda a uma pergunta diferente da que o modelo registra.
    """

    def _line(
        self, problem: Problem, index: int, value: float, role: str
    ) -> ConsequenceLine:
        criterion = problem.criteria[index]
        return ConsequenceLine(
            criterion_key=criterion.key,
            criterion_name=criterion.name,
            unit=criterion.unit,
            consequence=problem.scales[index].consequence_at(value),
            value=value,
            role=role,
        )

    def _option(
        self, problem: Problem, label: str, highlight: int, value: float, role: str
    ) -> Option:
        lines = [self._line(problem, highlight, value, role)]
        lines += [
            self._line(problem, j, 0.0, "pior")
            for j in range(problem.n_criteria)
            if j != highlight
        ]
        return Option(label=label, lines=tuple(lines))

    def present(self, problem: Problem, question: TradeoffQuestion) -> QuestionBrief:
        return QuestionBrief(
            question=question,
            focus_criterion=problem.criteria[question.criterion].name,
            rival_criterion=problem.criteria[question.rival].name,
            option_a=self._option(
                problem, "A", question.criterion, question.value, "foco"
            ),
            option_b=self._option(problem, "B", question.rival, 1.0, "melhor"),
        )
