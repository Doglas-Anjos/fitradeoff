"""Casos de uso e o contrato de saida, compartilhados por qualquer protocolo."""

from .dto import (
    AnalysisDTO,
    AuditDTO,
    CriterionDTO,
    ProblemDTO,
    QuestionDTO,
    ScenarioDTO,
    SensitivityDTO,
    StatementDTO,
    StateDTO,
    SummaryDTO,
)
from .inconsistency import Conflito, Diagnostico, diagnosticar, resolver
from .limits import LimitExceeded, Limits
from .sensitivity import (
    ResultadoSensibilidade,
    VariacaoCriterio,
    analisar,
)
from .service import DecisionService, InvalidRequest, parse_preference
from .views import (
    analysis_dto,
    audit_dto,
    problem_dto,
    question_dto,
    state_dto,
    summary_dto,
)

__all__ = [
    "AnalysisDTO", "AuditDTO", "CriterionDTO", "DecisionService",
    "Conflito", "Diagnostico", "ResultadoSensibilidade", "VariacaoCriterio",
    "analisar", "diagnosticar", "resolver",
    "InvalidRequest", "LimitExceeded", "Limits", "ProblemDTO", "QuestionDTO",
    "ScenarioDTO", "SensitivityDTO", "StateDTO", "StatementDTO", "SummaryDTO",
    "analysis_dto", "audit_dto", "parse_preference", "problem_dto",
    "question_dto", "state_dto", "summary_dto",
]
