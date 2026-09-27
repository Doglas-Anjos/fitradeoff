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


def _mcp_hosts() -> list[str]:
    """Dominios por onde o MCP remoto e alcancado de fora desta maquina.

    Declarar isto e o que diz "este servidor esta publicado". Duas coisas
    dependem da declaracao: a protecao contra DNS rebinding do SDK, que sem o
    dominio na lista recusa todo pedido vindo por ele com 421, e a exigencia de
    um token de administracao para emitir chaves.
    """
    bruto = os.environ.get("FITRADEOFF_MCP_HOSTS")
    if not bruto:
        return []
    return [h.strip() for h in bruto.split(",") if h.strip()]


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
    mcp_url: str = field(
        default_factory=lambda: os.environ.get(
            "FITRADEOFF_MCP_URL", "http://127.0.0.1:8000/mcp"
        ).rstrip("/")
    )
    mcp_hosts: list[str] = field(default_factory=_mcp_hosts)
    admin_token: str | None = field(
        default_factory=lambda: os.environ.get("FITRADEOFF_ADMIN_TOKEN") or None
    )

    @property
    def chat_enabled(self) -> bool:
        return bool(self.anthropic_api_key)

    @property
    def mcp_publicado(self) -> bool:
        """Se o MCP remoto e alcancavel de fora desta maquina.

        Nao e deteccao, e declaracao: ninguem descobre de dentro do processo se
        um tunel foi aberto na frente dele. Quem publica declara, e a declaracao
        e o que fecha a emissao de chaves atras de um token.
        """
        return bool(self.mcp_hosts)


def load_settings() -> Settings:
    return Settings()
