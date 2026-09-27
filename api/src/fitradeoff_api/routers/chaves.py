"""Rotas das chaves do MCP remoto: emitir, listar, revogar.

Estas rotas emitem credencial, e por isso sao as unicas da API com porta:

*Do proprio computador, sem aplicacao autenticando na frente* -- passa. E quem
chega pelo navegador local, pelo rewrite do Next, ou por um tunel SSH ate o
hospedeiro, que o SSH ja autenticou.

*De qualquer outro lugar, ou com uma aplicacao autenticando na frente* -- exige
``FITRADEOFF_ADMIN_TOKEN`` no cabecalho ``X-Fitradeoff-Admin``, e recusa com 503
enquanto esse token nao existir. Administrar de longe e uma decisao, entao
precisa ser configurada.

A segunda metade dessa regra fecha uma escalada: a chave do cofre abre o acervo
do dono da plataforma, e nao o de quem a pediu. Onde ha gente autenticada
entrando -- e chegando, por tabela, da rede interna -- emitir uma chave viraria
o caminho mais curto para ler as decisoes alheias.

O endereco de origem nao prova muita coisa quando ha proxy no caminho: um proxy
que publique a porta 8000 chega como ``127.0.0.1`` igual ao navegador local.
So que nessa situacao o vazamento ja aconteceu por outro caminho -- ``/api`` nao
tem autenticacao nesta versao, e as decisoes estariam publicas antes de qualquer
chave ser emitida. A resposta a esse risco nao e apertar aqui: e nao publicar
esta superficie. Quem publica sobe ``fitradeoff_api.mcp_remoto``, que serve so
``/mcp`` e nao tem estas rotas.

``X-Forwarded-For`` nao e consultado de proposito: e cabecalho, ou seja, e do
cliente, e confiar nele seria pior do que nao ter checagem nenhuma.
"""

from __future__ import annotations

import hmac
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException, Request, status

from .. import chaves as cofre
from ..config import Settings
from ..deps import get_settings
from ..schemas import ChaveIn

router = APIRouter(prefix="/api/chaves", tags=["chaves"])

LOOPBACK = frozenset({"127.0.0.1", "::1", "localhost"})

CABECALHO_ADMIN = "X-Fitradeoff-Admin"


def gestao_liberada(
    request: Request, settings: Settings = Depends(get_settings)
) -> None:
    """Deixa passar so quem pode emitir e revogar chaves."""
    # Atras de uma aplicacao que autentica, a premissa do loopback deixa de
    # valer: quem chega por ela tambem chega da rede interna, e uma chave do
    # cofre abre o acervo do dono, nao o de quem a pediu. Sem esta trava, um
    # visitante autenticado emitiria para si uma credencial do acervo alheio.
    if not settings.jwt_configurado:
        anfitriao = request.client.host if request.client else None
        if anfitriao in LOOPBACK:
            return

    if not settings.admin_token:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "As chaves do MCP sao emitidas no proprio computador que roda a "
            "plataforma. Para emitir de fora, defina FITRADEOFF_ADMIN_TOKEN no "
            "ambiente da API.",
        )

    apresentado = request.headers.get(CABECALHO_ADMIN, "")
    if not hmac.compare_digest(apresentado, settings.admin_token):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            f"Apresente o token de administracao no cabecalho {CABECALHO_ADMIN}.",
        )


def aviso_de_configuracao(settings: Settings) -> str | None:
    """A incoerencia que custaria mais caro descobrir sozinho.

    Quando a URL anunciada aponta para um dominio que nao foi declarado em
    ``FITRADEOFF_MCP_HOSTS``, a protecao contra DNS rebinding do SDK recusa todo
    pedido que chegar por ele -- com 421 e a mensagem "Invalid Host header", que
    nao menciona MCP, nem chave, nem variavel de ambiente. Quem seguiu as
    instrucoes da tela a risca passaria a tarde nisso. A tela avisa antes.
    """
    anfitriao = urlsplit(settings.mcp_url).hostname or ""
    if anfitriao in LOOPBACK:
        return None
    if anfitriao in settings.mcp_hosts:
        return None
    return (
        f"A URL anunciada usa o dominio '{anfitriao}', que nao esta em "
        "FITRADEOFF_MCP_HOSTS. Declare-o nessa variavel, ou o servidor recusa "
        "todo pedido vindo por ele com 421 (Invalid Host header)."
    )


@router.get("", summary="As chaves emitidas e como conectar")
def listar(
    settings: Settings = Depends(get_settings),
    _: None = Depends(gestao_liberada),
) -> dict[str, object]:
    """A lista nunca traz o texto das chaves -- ele nao existe mais em lugar algum."""
    return {
        "chaves": [c.publica() for c in cofre.listar(settings)],
        "url": settings.mcp_url,
        "publicado": settings.mcp_publicado,
        "aviso": aviso_de_configuracao(settings),
    }


@router.post("", status_code=status.HTTP_201_CREATED, summary="Emite uma chave")
def criar(
    dados: ChaveIn,
    settings: Settings = Depends(get_settings),
    _: None = Depends(gestao_liberada),
) -> dict[str, object]:
    """A unica resposta da API que contem o texto de uma chave."""
    try:
        chave, texto = cofre.criar(settings, dados.rotulo)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    return {"chave": chave.publica(), "texto": texto, "url": settings.mcp_url}


@router.delete("/{id}", summary="Revoga uma chave")
def revogar(
    id: str,
    settings: Settings = Depends(get_settings),
    _: None = Depends(gestao_liberada),
) -> dict[str, bool]:
    if not cofre.revogar(settings, id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Chave nao encontrada.")
    return {"revogada": True}
