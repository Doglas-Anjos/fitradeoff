"""Diagnóstico de inconsistência.

Quando o espaço de pesos fica vazio, dizer "desfaça a última" é verdadeiro e
inútil: a última resposta só é culpada porque foi a última a chegar. O conflito
é entre **duas** declarações, e o decisor precisa ver as duas para escolher qual
reflete o que ele pensa.

O diagnóstico funciona por eliminação: a cada declaração anterior removida, o
espaço volta a ser viável? Se volta, aquela declaração e a última não cabem
juntas. Custa uma checagem de viabilidade por declaração — barato, e só roda
quando já houve inconsistência.
"""

from __future__ import annotations

from dataclasses import dataclass, field, replace

from ..domain.audit import AuditEntry, AuditLog
from ..domain.preferences import CriteriaRanking, Preference, TradeoffAnswer
from ..elicitation.session import DecisionSession


@dataclass(frozen=True)
class Conflito:
    """Duas declarações que não cabem no mesmo espaço de pesos."""

    sequencia_a: int
    sequencia_b: int
    declaracao_a: str
    declaracao_b: str

    def to_dict(self) -> dict:
        return {
            "sequencia_a": self.sequencia_a,
            "sequencia_b": self.sequencia_b,
            "declaracao_a": self.declaracao_a,
            "declaracao_b": self.declaracao_b,
        }


@dataclass
class Diagnostico:
    """Resultado de ``diagnosticar``: os conflitos e as saidas oferecidas.

    Consumido pela API e pelo MCP via ``to_dict``; cada item de ``saidas``
    traz a ``acao`` que ``resolver`` aceita, exceto ``reordenar``, que o
    chamador executa pela ordenacao dos criterios.
    """

    inconsistente: bool
    conflitos: list[Conflito] = field(default_factory=list)
    ultima: dict | None = None
    saidas: list[dict] = field(default_factory=list)
    # a ultima declaracao e impossivel para este problema, sozinha
    impossivel: bool = False

    @property
    def leitura(self) -> str:
        """O diagnostico em uma frase para o decisor, conforme o caso.

        Tres casos: compativel, declaracao impossivel sozinha, ou par em
        conflito. O texto evita dizer que alguma declaracao esta "errada":
        o decisor escolhe qual reflete o que pensa.
        """
        if not self.inconsistente:
            return "As declarações são compatíveis entre si."
        if self.impossivel:
            return (
                "Esta declaração não é possível neste problema — não existe "
                "nenhum conjunto de pesos que a torne verdadeira. Em geral isso "
                "acontece ao preferir uma alternativa que perde em todos os "
                "critérios para a outra."
            )
        return (
            "Duas declarações suas não cabem no mesmo conjunto de pesos. "
            "Nenhuma está errada por si: elas apenas não podem valer ao mesmo "
            "tempo. Escolha qual reflete o que você pensa."
        )

    def to_dict(self) -> dict:
        return {
            "inconsistente": self.inconsistente,
            "impossivel": self.impossivel,
            "conflitos": [c.to_dict() for c in self.conflitos],
            "ultima": self.ultima,
            "saidas": self.saidas,
            "leitura": self.leitura,
        }


def _descrever(entrada: AuditEntry, session: DecisionSession) -> dict:
    return {
        "sequencia": entrada.sequence,
        "texto": entrada.statement.describe(session.problem),
        "tipo": type(entrada.statement).__name__,
    }


def _inverter(resposta: TradeoffAnswer) -> TradeoffAnswer | None:
    """A preferência oposta, quando existe uma.

    É o que o sistema de referência faz ao descartar uma resposta por
    decomposição: A vira B, B vira A. A indiferença não tem oposto útil — o
    contrário de "valem o mesmo" é "uma vale mais", mas não diz qual — então
    nesse caso só resta remover.
    """
    oposto = {
        Preference.FIRST: Preference.SECOND,
        Preference.SECOND: Preference.FIRST,
    }.get(resposta.preference)
    if oposto is None:
        return None
    return TradeoffAnswer(resposta.criterion, resposta.rival, resposta.value, oposto)


def _saidas_da_ultima(ultima: AuditEntry, session: DecisionSession) -> list[dict]:
    """O que sempre dá para fazer com a declaração que quebrou o espaço."""
    saidas = [
        {
            "acao": "desfazer",
            "rotulo": "Manter o que eu disse antes",
            "explicacao": "Remove a última declaração e volta ao estado anterior.",
        }
    ]
    if isinstance(ultima.statement, TradeoffAnswer):
        invertida = _inverter(ultima.statement)
        if invertida is not None:
            saidas.append(
                {
                    "acao": "inverter",
                    "rotulo": "Eu quis dizer o contrário",
                    "explicacao": "Troca a resposta pela opção oposta e mantém o resto.",
                    "resultado": invertida.describe(session.problem),
                }
            )
    return saidas


def diagnosticar(session: DecisionSession) -> Diagnostico:
    """Aponta quais declarações brigam entre si, e o que dá para fazer."""
    if session.is_consistent:
        return Diagnostico(inconsistente=False)

    entradas = list(session.log.entries)
    if not entradas:
        return Diagnostico(inconsistente=True)

    ultima = entradas[-1]
    sem_ultima = session.undo()

    # Se remover a última não resolve, o conflito é mais antigo e o diagnóstico
    # par a par não se aplica: resta apontar as declarações e deixar o decisor
    # recomeçar a ordenação.
    if not sem_ultima.is_consistent:
        return Diagnostico(
            inconsistente=True,
            ultima=_descrever(ultima, session),
            saidas=[
                {
                    "acao": "reordenar",
                    "rotulo": "Recomeçar pela ordem dos critérios",
                    "explicacao": (
                        "O conflito não está só na última resposta. Refazer a "
                        "ordenação limpa as respostas e recomeça a elicitação."
                    ),
                }
            ],
        )

    # A última é impossível sozinha? Acontece ao afirmar algo que a matriz de
    # consequências já desmente -- preferir quem perde em todos os critérios.
    # Não há par a apontar: a saída é rever aquela declaração.
    so_ordenacao = session
    for _ in entradas:
        so_ordenacao = so_ordenacao.undo()
    ranking = next(
        (e.statement for e in entradas if type(e.statement).__name__ == "CriteriaRanking"),
        None,
    )
    if ranking is not None:
        sozinha = so_ordenacao.record(ranking).record(ultima.statement)
        if not sozinha.is_consistent:
            return Diagnostico(
                inconsistente=True,
                impossivel=True,
                ultima=_descrever(ultima, session),
                saidas=_saidas_da_ultima(ultima, session),
            )

    # Uma de cada vez: sem qual declaração anterior a última caberia?
    conflitos: list[Conflito] = []
    for i, entrada in enumerate(entradas[:-1]):
        restantes = [e.statement for e in entradas if e is not entrada]
        tentativa = session
        for _ in entradas:
            tentativa = tentativa.undo()
        for declaracao in restantes:
            tentativa = tentativa.record(declaracao)
        if tentativa.is_consistent:
            conflitos.append(
                Conflito(
                    sequencia_a=entrada.sequence,
                    sequencia_b=ultima.sequence,
                    declaracao_a=entrada.statement.describe(session.problem),
                    declaracao_b=ultima.statement.describe(session.problem),
                )
            )

    saidas = _saidas_da_ultima(ultima, session)
    ordenacoes = {
        e.sequence for e in entradas if isinstance(e.statement, CriteriaRanking)
    }
    for conflito in conflitos:
        if conflito.sequencia_a in ordenacoes:
            # `resolver` recusa remover a ordenacao; a saida para ela e reordenar
            saidas.append(
                {
                    "acao": "reordenar",
                    "rotulo": "Recomeçar pela ordem dos critérios",
                    "explicacao": (
                        "A última declaração briga com a ordem dos critérios. "
                        "Refazer a ordenação limpa as respostas e recomeça a "
                        "elicitação."
                    ),
                }
            )
            continue
        saidas.append(
            {
                "acao": "remover",
                "sequencia": conflito.sequencia_a,
                "rotulo": f"Descartar a declaração {conflito.sequencia_a}",
                "explicacao": conflito.declaracao_a,
            }
        )

    return Diagnostico(
        inconsistente=True,
        conflitos=conflitos,
        ultima=_descrever(ultima, session),
        saidas=saidas,
    )


def resolver(session: DecisionSession, acao: str, sequencia: int | None = None):
    """Aplica a saida escolhida e devolve a sessao resultante.

    ``desfazer`` trunca a ultima declaracao; ``inverter`` troca a ultima
    resposta de tradeoff pela oposta, com instante novo. ``remover`` monta a
    trilha de novo a partir das entradas originais, sem a removida: cada
    declaracao mantida conserva o instante e o autor com que foi gravada. So a
    sequencia das que vinham depois da removida cai uma posicao, porque o
    ``AuditLog`` numera pela posicao (``record`` e ``without_last`` dependem
    disso). A trilha resultante nao registra que houve uma remocao.

    A ordenacao dos criterios (``CriteriaRanking``) nao pode ser removida: as
    respostas de tradeoff que vem depois se referem aos pares daquela ordem, e
    ficariam orfas. Para mudar a ordem, o decisor reordena.

    Erros: ValueError se nao houver declaracao, a acao for desconhecida, a
    ultima declaracao nao for resposta de tradeoff ou for indiferenca (em
    ``inverter``), ou ``sequencia`` faltar ou nao existir (em ``remover``);
    InvalidRequest se ``remover`` apontar a ordenacao dos criterios.
    """
    entradas = list(session.log.entries)
    if not entradas:
        raise ValueError("Não há declaração a resolver.")

    if acao == "desfazer":
        return session.undo()

    if acao == "inverter":
        ultima = entradas[-1].statement
        if not isinstance(ultima, TradeoffAnswer):
            raise ValueError("Só uma resposta de tradeoff pode ser invertida.")
        invertida = _inverter(ultima)
        if invertida is None:
            raise ValueError(
                "Uma indiferença não tem oposto único: remova-a em vez de inverter."
            )
        return session.undo().record(invertida)

    if acao == "remover":
        if sequencia is None:
            raise ValueError("Informe qual declaração remover.")
        alvo = next((e for e in entradas if e.sequence == sequencia), None)
        if alvo is None:
            raise ValueError(f"Não existe declaração de número {sequencia}.")
        if isinstance(alvo.statement, CriteriaRanking):
            from .service import InvalidRequest  # adiado: service importa este modulo

            raise InvalidRequest(
                "A ordenação dos critérios não pode ser descartada: as respostas "
                "seguintes dependem dela. Para mudar a ordem, reordene os "
                "critérios."
            )
        # As entradas, e nao so as declaracoes: instante e autor sao da
        # gravacao original. A sequencia e a posicao no log (invariante do
        # AuditLog), entao so ela e refeita.
        mantidas = tuple(
            replace(entrada, sequence=posicao)
            for posicao, entrada in enumerate(
                (e for e in entradas if e is not alvo), start=1
            )
        )
        # Sessao nova sobre a trilha montada, sem o cache da anterior -- o mesmo
        # que ``DecisionSession.undo`` faz ao truncar.
        return replace(session, log=AuditLog(mantidas), _cache={})

    raise ValueError(f"Ação desconhecida: {acao!r}.")
