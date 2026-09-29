"""Construcao dos DTOs a partir do dominio.

Um lugar so: o formato exposto a um chat, a uma API HTTP ou a um relatorio e o
mesmo, e esta declarado em ``dto.py``.
"""

from __future__ import annotations

import numpy as np

from ..domain.preferences import HolisticJudgement
from ..domain.problem import Problem
from ..elicitation.questions import QuestionBrief
from ..elicitation.session import DecisionSession
from ..problematics.base import Analysis
from ..repositories.base import DecisionRecord, DecisionSummary
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

# Sem nome de ferramenta: o motor e usado pelo MCP (`rank_criteria`) e pelo chat
# da tela (`ordenar_criterios`), e cada um ja diz nas proprias instrucoes qual
# ferramenta registra a ordem. Um nome aqui estaria errado para um dos dois.
PROXIMO_PASSO = (
    "Peça ao decisor que ordene os critérios do mais para o menos importante e "
    "registre essa ordem."
)

LEITURA_DAS_DOMINADAS = (
    "Cada alternativa listada é pior ou igual, em todos os critérios, a cada uma "
    "das que a dominam, e estritamente pior em pelo menos um. Com quaisquer "
    "pesos ela nunca vale mais que elas -- dá para dizer isso ao decisor antes "
    "de qualquer pergunta. `dominada_por` mostra até três nomes; o total vem "
    "em `total_de_dominantes`. Retirá-la é criar o problema de novo sem ela, e "
    "antes da primeira pergunta isso não custa nada ao decisor."
)


DOMINANTES_LISTADOS = 3


def pareto_dominance(problem: Problem) -> list[dict]:
    """Alternativas dominadas criterio a criterio, sem pergunta nenhuma.

    E a dominancia que independe de pesos: ``a`` domina ``b`` quando e pelo
    menos tao boa em todo criterio e melhor em algum. Sai da matriz de valor,
    que ja resolveu direcao, escala construida e curva elicitada -- em valor,
    maior e sempre melhor.

    Vale tambem sob veto. O valor penalizado e ``r . V``, com ``r`` e ``V``
    somas ponderadas de fatores nao negativos, e o fator de veto so cresce com o
    valor do criterio: melhor ou igual em todo ``v`` implica melhor ou igual em
    todo ``z``, e o produto preserva a ordem. Comparamos os dois mesmo assim,
    para que a conclusao nao dependa desse argumento.

    Alternativas identicas nao se dominam: ninguem e estritamente melhor.

    Vetorizado: com 500 alternativas, o teto do motor, sao 250 mil pares, e
    isto roda a cada criacao. Os nomes de quem domina vao ate
    ``DOMINANTES_LISTADOS``, com o total ao lado -- a lista inteira, numa
    matriz grande, encheria de nomes o contexto de quem le.
    """
    valores = problem.values
    fatores = problem.veto_factors
    # domina[a, b]: a domina b
    domina = (
        (valores[:, None, :] >= valores[None, :, :]).all(axis=2)
        & (fatores[:, None, :] >= fatores[None, :, :]).all(axis=2)
        & (valores[:, None, :] > valores[None, :, :]).any(axis=2)
    )
    dominadas = []
    for b in np.flatnonzero(domina.any(axis=0)):
        por = np.flatnonzero(domina[:, b])
        dominadas.append(
            {
                "alternativa": problem.alternatives[b],
                "dominada_por": problem.names_of(por[:DOMINANTES_LISTADOS]),
                "total_de_dominantes": int(por.size),
            }
        )
    return dominadas


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
                niveis=list(criterion.levels) if criterion.levels is not None else None,
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


def _iso(instante) -> str | None:
    return instante.isoformat(timespec="seconds") if instante else None


def summary_dto(resumo: DecisionSummary) -> SummaryDTO:
    return SummaryDTO(
        id=resumo.id,
        nome=resumo.nome,
        problematica=resumo.problematica,
        alternativas=resumo.alternativas,
        criterios=resumo.criterios,
        declaracoes=resumo.declaracoes,
        criado_em=_iso(resumo.criado_em),
        atualizado_em=_iso(resumo.atualizado_em),
        favorita=resumo.favorita,
    )


def analysis_dto(analysis: Analysis, record: DecisionRecord | None = None) -> AnalysisDTO:
    return AnalysisDTO(
        problematica=analysis.problematic,
        resolvido=analysis.resolved,
        indefinidas=list(analysis.undecided),
        resumo=analysis.headline,
        detalhe=_com_origem(analysis.detail, record),
    )


def _com_origem(detalhe: dict, record: DecisionRecord | None) -> dict:
    """Diz de onde veio cada seta do diagrama de Hasse.

    O sistema de referencia desenha em vermelho a dominancia que o decisor
    declarou numa avaliacao holistica, e em preto a que saiu da decomposicao.
    A problematica so ve o espaco de pesos, e nao a trilha; aqui a trilha esta a
    mao. Vermelha e a seta que uma avaliacao holistica afirma diretamente.
    """
    if record is None or "dominancia_direta" not in detalhe:
        return detalhe
    nomes = record.problem.alternatives
    holisticas = {
        (nomes[st.preferred], nomes[st.over]) for st in record.log.of_type(HolisticJudgement)
    }
    return {
        **detalhe,
        "dominancia_direta": [
            {
                **aresta,
                "origem": (
                    "holistica"
                    if (aresta["de"], aresta["para"]) in holisticas
                    else "decomposicao"
                ),
            }
            for aresta in detalhe["dominancia_direta"]
        ],
    }


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
        analise=analysis_dto(session.analyse(), record),
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
        analysis_dto(session.analyse(), record)
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
