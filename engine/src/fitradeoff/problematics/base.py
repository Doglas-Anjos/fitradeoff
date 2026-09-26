"""Contrato das problematicas do FITradeoff.

O ciclo de elicitacao e identico em todas -- ordenar pesos, responder
tradeoffs, estreitar o espaco de pesos. O que muda e a leitura que se faz desse
espaco: escolher uma alternativa, ordenar todas, aloca-las em classes ou montar
uma carteira -- por beneficio agregado ou por razao beneficio-custo. Cada
leitura e uma estrategia; a sessao nao sabe qual esta usando.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from ..domain.problem import Problem
from ..domain.weights import WeightSpace
from .evaluator import Evaluator

INCONSISTENT = (
    "Nenhum vetor de pesos é viável: as declarações do decisor se contradizem. "
    "Desfaça a última para voltar a um estado consistente."
)


@dataclass(frozen=True)
class Analysis:
    """Leitura do espaco de pesos corrente, sob uma problematica.

    ``undecided`` sao as alternativas cuja situacao ainda depende de informacao
    que o decisor nao deu. Quando fica vazio, o problema esta resolvido e nao ha
    mais o que perguntar.
    """

    problematic: str
    resolved: bool
    undecided: tuple[int, ...]
    headline: str
    detail: dict = field(default_factory=dict)


class Problematic(ABC):
    """Estrategia de leitura do espaco de pesos."""

    key: str = ""
    label: str = ""

    #: O veto do FITradeoff esta definido para escolha e ordenacao, e so.
    #: O default recusa: uma problematica nova que nao pensou no assunto falha
    #: alto em vez de calcular em silencio uma coisa que o metodo nao define.
    accepts_veto: bool = False

    def __init__(self, evaluator: Evaluator) -> None:
        self._evaluator = evaluator

    @property
    def evaluator(self) -> Evaluator:
        return self._evaluator

    def analyse(self, problem: Problem, space: WeightSpace) -> Analysis:
        """Avalia o problema sob o espaco de pesos dado.

        Template: as pre-condicoes valem para todas as problematicas e ficam
        aqui, uma vez so. A estrategia implementa apenas a sua leitura, e pode
        assumir problema valido e espaco de pesos nao vazio.
        """
        self.validate(problem)
        if not self.evaluator.is_consistent(space):
            return self.infeasible(problem)
        return self._analyse(problem, space)

    @abstractmethod
    def _analyse(self, problem: Problem, space: WeightSpace) -> Analysis:
        """Leitura especifica, com problema valido e espaco de pesos viavel."""

    def validate(self, problem: Problem) -> None:
        """Verifica se o problema tem o que esta problematica exige.

        Template, como ``analyse``: a recusa do veto vale para todas e fica
        aqui. Uma problematica que precise de mais implementa ``_validate``, e
        nao tem como esquecer desta.
        """
        if problem.has_veto and not self.accepts_veto:
            raise ValueError(
                f"O modelo de veto não se aplica à problemática '{self.key}'. "
                "O FITradeoff o define para escolha e ordenação; nas demais, "
                "remova os limites de veto dos critérios ou troque a "
                "problemática."
            )
        self._validate(problem)

    def _validate(self, problem: Problem) -> None:
        """Pre-condicoes especificas desta problematica."""
        return None

    def infeasible(self, problem: Problem) -> Analysis:
        """Resposta unica para espaco de pesos vazio."""
        return Analysis(
            problematic=self.key,
            resolved=False,
            undecided=tuple(range(problem.n_alternatives)),
            headline=INCONSISTENT,
            detail={"inconsistente": True},
        )
