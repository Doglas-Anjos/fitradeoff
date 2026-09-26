"""Casos de uso da decisao.

Camada que o servidor MCP, uma API HTTP ou um script usam igualmente. Recebe o
container por construtor e nao conhece protocolo nenhum.

Nenhum caso de uso guarda estado derivado: todos carregam o registro, montam a
sessao por replay, agem, e persistem apenas o log.
"""

from __future__ import annotations

import secrets
from typing import Callable, Iterable, Sequence

import numpy as np

from ..container import Container
from ..domain.preferences import HolisticJudgement, Preference
from ..domain.problem import Criterion, Problem
from ..elicitation.session import DecisionSession
from ..repositories.base import DecisionRecord
from ..repositories.serialization import criterion_from_dict
from .dto import ScenarioDTO, SensitivityDTO
from .inconsistency import diagnosticar, resolver
from .limits import LimitExceeded, Limits
from .sensitivity import VariacaoCriterio, analisar
from .views import (
    PROXIMO_PASSO,
    analysis_dto,
    audit_dto,
    problem_dto,
    question_dto,
    state_dto,
    summary_dto,
)


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
    """Operacoes sobre decisoes persistidas."""

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
        """Persiste o log da sessao e devolve a situacao resultante."""
        record.log = session.log
        self._container.repository.save(record)
        return state_dto(record, session).to_dict()

    def session(self, record_id: str) -> DecisionSession:
        return self._load(record_id)[1]

    def problematics(self) -> dict:
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
        return [
            summary_dto(record).to_dict()
            for record in self._container.repository.list()
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
    ) -> dict:
        if problematica not in self._container.registry.keys:
            raise InvalidRequest(
                f"Problematica '{problematica}' desconhecida. Disponiveis: "
                f"{', '.join(self._container.registry.keys)}."
            )

        criteria = tuple(_as_criterion(c) for c in criterios)
        self._check_size(nome, alternativas, criteria)

        settings = configuracao or {}
        self._check_settings(problematica, settings)

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
            created_at=self._container.clock.now(),
        )
        # a problematica confere o que ela propria exige, antes de persistir
        self._container.problematic(problematica, settings).validate(problem)

        self._container.repository.save(record)
        payload = problem_dto(record).to_dict()
        payload["proximo_passo"] = PROXIMO_PASSO
        return payload

    def rank_criteria(self, record_id: str, ordem: Sequence[str]) -> dict:
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
        preference = parse_preference(preferencia)
        record, session = self._load(record_id)

        question = session.next_question()
        if question is None:
            raise InvalidRequest("Nao ha pergunta pendente para esta decisao.")

        return self._commit(record, session.answer(question, preference))

    def judge(self, record_id: str, preferida: str, sobre: str) -> dict:
        """Registra um julgamento holistico entre duas alternativas reais."""
        record, session = self._load(record_id)
        problem = record.problem
        statement = HolisticJudgement(
            preferred=problem.index_of_alternative(preferida),
            over=problem.index_of_alternative(sobre),
        )
        return self._commit(record, session.record(statement))

    def undo(self, record_id: str) -> dict:
        record, session = self._load(record_id)
        if not session.log.entries:
            raise InvalidRequest("Nao ha declaracao a desfazer.")
        return self._commit(record, session.undo())

    def switch_problematic(
        self, record_id: str, problematica: str, configuracao: dict | None = None
    ) -> dict:
        """Le o mesmo log sob outra problematica, sem reelicitar nada."""
        record, _ = self._load(record_id)
        settings = configuracao if configuracao is not None else record.settings
        self._check_settings(problematica, settings)

        problematic = self._container.problematic(problematica, settings)
        problematic.validate(record.problem)

        record.problematic_key = problematica
        record.settings = settings
        self._container.repository.save(record)
        return state_dto(record, self._container.session_for(record)).to_dict()

    def sensitivity(self, record_id: str, limiares: Sequence[float]) -> dict:
        """Reprocessa o mesmo log com outras folgas de preferencia estrita.

        Nada e reelicitado: a analise de sensibilidade e uma releitura do log.

        O parametro varrido e o ``epsilon`` -- a folga entre as constantes de
        escala de dois CRITERIOS --, nao o limiar de equivalencia entre
        ALTERNATIVAS. Sao coisas diferentes, e chamar esta de "limiar de
        equivalencia" era o que confundia as duas.
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
        """Aplica a saida escolhida pelo decisor para desfazer o conflito."""
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
        mantendo as respostas do decisor. E outra pergunta que a sensibilidade
        sobre o limiar de equivalencia, e as duas nao se substituem.
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

    def _check_settings(self, problematica: str, settings: dict) -> None:
        # as duas leituras de carteira amostram vertices, e o teto e o mesmo
        if problematica in ("portfolio", "beneficio_custo"):
            self._limits.check_samples(int(settings.get("amostras", 24)))


def _without_log(record: DecisionRecord) -> DecisionRecord:
    """Copia do registro sem o historico, para recomecar a elicitacao."""
    return DecisionRecord(
        id=record.id,
        problem=record.problem,
        problematic_key=record.problematic_key,
        settings=record.settings,
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
