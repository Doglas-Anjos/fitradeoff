"""Aplicacao FastAPI.

    uvicorn fitradeoff_api.app:app --reload
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings, load_settings
from .routers import chat, decisions, planilhas, rascunhos

DESCRIPTION = """\
API do metodo FITradeoff (De Almeida et al., 2016) para apoio a decisao
multicriterio com informacao parcial de preferencia.

Duas formas de conduzir a mesma decisao: as rotas de `/api/decisoes`, que
seguem o fluxo classico de elicitacao, e `/api/chat`, em que um agente conduz a
conversa usando exatamente as mesmas operacoes.

Sem autenticacao nesta versao: quem alcanca a porta ve todas as decisoes.
"""


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()

    app = FastAPI(
        title="FITradeoff",
        description=DESCRIPTION,
        version="0.3.0",
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

    @app.get("/api/saude", tags=["infra"], summary="Estado do servico")
    def saude():
        return {
            "ok": True,
            "chat_disponivel": settings.chat_enabled,
            "armazenamento": str(settings.storage),
        }

    return app


app = create_app()
