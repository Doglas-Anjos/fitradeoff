"""Quem esta chamando o MCP, e qual acervo isso abre.

Duas maneiras de se identificar, porque sao dois caminhos diferentes ate aqui:

**A chave do cofre** (``fit_...``), emitida na tela. E o cliente do proprio
dono falando direto com o servidor -- o Claude Code na mesma maquina, ou o
Claude na web por um tunel. Abre o acervo do dono da chave: o da pessoa que a
emitiu pela tela, ou o acervo principal se a chave e do dono da plataforma (ver
``chaves.resolver``).

**Um token assinado pela aplicacao da frente.** Quando o MCP fica atras de
outra aplicacao, e ela quem sabe quem esta logado; nos nao temos sessao, nem
cookie, nem como perguntar. Ela assina essa afirmacao, e nos verificamos a
assinatura. Cada pessoa abre o proprio acervo.

O que discrimina os dois e o prefixo, e nao uma tentativa atras da outra: uma
chave do cofre sempre comeca com ``fit_``, um JWT nunca. Sem isso, toda chamada
com token pagaria uma leitura do cofre, e toda chamada com chave pagaria uma
tentativa de verificacao de assinatura.

**A identidade nunca vira caminho.** O diretorio de cada pessoa e o resumo de
``iss`` + ``sub``, nao o ``sub`` em si: um identificador que virasse componente
de caminho traria consigo o problema de ``..`` e o de nomes que o sistema de
arquivos recusa, e ainda deixaria a lista de quem usa a plataforma legivel no
disco de quem olhasse o diretorio.
"""

from __future__ import annotations

import hashlib
import logging
import os
import sys
import time
from collections.abc import Callable
from pathlib import Path

import jwt

from . import chaves as cofre
from .config import Settings

logger = logging.getLogger(__name__)

Resolvedor = Callable[[str], Path | None]

# Folga para relogios que nao batem entre as duas maquinas. Trinta segundos
# cobre o desencontro normal de NTP sem alargar de verdade a validade do token.
FOLGA_DE_RELOGIO = 30


def acervo_de(settings: Settings, emissor: str, pessoa: str) -> Path:
    """O diretorio desta pessoa, ao lado do acervo do dono da plataforma.

    O emissor entra no resumo junto com o identificador: dois sistemas de
    identidade diferentes podem usar o mesmo ``sub`` para pessoas diferentes, e
    sem o emissor as duas cairiam no mesmo acervo.
    """
    marca = hashlib.sha256(f"{emissor}\n{pessoa}".encode("utf-8")).hexdigest()[:32]
    return settings.storage.parent / "pessoas" / marca


def _verificar(settings: Settings, token: str) -> dict | None:
    """Valida a assinatura e devolve as declaracoes, ou ``None``.

    Nunca diz por que recusou. A diferenca entre "assinatura errada" e "expirou"
    e informacao util para quem esta tentando adivinhar, e inutil para o cliente
    legitimo, que so precisa saber que tem de se autenticar de novo. O motivo
    vai para o registro, onde o operador o alcanca.

    O que e sempre conferido: a assinatura, com o algoritmo fixado aqui (RS256
    com JWKS, HS256 com segredo), a presenca de ``exp`` e ``sub``, a validade e o
    teto de ``jwt_max_validade``. O que so e conferido quando configurado:
    ``aud`` apenas com ``jwt_audience`` definido, e ``iss`` apenas com
    ``jwt_issuer`` definido. Sem eles, qualquer token que a chave de verificacao
    aceite vale, de qualquer publico e de qualquer emissor -- o que importa
    quando o mesmo JWKS ou segredo assina tokens para outros servicos. Nao e
    obrigatorio (a decisao e de quem implanta), mas a partida avisa: ver
    ``avisar_configuracao``.

    Limitacao conhecida: sem ``jwt_audience`` e ``jwt_issuer``, um token emitido
    pela mesma chave para outro servico da aplicacao da frente abre o acervo da
    pessoa. Torna-los obrigatorios com JWT ligado e decisao pendente de quem
    implanta, porque derruba a partida de uma instalacao que hoje nao os define.
    """
    opcoes = {"require": ["exp", "sub"]}
    try:
        if settings.jwt_jwks_url:
            # O cliente do PyJWT guarda as chaves em memoria e so volta a buscar
            # quando aparece um `kid` que ele nao conhece -- ou seja, na rotacao.
            cliente = _jwks(settings.jwt_jwks_url)
            chave = cliente.get_signing_key_from_jwt(token).key
            algoritmos = ["RS256"]
        else:
            chave = settings.jwt_secret
            algoritmos = ["HS256"]

        declaracoes = jwt.decode(
            token,
            chave,
            # A lista e nossa, nunca do token: aceitar o algoritmo que o
            # cabecalho declara e o defeito classico desta familia, e abre a
            # porta para "none" e para HMAC assinado com a chave publica.
            algorithms=algoritmos,
            issuer=settings.jwt_issuer,
            audience=settings.jwt_audience,
            leeway=FOLGA_DE_RELOGIO,
            options={**opcoes, "verify_aud": settings.jwt_audience is not None},
        )
    except jwt.PyJWTError as exc:
        logger.warning("token recusado: %s", type(exc).__name__)
        return None
    except Exception as exc:  # noqa: BLE001
        # Falha de rede ao buscar o JWKS, por exemplo. Recusar e a resposta
        # certa -- sem a chave publica nao ha o que verificar -- mas isso nao
        # pode derrubar o processo.
        logger.warning("nao foi possivel verificar o token: %s", type(exc).__name__)
        return None

    # A assinatura confere, mas a janela ainda pode ser longa demais. Um token
    # vazado vale ate expirar, e nao ha como cancela-lo antes: o tamanho da
    # janela e a unica defesa, e ela precisa ser nossa.
    restante = int(declaracoes["exp"]) - time.time()
    if restante > settings.jwt_max_validade + FOLGA_DE_RELOGIO:
        logger.warning(
            "token recusado: vale por %d s, acima do teto de %d s",
            restante,
            settings.jwt_max_validade,
        )
        return None
    return declaracoes


_clientes_jwks: dict[str, jwt.PyJWKClient] = {}


#: Como este servico se apresenta ao buscar as chaves publicas.
#:
#: Nao e cortesia. O PyJWKClient usa urllib, que se identifica como
#: ``Python-urllib/3.x`` -- e uma aplicacao atras da Cloudflare recusa esse
#: agente com 403, pela verificacao de integridade de navegador.
#:
#: Medido contra a instalacao real, de dentro do container:
#:
#:     sem User-Agent (padrao do urllib) ....... HTTP 403
#:     com qualquer outro ...................... HTTP 200
#:
#: O modo como isso falha e o que torna a linha necessaria. Sem chave publica
#: nao ha o que verificar, entao ``_verificar`` recusa TODO token -- e o
#: registro diz apenas ``PyJWKClientConnectionError``. Ninguem liga esse nome a
#: uma regra de bot da Cloudflare; procura-se o defeito na assinatura, no
#: emissor, no relogio.
AGENTE = "fitradeoff-mcp"


def _jwks(url: str) -> jwt.PyJWKClient:
    """Um cliente por URL, guardado entre chamadas.

    Um cliente novo a cada requisicao refaria a busca das chaves publicas toda
    vez, e o cache que o PyJWT mantem existe justamente para isso nao acontecer.
    """
    if url not in _clientes_jwks:
        _clientes_jwks[url] = jwt.PyJWKClient(
            url,
            cache_keys=True,
            headers={"User-Agent": AGENTE},
            # Sem teto, uma busca que trava deixa a requisicao pendurada pelo
            # tempo que o sistema operacional decidir. Dez segundos e generoso
            # para um arquivo de meio quilobyte, e o cliente so busca quando
            # encontra um `kid` que nao conhece -- ou seja, na rotacao.
            timeout=10,
        )
    return _clientes_jwks[url]


def assercao(settings: Settings, apresentado: str) -> Path | None:
    """So a afirmacao assinada -- o acervo de quem a aplicacao da frente diz ser.

    Separada de ``resolver`` de proposito. As chaves do cofre existem para o
    cliente MCP do dono; aceita-las tambem em ``/api`` deixaria uma chave
    emitida para um assistente virar credencial de navegador, o que nao e o que
    ninguem espera ao emiti-la.
    """
    if not settings.jwt_configurado:
        return None

    declaracoes = _verificar(settings, apresentado)
    if declaracoes is None:
        return None

    pessoa = str(declaracoes.get("sub") or "").strip()
    if not pessoa:
        return None

    emissor = settings.jwt_issuer or str(declaracoes.get("iss") or "")
    return acervo_de(settings, emissor, pessoa)


_LOOPBACK = {"127.0.0.1", "localhost", "::1", "[::1]"}


def endereco_de_escuta(
    argv: list[str] | None = None, ambiente: dict[str, str] | None = None
) -> str | None:
    """O ``--host`` com que o uvicorn foi lancado, ou ``None`` se nao se sabe.

    O aplicativo nao recebe do servidor o endereco em que ele escuta; o que da
    para ler e a linha de comando (``--host X`` ou ``--host=X``) e a variavel
    ``UVICORN_HOST``, que o uvicorn tambem aceita. Sem nenhum dos dois, o
    uvicorn escuta em 127.0.0.1 -- e ``None`` conta como loopback.
    """
    argv = sys.argv if argv is None else argv
    ambiente = os.environ if ambiente is None else ambiente
    for i, arg in enumerate(argv):
        if arg == "--host" and i + 1 < len(argv):
            return argv[i + 1]
        if arg.startswith("--host="):
            return arg.split("=", 1)[1]
    return ambiente.get("UVICORN_HOST") or None


def avisar_configuracao(
    settings: Settings, *, com_api: bool, endereco: str | None = None
) -> None:
    """Grita no registro, na partida, as configuracoes que o dono precisa rever.

    Nao impede a partida: implantar e decisao do dono, e ha quem rode assim de
    proposito. Mas os dois casos abaixo nao podem passar em silencio.

    **Sem verificador, com ``/api`` alcancavel de fora** (so para o aplicativo
    com ``/api``, ``com_api``). Sem JWKS nem segredo, ``/api`` atende sem
    cadastro e entrega o acervo do dono a quem chegar. Isso so e seguro atras
    de loopback; o MCP declarado como publicado (``FITRADEOFF_MCP_HOSTS``) ou o
    servidor escutando fora de loopback (``endereco``) dizem o contrario. Nivel
    ERROR.

    **Verificador sem ``aud`` ou sem ``iss``.** Sem eles, um token que o mesmo
    JWKS ou segredo assinou para outro servico entra aqui. Nivel WARNING.
    """
    if com_api and not settings.jwt_configurado:
        fora = endereco is not None and endereco.strip() not in _LOOPBACK
        if settings.mcp_publicado or fora:
            motivo = (
                f"FITRADEOFF_MCP_HOSTS declarado ({', '.join(settings.mcp_hosts)})"
                if settings.mcp_publicado
                else f"escutando em {endereco}, fora de loopback"
            )
            logger.error(
                "INSTALACAO ABERTA: %s, mas sem verificador de identidade "
                "(FITRADEOFF_JWT_JWKS_URL ou FITRADEOFF_JWT_SECRET). /api atende "
                "sem cadastro e entrega as decisoes do acervo principal a quem "
                "alcancar a porta. Configure o verificador, ou publique so o MCP "
                "(fitradeoff_api.mcp_remoto:app).",
                motivo,
            )
    if settings.jwt_configurado:
        faltam = [
            nome
            for nome, valor in (
                ("FITRADEOFF_JWT_AUDIENCE", settings.jwt_audience),
                ("FITRADEOFF_JWT_ISSUER", settings.jwt_issuer),
            )
            if not valor
        ]
        if faltam:
            logger.warning(
                "verificador de JWT sem %s: tokens emitidos para outros servicos "
                "com a mesma chave de assinatura serao aceitos aqui.",
                " nem ".join(faltam),
            )


def resolver(settings: Settings) -> Resolvedor:
    """O ``Resolvedor`` que o MCP usa: o que foi apresentado -> onde gravar."""
    do_cofre = cofre.resolver(settings)

    def para(apresentado: str) -> Path | None:
        if apresentado.startswith(cofre.PREFIXO):
            if not settings.aceitar_chaves_do_cofre:
                # Servidor atras da aplicacao principal: aqui ninguem precisa de
                # chave do cofre, e recusa-las remove o vetor da chave vazada em
                # log de proxy ou em historico de navegador.
                logger.warning("chave do cofre recusada: desligada neste servidor")
                return None
            return do_cofre(apresentado)

        return assercao(settings, apresentado)

    return para
