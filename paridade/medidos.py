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
import pathlib

ARQUIVO = pathlib.Path(__file__).resolve().parent / "resultados" / "casos_medidos.json"


def comparacoes_de_ordenacao(n_criterios: int) -> int:
    """Quantas comparacoes a ordenacao par a par faz com as respostas sempre A.

    A ordenacao vive no front (``web/lib/ordenacaoPorComparacao.ts``) e segue o
    procedimento do oficial, lido nas telas dele em 30/09/2026: cada criterio
    novo e comparado com o do meio da lista ja ordenada (posicao (n-1)//2) e,
    se fica abaixo, desce um a um ate o fim. Com as respostas sempre A o novo
    sempre fica abaixo de todos, entao inserir numa lista de n custa
    ``n - (n-1)//2``. Da 1, 3, 5, 8, 11, 15 de 2 a 7 criterios -- igual a
    insercao binaria ate 6 e uma a mais com 7, que era a diferenca medida.
    """
    return sum(n - (n - 1) // 2 for n in range(1, n_criterios))


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
        "ordenacao": comparacoes_de_ordenacao(k),
        "tradeoff": len(pares),
        "pares": pares,
        "analise": servico.state(d).get("analise", {}),
    }
