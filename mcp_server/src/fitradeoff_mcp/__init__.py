"""Servidor MCP do FITradeoff.

Exporta apenas ``main``: reexportar o objeto ``MCPServer`` aqui sombrearia o
submodulo ``fitradeoff_mcp.server``.
"""

from .server import main

__all__ = ["main"]
