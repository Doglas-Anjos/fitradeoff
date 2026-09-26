# -*- coding: utf-8 -*-
"""Os casos de teste da suite de paridade.

Cada caso roda nos dois sistemas com a **mesma politica de resposta** -- sempre
a opcao A -- e o que se compara e o numero de perguntas e o resultado.

A politica fixa nao e a resposta de um decisor real; e a unica forma de o
percurso ser reproduzivel dos dois lados. O que se verifica nao e "a
recomendacao esta certa", que depende da preferencia de quem responde, e sim que
os dois sistemas fazem as mesmas perguntas e chegam ao mesmo lugar.

Os casos crescem de proposito ate 20 alternativas: com tres ou quatro, duas
implementacoes concordam por coincidencia, porque ha poucos caminhos possiveis.
Com 20 sao 190 pares para ordenar e 2^20 subconjuntos de carteira.
"""

import math
import random

# (nome, direcao) no vocabulario do sistema oficial
Q = ("Indice de qualidade", "Maximization")
C = ("Custo unitario", "Minimization")
P = ("Prazo de entrega", "Minimization")
D = ("Durabilidade", "Maximization")
S = ("Suporte tecnico", "Maximization")

SORTING_PADRAO = {"perfis": [0.35, 0.7], "classes": ["Baixa", "Media", "Alta"]}


def espalha(n, semente):
    """``n`` alternativas sem dominancia obvia entre si.

    Cada criterio percorre uma senoide com fase propria, entao quem lidera um
    perde noutro -- e a dominancia de Pareto quase nunca resolve nada sozinha.
    O ruido pequeno quebra simetrias exatas, que produziriam empates artificiais.
    """
    rng = random.Random(semente)
    linhas = []
    for i in range(n):
        t = i / (n - 1)
        bruto = [
            0.60 + 0.35 * (0.5 + 0.5 * math.sin(6.0 * t + 0.0)),
            9.0 + 9.0 * (0.5 + 0.5 * math.sin(6.0 * t + 1.3)),
            10 + 36 * (0.5 + 0.5 * math.sin(6.0 * t + 2.6)),
            5.0 + 4.0 * (0.5 + 0.5 * math.sin(6.0 * t + 3.9)),
            5.0 + 4.0 * (0.5 + 0.5 * math.sin(6.0 * t + 5.2)),
        ]
        linhas.append([round(v * (1 + rng.uniform(-0.02, 0.02)), 3) for v in bruto])
    return linhas


def _alts(n):
    return ["Alt %02d" % (i + 1) for i in range(n)]


def _caso(chave, modulo, n, criterios, semente, **extra):
    caso = {
        "chave": chave,
        "modulo": modulo,
        "nome": "PARIDADE-" + chave,
        "alternativas": _alts(n),
        "criterios": criterios,
        "consequencias": [l[: len(criterios)] for l in espalha(n, semente)],
    }
    caso.update(extra)
    return caso


CUSTOS_20 = [40, 25, 35, 20, 30, 45, 18, 28, 33, 22,
             38, 26, 42, 19, 31, 24, 36, 21, 29, 44]

CASOS = [
    # --- pequenos: a linha de base -------------------------------------------
    {
        "chave": "escolha-dominante", "modulo": "escolha",
        "nome": "PARIDADE-escolha-dominante",
        "alternativas": ["Fornecedor A", "Fornecedor B", "Fornecedor C"],
        "criterios": [Q, C, P],
        "consequencias": [[0.95, 10.20, 12], [0.80, 14.00, 30], [0.71, 16.40, 45]],
        "porque": "uma alternativa domina as outras: a ordenacao ja basta",
    },
    {
        "chave": "escolha-minima", "modulo": "escolha",
        "nome": "PARIDADE-escolha-minima",
        "alternativas": ["Alfa", "Beta"], "criterios": [Q, C],
        "consequencias": [[0.90, 18.00], [0.60, 9.00]],
        "porque": "2x2 em conflito puro: o menor problema que ainda exige tradeoff",
    },
    {
        "chave": "ranking-cruzado", "modulo": "ranking",
        "nome": "PARIDADE-ranking-cruzado",
        "alternativas": ["Plano A", "Plano B", "Plano C"], "criterios": [Q, C, P],
        "consequencias": [[0.95, 16.0, 40], [0.70, 10.0, 38], [0.72, 15.5, 10]],
        "porque": "cada alternativa lidera um criterio: a ordem so sai das perguntas",
    },

    # --- medios ---------------------------------------------------------------
    _caso("escolha-06", "escolha", 6, [Q, C, P, D, S], 1,
          porque="cinco criterios: expoe a heuristica de ordenacao"),
    _caso("ranking-06", "ranking", 6, [Q, C, P, D, S], 1,
          porque="cinco criterios, ordem completa"),
    _caso("sorting-04", "sorting", 4, [Q, C, P], 3,
          configuracao=SORTING_PADRAO, porque="classes com fronteira folgada"),

    # --- grandes: onde coincidencia deixa de explicar -------------------------
    _caso("escolha-12", "escolha", 12, [Q, C, P, D, S], 1),
    _caso("ranking-12", "ranking", 12, [Q, C, P, D, S], 1),
    _caso("escolha-15", "escolha", 15, [Q, C, P], 2),
    _caso("ranking-15", "ranking", 15, [Q, C, P], 2),
    _caso("sorting-06", "sorting", 6, [Q, C, P, D, S], 1,
          configuracao=SORTING_PADRAO),

    # --- carteira por razao beneficio-custo -----------------------------------
    _caso("bc-08", "beneficio_custo", 8, [Q, C, P, D], 1,
          custos=[40.0, 25.0, 35.0, 20.0, 30.0, 45.0, 18.0, 28.0], orcamento=110.0),

    # --- vinte alternativas ---------------------------------------------------
    _caso("escolha-20", "escolha", 20, [Q, C, P, D, S], 7),
    _caso("ranking-20", "ranking", 20, [Q, C, P, D, S], 7),
    _caso("sorting-20", "sorting", 20, [Q, C, P, D], 7,
          configuracao=SORTING_PADRAO),
    _caso("bc-20", "beneficio_custo", 20, [Q, C, P, D], 7,
          custos=[float(x) for x in CUSTOS_20], orcamento=160.0),

    # --- degenerados: onde o oficial trava ------------------------------------
    {
        "chave": "escolha-empate", "modulo": "escolha",
        "nome": "PARIDADE-escolha-empate",
        "alternativas": ["Igual 1", "Igual 2", "Igual 3"], "criterios": [Q, C, P],
        "consequencias": [[0.80, 12.00, 20]] * 3,
        "porque": "matriz degenerada: faixa zero em todo criterio",
    },
]

POR_CHAVE = {c["chave"]: c for c in CASOS}
