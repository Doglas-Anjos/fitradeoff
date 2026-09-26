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
    #: Limiar de equivalencia entre ALTERNATIVAS desta decisao. Mora aqui, e nao
    #: no container, por dois motivos: reabrir a decisao tem de reproduzir o
    #: mesmo resultado -- com o limiar no processo, a recomendacao passaria a
    #: depender de quem carregou o arquivo --, e a auditoria precisa poder dizer
    #: com que limiar aquele resultado saiu.
    #:
    #: Fora de ``settings`` de proposito: ``settings`` e a configuracao da
    #: problematica (perfis do sorting, orcamento da carteira) e trocar de
    #: problematica a substitui inteira. O limiar atravessa a troca, porque e da
    #: decisao e nao da leitura que se faz dela.
    #:
    #: ``None`` nao e zero: e "esta decisao nao escolheu", e ai vale o padrao do
    #: container. E o que mantem identico o comportamento de quem nunca
    #: configurou nada -- inclusive dos registros gravados antes deste campo.
    equivalence: float | None = None


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
