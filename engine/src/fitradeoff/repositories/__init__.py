"""Porta e adaptadores de persistencia."""

from .adapters import InMemoryDecisionRepository, JsonFileDecisionRepository
from .base import DecisionRecord, DecisionRepository, RecordNotFound
from .serialization import record_from_dict, record_to_dict

__all__ = [
    "DecisionRecord", "DecisionRepository", "InMemoryDecisionRepository",
    "JsonFileDecisionRepository", "RecordNotFound", "record_from_dict",
    "record_to_dict",
]
