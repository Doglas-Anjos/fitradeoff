"""Rota do chat de decisoes."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fitradeoff import DecisionService

from ..agent import DecisionAgent
from ..config import Settings
from ..deps import LEVE, acervo, em_vaga, get_settings
from ..schemas import ChatIn

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", summary="Conversa com o agente de decisao")
def conversar(
    dados: ChatIn,
    request: Request,
    settings: Settings = Depends(get_settings),
    pasta: Path = Depends(acervo),
    # Fora da fila como um todo: a conversa espera o modelo quase o tempo
    # inteiro. A vaga e pedida em volta de cada ferramenta (``em_vaga``).
    service: DecisionService = LEVE,
):
    if not settings.chat_enabled:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "O chat exige a variavel de ambiente ANTHROPIC_API_KEY. A tela de "
            "decisao classica funciona sem ela.",
        )

    agente = DecisionAgent(
        service=service,
        api_key=settings.anthropic_api_key,
        model=settings.chat_model,
        em_vaga=em_vaga(request, pasta),
    )
    turno = agente.conversar(
        mensagens=[{"role": m.papel, "content": m.texto} for m in dados.mensagens],
        decisao_id=dados.decisao_id,
    )
    return {
        "resposta": turno.resposta,
        "decisao_id": turno.decisao_id,
        "ferramentas": [f["ferramenta"] for f in turno.ferramentas],
    }
