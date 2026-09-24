"""Construcao dos DTOs a partir do dominio.

Um lugar so: o formato exposto a um chat, a uma API HTTP ou a um relatorio e o
mesmo, e esta declarado em ``dto.py``.
"""

from __future__ import annotations

from ..elicitation.questions import QuestionBrief
from ..elicitation.session import DecisionSession
from ..problematics.base import Analysis
from ..repositories.base import DecisionRecord
from ..solvers.base import InfeasibleWeightSpace
from .dto import (
    AnalysisDTO,
    AuditDTO,
    CriterionDTO,
    ProblemDTO,
    QuestionDTO,
    StatementDTO,
    StateDTO,
    SummaryDTO,
)

PROXIMO_PASSO = (
    "Peça ao decisor que ordene os critérios do mais para o menos importante e "
    "registre com `ordenar_criterios`."
)

LEITURA_DA_TRILHA = (
    "Cada restrição saiu de uma declaração do decisor. Uma alternativa é "
    "descartada quando não existe nenhum conjunto de pesos compatível com todas "
    "elas que a favoreça."
)


def problem_dto(record: DecisionRecord) -> ProblemDTO:
    problem = record.problem
    chaves = [c.key for c in problem.criteria]
    return ProblemDTO(
        id=record.id,
        nome=problem.name,
        problematica=record.problematic_key,
        criterios=[
            CriterionDTO(
                chave=criterion.key,
                nome=criterion.name,
                unidade=criterion.unit,
                direcao=criterion.direction.value,
                melhor=scale.best,
                pior=scale.worst,
                escala="construida" if criterion.is_discrete else "continua",
            )
            for criterion, scale in zip(problem.criteria, problem.scales)
        ],
        consequencias={
            alternativa: dict(zip(chaves, linha))
            for alternativa, linha in zip(
                problem.alternatives, problem.consequences.tolist()
            )
        },
        valores={
            alternativa: {k: round(v, 6) for k, v in zip(chaves, linha)}
            for alternativa, linha in zip(
                problem.alternatives, problem.values.tolist()
            )
        },
        custos=(
            dict(zip(problem.alternatives, problem.costs)) if problem.costs else None
        ),
        configuracao=record.settings,
        declaracoes_registradas=len(record.log),
    )


def summary_dto(record: DecisionRecord) -> SummaryDTO:
    return SummaryDTO(
        id=record.id,
        nome=record.problem.name,
        problematica=record.problematic_key,
        alternativas=record.problem.n_alternatives,
        criterios=record.problem.n_criteria,
        declaracoes=len(record.log),
    )


def analysis_dto(analysis: Analysis) -> AnalysisDTO:
    return AnalysisDTO(
        problematica=analysis.problematic,
        resolvido=analysis.resolved,
        indefinidas=list(analysis.undecided),
        resumo=analysis.headline,
        detalhe=analysis.detail,
    )


def _ranges(record: DecisionRecord, session: DecisionSession):
    """Faixas de peso e de valor, ou vazias se o espaco de pesos ficou vazio."""
    problem = record.problem
    evaluator = session.problematic.evaluator
    try:
        pesos = {
            criterion.name: [round(b.lower, 4), round(b.upper, 4)]
            for criterion, b in zip(
                problem.criteria, evaluator.weight_bounds(problem, session.weight_space)
            )
        }
        faixas = evaluator.value_bounds(problem, session.weight_space)
    except InfeasibleWeightSpace:
        return {}, {}

    interesse = session.analyse().undecided or range(problem.n_alternatives)
    valores = {
        problem.alternatives[i]: [round(faixas[i].lower, 4), round(faixas[i].upper, 4)]
        for i in interesse
    }
    return pesos, valores


def state_dto(record: DecisionRecord, session: DecisionSession) -> StateDTO:
    """Situacao completa. Sai cedo nos dois casos em que nao ha analise a fazer."""
    base = dict(
        id=record.id,
        nome=record.problem.name,
        problematica=record.problematic_key,
        elicitacao_iniciada=session.started,
        declaracoes=len(session.log),
    )

    if not session.started:
        return StateDTO(**base, consistente=True, proximo_passo=PROXIMO_PASSO)

    if not session.is_consistent:
        return StateDTO(
            **base,
            consistente=False,
            encerrado=True,
            aviso=(
                "As declarações se contradizem: nenhum conjunto de pesos as "
                "satisfaz. Use `desfazer` para revisar a última."
            ),
        )

    pesos, valores = _ranges(record, session)
    return StateDTO(
        **base,
        consistente=True,
        encerrado=session.finished,
        analise=analysis_dto(session.analyse()),
        faixas_de_peso=pesos,
        faixas_de_valor=valores,
    )


def question_dto(record_id: str, brief: QuestionBrief) -> QuestionDTO:
    return QuestionDTO(
        id=record_id,
        enunciado=brief.as_text(),
        criterio_em_foco=brief.focus_criterion,
        criterio_rival=brief.rival_criterion,
        opcao_a=[linha.as_text() for linha in brief.option_a.lines],
        opcao_b=[linha.as_text() for linha in brief.option_b.lines],
        # fracao entre o pior e o melhor desempenho do criterio em foco; serve
        # para renderizar a pergunta como grafico de barras
        posicao_na_escala=round(brief.question.value, 6),
        como_responder=(
            "Chame `responder` com 'A', 'B' ou 'indiferente', conforme a resposta "
            "do decisor. Nao responda por ele."
        ),
    )


def audit_dto(record: DecisionRecord, session: DecisionSession) -> AuditDTO:
    """Trilha completa: quem declarou o que, quando, e o que isso impos."""
    analise = (
        analysis_dto(session.analyse())
        if session.started and session.is_consistent
        else None
    )
    return AuditDTO(
        id=record.id,
        declaracoes=[
            StatementDTO(
                sequencia=entry.sequence,
                autor=entry.actor,
                registrado_em=entry.recorded_at.isoformat(timespec="seconds"),
                declaracao=entry.statement.describe(record.problem),
            )
            for entry in session.log.entries
        ],
        restricoes_ativas=list(session.constraint_sources()),
        leitura=LEITURA_DA_TRILHA,
        analise=analise,
    )
