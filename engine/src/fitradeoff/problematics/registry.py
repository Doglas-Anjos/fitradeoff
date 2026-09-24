"""Registro das problematicas disponiveis.

Fabrica por chave, para que uma problematica nova se some ao sistema com uma
linha de registro -- sem cadeia de ``if`` espalhada por servico, servidor MCP e
persistencia.
"""

from __future__ import annotations

from typing import Callable

from ..solvers.base import IntegerSolver
from .base import Problematic
from .choice import ChoiceProblematic
from .evaluator import Evaluator
from .portfolio import PortfolioProblematic
from .ranking import RankingProblematic
from .sorting import SortingProblematic

Builder = Callable[[Evaluator, IntegerSolver, dict], Problematic]


class UnknownProblematic(Exception):
    """Chave de problematica nao registrada."""


class ProblematicRegistry:
    """Mapeia a chave persistida para a estrategia correspondente."""

    def __init__(self) -> None:
        self._builders: dict[str, Builder] = {}
        self._labels: dict[str, str] = {}

    def register(self, key: str, label: str, builder: Builder) -> None:
        self._builders[key] = builder
        self._labels[key] = label

    def create(
        self,
        key: str,
        evaluator: Evaluator,
        integer_solver: IntegerSolver,
        settings: dict | None = None,
    ) -> Problematic:
        if key not in self._builders:
            raise UnknownProblematic(
                f"Problematica '{key}' desconhecida. Disponiveis: "
                f"{', '.join(sorted(self._builders))}."
            )
        return self._builders[key](evaluator, integer_solver, settings or {})

    @property
    def keys(self) -> tuple[str, ...]:
        return tuple(sorted(self._builders))

    def describe(self) -> dict[str, str]:
        return dict(self._labels)


def default_registry() -> ProblematicRegistry:
    """As quatro problematicas do FITradeoff."""
    registry = ProblematicRegistry()

    registry.register(
        "escolha",
        ChoiceProblematic.label,
        lambda evaluator, _integer, _settings: ChoiceProblematic(evaluator),
    )
    registry.register(
        "ranking",
        RankingProblematic.label,
        lambda evaluator, _integer, _settings: RankingProblematic(evaluator),
    )
    registry.register(
        "sorting",
        SortingProblematic.label,
        lambda evaluator, _integer, settings: SortingProblematic(
            evaluator,
            profiles=settings.get("perfis", ()),
            class_names=settings.get("classes"),
        ),
    )
    registry.register(
        "portfolio",
        PortfolioProblematic.label,
        lambda evaluator, integer, settings: PortfolioProblematic(
            evaluator,
            integer,
            budget=settings.get("orcamento", 0.0),
            samples=settings.get("amostras", 24),
            seed=settings.get("semente", 0),
        ),
    )
    return registry
