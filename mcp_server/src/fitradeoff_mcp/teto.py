"""Teto de decisoes no acervo de cada pessoa.

Qualquer pessoa com conta no FasorX ganha um acervo e pode criar decisoes nele
-- pela tela, pela planilha, pelo chat ou pelo assistente conectado por chave.
Sem teto, um laco de criacao (um cliente com defeito, um assistente teimoso)
enche o disco do servidor inteiro, e quem paga sao todas as outras pessoas.

Mora neste pacote, e nao na API, porque o MCP cria decisoes por um caminho
proprio (``create_problem``) e a API ja depende daqui. Um lugar so para a regra:
se cada caminho de criacao tivesse o seu teto, o proximo caminho nasceria sem.

So o acervo de PESSOA tem teto -- o diretorio ``.../pessoas/<resumo>``. O
acervo do dono da plataforma e dele: numa instalacao local nao ha "outras
pessoas" a proteger, e um teto ali so atrapalharia quem usa muito.
"""

from __future__ import annotations

import os
from collections.abc import Callable
from pathlib import Path

from fitradeoff.application import LimitExceeded

PADRAO = 300
"""Decisoes por pessoa quando ``FITRADEOFF_MAX_DECISOES_POR_PESSOA`` nao diz."""


class AcervoCheio(LimitExceeded):
    """O acervo da pessoa chegou ao teto de decisoes.

    Filho de ``LimitExceeded`` para que todo caminho que ja traduz o teto do
    motor (a rede de seguranca das ferramentas do MCP, o chat) o trate sem
    codigo novo. A API o traduz a parte, com 409: nao e o pedido que e grande
    demais, e o acervo que esta cheio.
    """


def limite_do_ambiente() -> int:
    """O teto configurado. Zero desliga (decisao explicita de quem configura);
    valor ilegivel cai no padrao, e nao em "sem teto"."""
    try:
        return int(os.environ.get("FITRADEOFF_MAX_DECISOES_POR_PESSOA", PADRAO))
    except ValueError:
        return PADRAO


def de_pessoa(acervo: Path) -> bool:
    """Se o diretorio e o acervo de uma pessoa (``.../pessoas/<resumo>``)."""
    return acervo.parent.name == "pessoas"


def contar_arquivos(acervo: Path) -> int:
    """Quantas decisoes ha no diretorio, pelo mesmo ``*.json`` que o
    repositorio usa para lista-las -- sem abrir nenhuma."""
    if not acervo.is_dir():
        return 0
    return sum(1 for _ in acervo.glob("*.json"))


def conferir(
    acervo: Path,
    limite: int | None = None,
    contar: Callable[[], int] | None = None,
) -> None:
    """Levanta ``AcervoCheio`` se criar mais uma decisao passaria do teto.

    ``contar`` existe para o armazenamento em banco, onde o diretorio nao tem
    arquivos: quem chama passa a contagem pelo repositorio. Sem ele, conta os
    arquivos.

    A conferencia e antes de criar, sem trava: dois pedidos simultaneos no
    limite podem passar os dois e deixar o acervo com uma decisao a mais. O
    teto e contra encher o disco, nao uma cota exata -- uma a mais nao importa.
    """
    if not de_pessoa(acervo):
        return
    teto = limite_do_ambiente() if limite is None else limite
    if teto <= 0:
        return
    atual = contar() if contar is not None else contar_arquivos(acervo)
    if atual >= teto:
        raise AcervoCheio(
            f"Seu acervo chegou ao limite de {teto} decisoes. Nenhuma decisao "
            "foi criada; fale com o administrador da plataforma para liberar "
            "espaco. As decisoes existentes continuam abrindo normalmente."
        )
