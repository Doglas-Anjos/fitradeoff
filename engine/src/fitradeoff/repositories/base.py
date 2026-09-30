"""Porta de persistencia.

Guardamos o problema e o log de auditoria -- nada de estado derivado. O espaco
de pesos, as POAs e a recomendacao saem sempre de um replay, entao nao existe
copia que possa divergir do que o decisor declarou.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime

from ..domain.audit import AuditLog
from ..domain.problem import Problem


class RecordNotFound(Exception):
    """Nao ha registro com esse identificador."""


class StorageUnavailable(Exception):
    """O armazenamento nao respondeu -- o banco caiu, ou nao ha conexao livre.

    Com nome proprio para que a API responda 503 ("tente de novo") em vez de um
    500 generico, e sem que ela precise conhecer o driver do banco.
    """


class CorruptRecord(StorageUnavailable):
    """O registro existe, mas o armazenamento devolveu algo que nao se le.

    Um arquivo JSON truncado, de topo que nao e objeto ou em formato de outra
    versao. Subclasse de ``StorageUnavailable`` de proposito: o defeito e do
    armazenamento, nao do pedido, e por isso nao pode sair como ``ValueError``
    -- que a API traduz para 400, culpando quem chamou. Herdando, a API
    responde 5xx sem precisar conhecer este nome.
    """


class ConcurrentModification(Exception):
    """A decisao mudou entre a leitura e a gravacao deste pedido.

    Cada caso de uso le o registro, calcula e grava -- e o calculo leva de
    milissegundos a segundos. Duas abas, ou o chat e a tela, respondendo a mesma
    decisao nesse intervalo fariam a segunda gravacao apagar a primeira, e uma
    declaracao sumiria da trilha sem aviso. Recusar a segunda e o que preserva a
    auditoria: quem recebe isto rele a decisao e decide de novo, agora vendo o
    que a outra janela fez.

    Levantada pelos adaptadores que guardam versao e conferem na gravacao:
    Postgres (versao por linha) e ``JsonFileDecisionRepository`` (versao no
    arquivo, conferida sob trava entre processos). A conferencia vale para um
    registro que a mesma instancia do repositorio leu antes (``get`` ou
    ``list``). Gravar sem ter lido difere entre os dois: o Postgres substitui
    por inteiro; o de arquivo recusa se o arquivo ja existir.
    ``InMemoryDecisionRepository`` nao confere nada -- e duble de teste, e com
    ele a segunda gravacao apaga a primeira.
    """


@dataclass
class DecisionRecord:
    """Tudo o que precisa ser persistido de uma decisao."""

    id: str
    problem: Problem
    log: AuditLog = field(default_factory=AuditLog)
    problematic_key: str = "escolha"
    settings: dict = field(default_factory=dict)
    created_at: datetime | None = None
    #: Limiar de equivalencia entre ALTERNATIVAS desta decisao. Mora aqui, e nao
    #: no container, por dois motivos: reabrir a decisao tem de reproduzir o
    #: mesmo resultado -- com o limiar no processo, a recomendacao passaria a
    #: depender de quem carregou o arquivo --, e a auditoria precisa poder dizer
    #: com que limiar aquele resultado saiu.
    #:
    #: Fora de ``settings`` de proposito: ``settings`` e a configuracao da
    #: problematica (perfis do sorting, orcamento da carteira) e trocar de
    #: problematica a substitui inteira. O limiar atravessa a troca, porque e da
    #: decisao e nao da leitura que se faz dela.
    #:
    #: ``None`` nao e zero: e "esta decisao nao escolheu", e ai vale o padrao do
    #: container. E o que mantem identico o comportamento de quem nunca
    #: configurou nada -- inclusive dos registros gravados antes deste campo.
    equivalence: float | None = None
    #: Decisao marcada pelo decisor para aparecer em destaque na listagem.
    #:
    #: Mora no registro, e nao no navegador, pelo motivo que esta escrito no
    #: cabecalho de ``web/components/DecisoesSalvas.tsx``: aquela tela nasceu
    #: porque a lista local nao sobrevivia a troca de maquina nem a limpeza do
    #: navegador -- "quem trocasse de maquina, limpasse o navegador ou
    #: simplesmente voltasse depois nao via nada, embora o trabalho estivesse
    #: la". Guardar o favorito no armazenamento local reintroduziria exatamente
    #: esse problema: o destaque sumiria junto com o cache.
    #:
    #: Nao entra em ``settings`` pelo mesmo motivo de ``equivalence``:
    #: ``settings`` e a configuracao da problematica e e substituida inteira ao
    #: trocar de leitura, enquanto o favorito acompanha a decisao.
    #:
    #: Nao toca em resultado nenhum -- nao entra no replay, nao muda o espaco de
    #: pesos -- e por isso e o unico campo aqui que e so preferencia de quem le.
    favorite: bool = False


@dataclass(frozen=True)
class DecisionSummary:
    """O que a listagem mostra de uma decisao -- e nada alem disso.

    Existe como tipo proprio para que um adaptador possa responder a listagem
    sem montar o registro inteiro: a matriz de consequencias e a trilha sao a
    maior parte de cada decisao, e a listagem nao usa nenhuma das duas.
    """

    id: str
    nome: str
    problematica: str
    alternativas: int
    criterios: int
    declaracoes: int
    criado_em: datetime | None
    #: A declaracao mais recente e, por definicao, a ultima vez que a decisao
    #: mudou. Sem declaracao nenhuma, ela esta como nasceu, e a criacao responde
    #: pelas duas.
    atualizado_em: datetime | None
    favorita: bool = False

    @staticmethod
    def of(record: "DecisionRecord") -> "DecisionSummary":
        """O resumo de um registro ja carregado.

        E a regra de referencia para as colunas que o adaptador Postgres grava
        desnormalizadas; ``atualizado_em`` e o instante da declaracao mais
        recente, ou a criacao se nao houver declaracao.
        """
        entradas = record.log.entries
        return DecisionSummary(
            id=record.id,
            nome=record.problem.name,
            problematica=record.problematic_key,
            alternativas=record.problem.n_alternatives,
            criterios=record.problem.n_criteria,
            declaracoes=len(entradas),
            criado_em=record.created_at,
            atualizado_em=(
                max(e.recorded_at for e in entradas) if entradas else record.created_at
            ),
            favorita=record.favorite,
        )


class DecisionRepository(ABC):
    """Armazenamento de decisoes.

    Contrato comum aos adaptadores: identificadores seguem o alfabeto
    ``[A-Za-z0-9_-]{1,64}``, e um id fora dele e recusado com ``ValueError``
    antes de qualquer acesso. Controle de concorrencia: os adaptadores
    Postgres e de arquivo conferem versao na gravacao (ver
    ``ConcurrentModification``); o de memoria e "ultima gravacao vence".
    """

    @abstractmethod
    def save(self, record: DecisionRecord) -> None:
        """Grava o registro inteiro, criando-o se nao existir.

        Erros: ValueError se o id for invalido; no Postgres e no arquivo,
        ConcurrentModification se outra gravacao passou na frente desde o
        ``get`` (no arquivo, tambem se um registro nunca lido ja existir), e
        RecordNotFound se o registro lido foi apagado nesse meio tempo;
        StorageUnavailable se o banco nao responder ou o arquivo nao puder ser
        trocado.
        """
        ...

    @abstractmethod
    def get(self, record_id: str) -> DecisionRecord:
        """O registro com esse id, montado a partir do armazenamento.

        Erros: RecordNotFound se nao existir; ValueError se o id for invalido;
        StorageUnavailable (Postgres fora do ar) ou CorruptRecord (arquivo
        ilegivel).
        """
        ...

    @abstractmethod
    def list(self) -> list[DecisionRecord]:
        """Todos os registros, montados por inteiro. Para a listagem, ``summaries``.

        O adaptador de arquivo deixa de fora, com aviso no log, o arquivo que
        nao se le.

        Erros: StorageUnavailable (so Postgres).
        """
        ...

    @abstractmethod
    def delete(self, record_id: str) -> None:
        """Apaga o registro e sua trilha.

        Erros: RecordNotFound se nao existir; ValueError se o id for invalido;
        StorageUnavailable (so Postgres).
        """
        ...

    def summaries(self) -> list[DecisionSummary]:
        """A listagem. O padrao monta cada registro; um banco responde sem isso."""
        return [DecisionSummary.of(record) for record in self.list()]

    def exists(self, record_id: str) -> bool:
        try:
            self.get(record_id)
        except RecordNotFound:
            return False
        return True
