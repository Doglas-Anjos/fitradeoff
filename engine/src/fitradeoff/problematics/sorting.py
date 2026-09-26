"""Problematica de sorting: alocar alternativas em classes ordenadas.

Kang et al. (2020). As classes sao delimitadas por perfis de referencia -- valores
globais em (0, 1) que o decisor define. Uma alternativa pertence a classe cujo
intervalo contem o seu valor global.

Com informacao parcial o valor global de cada alternativa nao e um numero, e sim
uma faixa. A alternativa fica classificada em definitivo quando essa faixa cabe
inteira dentro de uma unica classe; enquanto atravessar um perfil, a alocacao
segue indefinida.
"""

from __future__ import annotations

from ..domain.problem import Problem
from ..domain.weights import WeightSpace
from .base import Analysis, Problematic
from .portfolio import concordar


class SortingProblematic(Problematic):
    key = "sorting"
    label = "Classificacao das alternativas em classes"

    def __init__(self, evaluator, profiles=(), class_names=None) -> None:
        super().__init__(evaluator)
        self._profiles = tuple(sorted(float(p) for p in profiles))
        self._class_names = tuple(class_names) if class_names else None
        self._validate_profiles()

    def _validate_profiles(self) -> None:
        if not self._profiles:
            raise ValueError(
                "A problematica de sorting exige ao menos um perfil de referencia."
            )
        if any(not 0.0 < p < 1.0 for p in self._profiles):
            raise ValueError("Os perfis de referencia devem estar em (0, 1).")
        if len(set(self._profiles)) != len(self._profiles):
            raise ValueError("Ha perfis de referencia repetidos.")
        if self._class_names and len(self._class_names) != len(self._profiles) + 1:
            raise ValueError(
                f"{len(self._profiles)} perfis definem {len(self._profiles) + 1} "
                f"classes; foram dados {len(self._class_names)} nomes."
            )

    @property
    def n_classes(self) -> int:
        return len(self._profiles) + 1

    def class_name(self, index: int) -> str:
        if self._class_names:
            return self._class_names[index]
        return f"Classe {index + 1}"

    def _classes_for(self, lower: float, upper: float) -> tuple[int, ...]:
        """Classes que a faixa de valor ``[lower, upper]`` alcanca.

        A faixa e encolhida pelo limiar de equivalencia -- metade dele de cada
        lado -- antes de se perguntar que classes ela toca. Uma ponta que passa
        do corte por menos que isso nao conta como atravessar: e uma diferenca
        que o metodo ja declarou irrelevante, e persegui-la custa perguntas que
        nao mudam a classificacao de ninguem.

        A metade importa, e foi medida. Duas instancias do sistema oficial:

            largura  sobra menor   oficial
            0.0171     0.0083      segue perguntando
            0.0088     0.0005      classifica
            0.0401     0.0186      segue perguntando
            0.0207     0.0021      classifica

        Com o limiar inteiro (0,01) a primeira linha ja classificaria, o que
        contradiz a medida; com metade, as quatro batem. A largura da faixa nao
        serve de criterio -- 0,0207 classifica e 0,0171 nao.

        Faixa mais estreita que o limiar colapsa no meio: se o valor global nao
        pode mais ser fixado com precisao melhor que ele, ela precisa cair em
        algum lugar, e o meio e a leitura honesta.
        """
        edges = (0.0,) + self._profiles + (1.0,)
        folga = self.evaluator.equivalence / 2.0
        baixo, alto = lower + folga, upper - folga

        if baixo > alto:
            # Faixa menor que o limiar: decide pelo meio, e por **uma** classe
            # so. Colapsar para um ponto e cair no teste de sobreposicao abaixo
            # devolveria duas classes quando o meio calha de ser exatamente um
            # corte -- e a alternativa ficaria indefinida para sempre, que e o
            # oposto do que o colapso existe para fazer. Cortes pertencem a
            # classe de cima.
            meio = (lower + upper) / 2.0
            for index in range(self.n_classes - 1):
                if meio < edges[index + 1]:
                    return (index,)
            return (self.n_classes - 1,)

        reached = []
        for index in range(self.n_classes):
            start, end = edges[index], edges[index + 1]
            # sobreposicao entre a faixa encolhida e [start, end)
            if alto >= start and baixo <= end:
                reached.append(index)
        return tuple(reached)

    def _analyse(self, problem: Problem, space: WeightSpace) -> Analysis:

        bounds = self.evaluator.value_bounds(problem, space)
        alocacao: dict[str, object] = {}
        undecided = []

        for i, faixa in enumerate(bounds):
            # o limiar entra dentro de `_classes_for`, encolhendo a faixa
            classes = self._classes_for(faixa.lower, faixa.upper)
            nome = problem.alternatives[i]
            alocacao[nome] = {
                "faixa_de_valor": [round(faixa.lower, 4), round(faixa.upper, 4)],
                "classes_possiveis": [self.class_name(c) for c in classes],
                "definida": len(classes) == 1,
            }
            if len(classes) != 1:
                undecided.append(i)

        resolved = not undecided
        headline = (
            "Todas as alternativas foram classificadas."
            if resolved
            else (
                f"{concordar(len(undecided), 'alternativa', 'alternativas')} "
                "ainda atravessa mais de uma classe."
                if len(undecided) == 1
                else f"{len(undecided)} alternativas ainda atravessam mais de uma classe."
            )
        )

        return Analysis(
            problematic=self.key,
            resolved=resolved,
            undecided=tuple(undecided),
            headline=headline,
            detail={
                "perfis": list(self._profiles),
                "classes": [self.class_name(c) for c in range(self.n_classes)],
                "alocacao": alocacao,
            },
        )
