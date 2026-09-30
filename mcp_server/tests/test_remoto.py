"""O MCP por HTTP: quem entra, e com quais dados.

Em stdio nao havia o que testar aqui -- o processo era do usuario. Por HTTP
aparecem duas perguntas que nao existiam: se quem nao tem chave e recusado antes
de virar chamada de ferramenta, e se a chave apresentada decide de fato onde a
ferramenta grava. A segunda e a que mais merece teste: ela depende de o escopo
atravessar o transporte, e o transporte executa a chamada num task group que nao
e o da requisicao.

O `base_url` tem porta de proposito. A protecao contra DNS rebinding do SDK
compara o cabecalho `Host` com uma lista em que `127.0.0.1:*` so casa com porta:
sem ela, toda requisicao deste arquivo voltaria 421, e o motivo nao estaria a
vista.
"""

import json
from contextlib import asynccontextmanager
from pathlib import Path

import pytest
from starlette.applications import Starlette
from starlette.responses import PlainTextResponse
from starlette.routing import Route
from starlette.testclient import TestClient

from fitradeoff_mcp import remoto

LOCAL = "http://127.0.0.1:8000"
CABECALHOS = {
    "Accept": "application/json, text/event-stream",
    "Content-Type": "application/json",
}

FERRAMENTAS_ESPERADAS = 19


def pedido(metodo: str, **parametros) -> dict:
    corpo: dict = {"jsonrpc": "2.0", "id": 1, "method": metodo}
    if parametros:
        corpo["params"] = parametros
    return corpo


def resultado(resposta) -> dict:
    """O `result` do JSON-RPC que veio no fluxo de eventos.

    O transporte responde `text/event-stream`, entao a resposta e uma sequencia
    de linhas `data:` -- e nao um JSON que `.json()` leria.
    """
    for linha in resposta.text.splitlines():
        if linha.startswith("data:"):
            mensagem = json.loads(linha[len("data:") :])
            if "result" in mensagem:
                return mensagem["result"]
            raise AssertionError(f"resposta de erro: {mensagem}")
    raise AssertionError(f"nenhum dado no fluxo: {resposta.text!r}")


def conteudo(resposta) -> dict:
    """O que uma ferramenta devolveu, ja fora do envelope de protocolo."""
    return json.loads(resultado(resposta)["content"][0]["text"])


@pytest.fixture
def acervos(tmp_path) -> dict[str, Path]:
    """Duas chaves, dois diretorios: o que permite ver o escopo funcionando."""
    return {"chave-a": tmp_path / "a", "chave-b": tmp_path / "b"}


@pytest.fixture
def cliente(acervos, tmp_path, monkeypatch):
    # Um terceiro diretorio no ambiente, que nenhuma chave abre: se alguma
    # chamada gravar aqui, o escopo nao chegou e a variavel de ambiente venceu.
    monkeypatch.setenv("FITRADEOFF_DATA", str(tmp_path / "ambiente"))

    @asynccontextmanager
    async def ciclo(app):
        # O app do MCP so existe depois que este aplicativo existe, entao o
        # ciclo o acha em `state` -- a mesma ligacao que a API faz.
        async with remoto.ciclo_de_vida(app.state.mcp):
            yield

    externo = Starlette(
        routes=[Route("/api/saude", lambda r: PlainTextResponse("ok"))],
        lifespan=ciclo,
    )
    externo.state.mcp = remoto.montar(externo, acervos.get)
    with TestClient(externo, base_url=LOCAL) as c:
        yield c


# --- quem entra ---------------------------------------------------------------


def test_sem_chave_e_recusado_com_pista_de_como_autenticar(cliente):
    resposta = cliente.post("/mcp", json=pedido("tools/list"), headers=CABECALHOS)
    assert resposta.status_code == 401
    # O cliente MCP descobre que precisa se autenticar por este cabecalho.
    assert resposta.headers["www-authenticate"].startswith("Bearer")


def test_chave_invalida_e_recusada(cliente):
    resposta = cliente.post(
        "/mcp",
        json=pedido("tools/list"),
        headers={**CABECALHOS, "Authorization": "Bearer fit_naoexiste"},
    )
    assert resposta.status_code == 401


def test_chave_no_cabecalho_abre_as_ferramentas(cliente):
    resposta = cliente.post(
        "/mcp",
        json=pedido("tools/list"),
        headers={**CABECALHOS, "Authorization": "Bearer chave-a"},
    )
    assert resposta.status_code == 200
    assert len(resultado(resposta)["tools"]) == FERRAMENTAS_ESPERADAS


def test_chave_na_url_abre_as_ferramentas(cliente):
    """A forma que o painel de conectores do claude.ai permite: so a URL."""
    resposta = cliente.post("/mcp/chave-a", json=pedido("tools/list"), headers=CABECALHOS)
    assert resposta.status_code == 200
    assert len(resultado(resposta)["tools"]) == FERRAMENTAS_ESPERADAS


def test_cabecalho_vence_a_url(cliente):
    """Com as duas formas presentes, vale a que nao vaza em log."""
    resposta = cliente.post(
        "/mcp/chave-invalida",
        json=pedido("tools/list"),
        headers={**CABECALHOS, "Authorization": "Bearer chave-a"},
    )
    assert resposta.status_code == 200


def test_caminho_mais_fundo_nao_e_chave(cliente):
    """`/mcp/a/b` nao e chave com barra: e caminho que este servidor nao serve."""
    resposta = cliente.post(
        "/mcp/chave-a/sobra", json=pedido("tools/list"), headers=CABECALHOS
    )
    assert resposta.status_code == 401


def test_o_resolvedor_roda_fora_do_laco_de_eventos(acervos):
    """Ler o cofre ou buscar o JWKS no laco pararia o processo inteiro."""
    import asyncio

    no_laco: list[bool] = []

    def resolvedor(chave: str):
        try:
            asyncio.get_running_loop()
            no_laco.append(True)
        except RuntimeError:
            no_laco.append(False)
        return acervos.get(chave)

    externo = Starlette(routes=[])
    remoto.montar(externo, resolvedor)
    with TestClient(externo, base_url=LOCAL) as c:
        c.post("/mcp", json=pedido("tools/list"), headers={**CABECALHOS, "Authorization": "Bearer x"})

    assert no_laco == [False]


def test_rota_fora_do_mcp_nao_pede_chave(cliente):
    """A autenticacao veste o aplicativo inteiro, mas guarda um prefixo so."""
    assert cliente.get("/api/saude").status_code == 200


# --- de quem sao os dados -----------------------------------------------------


def criar_problema(cliente, chave: str, nome: str) -> dict:
    return conteudo(
        cliente.post(
            f"/mcp/{chave}",
            json=pedido(
                "tools/call",
                name="create_problem",
                arguments={
                    "nome": nome,
                    "alternativas": ["A", "B", "C"],
                    "criterios": [
                        {"chave": "q", "nome": "Qualidade", "direcao": "max"},
                        {"chave": "c", "nome": "Custo", "direcao": "min"},
                    ],
                    "consequencias": [[0.8, 10.0], [0.9, 15.0], [0.7, 8.0]],
                },
            ),
            headers=CABECALHOS,
        )
    )


def listar_problemas(cliente, chave: str) -> list[dict]:
    return conteudo(
        cliente.post(
            f"/mcp/{chave}",
            json=pedido("tools/call", name="list_problems", arguments={}),
            headers=CABECALHOS,
        )
    )["decisoes"]


def test_a_chave_decide_onde_a_ferramenta_grava(cliente, acervos, tmp_path):
    criado = criar_problema(cliente, "chave-a", "Fornecedores")

    arquivo = acervos["chave-a"] / f"{criado['id']}.json"
    assert arquivo.exists(), "a decisao deveria ter ido para o acervo da chave"
    assert not (tmp_path / "ambiente").exists(), (
        "nada pode ter sido gravado no diretorio do ambiente: por HTTP, quem "
        "apresentou a chave decide, e a variavel de ambiente nao sobrepoe"
    )


def test_uma_chave_nao_ve_o_que_a_outra_criou(cliente, acervos):
    """O escopo isola de verdade, e nao apenas na primeira gravacao.

    Este e o teste que falharia se o escopo fosse preenchido num middleware ASGI:
    a chamada roda num task group que nao herda o contexto da requisicao, e as
    duas chaves acabariam no mesmo acervo.
    """
    criar_problema(cliente, "chave-a", "So da A")

    assert [p["nome"] for p in listar_problemas(cliente, "chave-a")] == ["So da A"]
    assert listar_problemas(cliente, "chave-b") == []


# --- o que sobra escrito ------------------------------------------------------


def test_a_chave_da_url_nao_sobrevive_no_escopo(acervos, tmp_path):
    """O registro de acesso do uvicorn e escrito depois, lendo este dicionario.

    Enquanto a autenticacao trabalhava numa copia, o roteamento via `/mcp` e o
    log gravava `/mcp/<chave>` -- ou seja, a chave de menor confianca, a que
    viaja na URL, ficava escrita em disco a cada chamada.
    """
    import anyio

    async def nada(scope, receive, send):
        pass

    guarda = remoto.Autenticacao(nada, acervos.get)
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/mcp/chave-a",
        "raw_path": b"/mcp/chave-a",
        "headers": [],
    }

    anyio.run(guarda, scope, None, None)

    assert scope["path"] == "/mcp"
    assert b"chave-a" not in scope["raw_path"]
    assert "chave-a" not in str(scope.get("path"))
    # E o escopo resolvido chegou para quem executa a ferramenta.
    assert scope[remoto.CAMPO_NO_ESCOPO] == acervos["chave-a"]


@pytest.mark.parametrize(
    "caminho",
    [
        "/mcp",
        "/mcp/",  # a documentacao do ChatGPT manda cadastrar assim
    ],
)
def test_a_barra_no_fim_e_a_mesma_rota(cliente, caminho):
    """Sem isto o roteador responde 307, e nem todo cliente MCP segue."""
    resposta = cliente.post(
        caminho,
        json=pedido("tools/list"),
        headers={**CABECALHOS, "Authorization": "Bearer chave-a"},
    )
    assert resposta.status_code == 200
    assert len(resultado(resposta)["tools"]) == FERRAMENTAS_ESPERADAS


@pytest.mark.parametrize("caminho", ["/mcp/chave-a", "/mcp/chave-a/"])
def test_a_chave_na_url_tolera_barra_no_fim(cliente, caminho):
    resposta = cliente.post(caminho, json=pedido("tools/list"), headers=CABECALHOS)
    assert resposta.status_code == 200
