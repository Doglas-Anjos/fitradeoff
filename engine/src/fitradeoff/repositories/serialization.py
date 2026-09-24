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
    return data


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
        created_at=datetime.fromisoformat(created) if created else None,
    )
