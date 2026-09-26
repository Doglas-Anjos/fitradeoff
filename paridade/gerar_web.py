# -*- coding: utf-8 -*-
"""Transforma `resultados/*.json` no modulo que a tela de paridade lê.

    python paridade/gerar_web.py

A tela não busca isso da API de propósito. A comparação é uma **medição
datada**, não estado vivo: rodar o lado oficial leva minutos por caso e depende
de um servidor de terceiros e de uma conta. Gravar o resultado no repositório
torna a afirmação auditável -- quem duvidar roda `comparar.py` e confere o
arquivo contra o que a tela mostra.
"""

from __future__ import annotations

import datetime
import json
import pathlib
import sys

RAIZ = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(RAIZ))

from casos import CASOS  # noqa: E402

DESTINO = RAIZ.parent / "web" / "lib" / "paridade.ts"

CABECALHO = '''/** Resultados da suíte de paridade — GERADO, não editar à mão.
 *
 * Sai de `paridade/gerar_web.py`, a partir de `paridade/resultados/`. Para
 * atualizar: rode `comparar.py nosso`, `comparar.py oficial` e o gerador.
 *
 * É uma medição datada, não estado vivo: o lado oficial leva minutos por caso e
 * depende de servidor de terceiros e de conta. Por isso fica no repositório —
 * quem duvidar refaz e confere.
 */

export interface CasoParidade {
  chave: string;
  problematica: string;
  alternativas: number;
  criterios: number;
  /** `null` quando o sistema oficial não completa o caso. */
  oficial: { ordenacao: number; tradeoff: number } | null;
  nosso: { ordenacao: number; tradeoff: number };
  resumo: string;
  bate: boolean;
}

export const MEDIDO_EM = "%(data)s";

export const PARIDADE: CasoParidade[] = %(casos)s;

export const RESUMO = {
  bate: %(bate)d,
  comparaveis: %(comparaveis)d,
  travados: %(travados)d,
  maiorProblema: %(maior)d,
};
'''


def main() -> None:
    pasta = RAIZ / "resultados"
    nosso = json.loads((pasta / "nosso.json").read_text(encoding="utf-8"))
    # Sem o lado oficial o modulo ainda e gerado, com tudo marcado como nao
    # comparavel: assim a tela existe e diz a verdade -- "nao medido" -- em vez
    # de quebrar o build ou, pior, exibir numero antigo como se fosse atual.
    caminho = pasta / "oficial.json"
    oficial = json.loads(caminho.read_text(encoding="utf-8")) if caminho.exists() else {}
    if not oficial:
        print("aviso: resultados/oficial.json ausente; nada sera marcado como comparado")

    linhas, bate, comparaveis, travados = [], 0, 0, 0
    for caso in CASOS:
        chave = caso["chave"]
        o, n = oficial.get(chave, {}), nosso.get(chave, {})
        if not n:
            continue
        meu = {"ordenacao": n["steps_ordenacao"], "tradeoff": n["steps_tradeoff"]}
        travou = (not o) or bool(o.get("erro"))
        if travou:
            travados += 1
            dele, igual = None, False
        else:
            comparaveis += 1
            dele = {"ordenacao": o["steps_ordenacao"], "tradeoff": o["steps_tradeoff"]}
            igual = dele == meu
            bate += igual
        linhas.append({
            "chave": chave,
            "problematica": caso["modulo"],
            "alternativas": len(caso["alternativas"]),
            "criterios": len(caso["criterios"]),
            "oficial": dele,
            "nosso": meu,
            "resumo": n.get("resumo", "")[:180],
            "bate": igual,
        })

    DESTINO.write_text(CABECALHO % {
        "data": datetime.date.today().isoformat(),
        "casos": json.dumps(linhas, ensure_ascii=False, indent=2),
        "bate": bate,
        "comparaveis": comparaveis,
        "travados": travados,
        "maior": max(len(c["alternativas"]) for c in CASOS),
    }, encoding="utf-8")
    print("%s: %d casos (%d batem de %d comparáveis, %d travados no oficial)"
          % (DESTINO.name, len(linhas), bate, comparaveis, travados))


if __name__ == "__main__":
    main()
