"""Operacoes de analise sobre alternativas, comuns as problematicas.

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
        if problem.has_veto:
            return index in self.potentially_optimal(problem, space)
        rows = self._beats_all_rows(problem.values, index)
        return self._solver.is_feasible(space, rows)

    def potentially_optimal(
        self, problem: Problem, space: WeightSpace
    ) -> tuple[int, ...]:
        """Indices das alternativas potencialmente otimas (POAs).

        Sem veto, e o teste exato do metodo: um LP por alternativa pergunta se
        existe vetor de pesos viavel que a coloque a frente de todas.

        Com veto, esse LP deixa de valer, e **nao** por imprecisao: ele responde
        sobre o valor sem penalidade, e a penalidade pode inverter a resposta.
        Uma alternativa dominada em valor por outra ainda pode ser a melhor sob
        veto, se a outra for penalizada e ela nao. Usar o LP aqui descartaria
        alternativas que o decisor ainda pode escolher -- o erro grave, porque
        some com a opcao antes de ele a ver. A leitura passa a ser a
        conservadora: e POA quem nenhuma outra domina pelo envelope.
        """
        if problem.has_veto:
            envelopes = self.penalized_bounds(problem, space)
            return tuple(
                i
                for i in range(problem.n_alternatives)
                if not any(
                    self._envelopes_separate(envelopes, l, i)
                    for l in range(problem.n_alternatives)
                    if l != i
                )
            )
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

        # Com veto declarado, o valor penalizado e quadratico nos pesos e os
        # atalhos abaixo deixam de valer: Pareto na matriz de valor nao implica
        # Pareto no valor penalizado, e o produto escalar num vertice nao e o
        # valor penalizado naquele vertice. O caminho e o envelope, que e
        # conservador e nao depende de nenhum deles.
        if problem.has_veto:
            # os envelopes saem de uma vez: sao 4n LPs, e compara-los e de graca.
            # Chamar `vetoed_dominates` par a par recalcularia tudo n^2 vezes.
            envelopes = self.penalized_bounds(problem, space)
            for i in indices:
                for l in indices:
                    matrix[i, l] = i != l and self._envelopes_separate(envelopes, i, l)
            return matrix

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
        """Faixa do valor global de cada alternativa, **sem** o veto.

        E a base do grafico de barras da avaliacao holistica, e o que a
        problematica de sorting usa para alocar alternativas em classes.

        Quem precisa da faixa que corresponde a recomendacao deve pedir
        ``penalized_bounds``: com veto declarado, publicar esta faixa ao lado de
        uma recomendacao ja penalizada seria a tela contradizendo o motor.
        """
        return tuple(
            self._solver.bounds_of(space, problem.values[i])
            for i in range(problem.n_alternatives)
        )

    def veto_bounds(self, problem: Problem, space: WeightSpace) -> tuple[Bounds, ...]:
        """Faixa do fator de veto agregado ``r(x) = SUM_i k_i z_i(x)``.

        Linear em ``k``, como o valor -- entao sai do mesmo LP, so trocando os
        coeficientes. Sem veto declarado, ``z`` e toda de uns e ``r`` e
        exatamente 1 em todo o espaco.
        """
        return tuple(
            self._solver.bounds_of(space, problem.veto_factors[i])
            for i in range(problem.n_alternatives)
        )

    def penalized_bounds(
        self, problem: Problem, space: WeightSpace
    ) -> tuple[Bounds, ...]:
        """Envelope garantido do valor penalizado pelo veto.

        O valor penalizado de de Almeida (2013) e ``V'(x) = r(x) . V(x)``, com
        ``r`` e ``V`` ambos lineares em ``k``. O produto **nao** e linear, e por
        isso o teste de dominancia sobre ``V'`` deixa de ser um LP -- minimizar
        a diferenca de duas formas quadraticas indefinidas sobre um politopo e
        programacao bilinear, NP-dificil no caso geral.

        A saida nao e amostrar. Como ``r >= 0`` e ``V >= 0`` em todo o espaco
        viavel, vale para todo ``k`` admissivel:

            r_min . V_min  <=  r(k) . V(k)  <=  r_max . V_max

        Os quatro extremos saem de LPs exatos, entao o intervalo devolvido
        **contem** a faixa verdadeira. E um envelope conservador: mais largo do
        que a faixa real, nunca mais estreito. Quem decide dominancia sobre ele
        pode deixar de declarar uma dominancia que existe, mas nunca declara uma
        que nao existe -- que e o erro que importa evitar.

        E o mesmo criterio que a carteira por razao ja usa para declarar
        dominancia so entre faixas disjuntas.
        """
        if not problem.has_veto:
            return self.value_bounds(problem, space)

        valores = self.value_bounds(problem, space)
        fatores = self.veto_bounds(problem, space)
        return tuple(
            Bounds(
                lower=max(0.0, f.lower) * max(0.0, v.lower),
                upper=max(0.0, f.upper) * max(0.0, v.upper),
            )
            for v, f in zip(valores, fatores)
        )

    @staticmethod
    def _envelopes_separate(
        envelopes: tuple[Bounds, ...], better: int, worse: int
    ) -> bool:
        """O piso de ``better`` alcanca o teto de ``worse``: faixas disjuntas."""
        return envelopes[better].lower >= envelopes[worse].upper - TOLERANCE

    def vetoed_dominates(
        self, problem: Problem, space: WeightSpace, better: int, worse: int
    ) -> bool:
        """``better`` supera ``worse`` sob o veto, com certeza.

        Criterio conservador: so afirma quando os envelopes nao se sobrepoem.
        Sem veto no problema, cai no teste exato de sempre.
        """
        if better == worse:
            return False
        if not problem.has_veto:
            return self.dominates(problem, space, better, worse)
        envelopes = self.penalized_bounds(problem, space)
        return self._envelopes_separate(envelopes, better, worse)

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
        ``seed``. Serve as duas problematicas de carteira, cuja resposta exata
        seria um problema bilinear: a amostragem de vertices e uma aproximacao, e
        esta documentada como tal em ``PortfolioProblematic`` e em
        ``BenefitCostProblematic``.
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
