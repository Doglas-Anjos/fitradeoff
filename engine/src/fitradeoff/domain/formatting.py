"""Formatacao de numeros e consequencias.

Um lugar so: a mesma consequencia precisa sair identica no enunciado da
pergunta e na trilha de auditoria. Duas implementacoes independentes divergem
com o tempo, e o decisor acaba lendo "28.5 dias" numa tela e "28,50" na outra.
"""

from __future__ import annotations


def format_number(number: float) -> str:
    """Inteiro sem casas decimais; o resto com quatro algarismos significativos."""
    if abs(number - round(number)) < 1e-9:
        return str(int(round(number)))
    return f"{number:.4g}"


def format_amount(number: float, unit: str = "") -> str:
    """Numero com a unidade do criterio, quando houver."""
    return f"{format_number(number)} {unit}".strip() if unit else format_number(number)
