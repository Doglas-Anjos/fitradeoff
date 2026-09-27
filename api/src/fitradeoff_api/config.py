"""Configuracao da API, por variavel de ambiente."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


def _origins() -> list[str]:
    """Origens permitidas para o front em desenvolvimento."""
    bruto = os.environ.get("FITRADEOFF_CORS")
    if bruto:
        return [o.strip() for o in bruto.split(",") if o.strip()]
    return ["http://localhost:3000", "http://127.0.0.1:3000"]


def _ligado(nome: str, padrao: bool) -> bool:
    """Le uma chave liga-desliga do ambiente.

    Aceita as escritas que alguem usaria sem consultar documentacao. O que nao
    for reconhecido cai no padrao, em vez de virar `False` em silencio: um
    "sim" escrito em portugues nao pode desligar uma protecao por engano.
    """
    bruto = os.environ.get(nome)
    if bruto is None:
        return padrao
    limpo = bruto.strip().lower()
    if limpo in {"1", "true", "sim", "yes", "on"}:
        return True
    if limpo in {"0", "false", "nao", "não", "no", "off"}:
        return False
    return padrao


def _mcp_hosts() -> list[str]:
    """Dominios por onde o MCP remoto e alcancado de fora desta maquina.

    Declarar isto e o que diz "este servidor esta publicado". Duas coisas
    dependem da declaracao: a protecao contra DNS rebinding do SDK, que sem o
    dominio na lista recusa todo pedido vindo por ele com 421, e a exigencia de
    um token de administracao para emitir chaves.
    """
    bruto = os.environ.get("FITRADEOFF_MCP_HOSTS")
    if not bruto:
        return []
    return [h.strip() for h in bruto.split(",") if h.strip()]


@dataclass(frozen=True)
class Settings:
    """Ajustes da API.

    Sem autenticacao por enquanto: a plataforma roda local, e qualquer pessoa
    com acesso a porta ve todas as decisoes. Quando entrar login, o isolamento
    vem de um repositorio com escopo de dono -- a porta ``DecisionRepository``
    ja permite isso sem mexer em regra de negocio.
    """

    storage: Path = field(
        default_factory=lambda: Path(
            os.environ.get("FITRADEOFF_DATA", Path.home() / ".fitradeoff" / "decisoes")
        ).expanduser().resolve()
    )
    cors_origins: list[str] = field(default_factory=_origins)
    anthropic_api_key: str | None = field(
        default_factory=lambda: os.environ.get("ANTHROPIC_API_KEY")
    )
    chat_model: str = field(
        default_factory=lambda: os.environ.get("FITRADEOFF_CHAT_MODEL", "claude-sonnet-5")
    )
    mcp_url: str = field(
        default_factory=lambda: os.environ.get(
            "FITRADEOFF_MCP_URL", "http://127.0.0.1:8000/mcp"
        ).rstrip("/")
    )
    mcp_hosts: list[str] = field(default_factory=_mcp_hosts)
    mcp_json: bool = field(
        default_factory=lambda: _ligado("FITRADEOFF_MCP_JSON", False)
    )
    """Responder num JSON so, em vez de um fluxo de eventos.

    O padrao e o fluxo, que e o que o transporte usa por natureza e o que
    permite mandar sinal de vida numa ferramenta demorada. Trocar por JSON faz
    sentido quando ha um encaminhamento simples na frente: um proxy que acumule
    a resposta antes de repassar faz a ferramenta parecer travada, sem erro
    nenhum, e com JSON nao ha o que acumular.

    Nao se perde nada aqui: a troca custaria as perguntas do servidor de volta
    ao cliente, e nenhuma das catorze ferramentas faz isso.
    """
    aceitar_chaves_do_cofre: bool = field(
        default_factory=lambda: _ligado("FITRADEOFF_ACEITAR_CHAVES_DO_COFRE", True)
    )
    """Se as chaves emitidas na tela valem neste servidor.

    Num servidor atras da aplicacao principal, ninguem precisa delas: todo mundo
    entra pela aplicacao, que assina. Desligar aqui remove de vez o vetor da
    chave vazada em log de proxy ou em historico de navegador, sem tirar nada do
    servidor local, onde a tela vive.

    O preco e que um cliente que fale direto com este servidor -- o Claude Code
    do seu notebook, por exemplo -- deixa de entrar por ele.
    """
    admin_token: str | None = field(
        default_factory=lambda: os.environ.get("FITRADEOFF_ADMIN_TOKEN") or None
    )

    # --- asserção de identidade vinda da aplicacao da frente -------------------
    #
    # Quando o MCP fica atras de outra aplicacao, quem diz de quem e a chamada e
    # ela, por um token assinado. Nada disso vale sem uma das duas chaves de
    # verificacao: sem elas, nenhum token e aceito, e so as chaves do cofre
    # entram. Fechar por falta de configuracao e proposital -- um verificador
    # que aceitasse qualquer assinatura seria pior do que nao existir.
    jwt_issuer: str | None = field(
        default_factory=lambda: os.environ.get("FITRADEOFF_JWT_ISSUER") or None
    )
    jwt_audience: str | None = field(
        default_factory=lambda: os.environ.get("FITRADEOFF_JWT_AUDIENCE") or None
    )
    jwt_jwks_url: str | None = field(
        default_factory=lambda: os.environ.get("FITRADEOFF_JWT_JWKS_URL") or None
    )
    jwt_secret: str | None = field(
        default_factory=lambda: os.environ.get("FITRADEOFF_JWT_SECRET") or None
    )
    jwt_max_validade: int = field(
        default_factory=lambda: int(
            os.environ.get("FITRADEOFF_JWT_MAX_VALIDADE", "900")
        )
    )
    """Por quantos segundos, no maximo, um token pode continuar valendo.

    Nao ha lista de revogacao: um token vazado vale ate expirar, e ninguem aqui
    consegue cancela-lo antes disso. O unico controle que sobra e a janela, e
    ela e nossa -- de nada adiantaria pedir a aplicacao da frente que emitisse
    tokens curtos e aceitar os longos assim mesmo.

    Quinze minutos e folgado para o uso real, em que a aplicacao da frente
    assina a cada requisicao que encaminha. Se a integracao emitir tokens mais
    longos que isto, eles sao recusados -- e o motivo aparece no registro.
    """

    @property
    def chat_enabled(self) -> bool:
        return bool(self.anthropic_api_key)

    @property
    def jwt_configurado(self) -> bool:
        """Se ha como verificar a assinatura de quem diz falar pelo usuario."""
        return bool(self.jwt_jwks_url or self.jwt_secret)

    @property
    def mcp_publicado(self) -> bool:
        """Se o MCP remoto e alcancavel de fora desta maquina.

        Nao e deteccao, e declaracao: ninguem descobre de dentro do processo se
        um tunel foi aberto na frente dele. Quem publica declara, e a declaracao
        e o que fecha a emissao de chaves atras de um token.
        """
        return bool(self.mcp_hosts)


def load_settings() -> Settings:
    return Settings()
