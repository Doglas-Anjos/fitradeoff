# -*- coding: utf-8 -*-
"""Roda os casos nos dois sistemas e compara perguntas e resultados.

    # so o nosso motor (nao precisa de rede nem de conta)
    python paridade/comparar.py nosso

    # o sistema oficial, quatro sessoes em paralelo
    FIT_USER=... FIT_PASS=... python paridade/comparar.py oficial

    # a tabela, a partir do que ja foi gravado
    python paridade/comparar.py tabela

Cada modo grava em `paridade/resultados/`, para que a comparacao possa ser
refeita sem repetir a parte cara. Rodar o oficial leva minutos por caso: e
navegador de verdade contra um servidor de terceiros.
"""

from __future__ import annotations

import json
import pathlib
import sys
import threading
import time

RAIZ = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(RAIZ))
sys.path.insert(0, str(RAIZ.parent / "engine" / "src"))

from casos import CASOS  # noqa: E402

SAIDA = RAIZ / "resultados"
DIRECAO = {"Maximization": "max", "Minimization": "min"}
PARALELAS = 4


# --- o nosso motor ---------------------------------------------------------------


def _criterios(caso):
    return [
        {"chave": "c%d" % i, "nome": nome, "direcao": DIRECAO[direcao]}
        for i, (nome, direcao) in enumerate(caso["criterios"])
    ]


def roda_nosso(caso):
    from fitradeoff import DecisionService, build_container

    crits = _criterios(caso)
    extra = {}
    if caso.get("custos"):
        extra = {"custos": caso["custos"],
                 "configuracao": {"orcamento": caso["orcamento"]}}
    elif caso.get("configuracao"):
        extra = {"configuracao": caso["configuracao"]}

    # epsilon=0: a folga de preferencia estrita nao entra na comparacao, que e
    # sobre o limiar de equivalencia entre alternativas
    servico = DecisionService(build_container(epsilon=0.0))
    decisao = servico.create(caso["chave"], caso["alternativas"], crits,
                             caso["consequencias"], problematica=caso["modulo"],
                             **extra)["id"]
    servico.rank_criteria(decisao, [c["chave"] for c in crits])

    n = 0
    while n < 80:
        if "enunciado" not in servico.next_question(decisao):
            break
        servico.answer(decisao, "A")
        n += 1

    analise = servico.state(decisao)["analise"]
    return {
        "chave": caso["chave"],
        # a ordenacao par a par vive no front (insercao com busca binaria);
        # aqui ela e derivada, para comparar com o que o oficial pergunta
        "steps_ordenacao": sum(
            __import__("math").ceil(__import__("math").log2(k + 1))
            for k in range(1, len(crits))
        ),
        "steps_tradeoff": n,
        "resumo": analise.get("resumo", ""),
        "analise": analise,
    }


# --- o sistema oficial ------------------------------------------------------------


def roda_oficial(casos):
    from playwright.sync_api import sync_playwright
    import oficial

    inicio, trava, resultados = time.time(), threading.Lock(), {}

    def log_de(chave):
        def _(msg):
            with trava:
                print("[%6.1fs] %-20s %s" % (time.time() - inicio, chave, msg.strip()),
                      flush=True)
        return _

    def trabalha(caso):
        log = log_de(caso["chave"])
        try:
            with sync_playwright() as p:
                browser, page = oficial.abrir(p, caso["modulo"])
                r = oficial.roda(page, caso, log)
                resultados[caso["chave"]] = r
                log("FIM ord=%s tradeoff=%s" % (r["steps_ordenacao"], r["steps_tradeoff"]))
                browser.close()
        except Exception as e:
            resultados[caso["chave"]] = {
                "chave": caso["chave"],
                "erro": "%s: %s" % (type(e).__name__, str(e)[:200]),
            }
            log("EXCECAO " + str(e)[:140])

    # em lotes: cinco sessoes simultaneas funcionam, mas o servidor e de
    # terceiros e nao ha razao para castiga-lo
    for i in range(0, len(casos), PARALELAS):
        fios = [threading.Thread(target=trabalha, args=(c,))
                for c in casos[i:i + PARALELAS]]
        for f in fios:
            f.start()
        for f in fios:
            f.join()
    return resultados


# --- a tabela ---------------------------------------------------------------------


def tabela():
    oficial = json.loads((SAIDA / "oficial.json").read_text(encoding="utf-8"))
    nosso = json.loads((SAIDA / "nosso.json").read_text(encoding="utf-8"))

    print("%-22s %-14s %-14s %s" % ("caso", "OFICIAL o/t", "NOSSO o/t", ""))
    print("-" * 66)
    bate = total = travou = 0
    for caso in CASOS:
        k = caso["chave"]
        o, n = oficial.get(k, {}), nosso.get(k, {})
        nosso_txt = "%s/%s" % (n.get("steps_ordenacao"), n.get("steps_tradeoff"))
        if not o or o.get("erro"):
            travou += 1
            print("%-22s %-14s %-14s (oficial nao completou)" % (k, "erro", nosso_txt))
            continue
        total += 1
        of_txt = "%s/%s" % (o.get("steps_ordenacao"), o.get("steps_tradeoff"))
        igual = of_txt == nosso_txt
        bate += igual
        print("%-22s %-14s %-14s %s" % (k, of_txt, nosso_txt, "BATE" if igual else "difere"))
    print("-" * 66)
    print("%d de %d batem em perguntas  |  %d o oficial nao completou"
          % (bate, total, travou))


def main():
    modo = sys.argv[1] if len(sys.argv) > 1 else "tabela"
    alvo = [c for c in CASOS if len(sys.argv) < 3 or c["chave"] in sys.argv[2:]]
    SAIDA.mkdir(exist_ok=True)

    if modo == "nosso":
        r = {c["chave"]: roda_nosso(c) for c in alvo}
        for k, v in r.items():
            print("%-22s ord=%-3s tradeoff=%-3s %s"
                  % (k, v["steps_ordenacao"], v["steps_tradeoff"], v["resumo"][:70]))
        (SAIDA / "nosso.json").write_text(
            json.dumps(r, ensure_ascii=False, indent=1), encoding="utf-8")
    elif modo == "oficial":
        r = roda_oficial(alvo)
        (SAIDA / "oficial.json").write_text(
            json.dumps(r, ensure_ascii=False, indent=1), encoding="utf-8")
    elif modo == "tabela":
        tabela()
    else:
        print(__doc__)
        raise SystemExit(2)


if __name__ == "__main__":
    main()
