"""Porta de persistencia.

Guardamos o problema e o log de auditoria -- nada de estado derivado. O espaco
de pesos, as POAs e a recomendacao saem sempre de um replay, entao nao existe
copia que possa divergir do que o decisor declarou.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime

from ..domain.audit import AuditLog
from ..domain.problem import Problem


class RecordNotFound(Exception):
    """Nao ha registro com esse identificador."""


@dataclass
class DecisionRecord:
    """Tudo o que precisa ser persistido de uma decisao."""

    id: str
    problem: Problem
    log: AuditLog = field(default_factory=AuditLog)
    problematic_key: str = "escolha"
    settings: dict = field(default_factory=dict)
    created_at: datetime | None = None


class DecisionRepository(ABC):
    """Armazenamento de decisoes."""

    @abstractmethod
    def save(self, record: DecisionRecord) -> None: ...

    @abstractmethod
    def get(self, record_id: str) -> DecisionRecord: ...

    @abstractmethod
    def list(self) -> list[DecisionRecord]: ...

    @abstractmethod
    def delete(self, record_id: str) -> None: ...

    def exists(self, record_id: str) -> bool:
        try:
            self.get(record_id)
        except RecordNotFound:
            return False
        return True
