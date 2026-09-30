"""Analise de sensibilidade sobre as consequencias.

Responde a pergunta que o decisor de fato faz: *"e se os numeros que eu informei
estiverem um pouco errados?"*. Varia o desempenho das alternativas dentro de uma
faixa percentual, reprocessa a decisao em cada cenario, e conta com que
frequencia a resposta muda.

Nao confundir com a sensibilidade de ``DecisionService.sensitivity``, que ja
existia e responde outra coisa: ela varre o epsilon, a folga da preferencia
estrita entre os pesos de dois criterios, e nao o limiar de equivalencia entre
alternativas. As duas sao uteis e nao se substituem.

Limitacao conhecida: a comparacao entre cenarios usa
``detail["potencialmente_otimas"]``, que so a problematica de escolha produz.
Ver ``analisar``.

O sorteio usa semente fixa: uma analise que muda de resultado a cada execucao
nao serve para defender uma decisao.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from ..domain.problem import Problem
from ..elicitation.session import DecisionSession


@dataclass(frozen=True)
class VariacaoCriterio:
    """Faixa percentual em que o desempenho de um criterio pode variar."""

    criterio: str
    para_baixo: float = 10.0
    para_cima: float = 10.0

    def __post_init__(self) -> None:
        if self.para_baixo < 0 or self.para_cima < 0:
            raise ValueError("As variacoes sao percentuais nao negativos.")
        if self.para_baixo > 100:
            raise ValueError("Uma variacao para baixo acima de 100% inverte o sinal.")


@dataclass
class ResultadoSensibilidade:
    """Resultado de ``analisar``, devolvido pela API e pelo MCP via ``to_dict``.

    Frequencias e estabilidade sao fracoes do total de cenarios PEDIDOS, nao
    dos cenarios consistentes; o numero de cenarios inconsistentes nao e
    informado. Ver as limitacoes em ``analisar``.
    """

    cenarios: int
    criterios_variados: list[dict]
    # com que frequencia cada alternativa apareceu na solucao
    frequencia: dict[str, float] = field(default_factory=dict)
    solucao_original: list[str] = field(default_factory=list)
    estabilidade: float = 0.0
    entraram: dict[str, float] = field(default_factory=dict)
    sairam: dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "cenarios": self.cenarios,
            "criterios_variados": self.criterios_variados,
            "solucao_original": self.solucao_original,
            "estabilidade": round(self.estabilidade, 4),
            "frequencia": {k: round(v, 4) for k, v in self.frequencia.items()},
            "entraram": {k: round(v, 4) for k, v in self.entraram.items()},
            "sairam": {k: round(v, 4) for k, v in self.sairam.items()},
            "leitura": (
                "Cada cenario sorteia um desempenho dentro da faixa informada e "
                "resolve o problema de novo, com as mesmas respostas suas. A "
                "estabilidade e a fracao de cenarios em que a solucao nao mudou."
            ),
        }


def _problema_perturbado(
    problem: Problem, fatores: np.ndarray, indices: list[int]
) -> Problem:
    """Copia do problema com as consequencias dos criterios escolhidos alteradas."""
    matriz = problem.consequences.copy()
    for posicao, j in enumerate(indices):
        matriz[:, j] = matriz[:, j] * fatores[:, posicao]
    return Problem(
        name=problem.name,
        criteria=problem.criteria,
        alternatives=problem.alternatives,
        consequences=matriz,
        costs=problem.costs,
    )


def analisar(
    session: DecisionSession,
    variacoes: list[VariacaoCriterio],
    cenarios: int = 200,
    semente: int = 0,
) -> ResultadoSensibilidade:
    """Reprocessa a decisao em ``cenarios`` versoes perturbadas do problema.

    As respostas do decisor nao mudam: o que varia sao os numeros do problema.
    Isso isola o efeito da incerteza dos dados da incerteza das preferencias.
    Cada alternativa recebe um fator proprio por criterio variado, sorteado
    uniformemente em ``[1 - para_baixo/100, 1 + para_cima/100]`` e aplicado a
    consequencia na unidade do criterio.

    Limitacao conhecida: a "solucao" comparada e
    ``detail["potencialmente_otimas"]``, que so a problematica de escolha
    produz. Nas outras (ranking, sorting, carteiras) a solucao original e cada
    cenario viram o conjunto vazio, todo cenario consistente conta como
    "igual", e a estabilidade informada e so a fracao de cenarios
    consistentes -- nao mede se o ranking, as classes ou a carteira mudaram.
    As frequencias saem todas zero.

    Limitacao conhecida: cenarios cujo espaco de pesos fica vazio sao pulados,
    mas continuam no denominador. Eles puxam para baixo a estabilidade e as
    frequencias como se a solucao tivesse mudado, e o resultado nao diz
    quantos foram.

    Exatidao: aproximada (amostragem; semente fixa, entao reprodutivel)
    Custo: um replay e uma analise completa da decisao por cenario
    Erros: ValueError se ``variacoes`` estiver vazia, ``cenarios`` for menor
    que 1 ou um criterio for desconhecido.
    """
    problem = session.problem
    if not variacoes:
        raise ValueError("Escolha ao menos um criterio para variar.")
    if cenarios < 1:
        raise ValueError("A analise precisa de ao menos um cenario.")

    chaves = [c.key for c in problem.criteria]
    indices = []
    for variacao in variacoes:
        if variacao.criterio not in chaves:
            raise ValueError(f"Criterio desconhecido: {variacao.criterio!r}.")
        indices.append(chaves.index(variacao.criterio))

    original = list(session.analyse().detail.get("potencialmente_otimas", []))
    conjunto_original = set(original)

    rng = np.random.default_rng(semente)
    contagem: dict[str, int] = {a: 0 for a in problem.alternatives}
    iguais = 0
    entraram: dict[str, int] = {a: 0 for a in problem.alternatives}
    sairam: dict[str, int] = {a: 0 for a in problem.alternatives}

    for _ in range(cenarios):
        fatores = np.empty((problem.n_alternatives, len(indices)))
        for posicao, variacao in enumerate(variacoes):
            fatores[:, posicao] = rng.uniform(
                1 - variacao.para_baixo / 100,
                1 + variacao.para_cima / 100,
                size=problem.n_alternatives,
            )

        variante = session.with_problem(_problema_perturbado(problem, fatores, indices))
        if not variante.is_consistent:
            continue

        solucao = set(variante.analyse().detail.get("potencialmente_otimas", []))
        for nome in solucao:
            contagem[nome] += 1
        if solucao == conjunto_original:
            iguais += 1
        for nome in solucao - conjunto_original:
            entraram[nome] += 1
        for nome in conjunto_original - solucao:
            sairam[nome] += 1

    return ResultadoSensibilidade(
        cenarios=cenarios,
        criterios_variados=[
            {
                "criterio": problem.criteria[j].name,
                "chave": v.criterio,
                "para_baixo": v.para_baixo,
                "para_cima": v.para_cima,
            }
            for v, j in zip(variacoes, indices)
        ],
        solucao_original=original,
        estabilidade=iguais / cenarios,
        frequencia={a: c / cenarios for a, c in contagem.items()},
        entraram={a: c / cenarios for a, c in entraram.items() if c},
        sairam={a: c / cenarios for a, c in sairam.items() if c},
    )
