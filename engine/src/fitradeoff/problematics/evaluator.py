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

# Limiar de equivalencia entre ALTERNATIVAS: diferenca maxima entre os valores
# globais de duas alternativas abaixo da qual elas podem ser consideradas
# indiferentes. E o "equivalence threshold" do sistema oficial, cujo padrao e
# 0,01 -- adotamos o mesmo para que as duas plataformas parem no mesmo ponto.
#
# Nao confundir com DEFAULT_EPSILON (domain/weights.py), que e folga de
# restricao entre constantes de escala de dois CRITERIOS. Objetos distintos.
DEFAULT_EQUIVALENCE = 0.01

# Faixa aceitavel para um limiar vindo de fora. O valor global de uma
# alternativa vive em [0, 1] -- cada criterio e normalizado para [0, 1] e os
# pesos somam 1 --, entao o limiar se le na mesma regua:
#
#   0,0  desliga a equivalencia; so a tolerancia numerica do solver sobra;
#   0,5  ja declara indiferentes duas alternativas separadas por metade de tudo
#        o que ha para separar -- dai para cima o limiar nao decide mais nada,
#        responde "tanto faz" a qualquer pergunta.
#
# Acima de 0,5 nao ha uso legitimo, e ha um engano provavel: percentual digitado
# sem dividir por cem. Recusar e mais util do que devolver "todas equivalentes".
MIN_EQUIVALENCE = 0.0
MAX_EQUIVALENCE = 0.5


class Evaluator:
    """Consultas sobre quais alternativas o espaco de pesos ainda admite."""

    def __init__(
        self, solver: LinearSolver, equivalence: float = DEFAULT_EQUIVALENCE
    ) -> None:
        self._solver = solver
        self._equivalence = equivalence

    @property
    def solver(self) -> LinearSolver:
        return self._solver

    @property
    def equivalence(self) -> float:
        """Limiar abaixo do qual duas alternativas contam como indiferentes."""
        return self._equivalence

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

    @property
    def _folga(self) -> float:
        """Quanto ``better`` pode ficar atras sem que isso conte como perder.

        E o limiar de equivalencia, com o piso da tolerancia numerica. Exigir
        vantagem em todo o espaco, ate a ultima casa, e mais rigor do que o
        decisor tem: uma desvantagem maxima de 0,009 em valor global nao e uma
        desvantagem que alguem sinta, e persegui-la custa perguntas que nao
        mudam a conclusao.

        A soma dos pesos e 1, entao a folga em valor global e comparavel a folga
        por criterio -- e por isso o atalho de Pareto abaixo pode usar a mesma.
        """
        return max(self._equivalence, TOLERANCE)

    def dominates(
        self, problem: Problem, space: WeightSpace, better: int, worse: int
    ) -> bool:
        """``better`` nunca fica mais que o limiar atras de ``worse``?"""
        if better == worse:
            return False
        folga = self._folga
        difference = problem.values[worse] - problem.values[better]
        if np.all(difference <= folga):
            return True  # dominancia de Pareto: dispensa o LP
        best = self._solver.maximize(space, difference)
        return best is not None and best <= folga

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

        # a mesma folga dos dois atalhos e do LP: se divergissem, a matriz
        # afirmaria uma dominancia que `dominates` nega, ou o contrario
        folga = self._folga

        for i in indices:
            for l in indices:
                if i == l:
                    continue
                difference = problem.values[l] - problem.values[i]
                if np.all(difference <= folga):
                    matrix[i, l] = True  # dominancia de Pareto: dispensa o LP
                elif np.any(scores[l] > scores[i] + folga):
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
        faixas = self.bounds_by_index(problem, space, range(problem.n_alternatives))
        return tuple(faixas[i] for i in range(problem.n_alternatives))

    def bounds_by_index(
        self, problem: Problem, space: WeightSpace, indices
    ) -> dict[int, Bounds]:
        """O mesmo envelope, so das alternativas pedidas, indexado por elas.

        Existe por economia, e a economia nao e marginal. Cada faixa custa dois
        LPs, e quem publica a faixa quase nunca publica todas: a tela mostra as
        que ainda estao em disputa. Numa escolha com 30 alternativas em que 3
        seguem indecisas, ``penalized_bounds`` resolvia 60 LPs para que 54
        fossem descartados no filtro seguinte -- a cada resposta do decisor.

        Devolve dicionario, e nao tupla, de proposito: uma tupla alinhada com
        ``indices`` convida a indexa-la pelo indice da alternativa, que e o
        mesmo numero com outro significado. O dicionario nao permite o engano.
        """
        indices = tuple(dict.fromkeys(indices))
        valores = {i: self._solver.bounds_of(space, problem.values[i]) for i in indices}
        if not problem.has_veto:
            return valores

        fatores = {
            i: self._solver.bounds_of(space, problem.veto_factors[i]) for i in indices
        }
        return {
            i: Bounds(
                lower=max(0.0, fatores[i].lower) * max(0.0, valores[i].lower),
                upper=max(0.0, fatores[i].upper) * max(0.0, valores[i].upper),
            )
            for i in indices
        }

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

    def are_equivalent(
        self, problem: Problem, space: WeightSpace, i: int, l: int
    ) -> bool:
        """Os valores globais de ``i`` e ``l`` ficam dentro do limiar, sempre?

        Criterio do sistema oficial: se a diferenca maxima entre os valores
        globais de duas alternativas, sobre todo o espaco de pesos viavel, nao
        passa do limiar, entao nenhuma pergunta futura vai separa-las de forma
        relevante -- e perguntar mais so cansa o decisor.

        Sao dois LPs, um por sentido: a diferenca maxima de ``i`` sobre ``l`` e
        a de ``l`` sobre ``i``. Ambas dentro do limiar significa faixas que se
        sobrepoem o bastante para nao haver o que decidir.

        Com veto declarado o teste **nao** se aplica: o valor penalizado e
        quadratico nos pesos, e o envelope conservador de ``penalized_bounds``
        e mais largo que a faixa real. Declarar indiferenca sobre um envelope
        largo esconderia uma diferenca que existe -- entao aqui o erro seguro e
        nao declarar, e seguir perguntando.
        """
        if i == l:
            return True
        if self._equivalence <= 0.0 or problem.has_veto:
            return False
        for a, b in ((i, l), (l, i)):
            gap = self._solver.maximize(space, problem.values[a] - problem.values[b])
            if gap is None or gap > self._equivalence:
                return False
        return True

    def all_equivalent(
        self, problem: Problem, space: WeightSpace, indices
    ) -> bool:
        """Todas as alternativas do conjunto sao indiferentes entre si?"""
        indices = tuple(indices)
        if len(indices) <= 1:
            return False
        return all(
            self.are_equivalent(problem, space, indices[a], indices[b])
            for a in range(len(indices))
            for b in range(a + 1, len(indices))
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
