"""A superficie publica.

O teste que importa aqui e pela negativa: o que este aplicativo **nao** serve.
Uma rota de decisao alcancavel sem chave, ou uma rota que emita chaves, seria a
falha que so se descobre depois -- e nenhum teste de feliz caminho a pegaria.
"""

import pytest
from fastapi.testclient import TestClient

from fitradeoff_api import chaves as cofre
from fitradeoff_api.config import Settings
from fitradeoff_api.mcp_remoto import create_mcp_app

LOCAL = "http://127.0.0.1:8765"
CABECALHOS = {
    "Accept": "application/json, text/event-stream",
    "Content-Type": "application/json",
}
PEDIDO = {"jsonrpc": "2.0", "id": 1, "method": "tools/list"}


@pytest.fixture
def ajustes(tmp_path) -> Settings:
    return Settings(storage=tmp_path / "decisoes")


@pytest.fixture
def cliente(ajustes):
    # De fora, de propósito: nesta superfície ninguém chega pelo loopback.
    with TestClient(
        create_mcp_app(ajustes), base_url=LOCAL, client=("203.0.113.9", 41234)
    ) as c:
        yield c


def test_so_o_mcp_e_a_saude_existem(cliente):
    """O resto da API nao esta aqui -- nao ha o que proteger porque nao ha rota."""
    for caminho in (
        "/api/decisoes",
        "/api/chaves",
        "/api/rascunho",
        "/api/chat",
        "/api/saude",
        "/docs",
        "/openapi.json",
        "/",
    ):
        assert cliente.get(caminho).status_code == 404, f"{caminho} nao devia existir"


def test_a_saude_responde_sem_chave_e_nao_conta_nada(cliente, ajustes):
    resposta = cliente.get("/saude")
    assert resposta.status_code == 200

    corpo = resposta.text
    assert str(ajustes.storage) not in corpo
    assert "chave" not in corpo.lower()


def test_o_mcp_continua_exigindo_chave(cliente):
    assert cliente.post("/mcp", json=PEDIDO, headers=CABECALHOS).status_code == 401


def test_a_chave_emitida_no_aplicativo_local_vale_aqui(cliente, ajustes):
    """As duas metades se encontram no cofre, e so nele."""
    _, texto = cofre.criar(ajustes, "Claude na web")

    resposta = cliente.post(
        "/mcp",
        json=PEDIDO,
        headers={**CABECALHOS, "Authorization": f"Bearer {texto}"},
    )
    assert resposta.status_code == 200
    assert "criar_problema" in resposta.text


def test_a_chave_na_url_tambem_vale(cliente, ajustes):
    _, texto = cofre.criar(ajustes, "Claude na web")
    assert cliente.post(f"/mcp/{texto}", json=PEDIDO, headers=CABECALHOS).status_code == 200


def test_revogar_no_local_fecha_a_porta_publica(cliente, ajustes):
    """Sem reiniciar nada: o cofre e lido a cada requisicao."""
    chave, texto = cofre.criar(ajustes, "Temporaria")
    autorizado = {**CABECALHOS, "Authorization": f"Bearer {texto}"}
    assert cliente.post("/mcp", json=PEDIDO, headers=autorizado).status_code == 200

    cofre.revogar(ajustes, chave.id)

    assert cliente.post("/mcp", json=PEDIDO, headers=autorizado).status_code == 401


def test_o_dominio_publico_declarado_e_aceito(tmp_path):
    """Sem a declaracao, o SDK recusa com 421 e a mensagem nao explica nada."""
    publicado = Settings(
        storage=tmp_path / "decisoes", mcp_hosts=["fit.exemplo.org"]
    )
    _, texto = cofre.criar(publicado, "Claude na web")

    with TestClient(
        create_mcp_app(publicado), base_url="https://fit.exemplo.org"
    ) as c:
        resposta = c.post(
            "/mcp",
            json=PEDIDO,
            headers={**CABECALHOS, "Authorization": f"Bearer {texto}"},
        )
    assert resposta.status_code == 200


def test_dominio_nao_declarado_e_recusado(tmp_path):
    """A protecao contra DNS rebinding continua valendo para quem nao declarou."""
    publicado = Settings(
        storage=tmp_path / "decisoes", mcp_hosts=["fit.exemplo.org"]
    )
    _, texto = cofre.criar(publicado, "Claude na web")

    with TestClient(
        create_mcp_app(publicado), base_url="https://intruso.exemplo.net"
    ) as c:
        resposta = c.post(
            "/mcp",
            json=PEDIDO,
            headers={**CABECALHOS, "Authorization": f"Bearer {texto}"},
        )
    assert resposta.status_code == 421
