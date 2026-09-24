"""Camada de dominio: entidades, regras e auditoria. Nao depende de nada."""

from .audit import AuditEntry, AuditLog, Clock, FixedClock, SystemClock
from .formatting import format_amount, format_number
from .preferences import (
    CriteriaRanking,
    HolisticJudgement,
    Preference,
    PreferenceStatement,
    TradeoffAnswer,
    statement_from_dict,
)
from .problem import Criterion, Direction, Problem
from .scales import ContinuousScale, DegenerateScale, DiscreteScale, Scale
from .weights import DEFAULT_EPSILON, LinearConstraint, Sense, WeightSpace

__all__ = [
    "AuditEntry", "AuditLog", "Clock", "FixedClock", "SystemClock",
    "ContinuousScale", "CriteriaRanking", "Criterion", "DEFAULT_EPSILON",
    "DegenerateScale", "Direction", "DiscreteScale", "HolisticJudgement",
    "format_amount", "format_number",
    "LinearConstraint", "Preference", "PreferenceStatement", "Problem",
    "Scale", "Sense", "TradeoffAnswer", "WeightSpace", "statement_from_dict",
]
