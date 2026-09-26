"""Contratos de entrada da API.

Entrada e validada com Pydantic, porque e por onde chega o que nao controlamos.
A saida reaproveita os DTOs do motor (``fitradeoff.application.dto``), que ja
definem o formato: espelhar aqui criaria duas verdades sobre o mesmo contrato.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

# Chaves aceitas, iguais as registradas no motor. Fica num alias so porque
# duas rotas declaram o mesmo conjunto e divergir aqui seria aceitar numa e
# recusar na outra a mesma problematica.
Problematica = Literal[
    "escolha", "ranking", "sorting", "portfolio", "beneficio_custo"
]


class CriterionIn(BaseModel):
    chave: str = Field(min_length=1, max_length=64)
    nome: str = Field(min_length=1, max_length=200)
    direcao: Literal["max", "min"] = "max"
    unidade: str = Field(default="", max_length=32)
    niveis: list[float] | None = None
    curva_de_valor: list[tuple[float, float]] | None = Field(
        default=None,
        description="Pontos (consequencia, valor) da curva elicitada; sem ela a "
        "escala e linear sobre a faixa observada.",
    )
    veto_superior: float | None = Field(
        default=None,
        description="Desempenho, na unidade do criterio, a partir do qual nada e "
        "penalizado. Modelo aditivo com veto (de Almeida, 2013): so tem efeito "
        "nas problematicas de escolha e ranking.",
    )
    veto_inferior: float | None = Field(
        default=None,
        description="Desempenho, na unidade do criterio, em que o criterio deixa "
        "de contar. Entre os dois limites a penalidade e proporcional; "
        "declarando so um, nao ha regiao de hesitacao.",
    )
    # A coerencia do par -- ordem certa para a direcao, nivel existente numa
    # escala construida -- e conferida no dominio, em `Criterion`. Aqui seria
    # uma segunda copia da mesma regra, e o servidor MCP, que constroi o
    # criterio sem passar por este schema, ficaria de fora dela.

    @field_validator("niveis")
    @classmethod
    def niveis_ordenados(cls, valor: list[float] | None) -> list[float] | None:
        if valor is None:
            return None
        if len(valor) < 2:
            raise ValueError("Uma escala construida precisa de ao menos dois niveis.")
        if list(valor) != sorted(valor):
            raise ValueError(
                "Os niveis devem vir ordenados do pior para o melhor desempenho."
            )
        return valor


class DecisionIn(BaseModel):
    nome: str = Field(min_length=1, max_length=200)
    alternativas: list[str] = Field(min_length=2)
    criterios: list[CriterionIn] = Field(min_length=2)
    consequencias: list[list[float]] = Field(min_length=2)
    problematica: Problematica = "escolha"
    configuracao: dict = Field(default_factory=dict)
    custos: list[float] | None = None

    @field_validator("alternativas")
    @classmethod
    def sem_repetidas(cls, valor: list[str]) -> list[str]:
        if len(set(valor)) != len(valor):
            raise ValueError("Ha alternativas com nomes repetidos.")
        return valor


class RankingIn(BaseModel):
    ordem: list[str] = Field(min_length=2, description="Chaves, do maior peso ao menor")


class AnswerIn(BaseModel):
    preferencia: str = Field(description="'A', 'B' ou 'indiferente'")


class JudgementIn(BaseModel):
    preferida: str
    sobre: str


class ProblematicIn(BaseModel):
    problematica: Problematica
    configuracao: dict | None = None


class SensitivityIn(BaseModel):
    limiares: list[float] = Field(min_length=1)


class VariacaoIn(BaseModel):
    criterio: str
    para_baixo: float = Field(default=10.0, ge=0, le=100)
    para_cima: float = Field(default=10.0, ge=0)


class ConsequenceSensitivityIn(BaseModel):
    variacoes: list[VariacaoIn] = Field(min_length=1)
    cenarios: int = Field(default=200, ge=1, le=2000)
    semente: int = 0


class CurvaDeValorIn(BaseModel):
    criterio: str
    pontos: list[tuple[float, float]] | None = Field(
        default=None,
        description="Pontos (consequencia, valor). Nulo volta a escala linear.",
    )


class ResolucaoIn(BaseModel):
    acao: Literal["desfazer", "inverter", "remover"]
    sequencia: int | None = None


class ChatMessage(BaseModel):
    papel: Literal["user", "assistant"]
    texto: str


class ChatIn(BaseModel):
    mensagens: list[ChatMessage] = Field(min_length=1)
    decisao_id: str | None = None
