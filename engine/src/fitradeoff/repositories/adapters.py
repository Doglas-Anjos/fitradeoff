"""Adaptadores de persistencia: memoria e arquivo JSON.

O adaptador Postgres mora em ``postgres.py`` e implementa a mesma porta --
nenhuma regra de negocio muda. O de memoria existe para os testes rodarem sem
tocar em disco.

Limitacao conhecida: nenhum dos dois confere versao ao gravar. Diferente do
Postgres, eles nunca levantam ``ConcurrentModification``: duas gravacoes que
se cruzam terminam com a ultima valendo e a outra perdida sem aviso.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from .base import DecisionRecord, DecisionRepository, RecordNotFound
from .serialization import record_from_dict, record_to_dict


class InMemoryDecisionRepository(DecisionRepository):
    """Guarda os registros num dicionario. Some quando o processo morre.

    Valida o identificador com a mesma regra do adaptador de disco: um duble de
    teste que aceita o que o real recusa esconde justamente os bugs que
    importam. Assim como o de disco, grava por cima sem conferir versao.

    Erros: ValueError se o id for invalido; RecordNotFound em ``get``/``delete``
    de id inexistente.
    """

    _VALID_ID = re.compile(r"^[A-Za-z0-9_-]{1,64}$")

    def __init__(self) -> None:
        self._records: dict[str, dict] = {}

    def _check(self, record_id: str) -> str:
        if not self._VALID_ID.match(record_id or ""):
            raise ValueError(f"Identificador invalido: {record_id!r}.")
        return record_id

    def save(self, record: DecisionRecord) -> None:
        self._check(record.id)
        # serializa e desserializa para que o adaptador se comporte como o de
        # disco, inclusive nas conversoes de tipo
        self._records[record.id] = record_to_dict(record)

    def get(self, record_id: str) -> DecisionRecord:
        self._check(record_id)
        if record_id not in self._records:
            raise RecordNotFound(f"Decisao '{record_id}' nao encontrada.")
        return record_from_dict(self._records[record_id])

    def list(self) -> list[DecisionRecord]:
        return [record_from_dict(data) for data in self._records.values()]

    def delete(self, record_id: str) -> None:
        self._check(record_id)
        if record_id not in self._records:
            raise RecordNotFound(f"Decisao '{record_id}' nao encontrada.")
        del self._records[record_id]


class JsonFileDecisionRepository(DecisionRepository):
    """Um arquivo JSON por decisao, num diretorio.

    O identificador vem de fora -- de um agente, de uma URL, de um arquivo de
    configuracao -- entao nunca e concatenado ao caminho sem conferencia. Duas
    barreiras, porque cada uma cobre o que a outra deixa passar:

    * um conjunto permitido de caracteres, que recusa ``..``, barras e nomes
      reservados antes de tocar no sistema de arquivos;
    * conferencia do caminho ja resolvido, que pega o que sobrar -- inclusive um
      link simbolico apontando para fora do diretorio.

    Erros: ValueError se o id for invalido ou resolver para fora do diretorio;
    RecordNotFound em ``get``/``delete`` de id inexistente; em ``get``,
    ``json.JSONDecodeError`` (subclasse de ValueError) ou KeyError se o arquivo
    estiver corrompido ou em formato de outra versao.
    """

    # hexadecimal e hifen bastam para os identificadores que geramos, e nao
    # incluem nenhum caractere com significado no sistema de arquivos
    _VALID_ID = re.compile(r"^[A-Za-z0-9_-]{1,64}$")

    def __init__(self, directory: Path | str) -> None:
        self._directory = Path(directory)

    @property
    def directory(self) -> Path:
        return self._directory

    def _path(self, record_id: str) -> Path:
        if not self._VALID_ID.match(record_id or ""):
            raise ValueError(
                f"Identificador invalido: {record_id!r}. Sao aceitos ate 64 "
                f"caracteres entre letras, digitos, hifen e sublinhado."
            )

        candidate = self._directory / f"{record_id}.json"
        base = self._directory.resolve()
        resolved = candidate.resolve()
        if resolved.parent != base:
            raise ValueError(
                f"Caminho resolvido para fora do diretorio de dados: {record_id!r}."
            )
        return candidate

    def save(self, record: DecisionRecord) -> None:
        """Regrava o arquivo inteiro da decisao.

        Limitacao conhecida: sem conferencia de versao -- a gravacao sobrescreve
        o que estiver no disco, mesmo que outro pedido tenha gravado depois da
        leitura deste, e nunca levanta ``ConcurrentModification``. Tambem nao e
        atomica: ``write_text`` trunca o arquivo e escreve por cima, sem arquivo
        temporario nem renomeacao. Uma queda no meio deixa JSON truncado, que
        ``get`` passa a recusar e ``list`` omite em silencio.
        """
        self._directory.mkdir(parents=True, exist_ok=True)
        self._path(record.id).write_text(
            json.dumps(record_to_dict(record), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def get(self, record_id: str) -> DecisionRecord:
        path = self._path(record_id)
        if not path.exists():
            raise RecordNotFound(f"Decisao '{record_id}' nao encontrada.")
        return record_from_dict(json.loads(path.read_text(encoding="utf-8")))

    def list(self) -> list[DecisionRecord]:
        """Todos os registros legiveis do diretorio, em ordem de nome de arquivo.

        Tolerante de proposito: um arquivo corrompido, de topo que nao e objeto
        ou de outra versao do formato e pulado sem aviso, para que um arquivo
        ruim nao derrube a listagem inteira. O preco e que ele some da lista
        sem que ninguem saiba por que; ``get`` com o mesmo id levanta o erro.
        """
        if not self._directory.exists():
            return []
        records = []
        for path in sorted(self._directory.glob("*.json")):
            try:
                dados = json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue  # arquivo corrompido: ignora
            # Conferido, e nao capturado: um `.json` de topo lista ou numero nao e
            # registro, e indexa-lo por nome levantaria TypeError. Recusar aqui,
            # pelo formato, deixa a captura abaixo estreita -- se `record_from_dict`
            # ganhar um defeito que levante TypeError, ele aparece em vez de virar
            # uma listagem vazia.
            if not isinstance(dados, dict):
                continue
            try:
                records.append(record_from_dict(dados))
            except (KeyError, ValueError):
                continue  # de outra versao: ignora
        return records

    def delete(self, record_id: str) -> None:
        path = self._path(record_id)
        if not path.exists():
            raise RecordNotFound(f"Decisao '{record_id}' nao encontrada.")
        path.unlink()
