"""Problematica de portfolio combinatorial: a carteira de maior beneficio.

Frej et al. (2021). Para um vetor de pesos fixo, o problema e uma mochila
binaria: escolher o subconjunto de maior beneficio agregado cujo custo total
cabe no orcamento.

ATENCAO -- a resposta aqui e **aproximada**, como na leitura beneficio-custo.
Com os pesos ainda incertos, decidir se um projeto pertence a algum portfolio
otimo e um problema bilevel (a escolha binaria depende dos pesos, que por sua
vez sao variaveis): nao se resolve com um LP. O que fazemos e amostrar vertices
do espaco de pesos e resolver a mochila em cada um, o que e o procedimento
pratico usual.

A consequencia precisa ser dita ao decisor: os projetos marcados como "sempre
selecionados" ou "nunca selecionados" o sao **nas amostras avaliadas**, e nao
necessariamente em todo o espaco de pesos. Aumentar ``samples`` aumenta a
confianca e o custo. A leitura beneficio-custo (``benefit_cost.py``) parte
dos mesmos dados com outro criterio -- eficiencia por unidade de recurso --
e ali as faixas de razao sao exatas; so a carteira e amostrada.
"""

from __future__ import annotations

import numpy as np

from ..domain.problem import Problem
from ..domain.weights import WeightSpace
from ..solvers.base import IntegerSolver
from .base import Analysis, Problematic
from .evaluator import Evaluator


def concordar(quantos: int, singular: str, plural: str) -> str:
    """"1 projeto" e "2 projetos" -- o numero e a palavra saem juntos."""
    return f"{quantos} {singular if quantos == 1 else plural}"


class PortfolioProblematic(Problematic):
    key = "portfolio"
    label = "Selecao de portfolio sob restricao de orcamento"

    def __init__(
        self,
        evaluator: Evaluator,
        integer_solver: IntegerSolver,
        budget: float,
        samples: int = 24,
        seed: int = 0,
    ) -> None:
        super().__init__(evaluator)
        if budget <= 0:
            raise ValueError("O orcamento deve ser positivo.")
        self._integer_solver = integer_solver
        self._budget = float(budget)
        self._samples = samples
        self._seed = seed

    def _validate(self, problem: Problem) -> None:
        costs = problem.require_costs()
        if min(costs) > self._budget:
            raise ValueError(
                f"Nenhuma alternativa cabe no orcamento de {self._budget}: "
                f"a mais barata custa {min(costs)}."
            )

    def _analyse(self, problem: Problem, space: WeightSpace) -> Analysis:

        costs = np.asarray(problem.require_costs(), dtype=float)
        vertices = self.evaluator.sample_weight_vertices(
            problem, space, extra=self._samples, seed=self._seed
        )

        carteiras: set[tuple[int, ...]] = set()
        for weights in vertices:
            benefits = problem.values @ weights
            carteiras.add(self._integer_solver.knapsack(benefits, costs, self._budget))

        contagem = np.zeros(problem.n_alternatives, dtype=int)
        for carteira in carteiras:
            for projeto in carteira:
                contagem[projeto] += 1

        total = len(carteiras)
        sempre = [i for i in range(problem.n_alternatives) if contagem[i] == total]
        nunca = [i for i in range(problem.n_alternatives) if contagem[i] == 0]
        as_vezes = [
            i for i in range(problem.n_alternatives) if 0 < contagem[i] < total
        ]

        resolved = total == 1
        if resolved:
            unica = next(iter(carteiras))
            headline = (
                f"Carteira única nas amostras: {', '.join(problem.names_of(unica))} "
                f"(custo {costs[list(unica)].sum():.2f} de {self._budget:.2f})."
            )
        else:
            headline = (
                f"{concordar(total, 'carteira distinta apareceu', 'carteiras distintas apareceram')} "
                f"nas {len(vertices)} amostras de pesos; "
                f"{concordar(len(as_vezes), 'projeto ainda oscila', 'projetos ainda oscilam')}."
            )

        return Analysis(
            problematic=self.key,
            resolved=resolved,
            undecided=tuple(as_vezes),
            headline=headline,
            detail={
                "orcamento": self._budget,
                "amostras_de_peso": len(vertices),
                "portfolios_encontrados": [
                    {
                        "projetos": problem.names_of(carteira),
                        "custo": round(float(costs[list(carteira)].sum()), 4),
                    }
                    for carteira in sorted(carteiras)
                ],
                "sempre_selecionados": problem.names_of(sempre),
                "nunca_selecionados": problem.names_of(nunca),
                "oscilam": problem.names_of(as_vezes),
                "ressalva": (
                    "Resultado aproximado por amostragem de vértices do espaço de "
                    "pesos. 'Sempre' e 'nunca' valem para as amostras avaliadas."
                ),
            },
        )
