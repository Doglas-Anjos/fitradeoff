"""Configuracao da API, por variavel de ambiente."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


def _origins() -> list[str]:
    """Origens permitidas para o front em desenvolvimento."""
    bruto = os.environ.get("FITRADEOFF_CORS")
    if bruto:
        return [o.strip() for o in bruto.split(",") if o.strip()]
    return ["http://localhost:3000", "http://127.0.0.1:3000"]


@dataclass(frozen=True)
class Settings:
    """Ajustes da API.

    Sem autenticacao por enquanto: a plataforma roda local, e qualquer pessoa
    com acesso a porta ve todas as decisoes. Quando entrar login, o isolamento
    vem de um repositorio com escopo de dono -- a porta ``DecisionRepository``
    ja permite isso sem mexer em regra de negocio.
    """

    storage: Path = field(
        default_factory=lambda: Path(
            os.environ.get("FITRADEOFF_DATA", Path.home() / ".fitradeoff" / "decisoes")
        ).expanduser().resolve()
    )
    cors_origins: list[str] = field(default_factory=_origins)
    anthropic_api_key: str | None = field(
        default_factory=lambda: os.environ.get("ANTHROPIC_API_KEY")
    )
    chat_model: str = field(
        default_factory=lambda: os.environ.get("FITRADEOFF_CHAT_MODEL", "claude-sonnet-5")
    )

    @property
    def chat_enabled(self) -> bool:
        return bool(self.anthropic_api_key)


def load_settings() -> Settings:
    return Settings()
