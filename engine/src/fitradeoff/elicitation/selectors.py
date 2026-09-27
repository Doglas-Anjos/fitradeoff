"""Estrategias de escolha da proxima pergunta.

O metodo existe para reduzir o esforco cognitivo do decisor, e o numero de
perguntas e a medida direta desse esforco. Por isso a escolha da proxima
pergunta merece ser um ponto de extensao explicito, e nao uma heuristica
enterrada no meio do processo.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from ..domain.audit import AuditLog
from ..domain.preferences import Preference
from ..domain.problem import Problem
from ..domain.weights import WeightSpace
from ..problematics.base import Problematic
from .questions import Bracket, TradeoffQuestion

# Abaixo desta largura, continuar perguntando sobre um par ja nao informa nada.
#
# E um piso, nao o criterio de parada. Quem le este 1e-2 ao lado do limiar de
# equivalencia (0,01, em `problematics/evaluator.py`) tende a supor que e ele
# que decide quando a elicitacao encerra -- nao e. Nos 16 casos medidos contra o
# sistema oficial (`paridade/`), o processo sempre para porque a problematica se
# resolveu, nunca porque os intervalos ficaram estreitos demais: variar este
# valor entre 1e-3 e 2e-2 nao muda uma unica contagem de perguntas. So em 5e-2
# ele passa a cortar perguntas, e ai quebra `ranking-15`, `bc-08` e `sorting-20`,
# que hoje batem.
#
# O registro importa porque ha uma tentacao obvia: `bc-20` faz 11 perguntas
# contra 17 do oficial, e engrossar a resolucao parece o caminho para alcanca-lo.
# Nao e -- em 5e-2 aquele caso continua em 11. A hipotese ja esta refutada em
# `paridade/EQUIVALENCIA.md`, junto com outras quatro.
DEFAULT_RESOLUTION = 1e-2


class QuestionSelector(ABC):
    """Decide qual pergunta fazer em seguida."""

    def __init__(self, resolution: float = DEFAULT_RESOLUTION) -> None:
        self._resolution = resolution

    @abstractmethod
    def select(
        self,
        problem: Problem,
        log: AuditLog,
        brackets: tuple[Bracket, ...],
        space: WeightSpace,
        problematic: Problematic,
    ) -> TradeoffQuestion | None:
        """Proxima pergunta, ou ``None`` se nao houver nenhuma util."""

    def _candidates(
        self, problem: Problem, brackets: tuple[Bracket, ...]
    ) -> list[TradeoffQuestion]:
        """Perguntas ainda realizaveis, da faixa mais larga para a mais estreita."""
        found = []
        for bracket in sorted(brackets, key=lambda b: -b.width):
            if bracket.width < self._resolution:
                continue
            value = bracket.candidate_value(problem)
            if value is not None:
                found.append(TradeoffQuestion(bracket.criterion, bracket.rival, value))
        return found


class WidestBracketSelector(QuestionSelector):
    """Pergunta sobre o par de criterios com maior incerteza restante.

    Barata -- nenhum LP extra -- e ja supera o rodizio fixo de pares, porque
    ataca sempre o ponto de maior ignorancia sobre os pesos.

    E o seletor padrao (ver ``fitradeoff.container``), e e aqui que mora a unica
    divergencia de percurso que resta contra o sistema oficial: em `ranking-20`
    ele faz 22 perguntas contra 21 dele, porque no passo 21 o oficial abandona um
    par que ainda tem faixa e vai direto ao que fecha a ordem. A causa continua
    desconhecida; o desfecho e o mesmo dos dois lados. Medida, caso e vao estao
    em ``paridade/EQUIVALENCIA.md``, e a divergencia esta travada por nome em
    ``paridade/test_paridade.py`` -- fecha-la quebra o teste de proposito.

    Trocar por ``InformationGainSelector`` nao e a correcao, e o numero engana:
    ele resolve `ranking-20` em 10 perguntas, menos da metade das 21 do oficial,
    mas afasta do oficial cinco casos que hoje batem (`ranking-06`, `ranking-12`,
    `ranking-15`, `sorting-06` e `sorting-20`). Perguntar menos nao e o objetivo
    aqui: reproduzir o percurso do metodo e.
    """

    def select(self, problem, log, brackets, space, problematic):
        candidates = self._candidates(problem, brackets)
        return candidates[0] if candidates else None


class InformationGainSelector(QuestionSelector):
    """Pergunta que mais reduz o conjunto de alternativas indefinidas.

    Para cada candidata, simula as duas respostas possiveis e mede quantas
    alternativas continuariam indefinidas. Escolhe a de pior caso mais baixo --
    criterio minimax, que garante progresso qualquer que seja a resposta.

    Reduz o espaco de *alternativas*, e nao o espaco de *pesos*: e a metrica que
    o decisor sente. Custa 2 analises por candidata, entao ``max_candidates``
    limita o esforco; com poucas alternativas restantes isso e irrelevante.
    """

    def __init__(
        self,
        resolution: float = DEFAULT_RESOLUTION,
        max_candidates: int = 6,
        epsilon: float = 0.0,
    ) -> None:
        super().__init__(resolution)
        self._max_candidates = max_candidates
        self._epsilon = epsilon

    def select(self, problem, log, brackets, space, problematic):
        candidates = self._candidates(problem, brackets)[: self._max_candidates]
        if not candidates:
            return None
        if len(candidates) == 1:
            return candidates[0]

        baseline = len(problematic.analyse(problem, space).undecided)
        best, best_score = candidates[0], None

        for question in candidates:
            worst_case = max(
                self._undecided_after(problem, space, problematic, question, answer)
                for answer in (Preference.FIRST, Preference.SECOND)
            )
            # desempata pela faixa mais larga, que e a ordem em que vieram
            if best_score is None or worst_case < best_score:
                best, best_score = question, worst_case

        if best_score is not None and best_score >= baseline:
            # nenhuma candidata promete progresso garantido; segue a mais incerta
            return candidates[0]
        return best

    def _undecided_after(
        self, problem, space, problematic, question, preference
    ) -> int:
        """Quantas alternativas seguiriam indefinidas apos esta resposta."""
        answer = question.answered_with(preference)
        hypothetical = space.with_constraints(
            answer.constraints(problem, self._epsilon)
        )
        if not problematic.evaluator.is_consistent(hypothetical):
            # resposta impossivel: nao penaliza a candidata
            return 0
        return len(problematic.analyse(problem, hypothetical).undecided)
