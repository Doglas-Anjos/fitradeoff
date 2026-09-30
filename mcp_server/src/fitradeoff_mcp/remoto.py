"""O mesmo servidor MCP, por HTTP, para clientes que nao rodam nesta maquina.

Em stdio o cliente lanca o processo e o processo e dele: nao ha chave, porque
nao ha fronteira. Por HTTP a fronteira existe -- qualquer um que alcance a porta
fala com o servidor -- e ela e guardada por uma chave portadora.

Duas formas de apresentar a chave, porque os clientes diferem:

``Authorization: Bearer <chave>``
    A forma correta, e a que o Claude Code, o Cursor e o VS Code permitem, por
    escreverem cabecalho no arquivo de configuracao.

``.../mcp/<chave>`` no proprio caminho
    O painel de conectores do claude.ai pede uma URL e nada mais: nao ha campo
    de cabecalho. Sem esta forma, o caso de uso que motivou o modo remoto --
    chamar o metodo de dentro do Claude na web -- simplesmente nao existiria.
    Em troca, a chave aparece em historico de navegador e em log de servidor,
    o que faz dela uma chave de menor confianca: e por isso que a tela emite uma
    chave por cliente, e que revogar uma nao derruba as outras.

Quem decide se a chave vale, e o que ela abre, e o ``Resolvedor`` que o
chamador injeta. Este modulo nao sabe onde chaves sao guardadas, nem como sao
criadas: continua sendo casca de protocolo, como o resto do pacote.
"""

from __future__ import annotations

import contextlib
from collections.abc import AsyncIterator, Callable
from pathlib import Path
from typing import Any

from mcp.server.context import CallNext, HandlerResult, ServerRequestContext
from mcp.server.transport_security import TransportSecuritySettings
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route
from starlette.types import ASGIApp, Receive, Scope, Send

from .server import escopo_da_chamada, server
from .vagas import Vagas

Resolvedor = Callable[[str], Path | None]
"""Chave apresentada -> diretorio de dados que ela abre, ou ``None`` se nao vale.

A assinatura e a fronteira entre protocolo e politica. Hoje o resolvedor que a
API injeta (``fitradeoff_api.identidade.resolver``) devolve um acervo por
pessoa: a chave do cofre abre o acervo do dono dela, e o JWT da aplicacao da
frente abre o acervo de quem ele identifica. Essa decisao mora toda no
resolvedor; nada aqui nem nas dezenove ferramentas sabe de quem e o diretorio.

E chamado de forma sincrona, de dentro do middleware assincrono: ver a
limitacao em ``Autenticacao``.
"""

CAMINHO = "/mcp"
"""Onde o endpoint fica. O mesmo valor entra na URL que a tela manda copiar."""

CAMPO_NO_ESCOPO = "fitradeoff_escopo"
"""Onde a autenticacao deixa o diretorio resolvido, no escopo ASGI.

Escopo ASGI, e nao variavel de contexto, porque o transporte streamable-HTTP
executa a chamada num task group que nao e o da requisicao: um contexto
preenchido aqui nao chegaria a ferramenta. O escopo chega, porque o transporte
carrega a propria requisicao HTTP junto da mensagem.
"""

CAMPO_DAS_VAGAS = "fitradeoff_vagas"
"""Onde a autenticacao deixa as vagas de calculo do aplicativo, pelo mesmo motivo.

As vagas sao do aplicativo, e nao do modulo: a API e o MCP montados juntos
dividem as mesmas, e cada pessoa segura no maximo duas somando os dois lados.
"""


class Autenticacao:
    """Recusa, no nivel HTTP, quem nao apresentou chave valida.

    Antes de virar mensagem MCP, de proposito: um cliente descobre que precisa
    se autenticar pelo 401 e pelo ``WWW-Authenticate``, nao por um erro de
    ferramenta. Recusar aqui tambem mantem o servidor MCP ignorante de chaves.

    Veste o aplicativo inteiro e guarda um prefixo so, porque e ela quem reescreve
    o caminho quando a chave vem dentro dele -- e isso precisa acontecer antes do
    roteamento, ou a rota do MCP nao reconheceria ``/mcp/<chave>``. Fora do
    prefixo, nao toca em nada: as rotas da API seguem como estavam.

    Limitacao conhecida: o ``Resolvedor`` e sincrono e roda direto no laco de
    eventos, dentro de ``__call__``. O que a API injeta le o cofre do disco (e
    pode regrava-lo ao marcar uso) ou, com JWT, pode buscar o JWKS pela rede --
    com teto de dez segundos. Enquanto isso, o processo inteiro para de atender,
    nao so esta requisicao.
    """

    def __init__(
        self,
        seguinte: ASGIApp,
        resolvedor: Resolvedor,
        *,
        caminho: str = CAMINHO,
        vagas: Vagas | None = None,
    ) -> None:
        self.seguinte = seguinte
        self.resolvedor = resolvedor
        self.caminho = caminho
        # Sem vagas dadas, o aplicativo ganha as proprias: nenhum MCP montado
        # fica sem limite por esquecimento de quem montou.
        self.vagas = vagas or Vagas()

    def _minha(self, scope: Scope) -> bool:
        caminho: str = scope.get("path", "")
        return caminho == self.caminho or caminho.startswith(self.caminho + "/")

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or not self._minha(scope):
            await self.seguinte(scope, receive, send)
            return

        chave, caminho = self._apresentada(scope)
        if not chave:
            await self._recusar(
                scope,
                receive,
                send,
                "Apresente a chave: cabecalho 'Authorization: Bearer <chave>', "
                "ou a chave no fim da URL. Gere uma na tela de chaves.",
            )
            return

        escopo = self.resolvedor(chave)
        if escopo is None:
            await self._recusar(
                scope, receive, send, "Chave invalida ou revogada."
            )
            return

        # No lugar, e nao numa copia. O escopo HTTP e criado pelo servidor a cada
        # requisicao, entao nao ha vizinha para contaminar -- e ha um motivo
        # forte para corrigi-lo aqui: o registro de acesso do uvicorn e escrito
        # depois da resposta, lendo este mesmo dicionario. Numa copia, o
        # roteamento via `/mcp` enquanto o log gravava `/mcp/<chave>`, e a chave
        # que a URL carrega -- justamente a de menor confianca -- ficava escrita
        # no log do servidor a cada chamada.
        scope[CAMPO_NO_ESCOPO] = escopo
        scope[CAMPO_DAS_VAGAS] = self.vagas
        scope["path"] = caminho
        # `raw_path` e a versao em bytes que alguns roteadores preferem; deixa-la
        # com a chave dentro faria o roteamento discordar do caminho reescrito,
        # e devolveria a chave ao log por outro caminho.
        if scope.get("raw_path") is not None:
            scope["raw_path"] = caminho.encode("latin-1")
        await self.seguinte(scope, receive, send)

    def _apresentada(self, scope: Scope) -> tuple[str | None, str]:
        """A chave e o caminho sem ela.

        O caminho volta normalizado sempre que o segmento extra e uma chave --
        inclusive quando a chave que vale veio do cabecalho. Deixar o segmento
        no caminho faria a rota do MCP nao casar, e o cliente receberia um 404
        no lugar de uma resposta.

        O cabecalho tem precedencia: quando as duas formas aparecem, a que nao
        vaza em log e a que vale.
        """
        caminho: str = scope.get("path", "")
        do_caminho: str | None = None
        if caminho.startswith(self.caminho + "/"):
            resto = caminho[len(self.caminho) + 1 :].strip("/")
            if not resto:
                # `/mcp/` e a mesma rota com uma barra a mais. Sem isto o
                # roteador responde 307 para `/mcp`, e a documentacao do ChatGPT
                # manda cadastrar a URL exatamente assim, com a barra no fim: o
                # cliente que nao seguir o redirecionamento nao conecta, e o que
                # seguir paga uma ida e volta em cada chamada.
                caminho = self.caminho
            elif "/" not in resto:
                # Uma barra no meio nao e chave: e caminho que este servidor nao
                # serve, e aceita-lo mandaria ao roteador um caminho que ele nao
                # reconhece.
                do_caminho = resto
                caminho = self.caminho

        for nome, valor in scope.get("headers", []):
            if nome.lower() != b"authorization":
                continue
            texto = valor.decode("latin-1").strip()
            esquema, _, resto = texto.partition(" ")
            if esquema.lower() == "bearer" and resto.strip():
                return resto.strip(), caminho

        return do_caminho, caminho

    async def _recusar(
        self, scope: Scope, receive: Receive, send: Send, mensagem: str
    ) -> None:
        resposta = JSONResponse(
            {"erro": mensagem},
            status_code=401,
            headers={"WWW-Authenticate": 'Bearer realm="fitradeoff"'},
        )
        await resposta(scope, receive, send)


class EscopoDaChave:
    """Liga a chave desta requisicao ao diretorio de dados que as ferramentas usam.

    Roda como middleware do servidor MCP, nao do ASGI, por um motivo de
    execucao: e aqui que estamos no mesmo task que vai executar a ferramenta,
    entao e aqui que preencher ``escopo_da_chamada`` funciona.
    """

    async def __call__(
        self, ctx: ServerRequestContext[Any, Any], call_next: CallNext
    ) -> HandlerResult:
        requisicao = ctx.request
        if requisicao is None:
            # stdio: o processo e do usuario, e o diretorio vem do ambiente.
            return await call_next(ctx)

        escopo = requisicao.scope.get(CAMPO_NO_ESCOPO)
        if escopo is None:
            # Chegou requisicao HTTP sem passar pela autenticacao: e defeito de
            # montagem, nao entrada malformada. Falhar alto e melhor do que
            # atender no diretorio do ambiente, que nao e de ninguem em especial.
            raise RuntimeError(
                "Requisicao HTTP sem escopo resolvido: o app do MCP remoto "
                "precisa ser montado com `remoto.criar_app`, que autentica."
            )

        marca = escopo_da_chamada.set(escopo)
        try:
            vagas = requisicao.scope.get(CAMPO_DAS_VAGAS)
            # So a execucao de ferramenta calcula. Iniciar a conversa ou listar as
            # ferramentas nao pode ficar esperando atras dos calculos da pessoa.
            if vagas is None or ctx.method != "tools/call":
                return await call_next(ctx)
            # `Ocupado` segue adiante e o SDK o devolve como erro da chamada.
            async with vagas.de(escopo):
                return await call_next(ctx)
        finally:
            escopo_da_chamada.reset(marca)


def _registrar_escopo() -> None:
    """Instala ``EscopoDaChave`` uma vez, ainda que o app seja criado de novo.

    O servidor e um objeto de modulo: registrar o middleware a cada chamada o
    empilharia, e cada copia entraria e sairia do mesmo contexto sem precisar.
    """
    if not any(isinstance(m, EscopoDaChave) for m in server.middleware):
        server.middleware.append(EscopoDaChave())


def criar_app(
    resolvedor: Resolvedor,
    *,
    caminho: str = CAMINHO,
    hosts_publicos: list[str] | None = None,
    respostas_em_json: bool = False,
) -> Starlette:
    """O endpoint MCP autenticado, pronto para montar num servidor ASGI.

    ``hosts_publicos`` existe por causa da protecao contra DNS rebinding, que o
    SDK liga sozinho quando o servidor parece local: sem declarar o dominio
    publico, todo pedido que chega por ele e recusado com 421, e o sintoma nao
    lembra em nada a causa. Vazia, a protecao continua valendo so para
    ``localhost`` -- o padrao certo para quem ainda nao publicou.

    O modo e sem sessao (``stateless_http``): cada requisicao se explica por
    inteiro, entao reiniciar a API nao derruba a conversa em andamento do
    cliente, e nao ha estado de sessao para dois processos disputarem.

    ``respostas_em_json`` troca o fluxo de eventos por um JSON so. O fluxo e o
    padrao, e e o que permite dar sinal de vida numa ferramenta demorada; o JSON
    serve quando ha um encaminhamento simples na frente, porque um proxy que
    acumule a resposta antes de repassar faz a ferramenta parecer travada, sem
    erro nenhum. Nenhuma das dezenove ferramentas pergunta de volta ao cliente,
    que e a unica coisa que a troca custaria.
    """
    _registrar_escopo()

    seguranca = None
    if hosts_publicos:
        # Cada dominio entra em duas formas porque a checagem do SDK e literal:
        # o padrao com `:*` so casa Host **com** porta, e o sem porta so casa
        # exato. Um proxy que repassa `dominio:443` seria recusado se
        # declarassemos apenas `dominio` -- e o erro sairia como 421, longe de
        # qualquer pista.
        nomes = [forma for h in hosts_publicos for forma in (h, f"{h}:*")]
        seguranca = TransportSecuritySettings(
            enable_dns_rebinding_protection=True,
            allowed_hosts=[*nomes, "127.0.0.1:*", "localhost:*"],
            allowed_origins=[
                *(f"https://{h}" for h in hosts_publicos),
                "http://127.0.0.1:*",
                "http://localhost:*",
            ],
        )

    return server.streamable_http_app(
        streamable_http_path=caminho,
        stateless_http=True,
        json_response=respostas_em_json,
        transport_security=seguranca,
    )


def montar(
    externo: Starlette,
    resolvedor: Resolvedor,
    *,
    caminho: str = CAMINHO,
    hosts_publicos: list[str] | None = None,
    respostas_em_json: bool = False,
    vagas: Vagas | None = None,
) -> Starlette:
    """Liga o endpoint MCP a um aplicativo que ja existe -- o da API.

    Devolve o app interno, porque quem monta precisa entrar no ciclo de vida
    dele: ``async with ciclo_de_vida(interno)``.

    Rota, e nao ``Mount``: montar por prefixo entregaria ao app interno um
    caminho sem o prefixo, e a rota dele deixaria de casar -- com o agravante de
    ``Mount`` responder um redirecionamento ao caminho sem barra final, o que num
    POST alguns clientes nao seguem.
    """
    interno = criar_app(
        resolvedor,
        caminho=caminho,
        hosts_publicos=hosts_publicos,
        respostas_em_json=respostas_em_json,
    )
    externo.add_middleware(
        Autenticacao, resolvedor=resolvedor, caminho=caminho, vagas=vagas
    )
    # `methods=None` deixa passar GET, POST e DELETE, que e o que o transporte
    # streamable-HTTP usa: canal de eventos, mensagens e encerramento.
    externo.router.routes.append(Route(caminho, endpoint=interno, methods=None))
    return interno


@contextlib.asynccontextmanager
async def ciclo_de_vida(app: Starlette) -> AsyncIterator[None]:
    """Mantem vivo o gerenciador de sessoes do app devolvido por `criar_app`.

    Montado dentro de outro aplicativo, o ciclo de vida do app montado nao roda
    sozinho -- e sem ele o gerenciador nao tem task group, e toda requisicao
    falha. O ciclo de vida vem do proprio app, e nao de `server.session_manager`,
    para ficar amarrado ao gerenciador daquela criacao.
    """
    async with app.router.lifespan_context(app):
        yield
