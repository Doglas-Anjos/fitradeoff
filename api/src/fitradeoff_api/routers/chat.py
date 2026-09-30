"""Rota do chat de decisoes."""

from __future__ import annotations

import contextlib
import logging
import threading
from collections.abc import Iterator
from pathlib import Path

import anthropic
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fitradeoff import DecisionService

from ..agent import DecisionAgent
from ..config import Settings
from ..deps import LEVE, acervo, conferir_teto, em_vaga, get_settings
from ..schemas import ChatIn

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["chat"])


class ConversasCheias(Exception):
    """Nao ha vaga de conversa agora, para esta pessoa ou no processo."""


class Conversas:
    """Quantas conversas de chat rodam ao mesmo tempo, por pessoa e no total.

    Nao e a fila de calculo (``fitradeoff_mcp.vagas``): a conversa passa quase
    todo o tempo esperando o modelo, e quem espera nao deve ocupar vaga de
    calculo. Mas ela segura um trabalhador do servidor -- a rota e sincrona --
    durante ate doze idas ao modelo, e sem teto meia duzia de abas abertas
    tomaria os trabalhadores de todo mundo. Por isso aqui nao se espera: sem
    vaga, recusa na hora, e a tela tenta de novo.

    Trava de thread, e nao de laco de eventos, porque quem entra e sai e a
    propria rota, que roda num trabalhador.
    """

    def __init__(self, por_pessoa: int, no_total: int) -> None:
        self.por_pessoa = max(1, por_pessoa)
        self.no_total = max(1, no_total)
        self._trava = threading.Lock()
        self._de: dict[Path, int] = {}
        self._total = 0

    @contextlib.contextmanager
    def de(self, pessoa: Path) -> Iterator[None]:
        """Uma vaga de conversa desta pessoa, ou ``ConversasCheias`` na hora."""
        with self._trava:
            if self._de.get(pessoa, 0) >= self.por_pessoa:
                raise ConversasCheias(
                    "Ja ha uma conversa em andamento nesta conta. Espere a "
                    "resposta dela antes de mandar outra mensagem."
                )
            if self._total >= self.no_total:
                raise ConversasCheias(
                    "O chat esta ocupado com outras conversas. Tente de novo "
                    "em alguns segundos."
                )
            self._de[pessoa] = self._de.get(pessoa, 0) + 1
            self._total += 1
        try:
            yield
        finally:
            with self._trava:
                self._total -= 1
                restantes = self._de[pessoa] - 1
                if restantes:
                    self._de[pessoa] = restantes
                else:
                    del self._de[pessoa]


def _falha_do_modelo(exc: anthropic.APIError) -> HTTPException:
    """502 ou 503 com mensagem generica; o detalhe vai para o registro.

    Limite de uso (429), sobrecarga (529), falha do servico (5xx) e rede sao
    passageiros: 503 com ``Retry-After``. O resto -- pedido recusado pela API,
    chave invalida -- e defeito entre nos e o provedor: 502. Nenhum dos dois e
    500, porque nada quebrou aqui, e a mensagem do SDK nao vai ao cliente:
    pode citar a conta, o modelo ou a chave.
    """
    codigo = getattr(exc, "status_code", None)
    logger.warning(
        "chat: falha ao chamar o modelo (%s, status %s)", type(exc).__name__, codigo
    )
    passageira = isinstance(exc, anthropic.APIConnectionError) or (
        isinstance(codigo, int) and (codigo == 429 or codigo >= 500)
    )
    if passageira:
        return HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "O modelo de linguagem esta indisponivel no momento. Tente de novo "
            "em alguns instantes; a decisao nao foi alterada por esta mensagem.",
            headers={"Retry-After": "10"},
        )
    return HTTPException(
        status.HTTP_502_BAD_GATEWAY,
        "O modelo de linguagem recusou o pedido. A tela de decisao classica "
        "continua funcionando.",
    )


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
    """Um turno de conversa com o agente de decisao.

    O agente conduz a decisao pelas mesmas operacoes da API, e pede vaga de calculo so
    em volta de cada ferramenta. A conversa inteira ocupa uma vaga de conversa
    (``Conversas``): no maximo ``chat_por_pessoa`` por pessoa e ``chat_no_total``
    no processo.

    Erros: 503 chat desligado (falta ANTHROPIC_API_KEY) ou modelo indisponivel
    (limite de uso, sobrecarga, rede); 502 modelo recusou o pedido; 429 conversa
    ja em andamento para esta pessoa, ou chat cheio; 422 corpo invalido ou longo
    demais.
    """
    if not settings.chat_enabled:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "O chat exige a variavel de ambiente ANTHROPIC_API_KEY. A tela de "
            "decisao classica funciona sem ela.",
        )

    try:
        with request.app.state.conversas.de(pasta):
            agente = DecisionAgent(
                service=service,
                api_key=settings.anthropic_api_key,
                model=settings.chat_model,
                em_vaga=em_vaga(request, pasta),
                antes_de_criar=lambda: conferir_teto(pasta, settings, service),
            )
            turno = agente.conversar(
                mensagens=[{"role": m.papel, "content": m.texto} for m in dados.mensagens],
                decisao_id=dados.decisao_id,
            )
    except ConversasCheias as exc:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS, str(exc), headers={"Retry-After": "5"}
        ) from exc
    except anthropic.APIError as exc:
        raise _falha_do_modelo(exc) from exc
    return {
        "resposta": turno.resposta,
        "decisao_id": turno.decisao_id,
        "ferramentas": [f["ferramenta"] for f in turno.ferramentas],
    }
