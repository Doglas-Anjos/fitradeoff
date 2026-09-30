"""Porta e adaptadores de persistencia."""

from .adapters import InMemoryDecisionRepository, JsonFileDecisionRepository
from .base import (
    ConcurrentModification,
    CorruptRecord,
    DecisionRecord,
    DecisionRepository,
    DecisionSummary,
    RecordNotFound,
    StorageUnavailable,
)
from .serialization import record_from_dict, record_to_dict

__all__ = [
    "ConcurrentModification", "CorruptRecord", "DecisionRecord", "DecisionRepository",
    "DecisionSummary", "StorageUnavailable", "InMemoryDecisionRepository",
    "JsonFileDecisionRepository", "RecordNotFound", "record_from_dict",
    "record_to_dict",
]
