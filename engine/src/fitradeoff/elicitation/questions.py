"""Perguntas de tradeoff: o que perguntar e como enunciar.

Os intervalos de busca sao **derivados do log**, nunca guardados a parte. Se
fossem estado proprio, uma correcao no log poderia deixa-los dessincronizados --
e a auditoria passaria a mentir. Derivar custa microssegundos e elimina a classe
inteira de bugs.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, replace

from ..domain.audit import AuditLog
from ..domain.formatting import format_amount
from ..domain.preferences import CriteriaRanking, Preference, TradeoffAnswer
from ..domain.problem import Problem
from ..domain.scales import DegenerateScale


@dataclass(frozen=True)
class TradeoffQuestion:
    """Confronta duas consequencias hipoteticas, ambas pessimas em tudo mais.

    * A -- ``criterion`` num desempenho intermediario de valor ``value``;
    * B -- ``rival`` no melhor desempenho possivel.
    """

    criterion: int
    rival: int
    value: float

    def answered_with(self, preference: Preference) -> TradeoffAnswer:
        return TradeoffAnswer(self.criterion, self.rival, self.value, preference)


@dataclass(frozen=True)
class Bracket:
    """Faixa ainda possivel para a razao ``k[rival] / k[criterion]``.

    Cada resposta corta a faixa: e uma busca binaria sobre a razao entre dois
    pesos consecutivos na ordem declarada.

    Limitacao conhecida: o teto e 1,0 mesmo com ``epsilon`` positivo, embora a
    ordenacao estrita deixe a razao real um pouco abaixo disso (cerca de
    ``1 - 2 epsilon / k``). Muito perto de 1, uma resposta legitima pode esvaziar
    o espaco de pesos. Visto com 11 respostas B seguidas em dois criterios; num
    percurso completo o avaliador costuma resolver antes de o seletor chegar la.
    """

    criterion: int
    rival: int
    lower: float = 0.0
    upper: float = 1.0
    #: a pergunta de abertura (topo contra base), ainda nao respondida
    abertura: bool = False
    #: par encerrado por "nao sei": nao volta a ser perguntado, mas ``lower`` e
    #: ``upper`` seguem sendo o que as respostas de fato afirmaram
    encerrado: bool = False

    @property
    def width(self) -> float:
        return self.upper - self.lower

    @property
    def midpoint(self) -> float:
        return (self.lower + self.upper) / 2.0

    def narrowed_by(self, answer: TradeoffAnswer) -> "Bracket":
        """Aplica uma resposta.

        Seja r a razao. Preferir A significa ``value * k >= k_rival``, ou seja
        ``r <= value``, o que baixa o teto; preferir B eleva o piso; a
        indiferenca fixa ``r = value``. "Nao sei" marca o par como
        ``encerrado`` e deixa a faixa como estava: nada foi afirmado sobre a
        razao, entao quem le as pontas (``_propagar_abertura``) continua lendo
        so o que o decisor declarou.

        Unidade: razao ``k[rival] / k[criterion]``, em [0, 1]
        """
        if answer.criterion != self.criterion or answer.rival != self.rival:
            return self
        if answer.preference is Preference.FIRST:
            return replace(self, upper=min(self.upper, answer.value))
        if answer.preference is Preference.SECOND:
            return replace(self, lower=max(self.lower, answer.value))
        if answer.preference is Preference.INDIFFERENT:
            return replace(self, lower=answer.value, upper=answer.value)
        # sem resposta: o par se encerra sem que nada seja afirmado sobre a
        # razao entre os pesos. Colapsar a faixa no meio (como ja se fez) o
        # tornava indistinguivel de um "indiferente", e a propagacao da abertura
        # apertava os vizinhos com uma razao que ninguem declarou.
        return replace(self, encerrado=True)

    def candidate_value(self, problem: Problem) -> float | None:
        """Desempenho intermediario a usar na proxima pergunta deste par.

        Escala continua aceita o ponto medio. Escala construida so admite os
        niveis declarados: usamos o que estiver dentro da faixa e mais perto do
        meio. Sem nenhum nivel disponivel, o par se esgota -- perguntar por um
        desempenho inexistente produziria uma restricao que a pergunta feita ao
        decisor nao sustenta.

        Unidade: valor normalizado do criterio em foco, em (0, 1)
        """
        realizable = problem.scales[self.criterion].intermediate_values()
        if realizable is None:
            return self.midpoint
        inside = [v for v in realizable if self.lower < v < self.upper]
        if not inside:
            return None
        # Empate de distancia vai para o valor de baixo. Numa nota de 1 a 7, com
        # a faixa de 0 a 0,5, os niveis 2 e 3 ficam a 1/12 do meio, e o sistema
        # de referencia pergunta o 2 (medido em 29/09/2026). O arredondamento da
        # distancia e o que faz o empate ser empate em ponto flutuante.
        return min(inside, key=lambda v: (round(abs(v - self.midpoint), 9), v))


def brackets_from_log(
    problem: Problem, log: AuditLog, abertura: bool = True
) -> tuple[Bracket, ...]:
    """Reconstroi os intervalos de busca a partir das declaracoes registradas.

    Com ``abertura``, o primeiro par oferecido e o mais importante contra o
    menos importante -- e nao dois consecutivos. E o que o sistema oficial faz,
    e tem razao de ser: essa e a razao de pesos mais larga que existe, entao
    responde-la corta o espaco de pesos no ponto de maior ignorancia. Depois de
    respondida ela sai da lista e nao volta; o refinamento segue par a par.

    A ordem em que as perguntas sao feitas nao muda o espaco de pesos final --
    restricoes lineares se intersectam, e intersecao e comutativa. Por isso a
    abertura pode ser revista a qualquer momento, como qualquer outra resposta:
    o que vale e o conjunto do log, nao a sequencia.

    Criterio de escala degenerada (todas as alternativas empatam) fica fora
    dos pares: como rival ele produzia uma pergunta em que A domina B (o mesmo
    desempenho aparece como "o pior" e "o melhor possivel"), e como foco nao
    tem desempenho intermediario, entao o par seguinte nunca era perguntado.
    Os vizinhos dele passam a formar um par direto. A ordenacao dos pesos
    continua a declarada, degenerado incluido; a razao extrema segue sendo o
    produto das consecutivas, porque o produto telescopa.

    Sem ordenacao no log nao ha intervalo nenhum. Havendo mais de uma, vale a
    ultima para montar os pares. Nao resolve LP: os intervalos saem so das
    respostas registradas, e nao do espaco de pesos.
    """
    ranking = log.last_of_type(CriteriaRanking)
    if ranking is None:
        return ()

    ordem = tuple(
        j for j in ranking.order
        if not isinstance(problem.scales[j], DegenerateScale)
    )
    respostas = tuple(log.of_type(TradeoffAnswer))

    brackets: list[Bracket] = []
    # com dois criterios o par extremo ja e o consecutivo: nao ha o que abrir
    if abertura and len(ordem) >= 3:
        topo, base = ordem[0], ordem[-1]
        respondida = any(
            a.criterion == topo and a.rival == base for a in respostas
        )
        if not respondida:
            brackets.append(Bracket(criterion=topo, rival=base, abertura=True))

    consecutivos = [
        Bracket(criterion=higher, rival=lower)
        for higher, lower in zip(ordem, ordem[1:])
    ]
    brackets += consecutivos
    for answer in respostas:
        brackets = [bracket.narrowed_by(answer) for bracket in brackets]

    if abertura and len(ordem) >= 3:
        brackets = _propagar_abertura(brackets, ordem, respostas)
    return tuple(brackets)


def _propagar_abertura(
    brackets: list[Bracket],
    ordem: tuple[int, ...],
    respostas: tuple[TradeoffAnswer, ...],
) -> list[Bracket]:
    """Leva o que se sabe da razao extrema para os pares consecutivos.

    Sem isto a abertura vira armadilha. A razao extrema ``k_base / k_topo`` e o
    **produto** das razoes consecutivas, e cada fator esta em (0, 1] porque a
    ordem ja foi declarada. Quem nao propaga isso pergunta sobre um par
    consecutivo no meio de uma faixa que ja nao existe, e uma das duas respostas
    esvazia o espaco de pesos: o decisor recebe "as declaracoes se contradizem"
    por ter respondido o que lhe foi perguntado.

    Se o produto e no minimo ``piso``, cada fator e no minimo ``piso`` dividido
    pelo maximo que os outros ainda podem valer juntos -- o produto dos tetos
    deles. Se o produto e no maximo ``teto``, cada fator e no maximo ``teto``
    dividido pelo minimo dos outros juntos. Um ajusta o outro, entao a conta se
    repete ate parar de mudar.

    Houve uma versao que usava so ``piso`` como piso de cada fator, e bastava
    enquanto os outros fatores podiam valer 1. Quatro respostas "indiferente"
    seguidas (28/09/2026, no estresse com 7 criterios) a derrubaram: com dois
    fatores ja fixados em v2 e v3, o seguinte precisa ser ao menos piso/(v2*v3),
    e o seletor perguntou abaixo disso.

    ``piso`` e ``teto`` vem so das respostas A, B e indiferente a abertura, e
    os fatores ``outros`` sao lidos das pontas dos brackets consecutivos. Um par
    encerrado por "nao sei" chega aqui com as pontas que as respostas
    afirmaram (``Bracket.encerrado`` o tira da fila sem mexer nelas), entao
    nao aperta os vizinhos com uma razao que o decisor nao declarou.
    """
    topo, base = ordem[0], ordem[-1]
    piso, teto = 0.0, 1.0
    for a in respostas:
        if a.criterion != topo or a.rival != base:
            continue
        if a.preference in (Preference.SECOND, Preference.INDIFFERENT):
            piso = max(piso, a.value)
        if a.preference in (Preference.FIRST, Preference.INDIFFERENT):
            teto = min(teto, a.value)
    if piso <= 0.0 and teto >= 1.0:
        return brackets

    pares = set(zip(ordem, ordem[1:]))
    indices = [i for i, b in enumerate(brackets) if (b.criterion, b.rival) in pares]
    saida = list(brackets)
    for _ in range(len(indices) * 4):
        mudou = False
        for i in indices:
            outros = [saida[j] for j in indices if j != i]
            max_outros = math.prod(o.upper for o in outros)
            min_outros = math.prod(o.lower for o in outros)
            b = saida[i]
            lower, upper = b.lower, b.upper
            if piso > 0.0 and max_outros > 0.0:
                lower = max(lower, piso / max_outros)
            if teto < 1.0 and min_outros > 0.0:
                upper = min(upper, teto / min_outros)
            lower = min(lower, upper)
            if lower > b.lower + 1e-15 or upper < b.upper - 1e-15:
                saida[i] = replace(b, lower=lower, upper=upper)
                mudou = True
        if not mudou:
            break
    return saida


# --- enunciado ----------------------------------------------------------------


@dataclass(frozen=True)
class ConsequenceLine:
    """Desempenho de uma consequencia hipotetica num criterio."""

    criterion_key: str
    criterion_name: str
    unit: str
    consequence: float
    value: float
    role: str  # "foco" | "melhor" | "pior"

    def as_text(self) -> str:
        marker = {"melhor": " (o melhor possivel)", "pior": " (o pior possivel)"}
        amount = format_amount(self.consequence, self.unit)
        return f"{self.criterion_name}: {amount}{marker.get(self.role, '')}"


@dataclass(frozen=True)
class Option:
    """Uma das duas consequencias hipoteticas, linha a linha.

    Traz todos os criterios, e nao so o que muda: o destacado primeiro, os
    demais no pior desempenho, para que o decisor veja a situacao inteira que
    esta avaliando.
    """

    label: str
    lines: tuple[ConsequenceLine, ...]

    def as_text(self) -> str:
        body = "\n".join(f"    - {line.as_text()}" for line in self.lines)
        return f"  Opcao {self.label}:\n{body}"


@dataclass(frozen=True)
class QuestionBrief:
    """Pergunta pronta para apresentacao, em estrutura e em texto."""

    question: TradeoffQuestion
    focus_criterion: str
    rival_criterion: str
    option_a: Option
    option_b: Option

    def as_text(self) -> str:
        """A pergunta inteira em texto corrido, para quem nao tem tela.

        O enunciado repete que tudo o que nao aparece esta no pior desempenho:
        e a premissa da pergunta de tradeoff, e sem ela o decisor tende a
        imaginar os outros criterios num nivel medio e responder outra coisa.
        """
        return (
            "Compare duas situacoes hipoteticas. Em ambas, tudo o que nao for "
            "mencionado abaixo esta no pior desempenho possivel.\n\n"
            f"{self.option_a.as_text()}\n\n"
            f"{self.option_b.as_text()}\n\n"
            "Qual das duas voce prefere? (ou responda 'indiferente')"
        )


class QuestionPresenter:
    """Traduz a pergunta para os termos concretos do problema.

    O motor raciocina em valor normalizado; o decisor raciocina em reais e dias.
    Enunciar os dois lados por inteiro, e nao so a parte que muda, e o que evita
    que o decisor responda a uma pergunta diferente da que o modelo registra.
    """

    def _line(
        self, problem: Problem, index: int, value: float, role: str
    ) -> ConsequenceLine:
        criterion = problem.criteria[index]
        return ConsequenceLine(
            criterion_key=criterion.key,
            criterion_name=criterion.name,
            unit=criterion.unit,
            consequence=problem.scales[index].consequence_at(value),
            value=value,
            role=role,
        )

    def _option(
        self, problem: Problem, label: str, highlight: int, value: float, role: str
    ) -> Option:
        lines = [self._line(problem, highlight, value, role)]
        lines += [
            self._line(problem, j, 0.0, "pior")
            for j in range(problem.n_criteria)
            if j != highlight
        ]
        return Option(label=label, lines=tuple(lines))

    def present(self, problem: Problem, question: TradeoffQuestion) -> QuestionBrief:
        """Monta as duas opcoes na unidade de cada criterio.

        A opcao A leva o criterio em foco no desempenho de valor
        ``question.value``; a B, o rival no melhor desempenho. Os valores sao
        convertidos em consequencia pela escala de cada criterio, entao uma
        curva elicitada muda o numero mostrado, nao a pergunta.
        """
        return QuestionBrief(
            question=question,
            focus_criterion=problem.criteria[question.criterion].name,
            rival_criterion=problem.criteria[question.rival].name,
            option_a=self._option(
                problem, "A", question.criterion, question.value, "foco"
            ),
            option_b=self._option(problem, "B", question.rival, 1.0, "melhor"),
        )
