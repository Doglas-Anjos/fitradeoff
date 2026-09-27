"""Import e export de planilha.

O sistema oficial aceita apenas `.xls` no formato 97-2003, o que hoje obriga o
decisor a converter o arquivo antes de comecar. Aqui entram `.xlsx` e `.csv`,
com o mesmo layout nos dois.

Layout (as tres primeiras linhas sao cabecalho):

    | Problema          | Qualidade | Custo | Prazo |
    | direcao           | max       | min   | min   |
    | unidade           |           | R$/un | dias  |
    | Fornecedor A      | 0.82      | 12.5  | 30    |
    | Fornecedor B      | 0.95      | 15.8  | 12    |

A celula A1 nomeia o problema. A linha `direcao` diz, para cada criterio, se
mais e melhor (`max`) ou pior (`min`) -- e o unico metadado que nao da para
inferir dos numeros, e errar nele inverte a decisao inteira.
"""

from __future__ import annotations

import csv
import io
import zipfile
from dataclasses import dataclass
from typing import Any, Iterable, Sequence

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

LINHA_DIRECAO = "direcao"
LINHA_UNIDADE = "unidade"
LINHA_CUSTO = "custo do projeto"


class PlanilhaInvalida(Exception):
    """A planilha nao tem o formato esperado."""


@dataclass(frozen=True)
class ProblemaImportado:
    nome: str
    alternativas: list[str]
    criterios: list[dict]
    consequencias: list[list[float]]
    custos: list[float] | None = None


def _texto(valor: Any) -> str:
    return "" if valor is None else str(valor).strip()


def _numero(valor: Any, alternativa: str, criterio: str) -> float:
    if valor is None or _texto(valor) == "":
        raise PlanilhaInvalida(
            f"Falta o desempenho de '{alternativa}' no criterio '{criterio}'."
        )
    try:
        # aceita tanto 1.5 quanto o 1,5 que o Excel brasileiro produz
        return float(_texto(valor).replace(",", "."))
    except ValueError as exc:
        raise PlanilhaInvalida(
            f"O desempenho de '{alternativa}' em '{criterio}' nao e um numero: "
            f"{valor!r}."
        ) from exc


def _chave(nome: str, usadas: set[str]) -> str:
    """Identificador estavel a partir do nome do criterio."""
    base = "".join(c if c.isalnum() else "_" for c in nome.lower()).strip("_")
    base = base or "criterio"
    candidato, n = base, 2
    while candidato in usadas:
        candidato, n = f"{base}_{n}", n + 1
    usadas.add(candidato)
    return candidato


def parse_linhas(linhas: Sequence[Sequence[Any]]) -> ProblemaImportado:
    """Converte as linhas cruas da planilha no problema."""
    uteis = [linha for linha in linhas if any(_texto(c) for c in linha)]
    if not uteis:
        raise PlanilhaInvalida("A planilha esta vazia.")

    # A ordem das conferencias importa: cada uma precisa rodar depois da que
    # lhe daria contexto, para que a mensagem aponte o que de fato corrigir.
    # Conferir o comprimento total primeiro produziria "faltam alternativas"
    # para uma planilha a que so falta a linha 'direcao'.
    cabecalho = uteis[0]
    nome = _texto(cabecalho[0]) or "Problema sem nome"
    nomes_criterios = [_texto(c) for c in cabecalho[1:] if _texto(c)]
    if len(nomes_criterios) < 2:
        raise PlanilhaInvalida("Declare ao menos dois criterios na primeira linha.")

    # As linhas de metadado sao procuradas pelo rotulo em qualquer posicao: na
    # pratica 'direcao' e 'unidade' vem logo abaixo do cabecalho, mas o custo do
    # projeto costuma ir para o fim, depois das alternativas.
    rotulos = {
        _texto(linha[0]).lower(): linha
        for linha in uteis[1:]
        if _texto(linha[0]).lower() in {LINHA_DIRECAO, LINHA_UNIDADE, LINHA_CUSTO}
    }
    if LINHA_DIRECAO not in rotulos:
        raise PlanilhaInvalida(
            "Falta a linha 'direcao', com 'max' ou 'min' para cada criterio. "
            "Sem ela nao da para saber se mais e melhor ou pior."
        )

    direcoes_brutas = rotulos[LINHA_DIRECAO][1 : len(nomes_criterios) + 1]
    direcoes = []
    for nome_criterio, bruta in zip(nomes_criterios, direcoes_brutas):
        valor = _texto(bruta).lower()
        if valor not in ("max", "min"):
            raise PlanilhaInvalida(
                f"A direcao do criterio '{nome_criterio}' e {bruta!r}; use "
                f"'max' (mais e melhor) ou 'min' (menos e melhor)."
            )
        direcoes.append(valor)

    unidades_linha = rotulos.get(LINHA_UNIDADE)
    unidades = (
        [_texto(c) for c in unidades_linha[1 : len(nomes_criterios) + 1]]
        if unidades_linha
        else [""] * len(nomes_criterios)
    )
    unidades += [""] * (len(nomes_criterios) - len(unidades))

    custos_linha = rotulos.get(LINHA_CUSTO)

    usadas: set[str] = set()
    criterios = [
        {
            "chave": _chave(nome_criterio, usadas),
            "nome": nome_criterio,
            "direcao": direcao,
            "unidade": unidade,
        }
        for nome_criterio, direcao, unidade in zip(
            nomes_criterios, direcoes, unidades
        )
    ]

    rotulos_cabecalho = {LINHA_DIRECAO, LINHA_UNIDADE, LINHA_CUSTO}
    alternativas: list[str] = []
    consequencias: list[list[float]] = []
    custos: list[float] = []

    for linha in uteis[1:]:
        rotulo = _texto(linha[0])
        if rotulo.lower() in rotulos_cabecalho:
            continue
        if not rotulo:
            continue
        if rotulo in alternativas:
            raise PlanilhaInvalida(f"A alternativa '{rotulo}' aparece mais de uma vez.")

        alternativas.append(rotulo)
        consequencias.append(
            [
                _numero(linha[j + 1] if j + 1 < len(linha) else None, rotulo, c["nome"])
                for j, c in enumerate(criterios)
            ]
        )

    if len(alternativas) < 2:
        raise PlanilhaInvalida("Declare ao menos duas alternativas.")

    if custos_linha is not None:
        brutos = custos_linha[1 : len(alternativas) + 1]
        custos = [_numero(v, "custo", f"projeto {i + 1}") for i, v in enumerate(brutos)]

    return ProblemaImportado(
        nome=nome,
        alternativas=alternativas,
        criterios=criterios,
        consequencias=consequencias,
        custos=custos or None,
    )


# Tetos da leitura. O de upload (2 MB) mede o arquivo comprimido, e um .xlsx de
# 1,8 MB chegou a 20 MB de XML e 380 mil linhas -- 57 s de processador para ler.
# Uma planilha legitima cabe folgada abaixo de todos: 500 alternativas, o teto
# do motor, mais as linhas de metadado.
LINHAS_UTEIS_MAX = 600
# As vazias contam a parte e com folga: a formatacao do Excel costuma deixar
# milhares delas, e recusar por isso seria recusar planilha legitima.
LINHAS_LIDAS_MAX = 20_000
COLUNAS_MAX = 64
# Soma dos tamanhos descomprimidos declarados no .zip, conferida antes de abrir.
DESCOMPRIMIDO_MAX = 20 * 1024 * 1024


def _limitadas(linhas: Iterable[Sequence[Any]]) -> list[list[Any]]:
    """As linhas com conteudo, parando assim que a planilha passar de um teto.

    Para no meio, e nao depois: a leitura e preguicosa, entao recusar na linha
    601 e nao ler as outras 379 mil.
    """
    uteis: list[list[Any]] = []
    for lidas, linha in enumerate(linhas, start=1):
        if lidas > LINHAS_LIDAS_MAX:
            raise PlanilhaInvalida(
                f"A planilha passa de {LINHAS_LIDAS_MAX} linhas. Apague as linhas "
                "vazias do fim, ou copie so a tabela para uma planilha nova."
            )
        linha = list(linha)[:COLUNAS_MAX]
        if not any(_texto(c) for c in linha):
            continue
        uteis.append(linha)
        if len(uteis) > LINHAS_UTEIS_MAX:
            raise PlanilhaInvalida(
                f"A planilha tem mais de {LINHAS_UTEIS_MAX} linhas preenchidas; o "
                "motor aceita ate 500 alternativas."
            )
    return uteis


def parse_xlsx(conteudo: bytes) -> ProblemaImportado:
    try:
        with zipfile.ZipFile(io.BytesIO(conteudo)) as pacote:
            descomprimido = sum(item.file_size for item in pacote.infolist())
    except zipfile.BadZipFile as exc:
        raise PlanilhaInvalida(
            "Nao consegui ler o arquivo como .xlsx. Se ele veio do Excel "
            "97-2003 (.xls), salve como .xlsx ou .csv antes de enviar."
        ) from exc
    if descomprimido > DESCOMPRIMIDO_MAX:
        raise PlanilhaInvalida(
            f"Aberto, o arquivo teria {descomprimido // (1024 * 1024)} MB; o limite "
            f"e {DESCOMPRIMIDO_MAX // (1024 * 1024)} MB. Copie so a tabela para "
            "uma planilha nova."
        )
    try:
        livro = load_workbook(io.BytesIO(conteudo), data_only=True, read_only=True)
    except Exception as exc:  # noqa: BLE001
        raise PlanilhaInvalida(
            "Nao consegui ler o arquivo como .xlsx. Se ele veio do Excel "
            "97-2003 (.xls), salve como .xlsx ou .csv antes de enviar."
        ) from exc
    aba = livro[livro.sheetnames[0]]
    # Em modo preguicoso o arquivo so e lido aqui, na iteracao: um XML truncado
    # ou um trecho corrompido do .zip estoura agora, e nao no `load_workbook`.
    try:
        linhas = _limitadas(aba.iter_rows(values_only=True, max_col=COLUNAS_MAX))
    except PlanilhaInvalida:
        raise
    except Exception as exc:  # noqa: BLE001
        raise PlanilhaInvalida(
            "O arquivo .xlsx esta corrompido. Abra no Excel, salve de novo e envie."
        ) from exc
    return parse_linhas(linhas)


def parse_csv(conteudo: bytes) -> ProblemaImportado:
    for codificacao in ("utf-8-sig", "latin-1"):
        try:
            texto = conteudo.decode(codificacao)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise PlanilhaInvalida("Nao consegui decodificar o arquivo como texto.")

    # o Excel brasileiro salva CSV com ponto e virgula
    amostra = texto[:4096]
    try:
        dialeto = csv.Sniffer().sniff(amostra, delimiters=",;\t")
    except csv.Error:
        dialeto = csv.excel
    return parse_linhas(_limitadas(csv.reader(io.StringIO(texto), dialeto)))


def parse(nome_arquivo: str, conteudo: bytes) -> ProblemaImportado:
    nome = (nome_arquivo or "").lower()
    if nome.endswith(".csv") or nome.endswith(".txt"):
        return parse_csv(conteudo)
    if nome.endswith(".xlsx") or nome.endswith(".xlsm"):
        return parse_xlsx(conteudo)
    if nome.endswith(".xls"):
        raise PlanilhaInvalida(
            "O formato .xls (Excel 97-2003) nao e aceito. Abra no Excel e salve "
            "como .xlsx ou .csv."
        )
    raise PlanilhaInvalida(f"Extensao nao reconhecida em '{nome_arquivo}'.")


# --- geracao ------------------------------------------------------------------

_CABECALHO = PatternFill("solid", fgColor="E1E0D9")
_NEGRITO = Font(bold=True)


def _ajustar(aba) -> None:
    for coluna in range(1, aba.max_column + 1):
        largura = max(
            (len(_texto(aba.cell(l, coluna).value)) for l in range(1, aba.max_row + 1)),
            default=10,
        )
        aba.column_dimensions[get_column_letter(coluna)].width = min(
            max(largura + 2, 10), 42
        )


def modelo() -> bytes:
    """Planilha-modelo, com um exemplo preenchido e as instrucoes ao lado."""
    livro = Workbook()
    aba = livro.active
    aba.title = "Problema"

    linhas = [
        ["Selecao de fornecedor", "Indice de qualidade", "Custo unitario", "Prazo de entrega"],
        ["direcao", "max", "min", "min"],
        ["unidade", "", "R$/un", "dias"],
        ["Fornecedor A", 0.82, 12.5, 30],
        ["Fornecedor B", 0.95, 15.8, 12],
        ["Fornecedor C", 0.71, 10.2, 45],
        ["Fornecedor D", 0.88, 14.1, 20],
    ]
    for linha in linhas:
        aba.append(linha)

    for coluna in range(1, len(linhas[0]) + 1):
        aba.cell(1, coluna).font = _NEGRITO
        aba.cell(1, coluna).fill = _CABECALHO
    for linha in (2, 3):
        aba.cell(linha, 1).font = Font(italic=True, color="52514E")
    _ajustar(aba)

    guia = livro.create_sheet("Como preencher")
    for linha in [
        ["Como preencher"],
        [],
        ["A1", "Nome do problema."],
        ["Linha 1", "Um criterio por coluna, a partir da coluna B."],
        ["Linha 'direcao'", "'max' se mais e melhor; 'min' se menos e melhor."],
        ["", "E o unico dado que nao da para inferir dos numeros, e errar"],
        ["", "nele inverte a decisao inteira."],
        ["Linha 'unidade'", "Opcional. Aparece nas perguntas e no resultado."],
        ["Demais linhas", "Uma alternativa por linha, com o desempenho real."],
        [],
        ["Carteira", "Para as problematicas de carteira (portfolio e"],
        ["", "beneficio_custo), acrescente uma linha"],
        ["", "'custo do projeto' com o custo de cada alternativa, na mesma"],
        ["", "ordem em que elas aparecem."],
        [],
        ["Formatos", "Aceitamos .xlsx e .csv. O .xls (Excel 97-2003) nao."],
    ]:
        guia.append(linha)
    guia.cell(1, 1).font = _NEGRITO
    _ajustar(guia)

    saida = io.BytesIO()
    livro.save(saida)
    return saida.getvalue()


def _aba_perguntas(livro, auditoria: dict) -> None:
    """Uma linha por ciclo: o que foi perguntado e o que foi respondido.

    A trilha narrada conta a decisao em prosa, que e bom para ler. Esta aba e
    para conferir: em qual ciclo cada resposta entrou, e em que ordem.
    """
    aba = livro.create_sheet("Perguntas")
    aba.append(["Ciclo", "Declaracao", "Autor", "Registrado em"])
    for coluna in range(1, 5):
        aba.cell(1, coluna).font = _NEGRITO
        aba.cell(1, coluna).fill = _CABECALHO
    for d in auditoria.get("declaracoes", []):
        aba.append([d["sequencia"], d["declaracao"], d["autor"], d["registrado_em"]])
    _ajustar(aba)
    aba.column_dimensions["B"].width = 95
    for linha in aba.iter_rows(min_col=2, max_col=2):
        for celula in linha:
            celula.alignment = Alignment(wrap_text=True, vertical="top")


def _aba_sensibilidade(livro, sensibilidade: dict) -> None:
    """O resultado da analise de sensibilidade sobre as consequencias."""
    aba = livro.create_sheet("Sensibilidade")
    aba.append(["Analise de sensibilidade sobre as consequencias"])
    aba.cell(1, 1).font = _NEGRITO
    aba.append([])
    aba.append(["Cenarios simulados", sensibilidade.get("cenarios")])
    aba.append(["Estabilidade", sensibilidade.get("estabilidade")])
    aba.append(["Solucao original", ", ".join(sensibilidade.get("solucao_original", []))])
    aba.append([])

    aba.append(["Criterio variado", "Para baixo (%)", "Para cima (%)"])
    for coluna in range(1, 4):
        aba.cell(aba.max_row, coluna).font = _NEGRITO
    for v in sensibilidade.get("criterios_variados", []):
        aba.append([v["criterio"], v["para_baixo"], v["para_cima"]])
    aba.append([])

    aba.append(["Alternativa", "Fracao de cenarios na solucao"])
    for coluna in range(1, 3):
        aba.cell(aba.max_row, coluna).font = _NEGRITO
    for nome, fracao in sorted(
        sensibilidade.get("frequencia", {}).items(), key=lambda x: -x[1]
    ):
        aba.append([nome, fracao])
    _ajustar(aba)


def exportar(
    problema: dict,
    estado: dict,
    auditoria: dict,
    sensibilidade: dict | None = None,
) -> bytes:
    """Exporta entrada, resultado e trilha -- cada um na sua aba.

    A trilha vai junto de proposito: um resultado sem o registro do que foi
    declarado nao se defende numa auditoria.
    """
    livro = Workbook()

    aba = livro.active
    aba.title = "Entrada"
    criterios = problema["criterios"]
    aba.append([problema["nome"]] + [c["nome"] for c in criterios])
    aba.append(["direcao"] + [c["direcao"] for c in criterios])
    aba.append(["unidade"] + [c.get("unidade", "") for c in criterios])
    for alternativa, valores in problema["consequencias"].items():
        aba.append([alternativa] + [valores[c["chave"]] for c in criterios])
    if problema.get("custos"):
        aba.append(["custo do projeto"] + list(problema["custos"].values()))
    for coluna in range(1, len(criterios) + 2):
        aba.cell(1, coluna).font = _NEGRITO
        aba.cell(1, coluna).fill = _CABECALHO
    _ajustar(aba)

    resultado = livro.create_sheet("Resultado")
    analise = estado.get("analise") or {}
    resultado.append(["Problematica", estado.get("problematica", "")])
    resultado.append(["Encerrado", "sim" if estado.get("encerrado") else "nao"])
    resultado.append(["Consistente", "sim" if estado.get("consistente") else "nao"])
    resultado.append(["Resumo", analise.get("resumo", "")])
    if analise.get("ressalva"):
        resultado.append(["Ressalva", analise["ressalva"]])
    resultado.append([])

    if estado.get("faixas_de_valor"):
        resultado.append(["Valor global possivel", "minimo", "maximo"])
        resultado.cell(resultado.max_row, 1).font = _NEGRITO
        for alternativa, (lo, hi) in estado["faixas_de_valor"].items():
            resultado.append([alternativa, lo, hi])
        resultado.append([])

    if estado.get("faixas_de_peso"):
        resultado.append(["Peso possivel por criterio", "minimo", "maximo"])
        resultado.cell(resultado.max_row, 1).font = _NEGRITO
        for criterio, (lo, hi) in estado["faixas_de_peso"].items():
            resultado.append([criterio, lo, hi])
    resultado.cell(1, 1).font = _NEGRITO
    _ajustar(resultado)

    _aba_perguntas(livro, auditoria)

    trilha = livro.create_sheet("Auditoria")
    trilha.append(["#", "Autor", "Registrado em", "Declaracao"])
    for coluna in range(1, 5):
        trilha.cell(1, coluna).font = _NEGRITO
        trilha.cell(1, coluna).fill = _CABECALHO
    for d in auditoria.get("declaracoes", []):
        trilha.append(
            [d["sequencia"], d["autor"], d["registrado_em"], d["declaracao"]]
        )
    trilha.append([])
    trilha.append(["Leitura", auditoria.get("leitura", "")])
    trilha.append(["Sobre a autoria", auditoria.get("nota_sobre_autoria", "")])
    _ajustar(trilha)
    trilha.column_dimensions["D"].width = 90
    for linha in trilha.iter_rows(min_col=4, max_col=4):
        for celula in linha:
            celula.alignment = Alignment(wrap_text=True, vertical="top")

    if sensibilidade:
        _aba_sensibilidade(livro, sensibilidade)

    saida = io.BytesIO()
    livro.save(saida)
    return saida.getvalue()
