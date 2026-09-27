"""A asserção de identidade vinda da aplicação da frente.

Aqui o MCP acredita em alguém: a aplicação principal afirma quem está logado, e
nós não temos como conferir por outro caminho. Então o que precisa de teste é
tudo aquilo que faria a afirmação valer sem ser verdadeira -- assinatura de
outra chave, algoritmo trocado, token vencido, emissor ou público errados -- e
o isolamento que depende dela.
"""

import time

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from fitradeoff_api import chaves as cofre
from fitradeoff_api import identidade
from fitradeoff_api.config import Settings

SEGREDO = "segredo-que-so-as-duas-conhecem-e-tem-tamanho-bastante"
EMISSOR = "https://principal.exemplo.org"
PUBLICO = "fitradeoff-mcp"


def ajustes(tmp_path, **mudancas) -> Settings:
    base = dict(
        storage=tmp_path / "decisoes",
        jwt_secret=SEGREDO,
        jwt_issuer=EMISSOR,
        jwt_audience=PUBLICO,
    )
    return Settings(**{**base, **mudancas})


def token(**mudancas) -> str:
    corpo = {
        "sub": "pessoa-1",
        "iss": EMISSOR,
        "aud": PUBLICO,
        "exp": int(time.time()) + 300,
    }
    corpo.update(mudancas)
    segredo = corpo.pop("__segredo__", SEGREDO)
    algoritmo = corpo.pop("__algoritmo__", "HS256")
    return jwt.encode(corpo, segredo, algorithm=algoritmo)


# --- o caminho que deve funcionar ---------------------------------------------


def test_o_token_assinado_abre_o_acervo_da_pessoa(tmp_path):
    settings = ajustes(tmp_path)

    caminho = identidade.resolver(settings)(token())

    assert caminho == identidade.acervo_de(settings, EMISSOR, "pessoa-1")
    # Ao lado do acervo do dono, nunca dentro dele.
    assert caminho != settings.storage


def test_cada_pessoa_abre_o_proprio_acervo(tmp_path):
    settings = ajustes(tmp_path)
    resolve = identidade.resolver(settings)

    primeira = resolve(token(sub="pessoa-1"))
    segunda = resolve(token(sub="pessoa-2"))

    assert primeira != segunda
    assert resolve(token(sub="pessoa-1")) == primeira, "a mesma pessoa, o mesmo lugar"


def test_o_mesmo_sub_de_emissores_diferentes_nao_se_mistura(tmp_path):
    """Dois sistemas de identidade podem chamar a mesma pessoa de `1`."""
    settings = ajustes(tmp_path)

    um = identidade.acervo_de(settings, "https://a.exemplo.org", "1")
    outro = identidade.acervo_de(settings, "https://b.exemplo.org", "1")

    assert um != outro


def test_a_identidade_nunca_vira_caminho(tmp_path):
    """Um `sub` hostil e resumo, nao componente de caminho."""
    settings = ajustes(tmp_path)

    caminho = identidade.acervo_de(settings, EMISSOR, "../../../etc/passwd")

    assert ".." not in str(caminho)
    assert "passwd" not in str(caminho)
    assert caminho.is_relative_to(settings.storage.parent)


def test_a_chave_do_cofre_continua_abrindo_o_acervo_do_dono(tmp_path):
    """Os dois caminhos convivem: a tela local nao passa pela aplicacao da frente."""
    settings = ajustes(tmp_path)
    _, texto = cofre.criar(settings, "Claude Code aqui")

    assert identidade.resolver(settings)(texto) == settings.storage


# --- o que nao pode passar ----------------------------------------------------


@pytest.mark.parametrize(
    "descricao,alteracao",
    [
        ("assinado com outra chave", {"__segredo__": "chave-do-atacante-com-tamanho-suficiente-tambem"}),
        ("emissor diferente", {"iss": "https://intruso.exemplo.net"}),
        ("publico diferente", {"aud": "outro-servico"}),
        ("vencido", {"exp": int(time.time()) - 3600}),
        ("sem sub", {"sub": None}),
    ],
)
def test_token_invalido_nao_abre_nada(tmp_path, descricao, alteracao):
    settings = ajustes(tmp_path)

    assert identidade.resolver(settings)(token(**alteracao)) is None, descricao


def test_token_sem_assinatura_nao_passa(tmp_path):
    """`alg: none` e o defeito classico desta familia."""
    settings = ajustes(tmp_path)
    sem_assinatura = jwt.encode(
        {"sub": "pessoa-1", "iss": EMISSOR, "aud": PUBLICO, "exp": int(time.time()) + 300},
        key="",
        algorithm="none",
    )

    assert identidade.resolver(settings)(sem_assinatura) is None


@pytest.fixture
def par_rsa():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture
def jwks(par_rsa, monkeypatch):
    """Substitui a busca das chaves publicas, que sairia para a rede.

    Sem isto, os testes do caminho RS256 passariam pelo motivo errado: a busca
    falharia, o resolvedor recusaria por falta de chave, e nada teria sido dito
    sobre a verificacao em si.
    """
    publica = par_rsa.public_key()

    class _Chave:
        key = publica

    class _Cliente:
        def get_signing_key_from_jwt(self, token):
            return _Chave()

    monkeypatch.setattr(identidade, "_jwks", lambda url: _Cliente())


def test_o_caminho_rs256_aceita_o_token_da_aplicacao(tmp_path, par_rsa, jwks):
    settings = ajustes(
        tmp_path, jwt_secret=None, jwt_jwks_url="https://principal.exemplo.org/jwks"
    )
    privada = par_rsa.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    assinado = jwt.encode(
        {
            "sub": "pessoa-1",
            "iss": EMISSOR,
            "aud": PUBLICO,
            "exp": int(time.time()) + 300,
        },
        key=privada.decode("ascii"),
        algorithm="RS256",
    )

    assert identidade.resolver(settings)(assinado) == identidade.acervo_de(
        settings, EMISSOR, "pessoa-1"
    )


def test_hmac_assinado_com_a_chave_publica_nao_passa(tmp_path, par_rsa, jwks):
    """Confusao de algoritmo: o token declara HS256 onde se espera RS256.

    Se o verificador aceitasse o algoritmo que o cabecalho declara, a chave
    publica -- que e publica -- viraria a chave de assinatura, e qualquer um
    emitiria tokens validos. O token e montado a mao porque o proprio PyJWT se
    recusa a assinar assim; o ataque nao usaria PyJWT.
    """
    import base64
    import hashlib
    import hmac
    import json

    settings = ajustes(
        tmp_path, jwt_secret=None, jwt_jwks_url="https://principal.exemplo.org/jwks"
    )
    publica = par_rsa.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )

    def sem_padding(bruto: bytes) -> bytes:
        return base64.urlsafe_b64encode(bruto).rstrip(b"=")

    cabecalho = sem_padding(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    corpo = sem_padding(
        json.dumps(
            {
                "sub": "pessoa-1",
                "iss": EMISSOR,
                "aud": PUBLICO,
                "exp": int(time.time()) + 300,
            }
        ).encode()
    )
    assinatura = sem_padding(
        hmac.new(publica, cabecalho + b"." + corpo, hashlib.sha256).digest()
    )
    forjado = b".".join([cabecalho, corpo, assinatura]).decode("ascii")

    assert identidade.resolver(settings)(forjado) is None


def test_sem_verificador_configurado_nenhum_token_entra(tmp_path):
    """Fecha por falta de configuracao: sem chave de verificacao, nada e aceito."""
    settings = ajustes(tmp_path, jwt_secret=None, jwt_jwks_url=None)
    assert settings.jwt_configurado is False

    assert identidade.resolver(settings)(token()) is None


def test_texto_qualquer_nao_derruba_o_resolvedor(tmp_path):
    settings = ajustes(tmp_path)
    resolve = identidade.resolver(settings)

    for lixo in ["", "   ", "nao.e.um.token", "fit_", "a" * 5000]:
        assert resolve(lixo) is None
