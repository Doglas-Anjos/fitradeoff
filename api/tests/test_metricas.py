"""As metricas que vao para o Prometheus da FasorX.

Duas coisas importam mais do que os numeros em si: que nenhum rotulo carregue
chave, pessoa ou decisao -- o painel do Grafana e lido por quem opera, nao por
quem e dono dos dados -- e que a porta so exista quando alguem a pedir.
"""

import socket
import urllib.request

from fastapi.testclient import TestClient
from prometheus_client import REGISTRY, generate_latest

from fitradeoff_api import chaves as cofre
from fitradeoff_api import create_app, deps
from fitradeoff_api.config import Settings
from fitradeoff_api.mcp_remoto import create_mcp_app

CABECALHOS_MCP = {"Accept": "application/json, text/event-stream"}


def valor(nome: str, **rotulos) -> float:
    return REGISTRY.get_sample_value(nome, rotulos) or 0.0


def cliente(settings: Settings) -> TestClient:
    app = create_app(settings)
    app.dependency_overrides[deps.get_settings] = lambda: settings
    return TestClient(app)


def test_conta_pela_rota_e_nao_pelo_caminho(tmp_path):
    settings = Settings(storage=tmp_path / "decisoes")
    antes = valor(
        "fitradeoff_requisicoes_total",
        rota="/api/decisoes/{decisao_id}", metodo="GET", status="404",
    )
    with cliente(settings) as c:
        assert c.get("/api/decisoes/nao-existe").status_code == 404
    depois = valor(
        "fitradeoff_requisicoes_total",
        rota="/api/decisoes/{decisao_id}", metodo="GET", status="404",
    )
    assert depois == antes + 1
    assert b"nao-existe" not in generate_latest(REGISTRY)


def test_metodo_inventado_nao_abre_serie_nova(tmp_path):
    """O metodo e texto livre do cliente; sem teto, cada um seria uma serie."""
    with cliente(Settings(storage=tmp_path / "decisoes")) as c:
        for i in range(3):
            c.request(f"INVENTADO{i}", "/api/saude")

    metodos = {
        amostra.labels["metodo"]
        for familia in REGISTRY.collect()
        if familia.name == "fitradeoff_requisicoes"
        for amostra in familia.samples
    }
    assert not any(m.startswith("INVENTADO") for m in metodos)
    assert "outro" in metodos


def test_a_chave_na_url_nunca_vira_rotulo(tmp_path):
    settings = Settings(storage=tmp_path / "decisoes", mcp_hosts=["fit.exemplo.org"])
    _, texto = cofre.criar(settings, "teste")
    with TestClient(create_mcp_app(settings)) as c:
        c.post(f"/mcp/{texto}", json={}, headers=CABECALHOS_MCP)
        c.post("/mcp/fit_chave-inventada", json={}, headers=CABECALHOS_MCP)

    exportado = generate_latest(REGISTRY).decode()
    assert texto not in exportado
    assert "fit_chave-inventada" not in exportado
    assert valor(
        "fitradeoff_requisicoes_total", rota="/mcp", metodo="POST", status="401"
    ) >= 1


def test_mede_cada_ferramenta_do_mcp(tmp_path):
    settings = Settings(storage=tmp_path / "decisoes", mcp_hosts=["fit.exemplo.org"])
    _, texto = cofre.criar(settings, "teste")
    antes = valor(
        "fitradeoff_ferramentas_total", ferramenta="list_problematics", resultado="ok"
    )
    pedido = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": "list_problematics", "arguments": {}},
    }
    # O host declarado: a protecao contra DNS rebinding recusa `testserver`.
    with TestClient(create_mcp_app(settings), base_url="http://fit.exemplo.org") as c:
        r = c.post(
            "/mcp",
            json=pedido,
            headers={**CABECALHOS_MCP, "Authorization": f"Bearer {texto}"},
        )
    assert r.status_code == 200
    assert valor(
        "fitradeoff_ferramentas_total", ferramenta="list_problematics", resultado="ok"
    ) == antes + 1


def test_as_vagas_aparecem_na_coleta(tmp_path):
    with cliente(Settings(storage=tmp_path / "decisoes")):
        assert valor("fitradeoff_vagas_total") == 24
        assert valor("fitradeoff_calculos_rodando") == 0


def _porta_livre() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def test_a_porta_so_existe_quando_pedida(tmp_path):
    porta = _porta_livre()
    settings = Settings(storage=tmp_path / "decisoes", metricas_porta=porta)
    with cliente(settings):
        texto = urllib.request.urlopen(f"http://127.0.0.1:{porta}/metrics").read()
        assert b"fitradeoff_requisicoes_total" in texto

    # Sem a variavel, o aplicativo sobe sem abrir porta nenhuma.
    assert Settings(storage=tmp_path / "decisoes").metricas_porta is None


def test_o_app_nao_serve_metricas_nas_rotas_publicas(tmp_path):
    """/metrics fica na porta a parte; pelo Next e pelo Caddy, ela nao existe."""
    with cliente(Settings(storage=tmp_path / "decisoes")) as c:
        assert c.get("/metrics").status_code == 404
        assert c.get("/api/metrics").status_code == 404
