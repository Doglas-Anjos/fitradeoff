"""Composicao das dependencias -- a raiz do wiring.

Este e o unico lugar do motor que decide *quais* implementacoes sao usadas.
Todo o resto recebe o que precisa por construtor e nunca importa um adaptador
concreto.

E injecao de dependencia por construtor, montada a mao. Nao ha container com
resolucao automatica de propositio: num projeto deste tamanho ele tornaria o
wiring invisivel, e um grafo de dependencias que ninguem consegue ler de cabo a
rabo e exatamente o oposto do que um sistema auditavel precisa. Aqui, a
composicao inteira cabe numa tela.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from .domain.audit import Clock, SystemClock
from .domain.weights import DEFAULT_EPSILON
from .elicitation.questions import QuestionPresenter
from .elicitation.selectors import QuestionSelector, WidestBracketSelector
from .elicitation.session import DecisionSession
from .problematics.base import Problematic
from .problematics.evaluator import DEFAULT_EQUIVALENCE, Evaluator
from .problematics.registry import ProblematicRegistry, default_registry
from .repositories.base import DecisionRecord, DecisionRepository
from .repositories.adapters import (
    InMemoryDecisionRepository,
    JsonFileDecisionRepository,
)
from .solvers.base import IntegerSolver, LinearSolver
from .solvers.scipy_solver import ScipyIntegerSolver, ScipyLinearSolver


@dataclass
class Container:
    """As dependencias do motor, montadas explicitamente."""

    solver: LinearSolver
    integer_solver: IntegerSolver
    repository: DecisionRepository
    registry: ProblematicRegistry
    clock: Clock = field(default_factory=SystemClock)
    presenter: QuestionPresenter = field(default_factory=QuestionPresenter)
    make_selector: Callable[[], QuestionSelector] = WidestBracketSelector
    epsilon: float = DEFAULT_EPSILON
    equivalence: float = DEFAULT_EQUIVALENCE
    abertura_extrema: bool = True

    @property
    def evaluator(self) -> Evaluator:
        """Evaluator com o limiar padrao do processo."""
        return self.evaluator_for()

    def evaluator_for(self, equivalence: float | None = None) -> Evaluator:
        """Evaluator com o limiar da decisao, ou o do processo se ela nao fixar um.

        ``None`` nao e zero: significa que a decisao nao escolheu limiar nenhum,
        e ai vale o padrao montado aqui. Resolver isso num lugar so evita que
        cada chamador invente a sua propria regra de fallback.
        """
        return Evaluator(
            self.solver,
            equivalence=self.equivalence if equivalence is None else equivalence,
        )

    def problematic(
        self,
        key: str,
        settings: dict | None = None,
        equivalence: float | None = None,
    ) -> Problematic:
        return self.registry.create(
            key, self.evaluator_for(equivalence), self.integer_solver, settings
        )

    def session_for(self, record: DecisionRecord) -> DecisionSession:
        """Monta a sessao de uma decisao persistida.

        O limiar de equivalencia vem do registro, nao daqui: e o que faz reabrir
        a decisao devolver o mesmo resultado, em qualquer processo.
        """
        return DecisionSession(
            problem=record.problem,
            problematic=self.problematic(
                record.problematic_key, record.settings, record.equivalence
            ),
            selector=self.make_selector(),
            presenter=self.presenter,
            clock=self.clock,
            epsilon=self.epsilon,
            abertura_extrema=self.abertura_extrema,
            log=record.log,
        )


def build_container(
    storage: Path | str | None = None,
    epsilon: float = DEFAULT_EPSILON,
    equivalence: float = DEFAULT_EQUIVALENCE,
    abertura_extrema: bool = True,
    make_selector: Callable[[], QuestionSelector] = WidestBracketSelector,
    clock: Clock | None = None,
) -> Container:
    """Composicao padrao: HiGHS via scipy, e disco quando houver diretorio."""
    repository = (
        JsonFileDecisionRepository(storage)
        if storage is not None
        else InMemoryDecisionRepository()
    )
    return Container(
        solver=ScipyLinearSolver(),
        integer_solver=ScipyIntegerSolver(),
        repository=repository,
        registry=default_registry(),
        clock=clock or SystemClock(),
        make_selector=make_selector,
        epsilon=epsilon,
        equivalence=equivalence,
        abertura_extrema=abertura_extrema,
    )
