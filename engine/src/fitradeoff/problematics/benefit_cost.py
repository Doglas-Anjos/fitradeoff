"""Problematica de carteira pela razao beneficio-custo.

E o outro modulo de portfolio do FITradeoff, distinto do combinatorial. A
diferenca nao e de implementacao, e de criterio: o combinatorial maximiza o
beneficio agregado dentro do orcamento (uma mochila), enquanto aqui o decisor
quer eficiencia por unidade de recurso -- ordena os projetos pela razao entre
beneficio e custo e desce a lista enquanto o orcamento permitir. As duas
leituras discordam de proposito: um projeto caro e muito bom vence a mochila e
perde a razao.

Por que a razao virou intervalo. Sob informacao parcial o beneficio de um
projeto nao e um numero: o valor global ``v_i(k) = valor_i . k`` varia com os
pesos ainda admissiveis. O custo, ao contrario, e constante e conhecido. Logo
``v_i(k) / c_i`` e funcao *linear* de ``k``, e os seus extremos sobre o espaco
de pesos saem de dois programas lineares -- sao exatos, nao amostrados. Dai a
leitura honesta: cada projeto tem uma FAIXA de razao, e dois projetos so se
comparam com certeza quando as faixas nao se sobrepoem.

O que resta aproximado e a carteira. A ordem completa da lista depende do vetor
de pesos, e projetos de faixas sobrepostas trocam de posicao dentro do espaco
viavel; a selecao gulosa tambem interage com o orcamento (quem entra antes muda
quem ainda cabe). Entao repetimos o procedimento do combinatorial: ordenar e
selecionar em cada vertice amostrado, e reportar quem entra sempre, quem nunca
entra e quem oscila -- nas amostras avaliadas. A ressalva vai junto do
resultado, e diz qual metade e qual.

Quando parar de perguntar. Pela ordem completa das razoes, e nao pela carteira:
a elicitacao so termina quando, para cada par de projetos, a razao de um supera
a do outro em todo vetor de pesos ainda admissivel. E o que o sistema oficial
faz -- medido em 27/09/2026: com essa parada, `bc-08` e `bc-20` fazem as mesmas
17 perguntas que ele, e na mesma ordem. A parada anterior (encerrar quando a
carteira ficasse unica) coincidia com a dele em `bc-08` por acaso e parava seis
perguntas antes em `bc-20`.

Cinco hipoteses tinham sido refutadas antes desta (separacao das faixas de
razao, largura das faixas de razao, largura das faixas de valor, esgotamento da
bissecao, resolucao mais grossa de bracket; ver ``paridade/EQUIVALENCIA.md``).
A que faltava testar era a mais natural para quem ordena por razao: ordem par a
par por dominancia, com LP, e nao por faixas disjuntas -- duas faixas podem se
sobrepor e ainda assim a ordem entre as razoes ser a mesma em todo peso.

A carteira continua sendo o resultado, e continua a mesma; o que muda e que a
tela diz quando ela ja esta definida mas a ordem ainda nao.
"""

from __future__ import annotations

import numpy as np

from ..domain.problem import Problem
from ..domain.weights import WeightSpace
from ..solvers.base import TOLERANCE
from .base import Analysis, Problematic
from .evaluator import Evaluator


def _numero(valor: float, casas: int) -> float:
    """Arredonda somando zero, para nao publicar ``-0.0``.

    O LP devolve zero negativo quando o otimo e exatamente zero, e um projeto
    cujo "maximo" aparece como -0.0 abaixo do minimo 0.0 faz o decisor duvidar
    do resto da tabela.
    """
    return round(float(valor) + 0.0, casas)


def concordar(quantos: int, singular: str, plural: str) -> str:
    """"1 projeto" e "2 projetos" -- o numero e a palavra saem juntos."""
    return f"{quantos} {singular if quantos == 1 else plural}"


class BenefitCostProblematic(Problematic):
    """Le o espaco de pesos como carteira gulosa pela razao valor/custo.

    Resolvida quando a ordem das razoes fecha para todo par de projetos, ou,
    enquanto o espaco de pesos so tem a ordenacao dos criterios, quando o
    orcamento ja fixa a carteira (``_carteira_fechada_pelo_orcamento``).

    Toda comparacao interna (ordem das razoes, dominancia, carteira gulosa e
    parada pelo orcamento) usa o custo como fracao do orcamento, ``c / B``, e
    nao na unidade informada: a razao fica em valor global por orcamento
    inteiro, e a ``TOLERANCE`` absoluta significa a mesma coisa com custos em
    reais ou em milhoes de reais. "O projeto nao agrega valor" e testado no
    beneficio, que ja esta em [0, 1]. As razoes publicadas no detalhe
    continuam na unidade original (valor por unidade de custo).

    Paridade: bc-08 e bc-20, 27/09/2026 (parada pela ordem das razoes);
    vol-bc-3x8 e fin-B2, 29/09/2026 (parada pelo orcamento)
    Exatidao: exata (LP) nas faixas e na ordem das razoes; aproximada
    (amostragem) na carteira
    Custo: 2n LPs das faixas, 2m + ``samples`` LPs dos vertices (m = numero de
    criterios) e 2 LPs por par de faixas de razao sobrepostas
    Unidade: razao publicada em valor global por unidade de custo; comparada
    internamente em valor global por fracao do orcamento
    Erros: ValueError na construcao se o orcamento nao for positivo; na
    validacao, se faltarem custos ou nenhuma alternativa couber no orcamento
    """

    key = "beneficio_custo"
    label = "Carteira pela razao beneficio-custo"

    def __init__(
        self,
        evaluator: Evaluator,
        budget: float,
        samples: int = 24,
        seed: int = 0,
    ) -> None:
        super().__init__(evaluator)
        if budget <= 0:
            raise ValueError(
                "A leitura benefício-custo exige um orçamento positivo: informe "
                "'orcamento' na configuração da problemática."
            )
        self._budget = float(budget)
        self._samples = samples
        self._seed = seed

    def _validate(self, problem: Problem) -> None:
        costs = problem.require_costs()
        if min(costs) > self._budget:
            raise ValueError(
                f"Nenhuma alternativa cabe no orçamento de {self._budget}: "
                f"a mais barata custa {min(costs)}."
            )

    def _analyse(self, problem: Problem, space: WeightSpace) -> Analysis:
        costs = np.asarray(problem.require_costs(), dtype=float)
        # Custo como fracao do orcamento: e nesta escala que toda comparacao
        # com TOLERANCE acontece, para o resultado nao depender da unidade em
        # que o usuario digitou o custo (com custos ~1e7 a razao na unidade
        # original ficava toda abaixo de 1e-7 e a carteira saia vazia).
        custo_relativo = costs / self._budget

        # Parte exata: o custo e constante, entao a razao e linear nos pesos e a
        # sua faixa e a faixa do valor global dividida pelo custo. Nenhuma
        # amostragem envolvida -- sao dois LPs por projeto.
        faixas = self.evaluator.value_bounds(problem, space)
        beneficio_minimo = np.array([faixa.lower for faixa in faixas])
        beneficio_maximo = np.array([faixa.upper for faixa in faixas])
        # publicadas na unidade original
        razao_minima = beneficio_minimo / costs
        razao_maxima = beneficio_maximo / costs
        # comparadas na escala do orcamento
        razao_relativa_minima = beneficio_minimo / custo_relativo
        razao_relativa_maxima = beneficio_maximo / custo_relativo

        dominancia = self._dominancia_por_razao(
            razao_relativa_minima, razao_relativa_maxima
        )

        vertices = self.evaluator.sample_weight_vertices(
            problem, space, extra=self._samples, seed=self._seed
        )
        contagem_de_carteiras: dict[tuple[int, ...], int] = {}
        for weights in vertices:
            carteira = self._selecionar_por_razao(
                problem.values @ weights, custo_relativo
            )
            contagem_de_carteiras[carteira] = contagem_de_carteiras.get(carteira, 0) + 1

        total = len(contagem_de_carteiras)
        presenca = np.zeros(problem.n_alternatives, dtype=int)
        for carteira in contagem_de_carteiras:
            for projeto in carteira:
                presenca[projeto] += 1

        sempre = [i for i in range(problem.n_alternatives) if presenca[i] == total]
        nunca = [i for i in range(problem.n_alternatives) if presenca[i] == 0]
        oscilam = [
            i for i in range(problem.n_alternatives) if 0 < presenca[i] < total
        ]

        # Desempate pela carteira lexicograficamente menor entre as de mesma
        # frequencia: sem isso a "mais frequente" dependeria da ordem em que os
        # vertices sairam do solver, e o resultado deixaria de ser reproduzivel.
        mais_frequente = max(
            sorted(contagem_de_carteiras), key=lambda c: contagem_de_carteiras[c]
        )
        frequencia = contagem_de_carteiras[mais_frequente]

        sem_ordem = self._pares_sem_ordem(
            problem, space, custo_relativo, razao_relativa_minima,
            razao_relativa_maxima,
        )
        # A parada pelo orcamento vale so no inicio: no bc-20 o sistema de
        # referencia tem a carteira fechada pelo orcamento desde a 11a pergunta e
        # segue ate a 17a, fechando a ordem inteira -- ele nao reavalia esta
        # parada no meio.
        #
        # A regra implementada nao olha o log, e sim as origens das restricoes:
        # vale enquanto o espaco de pesos tem no maximo UMA origem distinta
        # (`space.sources` sao os textos de `describe` de cada declaracao). A
        # ordenacao dos criterios gera varias restricoes com a mesma origem, e
        # conta como uma. Qualquer declaracao que gere restricao com outra
        # origem desliga a parada: um tradeoff respondido com A, B ou
        # indiferente, ou um julgamento holistico. Uma segunda ordenacao nao
        # desliga: ela substitui a primeira no espaco de pesos
        # (``DecisionSession.weight_space``). Um "nao sei" nao gera restricao e
        # nao desliga.
        #
        # Salvaguarda: a parada declara a carteira definida, entao nunca vale
        # quando as amostras ja mostram mais de uma carteira. A ordem simulada
        # no centro e um atalho; as amostras sao a gulosa de verdade.
        so_a_ordenacao = len(set(space.sources)) <= 1
        pelo_orcamento = (
            bool(sem_ordem)
            and so_a_ordenacao
            and total == 1
            and self._carteira_fechada_pelo_orcamento(
                custo_relativo,
                problem.values @ np.mean(vertices, axis=0),
                set(sem_ordem),
            )
        )
        resolved = not sem_ordem or pelo_orcamento
        if pelo_orcamento:
            headline = (
                f"Considerando o orçamento, a carteira está definida: "
                f"{', '.join(problem.names_of(mais_frequente))} "
                f"(custo {costs[list(mais_frequente)].sum():.2f} "
                f"de {self._budget:.2f}). A ordem entre os projetos que ficam de "
                f"fora ainda está aberta, mas nenhuma delas muda a carteira."
            )
        elif resolved:
            headline = (
                f"Carteira única pela razão benefício-custo: "
                f"{', '.join(problem.names_of(mais_frequente))} "
                f"(custo {costs[list(mais_frequente)].sum():.2f} "
                f"de {self._budget:.2f})."
            )
        elif total == 1:
            headline = (
                f"A carteira já está definida pela razão benefício-custo: "
                f"{', '.join(problem.names_of(mais_frequente))} "
                f"(custo {costs[list(mais_frequente)].sum():.2f} "
                f"de {self._budget:.2f}). "
                f"{concordar(len(sem_ordem), 'par de projetos ainda não tem', 'pares de projetos ainda não têm')} "
                f"a ordem de razão fechada."
            )
        else:
            headline = (
                f"{concordar(total, 'carteira distinta saiu', 'carteiras distintas saíram')} "
                f"da ordenação por razão nas {len(vertices)} amostras de pesos; "
                f"{concordar(len(oscilam), 'projeto ainda oscila', 'projetos ainda oscilam')}. "
                f"A mais frequente aparece em "
                f"{'uma delas' if frequencia == 1 else f'{frequencia} delas'}."
            )

        return Analysis(
            problematic=self.key,
            resolved=resolved,
            undecided=tuple(oscilam),
            headline=headline,
            detail={
                "orcamento": self._budget,
                "amostras_de_peso": len(vertices),
                "razoes": {
                    problem.alternatives[i]: {
                        "custo": _numero(costs[i], 4),
                        "beneficio_minimo": _numero(faixas[i].lower, 4),
                        "beneficio_maximo": _numero(faixas[i].upper, 4),
                        "razao_minima": _numero(razao_minima[i], 6),
                        "razao_maxima": _numero(razao_maxima[i], 6),
                    }
                    for i in range(problem.n_alternatives)
                },
                "dominancia_por_razao": [
                    {
                        "dominante": problem.alternatives[i],
                        "dominado": problem.alternatives[l],
                    }
                    for i, l in dominancia
                ],
                # os pares cuja ordem de razao ainda depende dos pesos: e o que
                # mantem a elicitacao aberta
                "pares_sem_ordem_de_razao": [
                    f"{problem.alternatives[i]} vs {problem.alternatives[l]}"
                    for i, l in sem_ordem
                ],
                "dominantes": problem.names_of(
                    sorted({i for i, _ in dominancia})
                ),
                # Mesmo nome que a carteira combinatorial usa. Eram dois nomes
                # para a mesma coisa, e a consequencia nao era estetica: a tela
                # so lia `portfolios_encontrados`, entao a lista de carteiras
                # simplesmente nao aparecia na leitura por razao. Quem consome a
                # resposta nao tem como saber de qual leitura ela veio.
                "portfolios_encontrados": [
                    {
                        "projetos": problem.names_of(carteira),
                        "custo": round(float(costs[list(carteira)].sum()), 4),
                        "amostras": contagem_de_carteiras[carteira],
                    }
                    for carteira in sorted(contagem_de_carteiras)
                ],
                "carteira_mais_frequente": {
                    "projetos": problem.names_of(mais_frequente),
                    "custo": round(float(costs[list(mais_frequente)].sum()), 4),
                    "amostras": frequencia,
                },
                "sempre_selecionados": problem.names_of(sempre),
                "nunca_selecionados": problem.names_of(nunca),
                "oscilam": problem.names_of(oscilam),
                "ressalva": (
                    "Exato: as faixas de razão benefício-custo e a dominância "
                    "entre faixas que não se sobrepõem, obtidas por programação "
                    "linear, porque o custo é constante e o valor é linear nos "
                    "pesos. Aproximado: a carteira e o 'sempre/nunca', que vêm "
                    "da ordenação por razão em vértices amostrados do espaço de "
                    "pesos. A dominância declarada é conservadora: dois projetos "
                    "de faixas sobrepostas podem ainda assim ter ordem fixa."
                ),
            },
        )

    def _pares_sem_ordem(
        self,
        problem: Problem,
        space: WeightSpace,
        custo_relativo: np.ndarray,
        razao_minima: np.ndarray,
        razao_maxima: np.ndarray,
    ) -> list[tuple[int, int]]:
        """Pares cuja ordem de razao ainda depende dos pesos.

        A razao ``v_i(k) / c_i`` e linear em ``k``, entao "i supera l em todo
        peso" e ``max_k (r_l - r_i) . k <= 0``: um LP por sentido. Pares de faixas
        disjuntas ja estao ordenados e nao pagam LP nenhum -- em geral sao a
        maioria.

        Recebe o custo como fracao do orcamento (``c / B``) e as faixas de razao
        nessa mesma escala: a ``TOLERANCE`` absoluta compara diferencas de
        valor global por orcamento inteiro, o que nao depende da unidade do
        custo.

        Paridade: bc-08 e bc-20, 27/09/2026
        Exatidao: exata (LP), a menos da tolerancia
        Custo: 2 LPs por par de faixas de razao sobrepostas; nenhum por par de
        faixas disjuntas
        Unidade: razao em valor global por fracao do orcamento
        """
        razoes = problem.values / custo_relativo[:, None]
        solver = self.evaluator.solver
        pendentes = []
        for i in range(problem.n_alternatives):
            for l in range(i + 1, problem.n_alternatives):
                if (razao_minima[i] > razao_maxima[l] + TOLERANCE
                        or razao_minima[l] > razao_maxima[i] + TOLERANCE):
                    continue
                l_sobre_i = solver.maximize(space, razoes[l] - razoes[i])
                i_sobre_l = solver.maximize(space, razoes[i] - razoes[l])
                if l_sobre_i is None or i_sobre_l is None:
                    continue
                if l_sobre_i > TOLERANCE and i_sobre_l > TOLERANCE:
                    pendentes.append((i, l))
        return pendentes

    def _carteira_fechada_pelo_orcamento(
        self,
        custo_relativo: np.ndarray,
        beneficio_no_centro: np.ndarray,
        sem_ordem: set[tuple[int, int]],
    ) -> bool:
        """Se a ordem de razao ja conhecida basta para fixar a carteira gulosa.

        E a segunda parada do sistema de referencia ("Considering the budget
        value, this is the recommendation"), medida em 29/09/2026 no vol-bc-3x8:
        oito projetos, orcamento de 50. So com a ordenacao dos criterios, as
        razoes ja poem Alt 03 e Alt 02 nas posicoes 1 e 2 (cabem juntos, 34), a
        Alt 04 na 3 (36, nao cabe no que sobra) e as outras cinco empatadas na 4,
        nenhuma custando ate 16. Ele encerra sem pergunta nenhuma; nos faziamos
        dez.

        As posicoes sao as da ordem par a par ja fechada (``_pares_sem_ordem``),
        nao as das faixas disjuntas: pelas faixas, Alt 03 e Alt 02 ainda se
        sobrepoem. Descendo as posicoes, o que entra na carteira precisa estar em
        posicao propria, e um grupo ainda sem ordem precisa ficar todo de fora --
        nenhum projeto dele cabe no que resta.

        Caber inteiro nao basta. No fin-B2 tudo cabe (dez projetos, 227 num
        orcamento de 237): a carteira sao todos, em qualquer ordem, e mesmo assim
        ele fez as 14 perguntas e fechou a ordem inteira.

        A ordem simulada usa a mesma chave da gulosa (``_selecionar_por_razao``):
        razao decrescente, depois o mais barato, depois o indice, e pula quem
        nao agrega valor. Com outra chave, dois projetos de razao identica em
        todo peso (par que o LP ve como ordenado, mas empatado) ficavam na
        ordem errada e a parada anunciava uma carteira que a gulosa nao monta.
        Quem chama ainda exige que as amostras tenham dado uma carteira so.

        Quem chama so aplica esta parada enquanto o espaco de pesos tem no
        maximo uma origem de restricao (ver ``_analyse``).

        Paridade: vol-bc-3x8, 29/09/2026; fin-B2, 29/09/2026
        Custo: nenhum LP (recebe os pares sem ordem ja calculados)
        Unidade: custo como fracao do orcamento; beneficio em valor global
        """
        # Par ja ordenado tem o mesmo sentido em todo peso viavel, inclusive no
        # centro das amostras: ordenar por ali deixa cada par fechado do lado
        # certo, e o corte depois da k-esima posicao e limpo quando nenhum par
        # ainda aberto o atravessa.
        razao_no_centro = beneficio_no_centro / custo_relativo
        ordem = sorted(
            (i for i in range(len(custo_relativo))
             if beneficio_no_centro[i] > TOLERANCE),
            key=lambda i: (-razao_no_centro[i], custo_relativo[i], i),
        )
        n = len(ordem)
        posicao = {projeto: k for k, projeto in enumerate(ordem)}
        alcance = list(range(n))  # ate onde cada posicao arrasta o seu grupo
        for i, l in sem_ordem:
            if i not in posicao or l not in posicao:
                continue  # projeto sem valor nao entra, em ordem nenhuma
            a, b = sorted((posicao[i], posicao[l]))
            alcance[a] = max(alcance[a], b)
        blocos, inicio, fim = [], 0, 0
        for k in range(n):
            fim = max(fim, alcance[k])
            if k == fim:
                blocos.append(ordem[inicio:k + 1])
                inicio = k + 1
        restante = 1.0  # o orcamento inteiro, na escala do custo relativo
        for bloco in blocos:
            if (custo_relativo[bloco] <= restante + TOLERANCE).any():
                if len(bloco) > 1:
                    return False  # algo dele entra, e a ordem interna ainda conta
                restante -= float(custo_relativo[bloco[0]])
        return True

    def _dominancia_por_razao(
        self, razao_minima: np.ndarray, razao_maxima: np.ndarray
    ) -> list[tuple[int, int]]:
        """Pares em que a razao de ``i`` supera a de ``l`` com certeza.

        Critério das faixas disjuntas: pior caso de ``i`` acima do melhor caso de
        ``l``. E conservador de proposito -- o decisor consegue conferir a
        conclusao olhando os dois intervalos publicados, sem confiar em nenhuma
        conta que nao esteja na tela.

        Exatidao: conservadora -- faixas exatas (LP), mas pares de faixas
        sobrepostas com ordem fixa nao sao declarados
        Recebe as faixas na escala do orcamento (custo como fracao dele), para
        a folga de ``TOLERANCE`` nao depender da unidade do custo; a ordem
        entre as faixas e a mesma das publicadas.

        Custo: nenhum LP (recebe as faixas prontas)
        """
        pares = []
        for i in range(len(razao_minima)):
            for l in range(len(razao_minima)):
                if i != l and razao_minima[i] > razao_maxima[l] + TOLERANCE:
                    pares.append((i, l))
        return pares

    def _selecionar_por_razao(
        self, beneficios: np.ndarray, custo_relativo: np.ndarray
    ) -> tuple[int, ...]:
        """Carteira gulosa: desce a lista ordenada por razao enquanto couber.

        Duas decisoes que mudam o resultado e por isso ficam explicitas:

        - um projeto que nao cabe e pulado, nao encerra a varredura. Parar no
          primeiro que estoura deixaria orcamento parado enquanto ha projeto
          barato e eficiente mais abaixo na lista.
        - beneficio nao positivo fica fora, ainda que haja folga. Um projeto que
          nao agrega valor algum naquele vetor de pesos so consumiria orcamento
          e apareceria como "selecionado" sem ter sido escolhido por merito. O
          teste e no beneficio (valor global em [0, 1]), nao na razao, cuja
          escala dependeria da unidade do custo.

        Custo: nenhum LP
        Unidade: beneficio em valor global; custo como fracao do orcamento
        """
        razoes = beneficios / custo_relativo
        ordem = sorted(
            range(len(razoes)),
            # empate na razao resolve pelo mais barato, e depois pelo indice:
            # a carteira precisa ser a mesma a cada execucao
            key=lambda i: (-razoes[i], custo_relativo[i], i),
        )
        escolhidos: list[int] = []
        restante = 1.0  # o orcamento inteiro, na escala do custo relativo
        for i in ordem:
            if beneficios[i] <= TOLERANCE:
                continue
            if custo_relativo[i] <= restante + 1e-12:
                escolhidos.append(i)
                restante -= custo_relativo[i]
        return tuple(sorted(escolhidos))
