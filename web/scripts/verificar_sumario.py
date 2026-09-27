# -*- coding: utf-8 -*-
"""O sumário acompanha a rolagem, e chega no último item.

O defeito que este roteiro existe para impedir: a regra anterior escolhia a
primeira seção visível, e no fim da página as duas últimas estão na tela ao
mesmo tempo — a de cima sempre ganhava e o item 09 nunca acendia.
"""
import sys

from playwright.sync_api import sync_playwright

problemas = []

with sync_playwright() as p:
    n = p.chromium.launch()
    pg = n.new_page(viewport={"width": 1600, "height": 950})
    pg.goto("http://localhost:3000/paridade", wait_until="networkidle")
    pg.wait_for_timeout(1500)

    ativa = """() => { const a = document.querySelector('[data-ativa="true"]');
        return a ? (a.textContent || '').trim() : '(nenhuma)'; }"""
    ids = pg.evaluate("""() => [...document.querySelectorAll('aside nav a')]
        .map(a => a.getAttribute('href').slice(1))""")
    print(f"{len(ids)} seções: {ids}")

    # cada seção, levada ao topo, tem de acender a sua própria linha
    for i, sid in enumerate(ids):
        pg.evaluate(
            "(id) => { const el = document.getElementById(id);"
            "window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 100); }",
            sid,
        )
        pg.wait_for_timeout(420)
        marcada = pg.evaluate(ativa)
        esperado = str(i + 1).zfill(2)
        ok = marcada.startswith(esperado)
        print(f"  {esperado} -> {marcada!r} {'ok' if ok else 'ERRADO'}")
        if not ok:
            problemas.append(f"seção {sid}: marcou {marcada!r}, esperava começar com {esperado}")

    # e o caso que quebrava: rolar até o fim de tudo
    pg.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)")
    pg.wait_for_timeout(600)
    fim = pg.evaluate(ativa)
    ultimo = str(len(ids)).zfill(2)
    print(f"\nno fim da página: {fim!r} (esperado começar com {ultimo})")
    if not fim.startswith(ultimo):
        problemas.append(f"no fim da página marcou {fim!r}, e não o último item")

    # de volta ao topo
    pg.evaluate("window.scrollTo(0, 0)")
    pg.wait_for_timeout(500)
    topo = pg.evaluate(ativa)
    print(f"de volta ao topo: {topo!r}")
    if not topo.startswith("01"):
        problemas.append(f"no topo marcou {topo!r}, e não o primeiro item")
    n.close()

print()
if problemas:
    print("PROBLEMAS:")
    for x in problemas:
        print("  -", x)
    sys.exit(1)
print("o sumário acompanha a rolagem em todas as seções, inclusive a última")
