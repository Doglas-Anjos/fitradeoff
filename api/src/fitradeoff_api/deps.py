"""Dependencias da API.

A composicao continua sendo do motor (``build_container``). A API so decide
onde ficam os dados e injeta o servico nas rotas -- nenhuma regra de decisao
mora aqui.
"""

from __future__ import annotations

from functools import lru_cache

from fastapi import Depends, HTTPException, status
from fitradeoff import DecisionService, build_container
from fitradeoff.application import LimitExceeded
from fitradeoff.application.service import InvalidRequest
from fitradeoff.problematics.registry import UnknownProblematic
from fitradeoff.repositories import RecordNotFound
from fitradeoff.solvers.base import InfeasibleWeightSpace

from .config import Settings, load_settings


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return load_settings()


def get_service(settings: Settings = Depends(get_settings)) -> DecisionService:
    return DecisionService(build_container(storage=settings.storage))


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
