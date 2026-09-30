"""Analise de sensibilidade sobre as consequencias.

Responde a pergunta que o decisor de fato faz: *"e se os numeros que eu informei
estiverem um pouco errados?"*. Varia o desempenho das alternativas dentro de uma
faixa percentual, reprocessa a decisao em cada cenario, e conta com que
frequencia a resposta muda.

Nao confundir com a sensibilidade de ``DecisionService.sensitivity``, que ja
existia e responde outra coisa: ela varre o epsilon, a folga da preferencia
estrita entre os pesos de dois criterios, e nao o limiar de equivalencia entre
alternativas. As duas sao uteis e nao se substituem.

O que conta como "a resposta" depende da problematica (ver ``_solucao``): o
conjunto de potencialmente otimas na escolha, a pre-ordem no ranking, a
alocacao em classes no sorting e a carteira nas duas leituras de carteira.

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

    Frequencias e estabilidade sao fracoes dos cenarios CONSISTENTES: um
    cenario cujo espaco de pesos ficou vazio nao tem solucao a comparar, e
    conta-lo como "mudou" puxaria a estabilidade para baixo sem motivo. Quantos
    foram sai em ``cenarios_inconsistentes``; ``cenarios`` continua sendo o
    total pedido. Sem nenhum cenario consistente, estabilidade e frequencias
    ficam em zero.

    ``solucao_original`` e ``frequencia`` falam de alternativas "na solucao";
    o que isso quer dizer em cada problematica esta em ``comparacao``.
    """

    cenarios: int
    criterios_variados: list[dict]
    # com que frequencia cada alternativa apareceu na solucao
    frequencia: dict[str, float] = field(default_factory=dict)
    solucao_original: list[str] = field(default_factory=list)
    estabilidade: float = 0.0
    entraram: dict[str, float] = field(default_factory=dict)
    sairam: dict[str, float] = field(default_factory=dict)
    cenarios_inconsistentes: int = 0
    problematica: str = ""
    comparacao: str = ""

    def to_dict(self) -> dict:
        return {
            "cenarios": self.cenarios,
            "criterios_variados": self.criterios_variados,
            "solucao_original": self.solucao_original,
            "estabilidade": round(self.estabilidade, 4),
            "frequencia": {k: round(v, 4) for k, v in self.frequencia.items()},
            "entraram": {k: round(v, 4) for k, v in self.entraram.items()},
            "sairam": {k: round(v, 4) for k, v in self.sairam.items()},
            "cenarios_consistentes": self.cenarios - self.cenarios_inconsistentes,
            "cenarios_inconsistentes": self.cenarios_inconsistentes,
            "problematica": self.problematica,
            "comparacao": self.comparacao,
            "leitura": (
                "Cada cenario sorteia um desempenho dentro da faixa informada e "
                "resolve o problema de novo, com as mesmas respostas suas. A "
                "estabilidade e a fracao dos cenarios consistentes em que a "
                "solucao nao mudou; os cenarios em que suas respostas deixaram "
                "de caber juntas sao contados a parte."
            ),
        }


@dataclass(frozen=True)
class _Solucao:
    """A resposta de uma problematica, reduzida ao que a sensibilidade compara.

    ``chave`` decide a estabilidade: dois cenarios tem a mesma solucao quando
    as chaves sao iguais. ``membros`` sao as alternativas "na solucao", que
    alimentam ``frequencia``, ``entraram`` e ``sairam`` -- e o que a tela
    destaca como solucao original.
    """

    chave: object
    membros: frozenset[str]


# O que cada problematica chama de "a solucao", em uma frase para o decisor.
_COMPARACAO = {
    "escolha": (
        "Compara o conjunto de alternativas potencialmente otimas; a solucao "
        "sao essas alternativas."
    ),
    "ranking": (
        "Compara a pre-ordem inteira (quem supera quem e quem empata); a "
        "solucao destacada sao as alternativas no topo, que ninguem supera."
    ),
    "sorting": (
        "Compara as classes possiveis de cada alternativa; a solucao destacada "
        "sao as alternativas que alcancam a melhor classe."
    ),
    "portfolio": (
        "Compara o conjunto de carteiras encontradas nas amostras de pesos; a "
        "solucao destacada sao os projetos presentes em todas elas."
    ),
    "beneficio_custo": (
        "Compara a carteira mais frequente nas amostras de pesos; a solucao "
        "sao os projetos dela."
    ),
}


def _solucao(problematica: str, detail: dict) -> _Solucao:
    """Extrai de ``Analysis.detail`` a solucao que a sensibilidade compara.

    Uma definicao por problematica, lida das chaves que cada uma produz:

    * escolha -- ``potencialmente_otimas``: o conjunto e a solucao;
    * ranking -- a pre-ordem, dada pelas arestas do diagrama de Hasse
      (``dominancia_direta``, que determinam a dominancia estrita por
      transitividade) mais os empates (``indiferencas``); membros sao o topo
      (``niveis[0]``);
    * sorting -- ``alocacao``: as classes possiveis de cada alternativa;
      membros sao as que alcancam a melhor classe (a ultima de ``classes``);
    * portfolio -- o conjunto de carteiras de ``portfolios_encontrados``,
      porque a problematica nao diz qual e a mais frequente; membros sao os
      ``sempre_selecionados``;
    * beneficio_custo -- os projetos de ``carteira_mais_frequente``.

    Erros: InvalidRequest se a problematica nao tiver definicao aqui -- uma
    estabilidade que nao mede nada e pior que nenhuma.
    """
    if problematica == "escolha":
        membros = frozenset(detail["potencialmente_otimas"])
        return _Solucao(chave=membros, membros=membros)
    if problematica == "ranking":
        arestas = frozenset((a["de"], a["para"]) for a in detail["dominancia_direta"])
        empates = frozenset(
            frozenset((par["a"], par["b"])) for par in detail["indiferencas"]
        )
        niveis = detail["niveis"]
        return _Solucao(
            chave=(arestas, empates),
            membros=frozenset(niveis[0]) if niveis else frozenset(),
        )
    if problematica == "sorting":
        alocacao = detail["alocacao"]
        melhor = detail["classes"][-1]
        return _Solucao(
            chave=frozenset(
                (nome, tuple(item["classes_possiveis"]))
                for nome, item in alocacao.items()
            ),
            membros=frozenset(
                nome
                for nome, item in alocacao.items()
                if melhor in item["classes_possiveis"]
            ),
        )
    if problematica == "portfolio":
        return _Solucao(
            chave=frozenset(
                frozenset(c["projetos"]) for c in detail["portfolios_encontrados"]
            ),
            membros=frozenset(detail["sempre_selecionados"]),
        )
    if problematica == "beneficio_custo":
        projetos = frozenset(detail["carteira_mais_frequente"]["projetos"])
        return _Solucao(chave=projetos, membros=projetos)

    from .service import InvalidRequest  # adiado: service importa este modulo

    raise InvalidRequest(
        f"A analise de sensibilidade das consequencias nao sabe o que comparar "
        f"na problematica '{problematica}'."
    )


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

    A solucao comparada depende da problematica (ver ``_solucao``). Cenarios
    cujo espaco de pesos fica vazio nao tem solucao: sao contados em
    ``cenarios_inconsistentes`` e ficam fora do denominador da estabilidade e
    das frequencias.

    Nas carteiras, a propria solucao de cada cenario sai de amostragem de
    vertices; a estabilidade herda essa aproximacao.

    Exatidao: aproximada (amostragem; semente fixa, entao reprodutivel)
    Custo: um replay e uma analise completa da decisao por cenario
    Erros: ValueError se ``variacoes`` estiver vazia, ``cenarios`` for menor
    que 1 ou um criterio for desconhecido; InvalidRequest se as declaracoes
    ja forem inconsistentes no problema original ou se a problematica nao
    tiver definicao de solucao.
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

    if not session.is_consistent:
        from .service import InvalidRequest  # adiado: service importa este modulo

        raise InvalidRequest(
            "As declaracoes ja sao inconsistentes no problema original; resolva "
            "a inconsistencia antes de analisar a sensibilidade."
        )
    analise = session.analyse()
    problematica = analise.problematic
    referencia = _solucao(problematica, analise.detail)
    conjunto_original = set(referencia.membros)
    # na ordem das alternativas, e nao na do conjunto, para sair reprodutivel
    original = [a for a in problem.alternatives if a in conjunto_original]

    rng = np.random.default_rng(semente)
    contagem: dict[str, int] = {a: 0 for a in problem.alternatives}
    iguais = 0
    inconsistentes = 0
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
            inconsistentes += 1
            continue

        resposta = _solucao(problematica, variante.analyse().detail)
        solucao = set(resposta.membros)
        for nome in solucao:
            contagem[nome] += 1
        if resposta.chave == referencia.chave:
            iguais += 1
        for nome in solucao - conjunto_original:
            entraram[nome] += 1
        for nome in conjunto_original - solucao:
            sairam[nome] += 1

    # sem cenario consistente nao ha o que medir: tudo fica em zero, e o
    # numero de inconsistentes explica por que
    consistentes = cenarios - inconsistentes
    base = consistentes or 1
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
        estabilidade=iguais / base,
        frequencia={a: c / base for a, c in contagem.items()},
        entraram={a: c / base for a, c in entraram.items() if c},
        sairam={a: c / base for a, c in sairam.items() if c},
        cenarios_inconsistentes=inconsistentes,
        problematica=problematica,
        comparacao=_COMPARACAO[problematica],
    )
