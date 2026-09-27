# -*- coding: utf-8 -*-
"""Texto ilegivel no tema escuro, varrido na tela em vez de procurado no codigo.

Trocar os tokens nao alcanca cor escrita direto num componente: ela fica igual
nos dois temas e some num deles. Achar isso lendo codigo e caca; aqui cada no
de texto visivel e medido contra o fundo que ele de fato tem.
"""
import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"  # `npm run dev`
ROTAS = ["/", "/decisao", "/paridade", "/paridade/escolha", "/chat"]

MEDIR = """() => {
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
  const lum = (css) => {
    const m = css.match(/\\d+(\\.\\d+)?/g); if (!m) return null;
    const [r,g,b] = m.slice(0,3).map(Number);
    const a = m.length > 3 ? Number(m[3]) : 1;
    if (a < 0.9) return null;                 // translucido: o fundo manda
    return 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b);
  };
  const fundoDe = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      const l = lum(c);
      if (l !== null) return l;
    }
    return lum(getComputedStyle(document.body).backgroundColor);
  };
  const ruins = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length) continue;                  // so folhas de texto
    const texto = (el.textContent || '').trim();
    if (!texto) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none') continue;
    if (el.closest('.sr-only') || s.position === 'absolute' && s.width === '1px') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const lt = lum(s.color), lf = fundoDe(el);
    if (lt === null || lf === null) continue;
    const razao = (Math.max(lt,lf) + 0.05) / (Math.min(lt,lf) + 0.05);
    const grande = parseFloat(s.fontSize) >= 24 ||
                   (parseFloat(s.fontSize) >= 18.66 && parseInt(s.fontWeight) >= 700);
    const alvo = grande ? 3.0 : 4.5;
    if (razao < alvo) {
      ruins.push({texto: texto.slice(0, 40), razao: +razao.toFixed(2), alvo,
                  cor: s.color, tag: el.tagName, cls: (el.className||'').toString().slice(0,40)});
    }
  }
  return ruins;
}"""

total = 0
with sync_playwright() as p:
    n = p.chromium.launch()
    for esquema in ("dark", "light"):
        pg = n.new_page(viewport={"width": 1440, "height": 1000}, color_scheme=esquema)
        print(f"\n{'='*64}\ntema {esquema}\n{'='*64}")
        for rota in ROTAS:
            pg.goto(BASE + rota, wait_until="networkidle")
            pg.wait_for_timeout(700)
            ruins = pg.evaluate(MEDIR)
            total += len(ruins)
            if not ruins:
                print(f"  {rota:<22} ok")
                continue
            print(f"  {rota:<22} {len(ruins)} abaixo do alvo")
            vistos = set()
            for r in ruins:
                chave = (r["cor"], r["alvo"])
                if chave in vistos:
                    continue
                vistos.add(chave)
                print(f"      {r['razao']:>5.2f}:1 (alvo {r['alvo']}) {r['cor']:<22} "
                      f"{r['tag']:<6} {r['texto']!r}")
        pg.close()
    n.close()
print(f"\ntotal fora do alvo: {total}")
sys.exit(0)
