"""Adaptadores de persistencia: memoria e arquivo JSON.

O adaptador Postgres mora em ``postgres.py`` e implementa a mesma porta --
nenhuma regra de negocio muda. O de memoria existe para os testes rodarem sem
tocar em disco.

O de arquivo confere versao ao gravar, como o Postgres: duas gravacoes que se
cruzam terminam com a segunda recusada (``ConcurrentModification``), e nao com
uma declaracao perdida. O de memoria continua "ultima gravacao vence".
"""

from __future__ import annotations

import json
import logging
import os
import re
import secrets
import threading
import time
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import TypeVar

from .base import (
    ConcurrentModification,
    CorruptRecord,
    DecisionRecord,
    DecisionRepository,
    RecordNotFound,
    StorageUnavailable,
)
from .serialization import record_from_dict, record_to_dict

_log = logging.getLogger(__name__)

_T = TypeVar("_T")

# No Windows, renomear por cima de um arquivo que outro processo esta lendo, ou
# abrir um arquivo no instante da troca, falha com PermissionError em vez de
# esperar. A janela e de milissegundos; 40 tentativas de 25 ms (1 s no total)
# cobrem uma leitura concorrente sem transformar uma falha real em espera longa.
_TENTATIVAS = 40
_ESPERA_ENTRE_TENTATIVAS = 0.025


def _com_repeticao(operacao: Callable[[], _T]) -> _T:
    """Executa ``operacao`` repetindo enquanto o Windows recusar por arquivo em uso.

    Erros: StorageUnavailable se ainda falhar depois de ``_TENTATIVAS``.
    """
    for tentativa in range(_TENTATIVAS):
        try:
            return operacao()
        except PermissionError as exc:
            if tentativa == _TENTATIVAS - 1:
                raise StorageUnavailable(
                    "O arquivo da decisao ficou ocupado por outro processo; tente "
                    "de novo."
                ) from exc
            time.sleep(_ESPERA_ENTRE_TENTATIVAS)
    raise AssertionError("inalcancavel")


@contextmanager
def _trava_exclusiva(caminho: Path) -> Iterator[None]:
    """Trava exclusiva entre processos, segurada num arquivo ``.lock`` proprio.

    Trava o primeiro byte do arquivo de trava -- ``msvcrt.locking`` no Windows,
    ``fcntl.flock`` no POSIX. As duas conflitam tambem entre descritores do
    mesmo processo, entao servem igualmente para duas threads. O arquivo de
    trava nao e apagado depois: apagar abriria uma corrida em que dois
    processos travam arquivos diferentes com o mesmo nome.

    Erros: StorageUnavailable se a trava nao sair (no Windows, ``LK_LOCK``
    desiste depois de cerca de 10 s).
    """
    with open(caminho, "a+b") as arquivo:
        try:
            if os.name == "nt":
                import msvcrt

                arquivo.seek(0)
                msvcrt.locking(arquivo.fileno(), msvcrt.LK_LOCK, 1)
            else:
                import fcntl

                fcntl.flock(arquivo.fileno(), fcntl.LOCK_EX)
        except OSError as exc:
            raise StorageUnavailable(
                "Outra gravacao desta decisao esta demorando; tente de novo."
            ) from exc
        try:
            yield
        finally:
            if os.name == "nt":
                import msvcrt

                arquivo.seek(0)
                msvcrt.locking(arquivo.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl

                fcntl.flock(arquivo.fileno(), fcntl.LOCK_UN)


class InMemoryDecisionRepository(DecisionRepository):
    """Guarda os registros num dicionario. Some quando o processo morre.

    Valida o identificador com a mesma regra do adaptador de disco: um duble de
    teste que aceita o que o real recusa esconde justamente os bugs que
    importam. Diferente do de disco, grava por cima sem conferir versao: e
    "ultima gravacao vence", e nunca levanta ``ConcurrentModification``.

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

    Concorrencia, com o mesmo contrato do Postgres: o arquivo guarda um
    contador ``versao``; ``get`` (e ``list``) memoriza a versao lida, e
    ``save`` so grava se a versao no disco ainda for essa -- conferida e
    gravada sob uma trava entre processos (``<id>.lock``). A gravacao e
    atomica: arquivo temporario no mesmo diretorio e ``os.replace``, entao
    ninguem le JSON pela metade. A versao lida e memorizada por thread: uma
    instancia compartilhada entre pedidos simultaneos nao mistura a leitura de
    um com a gravacao do outro.

    Erros: ValueError se o id for invalido ou resolver para fora do diretorio;
    RecordNotFound em ``get``/``delete`` de id inexistente; CorruptRecord
    (um ``StorageUnavailable``) em ``get`` se o arquivo estiver corrompido ou
    em formato de outra versao; ConcurrentModification em ``save`` (ver la).
    """

    # hexadecimal e hifen bastam para os identificadores que geramos, e nao
    # incluem nenhum caractere com significado no sistema de arquivos
    _VALID_ID = re.compile(r"^[A-Za-z0-9_-]{1,64}$")

    def __init__(self, directory: Path | str) -> None:
        self._directory = Path(directory)
        self._local = threading.local()

    @property
    def _lido(self) -> dict[str, int]:
        """Versao lida de cada id, nesta thread."""
        if not hasattr(self._local, "lido"):
            self._local.lido = {}
        return self._local.lido

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

    @contextmanager
    def _travado(self, record_id: str) -> Iterator[None]:
        self._directory.mkdir(parents=True, exist_ok=True)
        with _trava_exclusiva(self._directory / f"{record_id}.lock"):
            yield

    @staticmethod
    def _ler(path: Path) -> dict:
        """O conteudo do arquivo como dicionario, ou ``CorruptRecord``.

        Conferido, e nao capturado: um `.json` de topo lista ou numero nao e
        registro, e indexa-lo por nome levantaria TypeError. Recusar pelo
        formato deixa a captura estreita.

        Erros: CorruptRecord se o arquivo nao for JSON em UTF-8 ou nao for um
        objeto; FileNotFoundError se sumir durante a leitura.
        """
        try:
            dados = json.loads(_com_repeticao(lambda: path.read_text(encoding="utf-8")))
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            raise CorruptRecord(
                f"O arquivo da decisao '{path.stem}' esta corrompido e nao pode "
                f"ser lido."
            ) from exc
        if not isinstance(dados, dict):
            raise CorruptRecord(
                f"O arquivo '{path.name}' nao contem um registro de decisao."
            )
        return dados

    @staticmethod
    def _montar(path: Path, dados: dict) -> DecisionRecord:
        """O registro a partir do dicionario, ou ``CorruptRecord``.

        Erros: CorruptRecord se faltar campo ou o conteudo nao se ler (formato
        de outra versao).
        """
        try:
            return record_from_dict(dados)
        except (KeyError, ValueError) as exc:
            raise CorruptRecord(
                f"O arquivo da decisao '{path.stem}' esta em formato invalido ou "
                f"de outra versao: {exc}"
            ) from exc

    @staticmethod
    def _versao(dados: dict) -> int:
        # arquivos gravados antes do contador existir valem como versao 0
        return int(dados.get("versao", 0))

    def save(self, record: DecisionRecord) -> None:
        """Regrava o arquivo inteiro, se ninguem gravou desde a leitura deste.

        Registro lido antes por esta instancia (nesta thread): a versao no
        disco precisa ser a lida, senao ``ConcurrentModification``. Registro
        nunca lido: so grava se o arquivo nao existir -- mais estrito que o
        upsert as cegas do Postgres, porque aqui um id repetido apagaria a
        decisao de outra pessoa sem deixar rastro. Conferencia e gravacao
        acontecem sob a trava ``<id>.lock``, e a gravacao e atomica (temporario
        no mesmo diretorio + ``os.replace``).

        Erros: ValueError se o id for invalido; ConcurrentModification se a
        versao mudou desde o ``get`` ou se um registro novo encontrar arquivo
        existente; RecordNotFound se o registro lido foi apagado nesse meio
        tempo; CorruptRecord se o arquivo no disco estiver ilegivel;
        StorageUnavailable se a trava ou a troca do arquivo nao sairem.
        """
        path = self._path(record.id)
        dados = record_to_dict(record)
        with self._travado(record.id):
            lida = self._lido.get(record.id)
            no_disco = self._versao(self._ler(path)) if path.exists() else None
            if lida is None:
                if no_disco is not None:
                    raise ConcurrentModification(
                        f"Ja existe uma decisao gravada com o id '{record.id}'; "
                        f"este pedido nao a leu antes, e por isso nao a substitui."
                    )
            elif no_disco is None:
                raise RecordNotFound(f"Decisao '{record.id}' nao encontrada.")
            elif no_disco != lida:
                raise ConcurrentModification(
                    "A decisao foi alterada em outra janela enquanto este pedido "
                    "era processado. Recarregue para ver o que mudou e responda "
                    "de novo."
                )
            nova = (no_disco or 0) + 1
            dados["versao"] = nova
            self._gravar(path, dados)
        self._lido[record.id] = nova

    def _gravar(self, path: Path, dados: dict) -> None:
        """Grava de forma atomica: temporario com nome unico, depois ``os.replace``.

        O temporario fica no mesmo diretorio para que a troca seja um rename no
        mesmo sistema de arquivos, que e atomico. Uma queda no meio deixa o
        arquivo anterior intacto e, no maximo, um ``.tmp`` orfao que ``list``
        nao le.

        Erros: StorageUnavailable se a troca continuar recusada (ver
        ``_com_repeticao``).
        """
        temporario = path.with_name(f".{path.stem}.{secrets.token_hex(8)}.tmp")
        try:
            with open(temporario, "w", encoding="utf-8") as arquivo:
                arquivo.write(json.dumps(dados, ensure_ascii=False, indent=2))
                arquivo.flush()
                os.fsync(arquivo.fileno())
            _com_repeticao(lambda: os.replace(temporario, path))
        finally:
            temporario.unlink(missing_ok=True)

    def get(self, record_id: str) -> DecisionRecord:
        """Le a decisao e memoriza a versao lida, para o ``save`` conferir.

        Erros: RecordNotFound se nao existir; ValueError se o id for invalido;
        CorruptRecord se o arquivo estiver corrompido ou em outro formato.
        """
        path = self._path(record_id)
        try:
            dados = self._ler(path)
        except FileNotFoundError:
            raise RecordNotFound(f"Decisao '{record_id}' nao encontrada.") from None
        record = self._montar(path, dados)
        self._lido[record_id] = self._versao(dados)
        return record

    def list(self) -> list[DecisionRecord]:
        """Todos os registros legiveis do diretorio, em ordem de nome de arquivo.

        Tolerante de proposito: um arquivo corrompido, de topo que nao e objeto
        ou de outra versao do formato fica fora da lista, para que um arquivo
        ruim nao derrube a listagem inteira -- mas nao em silencio: cada um sai
        no log como aviso, com o motivo. ``get`` com o mesmo id levanta
        ``CorruptRecord``. Como ``get``, memoriza a versao de cada registro.
        """
        if not self._directory.exists():
            return []
        records = []
        for path in sorted(self._directory.glob("*.json")):
            try:
                dados = self._ler(path)
                record = self._montar(path, dados)
            except CorruptRecord as exc:
                _log.warning("Registro ilegivel fora da listagem (%s): %s", path, exc)
                continue
            except FileNotFoundError:
                continue  # apagado entre a listagem do diretorio e a leitura
            self._lido[record.id] = self._versao(dados)
            records.append(record)
        return records

    def delete(self, record_id: str) -> None:
        """Apaga o arquivo da decisao, sob a mesma trava da gravacao.

        Como no Postgres, nao confere versao: apaga mesmo que outra janela
        tenha gravado depois da leitura deste pedido. O ``.lock`` fica (ver
        ``_trava_exclusiva``).

        Erros: RecordNotFound se nao existir; ValueError se o id for invalido.
        """
        path = self._path(record_id)
        with self._travado(record_id):
            if not path.exists():
                raise RecordNotFound(f"Decisao '{record_id}' nao encontrada.")
            _com_repeticao(path.unlink)
        self._lido.pop(record_id, None)
