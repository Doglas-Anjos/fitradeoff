"""Um usuario calculando muito nao segura os outros.

Medido antes da trava: 41 pedidos pesados de uma pessoa levaram a verificacao de
saude de outra de 5 ms para 68 s, porque os 40 trabalhadores do servidor ficaram
todos com ela. Estes testes montam a mesma situacao em miniatura.

Nenhum deles mede tempo. Os calculos da ana ficam presos num evento que so o
teste solta: se o pedido da bia termina enquanto eles continuam presos, ele nao
esperou a fila dela -- sem limiar de milissegundos que uma maquina carregada
possa estourar. Todo `wait_for` e so uma rede contra travar a suite se a trava
quebrar.
"""

import asyncio
import io
import threading
import time
import zipfile
from types import SimpleNamespace

import httpx
import jwt
import pytest
from fastapi import Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from fitradeoff import DecisionService
from fitradeoff.repositories import StorageUnavailable
from fitradeoff_api import create_app, spreadsheet
from fitradeoff_api.config import Settings
from fitradeoff_api.deps import CALCULO, CLIENTE_DESISTIU, acervo, em_vaga, translate, vaga
from fitradeoff_mcp.vagas import Vagas

EMISSOR = "https://fasorx.com.br"
SEGREDO = "segredo-compartilhado-entre-o-fasorx-e-o-fitradeoff"
REDE = 10  # segundos; so para nao travar a suite se algo quebrar


def como(pessoa: str) -> dict[str, str]:
    assinado = jwt.encode(
        {"sub": pessoa, "iss": EMISSOR, "exp": int(time.time()) + 300},
        SEGREDO,
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {assinado}"}


class Calculos:
    """Calculo falso: o da ana fica preso ate o teste soltar; o resto e imediato."""

    def __init__(self):
        self.soltar_ana = threading.Event()
        self._trava = threading.Lock()
        self.agora: dict[str, int] = {}
        self.pico: dict[str, int] = {}

    def calcular(self, pessoa: str):
        with self._trava:
            self.agora[pessoa] = self.agora.get(pessoa, 0) + 1
            self.pico[pessoa] = max(self.pico.get(pessoa, 0), self.agora[pessoa])
        if pessoa == "ana":
            self.soltar_ana.wait(REDE)
        with self._trava:
            self.agora[pessoa] -= 1


@pytest.fixture
def servidor(tmp_path, monkeypatch):
    settings = Settings(
        storage=tmp_path / "decisoes", jwt_secret=SEGREDO, jwt_issuer=EMISSOR,
        vagas_por_pessoa=2, vagas_no_total=24, esperando_por_pessoa=8,
        espera_por_vaga=REDE,
    )
    from fitradeoff_api import deps

    deps.get_settings.cache_clear()
    app = create_app(settings)
    app.dependency_overrides[deps.get_settings] = lambda: settings

    calculos = Calculos()

    def pergunta_falsa(self, decisao_id):
        # o id da decisao diz de quem e o pedido
        calculos.calcular(decisao_id.split("-")[0])
        return {"pergunta": None}

    monkeypatch.setattr(DecisionService, "next_question", pergunta_falsa)
    yield app, calculos
    calculos.soltar_ana.set()


def _rodar(app, cenario):
    async def dentro():
        transporte = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transporte, base_url="http://127.0.0.1:8000", timeout=REDE
        ) as c:
            return await cenario(c)

    return asyncio.run(dentro())


def _pergunta(c, pessoa):
    return c.get(f"/api/decisoes/{pessoa}-1/pergunta", headers=como(pessoa))


def test_quem_chega_nao_espera_a_fila_de_outra_pessoa(servidor):
    app, calculos = servidor

    async def cenario(c):
        # 2 rodando e 8 esperando: o maximo que a ana pode ter
        ana = [asyncio.create_task(_pergunta(c, "ana")) for _ in range(10)]
        try:
            while calculos.agora.get("ana", 0) < 2:
                await asyncio.sleep(0.01)

            # tudo isto acontece com os calculos da ana presos
            da_bia = await asyncio.wait_for(_pergunta(c, "bia"), REDE)
            lista = await asyncio.wait_for(c.get("/api/decisoes", headers=como("ana")), REDE)
            decima_primeira = await asyncio.wait_for(_pergunta(c, "ana"), REDE)
            ainda_presos = calculos.agora["ana"]
        finally:
            calculos.soltar_ana.set()
        return da_bia, lista, decima_primeira, ainda_presos, await asyncio.gather(*ana)

    da_bia, lista, decima_primeira, ainda_presos, respostas = _rodar(app, cenario)

    assert da_bia.status_code == 200
    assert ainda_presos == 2  # a bia terminou sem nenhum calculo da ana acabar
    # a listagem nao calcula, entao nao entra na fila nem da propria ana
    assert lista.status_code == 200
    # passou do teto de espera: recusa na hora, com quando tentar de novo
    assert decima_primeira.status_code == 429
    assert decima_primeira.headers["retry-after"]
    # e os dez da fila foram todos atendidos: esperar nao e recusar
    assert [r.status_code for r in respostas] == [200] * 10
    assert calculos.pico["ana"] == 2


def test_espera_longa_demais_vira_503_com_retry_after(servidor):
    app, calculos = servidor
    app.state.vagas.espera = 0.05

    async def cenario(c):
        tarefas = [asyncio.create_task(_pergunta(c, "ana")) for _ in range(3)]
        terceira = None
        try:
            feitas, _ = await asyncio.wait(tarefas, timeout=REDE, return_when=asyncio.FIRST_COMPLETED)
            terceira = feitas.pop().result()
        finally:
            calculos.soltar_ana.set()
        await asyncio.gather(*tarefas)
        return terceira

    terceira = _rodar(app, cenario)
    assert terceira.status_code == 503
    assert terceira.headers["retry-after"]


def test_pedido_de_quem_desistiu_nao_calcula():
    """Quem recarregou a pagina deixou o pedido para tras: ele devolve a vaga."""

    class Desistiu:
        app = SimpleNamespace(state=SimpleNamespace(vagas=Vagas()))

        async def is_disconnected(self):
            return True

    async def cenario():
        pedido = Desistiu()
        with pytest.raises(HTTPException) as erro:
            async with vaga(pedido, "ana"):
                pytest.fail("calculou para ninguem")
        return erro.value.status_code, pedido.app.state.vagas

    codigo, vagas = asyncio.run(cenario())
    assert codigo == CLIENTE_DESISTIU
    assert vagas.livres_no_total == vagas.no_total
    assert vagas.pessoas_ativas == 0


def test_a_vaga_volta_quando_a_rota_termina_e_nao_depois_do_envio(servidor):
    """Um cliente lento baixando a resposta nao segura vaga de calculo."""
    app, _ = servidor

    @app.get("/teste/envio-lento")
    def envio(service: DecisionService = CALCULO):
        def corpo():
            # roda durante o envio, depois de a rota ter terminado
            yield str(app.state.vagas.livres_no_total).encode()

        return StreamingResponse(corpo())

    async def cenario(c):
        return await c.get("/teste/envio-lento", headers=como("ana"))

    assert _rodar(app, cenario).text == str(app.state.vagas.no_total)


def test_chat_segura_vaga_so_durante_a_ferramenta(servidor):
    app, _ = servidor
    vistas: list[int] = []

    @app.get("/teste/ferramenta")
    def rota(request: Request, pasta=Depends(acervo)):
        rodar = em_vaga(request, pasta)
        vistas.append(app.state.vagas.livres_no_total)  # fora da ferramenta
        rodar(lambda: vistas.append(app.state.vagas.livres_no_total))  # dentro
        vistas.append(app.state.vagas.livres_no_total)
        return {}

    async def cenario(c):
        return await c.get("/teste/ferramenta", headers=como("ana"))

    assert _rodar(app, cenario).status_code == 200
    total = app.state.vagas.no_total
    assert vistas == [total, total - 1, total]


def test_o_agente_passa_cada_ferramenta_pela_vaga():
    from fitradeoff_api.agent import DecisionAgent

    chamadas = []

    def em_vaga_falsa(funcao):
        chamadas.append("vaga")
        return funcao()

    servico = SimpleNamespace(problematics=lambda: {"ok": True})
    agente = DecisionAgent(servico, api_key="x", model="m", em_vaga=em_vaga_falsa)
    assert agente._executar("listar_problematicas", {}) == {"ok": True}
    assert chamadas == ["vaga"]


def test_rotas_fora_da_fila_sao_so_as_que_nao_calculam():
    """Uma rota nova entra na fila por padrao; sair dela e decisao explicita."""
    import ast
    import pathlib

    import fitradeoff_api.routers as pacote

    leves, cruas = set(), []
    for arquivo in pathlib.Path(pacote.__file__).parent.glob("*.py"):
        fonte = arquivo.read_text(encoding="utf-8")
        # a vaga so e devolvida antes do envio via CALCULO (scope="function")
        if "Depends(get_service" in fonte:
            cruas.append(arquivo.name)
        for no in ast.walk(ast.parse(fonte)):
            if isinstance(no, ast.FunctionDef | ast.AsyncFunctionDef):
                if "LEVE" in ast.unparse(no.args):
                    leves.add(f"{arquivo.stem}.{no.name}")
    assert cruas == []
    assert leves == {
        "decisions.problematicas", "decisions.listar", "decisions.criar",
        "decisions.ver", "decisions.favorita",
        # a conversa espera o modelo; a vaga e pedida por ferramenta (em_vaga)
        "chat.conversar",
    }


def test_previa_de_planilha_exige_credencial(servidor):
    app, _ = servidor

    async def cenario(c):
        return await c.post("/api/planilhas/previa", data={"texto": "a;b;c"})

    assert _rodar(app, cenario).status_code == 401


# --- banco fora do ar -------------------------------------------------------


def test_banco_indisponivel_vira_503():
    erro = translate(StorageUnavailable("o banco nao respondeu"))
    assert erro.status_code == 503
    assert erro.headers["Retry-After"]


def test_banco_inalcancavel_na_primeira_requisicao_vira_503(tmp_path, monkeypatch):
    pytest.importorskip("psycopg")
    from fitradeoff_api.deps import montar_servico

    monkeypatch.setenv("FITRADEOFF_DB_ESPERA", "1")
    settings = Settings(
        storage=tmp_path / "d", database_url="postgresql://ninguem:x@127.0.0.1:1/nada"
    )
    with pytest.raises(HTTPException) as erro:
        montar_servico(tmp_path / "d", settings)
    assert erro.value.status_code == 503


# --- entrada nao finita -----------------------------------------------------

PROBLEMA_JSON = (
    '{"nome":"n","alternativas":["a","b","c"],"problematica":"portfolio",'
    '"criterios":[{"chave":"x","nome":"X","direcao":"max"},'
    '{"chave":"y","nome":"Y","direcao":"max"}],'
    '"consequencias":%s,"custos":%s,"configuracao":%s}'
)


@pytest.mark.parametrize(
    "consequencias,custos,configuracao,esperado",
    [
        ("[[1,2],[2,1],[3,NaN]]", "[1,1,1]", '{"orcamento":2}', 422),
        ("[[1,2],[2,1],[3,3]]", "[1,Infinity,1]", '{"orcamento":2}', 422),
        # dicionario livre: conferido no motor, que responde 409 como toda regra
        ("[[1,2],[2,1],[3,3]]", "[1,1,1]", '{"orcamento":NaN}', 409),
    ],
)
def test_numero_nao_finito_e_recusado_e_nao_gravado(tmp_path, consequencias, custos, configuracao, esperado):
    from fastapi.testclient import TestClient

    from fitradeoff_api import deps

    settings = Settings(storage=tmp_path / "d")
    deps.get_settings.cache_clear()
    app = create_app(settings)
    app.dependency_overrides[deps.get_settings] = lambda: settings
    c = TestClient(app, raise_server_exceptions=False)
    corpo = PROBLEMA_JSON % (consequencias, custos, configuracao)
    r = c.post("/api/decisoes", content=corpo, headers={"Content-Type": "application/json"})
    assert r.status_code == esperado, r.text
    assert c.get("/api/decisoes").json() == {"decisoes": []}


# --- tetos da leitura de planilha ------------------------------------------

CABECALHO = "Fornecedores;Qualidade;Custo\ndirecao;max;min\n"


def test_planilha_valida_com_muitas_linhas_vazias_no_fim_e_aceita():
    texto = CABECALHO + "A;0.8;12\nB;0.9;15\n" + ";;\n" * 5000
    lido = spreadsheet.parse("x.csv", texto.encode())
    assert lido.alternativas == ["A", "B"]


def test_planilha_com_linhas_preenchidas_demais_e_recusada():
    texto = CABECALHO + "".join(f"Alt {i};0.5;10\n" for i in range(700))
    with pytest.raises(spreadsheet.PlanilhaInvalida, match="linhas preenchidas"):
        spreadsheet.parse("x.csv", texto.encode())


def test_planilha_com_linhas_vazias_sem_fim_e_recusada():
    texto = CABECALHO + "A;0.8;12\nB;0.9;15\n" + ";;\n" * 25_000
    with pytest.raises(spreadsheet.PlanilhaInvalida, match="passa de"):
        spreadsheet.parse("x.csv", texto.encode())


def test_xlsx_que_se_abre_grande_demais_e_recusado_antes_de_ler(monkeypatch):
    from fitradeoff_api.routers.planilhas import MAX_BYTES

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as pacote:
        pacote.writestr("xl/worksheets/sheet1.xml", "<row/>" * 4_000_000)  # ~24 MB
    comprimido = buffer.getvalue()
    assert len(comprimido) < MAX_BYTES

    def nao_devia_abrir(*_a, **_k):
        raise AssertionError("a planilha foi aberta antes da checagem de tamanho")

    monkeypatch.setattr(spreadsheet, "load_workbook", nao_devia_abrir)
    with pytest.raises(spreadsheet.PlanilhaInvalida, match="MB"):
        spreadsheet.parse("x.xlsx", comprimido)


def test_xlsx_corrompido_que_so_estoura_na_leitura_vira_planilha_invalida():
    from openpyxl import Workbook

    livro = Workbook()
    livro.active.append(["Fornecedores", "Qualidade", "Custo"])
    original = io.BytesIO()
    livro.save(original)

    # mesma estrutura, com o XML da aba cortado ao meio: abrir funciona (a
    # leitura e preguicosa), e o erro so aparece ao percorrer as linhas
    danificado = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(original.getvalue())) as entrada, \
            zipfile.ZipFile(danificado, "w", zipfile.ZIP_DEFLATED) as saida:
        for item in entrada.infolist():
            dados = entrada.read(item)
            if item.filename == "xl/worksheets/sheet1.xml":
                dados = dados[: len(dados) // 2]
            saida.writestr(item, dados)

    with pytest.raises(spreadsheet.PlanilhaInvalida, match="corrompido"):
        spreadsheet.parse("x.xlsx", danificado.getvalue())
