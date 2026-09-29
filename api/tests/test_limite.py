"""O teto do corpo, cortado antes de qualquer rota.

O FastAPI le o formulario antes de rodar a autenticacao: sem o teto na entrada,
um envio anonimo ia inteiro para o disco e so depois levava o 401. O que importa
aqui e a ordem -- o 413 tem de vir ANTES de o arquivo ser guardado.
"""

import starlette.formparsers as formparsers
from fastapi.testclient import TestClient

from fitradeoff_api import chaves as cofre
from fitradeoff_api import create_app, deps
from fitradeoff_api.config import Settings
from fitradeoff_api.limite import LIMITE_PADRAO
from fitradeoff_api.mcp_remoto import create_mcp_app


def atras_da_aplicacao(tmp_path) -> TestClient:
    settings = Settings(
        storage=tmp_path / "decisoes",
        jwt_secret="segredo-compartilhado-entre-o-fasorx-e-o-fitradeoff",
        jwt_issuer="https://fasorx.com.br",
        jwt_audience="fitradeoff",
    )
    app = create_app(settings)
    # As rotas leem os ajustes por dependencia, e nao pelo `create_app`.
    app.dependency_overrides[deps.get_settings] = lambda: settings
    return TestClient(app)


def test_envio_anonimo_grande_nao_chega_ao_disco(tmp_path, monkeypatch):
    para_o_disco: list[bool] = []
    original = formparsers.SpooledTemporaryFile

    class Espiao(original):
        def rollover(self):
            para_o_disco.append(True)
            return super().rollover()

    monkeypatch.setattr(formparsers, "SpooledTemporaryFile", Espiao)

    with atras_da_aplicacao(tmp_path) as c:
        r = c.post(
            "/api/planilhas/previa",
            files={"arquivo": ("a.xlsx", b"0" * (LIMITE_PADRAO + 1))},
        )

    assert r.status_code == 413
    assert para_o_disco == []


def test_corpo_sem_tamanho_declarado_tambem_e_contado(tmp_path):
    """Envio em pedacos nao declara Content-Length; o teto conta o que chega."""

    def pedacos():
        for _ in range(4):
            yield b"0" * (LIMITE_PADRAO // 2)

    with atras_da_aplicacao(tmp_path) as c:
        r = c.post(
            "/api/rascunho",
            content=pedacos(),
            headers={"Content-Type": "application/json"},
        )
    assert r.status_code == 413


def test_corpo_dentro_do_teto_segue_para_a_autenticacao(tmp_path):
    with atras_da_aplicacao(tmp_path) as c:
        r = c.post("/api/planilhas/previa", files={"arquivo": ("a.xlsx", b"0" * 1024)})
    assert r.status_code == 401


def test_o_mcp_publico_tambem_tem_teto(tmp_path):
    """Com chave valida: sem ela, a autenticacao recusa antes de ler o corpo."""
    settings = Settings(storage=tmp_path / "decisoes", mcp_hosts=["fit.exemplo.org"])
    _, texto = cofre.criar(settings, "teste")
    with TestClient(create_mcp_app(settings)) as c:
        r = c.post(
            "/mcp",
            content=b"0" * (LIMITE_PADRAO + 1),
            headers={"Authorization": f"Bearer {texto}"},
        )
    assert r.status_code == 413
