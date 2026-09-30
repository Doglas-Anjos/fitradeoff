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
import time
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException, Request, status

from .. import chaves as cofre
from .. import identidade
from ..config import Settings
from ..deps import get_settings
from ..schemas import ChaveIn

router = APIRouter(prefix="/api/chaves", tags=["chaves"])

LOOPBACK = frozenset({"127.0.0.1", "::1", "localhost"})

CABECALHO_ADMIN = "X-Fitradeoff-Admin"

#: 32 caracteres de `token_urlsafe` sao 192 bits: fora do alcance de tentativa,
#: mesmo sem limite de pedidos na frente.
ADMIN_TOKEN_MINIMO = 32


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

    if settings.admin_token and len(settings.admin_token) < ADMIN_TOKEN_MINIMO:
        # Atras da aplicacao da frente, esta rota e alcancada pela internet, sem
        # limite de tentativas. Um token curto seria uma senha a adivinhar que
        # abre o acervo do dono -- melhor nao emitir do que emitir por ele.
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            f"FITRADEOFF_ADMIN_TOKEN curto demais: use ao menos "
            f"{ADMIN_TOKEN_MINIMO} caracteres aleatorios "
            "(ex.: python -c \"import secrets; print(secrets.token_urlsafe(32))\").",
        )

    if not settings.admin_token:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "As chaves do MCP sao emitidas no proprio computador que roda a "
            "plataforma. Para emitir de fora, defina FITRADEOFF_ADMIN_TOKEN no "
            "ambiente da API.",
        )

    apresentado = request.headers.get(CABECALHO_ADMIN, "")
    if not hmac.compare_digest(apresentado, settings.admin_token):
        # 403, e nao 401. Quem chega aqui pela tela ja esta autenticado no
        # FasorX; o que falta e PERMISSAO para emitir chave. Com 401 a tela lia
        # "sessao encerrada", mandava a pessoa de volta ao login -- que estava
        # valido -- e a mensagem final ("sua sessao esta ativa, mas...") nao
        # dizia o que de fato aconteceu.
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "A emissao de chaves do MCP e restrita ao administrador da "
            f"plataforma (token de administracao no cabecalho {CABECALHO_ADMIN}).",
        )


def _portador(request: Request) -> str | None:
    """O token do cabecalho Authorization, ou None."""
    cabecalho = request.headers.get("authorization", "")
    esquema, _, token = cabecalho.partition(" ")
    if esquema.lower() == "bearer" and token.strip():
        return token.strip()
    return None


def dono_da_gestao(
    request: Request, settings: Settings = Depends(get_settings)
) -> str | None:
    """De quem sao as chaves desta requisicao -- e se ela pode gerencia-las.

    **Com o token do FasorX** (quem entrou pela tela): gerencia as PROPRIAS
    chaves. Devolve o dono -- o nome do diretorio do acervo dessa pessoa --, e
    cada chave emitida assim abre so esse acervo (ver chaves.resolver). E o que
    deixa qualquer pessoa conectar o proprio assistente sem enxergar o acervo
    de mais ninguem.

    **Sem token**: vale a regra de antes para as chaves do DONO da plataforma,
    que abrem o acervo principal -- maquina local sem autenticacao na frente,
    ou o token de administracao. Devolve None.
    """
    if settings.jwt_configurado:
        token = _portador(request)
        if token is not None:
            caminho = identidade.assercao(settings, token)
            if caminho is None:
                # Mesmo texto e mesmo codigo de deps.acervo: a tela trata o 401
                # como sessao encerrada e manda entrar de novo.
                raise HTTPException(
                    status.HTTP_401_UNAUTHORIZED,
                    "Sessao invalida ou expirada. Entre de novo.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            return caminho.name
    gestao_liberada(request, settings)
    return None


def dono_para_emitir(
    request: Request,
    settings: Settings = Depends(get_settings),
    dono: str | None = Depends(dono_da_gestao),
) -> str | None:
    """Como ``dono_da_gestao``, mas a pessoa precisa ter entrado AGORA.

    O token do FasorX vale 5 minutos; a chave que ele emite vale 90 dias. Sem
    esta regra, qualquer token vazado nesses 5 minutos -- num log, numa
    extensao do navegador -- viraria uma credencial de meses. Exigir ``iat``
    recente obriga quem emite a ter a sessao do FasorX neste instante: a tela
    busca um token novo logo antes de emitir (``identidade.obter({novo})``).

    Token sem ``iat`` e recusado: sem a data de emissao nao ha como dizer que
    ele e recente, e na duvida nao se emite.
    """
    if dono is None:
        # Caminho do dono da plataforma: loopback ou token de administracao,
        # que ja tem a porta propria em ``gestao_liberada``.
        return None
    token = _portador(request)
    declaracoes = identidade.declaracoes(settings, token) if token else None
    emitido = declaracoes.get("iat") if declaracoes else None
    idade = (
        time.time() - emitido
        if isinstance(emitido, (int, float)) and not isinstance(emitido, bool)
        else None
    )
    if idade is None or idade > settings.chave_token_recente_s:
        # 403, e nao 401: a sessao esta valida para o resto da tela, e o 401
        # faria a tela tratar como sessao encerrada.
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Entre de novo para emitir uma chave: a emissao exige uma sessao "
            "confirmada agora pelo FasorX.",
        )
    return dono


def _cofre_ilegivel(exc: cofre.CofreCorrompido) -> HTTPException:
    # 503: o problema e do servidor, e nada foi gravado -- as chaves que o
    # arquivo ainda guarda continuam la para quem for restaura-lo.
    return HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc))


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
    dono: str | None = Depends(dono_da_gestao),
) -> dict[str, object]:
    """A lista nunca traz o texto das chaves -- ele nao existe mais em lugar algum.

    So as chaves de quem pergunta: cada pessoa ve as proprias.
    """
    return {
        "chaves": [c.publica() for c in cofre.listar(settings, dono)],
        "url": settings.mcp_url,
        "publicado": settings.mcp_publicado,
        "aviso": aviso_de_configuracao(settings),
    }


@router.post("", status_code=status.HTTP_201_CREATED, summary="Emite uma chave")
def criar(
    dados: ChaveIn,
    settings: Settings = Depends(get_settings),
    dono: str | None = Depends(dono_para_emitir),
) -> dict[str, object]:
    """A unica resposta da API que contem o texto de uma chave."""
    try:
        chave, texto = cofre.criar(settings, dados.rotulo, dono)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    except cofre.CofreCorrompido as exc:
        raise _cofre_ilegivel(exc) from exc
    return {"chave": chave.publica(), "texto": texto, "url": settings.mcp_url}


@router.delete("/{id}", summary="Revoga uma chave")
def revogar(
    id: str,
    settings: Settings = Depends(get_settings),
    dono: str | None = Depends(dono_da_gestao),
) -> dict[str, bool]:
    # So revoga chave do proprio dono. A de outra pessoa responde 404, igual a
    # uma que nao existe -- 403 confirmaria que o id e de alguem.
    try:
        revogada = cofre.revogar(settings, id, dono)
    except cofre.CofreCorrompido as exc:
        raise _cofre_ilegivel(exc) from exc
    if not revogada:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Chave nao encontrada.")
    return {"revogada": True}
