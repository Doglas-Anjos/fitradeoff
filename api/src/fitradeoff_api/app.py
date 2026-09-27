"""Aplicacao FastAPI.

    uvicorn fitradeoff_api.app:app --reload
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fitradeoff_mcp import remoto

from . import identidade
from .config import Settings, load_settings
from .routers import chat, chaves, decisions, planilhas, rascunhos

DESCRIPTION = """\
API do metodo FITradeoff (De Almeida et al., 2016) para apoio a decisao
multicriterio com informacao parcial de preferencia.

Duas formas de conduzir a mesma decisao: as rotas de `/api/decisoes`, que
seguem o fluxo classico de elicitacao, e `/mcp`, o servidor MCP por HTTP, em que
o assistente do proprio decisor conduz a conversa usando exatamente as mesmas
operacoes.

As rotas de `/api` nao tem autenticacao nesta versao: quem alcanca a porta ve
todas as decisoes. `/mcp` tem, porque foi feito para ser alcancado de fora --
exige chave portadora, emitida em `/api/chaves`.
"""


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()

    @asynccontextmanager
    async def ciclo(app: FastAPI) -> AsyncIterator[None]:
        """Mantem de pe o transporte do MCP enquanto a API estiver de pe.

        O app do MCP e montado depois que este aplicativo existe -- ele precisa
        de um aplicativo para se ligar -- entao o ciclo o encontra em
        ``app.state``, ja que a leitura acontece na partida, nao aqui.
        """
        async with remoto.ciclo_de_vida(app.state.mcp):
            yield

    app = FastAPI(
        title="FITradeoff",
        description=DESCRIPTION,
        version="0.3.0",
        lifespan=ciclo,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )
    app.include_router(decisions.router)
    app.include_router(planilhas.router)
    app.include_router(chat.router)
    app.include_router(rascunhos.router)
    app.include_router(chaves.router)

    # O MCP entra por ultimo porque veste o aplicativo com a autenticacao dele,
    # e middleware nao pode ser adicionado depois que o aplicativo comecou.
    app.state.mcp = remoto.montar(
        app,
        identidade.resolver(settings),
        hosts_publicos=settings.mcp_hosts,
    )

    @app.get("/api/saude", tags=["infra"], summary="Estado do servico")
    def saude():
        return {
            "ok": True,
            "chat_disponivel": settings.chat_enabled,
            "armazenamento": str(settings.storage),
        }

    return app


app = create_app()
