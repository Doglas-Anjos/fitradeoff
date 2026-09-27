"""API HTTP do FITradeoff.

``create_app`` e importado sob demanda, e nao no topo. O motivo e a superficie
publica: ``fitradeoff_api.mcp_remoto`` serve so o MCP, e importar este pacote
arrastava junto o aplicativo inteiro -- FastAPI, as rotas de ``/api`` e, por
tabela, o SDK da Anthropic. Nada disso e usado la, e codigo que nao roda num
processo exposto e melhor que nem esteja carregado nele.

``from fitradeoff_api import create_app`` continua funcionando igual.
"""

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:  # pragma: no cover - so para o verificador de tipos
    from .app import create_app

__all__ = ["create_app"]


def __getattr__(nome: str) -> Any:
    if nome == "create_app":
        from .app import create_app

        return create_app
    raise AttributeError(f"module {__name__!r} has no attribute {nome!r}")
