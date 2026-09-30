"""A superficie publica: o MCP, e nada mais.

    uvicorn fitradeoff_api.mcp_remoto:app --host 0.0.0.0 --port 8765

O aplicativo de ``app.py`` monta o MCP ao lado das rotas de ``/api``, o que e
conveniente na maquina do decisor e arriscado fora dela: sem verificador de
identidade configurado, ``/api`` atende sem cadastro quem alcanca a porta, entao
publicar aquela porta publicaria as decisoes do acervo principal junto. Com
verificador, ``/api`` exige o JWT da aplicacao da frente e cada pessoa ve so o
proprio acervo -- mas publicar so o que precisa ser publico continua sendo a
defesa que nao depende de configuracao.

Daria para resolver com uma regra de proxy que so deixe passar ``/mcp``. Nao
resolve: uma regra dessas esta a um erro de digitacao de publicar o resto, e o
erro nao aparece em teste nenhum -- aparece quando alguem acha as decisoes. Este
aplicativo **nao tem** as outras rotas. Nao ha o que vazar por engano, e o teste
que afirma isso falha se alguem montar aqui o que nao deve.

Emitir chave continua sendo assunto do aplicativo local: quem publica isto
expoe um servidor que valida chaves, nunca um que as cria.

As duas metades conversam por um arquivo -- o cofre em ``chaves.json``. Quem
roda as duas em maquinas diferentes precisa que esse arquivo (e o diretorio de
decisoes) seja o mesmo volume; a composicao do ``compose.yml`` faz isso.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fitradeoff_mcp import remoto
from fitradeoff_mcp.vagas import avisar_se_sem_folga
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

from . import identidade
from .config import Settings, load_settings, vagas_de
from . import metricas
from .limite import LimiteDeCorpo


async def saude(request: Request) -> JSONResponse:
    """Prova de vida para o hospedeiro, e so isso.

    Sem chave, porque um verificador de saude nao tem credencial; e sem contar
    nada -- nem onde os dados ficam, nem quantas chaves existem -- porque esta
    e a unica rota que responde a quem nao se identificou.
    """
    return JSONResponse({"ok": True, "servico": "fitradeoff-mcp"})


def create_mcp_app(settings: Settings | None = None) -> Starlette:
    """Monta a superficie publica: ``/mcp``, ``/saude`` e nenhuma outra rota.

    Mesma autenticacao, mesmas vagas e mesma medicao do aplicativo local, na mesma
    ordem; o que falta aqui, de proposito, sao as rotas de ``/api``.
    """
    settings = settings or load_settings()

    @asynccontextmanager
    async def ciclo(app: Starlette) -> AsyncIterator[None]:
        avisar_se_sem_folga(app.state.vagas)
        # Sem /api aqui: so o aviso de aud/iss faltando se aplica.
        identidade.avisar_configuracao(settings, com_api=False)
        async with remoto.ciclo_de_vida(app.state.mcp), metricas.servir(
            settings.metricas_porta
        ):
            yield

    app = Starlette(
        routes=[Route("/saude", saude)],
        # A mensagem MCP maior e um problema de 500 alternativas, bem abaixo do
        # teto. Ver `limite.py`.
        middleware=[Middleware(LimiteDeCorpo)],
        lifespan=ciclo,
    )
    app.state.vagas = vagas_de(settings)
    app.state.mcp = remoto.montar(
        app,
        identidade.resolver(settings),
        hosts_publicos=settings.mcp_hosts,
        respostas_em_json=settings.mcp_json,
        # a superficie publica e onde o limite por pessoa mais importa
        vagas=app.state.vagas,
    )
    # Por ultimo: por fora da autenticacao do MCP, para contar os 401 dela.
    metricas.ligar(app, app.state.vagas)
    return app


app = create_mcp_app()
