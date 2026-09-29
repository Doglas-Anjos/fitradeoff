# -*- coding: utf-8 -*-
"""Os casos medidos no oficial alem dos 16 lineares de `casos.py`.

`resultados/casos_medidos.json` guarda, de cada um, tudo o que refaz o nosso
lado -- matriz, niveis, curvas, respostas -- e o que o oficial fez: as contagens
e, quando capturada, a sequencia de pares. O nosso lado nao e gravado: `roda`
o recalcula com o motor atual, para a tela e os testes nunca mostrarem numero
velho. "entre-niveis" e a tela propria de criterio discreto do oficial.
"""

from __future__ import annotations

import json
import math
import pathlib

ARQUIVO = pathlib.Path(__file__).resolve().parent / "resultados" / "casos_medidos.json"


def carregar() -> list[dict]:
    return json.loads(ARQUIVO.read_text(encoding="utf-8"))


def roda(caso: dict) -> dict:
    """O nosso lado de um caso: contagens, sequencia de pares e analise final."""
    from fitradeoff import DecisionService, build_container

    extra = {}
    if caso.get("custos"):
        extra = {"custos": caso["custos"], "configuracao": {"orcamento": caso["orcamento"]}}
    elif caso.get("configuracao"):
        extra = {"configuracao": caso["configuracao"]}
    servico = DecisionService(build_container(epsilon=0.0))
    d = servico.create(caso["chave"], caso["alternativas"], caso["criterios"],
                       caso["consequencias"], problematica=caso["problematica"], **extra)["id"]
    for chave, pontos in (caso.get("curvas") or {}).items():
        servico.set_value_curve(d, chave, pontos)
    servico.rank_criteria(d, [c["chave"] for c in caso["criterios"]])

    niveis = {c["nome"]: c.get("niveis") for c in caso["criterios"]}
    respostas = (caso.get("respostas") or "") + "A" * 200
    pares: list = []
    while len(pares) < 150:
        q = servico.next_question(d)
        if "enunciado" not in q:
            break
        foco = q["criterio_em_foco"]
        valor = float(q["opcao_a"][0].split(": ")[1].split(" ")[0])
        if caso.get("curvas") and niveis.get(foco) and valor not in niveis[foco]:
            pares.append("entre-niveis")
        else:
            pares.append([foco, q["criterio_rival"]])
        servico.answer(d, respostas[len(pares) - 1])
    k = len(caso["criterios"])
    return {
        # a ordenacao par a par vive no front (insercao com busca binaria)
        "ordenacao": sum(math.ceil(math.log2(i + 1)) for i in range(1, k)),
        "tradeoff": len(pares),
        "pares": pares,
        "analise": servico.state(d).get("analise", {}),
    }
