"""Metricas para o Prometheus da FasorX.

    FITRADEOFF_METRICAS_PORTA=9464

Sem a variavel, nada sobe -- a maquina do decisor nao precisa de coletor. Com
ela, uma porta A PARTE serve ``/metrics``, e nao uma rota do aplicativo. A
diferenca decide quem alcanca os numeros: uma rota de ``/api`` passaria pelo
rewrite do Next e pelo Caddy, e estaria na internet; a porta a parte nao e
publicada, e so quem esta na rede do Docker -- o Prometheus -- chega nela.

O que se mede, e o que de proposito nao se mede:

* **Requisicoes por rota, metodo e codigo**, e quanto demoraram. A rota e o
  MOLDE (``/api/decisoes/{decisao_id}``), nunca o caminho: o caminho traz
  identificador de decisao, e em ``/mcp/<chave>`` traz a propria chave. Molde
  tambem mantem o numero de series fechado -- uma serie por caminho distinto
  cresceria sem fim com cada decisao criada.
* **Ferramentas do MCP**, por nome e resultado. Pela rota, toda conversa com o
  assistente e um POST em ``/mcp``; o que ela fez so aparece aqui.
* **Vagas de calculo**: quantos rodam, quantos esperam. Fila crescendo e o
  sinal de que falta vaga antes de alguem reclamar de lentidao.

Nenhum rotulo carrega pessoa, decisao ou chave.
"""

from __future__ import annotations

import time
from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager

from fitradeoff_mcp import server as servidor_mcp
from fitradeoff_mcp.remoto import CAMINHO as CAMINHO_MCP
from fitradeoff_mcp.vagas import Vagas
from prometheus_client import REGISTRY, Counter, Gauge, Histogram, start_http_server
from prometheus_client.core import GaugeMetricFamily
from prometheus_client.registry import Collector
from starlette.types import ASGIApp, Message, Receive, Scope, Send

# Do instantaneo ao calculo mais pesado: uma analise de sensibilidade de
# carteira passa de um minuto.
FAIXAS = (0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 120)

REQUISICOES = Counter(
    "fitradeoff_requisicoes_total",
    "Requisicoes HTTP atendidas, por rota, metodo e codigo.",
    ["rota", "metodo", "status"],
)
DURACAO = Histogram(
    "fitradeoff_requisicao_duracao_segundos",
    "Tempo de resposta, por rota e metodo.",
    ["rota", "metodo"],
    buckets=FAIXAS,
)
EM_ANDAMENTO = Gauge(
    "fitradeoff_requisicoes_em_andamento",
    "Requisicoes HTTP sendo atendidas agora.",
)
FERRAMENTAS = Counter(
    "fitradeoff_ferramentas_total",
    "Chamadas de ferramenta do MCP, por ferramenta e resultado (ok, erro, falha).",
    ["ferramenta", "resultado"],
)
DURACAO_FERRAMENTA = Histogram(
    "fitradeoff_ferramenta_duracao_segundos",
    "Tempo de cada ferramenta do MCP.",
    ["ferramenta"],
    buckets=FAIXAS,
)


#: O metodo HTTP e texto livre do cliente: `XYZ1`, `XYZ2`... cada um viraria uma
#: serie nova, aqui e no Prometheus da FasorX, que e dividido com as outras
#: aplicacoes. Fora desta lista, conta como `outro`.
METODOS = frozenset({"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"})


def _metodo(scope: Scope) -> str:
    metodo = scope.get("method", "")
    return metodo if metodo in METODOS else "outro"


def _rota(scope: Scope) -> str:
    """O molde da rota, ou um nome fixo. Nunca o caminho como veio."""
    caminho = getattr(scope.get("route"), "path", None)
    if caminho:
        return caminho
    bruto: str = scope.get("path", "")
    # Recusada antes do roteamento -- chave invalida chega aqui com a chave
    # ainda no caminho.
    if bruto == CAMINHO_MCP or bruto.startswith(CAMINHO_MCP + "/"):
        return CAMINHO_MCP
    if bruto in ("/saude", "/api/saude"):
        return bruto
    return "outra"


class MedirRequisicoes:
    """Conta e cronometra cada requisicao HTTP.

    Por fora de tudo, para ver tambem o que e recusado antes das rotas: o 401
    da autenticacao do MCP e o 413 do teto de corpo.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        status = 500  # se nada responder, e uma excecao que escapou
        inicio = time.perf_counter()

        async def anotando(mensagem: Message) -> None:
            nonlocal status
            if mensagem["type"] == "http.response.start":
                status = mensagem["status"]
            await send(mensagem)

        EM_ANDAMENTO.inc()
        try:
            await self.app(scope, receive, anotando)
        finally:
            EM_ANDAMENTO.dec()
            rota, metodo = _rota(scope), _metodo(scope)
            REQUISICOES.labels(rota, metodo, str(status)).inc()
            DURACAO.labels(rota, metodo).observe(time.perf_counter() - inicio)


def _ferramenta(nome: str, resultado: str, segundos: float) -> None:
    FERRAMENTAS.labels(nome, resultado).inc()
    DURACAO_FERRAMENTA.labels(nome).observe(segundos)


class _ColetorDasVagas(Collector):
    """Le as vagas na hora da coleta, em vez de atualizar a cada pedido."""

    def __init__(self) -> None:
        self.vagas: Vagas | None = None

    def collect(self) -> Iterator[GaugeMetricFamily]:
        vagas = self.vagas
        if vagas is None:
            return
        yield GaugeMetricFamily(
            "fitradeoff_calculos_rodando", "Calculos ocupando vaga agora.",
            value=vagas.calculando,
        )
        yield GaugeMetricFamily(
            "fitradeoff_calculos_esperando", "Pedidos de calculo na fila, sem vaga.",
            value=vagas.esperando,
        )
        yield GaugeMetricFamily(
            "fitradeoff_vagas_total", "Vagas de calculo do processo.",
            value=vagas.no_total,
        )
        yield GaugeMetricFamily(
            "fitradeoff_pessoas_calculando", "Pessoas com calculo rodando ou na fila.",
            value=vagas.pessoas_ativas,
        )


_vagas = _ColetorDasVagas()
REGISTRY.register(_vagas)


def ligar(app, vagas: Vagas) -> None:
    """Mede este aplicativo. Chamar DEPOIS de montar o MCP.

    Depois, porque cada ``add_middleware`` embrulha os anteriores: por ultimo,
    a medicao fica por fora da autenticacao do MCP e ve os 401 dela.
    """
    app.add_middleware(MedirRequisicoes)
    _vagas.vagas = vagas
    if _ferramenta not in servidor_mcp.observadores:
        servidor_mcp.observadores.append(_ferramenta)


@asynccontextmanager
async def servir(porta: int | None) -> AsyncIterator[None]:
    """A porta de ``/metrics`` enquanto o aplicativo estiver de pe."""
    if not porta:
        yield
        return
    # Todas as interfaces do container: o Prometheus chega pela rede de
    # observabilidade, nao pelo loopback. A porta nao e publicada no hospedeiro.
    servidor, _ = start_http_server(porta, addr="0.0.0.0")
    try:
        yield
    finally:
        servidor.shutdown()
        servidor.server_close()
