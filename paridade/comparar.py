# -*- coding: utf-8 -*-
"""Roda os casos nos dois sistemas e compara perguntas e resultados.

    # so o nosso motor (nao precisa de rede nem de conta)
    python paridade/comparar.py nosso

    # o sistema oficial, quatro sessoes em paralelo
    FIT_USER=... FIT_PASS=... python paridade/comparar.py oficial

    # a tabela, a partir do que ja foi gravado
    python paridade/comparar.py tabela

    # as duas sequencias de perguntas, lado a lado, para achar onde divergem
    FIT_USER=... FIT_PASS=... python paridade/comparar.py capturar ranking-20

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


# --- as duas sequencias, lado a lado ----------------------------------------------


def _perguntas_nossas(caso):
    """Cada pergunta que o nosso motor faz: o par e o valor apresentado."""
    from fitradeoff import DecisionService, build_container

    crits = _criterios(caso)
    extra = {}
    if caso.get("custos"):
        extra = {"custos": caso["custos"],
                 "configuracao": {"orcamento": caso["orcamento"]}}
    elif caso.get("configuracao"):
        extra = {"configuracao": caso["configuracao"]}
    servico = DecisionService(build_container(epsilon=0.0))
    d = servico.create(caso["chave"], caso["alternativas"], crits,
                       caso["consequencias"], problematica=caso["modulo"], **extra)["id"]
    servico.rank_criteria(d, [c["chave"] for c in crits])

    saida = []
    while len(saida) < 80:
        q = servico.next_question(d)
        if "enunciado" not in q:
            break
        foco, rival = q.get("criterio_em_foco"), q.get("criterio_rival")
        valor = next((x.split(": ")[1] for x in map(str, q.get("opcao_a") or [])
                      if x.startswith(str(foco))), "?")
        saida.append((str(foco), str(rival), valor))
        servico.answer(d, "A")
    return saida


def _perguntas_oficiais(caso):
    """O mesmo, do lado dele: o par e o valor que a tela mostra."""
    from playwright.sync_api import sync_playwright
    import oficial

    nomes = [c[0] for c in caso["criterios"]]
    saida = []
    with sync_playwright() as p:
        browser, page = oficial.abrir(p, caso["modulo"])
        oficial.cadastra(page, caso)
        oficial.ordena(page)
        perfis = (caso.get("configuracao") or {}).get("perfis")
        if perfis:
            oficial.define_perfis(page, perfis)
        oficial.entra_decomposicao(page)
        while len(saida) < 80:
            if not oficial.visivel(page, oficial.BTN_A):
                break
            linhas = [t.strip() for t in page.inner_text("body").splitlines() if t.strip()]
            pares = [l for l in linhas if l in nomes]
            numeros = [l for l in linhas if l.replace(",", ".").replace(".", "").isdigit()
                       or (l.count(",") == 1 and l.replace(",", "").isdigit())]
            saida.append((pares[0] if pares else "?",
                          pares[1] if len(pares) > 1 else "?",
                          numeros[0] if numeros else "?"))
            page.click(oficial.BTN_A)
            page.wait_for_timeout(2600)
        browser.close()
    return saida


def capturar(chave):
    """Imprime as duas sequencias alinhadas e aponta o primeiro passo divergente.

    Foi este alinhamento que resolveu as tres divergencias ja fechadas. Nas tres
    o resultado foi o mesmo: as perguntas iniciais **identicas**, e a diferenca
    em quando cada sistema para. Saber disso muda onde se procura -- no criterio
    de parada, nao no seletor de perguntas.
    """
    caso = next(c for c in CASOS if c["chave"] == chave)
    nossas = _perguntas_nossas(caso)
    delas = _perguntas_oficiais(caso)

    print("\n%-3s %-46s %s" % ("#", "OFICIAL", "NOSSO"))
    print("-" * 104)
    divergiu = None
    for i in range(max(len(nossas), len(delas))):
        o = delas[i] if i < len(delas) else None
        n = nossas[i] if i < len(nossas) else None
        fmt = lambda x: "%s x %s @ %s" % x if x else "—"
        # o oficial arredonda para exibir, entao compara-se so o par de criterios
        igual = bool(o and n and o[0] == n[0] and o[1] == n[1])
        if not igual and divergiu is None:
            divergiu = i + 1
        print("%-3d %-46s %-42s %s" % (i + 1, fmt(o), fmt(n), "" if igual else "<<<"))
    print("-" * 104)
    print("oficial: %d perguntas   nosso: %d" % (len(delas), len(nossas)))
    if divergiu:
        print("primeiro passo divergente: %d" % divergiu)
    else:
        print("mesmas perguntas ate onde os dois foram; a diferenca e so onde param")


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
    elif modo == "capturar":
        if len(sys.argv) < 3:
            print("capturar precisa da chave de um caso")
            raise SystemExit(2)
        capturar(sys.argv[2])
    else:
        print(__doc__)
        raise SystemExit(2)


if __name__ == "__main__":
    main()
