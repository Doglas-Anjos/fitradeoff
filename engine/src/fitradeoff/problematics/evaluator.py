"""Operacoes de analise sobre alternativas, comuns as quatro problematicas.

Fica entre o solver (que so sabe de vetores e matrizes) e as problematicas (que
so sabem de alternativas e recomendacoes). Recebe o solver por construtor: os
testes injetam um duble e nenhuma regra precisa de mock.
"""

from __future__ import annotations

import numpy as np

from ..domain.problem import Problem
from ..domain.weights import WeightSpace
from ..solvers.base import Bounds, InfeasibleWeightSpace, LinearSolver, TOLERANCE


class Evaluator:
    """Consultas sobre quais alternativas o espaco de pesos ainda admite."""

    def __init__(self, solver: LinearSolver) -> None:
        self._solver = solver

    @property
    def solver(self) -> LinearSolver:
        return self._solver

    def is_consistent(self, space: WeightSpace) -> bool:
        """O espaco de pesos ainda e nao vazio?

        Espaco vazio significa preferencias que se contradizem: e o teste de
        inconsistencia do metodo, que sai de graca desta formulacao.
        """
        return self._solver.is_feasible(space)

    def _beats_all_rows(self, values: np.ndarray, index: int) -> np.ndarray:
        """Linhas ``(v_l - v_i) . k <= 0``: ``index`` e ao menos tao boa quanto todas."""
        return np.delete(values - values[index], index, axis=0)

    def is_potentially_optimal(
        self, problem: Problem, space: WeightSpace, index: int
    ) -> bool:
        """A alternativa e a melhor para ao menos um vetor de pesos viavel?"""
        rows = self._beats_all_rows(problem.values, index)
        return self._solver.is_feasible(space, rows)

    def potentially_optimal(
        self, problem: Problem, space: WeightSpace
    ) -> tuple[int, ...]:
        """Indices das alternativas potencialmente otimas (POAs)."""
        return tuple(
            i
            for i in range(problem.n_alternatives)
            if self.is_potentially_optimal(problem, space, i)
        )

    def dominates(
        self, problem: Problem, space: WeightSpace, better: int, worse: int
    ) -> bool:
        """``better`` supera ``worse`` para todo vetor de pesos viavel?"""
        if better == worse:
            return False
        difference = problem.values[worse] - problem.values[better]
        if np.all(difference <= TOLERANCE):
            return True  # dominancia de Pareto: dispensa o LP
        best = self._solver.maximize(space, difference)
        return best is not None and best <= TOLERANCE

    def dominance_matrix(
        self, problem: Problem, space: WeightSpace, subset=None
    ) -> np.ndarray:
        """Matriz booleana ``D[i, l] = i domina l``, sempre com forma (n, n).

        Sao n^2 LPs no caso geral, o que domina o custo do motor. ``subset``
        restringe aos pares que interessam -- em geral apenas as POAs, que e
        onde a avaliacao holistica acontece.
        """
        n = problem.n_alternatives
        indices = tuple(range(n)) if subset is None else tuple(subset)
        matrix = np.zeros((n, n), dtype=bool)

        # Refutacao barata: um unico vetor de pesos viavel em que l supera i ja
        # prova que i nao domina l. Amostrar alguns vertices custa dezenas de
        # LPs e dispensa milhares -- e e exato, porque so descarta dominancias
        # que de fato nao existem.
        try:
            vertices = np.array(
                self.sample_weight_vertices(problem, space, extra=8, seed=0)
            )
        except InfeasibleWeightSpace:
            return matrix
        scores = problem.values @ vertices.T  # (alternativas, vertices)

        for i in indices:
            for l in indices:
                if i == l:
                    continue
                difference = problem.values[l] - problem.values[i]
                if np.all(difference <= TOLERANCE):
                    matrix[i, l] = True  # dominancia de Pareto: dispensa o LP
                elif np.any(scores[l] > scores[i] + TOLERANCE):
                    continue  # refutada por um vertice: dispensa o LP
                else:
                    matrix[i, l] = self.dominates(problem, space, i, l)
        return matrix

    def value_bounds(self, problem: Problem, space: WeightSpace) -> tuple[Bounds, ...]:
        """Faixa do valor global de cada alternativa.

        E a base do grafico de barras da avaliacao holistica, e o que a
        problematica de sorting usa para alocar alternativas em classes.
        """
        return tuple(
            self._solver.bounds_of(space, problem.values[i])
            for i in range(problem.n_alternatives)
        )

    def weight_bounds(self, problem: Problem, space: WeightSpace) -> tuple[Bounds, ...]:
        """Faixa possivel de cada constante de escala."""
        bounds = []
        for j in range(problem.n_criteria):
            objective = np.zeros(problem.n_criteria)
            objective[j] = 1.0
            bounds.append(self._solver.bounds_of(space, objective))
        return tuple(bounds)

    def sample_weight_vertices(
        self, problem: Problem, space: WeightSpace, extra: int = 24, seed: int = 0
    ) -> list[np.ndarray]:
        """Vetores de peso extremos do espaco viavel.

        Maximiza cada peso isoladamente e depois direcoes aleatorias fixas por
        ``seed``. Serve a problematica de portfolio, cuja resposta exata seria um
        problema bilinear: a amostragem de vertices e uma aproximacao, e esta
        documentada como tal em ``PortfolioProblematic``.
        """
        n = problem.n_criteria
        directions = [np.eye(n)[j] for j in range(n)]
        directions += [-np.eye(n)[j] for j in range(n)]
        rng = np.random.default_rng(seed)
        directions += [rng.normal(size=n) for _ in range(extra)]

        vertices: list[np.ndarray] = []
        for direction in directions:
            vertex = self._solver.argmax(space, direction)
            if vertex is None:
                continue
            if not any(np.allclose(vertex, seen, atol=1e-9) for seen in vertices):
                vertices.append(vertex)
        if not vertices:
            raise InfeasibleWeightSpace(
                "Nao ha vetor de pesos viavel: as preferencias se contradizem."
            )
        return vertices
