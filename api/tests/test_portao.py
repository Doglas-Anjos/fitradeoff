"""A API atrás de uma aplicação que autentica.

Até aqui esta versão não tinha autenticação nenhuma, e isso era coerente: ela
rodava no computador do decisor. Num endereço público deixa de ser — e o que
precisa de teste é justamente o par de coisas que não aparece na tela quando se
erra: que nenhuma chamada anônima passa, e que uma pessoa não alcança o acervo
da outra.

O teste que mais importa é o segundo. Um 401 que falta aparece na primeira
tentativa; um isolamento que falta só aparece quando alguém encontra a decisão
de outra pessoa dentro da própria lista.
"""

import time

import jwt
import pytest
from fastapi.testclient import TestClient

from fitradeoff_api import create_app
from fitradeoff_api.config import Settings

EMISSOR = "https://fasorx.com.br"
PUBLICO = "fitradeoff"
SEGREDO = "segredo-compartilhado-entre-o-fasorx-e-o-fitradeoff"

PROBLEMA = {
    "nome": "Fornecedores",
    "alternativas": ["A", "B", "C"],
    "criterios": [
        {"chave": "q", "nome": "Qualidade", "direcao": "max"},
        {"chave": "c", "nome": "Custo", "direcao": "min"},
    ],
    "consequencias": [[0.8, 12.0], [0.9, 16.0], [0.7, 10.0]],
}


def token(pessoa: str) -> str:
    return jwt.encode(
        {
            "sub": pessoa,
            "iss": EMISSOR,
            "aud": PUBLICO,
            "exp": int(time.time()) + 300,
        },
        SEGREDO,
        algorithm="HS256",
    )


def como(pessoa: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token(pessoa)}"}


@pytest.fixture
def atras_da_aplicacao(tmp_path):
    settings = Settings(
        storage=tmp_path / "decisoes",
        jwt_secret=SEGREDO,
        jwt_issuer=EMISSOR,
        jwt_audience=PUBLICO,
    )
    from fitradeoff_api import deps

    deps.get_settings.cache_clear()
    app = create_app(settings)
    app.dependency_overrides[deps.get_settings] = lambda: settings
    with TestClient(app, base_url="http://127.0.0.1:8000") as c:
        yield c


# --- ninguém entra sem se identificar -----------------------------------------


@pytest.mark.parametrize(
    "metodo,caminho",
    [
        ("get", "/api/decisoes"),
        ("post", "/api/decisoes"),
        ("get", "/api/rascunho"),
        ("post", "/api/rascunho"),
    ],
)
def test_sem_token_nao_passa(atras_da_aplicacao, metodo, caminho):
    chamar = getattr(atras_da_aplicacao, metodo)
    resposta = chamar(caminho, json={}) if metodo == "post" else chamar(caminho)
    assert resposta.status_code == 401
    assert resposta.headers.get("www-authenticate") == "Bearer"


@pytest.mark.parametrize(
    "cabecalho",
    [
        {"Authorization": "Bearer nao.e.um.token"},
        {"Authorization": "Basic dXNlcjpzZW5oYQ=="},
        {"Authorization": "Bearer "},
        {},
    ],
)
def test_credencial_que_nao_serve_nao_passa(atras_da_aplicacao, cabecalho):
    assert atras_da_aplicacao.get("/api/decisoes", headers=cabecalho).status_code == 401


def test_token_de_outro_emissor_nao_passa(atras_da_aplicacao):
    """Um token valido, assinado por quem nao e a aplicacao da frente."""
    alheio = jwt.encode(
        {
            "sub": "pessoa-1",
            "iss": "https://outro.exemplo.net",
            "aud": PUBLICO,
            "exp": int(time.time()) + 300,
        },
        "outro-segredo-qualquer-com-tamanho-suficiente",
        algorithm="HS256",
    )
    resposta = atras_da_aplicacao.get(
        "/api/decisoes", headers={"Authorization": f"Bearer {alheio}"}
    )
    assert resposta.status_code == 401


# --- e cada um vê o que é seu -------------------------------------------------


def test_a_decisao_de_uma_pessoa_nao_aparece_para_a_outra(atras_da_aplicacao):
    criada = atras_da_aplicacao.post(
        "/api/decisoes", json=PROBLEMA, headers=como("ana")
    )
    assert criada.status_code == 201, criada.text

    minhas = atras_da_aplicacao.get("/api/decisoes", headers=como("ana")).json()
    dela = atras_da_aplicacao.get("/api/decisoes", headers=como("bruno")).json()

    assert [d["nome"] for d in minhas["decisoes"]] == ["Fornecedores"]
    assert dela["decisoes"] == []


def test_uma_pessoa_nao_abre_a_decisao_da_outra_pelo_id(atras_da_aplicacao):
    """Saber o identificador nao basta -- ele so existe dentro de um acervo."""
    id = atras_da_aplicacao.post(
        "/api/decisoes", json=PROBLEMA, headers=como("ana")
    ).json()["id"]

    assert atras_da_aplicacao.get(f"/api/decisoes/{id}", headers=como("ana")).status_code == 200
    assert (
        atras_da_aplicacao.get(f"/api/decisoes/{id}", headers=como("bruno")).status_code
        == 404
    )


def test_a_mesma_pessoa_volta_ao_mesmo_acervo(atras_da_aplicacao):
    atras_da_aplicacao.post("/api/decisoes", json=PROBLEMA, headers=como("ana"))

    # Cabecalho novo, token novo, assinado de novo: a pessoa e a mesma.
    de_novo = atras_da_aplicacao.get("/api/decisoes", headers=como("ana")).json()

    assert len(de_novo["decisoes"]) == 1


def test_o_rascunho_tambem_tem_dono(atras_da_aplicacao):
    atras_da_aplicacao.post(
        "/api/rascunho", json={"rascunho": {"nome": "so da ana"}}, headers=como("ana")
    )

    meu = atras_da_aplicacao.get("/api/rascunho", headers=como("ana")).json()
    dela = atras_da_aplicacao.get("/api/rascunho", headers=como("bruno")).json()

    assert meu["rascunho"] == {"nome": "so da ana"}
    assert dela["rascunho"] is None


# --- e a instalação local não muda --------------------------------------------


def test_sem_verificador_configurado_a_tela_local_segue_sem_cadastro(tmp_path):
    """A postura de sempre, onde ela continua fazendo sentido.

    A plataforma no computador do decisor nao tem quem autenticar, nem por que:
    quem alcanca a porta ja e o dono da maquina.
    """
    settings = Settings(storage=tmp_path / "decisoes")
    assert settings.jwt_configurado is False

    from fitradeoff_api import deps

    deps.get_settings.cache_clear()
    app = create_app(settings)
    app.dependency_overrides[deps.get_settings] = lambda: settings
    with TestClient(app, base_url="http://127.0.0.1:8000") as c:
        assert c.get("/api/decisoes").status_code == 200
        assert c.post("/api/decisoes", json=PROBLEMA).status_code == 201
        assert len(c.get("/api/decisoes").json()["decisoes"]) == 1


def test_a_saude_nao_conta_onde_os_dados_moram(atras_da_aplicacao, tmp_path):
    """Era util na maquina do decisor; num endereco publico e caminho de disco."""
    corpo = atras_da_aplicacao.get("/api/saude")

    assert corpo.status_code == 200
    assert str(tmp_path) not in corpo.text
    assert corpo.json()["autenticado_por_terceiros"] is True


def test_atras_da_aplicacao_ninguem_emite_chave_do_cofre(atras_da_aplicacao):
    """Fecha uma escalada.

    A chave do cofre abre o acervo do dono da plataforma, nao o de quem a pediu.
    Onde ha gente autenticada entrando -- e chegando, por tabela, da rede
    interna -- emitir uma chave seria o caminho mais curto para ler as decisoes
    alheias.
    """
    listagem = atras_da_aplicacao.get("/api/chaves", headers=como("ana"))
    emissao = atras_da_aplicacao.post(
        "/api/chaves", json={"rotulo": "minha"}, headers=como("ana")
    )

    assert listagem.status_code == 503
    assert emissao.status_code == 503
    assert "FITRADEOFF_ADMIN_TOKEN" in emissao.json()["detail"]
