# -*- coding: utf-8 -*-
"""Dirige o FITradeoff oficial (CDSID/UFPE) por Playwright.

O sistema de referencia e um app **IntraWeb** (Delphi/ISAPI), e isso condiciona
tudo o que esta aqui. Tres licoes que custaram caro e estao codificadas:

1. **A URL obvia nao e o app.** `/fitradeoff/` devolve uma tela de erro
   ("Device not supported") -- e o User-Agent sendo recusado, nao o sistema
   fora do ar. A entrada e `/fitradeoff/fitradeoff.dll/`, e o bootstrap mede o
   viewport por JavaScript antes de abrir sessao. Requisicao HTTP direta nao
   serve; precisa de navegador com User-Agent de navegador.

2. **O clique some no meio da acao.** Cada clique dispara um re-render completo
   e o proprio botao desaparece; o Playwright chama isso de timeout embora o
   clique tenha funcionado. Por isso `avanca()` nunca verifica o clique:
   verifica o **avanco para a tela seguinte**.

3. **Espera por relogio nao sobrevive a concorrencia.** Com quatro sessoes o
   servidor fica lento e um sleep calibrado para uma sessao estoura na tela
   errada. Todas as esperas aqui sao por condicao.

Endereco vem de `FIT_BASE_URL` e credenciais de `FIT_USER`/`FIT_PASS`; o
endereco e de terceiros e as credenciais sao suas -- ficam no `.env`, nunca
no repositorio.
"""

from __future__ import annotations

import os

BASE = os.environ.get("FIT_BASE_URL", "")  # endereco do oficial; vem do .env
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36")
ESPERA = 90000

MODULOS = {
    "escolha": "#RDBCHOICE_INPUT",
    "ranking": "#RDBRANKING_INPUT",
    "sorting": "#RDBSORTING_INPUT",
    "portfolio": "#RDBCP_INPUT",
    "beneficio_custo": "#RDBPORCB_INPUT",
}

FIM_ORDEM = "Do you agree with the final order found"
FIM_RESULTADO = ("A Solution has been found", "complete order has been found",
                 "complete pre-order has been found", "Results")
ROTULO_DECOMP = "Elicitation by Decomposition"
BTN_A = 'input[value="A"]'
TETO = 80


# --- primitivas ----------------------------------------------------------------


def _habilitado(page, sel, tempo=ESPERA):
    page.wait_for_function(
        "sel => { const e = document.querySelector(sel);"
        " return e && !e.disabled && e.offsetParent !== null; }",
        arg=sel, timeout=tempo)


def _existe(sel):
    return ("() => { const e = document.querySelector('%s');"
            " return !!e && !e.disabled && e.offsetParent !== null; }" % sel)


def visivel(page, sel):
    """Visivel **e** habilitado: o IntraWeb deixa botao na tela mas disabled."""
    try:
        if page.locator(sel).count() == 0:
            return False
        e = page.locator(sel).first
        return e.is_visible() and e.is_enabled()
    except Exception:
        return False


def avanca(page, sel, condicao, descricao, tentativas=4, tempo=45000):
    """Clica e espera a tela seguinte. O timeout do clique e ignorado."""
    _habilitado(page, sel)
    for tentativa in range(tentativas):
        try:
            page.click(sel, timeout=6000)
        except Exception:
            pass  # o re-render some com o botao; so a condicao decide
        try:
            page.wait_for_function(condicao, timeout=tempo)
            return
        except Exception:
            if tentativa == tentativas - 1:
                raise TimeoutError(
                    "apos clicar em %s nao chegamos em: %s" % (sel, descricao))
            page.wait_for_timeout(2000)


# --- sessao ---------------------------------------------------------------------


def abrir(p, modulo, headless=True):
    """Loga, escolhe o modulo e devolve (browser, page) na tela de origem."""
    browser = p.chromium.launch(headless=headless)
    page = browser.new_context(
        user_agent=UA, viewport={"width": 1440, "height": 900}).new_page()
    page.goto(BASE, wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(2500)
    page.click("#BTNLOGIN")
    page.wait_for_selector("#EDTEMAIL", state="visible", timeout=ESPERA)
    page.fill("#EDTEMAIL", os.environ["FIT_USER"])
    page.fill("#EDTSENHA", os.environ["FIT_PASS"])
    page.click("#BTNENTER")
    page.wait_for_selector(MODULOS[modulo], state="visible", timeout=ESPERA)
    page.click(MODULOS[modulo])
    page.wait_for_timeout(1200)
    page.click("#IWBUTTON5")

    # O Portfolio Combinatorial roda noutro deploy e pede login de novo.
    page.wait_for_timeout(5000)
    if page.locator("#BTNLOGIN").count() > 0:
        page.wait_for_selector("#BTNLOGIN", state="visible", timeout=60000)
        page.click("#BTNLOGIN")
        page.wait_for_selector("#EDTEMAIL", state="visible", timeout=60000)
        page.fill("#EDTEMAIL", os.environ["FIT_USER"])
        page.fill("#EDTSENHA", os.environ["FIT_PASS"])
        page.click("#BTNENTER")
    page.wait_for_selector("#BTNREGISTERNEW", state="visible", timeout=ESPERA)
    return browser, page


def cadastra(page, caso):
    """Cadastro estrutural e matriz, ate a primeira comparacao par a par."""
    alts, crits = caso["alternativas"], caso["criterios"]
    custos, orcamento = caso.get("custos"), caso.get("orcamento")

    avanca(page, "#BTNREGISTERNEW", _existe("#EDTNAMEALTERNAT"), "cadastro")

    for i, a in enumerate(alts, 1):
        page.fill("#EDTNAMEALTERNAT", a)
        avanca(page, "#BTNADDALTERNATIVE",
               "() => document.querySelector('#EDTNUMBERALTERNAT')?.value === '%d'" % i,
               "contador de alternativas = %d" % i)

    for i, (nome, direcao) in enumerate(crits, 1):
        page.fill("#EDTNAMEATTRIBUT", nome)
        page.select_option("#CMBXSCALETYPE", label="Continuous")
        page.select_option("#CMBXCRITERIONDIRECTION", label=direcao)
        avanca(page, "#BTNADDATTRIBUT",
               "() => document.querySelector('#EDTNUMBERATTRIBUT')?.value === '%d'" % i,
               "contador de criterios = %d" % i)

    if custos:
        page.fill("#EDTBUDGET", str(orcamento))
    page.fill("#EDTPROJECTNAME", caso["nome"])

    # Na carteira a matriz ganha uma coluna de custo, marcada com '$'.
    largura = len(crits) + (1 if custos else 0)
    total = len(alts) * largura
    avanca(page, "#BTNSAVECADASTRO", _existe("#TIWEDIT%d" % total),
           "matriz com %d celulas" % total)

    for i in range(len(alts)):
        base = largura * i
        for j in range(len(crits)):
            page.fill("#TIWEDIT%d" % (base + j + 1), str(caso["consequencias"][i][j]))
            page.wait_for_timeout(200)
        if custos:
            page.fill("#TIWEDIT%d" % (base + largura), str(custos[i]))
            page.wait_for_timeout(200)

    avanca(page, "#BTNSAVESTART", _existe("#IWLINK1"), "Intra-Criteria Evaluation")
    avanca(page, "#IWLINK1", _existe("#BTNGOINTER"), "confirmacao de linearidade")
    avanca(page, "#BTNGOINTER", _existe("#BTNAUXSTEP1"), "Input Page")
    # Input Page: limiar de equivalencia no padrao 0,01, sem veto
    avanca(page, "#BTNAUXSTEP1", _existe("#BTNCONSEQAOC"), "comparacao par a par")


def ordena(page, log=lambda _m: None):
    """Fase 1: ordenar as constantes de escala. Responde sempre A."""
    n = 0
    while n < TETO:
        try:
            if FIM_ORDEM in page.inner_text("body"):
                break
        except Exception:
            pass
        if not visivel(page, "#BTNCONSEQAOC"):
            break
        page.click("#BTNCONSEQAOC")
        n += 1
        page.wait_for_timeout(2200)
        log("  ordenacao %d" % n)
    if visivel(page, "#BTNYPC"):          # "concorda com a ordem encontrada?"
        page.click("#BTNYPC")
        page.wait_for_timeout(6000)
    if visivel(page, "#IWBTNSTEP22"):
        page.click("#IWBTNSTEP22")
        page.wait_for_timeout(9000)
    return n


def define_perfis(page, perfis, espera=60000):
    """Sorting: a tela de perfis vem **depois** da ordenacao, nao no cadastro."""
    try:
        page.wait_for_selector("#EDTNUMCAT", state="visible", timeout=espera)
    except Exception:
        return False
    page.fill("#EDTNUMCAT", str(len(perfis) + 1))
    avanca(page, "#BTNOKNUMCAT", _existe("#EDTP1"), "campos dos perfis")
    for i, corte in enumerate(perfis, 1):
        page.fill("#EDTP%d" % i, str(corte))
        page.wait_for_timeout(600)
        try:
            page.click("#BTNSELECT", timeout=8000)
        except Exception:
            pass
        page.wait_for_timeout(2500)
    try:
        page.click("#BTNFINISH", timeout=10000)
    except Exception:
        pass
    page.wait_for_timeout(9000)
    return True


def entra_decomposicao(page, log=lambda _m: None, espera=60000):
    """Escolhe "Elicitation by Decomposition" na tela de metodo, se houver.

    Localiza pelo TEXTO: os ids mudam entre modulos (`#RDBTNEDFR` na escolha e
    no ranking, `TIWRADIOBUTTON2` em benefit-to-cost). Procurar so pelo primeiro
    fazia a tela passar batido e o laco contar zero -- lacuna de medicao
    disfarcada de resultado.
    """
    try:
        bloco = page.locator("div", has_text=ROTULO_DECOMP).last
        bloco.wait_for(state="visible", timeout=espera)
    except Exception:
        log("  (sem tela de metodo)")
        return False
    try:
        bloco.locator("input[type=radio]").last.click()
        page.wait_for_timeout(1800)
        for sel in ("#BTNOKHE0", 'input[value="Ok"]', 'input[value="Continue"]'):
            if visivel(page, sel):
                page.click(sel)
                page.wait_for_timeout(8000)
                break
        return True
    except Exception as e:
        log("  !! nao entrou na decomposicao: %s" % str(e)[:110])
        return False


def elicita(page, log=lambda _m: None):
    """Fase 2: tradeoff. Responde sempre A ate o app apresentar o resultado."""
    n = 0
    while n < TETO:
        try:
            corpo = page.inner_text("body")
        except Exception:
            corpo = ""
        if any(t in corpo for t in FIM_RESULTADO) and not visivel(page, BTN_A):
            break
        if not visivel(page, BTN_A):
            break
        page.click(BTN_A)
        n += 1
        page.wait_for_timeout(2600)
        log("  tradeoff %d" % n)
    return n


def roda(page, caso, log=lambda _m: None):
    """Percorre um caso inteiro e devolve contagens e a tela final."""
    cadastra(page, caso)
    n_ord = ordena(page, log)
    perfis = (caso.get("configuracao") or {}).get("perfis")
    if perfis:
        define_perfis(page, perfis)
    entra_decomposicao(page, log)
    n_eli = elicita(page, log)
    linhas = [t.strip() for t in page.inner_text("body").splitlines() if t.strip()]
    return {
        "chave": caso["chave"],
        "steps_ordenacao": n_ord,
        "steps_tradeoff": n_eli,
        "tela_final": " | ".join(linhas)[:2000],
    }
