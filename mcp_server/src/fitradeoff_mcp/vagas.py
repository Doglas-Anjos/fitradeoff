"""Quantos calculos cada pessoa roda ao mesmo tempo.

O servidor tem um numero fixo de trabalhadores (40, o padrao do anyio), e e nele
que rodam os calculos da API e as ferramentas do MCP. Sem limite, uma pessoa com
41 pedidos pesados ocupa todos, e o pedido de qualquer outra fica na fila atras
dos dela: medido, a verificacao de saude de outra pessoa passou de 5 ms para
68 s.

A regra e simples, de proposito:

* **por pessoa, no maximo** ``por_pessoa`` **calculos rodando** (2): o
  excedente espera a vez dele, sem atrapalhar ninguem;
* **no total, no maximo** ``no_total`` (24), abaixo dos 40 trabalhadores, para
  que listar, abrir e salvar rascunho sempre encontrem vaga.

**A espera acontece antes de ocupar um trabalhador.** E o detalhe que faz isto
funcionar: os semaforos sao do laco de eventos, entao quem espera nao gasta
thread nenhuma. Se a espera fosse dentro do trabalhador, a vaga ja estaria
gasta e o problema continuaria.

Esperar, e nao recusar: a tela so demora um pouco mais. Recusa so em dois
casos, nenhum deles uso normal -- a tela nunca tem mais que um ou dois calculos
pendentes:

* ``Cheio``: a pessoa ja tem ``esperando_por_pessoa`` pedidos na fila (8). Um
  cliente com defeito empilharia conexoes abertas sem fim;
* ``Ocupado``: o pedido esperou alem de ``espera`` segundos.

Nao e uma fila justa por rodizio. Com ate ``no_total / por_pessoa`` pessoas
calculando ao mesmo tempo (12), ninguem espera por ninguem; acima disso, quem
chega espera por ordem de chegada -- pouco, porque ninguem segura mais de duas
vagas.

Vive na memoria do processo. Com varios processos, cada um tem as suas vagas.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator, Hashable
from contextlib import asynccontextmanager

import anyio.to_thread

logger = logging.getLogger(__name__)


class Ocupado(Exception):
    """Esperou demais por uma vaga."""


class Cheio(Ocupado):
    """A pessoa ja tem pedidos demais esperando. Nao entra na fila."""


class Vagas:
    """As vagas de calculo de um processo."""

    def __init__(
        self,
        por_pessoa: int = 2,
        no_total: int = 24,
        espera: float = 60.0,
        esperando_por_pessoa: int = 8,
    ):
        if por_pessoa < 1 or no_total < 1 or esperando_por_pessoa < 0:
            raise ValueError("As vagas precisam ser ao menos uma por pessoa e uma no total.")
        self.por_pessoa = por_pessoa
        self.no_total = no_total
        self.espera = espera
        self.esperando_por_pessoa = esperando_por_pessoa
        self._total = asyncio.Semaphore(no_total)
        # Semaforo e quantos pedidos (rodando ou esperando) o usam. Sai do
        # dicionario quando ninguem mais o usa: sem isso, ele cresceria com cada
        # pessoa que ja passou pelo servidor. Sem trava, porque so o laco de
        # eventos mexe aqui, e entre dois `await` nada o interrompe.
        self._pessoas: dict[Hashable, tuple[asyncio.Semaphore, int]] = {}

    @asynccontextmanager
    async def de(self, pessoa: Hashable) -> AsyncIterator[None]:
        """Segura uma vaga desta pessoa e uma do total enquanto o bloco roda."""
        semaforo, usos = self._pessoas.get(pessoa, (None, 0))
        if usos >= self.por_pessoa + self.esperando_por_pessoa:
            raise Cheio(
                "Voce ja tem muitos calculos em andamento. Espere os anteriores "
                "terminarem antes de pedir outro."
            )
        if semaforo is None:
            semaforo = asyncio.Semaphore(self.por_pessoa)
        self._pessoas[pessoa] = (semaforo, usos + 1)
        try:
            try:
                async with asyncio.timeout(self.espera):
                    await semaforo.acquire()
                    try:
                        await self._total.acquire()
                    except BaseException:
                        semaforo.release()
                        raise
            except TimeoutError as exc:
                raise Ocupado(
                    "O servidor esta com muitos calculos em andamento. Tente de "
                    "novo em alguns segundos."
                ) from exc
            try:
                yield
            finally:
                self._total.release()
                semaforo.release()
        finally:
            semaforo, usos = self._pessoas[pessoa]
            if usos <= 1:
                del self._pessoas[pessoa]
            else:
                self._pessoas[pessoa] = (semaforo, usos - 1)

    def aviso_de_folga(self, trabalhadores: int) -> str | None:
        """Diz se o total de vagas deixa trabalhadores para as rotas leves.

        Com o total igual ou acima dos trabalhadores, os calculos voltam a poder
        ocupar todos, e listar ou abrir uma decisao volta a esperar atras deles
        -- exatamente o que esta trava existe para impedir. Nada quebra: por isso
        precisa de aviso.
        """
        if self.no_total < trabalhadores:
            return None
        return (
            f"FITRADEOFF_VAGAS_NO_TOTAL={self.no_total} nao deixa folga: o servidor "
            f"tem {trabalhadores} trabalhadores, e com calculos ocupando todos, as "
            f"rotas que nao calculam voltam a esperar. Use um valor abaixo de "
            f"{trabalhadores}."
        )

    @property
    def livres_no_total(self) -> int:
        """Vagas do total que ninguem segura. Para os testes."""
        return self._total._value

    @property
    def calculando(self) -> int:
        """Calculos rodando agora, de todas as pessoas."""
        return self.no_total - self._total._value

    @property
    def esperando(self) -> int:
        """Pedidos na fila, ainda sem vaga. Com a fila crescendo, falta vaga."""
        pedidos = sum(usos for _, usos in self._pessoas.values())
        return max(pedidos - self.calculando, 0)

    @property
    def pessoas_ativas(self) -> int:
        """Quantas pessoas tem pedido rodando ou esperando. Para os testes."""
        return len(self._pessoas)


def avisar_se_sem_folga(vagas: Vagas) -> None:
    """Na partida, com o laco de eventos rodando: confere o total contra o
    numero real de trabalhadores, que so e conhecido ai."""
    trabalhadores = int(anyio.to_thread.current_default_thread_limiter().total_tokens)
    aviso = vagas.aviso_de_folga(trabalhadores)
    if aviso:
        logger.warning(aviso)
