"""Nenhuma resposta de /api fica no cache do navegador."""

from fastapi.testclient import TestClient

from fitradeoff_api import create_app, deps
from fitradeoff_api.config import Settings


def _cliente(tmp_path) -> TestClient:
    settings = Settings(storage=tmp_path / "decisoes")
    app = create_app(settings)
    app.dependency_overrides[deps.get_settings] = lambda: settings
    return TestClient(app)


def test_decisoes_saem_com_no_store(tmp_path):
    c = _cliente(tmp_path)
    r = c.get("/api/decisoes")
    assert r.status_code == 200
    assert r.headers["cache-control"] == "no-store"


def test_erro_da_api_tambem_sai_com_no_store(tmp_path):
    c = _cliente(tmp_path)
    assert c.get("/api/nao-existe").headers["cache-control"] == "no-store"


def test_fora_da_api_nao_e_tocado(tmp_path):
    c = _cliente(tmp_path)
    assert "cache-control" not in c.get("/nao-e-api").headers
