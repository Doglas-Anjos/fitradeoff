"""Rotas de planilha: modelo, importacao e exportacao."""

from __future__ import annotations

import json
from urllib.parse import quote

from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from fitradeoff import DecisionService

from .. import spreadsheet
from ..deps import CALCULO, acervo, translate, vaga

router = APIRouter(prefix="/api", tags=["planilhas"])

XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

# Teto de upload. O motor ja limita alternativas e criterios, mas um arquivo
# gigante consome memoria antes de chegar la.
MAX_BYTES = 2 * 1024 * 1024


def _anexo(conteudo: bytes, nome: str) -> Response:
    # RFC 5987: o nome pode ter acento, e o navegador precisa do filename*
    return Response(
        content=conteudo,
        media_type=XLSX,
        headers={
            "Content-Disposition": (
                f"attachment; filename=\"{nome.encode('ascii', 'ignore').decode()}\"; "
                f"filename*=UTF-8''{quote(nome)}"
            )
        },
    )


@router.get("/modelo-planilha", summary="Baixa a planilha-modelo")
def modelo():
    """A planilha-modelo, com o layout que a importacao le."""
    return _anexo(spreadsheet.modelo(), "modelo-fitradeoff.xlsx")


@router.post("/planilhas/previa", summary="Le a planilha sem criar nada")
async def previa(
    request: Request,
    arquivo: UploadFile | None = File(None),
    texto: str = Form(""),
    # Nao grava nada, mas le: e leitura de planilha custa processador. Sem dono,
    # qualquer pessoa sem login prenderia o servidor com ela.
    pasta: Path = Depends(acervo),
):
    """Devolve o que foi entendido da planilha, para conferencia.

    Importar e criar num passo so obriga a descobrir o erro depois do fato: a
    decisao ja existe, com a direcao trocada ou uma coluna a menos. Aqui a
    leitura acontece sem gravar nada, e quem confere e o decisor.

    Aceita arquivo ou texto colado. Colar e o caminho mais curto de todos --
    selecionar no Excel e colar --, e o texto vem tabulado, que o leitor de CSV
    ja reconhece.
    """
    if arquivo is not None:
        conteudo = await arquivo.read()
        nome = arquivo.filename or ""
    elif texto.strip():
        conteudo = texto.encode("utf-8")
        # sem extensao real: tratamos como texto separado, que e o que a area de
        # transferencia do Excel produz
        nome = "colado.csv"
    else:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "Envie um arquivo ou cole os dados da planilha.",
        )

    if len(conteudo) > MAX_BYTES:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE,
            f"São {len(conteudo) // 1024} KB; o limite é {MAX_BYTES // 1024} KB.",
        )

    # Fora do laco de eventos: a rota e assincrona, e ler a planilha aqui mesmo
    # pararia o servidor inteiro -- nao so este pedido -- ate a leitura acabar.
    try:
        async with vaga(request, pasta):
            lido = await run_in_threadpool(spreadsheet.parse, nome, conteudo)
    except spreadsheet.PlanilhaInvalida as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc

    return {
        "nome": lido.nome,
        "alternativas": lido.alternativas,
        "criterios": lido.criterios,
        "consequencias": lido.consequencias,
        "custos": lido.custos,
        "origem": arquivo.filename if arquivo is not None else "colado",
    }


@router.post("/decisoes/importar", status_code=201, summary="Cria a partir de planilha")
async def importar(
    arquivo: UploadFile = File(...),
    problematica: str = Form("escolha"),
    configuracao: str = Form("{}"),
    service: DecisionService = CALCULO,
):
    """Cria uma decisao a partir de uma planilha ``.xlsx`` ou ``.csv``.

    Perfis de sorting e orcamento de carteira nao cabem na planilha e vem no campo
    ``configuracao`` do mesmo formulario, como objeto JSON.

    Erros: 413 arquivo acima de 2 MB ou problema acima dos limites do motor; 422
    planilha ilegivel ou configuracao que nao e objeto JSON; 400 ou 409 problematica ou
    configuracao que o motor recusa.
    """
    conteudo = await arquivo.read()
    if len(conteudo) > MAX_BYTES:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE,
            f"Arquivo de {len(conteudo) // 1024} KB; o limite e "
            f"{MAX_BYTES // 1024} KB.",
        )

    # fora do laco de eventos, pelo mesmo motivo da previa; a vaga ja veio com
    # o servico
    try:
        importado = await run_in_threadpool(spreadsheet.parse, arquivo.filename or "", conteudo)
    except spreadsheet.PlanilhaInvalida as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc

    # Sorting exige perfis e as carteiras exigem orcamento; nada disso cabe na
    # planilha, que descreve o problema e nao a leitura que se quer dele. Vem
    # como campo separado do formulario, no mesmo envio.
    try:
        settings = json.loads(configuracao) if configuracao.strip() else {}
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "A configuracao enviada nao e um JSON valido.",
        ) from exc
    if not isinstance(settings, dict):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "A configuracao precisa ser um objeto.",
        )

    try:
        return await run_in_threadpool(
            service.create,
            nome=importado.nome,
            alternativas=importado.alternativas,
            criterios=importado.criterios,
            consequencias=importado.consequencias,
            problematica=problematica,
            configuracao=settings,
            custos=importado.custos,
        )
    except Exception as exc:
        raise translate(exc) from exc


@router.get("/decisoes/{decisao_id}/exportar", summary="Exporta a decisao")
def exportar(
    decisao_id: str,
    sensibilidade: bool = False,
    service: DecisionService = CALCULO,
):
    """Planilha com entrada, resultado, perguntas e trilha.

    ``sensibilidade=true`` acrescenta a analise sobre as consequencias, que
    custa tempo por rodar centenas de cenarios -- por isso nao vem por padrao.
    """
    try:
        problema = service.describe(decisao_id)
        estado = service.state(decisao_id)
        auditoria = service.explain(decisao_id)
        analise = None
        if sensibilidade and estado.get("elicitacao_iniciada"):
            analise = service.consequence_sensitivity(
                decisao_id,
                [{"criterio": c["chave"]} for c in problema["criterios"]],
                cenarios=200,
            )
    except Exception as exc:
        raise translate(exc) from exc

    seguro = "".join(c if c.isalnum() or c in " -_" else "-" for c in problema["nome"])
    return _anexo(
        spreadsheet.exportar(problema, estado, auditoria, analise),
        f"{seguro.strip() or 'decisao'}.xlsx",
    )
