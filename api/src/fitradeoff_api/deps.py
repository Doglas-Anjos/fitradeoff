"""Dependencias da API.

A composicao continua sendo do motor (``build_container``). A API decide duas
coisas de montagem -- onde ficam os dados e qual adaptador de programacao linear
resolve os LPs -- e injeta o servico nas rotas. Nenhuma regra de decisao mora
aqui: as duas escolhas sao de infraestrutura, e nenhuma delas muda resultado.
"""

from __future__ import annotations

from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from functools import lru_cache
from typing import Any, TypeVar
from pathlib import Path

import anyio.from_thread
from fastapi import Depends, HTTPException, Request, status
from fastapi.concurrency import run_in_threadpool
from fitradeoff import DecisionService, build_container
from fitradeoff.application import LimitExceeded
from fitradeoff.application.service import InvalidRequest
from fitradeoff.problematics.registry import UnknownProblematic
from fitradeoff.repositories import (
    ConcurrentModification,
    RecordNotFound,
    StorageUnavailable,
)
from fitradeoff.solvers import HighsLinearSolver
from fitradeoff.solvers.base import InfeasibleWeightSpace
from fitradeoff_mcp import teto
from fitradeoff_mcp.vagas import Cheio, Ocupado

from . import identidade
from .config import Settings, load_settings


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return load_settings()


def acervo(request: Request, settings: Settings = Depends(get_settings)) -> Path:
    """De quem sao as decisoes desta requisicao.

    Duas situacoes, e o que as separa e uma coisa so: se ha como verificar quem
    esta chamando.

    **Sem verificador configurado** -- a plataforma roda no computador do
    decisor, atras de nada. E o dono da maquina, e o acervo e o dele: a tela
    local continua funcionando sem cadastro nenhum, como sempre funcionou.

    **Com verificador configurado** -- alguem declarou que existe uma aplicacao
    autenticando na frente. A partir dai nao ha mais chamada anonima. Quem nao
    apresentar a afirmacao assinada dela leva 401; quem apresentar recebe o
    proprio acervo, nunca o de outra pessoa.

    Fechar pela mesma configuracao que liga a integracao, e nao por um
    interruptor a parte, existe para que o estado perigoso -- publicado e
    aberto -- nao seja alcancavel por esquecimento.
    """
    if not settings.jwt_configurado:
        return settings.storage

    cabecalho = request.headers.get("authorization", "")
    esquema, _, token = cabecalho.partition(" ")
    if esquema.lower() != "bearer" or not token.strip():
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Esta instalacao fica atras de uma aplicacao que autentica. Entre "
            "por ela.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    caminho = identidade.assercao(settings, token.strip())
    if caminho is None:
        # Sem dizer o que falhou: assinatura, validade e publico levam todos a
        # mesma resposta, porque a diferenca entre eles so interessa a quem esta
        # tentando adivinhar.
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Sessao invalida ou expirada. Entre de novo.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return caminho


def montar_servico(caminho: Path, settings: Settings) -> DecisionService:
    """Servico da requisicao, com um solver proprio.

    Um solver por requisicao, e nao um por processo. Parece desperdicio -- o
    adaptador guarda modelos do HiGHS montados, e um solver novo comeca com o
    cache vazio --, mas o contrario sai mais caro: um modelo do HiGHS nao aceita
    duas threads dentro dele, entao compartilhar exige serializar o acesso, e a
    trava custa mais do que o cache frio economiza. Medido nesta maquina, com
    dezesseis conexoes simultaneas: 16,3 req/s com o solver do scipy, 41,7 com um
    solver unico atras de trava, 56,8 com um por requisicao.

    O reuso que paga a troca acontece dentro da requisicao, nao entre elas: uma
    analise resolve centenas de LPs sobre um punhado de espacos de peso, e isso um
    solver recem-criado ja aproveita.
    """
    try:
        return DecisionService(
            build_container(
                storage=caminho,
                solver=HighsLinearSolver(),
                database_url=settings.database_url,
            )
        )
    except StorageUnavailable as exc:
        # A primeira requisicao abre o pool do banco; se ele esta fora do ar, a
        # falha aparece aqui, antes de qualquer rota -- e precisa ser 503 tambem.
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, str(exc), headers={"Retry-After": "5"}
        ) from exc


#: Convencao do nginx para "o cliente fechou a conexao antes da resposta". Nao
#: chega a ninguem -- o cliente ja foi --, mas fica no registro de acesso.
CLIENTE_DESISTIU = 499


@asynccontextmanager
async def vaga(request: Request, pessoa: Path) -> AsyncIterator[None]:
    """Uma vaga de calculo desta pessoa, ou 503 depois de esperar demais.

    As vagas sao do aplicativo (``app.state.vagas``) e as mesmas do MCP montado
    nele: ver ``fitradeoff_mcp.vagas``.
    """
    try:
        async with request.app.state.vagas.de(pessoa):
            # O servidor nao cancela um pedido quando o navegador desiste dele.
            # Sem esta checagem, quem recarrega a pagina durante um calculo lento
            # deixa pedidos abandonados na propria fila, que calculam para
            # ninguem -- e o pedido novo espera atras deles.
            if await request.is_disconnected():
                raise HTTPException(
                    CLIENTE_DESISTIU, "O cliente desconectou antes da vez deste pedido."
                )
            yield
    except Cheio as exc:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS, str(exc), headers={"Retry-After": "5"}
        ) from exc
    except Ocupado as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, str(exc), headers={"Retry-After": "5"}
        ) from exc


async def get_service(
    request: Request,
    caminho: Path = Depends(acervo),
    settings: Settings = Depends(get_settings),
) -> AsyncIterator[DecisionService]:
    """Servico de uma rota que calcula: espera a vez da pessoa antes de rodar.

    Assincrona de proposito. A espera acontece no laco de eventos, antes de a
    rota -- que e sincrona -- ocupar um trabalhador; quem espera nao gasta vaga
    de ninguem. A vaga fica presa ate a resposta sair.
    """
    async with vaga(request, caminho):
        yield montar_servico(caminho, settings)


_T = TypeVar("_T")


def em_vaga(request: Request, pessoa: Path) -> Callable[[Callable[[], _T]], _T]:
    """Roda uma funcao sincrona com uma vaga de calculo, de dentro de uma thread.

    Para o chat. A conversa passa a maior parte do tempo esperando a resposta
    do modelo, que e rede, nao calculo; segurar uma vaga durante tudo isso
    tomaria o lugar de quem de fato calcula. Aqui a vaga e pedida em volta de
    cada ferramenta, e so dela. A thread da conversa espera; o calculo roda num
    trabalhador proprio.
    """

    def rodar(funcao: Callable[[], _T]) -> _T:
        async def com_vaga() -> _T:
            async with vaga(request, pessoa):
                return await run_in_threadpool(funcao)

        return anyio.from_thread.run(com_vaga)

    return rodar


def get_service_leve(
    caminho: Path = Depends(acervo), settings: Settings = Depends(get_settings)
) -> DecisionService:
    """Servico das rotas que nao calculam: listar, abrir, criar, favoritar.

    Fora da fila para que continuem respondendo na hora mesmo com a pessoa
    calculando. A lista de quem usa isto e fechada num teste: uma rota nova
    entra na fila por padrao, e sair dela e decisao explicita.
    """
    return montar_servico(caminho, settings)


def conferir_teto(caminho: Path, settings: Settings, service: DecisionService) -> None:
    """Recusa criar decisao num acervo de pessoa que ja chegou ao teto.

    Com arquivos, conta os ``*.json`` do diretorio sem abrir nenhum. Com banco
    o diretorio fica vazio -- ele so diz de quem sao as linhas --, entao a
    contagem vem do repositorio. Ver ``fitradeoff_mcp.teto``.
    """
    teto.conferir(
        caminho,
        settings.max_decisoes_por_pessoa,
        contar=(lambda: len(service.list())) if settings.database_url else None,
    )


#: Servico de uma rota que calcula. ``scope="function"``: a vaga e devolvida
#: quando a rota termina, e nao depois de a resposta chegar ao cliente -- um
#: cliente lento baixando a exportacao nao segura vaga de calculo.
CALCULO: Any = Depends(get_service, scope="function")
#: Servico de uma rota que nao calcula. Ver ``get_service_leve``.
LEVE: Any = Depends(get_service_leve)


def translate(exc: Exception) -> HTTPException:
    """Traduz falha do motor para o codigo HTTP correspondente.

    Um lugar so: se cada rota decidisse por conta propria, a mesma falha sairia
    como 400 numa e 500 noutra.

    Limitacao conhecida: ``ValueError``, ``KeyError``, ``IndexError`` e
    ``TypeError`` genericos viram 400 com o texto da excecao. Um defeito de
    programacao no motor sai entao como erro do cliente, com detalhe interno, em
    vez de 500 no registro. Estreitar para as excecoes de dominio pede antes que
    o dominio pare de sinalizar entrada invalida com ``ValueError`` -- hoje e
    assim que ``Problem`` e ``Criterion`` recusam dados ruins.
    """
    if isinstance(exc, RecordNotFound):
        return HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    if isinstance(exc, StorageUnavailable):
        return HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, str(exc), headers={"Retry-After": "5"}
        )
    if isinstance(exc, ConcurrentModification):
        # 409 e nao 500: nada quebrou, outra janela chegou primeiro. A tela
        # rele a decisao e mostra o que mudou.
        return HTTPException(status.HTTP_409_CONFLICT, str(exc))
    if isinstance(exc, teto.AcervoCheio):
        # Antes do LimitExceeded, de quem e filho: 413 diria que o PEDIDO e
        # grande demais, e o que esta cheio e o acervo. 409, e nao 429: esperar
        # e tentar de novo nao resolve.
        return HTTPException(status.HTTP_409_CONFLICT, str(exc))
    if isinstance(exc, LimitExceeded):
        return HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, str(exc))
    if isinstance(exc, (InvalidRequest, UnknownProblematic)):
        return HTTPException(status.HTTP_409_CONFLICT, str(exc))
    if isinstance(exc, InfeasibleWeightSpace):
        return HTTPException(status.HTTP_409_CONFLICT, str(exc))
    if isinstance(exc, (ValueError, KeyError, IndexError, TypeError)):
        return HTTPException(status.HTTP_400_BAD_REQUEST, str(exc).strip("'"))
    raise exc
