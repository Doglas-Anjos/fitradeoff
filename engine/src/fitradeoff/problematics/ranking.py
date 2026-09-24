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


class RankingProblematic(Problematic):
    key = "ranking"
    label = "Ordenacao completa das alternativas"

    def _analyse(self, problem: Problem, space: WeightSpace) -> Analysis:

        dominance = self.evaluator.dominance_matrix(problem, space)
        n = problem.n_alternatives

        dominated_by = dominance.sum(axis=0)  # quantas dominam cada alternativa
        dominates = dominance.sum(axis=1)  # quantas cada alternativa domina

        positions = {}
        undecided = []
        for i in range(n):
            first = int(dominated_by[i]) + 1
            last = n - int(dominates[i])
            positions[problem.alternatives[i]] = [first, last]
            if first != last:
                undecided.append(i)

        resolved = not undecided
        if resolved:
            ordem = sorted(problem.alternatives, key=lambda a: positions[a][0])
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
        """
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
