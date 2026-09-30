"""Rotas da decisao.

Cada rota chama um caso de uso e traduz a falha para HTTP. A resposta e o
dicionario do DTO correspondente, ja definido no motor.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends
from fitradeoff import DecisionService

from ..config import Settings
from ..deps import CALCULO, LEVE, acervo, conferir_teto, get_settings, translate
from ..schemas import (
    AnswerIn,
    ConsequenceSensitivityIn,
    DecisionIn,
    FavoritaIn,
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
def problematicas(service: DecisionService = LEVE):
    """As problematicas que o motor sabe conduzir."""
    return _run(service.problematics)


@router.get("/decisoes", summary="Lista as decisoes")
def listar(service: DecisionService = LEVE):
    """Resumo das decisoes de quem chama, para a listagem.

    So o acervo da pessoa identificada, nunca o de outra.
    """
    return {"decisoes": _run(service.list)}


@router.post("/decisoes", status_code=201, summary="Cria uma decisao")
def criar(
    dados: DecisionIn,
    service: DecisionService = LEVE,
    caminho: Path = Depends(acervo),
    settings: Settings = Depends(get_settings),
):
    """Cria a decisao a partir das alternativas, criterios e consequencias.

    Erros: 400 dados incoerentes que o dominio recusa; 409 problematica ou configuracao
    que o motor recusa; 413 problema acima dos limites do motor; 422 corpo invalido.
    """
    _run(lambda: conferir_teto(caminho, settings, service))
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
def ver(decisao_id: str, service: DecisionService = LEVE):
    """O problema como foi declarado, com a configuracao da problematica.

    Erros: 404 decisao inexistente.
    """
    return _run(lambda: service.describe(decisao_id))


@router.get("/decisoes/{decisao_id}/estado", summary="Situacao atual")
def estado(decisao_id: str, service: DecisionService = CALCULO):
    """Situacao atual da elicitacao e o resultado da problematica ate aqui.

    Erros: 404 decisao inexistente.
    """
    return _run(lambda: service.state(decisao_id))


@router.post("/decisoes/{decisao_id}/ordenacao", summary="Ordena os criterios por peso")
def ordenar(
    decisao_id: str, dados: RankingIn, service: DecisionService = CALCULO
):
    """Registra a ordem dos criterios por peso, o primeiro passo da elicitacao.

    Reordenar recomeca a elicitacao: as declaracoes anteriores se referiam a outra
    sequencia de pares e sao descartadas (a resposta diz quantas).

    Erros: 404 decisao inexistente; 400 ou 409 ordem que o motor recusa; 409 edicao
    concorrente; 422 corpo invalido.
    """
    return _run(lambda: service.rank_criteria(decisao_id, dados.ordem))


@router.get("/decisoes/{decisao_id}/pergunta", summary="Proxima pergunta de tradeoff")
def pergunta(decisao_id: str, service: DecisionService = CALCULO):
    """A proxima pergunta de tradeoff, escolhida pelo motor.

    Erros: 404 decisao inexistente; 409 criterios ainda nao ordenados.
    """
    return _run(lambda: service.next_question(decisao_id))


@router.post("/decisoes/{decisao_id}/resposta", summary="Registra uma resposta")
def responder(
    decisao_id: str, dados: AnswerIn, service: DecisionService = CALCULO
):
    """Registra a resposta do decisor a pergunta pendente.

    Com ``pergunta_id`` (o que veio de GET /pergunta), a resposta fica presa a
    pergunta que o decisor viu: se outra aba, o chat ou um pedido repetido ja
    mudou a pergunta pendente, nada e gravado e a resposta e 409 -- a tela rele
    a pergunta e mostra a nova.

    Erros: 404 decisao inexistente; 409 ``pergunta_id`` que nao e mais o da
    pergunta pendente; 400 ou 409 resposta que o motor recusa (sem pergunta
    pendente, preferencia desconhecida); 409 edicao concorrente; 422 corpo
    invalido.
    """
    return _run(
        lambda: service.answer(
            decisao_id, dados.preferencia, pergunta_id=dados.pergunta_id
        )
    )


@router.post("/decisoes/{decisao_id}/julgamento", summary="Avaliacao holistica")
def julgar(
    decisao_id: str, dados: JudgementIn, service: DecisionService = CALCULO
):
    """Registra uma avaliacao holistica: uma alternativa preferida a outra.

    Erros: 404 decisao inexistente; 400 ou 409 julgamento que o motor recusa; 409 edicao
    concorrente; 422 corpo invalido.
    """
    return _run(lambda: service.judge(decisao_id, dados.preferida, dados.sobre))


@router.post("/decisoes/{decisao_id}/desfazer", summary="Desfaz a ultima declaracao")
def desfazer(decisao_id: str, service: DecisionService = CALCULO):
    """Desfaz a ultima declaracao registrada.

    Erros: 404 decisao inexistente; 409 nada a desfazer ou edicao concorrente.
    """
    return _run(lambda: service.undo(decisao_id))


@router.get("/decisoes/{decisao_id}/auditoria", summary="Trilha da decisao")
def auditoria(decisao_id: str, service: DecisionService = CALCULO):
    """A trilha da decisao: cada declaracao, quem a fez e quando.

    Erros: 404 decisao inexistente.
    """
    return _run(lambda: service.explain(decisao_id))


@router.get(
    "/decisoes/{decisao_id}/diferencas-maximas",
    summary="Diferencas maximas entre alternativas incomparaveis (ranking)",
)
def diferencas_maximas(decisao_id: str, service: DecisionService = CALCULO):
    """Diferenca maxima de valor entre alternativas incomparaveis (ranking).

    Fica fora de ``/estado`` porque custa dois LPs por par e so o diagrama de Hasse usa.

    Erros: 404 decisao inexistente; 409 decisao que nao esta em ranking.
    """
    # sob demanda, fora do /estado: dois LPs por par, e so o painel do Hasse usa
    return _run(lambda: service.max_differences(decisao_id))


@router.post("/decisoes/{decisao_id}/problematica", summary="Troca a leitura")
def trocar(
    decisao_id: str,
    dados: ProblematicIn,
    service: DecisionService = CALCULO,
):
    """Troca a problematica com que a decisao e lida, mantendo as declaracoes.

    Erros: 404 decisao inexistente; 400 ou 409 problematica ou configuracao que o motor
    recusa; 413 configuracao acima dos limites; 422 corpo invalido.
    """
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
    service: DecisionService = CALCULO,
):
    """Ajusta o limiar abaixo do qual duas alternativas contam como indiferentes.

    Nulo devolve a decisao ao padrao do servico. A faixa aceitavel e conferida no motor.

    Erros: 404 decisao inexistente; 400 ou 409 limiar fora da faixa; 422 corpo invalido.
    """
    return _run(
        lambda: service.set_equivalence(decisao_id, dados.limiar_de_equivalencia)
    )


@router.post(
    "/decisoes/{decisao_id}/favorita",
    summary="Marca ou desmarca a decisao como favorita",
)
def favorita(
    decisao_id: str,
    dados: FavoritaIn,
    service: DecisionService = LEVE,
):
    """Marca ou desmarca a decisao como favorita, e devolve o resumo dela.

    Idempotente: o corpo diz o estado desejado, e nao "alterna".

    Erros: 404 decisao inexistente; 422 corpo invalido.
    """
    # Devolve o resumo da decisao, e nao o estado: e a linha da listagem que
    # muda, e e ela que quem chamou precisa repintar.
    return _run(lambda: service.set_favorite(decisao_id, dados.favorita))


@router.post("/decisoes/{decisao_id}/sensibilidade", summary="Analise de sensibilidade")
def sensibilidade(
    decisao_id: str,
    dados: SensitivityIn,
    service: DecisionService = CALCULO,
):
    """Analise de sensibilidade sobre o limiar entre os pesos, para cada limiar pedido.

    Erros: 404 decisao inexistente; 409 pedido que o motor recusa; 413 limiares demais;
    422 corpo invalido.
    """
    return _run(lambda: service.sensitivity(decisao_id, dados.limiares))


@router.post(
    "/decisoes/{decisao_id}/sensibilidade-consequencias",
    summary="Sensibilidade sobre as consequencias",
)
def sensibilidade_consequencias(
    decisao_id: str,
    dados: ConsequenceSensitivityIn,
    service: DecisionService = CALCULO,
):
    """E se as consequencias informadas estiverem um pouco erradas?

    Varia as consequencias dentro da faixa pedida em cenarios sorteados e reprocessa a
    decisao mantendo as respostas do decisor. Resultado aproximado, por amostragem; a
    ``semente`` torna a rodada reproduzivel.

    Erros: 404 decisao inexistente; 409 criterios ainda nao ordenados; 413 variacoes ou
    cenarios acima do limite; 422 corpo invalido.
    """
    return _run(
        lambda: service.consequence_sensitivity(
            decisao_id,
            [v.model_dump() for v in dados.variacoes],
            cenarios=dados.cenarios,
            semente=dados.semente,
        )
    )


@router.get("/decisoes/{decisao_id}/diagnostico", summary="Diagnostico de inconsistencia")
def diagnostico(decisao_id: str, service: DecisionService = CALCULO):
    """Quais declaracoes se contradizem, quando o espaco de pesos fica vazio.

    Erros: 404 decisao inexistente.
    """
    return _run(lambda: service.diagnose(decisao_id))


@router.post("/decisoes/{decisao_id}/resolver", summary="Resolve a inconsistencia")
def resolver_inconsistencia(
    decisao_id: str,
    dados: ResolucaoIn,
    service: DecisionService = CALCULO,
):
    """Aplica uma saida do diagnostico: desfazer, inverter ou remover uma declaracao.

    Erros: 404 decisao inexistente; 400 ou 409 acao que o motor recusa; 409 edicao
    concorrente; 422 corpo invalido.
    """
    return _run(
        lambda: service.resolve_inconsistency(decisao_id, dados.acao, dados.sequencia)
    )


@router.post("/decisoes/{decisao_id}/curva-de-valor", summary="Curva de valor de um criterio")
def curva_de_valor(
    decisao_id: str,
    dados: CurvaDeValorIn,
    service: DecisionService = CALCULO,
):
    """Define a curva de valor de um criterio; ``pontos`` nulo volta a escala linear.

    So antes de ordenar os criterios: mudar a escala depois invalidaria as respostas
    dadas.

    Erros: 404 decisao inexistente; 400 curva que o dominio recusa; 409 elicitacao ja
    iniciada; 422 corpo invalido.
    """
    return _run(
        lambda: service.set_value_curve(decisao_id, dados.criterio, dados.pontos)
    )
