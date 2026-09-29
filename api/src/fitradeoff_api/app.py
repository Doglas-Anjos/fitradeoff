"""Aplicacao FastAPI.

    uvicorn fitradeoff_api.app:app --reload
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import math

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fitradeoff_mcp import remoto
from fitradeoff_mcp.vagas import avisar_se_sem_folga

from . import identidade
from .config import Settings, load_settings, vagas_de
from . import metricas
from .limite import LimiteDeCorpo
from .routers import chat, chaves, decisions, planilhas, rascunhos

DESCRIPTION = """\
API do metodo FITradeoff (De Almeida et al., 2016) para apoio a decisao
multicriterio com informacao parcial de preferencia.

Duas formas de conduzir a mesma decisao: as rotas de `/api/decisoes`, que
seguem o fluxo classico de elicitacao, e `/mcp`, o servidor MCP por HTTP, em que
o assistente do proprio decisor conduz a conversa usando exatamente as mesmas
operacoes.

Quem esta chamando depende de onde isto roda. No computador do decisor, atras de
nada, `/api` atende sem cadastro: quem alcanca a porta ja e o dono da maquina.
Com um verificador de identidade configurado -- ou seja, com uma aplicacao
autenticando na frente -- nao ha mais chamada anonima, e cada pessoa alcanca o
proprio acervo.

`/mcp` exige credencial sempre, porque foi feito para ser alcancado de fora:
chave portadora emitida em `/api/chaves`, ou a afirmacao assinada da aplicacao
da frente.
"""


def _sem_nao_finitos(valor):
    """NaN e infinito viram texto, para a resposta JSON conseguir sair."""
    if isinstance(valor, float) and not math.isfinite(valor):
        return str(valor)
    if isinstance(valor, dict):
        return {chave: _sem_nao_finitos(item) for chave, item in valor.items()}
    if isinstance(valor, list):
        return [_sem_nao_finitos(item) for item in valor]
    return valor


async def _entrada_invalida(_request: Request, exc: RequestValidationError) -> JSONResponse:
    """O 422 de sempre, mas que consegue citar um NaN.

    O erro de validacao repete a entrada recusada, e a resposta JSON recusa NaN:
    um numero nao finito, recusado corretamente, saia como 500 porque a propria
    mensagem de recusa nao podia ser serializada. Mesmo formato do padrao do
    FastAPI, que e o que o front le.
    """
    return JSONResponse(
        status_code=422,
        content={"detail": _sem_nao_finitos(jsonable_encoder(exc.errors()))},
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()

    @asynccontextmanager
    async def ciclo(app: FastAPI) -> AsyncIterator[None]:
        """Mantem de pe o transporte do MCP enquanto a API estiver de pe.

        O app do MCP e montado depois que este aplicativo existe -- ele precisa
        de um aplicativo para se ligar -- entao o ciclo o encontra em
        ``app.state``, ja que a leitura acontece na partida, nao aqui.
        """
        avisar_se_sem_folga(app.state.vagas)
        async with remoto.ciclo_de_vida(app.state.mcp), metricas.servir(
            settings.metricas_porta
        ):
            yield

    app = FastAPI(
        title="FITradeoff",
        description=DESCRIPTION,
        version="0.3.0",
        lifespan=ciclo,
    )
    app.add_exception_handler(RequestValidationError, _entrada_invalida)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )
    # Antes das rotas lerem o corpo -- e o FastAPI le o de um formulario antes
    # da autenticacao. Ver `limite.py`.
    app.add_middleware(LimiteDeCorpo)
    # Uma instancia so para a API e para o MCP montado aqui: cada pessoa segura
    # no maximo `vagas_por_pessoa` calculos somando os dois lados.
    app.state.vagas = vagas_de(settings)
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
        respostas_em_json=settings.mcp_json,
        vagas=app.state.vagas,
    )
    # Por ultimo: por fora da autenticacao do MCP, para contar os 401 dela.
    metricas.ligar(app, app.state.vagas)

    @app.get("/api/saude", tags=["infra"], summary="Estado do servico")
    def saude():
        # Sem o caminho do armazenamento. Era util quando a plataforma rodava so
        # na maquina do decisor; num endereco publico e um caminho de disco do
        # servidor entregue a quem perguntar, e ninguem na interface o lia.
        return {
            "ok": True,
            "chat_disponivel": settings.chat_enabled,
            "autenticado_por_terceiros": settings.jwt_configurado,
        }

    return app


app = create_app()
