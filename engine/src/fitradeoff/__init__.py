"""Motor do metodo FITradeoff.

Camadas, de dentro para fora:

    domain/         entidades, preferencias, auditoria -- nao importa nada
    solvers/        porta de otimizacao + adaptador HiGHS
    problematics/   escolha, ranking, sorting, portfolio (estrategias)
    elicitation/    perguntas, seletores, sessao
    repositories/   porta de persistencia + adaptadores
    application/    casos de uso
    container       composicao explicita das dependencias

As dependencias apontam sempre para dentro: nenhuma camada interna conhece uma
externa.
"""

from .application import DecisionService, InvalidRequest, LimitExceeded, Limits
from .container import Container, build_container
from .domain import (
    AuditLog,
    Criterion,
    Direction,
    Preference,
    Problem,
    WeightSpace,
)
from .elicitation import DecisionSession, InformationGainSelector, WidestBracketSelector
from .problematics import (
    ChoiceProblematic,
    Evaluator,
    PortfolioProblematic,
    RankingProblematic,
    SortingProblematic,
    default_registry,
)
from .repositories import DecisionRecord, RecordNotFound

__all__ = [
    "AuditLog", "ChoiceProblematic", "Container", "Criterion", "DecisionRecord",
    "DecisionService", "DecisionSession", "Direction", "Evaluator",
    "InformationGainSelector", "InvalidRequest", "LimitExceeded", "Limits",
    "PortfolioProblematic",
    "Preference", "Problem", "RankingProblematic", "RecordNotFound",
    "SortingProblematic", "WeightSpace", "WidestBracketSelector",
    "build_container", "default_registry",
]
