"""Problematica de ranking: ordenar todas as alternativas.

Frej et al. (2019). Com informacao parcial o resultado e uma ordem *parcial*:
cada alternativa tem uma faixa de posicoes possiveis, deduzida das relacoes de
dominancia.

Se ``d`` alternativas dominam a alternativa i, ela nao pode ficar acima da
posicao ``d + 1``; se i domina ``s`` alternativas, nao pode cair abaixo de
``n - s``. Quando as duas pontas coincidem para todas, o ranking esta completo.
"""

from __future__ import annotations

import numpy as np

from ..domain.problem import Problem
from ..domain.weights import WeightSpace
from .base import Analysis, Problematic
from .veto import RESSALVA_VETO


class RankingProblematic(Problematic):
    key = "ranking"
    label = "Ordenacao completa das alternativas"
    # o veto do FITradeoff esta definido para escolha e ordenacao
    accepts_veto = True

    def _analyse(self, problem: Problem, space: WeightSpace) -> Analysis:

        dominance = self.evaluator.dominance_matrix(problem, space)
        n = problem.n_alternatives

        # Com o limiar de equivalencia a dominancia deixa de ser antissimetrica:
        # duas alternativas a menos do limiar uma da outra superam as duas. Isso
        # e empate, nao dominancia dupla, e precisa ser separado -- somado junto,
        # produzia faixa invertida, com a primeira posicao maior que a ultima.
        empate = dominance & dominance.T
        estrita = dominance & ~dominance.T

        acima = estrita.sum(axis=0)  # quantas superam cada alternativa
        abaixo = estrita.sum(axis=1)  # quantas cada alternativa supera

        positions = {}
        for i in range(n):
            positions[problem.alternatives[i]] = [
                int(acima[i]) + 1,
                n - int(abaixo[i]),
            ]

        # Indefinida e a alternativa que tem ao menos um par com quem nao se
        # ordena **nem** empata. Empatar e resultado: diz que mais perguntas nao
        # separariam as duas.
        undecided = [
            i
            for i in range(n)
            if any(
                l != i and not estrita[i, l] and not estrita[l, i] and not empate[i, l]
                for l in range(n)
            )
        ]

        resolved = not undecided
        empatados = int(empate.sum()) // 2
        if resolved:
            ordem = sorted(problem.alternatives, key=lambda a: positions[a][0])
            if empatados:
                headline = (
                    "Pré-ordem completa: "
                    + " > ".join(ordem)
                    + f". {empatados} par(es) empatam dentro do limiar de "
                    f"{self.evaluator.equivalence:g}."
                )
            else:
                headline = "Ranking completo: " + " > ".join(ordem) + "."
        else:
            headline = (
                f"Ranking parcial: {len(undecided)} alternativas ainda sem posição "
                "definida."
            )

        return Analysis(
            problematic=self.key,
            resolved=resolved,
            undecided=tuple(undecided),
            headline=headline,
            detail={
                **(
                    {"veto_ativo": True, "ressalva": RESSALVA_VETO}
                    if problem.has_veto
                    else {}
                ),
                "posicoes_possiveis": positions,
                "ordem_definida": (
                    sorted(problem.alternatives, key=lambda a: positions[a][0])
                    if resolved
                    else None
                ),
                "pares_indefinidos": self._unresolved_pairs(problem, dominance),
                # o quanto, no pior caso, uma pode superar a outra: e o que diz
                # se vale a pena continuar respondendo por aquele par
                "diferencas_maximas": self._max_differences(problem, space, dominance),
                # arestas do diagrama de Hasse: so a cobertura transitiva, pois
                # desenhar todas as relacoes deixaria o grafo ilegivel
                "dominancia_direta": self._cover(problem, dominance),
                "niveis": self._levels(problem, dominance),
            },
        )

    def _max_differences(
        self, problem: Problem, space: WeightSpace, dominance: np.ndarray
    ) -> list[dict]:
        """Maior vantagem possivel entre alternativas ainda incomparaveis.

        Uma diferenca maxima pequena significa que, mesmo no cenario mais
        favoravel, uma mal supera a outra -- e continuar perguntando sobre
        aquele par rende pouco. E a informacao que o sistema de referencia
        oferece ao lado do diagrama.

        Com veto, a diferenca maxima tambem deixa de sair de um LP: maximizar
        ``V'(a) - V'(b)`` e um problema bilinear. Vale o mesmo envelope usado na
        dominancia -- o teto de uma menos o piso da outra e um limite superior
        da vantagem possivel. Continua respondendo a pergunta que importa ("no
        maximo, quanto uma pode superar a outra?"), so que por cima: se este
        numero e pequeno, a vantagem real e menor ainda, e a conclusao de que
        nao vale a pena insistir naquele par se mantem.
        """
        if problem.has_veto:
            return self._max_differences_under_veto(problem, space, dominance)

        solver = self.evaluator.solver
        linhas = []
        for i in range(problem.n_alternatives):
            for l in range(i + 1, problem.n_alternatives):
                if dominance[i, l] or dominance[l, i]:
                    continue
                a_sobre_b = solver.maximize(space, problem.values[i] - problem.values[l])
                b_sobre_a = solver.maximize(space, problem.values[l] - problem.values[i])
                if a_sobre_b is None or b_sobre_a is None:
                    continue
                linhas.append(
                    {
                        "a": problem.alternatives[i],
                        "b": problem.alternatives[l],
                        "a_supera_b_em_ate": round(max(a_sobre_b, 0.0), 4),
                        "b_supera_a_em_ate": round(max(b_sobre_a, 0.0), 4),
                    }
                )
        # as maiores primeiro: sao os pares em que ainda ha muito em jogo
        linhas.sort(
            key=lambda d: max(d["a_supera_b_em_ate"], d["b_supera_a_em_ate"]),
            reverse=True,
        )
        return linhas

    def _max_differences_under_veto(
        self, problem: Problem, space: WeightSpace, dominance: np.ndarray
    ) -> list[dict]:
        """A mesma leitura, por envelope. Ver ``_max_differences``."""
        envelopes = self.evaluator.penalized_bounds(problem, space)
        linhas = []
        for i in range(problem.n_alternatives):
            for l in range(i + 1, problem.n_alternatives):
                if dominance[i, l] or dominance[l, i]:
                    continue
                linhas.append(
                    {
                        "a": problem.alternatives[i],
                        "b": problem.alternatives[l],
                        "a_supera_b_em_ate": round(
                            max(envelopes[i].upper - envelopes[l].lower, 0.0), 4
                        ),
                        "b_supera_a_em_ate": round(
                            max(envelopes[l].upper - envelopes[i].lower, 0.0), 4
                        ),
                        # o numero e um teto, nao a vantagem exata
                        "limite_superior": True,
                    }
                )
        linhas.sort(
            key=lambda d: max(d["a_supera_b_em_ate"], d["b_supera_a_em_ate"]),
            reverse=True,
        )
        return linhas

    def _cover(self, problem: Problem, dominance: np.ndarray) -> list[dict]:
        """Reducao transitiva: mantem a aresta i->l so quando nao existe um
        caminho i->m->l. E o que distingue um diagrama de Hasse de um emaranhado
        de setas."""
        n = problem.n_alternatives
        arestas = []
        for i in range(n):
            for l in range(n):
                if i == l or not dominance[i, l]:
                    continue
                intermediario = any(
                    m not in (i, l) and dominance[i, m] and dominance[m, l]
                    for m in range(n)
                )
                if not intermediario:
                    arestas.append(
                        {
                            "de": problem.alternatives[i],
                            "para": problem.alternatives[l],
                        }
                    )
        return arestas

    def _levels(self, problem: Problem, dominance: np.ndarray) -> list[list[str]]:
        """Agrupa as alternativas em camadas: quem ninguem domina fica no topo,
        e cada camada seguinte so entra depois das que a dominam."""
        restantes = set(range(problem.n_alternatives))
        camadas: list[list[str]] = []
        while restantes:
            topo = [
                i
                for i in restantes
                if not any(dominance[j, i] for j in restantes if j != i)
            ]
            if not topo:  # ciclo nao deveria existir, mas nao travamos por isso
                topo = sorted(restantes)
            camadas.append([problem.alternatives[i] for i in sorted(topo)])
            restantes -= set(topo)
        return camadas

    def _unresolved_pairs(self, problem: Problem, dominance: np.ndarray) -> list[str]:
        """Pares em que nenhuma das duas domina a outra -- o que falta decidir."""
        pares = []
        for i in range(problem.n_alternatives):
            for l in range(i + 1, problem.n_alternatives):
                if not dominance[i, l] and not dominance[l, i]:
                    pares.append(
                        f"{problem.alternatives[i]} vs {problem.alternatives[l]}"
                    )
        return pares
