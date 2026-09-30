"""Formatacao de numeros e consequencias.

Um lugar so: a mesma consequencia precisa sair identica no enunciado da
pergunta e na trilha de auditoria. Duas implementacoes independentes divergem
com o tempo, e o decisor acaba lendo "28.5 dias" numa tela e "28,50" na outra.
"""

from __future__ import annotations

import math


def format_number(number: float) -> str:
    """Numero em notacao comum, nunca cientifica.

    Inteiro sai sem casas decimais. Abaixo de 1000 em modulo, quatro
    algarismos significativos. De 1000 para cima, duas casas decimais (sem
    zeros a direita): quatro significativos ali arredondavam para dezenas ou
    centenas, e com ``.4g`` ainda viravam notacao cientifica -- 17667,5 e
    17672,3 saiam os dois "1.767e+04" e duas perguntas seguidas pareciam a
    mesma. Abaixo de 1e-4, quatro significativos em notacao fixa.
    """
    if abs(number - round(number)) < 1e-9:
        return str(int(round(number)))
    magnitude = abs(number)
    if 1e-4 <= magnitude < 1000:
        # nesta faixa o `.4g` nunca usa notacao cientifica
        return f"{number:.4g}"
    if magnitude >= 1000:
        texto = f"{number:.2f}"
    else:
        casas = 3 - math.floor(math.log10(magnitude))
        texto = f"{number:.{casas}f}"
    return texto.rstrip("0").rstrip(".")


def format_amount(number: float, unit: str = "") -> str:
    """Numero com a unidade do criterio, quando houver."""
    return f"{format_number(number)} {unit}".strip() if unit else format_number(number)
