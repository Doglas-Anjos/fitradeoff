"""``Cache-Control: no-store`` em toda resposta de ``/api``.

As rotas devolvem as decisoes de cada pessoa -- alternativas, criterios, os
julgamentos dela -- e nenhuma declarava cabecalho de cache. Sem ``no-store``, o
navegador pode guardar a resposta em disco, e num computador compartilhado o
"voltar" ou o cache mostram a decisao de quem ja saiu. Um middleware, e nao
um cabecalho por rota, para que a rota nova nao nasca esquecida.

ASGI puro, como ``LimiteDeCorpo``: um ``BaseHTTPMiddleware`` bufferiza e atrapalha
as respostas em fluxo do chat. Aqui so o cabecalho de inicio e tocado.
Quem ja declarou o proprio ``Cache-Control`` mantem o seu.
"""

from __future__ import annotations

from starlette.types import ASGIApp, Message, Receive, Scope, Send


class SemCacheNaApi:
    """Acrescenta ``Cache-Control: no-store`` as respostas de ``/api`` que nao o declaram.

    Toca so no cabecalho de inicio da resposta; o corpo passa como veio, entao
    as respostas em fluxo seguem em fluxo.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or not scope["path"].startswith("/api/"):
            await self.app(scope, receive, send)
            return

        async def enviar(mensagem: Message) -> None:
            if mensagem["type"] == "http.response.start":
                cabecalhos = list(mensagem.get("headers", []))
                if not any(k.lower() == b"cache-control" for k, _ in cabecalhos):
                    cabecalhos.append((b"cache-control", b"no-store"))
                    mensagem = {**mensagem, "headers": cabecalhos}
            await send(mensagem)

        await self.app(scope, receive, enviar)
