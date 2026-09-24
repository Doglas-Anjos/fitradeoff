"""Problematica de escolha: qual alternativa recomendar.

De Almeida et al. (2016). Uma alternativa e potencialmente otima (POA) se
existe ao menos um vetor de pesos viavel que a torna a melhor de todas. O
processo termina quando resta uma unica POA.
"""

from __future__ import annotations

from ..domain.problem import Problem
from ..domain.weights import WeightSpace
from .base import Analysis, Problematic


class ChoiceProblematic(Problematic):
    key = "escolha"
    label = "Escolha da melhor alternativa"

    def _analyse(self, problem: Problem, space: WeightSpace) -> Analysis:
        poas = self.evaluator.potentially_optimal(problem, space)

        if len(poas) == 1:
            headline = f"Recomendação: {problem.alternatives[poas[0]]}."
        else:
            headline = (
                f"{len(poas)} alternativas seguem potencialmente ótimas: "
                f"{', '.join(problem.names_of(poas))}."
            )

        dominance = self.evaluator.dominance_matrix(problem, space, subset=poas)
        return Analysis(
            problematic=self.key,
            resolved=len(poas) <= 1,
            undecided=poas if len(poas) > 1 else (),
            headline=headline,
            detail={
                "potencialmente_otimas": problem.names_of(poas),
                "recomendacao": (
                    problem.alternatives[poas[0]] if len(poas) == 1 else None
                ),
                "dominancia": [
                    f"{problem.alternatives[i]} domina {problem.alternatives[l]}"
                    for i in poas
                    for l in poas
                    if dominance[i, l]
                ],
            },
        )
