"""O rascunho guardado no servidor.

Ate aqui, alternativas e criterios digitados viviam so no ``localStorage``: quem
comecava a montar um problema num computador nao o encontrava noutro, e limpar
os dados do site apagava o trabalho sem aviso.
"""

import json

import pytest
from fastapi.testclient import TestClient

from fitradeoff_api.app import create_app
from fitradeoff_api.config import Settings
from fitradeoff_api.deps import get_settings
from fitradeoff_api.routers.rascunhos import LIMITE_BYTES


@pytest.fixture
def cliente(tmp_path):
    settings = Settings(storage=tmp_path / "decisoes")
    app = create_app(settings)
    app.dependency_overrides[get_settings] = lambda: settings
    with TestClient(app) as c:
        c.pasta = tmp_path
        yield c


UM_RASCUNHO = {
    "problematica": "escolha",
    "linhas": [{"nome": "Fornecedor A"}, {"nome": "Fornecedor B"}],
    "colunas": [{"nome": "Custo"}],
}


def test_sem_rascunho_a_resposta_e_vazia_e_nao_um_erro(cliente):
    """Nao ter rascunho e o estado normal de quem nunca comecou um."""
    corpo = cliente.get("/api/rascunho").json()
    assert corpo == {"rascunho": None, "gravado_em": None}


def test_o_que_foi_gravado_volta_igual(cliente):
    cliente.post("/api/rascunho", json={"rascunho": UM_RASCUNHO})
    assert cliente.get("/api/rascunho").json()["rascunho"] == UM_RASCUNHO


def test_o_carimbo_e_do_servidor(cliente):
    """O cliente nao carimba: um relogio adiantado congelaria uma versao velha
    como se fosse a ultima."""
    enviado = cliente.post(
        "/api/rascunho",
        json={"rascunho": UM_RASCUNHO, "gravado_em": "2099-01-01T00:00:00+00:00"},
    ).json()
    assert enviado["gravado_em"] != "2099-01-01T00:00:00+00:00"
    assert cliente.get("/api/rascunho").json()["gravado_em"] == enviado["gravado_em"]


def test_gravar_de_novo_substitui(cliente):
    cliente.post("/api/rascunho", json={"rascunho": UM_RASCUNHO})
    cliente.post("/api/rascunho", json={"rascunho": {"linhas": []}})
    assert cliente.get("/api/rascunho").json()["rascunho"] == {"linhas": []}


def test_descartar_esquece(cliente):
    cliente.post("/api/rascunho", json={"rascunho": UM_RASCUNHO})
    assert cliente.post("/api/rascunho/descartar").json() == {"descartado": True}
    assert cliente.get("/api/rascunho").json()["rascunho"] is None


def test_descartar_o_que_nao_existe_nao_e_erro(cliente):
    """A tela descarta depois de criar a decisao, e pode fazer isso duas vezes
    -- por um clique repetido ou por uma retentativa de rede."""
    assert cliente.post("/api/rascunho/descartar").status_code == 200


def test_sem_o_campo_rascunho_e_recusado(cliente):
    assert cliente.post("/api/rascunho", json={}).status_code == 422


def test_rascunho_grande_demais_e_recusado(cliente):
    enorme = {"linhas": [{"nome": "x" * 1000} for _ in range(LIMITE_BYTES // 500)]}
    assert cliente.post("/api/rascunho", json={"rascunho": enorme}).status_code == 413


def test_nao_aparece_na_lista_de_decisoes(cliente):
    """O repositorio lista `*.json` do diretorio das decisoes. Um rascunho la
    dentro viraria um registro corrompido e a listagem o engoliria calada."""
    cliente.post("/api/rascunho", json={"rascunho": UM_RASCUNHO})
    assert cliente.get("/api/decisoes").json()["decisoes"] == []
    assert not list((cliente.pasta / "decisoes").glob("*.json"))


def test_arquivo_corrompido_nao_derruba_a_abertura(cliente):
    """Escrita interrompida deixa JSON pela metade; a tela abre vazia em vez de
    quebrar."""
    cliente.post("/api/rascunho", json={"rascunho": UM_RASCUNHO})
    (cliente.pasta / "rascunho.json").write_text("{isto nao e json", encoding="utf-8")
    assert cliente.get("/api/rascunho").json()["rascunho"] is None


def test_a_gravacao_nao_deixa_lixo_parcial(cliente):
    cliente.post("/api/rascunho", json={"rascunho": UM_RASCUNHO})
    assert not list(cliente.pasta.glob("*.parcial"))
    assert json.loads((cliente.pasta / "rascunho.json").read_text(encoding="utf-8"))
