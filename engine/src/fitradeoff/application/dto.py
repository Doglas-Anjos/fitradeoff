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
    """Um criterio como a tela e o agente o veem, dentro de ``ProblemDTO``.

    ``melhor`` e ``pior`` estao na unidade do criterio, ja com a direcao
    resolvida. Campos opcionais nulos somem na serializacao.
    """

    chave: str
    nome: str
    unidade: str
    direcao: str
    melhor: float
    pior: float
    escala: str
    # A curva elicitada precisa voltar, ou a tela nao tem como distinguir um
    # criterio ainda linear de um ja ajustado -- e reabriria o editor vazio,
    # perdendo o que o decisor respondeu.
    curva_de_valor: list[list[float]] | None = None
    # Os niveis da escala construida, do pior ao melhor. A curva de uma escala
    # destas so fixa valor em nivel -- e a regra do sistema de referencia --, e
    # a tela nao tem como saber quais sao sem eles.
    niveis: list[float] | None = None
    # Limites de veto, na unidade original. Voltam pelo mesmo motivo da curva:
    # sem eles a tela reabre o campo vazio e apaga o que o decisor declarou.
    veto_superior: float | None = None
    veto_inferior: float | None = None

    def to_dict(self) -> dict:
        return _clean(asdict(self))


@dataclass(frozen=True)
class ProblemDTO:
    """O problema de uma decisao: criterios, matriz e configuracao.

    Resposta de ``create``, ``describe`` e ``set_value_curve``, lida pela API
    (e dela pela tela) e pelo MCP. ``consequencias`` vem na unidade de cada
    criterio; ``valores``, normalizado em [0, 1].
    """

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
    # fora das carteiras: la o custo entra na conta, e liderar criterio nao diz
    # quem cabe no orcamento
    conflito: ConflitoDTO | None = None

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
                "conflito": self.conflito.to_dict() if self.conflito else None,
            }
        )


@dataclass(frozen=True)
class ConflitoDTO:
    """Onde as alternativas disputam, antes de qualquer peso.

    Ver ``views.mapa_de_conflito``. ``leitura`` diz a quem consome o que fazer
    com cada campo -- o mesmo papel de ``leitura_das_dominadas``.
    """

    melhor_por_criterio: list[dict]
    vantagens_por_alternativa: list[dict]
    total_com_vantagem: int
    sem_vantagem_propria: list[str]
    total_sem_vantagem: int
    criterios_que_nao_diferenciam: list[str]
    lider_amplo: list[dict]
    leitura: str

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class AnalysisDTO:
    """O resultado da problematica, como sai de ``Problematic.analyse``.

    Vai dentro de ``StateDTO``, ``AuditDTO`` e ``ScenarioDTO``. O ``detalhe``
    e especifico de cada problematica e, na serializacao, sobe para o topo.
    ``indefinidas`` sao indices de alternativa, nao nomes.
    """

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
    """A situacao corrente de uma decisao, resposta da maioria dos casos de uso.

    Montado por ``views.state_dto`` e lido pela API e pelo MCP. Os campos
    opcionais so aparecem quando se aplicam: sem elicitacao iniciada nao ha
    analise, e com declaracoes inconsistentes ha ``aviso`` em vez de faixas.
    """

    id: str
    nome: str
    problematica: str
    elicitacao_iniciada: bool
    declaracoes: int
    # Limiar em vigor nesta decisao, ja resolvido. A tela de revisao o edita e
    # portanto precisa ler o valor corrente -- supor o padrao mostraria 0,01
    # numa decisao que roda com outro.
    limiar_de_equivalencia: float
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
                "limiar_de_equivalencia": self.limiar_de_equivalencia,
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
    """A pergunta de tradeoff pendente, pronta para mostrar ao decisor.

    Resposta de ``next_question``. ``id`` e o da decisao; ``pergunta_id``
    identifica esta pergunta NESTE estado da trilha (ver
    ``views.pergunta_id``). Quem responde devolve o ``pergunta_id`` a
    ``DecisionService.answer``, que recusa a resposta se a pergunta pendente
    ja for outra -- duas abas, ou um pedido repetido, nao gravam contra uma
    pergunta que o decisor nao viu.
    """

    id: str
    pergunta_id: str
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
    """Uma linha da trilha de auditoria, dentro de ``AuditDTO``.

    ``autor`` e declarado por quem chamou, nao autenticado.
    """

    sequencia: int
    autor: str
    registrado_em: str
    declaracao: str

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class AuditDTO:
    """A trilha completa e o que ela impos, resposta de ``explain``.

    E o que um auditor le para reconstituir o resultado: declaracoes,
    restricoes ativas e o limiar de equivalencia em vigor.
    """

    id: str
    declaracoes: list[StatementDTO]
    restricoes_ativas: list[str]
    leitura: str
    # Sem ele a trilha nao reconstitui o resultado: o limiar entra na folga do
    # teste de dominancia e no criterio de parada, entao dois limiares
    # diferentes fecham a mesma decisao de maneiras diferentes.
    limiar_de_equivalencia: float
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
                "limiar_de_equivalencia": self.limiar_de_equivalencia,
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
    # ISO 8601, ou ausentes numa decisao gravada antes destes campos existirem.
    # Quem consome precisa aguentar a falta em vez de supor uma data.
    criado_em: str | None = None
    atualizado_em: str | None = None
    # Vem como `bool`, e nao como `None` quando falsa, porque `_clean` so poda
    # nulos: assim a listagem sempre diz se a decisao esta marcada, em vez de
    # deixar a tela deduzir isso da ausencia da chave.
    favorita: bool = False

    def to_dict(self) -> dict:
        return _clean(asdict(self))


@dataclass(frozen=True)
class ScenarioDTO:
    """Um ponto da varredura de ``DecisionService.sensitivity``.

    ``limiar`` e o epsilon (folga entre os pesos de dois criterios), nao o
    limiar de equivalencia entre alternativas, apesar do nome do campo.
    """

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
    """Resposta de ``DecisionService.sensitivity``: um cenario por epsilon."""

    id: str
    cenarios: list[ScenarioDTO]

    def to_dict(self) -> dict:
        return {"id": self.id, "cenarios": [c.to_dict() for c in self.cenarios]}
