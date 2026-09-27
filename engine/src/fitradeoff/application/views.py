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
                curva_de_valor=(
                    [list(ponto) for ponto in criterion.value_points]
                    if criterion.value_points is not None
                    else None
                ),
                veto_superior=criterion.veto_upper,
                veto_inferior=criterion.veto_lower,
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


def _quando(record: DecisionRecord) -> tuple[str | None, str | None]:
    """Criacao e ultima modificacao, em ISO 8601.

    A ultima modificacao sai da trilha: a declaracao mais recente e, por
    definicao, a ultima vez que a decisao mudou. Sem declaracao nenhuma, a
    decisao esta como nasceu, e a criacao responde pelas duas.
    """
    criado = record.created_at.isoformat(timespec="seconds") if record.created_at else None
    if not len(record.log):
        return criado, criado
    ultima = max(entrada.recorded_at for entrada in record.log.entries)
    return criado, ultima.isoformat(timespec="seconds")


def summary_dto(record: DecisionRecord) -> SummaryDTO:
    criado, atualizado = _quando(record)
    return SummaryDTO(
        id=record.id,
        nome=record.problem.name,
        problematica=record.problematic_key,
        alternativas=record.problem.n_alternatives,
        criterios=record.problem.n_criteria,
        declaracoes=len(record.log),
        criado_em=criado,
        atualizado_em=atualizado,
        favorita=record.favorite,
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
        # quais faixas serao publicadas se decide *antes* de calcula-las: cada
        # uma custa dois LPs, e a tela mostra so as que seguem em disputa. A
        # analise ja esta memoizada na sessao, entao perguntar aqui e de graca.
        interesse = tuple(
            session.analyse().undecided or range(problem.n_alternatives)
        )
        # sob veto isto devolve o envelope penalizado, que e a faixa que
        # corresponde a recomendacao; sem veto, e a faixa de valor de sempre
        faixas = evaluator.bounds_by_index(problem, session.weight_space, interesse)
    except InfeasibleWeightSpace:
        return {}, {}

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
        # sai do evaluator que esta de fato avaliando, e nao do registro: assim
        # o que a tela mostra e o que produziu o resultado ao lado, sem que um
        # fallback esquecido aqui possa fazer os dois divergirem
        limiar_de_equivalencia=session.problematic.evaluator.equivalence,
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
        limiar_de_equivalencia=session.problematic.evaluator.equivalence,
        analise=analise,
    )
