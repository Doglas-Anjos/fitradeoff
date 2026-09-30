"""Limites de entrada.

O motor resolve O(n^2) programas lineares. Sem teto, um pedido com milhares de
alternativas trava o processo inteiro -- e num servidor MCP, que atende um chat,
travar e o unico modo de falha que o usuario nao consegue contornar.

Os valores padrao sao generosos para uso real (um problema de decisao com 500
alternativas ja e incomum) e baixos o bastante para manter a resposta em tempo
de conversa. Vem por injecao, entao um uso em lote pode elevar o teto
conscientemente, em vez de descobrir o limite travando.
"""

from __future__ import annotations

from dataclasses import dataclass


class LimitExceeded(Exception):
    """Pedido acima do teto configurado."""


@dataclass(frozen=True)
class Limits:
    """Tetos de tamanho para o que chega de fora."""

    max_alternatives: int = 500
    max_criteria: int = 30
    max_levels: int = 50
    max_portfolio_samples: int = 200
    max_sensitivity_points: int = 20
    max_sensitivity_scenarios: int = 2000
    #: Teto do PRODUTO alternativas x cenarios de uma analise de sensibilidade.
    #: Os tetos isolados nao bastam: cada cenario e uma analise completa, cujo
    #: custo cresce com o numero de alternativas. Medido em 30/09/2026: 300
    #: alternativas x 20 cenarios levaram 26 s num caso da revisao de codigo
    #: (cerca de 4 ms por alternativa-cenario) -- e 2000 cenarios, dentro dos
    #: dois tetos isolados, dariam cerca de 43 min num pedido so. Num problema
    #: sorteado de 4 criterios, escolha, HiGHS: 0,9 ms por alternativa-cenario
    #: com 100 alternativas e 2,0 ms com 300. 20000 deixa passar 100 x 200 (o
    #: padrao de cenarios; ~18 s medidos) e 500 x 40, e segura o pior caso na
    #: casa de um minuto em vez de dezenas.
    max_sensitivity_budget: int = 20000
    #: Pontos de uma curva de valor. A curva e linear por partes e cada ponto
    #: vira uma interpolacao por consequencia; 200 ja e muito mais do que um
    #: decisor declara a mao, e impede que um pedido carregue milhares.
    max_value_points: int = 200
    max_name_length: int = 200

    def check_problem(self, n_alternatives: int, n_criteria: int) -> None:
        """Recusa problemas acima do teto de alternativas ou de criterios.

        O teto de alternativas e o que importa para o tempo: o numero de LPs
        cresce com o quadrado dele (matriz de dominancia).

        Erros: LimitExceeded se qualquer um dos dois passar do teto.
        """
        if n_alternatives > self.max_alternatives:
            raise LimitExceeded(
                f"{n_alternatives} alternativas excedem o limite de "
                f"{self.max_alternatives}. O custo cresce com o quadrado desse "
                f"numero; divida o problema ou eleve o limite conscientemente."
            )
        if n_criteria > self.max_criteria:
            raise LimitExceeded(
                f"{n_criteria} criterios excedem o limite de {self.max_criteria}."
            )

    def check_name(self, name: str, what: str = "nome") -> None:
        if len(name) > self.max_name_length:
            raise LimitExceeded(
                f"O {what} tem {len(name)} caracteres; o limite e "
                f"{self.max_name_length}."
            )

    def check_levels(self, n_levels: int, criterion_key: str) -> None:
        if n_levels > self.max_levels:
            raise LimitExceeded(
                f"O criterio '{criterion_key}' declara {n_levels} niveis; o "
                f"limite e {self.max_levels}."
            )

    def check_samples(self, samples: int) -> None:
        """Recusa amostras de carteira fora de [1, ``max_portfolio_samples``].

        Zero ou negativo nao e "sem amostra": a carteira sairia de nenhum
        vertice. O piso e conferido aqui, com o mesmo erro do teto, para que
        nenhuma porta aceite em silencio.

        Erros: LimitExceeded se ``samples`` for menor que 1 ou passar do teto.
        """
        if samples < 1:
            raise LimitExceeded(
                f"{samples} amostras: a carteira precisa de ao menos 1 amostra "
                f"de pesos."
            )
        if samples > self.max_portfolio_samples:
            raise LimitExceeded(
                f"{samples} amostras excedem o limite de "
                f"{self.max_portfolio_samples}."
            )

    def check_value_points(self, n_points: int, criterion_key: str) -> None:
        """Recusa curva de valor com mais pontos que ``max_value_points``.

        Erros: LimitExceeded se a curva passar do teto.
        """
        if n_points > self.max_value_points:
            raise LimitExceeded(
                f"A curva de valor do criterio '{criterion_key}' tem {n_points} "
                f"pontos; o limite e {self.max_value_points}."
            )

    def check_sensitivity_budget(self, n_alternatives: int, scenarios: int) -> None:
        """Recusa analise de sensibilidade cujo custo total passa do orcamento.

        Serve as duas analises: ``scenarios`` e o numero de limiares em
        ``DecisionService.sensitivity`` e o de cenarios sorteados em
        ``consequence_sensitivity``. O que custa e o produto -- cada cenario e
        uma analise completa com todas as alternativas --, e e ele que fica
        abaixo de ``max_sensitivity_budget`` (ver a medicao no campo).

        Erros: LimitExceeded se ``n_alternatives * scenarios`` passar do teto.
        """
        custo = n_alternatives * scenarios
        if custo > self.max_sensitivity_budget:
            maximo = max(self.max_sensitivity_budget // max(n_alternatives, 1), 0)
            raise LimitExceeded(
                f"{scenarios} cenarios com {n_alternatives} alternativas somam "
                f"{custo} reprocessamentos-alternativa; o limite e "
                f"{self.max_sensitivity_budget}. Com {n_alternatives} "
                f"alternativas, peca no maximo {maximo} cenarios."
            )

    def check_sensitivity(self, points: int) -> None:
        """Recusa varreduras de sensibilidade com pontos demais.

        Serve as duas analises: conta os limiares de
        ``DecisionService.sensitivity`` e tambem as variacoes de
        ``consequence_sensitivity``, embora a mensagem fale sempre em
        "limiares". O numero de cenarios desta ultima tem teto proprio,
        ``max_sensitivity_scenarios``, conferido no servico, e as duas
        passam ainda por ``check_sensitivity_budget``.

        Erros: LimitExceeded se ``points`` passar de ``max_sensitivity_points``.
        """
        if points > self.max_sensitivity_points:
            raise LimitExceeded(
                f"{points} limiares excedem o limite de "
                f"{self.max_sensitivity_points}. Cada limiar reprocessa a "
                f"decisao inteira."
            )
