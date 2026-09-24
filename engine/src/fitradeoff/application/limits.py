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
    max_name_length: int = 200

    def check_problem(self, n_alternatives: int, n_criteria: int) -> None:
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
        if samples > self.max_portfolio_samples:
            raise LimitExceeded(
                f"{samples} amostras excedem o limite de "
                f"{self.max_portfolio_samples}."
            )

    def check_sensitivity(self, points: int) -> None:
        if points > self.max_sensitivity_points:
            raise LimitExceeded(
                f"{points} limiares excedem o limite de "
                f"{self.max_sensitivity_points}. Cada limiar reprocessa a "
                f"decisao inteira."
            )
