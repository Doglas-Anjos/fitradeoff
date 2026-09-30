"""Registro de auditoria da decisao.

O log e a unica fonte de verdade: o espaco de pesos, o conjunto de alternativas
viaveis e a recomendacao sao sempre recalculados a partir dele. Nada de estado
derivado persistido, portanto nada que possa divergir do que o decisor declarou.

Desfazer e truncar o log. Refazer a analise com outro limiar de equivalencia e
reprocessar o mesmo log. Justificar a decisao e narrar o log.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime, timezone
from typing import Protocol, Sequence

from .preferences import PreferenceStatement, statement_from_dict
from .problem import Problem


class Clock(Protocol):
    """Fonte de tempo. Injetada para que os testes sejam deterministicos."""

    def now(self) -> datetime: ...


class SystemClock:
    """Relogio real, em UTC."""

    def now(self) -> datetime:
        return datetime.now(timezone.utc)


@dataclass(frozen=True)
class FixedClock:
    """Relogio parado, para testes."""

    instant: datetime

    def now(self) -> datetime:
        return self.instant


@dataclass(frozen=True)
class AuditEntry:
    """Uma declaracao, com quem a fez e quando."""

    sequence: int
    statement: PreferenceStatement
    recorded_at: datetime
    actor: str = "decisor"

    def to_dict(self) -> dict:
        return {
            "sequencia": self.sequence,
            "autor": self.actor,
            "registrado_em": self.recorded_at.isoformat(timespec="seconds"),
            "declaracao": self.statement.to_dict(),
        }

    @staticmethod
    def from_dict(data: dict) -> "AuditEntry":
        """Reconstroi uma entrada gravada por ``to_dict``.

        ``autor`` e opcional porque os logs gravados antes de existir o campo
        nao o tem; eles voltam atribuidos ao decisor, que era o unico autor
        possivel entao. A declaracao passa por ``statement_from_dict``, que
        recusa um tipo desconhecido.

        Erros: KeyError se faltar ``sequencia``, ``declaracao`` ou
        ``registrado_em``; ValueError se a declaracao ou a data nao se lerem
        """
        return AuditEntry(
            sequence=data["sequencia"],
            statement=statement_from_dict(data["declaracao"]),
            recorded_at=datetime.fromisoformat(data["registrado_em"]),
            actor=data.get("autor", "decisor"),
        )


@dataclass(frozen=True)
class AuditLog:
    """Sequencia imutavel de declaracoes."""

    entries: tuple[AuditEntry, ...] = ()

    def record(
        self,
        statement: PreferenceStatement,
        clock: Clock,
        actor: str = "decisor",
    ) -> "AuditLog":
        """Devolve um log novo com a declaracao no fim; este nao muda.

        A sequencia e a posicao no log, contada a partir de 1, e nao um
        contador proprio: desfazer trunca o log, e a proxima declaracao reusa o
        numero da que foi desfeita. A hora vem do relogio injetado, para que os
        testes gravem sempre o mesmo instante.
        """
        entry = AuditEntry(
            sequence=len(self.entries) + 1,
            statement=statement,
            recorded_at=clock.now(),
            actor=actor,
        )
        return replace(self, entries=self.entries + (entry,))

    def without_last(self) -> "AuditLog":
        return replace(self, entries=self.entries[:-1])

    def statements(self) -> tuple[PreferenceStatement, ...]:
        return tuple(entry.statement for entry in self.entries)

    def of_type(self, kind: type) -> tuple[PreferenceStatement, ...]:
        return tuple(e.statement for e in self.entries if isinstance(e.statement, kind))

    def last_of_type(self, kind: type) -> PreferenceStatement | None:
        found = self.of_type(kind)
        return found[-1] if found else None

    def narrative(self, problem: Problem) -> tuple[str, ...]:
        """A decisao contada em portugues, na ordem em que foi tomada."""
        return tuple(entry.statement.describe(problem) for entry in self.entries)

    def to_list(self) -> list[dict]:
        return [entry.to_dict() for entry in self.entries]

    @staticmethod
    def from_list(data: Sequence[dict]) -> "AuditLog":
        return AuditLog(tuple(AuditEntry.from_dict(item) for item in data))

    def __len__(self) -> int:
        return len(self.entries)
