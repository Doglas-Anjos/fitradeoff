"""Teto do corpo da requisicao, antes de qualquer rota.

O limite de cada rota -- os 2 MB da planilha, os 512 kB do rascunho -- e
conferido DEPOIS de o corpo inteiro ter sido lido. E o FastAPI le o corpo de um
formulario antes de rodar as dependencias: o arquivo enviado vai para o disco
antes de ``acervo`` descobrir que ninguem se identificou. Medido: um envio anonimo
de 5 MB para ``/api/planilhas/previa`` passava a arquivo temporario e so depois
levava o 401.

Num servidor dividido com outras aplicacoes, isso e disco e memoria de todas
elas a disposicao de quem nao tem conta. Aqui o corpo e cortado na entrada, por
tamanho declarado ou contado, sem depender do proxy na frente -- que pode nao
ter limite nenhum, ou ter um mais largo.
"""

from __future__ import annotations

from fastapi import HTTPException, status
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

#: A maior rota e a planilha (2 MB), mais a moldura do multipart e os outros
#: campos do formulario. Nenhum uso legitimo chega perto disto.
LIMITE_PADRAO = 3 * 1024 * 1024


class LimiteDeCorpo:
    """Recusa com 413 o corpo acima do limite.

    Duas conferencias, porque o ``Content-Length`` e declaracao do cliente: ele
    pode faltar (envio em pedacos) ou mentir. A primeira recusa sem ler nada; a
    segunda conta o que de fato chega e interrompe a leitura ao passar do teto.
    """

    def __init__(self, app: ASGIApp, limite: int = LIMITE_PADRAO) -> None:
        self.app = app
        self.limite = limite

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        for nome, valor in scope.get("headers", []):
            if nome == b"content-length":
                try:
                    declarado = int(valor)
                except ValueError:
                    declarado = -1
                if declarado < 0 or declarado > self.limite:
                    await self._recusar(scope, receive, send)
                    return
                break

        lidos = 0

        async def contando() -> Message:
            nonlocal lidos
            mensagem = await receive()
            if mensagem["type"] == "http.request":
                lidos += len(mensagem.get("body", b""))
                if lidos > self.limite:
                    # HTTPException, e nao uma excecao propria: o FastAPI repassa
                    # esta ao ler o corpo, e qualquer outra ele trocaria por 400.
                    raise HTTPException(
                        status.HTTP_413_CONTENT_TOO_LARGE, self._mensagem()
                    )
            return mensagem

        await self.app(scope, contando, send)

    def _mensagem(self) -> str:
        return f"Corpo acima do limite de {self.limite // 1024} KB."

    async def _recusar(self, scope: Scope, receive: Receive, send: Send) -> None:
        resposta = JSONResponse(
            {"detail": self._mensagem()},
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            # Sem ler o corpo, a conexao nao pode ser reaproveitada.
            headers={"Connection": "close"},
        )
        await resposta(scope, receive, send)
