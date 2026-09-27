"""Dependencias da API.

A composicao continua sendo do motor (``build_container``). A API decide duas
coisas de montagem -- onde ficam os dados e qual adaptador de programacao linear
resolve os LPs -- e injeta o servico nas rotas. Nenhuma regra de decisao mora
aqui: as duas escolhas sao de infraestrutura, e nenhuma delas muda resultado.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from fastapi import Depends, HTTPException, Request, status
from fitradeoff import DecisionService, build_container
from fitradeoff.application import LimitExceeded
from fitradeoff.application.service import InvalidRequest
from fitradeoff.problematics.registry import UnknownProblematic
from fitradeoff.repositories import RecordNotFound
from fitradeoff.solvers import HighsLinearSolver
from fitradeoff.solvers.base import InfeasibleWeightSpace

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


def get_service(caminho: Path = Depends(acervo)) -> DecisionService:
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
    return DecisionService(
        build_container(storage=caminho, solver=HighsLinearSolver())
    )


def translate(exc: Exception) -> HTTPException:
    """Traduz falha do motor para o codigo HTTP correspondente.

    Um lugar so: se cada rota decidisse por conta propria, a mesma falha sairia
    como 400 numa e 500 noutra.
    """
    if isinstance(exc, RecordNotFound):
        return HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    if isinstance(exc, LimitExceeded):
        return HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, str(exc))
    if isinstance(exc, (InvalidRequest, UnknownProblematic)):
        return HTTPException(status.HTTP_409_CONFLICT, str(exc))
    if isinstance(exc, InfeasibleWeightSpace):
        return HTTPException(status.HTTP_409_CONFLICT, str(exc))
    if isinstance(exc, (ValueError, KeyError, IndexError, TypeError)):
        return HTTPException(status.HTTP_400_BAD_REQUEST, str(exc).strip("'"))
    raise exc
