# -*- coding: utf-8 -*-
"""O comparador alterna sozinho, para quando pedem, e troca pelas abas?"""
import pathlib
import sys

from playwright.sync_api import sync_playwright

SAIDA = pathlib.Path(sys.argv[1])
SAIDA.mkdir(parents=True, exist_ok=True)
problemas = []

QUAL = """() => {
  const abas = [...document.querySelectorAll('[role=tab]')].slice(0, 2);
  return abas.map(a => a.getAttribute('aria-selected')).join(',');
}"""

with sync_playwright() as p:
    n = p.chromium.launch()
    pg = n.new_page(viewport={"width": 1500, "height": 950})
    pg.goto("http://localhost:3000/paridade/escolha", wait_until="networkidle")
    pg.wait_for_timeout(1500)
    pg.locator("#telas").scroll_into_view_if_needed()
    pg.wait_for_timeout(500)
    # tira o ponteiro de cima, senão a alternância fica pausada de propósito
    pg.mouse.move(5, 5)
    pg.wait_for_timeout(400)

    inicial = pg.evaluate(QUAL)
    print(f"início: {inicial}")
    pg.screenshot(path=str(SAIDA / "comp-01.png"))

    pg.wait_for_timeout(6200)
    depois = pg.evaluate(QUAL)
    print(f"após 6s: {depois}")
    if depois == inicial:
        problemas.append("a alternância não avançou sozinha")
    pg.screenshot(path=str(SAIDA / "comp-02.png"))

    # o ponteiro dentro do quadro segura
    pg.locator(".comparador").first.hover()
    pg.wait_for_timeout(300)
    travado = pg.evaluate(QUAL)
    pg.wait_for_timeout(6200)
    if pg.evaluate(QUAL) != travado:
        problemas.append("com o ponteiro dentro, a alternância continuou")
    pg.mouse.move(5, 5)
    pg.wait_for_timeout(300)

    # a pausa explícita
    pausa = pg.get_by_role("button", name="Pausar a alternância").first
    pausa.click()
    pg.wait_for_timeout(300)
    congelado = pg.evaluate(QUAL)
    pg.wait_for_timeout(6200)
    if pg.evaluate(QUAL) != congelado:
        problemas.append("o botão de pausa não parou a alternância")
    if not pg.get_by_role("button", name="Retomar a alternância").count():
        problemas.append("o botão não virou retomar")

    # as abas trocam na mão
    abas = pg.locator("[role=tab]")
    abas.nth(0).click()
    pg.wait_for_timeout(500)
    if pg.evaluate(QUAL) != "true,false":
        problemas.append("clicar na aba 1 não mostrou a primeira")
    abas.nth(1).click()
    pg.wait_for_timeout(500)
    if pg.evaluate(QUAL) != "false,true":
        problemas.append("clicar na aba 2 não mostrou a segunda")
    pg.screenshot(path=str(SAIDA / "comp-03.png"))

    # A captura EM FOCO cai no mesmo lugar nas duas abas -- é o ponto do
    # desenho: o detalhe fica na mesma coordenada, e a diferença aparece
    # sozinha. A inativa fica deslocada de propósito, então comparar as duas ao
    # mesmo tempo mediria a animação, e não o alinhamento.
    onde = """() => { const f = [...document.querySelectorAll('#telas figure')]
        .slice(0,2).find(x => x.getAttribute('aria-hidden') === 'false');
        const r = f.getBoundingClientRect();
        return [Math.round(r.x), Math.round(r.y), Math.round(r.width)]; }"""
    abas.nth(0).click()
    pg.wait_for_timeout(700)
    primeira = pg.evaluate(onde)
    abas.nth(1).click()
    pg.wait_for_timeout(700)
    segunda = pg.evaluate(onde)
    print(f"em foco, aba 1: {primeira} | aba 2: {segunda}")
    if primeira != segunda:
        problemas.append(f"a captura em foco muda de lugar: {primeira} x {segunda}")
    n.close()

print()
if problemas:
    print("PROBLEMAS:")
    for x in problemas:
        print("  -", x)
    sys.exit(1)
print("o comparador alterna, para quando pedem, e troca pelas abas")
