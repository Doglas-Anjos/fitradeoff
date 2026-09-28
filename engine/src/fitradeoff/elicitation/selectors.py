"""Estrategias de escolha da proxima pergunta.

O metodo existe para reduzir o esforco cognitivo do decisor, e o numero de
perguntas e a medida direta desse esforco. Por isso a escolha da proxima
pergunta merece ser um ponto de extensao explicito, e nao uma heuristica
enterrada no meio do processo.
"""

from __future__ import annotations

import math
from abc import ABC, abstractmethod

from ..domain.audit import AuditLog
from ..domain.preferences import Preference
from ..domain.problem import Problem
from ..domain.weights import WeightSpace
from ..problematics.base import Problematic
from .questions import Bracket, TradeoffQuestion

# Abaixo desta largura (em valor), a faixa de um par ja e ruido de ponto
# flutuante. So isso: quem encerra um par e `CASAS_DA_TELA`, logo abaixo.
#
# Ja foi 1e-2, e era o que encerrava os pares -- sem que se soubesse, porque nos
# 16 casos lineares variar o numero entre 1e-3 e 2e-2 nao mudava uma contagem.
# Quem mostrou o erro foi `bc-08` com curva nao linear: as 18 primeiras perguntas
# identicas as do oficial, e ai ele seguia perguntando `Custo x Prazo` numa faixa
# de valor de 1/256, bem abaixo de 1e-2, ate a consequencia da pergunta chegar a
# 18,08 -- o pior da escala (18,084) na tela dele. Com a curva, a mesma faixa de
# valor cabe numa fatia de consequencia muito diferente, e o piso em valor corta
# no lugar errado.
DEFAULT_RESOLUTION = 1e-9

# Um par e abandonado quando as duas pontas da faixa, levadas a consequencia e
# arredondadas a esta quantidade de casas, ficam iguais -- quando a proxima
# pergunta mostraria na tela o mesmo numero de uma ponta. A tela de tradeoff do
# oficial mostra sempre duas casas ("0,63", "32,68"), e e ela que decide.
#
# Medido em `bc-08` com curva: o oficial abandona `Qualidade x Custo` depois de
# perguntar 0,6145 ("0,61"), com a faixa restante entre 0,609 e 0,6145 -- as duas
# "0,61" --, e `Custo x Prazo` depois de 18,08, com o pior em 18,084. Com esta
# regra as 21 perguntas saem iguais, uma a uma, e o fim tambem: a Alt 05 e a
# Alt 08 sem ordem, porque o peso do custo nunca chega a ser apertado. Nos 16
# casos lineares e nos outros tres com curva, nenhuma contagem muda.
CASAS_DA_TELA = 2

# Abaixo deste peso maximo possivel para o criterio rival, a pergunta sobre o par
# e abandonada: nenhuma resposta muda coisa alguma que se enxergue.
#
# E o que fecha `ranking-20` contra o sistema oficial. As 20 primeiras perguntas
# sao identicas; na 21a ele abandona `Durabilidade x Suporte tecnico`, que ainda
# tinha faixa. Medido no nosso motor, com as mesmas respostas: onde ele PERGUNTOU
# esse par, o suporte ainda podia pesar 2,86e-5 (passo 17), e o rival do par
# seguinte 5,91e-5 (passo 20); onde ele PULOU, 1,85e-6. O limiar dele esta nessa
# janela, e qualquer valor dentro dela da as mesmas contagens nos 14 casos de
# ranking, escolha e sorting -- 1e-5 fica no meio. Nao sabemos o numero exato
# dele, e o que se afirma e a janela.
PESO_DESPREZIVEL = 1e-5


def _na_tela(x: float) -> float:
    """Arredondado como a tela do oficial: metade para longe do zero."""
    escala = 10**CASAS_DA_TELA
    return math.copysign(math.floor(abs(x) * escala + 0.5), x) / escala


def _colapsou_na_tela(problem: Problem, bracket: Bracket) -> bool:
    """Se a proxima pergunta deste par nao teria o que mostrar na tela.

    Duas situacoes, as duas medidas no oficial:

    - as duas pontas da faixa ja mostram o mesmo numero (ver CASAS_DA_TELA);
    - a pergunta mostraria exatamente o pior (ou o melhor) da escala. Com a
      qualidade de 0,70 a 0,95, o oficial pula a pergunta em 0,7039 -- "0,70", o
      proprio pior --, nas decisoes com nota discreta; no `bc-08`, com o pior em
      0,609, ele pergunta 0,6145, que aparece "0,61" mas nao e o pior. A
      comparacao e com o numero guardado, nao com o que a tela mostra dele.

    So vale para escala continua. Numa discreta -- com curva ou sem -- a
    pergunta so usa valores declarados, e o esgotamento e o de
    ``Bracket.candidate_value``.
    """
    escala = problem.scales[bracket.criterion]
    if escala.intermediate_values() is not None:
        return False
    if _na_tela(escala.consequence_at(bracket.lower)) == _na_tela(
        escala.consequence_at(bracket.upper)
    ):
        return True
    pergunta = _na_tela(escala.consequence_at(bracket.midpoint))
    return pergunta in (escala.consequence_at(0.0), escala.consequence_at(1.0))


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
            if bracket.width < self._resolution or _colapsou_na_tela(problem, bracket):
                continue
            value = bracket.candidate_value(problem)
            if value is not None:
                found.append(TradeoffQuestion(bracket.criterion, bracket.rival, value))
        return found


class WidestBracketSelector(QuestionSelector):
    """Pergunta sobre o par de criterios com maior incerteza restante.

    Barata -- nenhum LP extra -- e ja supera o rodizio fixo de pares, porque
    ataca sempre o ponto de maior ignorancia sobre os pesos.

    E o seletor padrao (ver ``fitradeoff.container``). Abandona o par cujo
    criterio rival ja nao pode pesar mais que ``PESO_DESPREZIVEL`` -- e o que o
    sistema oficial faz, e foi o que fechou a ultima divergencia de percurso de
    ranking (`ranking-20`, 21 perguntas dos dois lados).

    Trocar por ``InformationGainSelector`` nao e a correcao, e o numero engana:
    ele resolve `ranking-20` em 10 perguntas, menos da metade das 21 do oficial,
    mas afasta do oficial cinco casos que hoje batem (`ranking-06`, `ranking-12`,
    `ranking-15`, `sorting-06` e `sorting-20`). Perguntar menos nao e o objetivo
    aqui: reproduzir o percurso do metodo e.
    """

    def select(self, problem, log, brackets, space, problematic):
        candidates = self._candidates(problem, brackets)
        if not candidates:
            return None
        teto = [b.upper for b in problematic.evaluator.weight_bounds(problem, space)]
        for question in candidates:
            if teto[question.rival] >= PESO_DESPREZIVEL:
                return question
        return None


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
