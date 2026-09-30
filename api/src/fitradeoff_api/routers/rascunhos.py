"""O problema que ainda esta sendo montado.

Ate aqui, alternativas e criterios digitados no formulario viviam so no
``localStorage`` do navegador. Isso e conveniencia por navegador, nao dado: quem
comecava a montar um problema no computador do trabalho nao o encontrava em
casa, e limpar os dados do site apagava meia hora de digitacao sem aviso.

O rascunho fica aqui ate virar decisao. Depois disso ele nao serve mais, e a
propria criacao o descarta -- guarda-lo alem disso seria manter duas verdades
sobre o mesmo problema.

**O conteudo e opaco para a API de proposito.** A forma do formulario e assunto
da interface, e muda com ela; congelar essa forma num schema aqui obrigaria a
mexer nos dois lados a cada campo novo. O que a API garante e o contrato de
verdade: que o que foi gravado volta igual, e que o arquivo em disco continua
sendo JSON valido.

Tem dono, do mesmo jeito que as decisoes: atras de uma aplicacao que autentica,
cada pessoa tem o seu. Sem verificador configurado -- a plataforma rodando no
computador do decisor -- continua sendo um por instalacao.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from ..config import Settings
from ..deps import acervo, get_settings

router = APIRouter(prefix="/api", tags=["rascunho"])

# Um formulario grande -- 30 alternativas por 15 criterios com nomes longos --
# nao passa de algumas dezenas de kB. O teto existe para que um cliente com
# defeito nao encha o disco em silencio, e e folgado o bastante para nunca
# alcancar um uso legitimo.
LIMITE_BYTES = 512 * 1024


def caminho(pasta: Path, settings: Settings) -> Path:
    """Fora do diretorio das decisoes, de proposito, e um por pessoa.

    O repositorio do motor lista decisoes com ``glob("*.json")`` naquele
    diretorio: um rascunho ali dentro apareceria na lista de decisoes salvas
    como um registro corrompido, e a listagem o ignoraria em silencio. Por isso
    o arquivo fica ao lado da pasta, e nao dentro dela.

    O caminho do dono da maquina continua sendo o de sempre. Mudar o nome de
    lugar levaria junto o rascunho que estivesse pela metade -- e este modulo
    existe justamente porque meia hora de digitacao perdida sem aviso e
    inaceitavel.
    """
    if pasta == settings.storage:
        return settings.storage.parent / "rascunho.json"
    return pasta.parent / f"{pasta.name}.rascunho.json"


@router.get("/rascunho", summary="O rascunho guardado, se houver")
def ler(
    pasta: Path = Depends(acervo), settings: Settings = Depends(get_settings)
) -> dict[str, Any]:
    """O rascunho guardado de quem chama, com o carimbo de quando foi gravado.

    Arquivo ausente ou ilegivel responde como rascunho vazio, para a tela nao quebrar na
    abertura.
    """
    arquivo = caminho(pasta, settings)
    if not arquivo.exists():
        return {"rascunho": None, "gravado_em": None}
    try:
        guardado = json.loads(arquivo.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        # Arquivo truncado por queda de energia ou escrita interrompida: a tela
        # segue com o que tiver em maos em vez de quebrar na abertura.
        return {"rascunho": None, "gravado_em": None}
    return {
        "rascunho": guardado.get("rascunho"),
        "gravado_em": guardado.get("gravado_em"),
    }


@router.post("/rascunho", summary="Guarda o rascunho")
def gravar(
    corpo: dict[str, Any],
    pasta: Path = Depends(acervo),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    """Guarda o rascunho de quem chama, carimbado pelo relogio do servidor.

    Erros: 422 corpo sem o campo ``rascunho``; 413 rascunho acima de 512 kB.
    """
    rascunho = corpo.get("rascunho")
    if rascunho is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "Envie o rascunho no campo 'rascunho'.",
        )

    # O carimbo e do servidor, nao do cliente. A tela compara este carimbo com o
    # do proprio navegador para decidir qual versao e a mais nova quando as duas
    # existem; deixar o cliente carimbar abriria a porta para um relogio
    # adiantado congelar uma versao velha como se fosse a ultima.
    guardado = {
        "rascunho": rascunho,
        "gravado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    texto = json.dumps(guardado, ensure_ascii=False)
    if len(texto.encode("utf-8")) > LIMITE_BYTES:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE,
            "Rascunho grande demais para ser guardado.",
        )

    arquivo = caminho(pasta, settings)
    arquivo.parent.mkdir(parents=True, exist_ok=True)
    # Escrita em dois passos: um corte no meio do write deixaria JSON pela
    # metade, e a leitura seguinte perderia o rascunho inteiro em vez de
    # devolver a versao anterior.
    provisorio = arquivo.with_suffix(".json.parcial")
    provisorio.write_text(texto, encoding="utf-8")
    provisorio.replace(arquivo)
    return {"guardado": True, "gravado_em": guardado["gravado_em"]}


@router.post("/rascunho/descartar", summary="Esquece o rascunho")
def descartar(
    pasta: Path = Depends(acervo), settings: Settings = Depends(get_settings)
) -> dict[str, bool]:
    """Apaga o rascunho de quem chama.

    Descartar o que nao existe tambem responde sucesso: o resultado pedido ja vale.
    """
    arquivo = caminho(pasta, settings)
    arquivo.unlink(missing_ok=True)
    return {"descartado": True}
