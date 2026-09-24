"""Objetos de transferencia: o contrato com quem consome o motor.

Antes esta camada devolvia dicionarios montados a mao. Funcionava, mas o formato
so existia na cabeca de quem escreveu: nada impedia duas views de divergirem, o
consumidor descobria os campos por tentativa e erro, e um campo renomeado so
aparecia como KeyError em producao.

Aqui o formato e declarado. ``to_dict`` serializa para o protocolo; os tipos
documentam. A conversao continua num lugar so, e o dicionario segue sendo o que
atravessa a fronteira -- o ganho e que agora existe algo que o define.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


def _clean(data: dict) -> dict:
    """Remove chaves nulas, para nao poluir a resposta com campos vazios."""
    return {key: value for key, value in data.items() if value is not None}


@dataclass(frozen=True)
class CriterionDTO:
    chave: str
    nome: str
    unidade: str
    direcao: str
    melhor: float
    pior: float
    escala: str

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class ProblemDTO:
    id: str
    nome: str
    problematica: str
    criterios: list[CriterionDTO]
    consequencias: dict[str, dict[str, float]]
    # mesma matriz normalizada para [0, 1]: e o que os graficos comparam, ja que
    # reais e dias nao se sobrepoem no mesmo eixo
    valores: dict[str, dict[str, float]]
    declaracoes_registradas: int
    custos: dict[str, float] | None = None
    configuracao: dict = field(default_factory=dict)
    proximo_passo: str | None = None

    def to_dict(self) -> dict:
        return _clean(
            {
                "id": self.id,
                "nome": self.nome,
                "problematica": self.problematica,
                "criterios": [c.to_dict() for c in self.criterios],
                "consequencias": self.consequencias,
                "valores": self.valores,
                "custos": self.custos,
                "configuracao": self.configuracao,
                "declaracoes_registradas": self.declaracoes_registradas,
                "proximo_passo": self.proximo_passo,
            }
        )


@dataclass(frozen=True)
class AnalysisDTO:
    problematica: str
    resolvido: bool
    indefinidas: list[int]
    resumo: str
    detalhe: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        # o detalhe e especifico de cada problematica e sobe para o topo, que e
        # como o agente le com menos cerimonia
        return {
            "problematica": self.problematica,
            "resolvido": self.resolvido,
            "indefinidas": self.indefinidas,
            "resumo": self.resumo,
            **self.detalhe,
        }


@dataclass(frozen=True)
class StateDTO:
    id: str
    nome: str
    problematica: str
    elicitacao_iniciada: bool
    declaracoes: int
    consistente: bool
    encerrado: bool | None = None
    analise: AnalysisDTO | None = None
    faixas_de_peso: dict[str, list[float]] | None = None
    faixas_de_valor: dict[str, list[float]] | None = None
    proximo_passo: str | None = None
    aviso: str | None = None
    declaracoes_descartadas: int | None = None
    pergunta: str | None = None
    motivo: str | None = None

    def to_dict(self) -> dict:
        return _clean(
            {
                "id": self.id,
                "nome": self.nome,
                "problematica": self.problematica,
                "elicitacao_iniciada": self.elicitacao_iniciada,
                "declaracoes": self.declaracoes,
                "consistente": self.consistente,
                "encerrado": self.encerrado,
                "analise": self.analise.to_dict() if self.analise else None,
                "faixas_de_peso": self.faixas_de_peso,
                "faixas_de_valor": self.faixas_de_valor,
                "proximo_passo": self.proximo_passo,
                "aviso": self.aviso,
                "declaracoes_descartadas": self.declaracoes_descartadas,
                "pergunta": self.pergunta,
                "motivo": self.motivo,
            }
        )


@dataclass(frozen=True)
class QuestionDTO:
    id: str
    enunciado: str
    criterio_em_foco: str
    criterio_rival: str
    opcao_a: list[str]
    opcao_b: list[str]
    posicao_na_escala: float
    como_responder: str

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class StatementDTO:
    sequencia: int
    autor: str
    registrado_em: str
    declaracao: str

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class AuditDTO:
    id: str
    declaracoes: list[StatementDTO]
    restricoes_ativas: list[str]
    leitura: str
    analise: AnalysisDTO | None = None
    nota_sobre_autoria: str = (
        "O campo 'autor' e declarado por quem chamou, nao autenticado pelo "
        "motor. Trate-o como rotulo, nao como prova de autoria."
    )

    def to_dict(self) -> dict:
        return _clean(
            {
                "id": self.id,
                "declaracoes": [d.to_dict() for d in self.declaracoes],
                "restricoes_ativas": self.restricoes_ativas,
                "analise": self.analise.to_dict() if self.analise else None,
                "leitura": self.leitura,
                "nota_sobre_autoria": self.nota_sobre_autoria,
            }
        )


@dataclass(frozen=True)
class SummaryDTO:
    """Uma linha na listagem de decisoes."""

    id: str
    nome: str
    problematica: str
    alternativas: int
    criterios: int
    declaracoes: int

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class ScenarioDTO:
    limiar: float
    consistente: bool
    resumo: str
    analise: AnalysisDTO | None = None

    def to_dict(self) -> dict:
        base = {
            "limiar": self.limiar,
            "consistente": self.consistente,
            "resumo": self.resumo,
        }
        return {**base, **(self.analise.to_dict() if self.analise else {})}


@dataclass(frozen=True)
class SensitivityDTO:
    id: str
    cenarios: list[ScenarioDTO]

    def to_dict(self) -> dict:
        return {"id": self.id, "cenarios": [c.to_dict() for c in self.cenarios]}
