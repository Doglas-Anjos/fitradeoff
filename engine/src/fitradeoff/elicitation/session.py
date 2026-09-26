"""A sessao de decisao: orquestra o log, o espaco de pesos e a problematica.

Recebe tudo o que usa por construtor -- solver, problematica, seletor de
perguntas, relogio. Nenhuma dependencia e descoberta em tempo de execucao, o
que torna o wiring visivel (ver ``fitradeoff.container``) e os testes livres de
mock: basta passar outro objeto.

A sessao e imutavel. Registrar uma declaracao devolve uma sessao nova, com o
mesmo wiring e um log maior. Todo o resto -- espaco de pesos, intervalos de
busca, analise -- e derivado do log, sempre.
"""

from __future__ import annotations

from dataclasses import dataclass, field, replace

from ..domain.audit import AuditLog, Clock, SystemClock
from ..domain.preferences import (
    CriteriaRanking,
    Preference,
    PreferenceStatement,
)
from ..domain.problem import Problem
from ..domain.weights import DEFAULT_EPSILON, WeightSpace
from ..problematics.base import Analysis, Problematic
from .questions import (
    Bracket,
    QuestionBrief,
    QuestionPresenter,
    TradeoffQuestion,
    brackets_from_log,
)
from .selectors import QuestionSelector, WidestBracketSelector


@dataclass(frozen=True, eq=False)
class DecisionSession:
    """Estado de uma decisao em andamento."""

    problem: Problem
    problematic: Problematic
    selector: QuestionSelector = field(default_factory=WidestBracketSelector)
    presenter: QuestionPresenter = field(default_factory=QuestionPresenter)
    clock: Clock = field(default_factory=SystemClock)
    epsilon: float = DEFAULT_EPSILON
    #: abre a elicitacao pelo par mais importante x menos importante, como o
    #: sistema oficial. Desligado, so pares consecutivos sao perguntados -- uma
    #: pergunta a menos, mesmo resultado.
    abertura_extrema: bool = True
    log: AuditLog = field(default_factory=AuditLog)
    _cache: dict = field(default_factory=dict, repr=False)

    # --- estado derivado ------------------------------------------------------

    @property
    def weight_space(self) -> WeightSpace:
        """Espaco de pesos implicado por tudo o que o decisor declarou."""
        if "space" not in self._cache:
            space = WeightSpace(self.problem.n_criteria)
            for statement in self.log.statements():
                space = space.with_constraints(
                    statement.constraints(self.problem, self.epsilon)
                )
            self._cache["space"] = space
        return self._cache["space"]

    @property
    def brackets(self) -> tuple[Bracket, ...]:
        return brackets_from_log(self.problem, self.log, self.abertura_extrema)

    @property
    def started(self) -> bool:
        """A ordenacao dos pesos ja foi declarada?"""
        return self.log.last_of_type(CriteriaRanking) is not None

    def analyse(self) -> Analysis:
        """Leitura corrente do problema. Memoizada por sessao."""
        if "analysis" not in self._cache:
            self._cache["analysis"] = self.problematic.analyse(
                self.problem, self.weight_space
            )
        return self._cache["analysis"]

    @property
    def is_consistent(self) -> bool:
        return self.problematic.evaluator.is_consistent(self.weight_space)

    @property
    def finished(self) -> bool:
        """Nao ha mais o que perguntar, por conclusao ou por esgotamento."""
        if not self.started or not self.is_consistent:
            return True
        return self.analyse().resolved or self._raw_next_question() is None

    # --- perguntas ------------------------------------------------------------

    def _raw_next_question(self) -> TradeoffQuestion | None:
        """Consulta o seletor sem checar ``finished``, para evitar recursao."""
        if "question" not in self._cache:
            self._cache["question"] = self.selector.select(
                self.problem,
                self.log,
                self.brackets,
                self.weight_space,
                self.problematic,
            )
        return self._cache["question"]

    def next_question(self) -> TradeoffQuestion | None:
        if not self.started or not self.is_consistent:
            return None
        if self.analyse().resolved:
            return None
        return self._raw_next_question()

    def present_question(self) -> QuestionBrief | None:
        """Proxima pergunta enunciada nas unidades do problema."""
        question = self.next_question()
        if question is None:
            return None
        return self.presenter.present(self.problem, question)

    # --- transicoes -----------------------------------------------------------

    def record(
        self, statement: PreferenceStatement, actor: str = "decisor"
    ) -> "DecisionSession":
        """Registra uma declaracao e devolve a sessao resultante."""
        statement.constraints(self.problem, self.epsilon)  # valida antes de gravar
        return replace(
            self,
            log=self.log.record(statement, self.clock, actor),
            _cache={},
        )

    def rank_criteria(self, order, actor: str = "decisor") -> "DecisionSession":
        """Declara a ordenacao dos pesos, do maior para o menor."""
        ranking = CriteriaRanking(tuple(order))
        ranking.validate(self.problem)
        return self.record(ranking, actor)

    def answer(
        self,
        question: TradeoffQuestion,
        preference: Preference,
        actor: str = "decisor",
    ) -> "DecisionSession":
        return self.record(question.answered_with(preference), actor)

    def undo(self) -> "DecisionSession":
        """Desfaz a ultima declaracao truncando o log."""
        if not self.log.entries:
            return self
        return replace(self, log=self.log.without_last(), _cache={})

    def with_epsilon(self, epsilon: float) -> "DecisionSession":
        """Reprocessa o mesmo log com outra folga de preferencia estrita.

        E a analise de sensibilidade: nada e reelicitado, so reinterpretado.
        Nao confundir com o limiar de equivalencia entre alternativas, que vive
        no ``Evaluator``.
        """
        return replace(self, epsilon=epsilon, _cache={})

    def with_problematic(self, problematic: Problematic) -> "DecisionSession":
        """Le o mesmo log sob outra problematica.

        As declaracoes do decisor valem para qualquer leitura: quem respondeu
        pensando em escolher pode ver o ranking sem responder nada de novo.
        """
        return replace(self, problematic=problematic, _cache={})

    def with_selector(self, selector: QuestionSelector) -> "DecisionSession":
        return replace(self, selector=selector, _cache={})

    def with_problem(self, problem: Problem) -> "DecisionSession":
        """Aplica o mesmo log a outra versao do problema.

        E o que sustenta a analise de sensibilidade sobre as consequencias: as
        declaracoes do decisor sao as mesmas, so os numeros do problema mudam.
        Exige a mesma estrutura -- as declaracoes guardam indices de criterio e
        de alternativa, que precisam continuar apontando para o mesmo lugar.
        """
        if (
            problem.n_criteria != self.problem.n_criteria
            or problem.n_alternatives != self.problem.n_alternatives
        ):
            raise ValueError(
                "A variante do problema precisa ter os mesmos criterios e "
                "alternativas: o log guarda indices."
            )
        return replace(self, problem=problem, _cache={})

    # --- auditoria ------------------------------------------------------------

    def narrative(self) -> tuple[str, ...]:
        """A decisao contada em portugues, na ordem em que foi tomada."""
        return self.log.narrative(self.problem)

    def constraint_sources(self) -> tuple[str, ...]:
        """Origem de cada restricao ativa no espaco de pesos."""
        return self.weight_space.sources
