"""Contratos de entrada da API.

Entrada e validada com Pydantic, porque e por onde chega o que nao controlamos.
A saida reaproveita os DTOs do motor (``fitradeoff.application.dto``), que ja
definem o formato: espelhar aqui criaria duas verdades sobre o mesmo contrato.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Chaves aceitas, iguais as registradas no motor. Fica num alias so porque
# duas rotas declaram o mesmo conjunto e divergir aqui seria aceitar numa e
# recusar na outra a mesma problematica.


class Entrada(BaseModel):
    """Base de toda entrada: nenhum numero pode ser NaN nem infinito.

    O JSON do Python aceita ``NaN`` e ``Infinity``, e o Pydantic os aceita num
    campo ``float`` por padrao. Um valor desses que chegasse ao registro
    quebraria toda resposta seguinte sobre a decisao, porque a resposta JSON os
    recusa. Os dicionarios livres (``configuracao``) sao conferidos no motor.
    """

    model_config = ConfigDict(allow_inf_nan=False)


Problematica = Literal[
    "escolha", "ranking", "sorting", "portfolio", "beneficio_custo"
]


class CriterionIn(Entrada):
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


class DecisionIn(Entrada):
    nome: str = Field(min_length=1, max_length=200)
    alternativas: list[str] = Field(min_length=2)
    criterios: list[CriterionIn] = Field(min_length=2)
    consequencias: list[list[float]] = Field(min_length=2)
    problematica: Problematica = "escolha"
    configuracao: dict = Field(default_factory=dict)
    custos: list[float] | None = None
    limiar_de_equivalencia: float | None = Field(
        default=None,
        description="Diferença máxima de valor global abaixo da qual duas "
        "alternativas contam como indiferentes e a elicitação para. Nulo usa o "
        "padrão do serviço (0,01, o do sistema oficial). Não é o limiar da "
        "análise de sensibilidade, que é folga entre os pesos de dois critérios.",
    )

    @field_validator("alternativas")
    @classmethod
    def sem_repetidas(cls, valor: list[str]) -> list[str]:
        if len(set(valor)) != len(valor):
            raise ValueError("Ha alternativas com nomes repetidos.")
        return valor


class RankingIn(Entrada):
    ordem: list[str] = Field(min_length=2, description="Chaves, do maior peso ao menor")


class AnswerIn(Entrada):
    preferencia: str = Field(description="'A', 'B' ou 'indiferente'")


class JudgementIn(Entrada):
    preferida: str
    sobre: str


class ProblematicIn(Entrada):
    problematica: Problematica
    configuracao: dict | None = None


class LimiarDeEquivalenciaIn(Entrada):
    # Sem `ge`/`le` de proposito: a faixa aceitavel e conferida no motor, pelo
    # mesmo motivo do par de veto em `CriterionIn` -- o servidor MCP nao passa
    # por este schema, e uma regra declarada so aqui o deixaria de fora dela.
    limiar_de_equivalencia: float | None = Field(
        default=None,
        description="Novo limiar; nulo devolve a decisão ao padrão do serviço.",
    )


class FavoritaIn(Entrada):
    # Estado desejado, e nao "alterna": duas abas abertas na mesma lista
    # alternariam uma contra a outra e o resultado dependeria da ordem de
    # chegada. Com o valor explicito, reenviar o mesmo pedido nao muda nada.
    favorita: bool = Field(description="Marca (true) ou desmarca (false).")


class SensitivityIn(Entrada):
    limiares: list[float] = Field(min_length=1)


class VariacaoIn(Entrada):
    criterio: str
    para_baixo: float = Field(default=10.0, ge=0, le=100)
    para_cima: float = Field(default=10.0, ge=0)


class ConsequenceSensitivityIn(Entrada):
    variacoes: list[VariacaoIn] = Field(min_length=1)
    cenarios: int = Field(default=200, ge=1, le=2000)
    semente: int = 0


class CurvaDeValorIn(Entrada):
    criterio: str
    pontos: list[tuple[float, float]] | None = Field(
        default=None,
        description="Pontos (consequencia, valor). Nulo volta a escala linear.",
    )


class ResolucaoIn(Entrada):
    acao: Literal["desfazer", "inverter", "remover"]
    sequencia: int | None = None


class ChatMessage(Entrada):
    papel: Literal["user", "assistant"]
    texto: str


class ChatIn(Entrada):
    mensagens: list[ChatMessage] = Field(min_length=1)
    decisao_id: str | None = None


class ChaveIn(Entrada):
    """O rotulo com que a chave sera reconhecida na tela.

    O teto vem do cofre, e o minimo existe porque uma chave sem nome, entre
    outras tres, e uma chave que ninguem revoga com confianca.
    """

    rotulo: str = Field(min_length=1, max_length=60)
