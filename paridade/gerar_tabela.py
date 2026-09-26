# -*- coding: utf-8 -*-
"""Reescreve a tabela do EQUIVALENCIA.md a partir de `resultados/`.

Substitui o trecho entre os marcadores `inicio:tabela` e `fim:tabela`, para
poder rodar de novo a cada medicao sem duplicar nada nem exigir edicao a mao.
"""
import json, pathlib, re, sys
RAIZ = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(RAIZ))
from casos import CASOS

of = json.loads((RAIZ / "resultados" / "oficial.json").read_text(encoding="utf-8"))
no = json.loads((RAIZ / "resultados" / "nosso.json").read_text(encoding="utf-8"))

linhas = ["| Caso | Alt × Crit | Oficial `ord/tradeoff` | Nosso `ord/tradeoff` | |",
          "|---|---|---|---|---|"]
bate = total = travou = 0
for c in CASOS:
    k = c["chave"]
    o, n = of.get(k, {}), no.get(k, {})
    dim = "%d × %d" % (len(c["alternativas"]), len(c["criterios"]))
    nt = "%s/%s" % (n.get("steps_ordenacao"), n.get("steps_tradeoff"))
    if not o or o.get("erro"):
        travou += 1
        linhas.append("| `%s` | %s | **trava** | %s | oficial não completa |" % (k, dim, nt))
        continue
    total += 1
    ot = "%s/%s" % (o.get("steps_ordenacao"), o.get("steps_tradeoff"))
    igual = ot == nt
    bate += igual
    linhas.append("| `%s` | %s | %s | %s | %s |" % (
        k, dim, ot, nt, "**bate**" if igual else "difere"))

resumo = ("\n**%d de %d casos** que o sistema oficial completa batem em número de "
          "perguntas, nas duas fases — ordenação das constantes de escala e "
          "elicitação por decomposição. Em %s o oficial não completa.\n"
          % (bate, total, "%d caso" % travou if travou == 1 else "%d casos" % travou))

doc = RAIZ / "EQUIVALENCIA.md"
texto = doc.read_text(encoding="utf-8")
texto = texto.replace("<!-- TABELA -->", "\n".join(linhas) + "\n" + resumo)
doc.write_text(texto, encoding="utf-8")
print("\n".join(linhas))
print(resumo)
