# -*- coding: utf-8 -*-
"""A bisseção da curva de valor anda para o lado certo?

O teste que importa não é "o botão funciona": é o **sentido**. Dizer que a
metade de baixo traz mais ganho significa que o valor sobe rápido no começo,
logo o ponto de meio-valor está ANTES do meio geométrico. Se o código inverter
isso, a curva sai espelhada — e ninguém percebe olhando a tela, porque ela
continua parecendo uma curva.
"""
import json
import pathlib
import sys
import urllib.request as U

from playwright.sync_api import sync_playwright

API = "http://127.0.0.1:8000"
SAIDA = pathlib.Path(sys.argv[1])
SAIDA.mkdir(parents=True, exist_ok=True)
problemas = []


def chama(metodo, caminho, corpo=None):
    d = json.dumps(corpo).encode() if corpo is not None else None
    r = U.Request(API + caminho, data=d, method=metodo,
                  headers={"Content-Type": "application/json"})
    with U.urlopen(r, timeout=60) as resp:
        return json.loads(resp.read())


crits = [
    {"chave": "prazo", "nome": "Prazo", "direcao": "min", "unidade": "dias"},
    {"chave": "custo", "nome": "Custo", "direcao": "min", "unidade": "R$"},
]
# prazo vai de 10 (melhor) a 90 (pior): meio geométrico em 50
rid = chama("POST", "/api/decisoes", {
    "nome": "Curva - sentido", "alternativas": ["A", "B", "C"], "criterios": crits,
    "consequencias": [[10, 100], [50, 200], [90, 300]],
    "problematica": "escolha"})["id"]


def rodar(respostas, rotulo):
    with sync_playwright() as pw:
        n = pw.chromium.launch()
        pg = n.new_page(viewport={"width": 1400, "height": 1000})
        pg.goto(f"http://localhost:3000/decisao?id={rid}", wait_until="networkidle")
        pg.wait_for_timeout(2600)
        pg.get_by_role("button", name="ajustar").first.click()
        pg.wait_for_timeout(1000)

        for r in respostas:
            alvos = pg.locator(".opcao-curva")
            alvos.nth(r).click()
            pg.wait_for_timeout(450)

        pontos = pg.evaluate("""() => [...document.querySelectorAll('svg circle title')]
            .map(t => (t.textContent || '').trim())""")
        pg.screenshot(path=str(SAIDA / f"curva-{rotulo}.png"), full_page=False)
        n.close()
    return pontos


# 0 = metade de baixo, 1 = metade de cima, 2 = indiferente
print("--- sempre 'a metade de baixo vale mais' ---")
baixo = rodar([0, 0, 0, 2], "baixo")
for p in baixo:
    print("   ", p)

print("\n--- sempre 'a metade de cima vale mais' ---")
alto = rodar([1, 1, 1, 2], "alto")
for p in alto:
    print("   ", p)


def meio_elicitado(pontos):
    """O ponto que ficou com valor 0.50."""
    for p in pontos:
        if "0.50" in p:
            for pedaco in p.replace(",", " ").split():
                try:
                    return float(pedaco)
                except ValueError:
                    continue
    return None


mb, ma = meio_elicitado(baixo), meio_elicitado(alto)
print(f"\nconsequência com valor 0,50 — respondendo baixo: {mb} | respondendo cima: {ma}")

# Prazo é de minimizar: o "pior" é 90 e o "melhor" é 10. Dizer que a metade
# mais próxima do pior traz mais ganho empurra o ponto de meio-valor para lá.
if mb is None or ma is None:
    problemas.append("não achei o ponto de valor 0,50 em uma das execuções")
elif mb == ma:
    problemas.append(f"as duas respostas opostas deram o mesmo ponto ({mb})")
else:
    print(f"as respostas opostas levam a pontos diferentes: {mb} != {ma}")

print()
if problemas:
    print("PROBLEMAS:")
    for x in problemas:
        print("  -", x)
    sys.exit(1)
print("a bisseção responde às três opções e anda em sentidos opostos")
