"""As diferencas maximas do ranking saem por uma rota propria, sob demanda.

Dentro do /estado elas custavam 80% de cada analise com 200 alternativas -- dois
LPs por par incomparavel, refeitos a cada pergunta com o painel fechado.
"""

import pytest
from fastapi.testclient import TestClient

from fitradeoff_api import create_app
from fitradeoff_api.config import Settings

RANKING = {
    "nome": "Fornecedores",
    "alternativas": ["A", "B", "C"],
    "criterios": [
        {"chave": "q", "nome": "Qualidade", "direcao": "max"},
        {"chave": "c", "nome": "Custo", "direcao": "min", "unidade": "R$"},
    ],
    "consequencias": [[0.8, 12.0], [0.9, 16.0], [0.7, 10.0]],
    "problematica": "ranking",
}


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("FITRADEOFF_DATA", str(tmp_path))
    from fitradeoff_api import deps

    deps.get_settings.cache_clear()
    app = create_app(Settings(storage=tmp_path))
    app.dependency_overrides[deps.get_settings] = lambda: Settings(storage=tmp_path)
    with TestClient(app) as c:
        yield c


def test_o_estado_nao_traz_mais_as_diferencas(client):
    decisao = client.post("/api/decisoes", json=RANKING).json()["id"]
    client.post(f"/api/decisoes/{decisao}/ordenacao", json={"ordem": ["q", "c"]})
    estado = client.get(f"/api/decisoes/{decisao}/estado").json()
    assert "diferencas_maximas" not in estado["analise"]


def test_a_rota_devolve_os_pares_incomparaveis(client):
    decisao = client.post("/api/decisoes", json=RANKING).json()["id"]
    client.post(f"/api/decisoes/{decisao}/ordenacao", json={"ordem": ["q", "c"]})
    resposta = client.get(f"/api/decisoes/{decisao}/diferencas-maximas")
    assert resposta.status_code == 200
    linhas = resposta.json()["diferencas_maximas"]
    # so com a ordem (qualidade antes de custo), A e B ainda se cruzam
    assert {(l["a"], l["b"]) for l in linhas} == {("A", "B")}
    assert all(l["a_supera_b_em_ate"] >= 0 and l["b_supera_a_em_ate"] >= 0 for l in linhas)


def test_fora_do_ranking_a_rota_recusa(client):
    decisao = client.post("/api/decisoes", json={**RANKING, "problematica": "escolha"}).json()["id"]
    resposta = client.get(f"/api/decisoes/{decisao}/diferencas-maximas")
    # a convencao da API para pedido que o motor recusa (ver deps.py)
    assert resposta.status_code == 409


def test_decisao_inexistente_e_404(client):
    assert client.get("/api/decisoes/fantasma/diferencas-maximas").status_code == 404
