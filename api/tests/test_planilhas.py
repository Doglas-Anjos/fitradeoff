"""Import e export de planilha."""

import io

import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook, load_workbook

from fitradeoff_api import create_app
from fitradeoff_api import spreadsheet
from fitradeoff_api.config import Settings

XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

LINHAS_OK = [
    ["Fornecedores", "Qualidade", "Custo", "Prazo"],
    ["direcao", "max", "min", "min"],
    ["unidade", "", "R$/un", "dias"],
    ["Fornecedor A", 0.82, 12.5, 30],
    ["Fornecedor B", 0.95, 15.8, 12],
    ["Fornecedor C", 0.71, 10.2, 45],
]


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("FITRADEOFF_DATA", str(tmp_path))
    from fitradeoff_api import deps

    deps.get_settings.cache_clear()
    app = create_app(Settings(storage=tmp_path))
    app.dependency_overrides[deps.get_settings] = lambda: Settings(storage=tmp_path)
    return TestClient(app)


def como_xlsx(linhas) -> bytes:
    livro = Workbook()
    for linha in linhas:
        livro.active.append(linha)
    saida = io.BytesIO()
    livro.save(saida)
    return saida.getvalue()


def como_csv(linhas, separador=",") -> bytes:
    return "\n".join(
        separador.join("" if c is None else str(c) for c in linha) for linha in linhas
    ).encode("utf-8")


# --- leitura ------------------------------------------------------------------


def test_le_o_layout_esperado():
    p = spreadsheet.parse_linhas(LINHAS_OK)
    assert p.nome == "Fornecedores"
    assert p.alternativas == ["Fornecedor A", "Fornecedor B", "Fornecedor C"]
    assert [c["direcao"] for c in p.criterios] == ["max", "min", "min"]
    assert [c["unidade"] for c in p.criterios] == ["", "R$/un", "dias"]
    assert p.consequencias[0] == [0.82, 12.5, 30]
    assert p.custos is None


def test_chaves_sao_derivadas_do_nome_e_nao_colidem():
    p = spreadsheet.parse_linhas(
        [
            ["X", "Custo total", "Custo total", "Prazo"],
            ["direcao", "min", "min", "min"],
            ["A", 1, 2, 3],
            ["B", 4, 5, 6],
        ]
    )
    chaves = [c["chave"] for c in p.criterios]
    assert chaves == ["custo_total", "custo_total_2", "prazo"]


def test_aceita_virgula_decimal_do_excel_brasileiro():
    p = spreadsheet.parse_linhas(
        [
            ["X", "A", "B"],
            ["direcao", "max", "min"],
            ["Alt 1", "0,82", "12,5"],
            ["Alt 2", "0,95", "15,8"],
        ]
    )
    assert p.consequencias[0] == [0.82, 12.5]


def test_linha_de_custo_alimenta_o_portfolio():
    p = spreadsheet.parse_linhas(LINHAS_OK + [["custo do projeto", 10, 12, 8]])
    assert p.custos == [10.0, 12.0, 8.0]
    assert "custo do projeto" not in p.alternativas


def test_linhas_vazias_sao_ignoradas():
    com_buracos = [LINHAS_OK[0], [], LINHAS_OK[1], LINHAS_OK[2], [], *LINHAS_OK[3:]]
    assert len(spreadsheet.parse_linhas(com_buracos).alternativas) == 3


@pytest.mark.parametrize(
    "linhas,esperado",
    [
        ([["X", "A", "B"], ["direcao", "max", "min"]], "ao menos duas alternativas"),
        # falta so a linha direcao: a mensagem tem que dizer isso, nao
        # reclamar do numero de linhas
        (
            [["X", "A", "B"], ["p", 1, 2], ["q", 3, 4]],
            "Falta a linha 'direcao'",
        ),
        (
            [["X", "A", "B"], ["unidade", "", ""], ["p", 1, 2], ["q", 3, 4]],
            "Falta a linha 'direcao'",
        ),
        (
            [["X", "A", "B"], ["direcao", "maior", "min"], ["p", 1, 2], ["q", 3, 4]],
            "use 'max'",
        ),
        (
            [["X", "A", "B"], ["direcao", "max", "min"], ["p", 1, "abc"], ["q", 3, 4]],
            "nao e um numero",
        ),
        (
            [["X", "A", "B"], ["direcao", "max", "min"], ["p", 1], ["q", 3, 4]],
            "Falta o desempenho",
        ),
        (
            [["X", "A", "B"], ["direcao", "max", "min"], ["p", 1, 2], ["p", 3, 4]],
            "mais de uma vez",
        ),
        ([["X", "A"], ["direcao", "max"], ["p", 1], ["q", 2]], "dois criterios"),
    ],
)
def test_planilha_malformada_explica_o_problema(linhas, esperado):
    with pytest.raises(spreadsheet.PlanilhaInvalida, match=esperado):
        spreadsheet.parse_linhas(linhas)


def test_xlsx_e_csv_produzem_o_mesmo_problema():
    do_xlsx = spreadsheet.parse("x.xlsx", como_xlsx(LINHAS_OK))
    do_csv = spreadsheet.parse("x.csv", como_csv(LINHAS_OK))
    assert do_xlsx == do_csv


def test_csv_com_ponto_e_virgula():
    p = spreadsheet.parse("x.csv", como_csv(LINHAS_OK, separador=";"))
    assert len(p.alternativas) == 3


def test_xls_antigo_orienta_a_conversao():
    with pytest.raises(spreadsheet.PlanilhaInvalida, match="salve como .xlsx"):
        spreadsheet.parse("antigo.xls", b"qualquer coisa")


def test_extensao_desconhecida():
    with pytest.raises(spreadsheet.PlanilhaInvalida, match="nao reconhecida"):
        spreadsheet.parse("dados.pdf", b"x")


def test_arquivo_corrompido_nao_vaza_erro_tecnico():
    with pytest.raises(spreadsheet.PlanilhaInvalida, match="97-2003"):
        spreadsheet.parse("x.xlsx", b"isto nao e um zip")


# --- modelo -------------------------------------------------------------------


def test_modelo_e_legivel_pelo_proprio_leitor():
    """O que a plataforma entrega tem que voltar sem edicao."""
    p = spreadsheet.parse("modelo.xlsx", spreadsheet.modelo())
    assert len(p.alternativas) == 4
    assert [c["direcao"] for c in p.criterios] == ["max", "min", "min"]


def test_modelo_tem_guia_de_preenchimento():
    livro = load_workbook(io.BytesIO(spreadsheet.modelo()))
    assert "Como preencher" in livro.sheetnames


# --- rotas --------------------------------------------------------------------


def test_baixar_modelo(client):
    r = client.get("/api/modelo-planilha")
    assert r.status_code == 200
    assert r.headers["content-type"] == XLSX
    assert "modelo-fitradeoff.xlsx" in r.headers["content-disposition"]


def test_importar_cria_a_decisao(client):
    r = client.post(
        "/api/decisoes/importar",
        files={"arquivo": ("dados.xlsx", como_xlsx(LINHAS_OK), XLSX)},
    )
    assert r.status_code == 201
    corpo = r.json()
    assert corpo["nome"] == "Fornecedores"
    assert len(corpo["criterios"]) == 3
    assert corpo["criterios"][1]["unidade"] == "R$/un"


def test_importar_planilha_invalida_devolve_422_com_explicacao(client):
    ruim = [["X", "A", "B"], ["unidade", "", ""], ["p", 1, 2], ["q", 3, 4]]
    r = client.post(
        "/api/decisoes/importar",
        files={"arquivo": ("dados.csv", como_csv(ruim), "text/csv")},
    )
    assert r.status_code == 422
    assert "direcao" in r.json()["detail"]


def test_importar_arquivo_grande_demais_e_recusado(client):
    r = client.post(
        "/api/decisoes/importar",
        files={"arquivo": ("grande.csv", b"x" * (3 * 1024 * 1024), "text/csv")},
    )
    assert r.status_code == 413


def test_exportar_traz_entrada_resultado_e_auditoria(client):
    criada = client.post(
        "/api/decisoes/importar",
        files={"arquivo": ("dados.xlsx", como_xlsx(LINHAS_OK), XLSX)},
    ).json()
    pid = criada["id"]
    client.post(
        f"/api/decisoes/{pid}/ordenacao",
        json={"ordem": [c["chave"] for c in criada["criterios"]]},
    )
    client.post(f"/api/decisoes/{pid}/resposta", json={"preferencia": "A"})

    r = client.get(f"/api/decisoes/{pid}/exportar")
    assert r.status_code == 200
    livro = load_workbook(io.BytesIO(r.content))
    assert livro.sheetnames == ["Entrada", "Resultado", "Auditoria"]

    trilha = livro["Auditoria"]
    declaracoes = [trilha.cell(l, 4).value for l in range(2, trilha.max_row + 1)]
    assert any(d and "Ordenou os critérios" in d for d in declaracoes)


def test_exportacao_volta_pelo_importador(client):
    """A aba Entrada do export precisa ser reimportavel."""
    criada = client.post(
        "/api/decisoes/importar",
        files={"arquivo": ("dados.xlsx", como_xlsx(LINHAS_OK), XLSX)},
    ).json()
    exportado = client.get(f"/api/decisoes/{criada['id']}/exportar").content

    voltou = spreadsheet.parse("export.xlsx", exportado)
    assert voltou.alternativas == ["Fornecedor A", "Fornecedor B", "Fornecedor C"]
    assert [c["direcao"] for c in voltou.criterios] == ["max", "min", "min"]


def test_exportar_decisao_inexistente(client):
    assert client.get("/api/decisoes/fantasma/exportar").status_code == 404


def test_problema_traz_a_matriz_de_valor_normalizada(client):
    """Os graficos comparam valor de 0 a 1, nao a unidade original: sem este
    campo eles renderizam vazio, e nenhum outro teste percebe."""
    r = client.post(
        "/api/decisoes",
        json={
            "nome": "t",
            "alternativas": ["A", "B", "C"],
            "criterios": [
                {"chave": "q", "nome": "Q", "direcao": "max"},
                {"chave": "c", "nome": "C", "direcao": "min"},
            ],
            "consequencias": [[0.0, 30.0], [10.0, 10.0], [5.0, 20.0]],
        },
    )
    assert r.status_code == 201
    corpo = r.json()
    assert "valores" in corpo, "a matriz normalizada nao chegou ao cliente"

    valores = corpo["valores"]
    assert set(valores) == {"A", "B", "C"}
    # maior e melhor: A e o pior, B o melhor
    assert valores["A"]["q"] == 0.0 and valores["B"]["q"] == 1.0
    # menor e melhor: a direcao inverte
    assert valores["A"]["c"] == 0.0 and valores["B"]["c"] == 1.0
    # o intermediario fica no meio
    assert valores["C"]["q"] == pytest.approx(0.5)
    for linha in valores.values():
        for v in linha.values():
            assert 0.0 <= v <= 1.0
