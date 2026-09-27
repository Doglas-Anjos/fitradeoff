"""Conversao entre o dominio e a forma serializavel dos registros.

Isolada dos adaptadores para que arquivo, Postgres ou API usem exatamente o
mesmo formato -- e para que mudar o formato seja um lugar so.
"""

from __future__ import annotations

from datetime import datetime

import numpy as np

from ..domain.audit import AuditLog
from ..domain.problem import Criterion, Direction, Problem
from .base import DecisionRecord


def criterion_to_dict(criterion: Criterion) -> dict:
    data = {
        "chave": criterion.key,
        "nome": criterion.name,
        "direcao": criterion.direction.value,
        "unidade": criterion.unit,
    }
    if criterion.levels is not None:
        data["niveis"] = list(criterion.levels)
    if criterion.value_points is not None:
        data["curva_de_valor"] = [list(p) for p in criterion.value_points]
    # os limites de veto vao na unidade original, que e como o decisor os
    # declarou -- e a comparacao acontece em valor, dentro de `veto_factor`
    if criterion.veto_upper is not None:
        data["veto_superior"] = criterion.veto_upper
    if criterion.veto_lower is not None:
        data["veto_inferior"] = criterion.veto_lower
    return data


def _optional_float(data: dict, key: str) -> float | None:
    valor = data.get(key)
    return None if valor is None else float(valor)


def criterion_from_dict(data: dict) -> Criterion:
    levels = data.get("niveis")
    curva = data.get("curva_de_valor")
    return Criterion(
        key=data["chave"],
        name=data.get("nome", data["chave"]),
        direction=Direction(data.get("direcao", "max")),
        unit=data.get("unidade", "") or "",
        levels=tuple(float(v) for v in levels) if levels else None,
        value_points=(
            tuple((float(c), float(v)) for c, v in curva) if curva else None
        ),
        veto_upper=_optional_float(data, "veto_superior"),
        veto_lower=_optional_float(data, "veto_inferior"),
    )


def record_to_dict(record: DecisionRecord) -> dict:
    problem = record.problem
    return {
        "id": record.id,
        "nome": problem.name,
        "problematica": record.problematic_key,
        "criado_em": (record.created_at.isoformat(timespec="seconds")
                      if record.created_at else None),
        "alternativas": list(problem.alternatives),
        "criterios": [criterion_to_dict(c) for c in problem.criteria],
        "consequencias": problem.consequences.tolist(),
        "custos": list(problem.costs) if problem.costs else None,
        "configuracao": record.settings,
        "limiar_de_equivalencia": record.equivalence,
        "favorita": record.favorite,
        "auditoria": record.log.to_list(),
    }


def record_from_dict(data: dict) -> DecisionRecord:
    problem = Problem(
        name=data["nome"],
        criteria=tuple(criterion_from_dict(c) for c in data["criterios"]),
        alternatives=tuple(data["alternativas"]),
        consequences=np.array(data["consequencias"], dtype=float),
        costs=tuple(float(c) for c in data["custos"]) if data.get("custos") else None,
    )
    created = data.get("criado_em")
    return DecisionRecord(
        id=data["id"],
        problem=problem,
        log=AuditLog.from_list(data.get("auditoria", [])),
        problematic_key=data.get("problematica", "escolha"),
        settings=data.get("configuracao", {}),
        # ausente nos registros gravados antes do campo existir: None ali
        # significa "usa o padrao", que e exatamente como eles se comportavam
        equivalence=_optional_float(data, "limiar_de_equivalencia"),
        # mesma historia do limiar: ausente nos registros gravados antes do
        # campo existir, e a ausencia so pode significar "nao favorita" -- e o
        # que eles eram. `bool()` porque JSON de outra origem pode trazer 0/1.
        favorite=bool(data.get("favorita", False)),
        created_at=datetime.fromisoformat(created) if created else None,
    )
