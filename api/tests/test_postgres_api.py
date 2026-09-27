"""A API inteira sobre o PostgreSQL: token, dono, linha.

O isolamento entre pessoas foi verificado por diretorio em ``test_portao.py``.
Com banco, o caminho muda -- a identidade vira dono, e o dono vira filtro e
politica de RLS --, e o que precisa de teste e que a troca nao abriu nada no
trajeto: da assinatura do token ate a linha no banco.

Pulados sem ``FITRADEOFF_TEST_DATABASE_URL``.
"""

import os
import time
import uuid

import jwt
import pytest
from fastapi.testclient import TestClient

from fitradeoff.repositories import ConcurrentModification
from fitradeoff_api import create_app
from fitradeoff_api.config import Settings
from fitradeoff_api.deps import translate

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


def como(pessoa: str) -> dict[str, str]:
    assinado = jwt.encode(
        {"sub": pessoa, "iss": EMISSOR, "aud": PUBLICO, "exp": int(time.time()) + 300},
        SEGREDO,
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {assinado}"}


@pytest.fixture
def api(tmp_path):
    url = os.environ.get("FITRADEOFF_TEST_DATABASE_URL")
    if not url:
        pytest.skip("sem FITRADEOFF_TEST_DATABASE_URL: testes do PostgreSQL pulados")
    settings = Settings(
        storage=tmp_path / "decisoes",
        jwt_secret=SEGREDO,
        jwt_issuer=EMISSOR,
        jwt_audience=PUBLICO,
        database_url=url,
    )
    from fitradeoff_api import deps

    deps.get_settings.cache_clear()
    app = create_app(settings)
    app.dependency_overrides[deps.get_settings] = lambda: settings
    with TestClient(app, base_url="http://127.0.0.1:8000") as cliente:
        yield cliente, tmp_path


@pytest.fixture
def pessoas():
    # sub novo a cada teste: o banco e compartilhado entre eles
    return f"ana-{uuid.uuid4().hex}", f"bia-{uuid.uuid4().hex}"


def test_uma_pessoa_nao_alcanca_a_decisao_da_outra(api, pessoas):
    cliente, _ = api
    ana, bia = pessoas
    criada = cliente.post("/api/decisoes", json=PROBLEMA, headers=como(ana))
    assert criada.status_code == 201
    ident = criada.json()["id"]

    assert cliente.get("/api/decisoes", headers=como(bia)).json() == {"decisoes": []}
    for metodo, caminho, corpo in [
        ("get", f"/api/decisoes/{ident}", None),
        ("get", f"/api/decisoes/{ident}/estado", None),
        ("post", f"/api/decisoes/{ident}/resposta", {"preferencia": "A"}),
        ("post", f"/api/decisoes/{ident}/favorita", {"favorita": True}),
        ("get", f"/api/decisoes/{ident}/exportar", None),
    ]:
        resposta = cliente.request(metodo, caminho, json=corpo, headers=como(bia))
        assert resposta.status_code == 404, (metodo, caminho, resposta.status_code)

    [unica] = cliente.get("/api/decisoes", headers=como(ana)).json()["decisoes"]
    assert (unica["id"], unica["favorita"]) == (ident, False)


def test_as_decisoes_vao_para_o_banco_e_nao_para_o_disco(api, pessoas):
    cliente, raiz = api
    ana, _ = pessoas
    assert cliente.post("/api/decisoes", json=PROBLEMA, headers=como(ana)).status_code == 201
    assert list(raiz.rglob("*.json")) == []


def test_elicitacao_completa_pela_api(api, pessoas):
    cliente, _ = api
    ana, _ = pessoas
    h = como(ana)
    ident = cliente.post("/api/decisoes", json=PROBLEMA, headers=h).json()["id"]

    assert cliente.post(f"/api/decisoes/{ident}/ordenacao",
                        json={"ordem": ["q", "c"]}, headers=h).status_code == 200
    respondida = cliente.post(f"/api/decisoes/{ident}/resposta",
                              json={"preferencia": "A"}, headers=h)
    assert respondida.status_code == 200
    assert cliente.post(f"/api/decisoes/{ident}/desfazer", headers=h).status_code == 200
    assert cliente.post(f"/api/decisoes/{ident}/favorita",
                        json={"favorita": True}, headers=h).status_code == 200

    [linha] = cliente.get("/api/decisoes", headers=h).json()["decisoes"]
    # ordenacao registrada, resposta desfeita
    assert (linha["declaracoes"], linha["favorita"]) == (1, True)


def test_conflito_de_versao_vira_409():
    erro = translate(ConcurrentModification("outra janela chegou antes"))
    assert erro.status_code == 409
