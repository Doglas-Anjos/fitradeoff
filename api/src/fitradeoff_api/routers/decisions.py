"""Rotas da decisao.

Cada rota chama um caso de uso e traduz a falha para HTTP. A resposta e o
dicionario do DTO correspondente, ja definido no motor.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from fitradeoff import DecisionService

from ..deps import get_service, translate
from ..schemas import (
    AnswerIn,
    ConsequenceSensitivityIn,
    DecisionIn,
    JudgementIn,
    LimiarDeEquivalenciaIn,
    ProblematicIn,
    CurvaDeValorIn,
    RankingIn,
    ResolucaoIn,
    SensitivityIn,
)

router = APIRouter(prefix="/api", tags=["decisoes"])


def _run(acao):
    """Executa o caso de uso, convertendo falha prevista em resposta HTTP."""
    try:
        return acao()
    except Exception as exc:  # traduzido em translate, que reergue o inesperado
        raise translate(exc) from exc


@router.get("/problematicas", summary="Problematicas disponiveis")
def problematicas(service: DecisionService = Depends(get_service)):
    return _run(service.problematics)


@router.get("/decisoes", summary="Lista as decisoes")
def listar(service: DecisionService = Depends(get_service)):
    return {"decisoes": _run(service.list)}


@router.post("/decisoes", status_code=201, summary="Cria uma decisao")
def criar(dados: DecisionIn, service: DecisionService = Depends(get_service)):
    return _run(
        lambda: service.create(
            nome=dados.nome,
            alternativas=dados.alternativas,
            criterios=[c.model_dump() for c in dados.criterios],
            consequencias=dados.consequencias,
            problematica=dados.problematica,
            configuracao=dados.configuracao,
            custos=dados.custos,
            limiar_de_equivalencia=dados.limiar_de_equivalencia,
        )
    )


@router.get("/decisoes/{decisao_id}", summary="Problema completo")
def ver(decisao_id: str, service: DecisionService = Depends(get_service)):
    return _run(lambda: service.describe(decisao_id))


@router.get("/decisoes/{decisao_id}/estado", summary="Situacao atual")
def estado(decisao_id: str, service: DecisionService = Depends(get_service)):
    return _run(lambda: service.state(decisao_id))


@router.post("/decisoes/{decisao_id}/ordenacao", summary="Ordena os criterios por peso")
def ordenar(
    decisao_id: str, dados: RankingIn, service: DecisionService = Depends(get_service)
):
    return _run(lambda: service.rank_criteria(decisao_id, dados.ordem))


@router.get("/decisoes/{decisao_id}/pergunta", summary="Proxima pergunta de tradeoff")
def pergunta(decisao_id: str, service: DecisionService = Depends(get_service)):
    return _run(lambda: service.next_question(decisao_id))


@router.post("/decisoes/{decisao_id}/resposta", summary="Registra uma resposta")
def responder(
    decisao_id: str, dados: AnswerIn, service: DecisionService = Depends(get_service)
):
    return _run(lambda: service.answer(decisao_id, dados.preferencia))


@router.post("/decisoes/{decisao_id}/julgamento", summary="Avaliacao holistica")
def julgar(
    decisao_id: str, dados: JudgementIn, service: DecisionService = Depends(get_service)
):
    return _run(lambda: service.judge(decisao_id, dados.preferida, dados.sobre))


@router.post("/decisoes/{decisao_id}/desfazer", summary="Desfaz a ultima declaracao")
def desfazer(decisao_id: str, service: DecisionService = Depends(get_service)):
    return _run(lambda: service.undo(decisao_id))


@router.get("/decisoes/{decisao_id}/auditoria", summary="Trilha da decisao")
def auditoria(decisao_id: str, service: DecisionService = Depends(get_service)):
    return _run(lambda: service.explain(decisao_id))


@router.post("/decisoes/{decisao_id}/problematica", summary="Troca a leitura")
def trocar(
    decisao_id: str,
    dados: ProblematicIn,
    service: DecisionService = Depends(get_service),
):
    return _run(
        lambda: service.switch_problematic(
            decisao_id, dados.problematica, dados.configuracao
        )
    )


@router.post(
    "/decisoes/{decisao_id}/limiar-de-equivalencia",
    summary="Ajusta o limiar de equivalencia entre alternativas",
)
def limiar_de_equivalencia(
    decisao_id: str,
    dados: LimiarDeEquivalenciaIn,
    service: DecisionService = Depends(get_service),
):
    return _run(
        lambda: service.set_equivalence(decisao_id, dados.limiar_de_equivalencia)
    )


@router.post("/decisoes/{decisao_id}/sensibilidade", summary="Analise de sensibilidade")
def sensibilidade(
    decisao_id: str,
    dados: SensitivityIn,
    service: DecisionService = Depends(get_service),
):
    return _run(lambda: service.sensitivity(decisao_id, dados.limiares))


@router.post(
    "/decisoes/{decisao_id}/sensibilidade-consequencias",
    summary="Sensibilidade sobre as consequencias",
)
def sensibilidade_consequencias(
    decisao_id: str,
    dados: ConsequenceSensitivityIn,
    service: DecisionService = Depends(get_service),
):
    return _run(
        lambda: service.consequence_sensitivity(
            decisao_id,
            [v.model_dump() for v in dados.variacoes],
            cenarios=dados.cenarios,
            semente=dados.semente,
        )
    )


@router.get("/decisoes/{decisao_id}/diagnostico", summary="Diagnostico de inconsistencia")
def diagnostico(decisao_id: str, service: DecisionService = Depends(get_service)):
    return _run(lambda: service.diagnose(decisao_id))


@router.post("/decisoes/{decisao_id}/resolver", summary="Resolve a inconsistencia")
def resolver_inconsistencia(
    decisao_id: str,
    dados: ResolucaoIn,
    service: DecisionService = Depends(get_service),
):
    return _run(
        lambda: service.resolve_inconsistency(decisao_id, dados.acao, dados.sequencia)
    )


@router.post("/decisoes/{decisao_id}/curva-de-valor", summary="Curva de valor de um criterio")
def curva_de_valor(
    decisao_id: str,
    dados: CurvaDeValorIn,
    service: DecisionService = Depends(get_service),
):
    return _run(
        lambda: service.set_value_curve(decisao_id, dados.criterio, dados.pontos)
    )
