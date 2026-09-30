"""Casos de uso da decisao.

Camada que o servidor MCP, uma API HTTP ou um script usam igualmente. Recebe o
container por construtor e nao conhece protocolo nenhum.

Nenhum caso de uso guarda estado derivado: todos carregam o registro, montam a
sessao por replay, agem, e persistem apenas o log.
"""

from __future__ import annotations

import math
import secrets
from typing import Callable, Iterable, Sequence

import numpy as np

from ..container import Container
from ..domain.preferences import HolisticJudgement, Preference
from ..domain.problem import Criterion, Problem
from ..elicitation.session import DecisionSession
from ..problematics.evaluator import (
    DEFAULT_EQUIVALENCE,
    MAX_EQUIVALENCE,
    MIN_EQUIVALENCE,
)
from ..repositories.base import DecisionRecord, DecisionSummary
from ..repositories.serialization import criterion_from_dict
from .dto import ScenarioDTO, SensitivityDTO
from .inconsistency import diagnosticar, resolver
from .limits import LimitExceeded, Limits
from .sensitivity import VariacaoCriterio, analisar
from .views import (
    CARTEIRAS,
    LEITURA_DAS_DOMINADAS,
    PROXIMO_PASSO,
    analysis_dto,
    audit_dto,
    pareto_dominance,
    problem_dto,
    question_dto,
    state_dto,
    summary_dto,
)


_CARTEIRAS = CARTEIRAS


class InvalidRequest(Exception):
    """Pedido malformado ou fora de ordem."""


_PREFERENCE_ALIASES = {
    "a": Preference.FIRST,
    "b": Preference.SECOND,
    "indiferente": Preference.INDIFFERENT,
    "indiferenca": Preference.INDIFFERENT,
    "indifferent": Preference.INDIFFERENT,
    "nao sei": Preference.NO_ANSWER,
    "não sei": Preference.NO_ANSWER,
    "no_answer": Preference.NO_ANSWER,
}


def parse_preference(text: str) -> Preference:
    """Traduz a resposta textual do decisor para uma ``Preference``.

    Aceita as grafias que chegam do chat e da tela, sem diferenciar caixa nem
    espacos nas pontas; "nao sei" vem com e sem acento porque o texto do
    decisor chega como ele escreveu.

    Erros: InvalidRequest se o texto nao for uma das respostas aceitas.
    """
    escolha = (text or "").strip().lower()
    if escolha not in _PREFERENCE_ALIASES:
        raise InvalidRequest(
            "Responda com 'A', 'B', 'indiferente' ou 'não sei'."
        )
    return _PREFERENCE_ALIASES[escolha]


def _new_id() -> str:
    """128 bits de entropia. Identificador tambem e credencial de acesso aqui:
    quem tem o id le a decisao, entao adivinhar precisa ser inviavel."""
    return secrets.token_hex(16)


class DecisionService:
    """Operacoes sobre decisoes persistidas.

    Todo caso de uso que recebe ``record_id`` carrega o registro pelo
    repositorio, e por isso pode levantar, alem dos erros proprios listados em
    cada metodo, os do armazenamento: ``RecordNotFound`` (nao ha decisao com
    esse id), ``ValueError`` (id fora do alfabeto aceito pelos adaptadores) e,
    so com o adaptador Postgres, ``StorageUnavailable``. Os que gravam podem
    levantar ainda ``ConcurrentModification`` -- mas so com o adaptador
    Postgres: os de memoria e de arquivo gravam por cima sem conferir versao
    (ver ``DecisionRepository``).

    A API traduz ``RecordNotFound`` para 404, ``StorageUnavailable`` para 503,
    ``ConcurrentModification`` e ``InvalidRequest`` para 409,
    ``LimitExceeded`` para 413 e ``ValueError``/``KeyError`` para 400
    (``fitradeoff_api.deps``).
    """

    def __init__(
        self,
        container: Container,
        make_id: Callable[[], str] = _new_id,
        limits: Limits | None = None,
    ) -> None:
        self._container = container
        self._make_id = make_id
        self._limits = limits or Limits()

    @property
    def container(self) -> Container:
        return self._container

    @property
    def limits(self) -> Limits:
        return self._limits

    # --- leitura --------------------------------------------------------------

    def _load(self, record_id: str) -> tuple[DecisionRecord, DecisionSession]:
        record = self._container.repository.get(record_id)
        return record, self._container.session_for(record)

    def _commit(self, record: DecisionRecord, session: DecisionSession) -> dict:
        """Persiste o log da sessao e devolve a situacao resultante.

        Limitacao conhecida: a gravacao acontece ANTES de montar o
        ``state_dto``. Se montar a situacao falhar depois de gravar (um LP que
        levanta, um erro de serializacao), a declaracao ja esta persistida e
        quem chamou recebe um erro -- e pode repetir o pedido achando que nada
        foi gravado. Vale para todo caso de uso que passa por aqui
        (``rank_criteria``, ``answer``, ``judge``, ``undo``,
        ``resolve_inconsistency``).
        """
        record.log = session.log
        self._container.repository.save(record)
        return state_dto(record, session).to_dict()

    def session(self, record_id: str) -> DecisionSession:
        return self._load(record_id)[1]

    def problematics(self) -> dict:
        """As problematicas registradas, com a nota de exatidao de cada familia.

        A observacao vai junto porque quem escolhe a problematica (o agente, a
        tela) precisa saber antes que as carteiras saem de amostragem e as
        demais sao exatas; descobrir isso depois do resultado e tarde.
        """
        return {
            "disponiveis": self._container.registry.describe(),
            "observacao": (
                "As problematicas de carteira (portfolio e beneficio-custo) "
                "devolvem a carteira como resultado aproximado, por amostragem "
                "de vertices do espaco de pesos; as outras tres sao exatas. Em "
                "beneficio-custo as faixas de razao sao exatas, so a carteira e "
                "amostrada."
            ),
        }

    def list(self) -> list[dict]:
        # `summaries`, e nao `list`: com banco, a listagem sai de uma consulta
        # so, sem trazer matriz de consequencias nem trilha de ninguem.
        return [
            summary_dto(resumo).to_dict()
            for resumo in self._container.repository.summaries()
        ]

    def describe(self, record_id: str) -> dict:
        record, _ = self._load(record_id)
        return problem_dto(record).to_dict()

    def state(self, record_id: str) -> dict:
        record, session = self._load(record_id)
        return state_dto(record, session).to_dict()

    def explain(self, record_id: str) -> dict:
        record, session = self._load(record_id)
        return audit_dto(record, session).to_dict()

    def max_differences(self, record_id: str) -> dict:
        """Diferencas maximas entre alternativas ainda incomparaveis (ranking).

        Sob demanda, e nao dentro de ``state``: sao dois LPs por par, e o painel
        que as mostra so e aberto as vezes.
        """
        record, session = self._load(record_id)
        maximas = getattr(session.problematic, "max_differences", None)
        if maximas is None:
            raise InvalidRequest(
                "Diferencas maximas sao uma leitura do ranking; esta decisao esta "
                f"em '{record.problematic_key}'."
            )
        if not session.is_consistent:
            return {"diferencas_maximas": []}
        return {"diferencas_maximas": maximas(record.problem, session.weight_space)}

    # --- escrita --------------------------------------------------------------

    def create(
        self,
        nome: str,
        alternativas: Sequence[str],
        criterios: Iterable[dict],
        consequencias: Sequence[Sequence[float]],
        problematica: str = "escolha",
        configuracao: dict | None = None,
        custos: Sequence[float] | None = None,
        limiar_de_equivalencia: float | None = None,
    ) -> dict:
        """Cria e persiste uma decisao nova, ainda sem nenhuma declaracao.

        Tudo o que pode ser conferido sem o decisor e conferido antes de gravar:
        tamanho, configuracao, limiar e o que a propria problematica exige.
        ``criterios`` aceita ``Criterion`` ou o dicionario serializado (o
        formato de ``criterion_to_dict``).

        Fora das carteiras, a resposta ja traz as alternativas dominadas por
        Pareto, para que o decisor possa retira-las antes da primeira pergunta,
        quando isso nao custa nada.

        Limitacao conhecida: grava antes de montar a resposta; uma falha ao
        montar ``problem_dto`` deixa a decisao criada sem que o chamador receba
        o id.

        Custo: comparacoes vetorizadas O(n^2 m) para a dominancia e o mapa de
        conflito; nenhum LP.
        Erros: InvalidRequest se a problematica for desconhecida, a
        configuracao tiver NaN/infinito ou o limiar for invalido;
        LimitExceeded se o tamanho ou as amostras passarem do teto; ValueError
        se a matriz, os custos ou a configuracao da problematica forem
        invalidos; KeyError se um criterio vier sem ``chave``.
        """
        if problematica not in self._container.registry.keys:
            raise InvalidRequest(
                f"Problematica '{problematica}' desconhecida. Disponiveis: "
                f"{', '.join(self._container.registry.keys)}."
            )

        criteria = tuple(_as_criterion(c) for c in criterios)
        self._check_size(nome, alternativas, criteria)

        settings = configuracao or {}
        self._check_settings(problematica, settings)
        equivalence = self._check_equivalence(limiar_de_equivalencia)

        problem = Problem(
            name=nome,
            criteria=criteria,
            alternatives=tuple(alternativas),
            consequences=np.array(consequencias, dtype=float),
            costs=tuple(float(c) for c in custos) if custos else None,
        )
        record = DecisionRecord(
            id=self._make_id(),
            problem=problem,
            problematic_key=problematica,
            settings=settings,
            equivalence=equivalence,
            created_at=self._container.clock.now(),
        )
        # a problematica confere o que ela propria exige, antes de persistir
        self._container.problematic(problematica, settings).validate(problem)

        self._container.repository.save(record)
        payload = problem_dto(record).to_dict()
        payload["proximo_passo"] = PROXIMO_PASSO
        # Nas carteiras o custo entra na conta: uma alternativa pior em todo
        # criterio ainda pode caber no orcamento onde a outra nao cabe.
        if problematica not in _CARTEIRAS:
            dominadas = pareto_dominance(problem)
            if dominadas:
                payload["dominadas"] = dominadas
                payload["leitura_das_dominadas"] = LEITURA_DAS_DOMINADAS
        return payload

    def rank_criteria(self, record_id: str, ordem: Sequence[str]) -> dict:
        """Registra a ordem dos pesos e recomeca a elicitacao do zero.

        Reordenar descarta TODAS as declaracoes anteriores, inclusive
        julgamentos holisticos: as perguntas de tradeoff respondidas se referiam
        a outra sequencia de pares. A resposta conta quantas foram descartadas
        em ``declaracoes_descartadas``.

        Limitacao conhecida: grava antes de montar a situacao (ver
        ``_commit``).

        Erros: InvalidRequest se ``ordem`` nao citar cada criterio exatamente
        uma vez.
        """
        record, session = self._load(record_id)
        indices = _resolve_order(record.problem, ordem)

        descartadas = len(session.log)
        # reordenar invalida as respostas anteriores, que se referiam a outra
        # sequencia de pares: recomeca de um log vazio
        renovada = self._container.session_for(
            _without_log(record)
        ).rank_criteria(indices)

        payload = self._commit(record, renovada)
        payload["declaracoes_descartadas"] = descartadas
        return payload

    def next_question(self, record_id: str) -> dict:
        """A pergunta pendente ou, se nao houver, a situacao com o motivo.

        So le: nada e gravado, e a pergunta mostrada nao fica associada ao
        registro. ``answer`` recalcula a pergunta pendente na hora de gravar
        (ver a limitacao descrita la).

        Erros: InvalidRequest se os criterios ainda nao foram ordenados.
        """
        record, session = self._load(record_id)
        if not session.started:
            raise InvalidRequest(
                "A elicitacao ainda nao comecou: ordene os criterios por peso antes."
            )

        brief = session.present_question()
        if brief is not None:
            return question_dto(record.id, brief).to_dict()

        payload = state_dto(record, session).to_dict()
        payload["pergunta"] = None
        payload["motivo"] = (
            "Nao ha mais pergunta util: o processo encerrou."
            if session.is_consistent
            else "As declaracoes sao inconsistentes; nao ha o que perguntar."
        )
        return payload

    def answer(self, record_id: str, preferencia: str) -> dict:
        """Registra a resposta do decisor a pergunta pendente e grava o log.

        Limitacao conhecida: a resposta e aplicada a pergunta que estiver
        pendente NO MOMENTO DA GRAVACAO -- o metodo chama ``next_question()`` de
        novo --, e nao a pergunta que o decisor viu: o pedido nao carrega
        nenhuma identificacao da pergunta. Duas abas, o chat e a tela, ou um
        cliente que repete o pedido depois de um timeout podem gravar a
        preferencia contra uma pergunta que nunca foi mostrada. A checagem de
        versao do adaptador Postgres so recusa escritas que se cruzam entre a
        leitura e a gravacao; um pedido repetido depois que o primeiro terminou
        passa, e os outros adaptadores nem essa checagem fazem.

        Limitacao conhecida: grava antes de montar a situacao (ver
        ``_commit``).

        Erros: InvalidRequest se ``preferencia`` nao for uma resposta aceita ou
        se nao houver pergunta pendente (elicitacao nao iniciada, encerrada ou
        inconsistente).
        """
        preference = parse_preference(preferencia)
        record, session = self._load(record_id)

        question = session.next_question()
        if question is None:
            raise InvalidRequest("Nao ha pergunta pendente para esta decisao.")

        return self._commit(record, session.answer(question, preference))

    def judge(self, record_id: str, preferida: str, sobre: str) -> dict:
        """Registra um julgamento holistico entre duas alternativas reais.

        Limitacao conhecida: grava antes de montar a situacao (ver
        ``_commit``).

        Erros: KeyError se um dos nomes nao for alternativa do problema;
        ValueError se as duas forem a mesma alternativa ou a declaracao for
        invalida para o problema.
        """
        record, session = self._load(record_id)
        problem = record.problem
        statement = HolisticJudgement(
            preferred=problem.index_of_alternative(preferida),
            over=problem.index_of_alternative(sobre),
        )
        return self._commit(record, session.record(statement))

    def undo(self, record_id: str) -> dict:
        """Desfaz a ultima declaracao, qualquer que seja o tipo, e grava o log.

        Limitacao conhecida: grava antes de montar a situacao (ver
        ``_commit``).

        Erros: InvalidRequest se nao houver declaracao a desfazer.
        """
        record, session = self._load(record_id)
        if not session.log.entries:
            raise InvalidRequest("Nao ha declaracao a desfazer.")
        return self._commit(record, session.undo())

    def switch_problematic(
        self, record_id: str, problematica: str, configuracao: dict | None = None
    ) -> dict:
        """Le o mesmo log sob outra problematica, sem reelicitar nada.

        ``configuracao`` ausente reaproveita a atual; presente, substitui a
        configuracao inteira. O limiar de equivalencia atravessa a troca.

        Limitacao conhecida: como em ``_commit``, grava antes de montar a
        situacao; uma falha ao montar deixa a troca persistida.

        Erros: InvalidRequest se a configuracao tiver NaN/infinito;
        UnknownProblematic se a chave nao estiver registrada; LimitExceeded se
        as amostras passarem do teto; ValueError se a configuracao ou o
        problema nao servirem para a problematica.
        """
        record, _ = self._load(record_id)
        settings = configuracao if configuracao is not None else record.settings
        self._check_settings(problematica, settings)

        problematic = self._container.problematic(problematica, settings)
        problematic.validate(record.problem)

        record.problematic_key = problematica
        record.settings = settings
        # o limiar de equivalencia nao e tocado: e da decisao, nao da leitura
        self._container.repository.save(record)
        return state_dto(record, self._container.session_for(record)).to_dict()

    def set_equivalence(self, record_id: str, limiar: float | None) -> dict:
        """Troca o limiar de equivalencia da decisao e rele o mesmo log.

        Nada e reelicitado. O limiar entra como folga no teste de dominancia e
        no criterio de parada, entao muda-lo reinterpreta as declaracoes que ja
        existem -- mesma ideia de ``DecisionSession.with_epsilon``, um andar
        acima: quem sabe remontar a problematica com outro evaluator e o
        container, nao a sessao.

        No sistema oficial o limiar e editavel durante a elicitacao, e nao so na
        revisao inicial; por isso nao ha aqui a trava que ``set_value_curve``
        tem. A diferenca e real: mudar a curva de valor muda a escala em que as
        respostas ja dadas foram dadas, enquanto o limiar nao toca em nenhuma
        restricao -- so em quanta diferenca ainda vale a pena perseguir.

        ``None`` devolve a decisao ao padrao do processo.

        Limitacao conhecida: grava antes de montar a situacao, como ``_commit``.

        Erros: InvalidRequest se o limiar nao for numero ou estiver fora de
        [MIN_EQUIVALENCE, MAX_EQUIVALENCE], NaN incluido.
        """
        record, _ = self._load(record_id)
        record.equivalence = self._check_equivalence(limiar)
        self._container.repository.save(record)
        return state_dto(record, self._container.session_for(record)).to_dict()

    def set_favorite(self, record_id: str, favorita: bool) -> dict:
        """Marca ou desmarca a decisao como favorita.

        O favorito e do registro, e nao do navegador, pelo motivo escrito no
        cabecalho de ``web/components/DecisoesSalvas.tsx``: aquela tela existe
        porque a lista local nao sobrevivia a troca de maquina nem a limpeza do
        navegador -- "quem trocasse de maquina, limpasse o navegador ou
        simplesmente voltasse depois nao via nada, embora o trabalho estivesse
        la". Um favorito em ``localStorage`` traria de volta esse problema.

        Unico caso de uso de escrita que nao passa por ``_load``: o favorito nao
        entra no replay nem impoe restricao nenhuma, entao remontar a sessao --
        que resolve o espaco de pesos -- seria pagar a analise inteira para
        gravar um booleano. A unica falha propria deste caso de uso e
        ``RecordNotFound``, que ``repository.get`` ja levanta; as demais sao as
        do armazenamento, comuns a todos (ver a classe).

        Devolve o resumo, e nao o estado, porque o que mudou e exatamente uma
        linha da listagem.
        """
        record = self._container.repository.get(record_id)
        record.favorite = bool(favorita)
        self._container.repository.save(record)
        return summary_dto(DecisionSummary.of(record)).to_dict()

    def sensitivity(self, record_id: str, limiares: Sequence[float]) -> dict:
        """Reprocessa o mesmo log com outras folgas de preferencia estrita.

        Nada e reelicitado: a analise de sensibilidade e uma releitura do log.

        O parametro varrido e o ``epsilon`` -- a folga entre as constantes de
        escala de dois CRITERIOS --, nao o limiar de equivalencia entre
        ALTERNATIVAS. Sao coisas diferentes, e chamar esta de "limiar de
        equivalencia" era o que confundia as duas. Quem quer mexer naquele outro
        procura ``set_equivalence``.

        Um cenario inconsistente volta com ``consistente=False`` e sem analise,
        em vez de interromper a varredura.

        Limitacao conhecida: os valores de ``limiares`` nao sao validados alem
        da conversao para ``float``. Um epsilon negativo e aceito e transforma a
        preferencia estrita ``k_i - k_j >= epsilon`` numa restricao que admite
        ``k_j > k_i``; NaN e infinito tambem nao sao recusados aqui. A mensagem
        "Limiar alto demais" dos cenarios inconsistentes supoe epsilon positivo.

        Custo: uma analise completa da decisao por limiar
        Erros: LimitExceeded se houver mais limiares que
        ``max_sensitivity_points``; ValueError ou TypeError se um limiar nao
        for conversivel para ``float``.
        """
        self._limits.check_sensitivity(len(limiares))
        record, session = self._load(record_id)

        cenarios = []
        for epsilon in limiares:
            variant = session.with_epsilon(float(epsilon))
            if not variant.is_consistent:
                cenarios.append(
                    ScenarioDTO(
                        limiar=float(epsilon),
                        consistente=False,
                        resumo="Limiar alto demais: torna as declaracoes incompativeis.",
                    )
                )
                continue
            analise = analysis_dto(variant.analyse())
            cenarios.append(
                ScenarioDTO(
                    limiar=float(epsilon),
                    consistente=True,
                    resumo=analise.resumo,
                    analise=analise,
                )
            )
        return SensitivityDTO(id=record.id, cenarios=cenarios).to_dict()

    def set_value_curve(
        self, record_id: str, criterio: str, pontos: Sequence[Sequence[float]] | None
    ) -> dict:
        """Define (ou remove) a curva de valor de um criterio.

        Muda como as consequencias viram valor, o que muda o resultado. Por isso
        so e permitido antes da elicitacao comecar: depois, as respostas ja dadas
        se referiam a outra escala.

        Erros: InvalidRequest se a elicitacao ja comecou; KeyError se o
        criterio nao existir; ValueError se a curva for invalida para a escala
        do criterio.
        """
        from dataclasses import replace as _replace

        record, session = self._load(record_id)
        if session.started:
            raise InvalidRequest(
                "A curva de valor precisa ser definida antes de ordenar os "
                "criterios: mudar a escala agora invalidaria as respostas dadas."
            )

        indice = record.problem.index_of_criterion(criterio)
        curva = (
            tuple((float(c), float(v)) for c, v in pontos) if pontos else None
        )
        criterios = list(record.problem.criteria)
        criterios[indice] = _replace(criterios[indice], value_points=curva)
        novo = _replace(record.problem, criteria=tuple(criterios))
        # acessar as escalas valida a curva agora, e nao na primeira analise
        novo.scales

        record.problem = novo
        self._container.repository.save(record)
        return problem_dto(record).to_dict()

    def diagnose(self, record_id: str) -> dict:
        """Quais declaracoes brigam entre si, e o que da para fazer."""
        _, session = self._load(record_id)
        return diagnosticar(session).to_dict()

    def resolve_inconsistency(
        self, record_id: str, acao: str, sequencia: int | None = None
    ) -> dict:
        """Aplica a saida escolhida pelo decisor para desfazer o conflito.

        As acoes aceitas sao ``desfazer``, ``inverter`` e ``remover``; a saida
        ``reordenar`` que ``diagnose`` pode oferecer nao passa por aqui, e sim
        por ``rank_criteria``. ``remover`` renumera as declaracoes mantidas e
        regrava o instante e o autor delas (ver ``inconsistency.resolver``).

        Limitacao conhecida: grava antes de montar a situacao (ver
        ``_commit``).

        Erros: ValueError se nao houver declaracao, a acao for desconhecida, a
        ultima declaracao nao puder ser invertida, ou ``sequencia`` faltar ou
        nao existir.
        """
        record, session = self._load(record_id)
        return self._commit(record, resolver(session, acao, sequencia))

    def consequence_sensitivity(
        self,
        record_id: str,
        variacoes: Sequence[dict],
        cenarios: int = 200,
        semente: int = 0,
    ) -> dict:
        """E se os numeros informados estiverem um pouco errados?

        Varia as consequencias dentro da faixa pedida e reprocessa a decisao,
        mantendo as respostas do decisor. E outra pergunta que a de
        ``sensitivity`` -- que varre o epsilon, a folga entre os pesos de dois
        criterios --, e as duas nao se substituem.

        Limitacao conhecida: so e medida de fato na problematica de escolha;
        nas demais a estabilidade informada nao mede nada, e cenarios
        inconsistentes contam contra a estabilidade sem aparecer na resposta
        (ver ``sensitivity.analisar``).

        Exatidao: aproximada (amostragem, semente fixa)
        Custo: uma analise completa da decisao por cenario
        Erros: LimitExceeded se houver variacoes ou cenarios demais;
        InvalidRequest se os criterios ainda nao foram ordenados; KeyError se
        uma variacao vier sem ``criterio``; ValueError se o criterio for
        desconhecido, a faixa for negativa ou passar de 100% para baixo, ou
        ``cenarios`` for menor que 1.
        """
        self._limits.check_sensitivity(len(variacoes))
        if cenarios > self._limits.max_sensitivity_scenarios:
            raise LimitExceeded(
                f"{cenarios} cenarios excedem o limite de "
                f"{self._limits.max_sensitivity_scenarios}. Cada cenario "
                f"reprocessa a decisao inteira."
            )

        _, session = self._load(record_id)
        if not session.started:
            raise InvalidRequest(
                "A analise de sensibilidade exige ao menos a ordenacao dos pesos."
            )

        pedidos = [
            VariacaoCriterio(
                criterio=v["criterio"],
                para_baixo=float(v.get("para_baixo", 10.0)),
                para_cima=float(v.get("para_cima", 10.0)),
            )
            for v in variacoes
        ]
        return analisar(session, pedidos, cenarios=cenarios, semente=semente).to_dict()

    # --- verificacoes ---------------------------------------------------------

    def _check_size(
        self, nome: str, alternativas: Sequence[str], criteria: tuple[Criterion, ...]
    ) -> None:
        self._limits.check_name(nome, "nome do problema")
        self._limits.check_problem(len(alternativas), len(criteria))
        for alternativa in alternativas:
            self._limits.check_name(alternativa, "nome de alternativa")
        for criterion in criteria:
            self._limits.check_name(criterion.name, "nome de criterio")
            if criterion.levels is not None:
                self._limits.check_levels(len(criterion.levels), criterion.key)

    def _check_equivalence(self, limiar: float | None) -> float | None:
        """Confere o limiar pedido; ``None`` atravessa como "usa o padrao".

        A conferencia fica aqui, e nao no schema da API, porque o servidor MCP
        monta o pedido sem passar por schema nenhum: a regra declarada la
        deixaria uma das duas portas sem porteiro.
        """
        if limiar is None:
            return None
        try:
            valor = float(limiar)
        except (TypeError, ValueError):
            raise InvalidRequest(
                f"O limiar de equivalência precisa ser um número; veio {limiar!r}."
            ) from None
        # NaN reprova nesta comparacao, que e o que se quer: ele atravessaria o
        # motor inteiro sem erro e envenenaria todo teste de dominancia
        if not MIN_EQUIVALENCE <= valor <= MAX_EQUIVALENCE:
            raise InvalidRequest(
                f"O limiar de equivalência precisa ficar entre "
                f"{MIN_EQUIVALENCE:g} e {MAX_EQUIVALENCE:g}; veio {valor:g}. "
                f"Ele compara os valores globais de duas alternativas, que vivem "
                f"em [0, 1]; o padrão do FITradeoff é {DEFAULT_EQUIVALENCE:g}. "
                f"Não confunda com os limiares da análise de "
                f"sensibilidade, que são folga entre os pesos de dois critérios."
            )
        return valor

    def _check_settings(self, problematica: str, settings: dict) -> None:
        # A configuracao chega como dicionario livre, sem tipo por campo, e o JSON
        # do Python aceita `NaN` e `Infinity`. Um orcamento NaN era aceito,
        # gravado, e dali em diante toda resposta sobre a decisao falhava ao ser
        # serializada: a decisao ficava inutilizavel.
        _recusar_nao_finitos(settings, "configuracao")
        # as duas leituras de carteira amostram vertices, e o teto e o mesmo
        if problematica in ("portfolio", "beneficio_custo"):
            self._limits.check_samples(int(settings.get("amostras", 24)))


def _recusar_nao_finitos(valor, onde: str) -> None:
    """Levanta ``InvalidRequest`` se houver NaN ou infinito em qualquer nivel."""
    if isinstance(valor, float) and not math.isfinite(valor):
        raise InvalidRequest(f"Valor nao finito em '{onde}': {valor}.")
    if isinstance(valor, dict):
        for chave, item in valor.items():
            _recusar_nao_finitos(item, f"{onde}.{chave}")
    elif isinstance(valor, (list, tuple)):
        for posicao, item in enumerate(valor):
            _recusar_nao_finitos(item, f"{onde}[{posicao}]")


def _without_log(record: DecisionRecord) -> DecisionRecord:
    """Copia do registro sem o historico, para recomecar a elicitacao."""
    return DecisionRecord(
        id=record.id,
        problem=record.problem,
        problematic_key=record.problematic_key,
        settings=record.settings,
        equivalence=record.equivalence,
        created_at=record.created_at,
    )


def _as_criterion(spec) -> Criterion:
    if isinstance(spec, Criterion):
        return spec
    return criterion_from_dict(spec)


def _resolve_order(problem: Problem, ordem: Sequence[str]) -> tuple[int, ...]:
    keys = [c.key for c in problem.criteria]
    if sorted(ordem) != sorted(keys):
        faltando = sorted(set(keys) - set(ordem))
        sobrando = sorted(set(ordem) - set(keys))
        raise InvalidRequest(
            "A ordenacao deve citar cada criterio exatamente uma vez. "
            f"Faltando: {faltando or 'nenhum'}. Desconhecidos: {sobrando or 'nenhum'}."
        )
    return tuple(keys.index(key) for key in ordem)


__all__ = ["DecisionService", "InvalidRequest", "LimitExceeded", "parse_preference"]
