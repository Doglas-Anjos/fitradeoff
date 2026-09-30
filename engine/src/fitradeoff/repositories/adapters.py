"""Adaptadores de persistencia: memoria e arquivo JSON.

Um adaptador Postgres entra aqui ao lado destes, implementando a mesma porta --
nenhuma regra de negocio muda. O de memoria existe para os testes rodarem sem
tocar em disco.
"""

from __future__ import annotations

import json
import os
import re
import tempfile
from pathlib import Path

from .base import DecisionRecord, DecisionRepository, RecordNotFound
from .serialization import record_from_dict, record_to_dict


class InMemoryDecisionRepository(DecisionRepository):
    """Guarda os registros num dicionario. Some quando o processo morre.

    Valida o identificador com a mesma regra do adaptador de disco: um duble de
    teste que aceita o que o real recusa esconde justamente os bugs que
    importam.
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
        """Grava por inteiro ou nao grava: nunca deixa meio arquivo no lugar.

        ``write_text`` direto no destino trunca o arquivo antes de escrever. Se o
        processo morrer no meio -- o container reiniciado, o disco cheio, o
        limite de memoria -- sobra um JSON cortado, que ``get`` nao le e
        ``list`` ignora em silencio: a decisao inteira, com todo o historico de
        respostas da pessoa, some por causa de uma gravacao que so ia
        acrescentar uma resposta.

        Entao escreve ao lado, num arquivo temporario de nome unico, forca os
        bytes ao disco e so entao troca um pelo outro com ``os.replace``, que e
        atomico no mesmo sistema de arquivos -- por isso o temporario fica no
        mesmo diretorio, e nao em ``/tmp``, que no container e outro sistema de
        arquivos (um tmpfs). Quem ler durante a troca ve o arquivo velho ou o
        novo, nunca um pedaco.

        O nome unico importa: duas gravacoes da mesma decisao ao mesmo tempo nao
        podem escrever no mesmo temporario. E ele nao termina em ``.json``, para
        a listagem nunca o confundir com uma decisao.
        """
        destino = self._path(record.id)
        self._directory.mkdir(parents=True, exist_ok=True)
        conteudo = json.dumps(record_to_dict(record), ensure_ascii=False, indent=2)

        temporario = tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=self._directory,
            prefix=f".{record.id}.",
            suffix=".tmp",
            delete=False,
        )
        try:
            with temporario:
                temporario.write(conteudo)
                temporario.flush()
                os.fsync(temporario.fileno())
            os.replace(temporario.name, destino)
        except BaseException:
            # Qualquer falha, inclusive interrupcao: o destino continua o que
            # era, e o temporario nao fica acumulando no diretorio.
            try:
                os.unlink(temporario.name)
            except OSError:
                pass
            raise

    def get(self, record_id: str) -> DecisionRecord:
        path = self._path(record_id)
        if not path.exists():
            raise RecordNotFound(f"Decisao '{record_id}' nao encontrada.")
        return record_from_dict(json.loads(path.read_text(encoding="utf-8")))

    def list(self) -> list[DecisionRecord]:
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
