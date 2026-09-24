"""Fixtures compartilhadas."""

from datetime import datetime, timezone

import numpy as np
import pytest

from fitradeoff import build_container
from fitradeoff.domain import Criterion, Direction, FixedClock, Problem
from fitradeoff.problematics import Evaluator
from fitradeoff.solvers import ScipyLinearSolver

INSTANT = datetime(2026, 9, 24, 12, 0, tzinfo=timezone.utc)


def make_problem(consequences, directions=None, levels=None, names=None, costs=None):
    """Problema minimo, com criterios gerados automaticamente."""
    n_criteria = len(consequences[0])
    directions = directions or [Direction.MAX] * n_criteria
    levels = levels or [None] * n_criteria
    criteria = tuple(
        Criterion(
            key=f"c{j}",
            name=f"Criterio {j}",
            direction=directions[j],
            levels=levels[j],
        )
        for j in range(n_criteria)
    )
    alternatives = tuple(names or [chr(ord("A") + i) for i in range(len(consequences))])
    return Problem(
        "teste",
        criteria,
        alternatives,
        np.array(consequences, dtype=float),
        costs=tuple(costs) if costs else None,
    )


@pytest.fixture
def solver():
    return ScipyLinearSolver()


@pytest.fixture
def evaluator(solver):
    return Evaluator(solver)


@pytest.fixture
def clock():
    return FixedClock(INSTANT)


@pytest.fixture
def container(clock):
    """Container de teste: tudo em memoria, relogio parado, epsilon zero."""
    return build_container(epsilon=0.0, clock=clock)


@pytest.fixture
def fornecedores():
    """Caso concreto usado em varios testes."""
    criteria = (
        Criterion("qualidade", "Indice de qualidade", Direction.MAX),
        Criterion("custo", "Custo unitario", Direction.MIN, unit="R$/un"),
        Criterion("prazo", "Prazo de entrega", Direction.MIN, unit="dias"),
    )
    return Problem(
        "Fornecedores",
        criteria,
        ("Fornecedor A", "Fornecedor B", "Fornecedor C", "Fornecedor D"),
        np.array(
            [
                [0.82, 12.50, 30],
                [0.95, 15.80, 12],
                [0.71, 10.20, 45],
                [0.88, 14.10, 20],
            ]
        ),
    )


CRITERIOS_SPEC = [
    {"chave": "qualidade", "nome": "Indice de qualidade", "direcao": "max"},
    {"chave": "custo", "nome": "Custo unitario", "direcao": "min", "unidade": "R$/un"},
    {"chave": "prazo", "nome": "Prazo de entrega", "direcao": "min", "unidade": "dias"},
]

CONSEQUENCIAS = [
    [0.82, 12.50, 30],
    [0.95, 15.80, 12],
    [0.71, 10.20, 45],
    [0.88, 14.10, 20],
]

ALTERNATIVAS = ["Fornecedor A", "Fornecedor B", "Fornecedor C", "Fornecedor D"]
