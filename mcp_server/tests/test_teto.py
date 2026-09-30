"""Teto de decisoes por pessoa, no caminho do MCP.

O assistente conectado por chave cria decisoes pelo ``create_problem``, sem
passar pelas rotas da API. Se o teto so existisse la, este seria o caminho
para encher o disco.
"""

import pytest

from fitradeoff_mcp import server as srv
from fitradeoff_mcp import teto

CRITERIOS = [
    {"chave": "q", "nome": "Qualidade", "direcao": "max"},
    {"chave": "c", "nome": "Custo", "direcao": "min"},
]
CONSEQUENCIAS = [[0.8, 12.0], [0.9, 16.0], [0.7, 10.0]]
ALTERNATIVAS = ["A", "B", "C"]


@pytest.fixture
def escopo(tmp_path, monkeypatch):
    """O que o transporte HTTP faz com a chave de uma pessoa: fixa o acervo dela."""
    monkeypatch.setenv("FITRADEOFF_MAX_DECISOES_POR_PESSOA", "2")
    monkeypatch.delenv("FITRADEOFF_DATABASE_URL", raising=False)

    def fixar(caminho):
        marca = srv.escopo_da_chamada.set(caminho)
        return marca

    marcas = []
    yield lambda caminho: marcas.append(fixar(caminho))
    for marca in reversed(marcas):
        srv.escopo_da_chamada.reset(marca)


def criar():
    return srv.create_problem("x", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS)


def test_create_problem_para_no_teto_do_acervo_da_pessoa(tmp_path, escopo):
    escopo(tmp_path / "pessoas" / ("a" * 32))
    assert "id" in criar()
    assert "id" in criar()

    cheia = criar()
    assert "erro" in cheia and "limite de 2 decisoes" in cheia["erro"]
    assert len(srv.list_problems()["decisoes"]) == 2


def test_acervo_do_dono_nao_tem_teto(tmp_path, escopo):
    escopo(tmp_path / "decisoes")
    for _ in range(3):
        assert "id" in criar()


def test_conferir_usa_a_contagem_injetada(tmp_path):
    """Com banco, o diretorio nao tem arquivos: a contagem vem de quem chama."""
    pessoa = tmp_path / "pessoas" / ("b" * 32)
    with pytest.raises(teto.AcervoCheio):
        teto.conferir(pessoa, 5, contar=lambda: 5)
    teto.conferir(pessoa, 5, contar=lambda: 4)
    # Zero desliga.
    teto.conferir(pessoa, 0, contar=lambda: 10_000)


def test_limite_ilegivel_cai_no_padrao(monkeypatch):
    monkeypatch.setenv("FITRADEOFF_MAX_DECISOES_POR_PESSOA", "muitas")
    assert teto.limite_do_ambiente() == teto.PADRAO
