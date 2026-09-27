# -*- coding: utf-8 -*-
"""Todo botao reage ao ponteiro? Medido, um por um, na tela renderizada.

Procurar `:hover` no codigo nao responde: o projeto tem controles que definem
cor em `style` inline, e ai a regra de classe existe e nao vale. O unico jeito
honesto e passar o mouse e comparar o que o navegador calcula antes e depois.
"""
import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"  # `npm run dev`
ROTAS = ["/", "/decisao", "/paridade", "/paridade/escolha", "/chat"]

LER = """(el) => {
  const s = getComputedStyle(el);
  return [s.backgroundColor, s.borderTopColor, s.color, s.boxShadow.slice(0,30),
          s.opacity, s.transform];
}"""

def rotulo(el):
    t = (el.get_attribute("aria-label") or el.inner_text() or
         el.get_attribute("title") or "").strip().replace("\n", " ")
    return (t[:38] or "(sem rotulo)")

mudos = []
total = 0

with sync_playwright() as p:
    n = p.chromium.launch()
    pg = n.new_page(viewport={"width": 1440, "height": 1000})
    for rota in ROTAS:
        pg.goto(BASE + rota, wait_until="networkidle")
        pg.wait_for_timeout(800)
        alvos = pg.locator("button, a[href], [role='button'], summary").all()
        vistos = set()
        for el in alvos:
            try:
                if not el.is_visible() or not el.is_enabled():
                    continue
                caixa = el.bounding_box()
                if not caixa or caixa["width"] < 4 or caixa["height"] < 4:
                    continue
                nome = rotulo(el)
                chave = (rota, nome, round(caixa["width"]))
                if chave in vistos:
                    continue
                vistos.add(chave)
                total += 1
                antes = el.evaluate(LER)
                el.hover(timeout=2500)
                pg.wait_for_timeout(230)
                depois = el.evaluate(LER)
                # tira o mouse de cima para nao contaminar o proximo
                pg.mouse.move(2, 2)
                pg.wait_for_timeout(60)
                if antes == depois:
                    cls = (el.get_attribute("class") or "")[:44]
                    mudos.append((rota, nome, antes[0], cls))
            except Exception:
                continue
    n.close()

print(f"{total} controles visiveis medidos; {len(mudos)} nao reagem ao ponteiro\n")
for rota, nome, fundo, cls in mudos:
    print(f"  {rota:<20} {nome:<40} fundo={fundo:<22} {cls}")
sys.exit(1 if mudos else 0)
