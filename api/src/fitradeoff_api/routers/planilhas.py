"""Rotas de planilha: modelo, importacao e exportacao."""

from __future__ import annotations

from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from fitradeoff import DecisionService

from .. import spreadsheet
from ..deps import get_service, translate

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
    return _anexo(spreadsheet.modelo(), "modelo-fitradeoff.xlsx")


@router.post("/decisoes/importar", status_code=201, summary="Cria a partir de planilha")
async def importar(
    arquivo: UploadFile = File(...),
    problematica: str = Form("escolha"),
    service: DecisionService = Depends(get_service),
):
    conteudo = await arquivo.read()
    if len(conteudo) > MAX_BYTES:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE,
            f"Arquivo de {len(conteudo) // 1024} KB; o limite e "
            f"{MAX_BYTES // 1024} KB.",
        )

    try:
        importado = spreadsheet.parse(arquivo.filename or "", conteudo)
    except spreadsheet.PlanilhaInvalida as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc

    try:
        return service.create(
            nome=importado.nome,
            alternativas=importado.alternativas,
            criterios=importado.criterios,
            consequencias=importado.consequencias,
            problematica=problematica,
            custos=importado.custos,
        )
    except Exception as exc:
        raise translate(exc) from exc


@router.get("/decisoes/{decisao_id}/exportar", summary="Exporta a decisao")
def exportar(decisao_id: str, service: DecisionService = Depends(get_service)):
    try:
        problema = service.describe(decisao_id)
        estado = service.state(decisao_id)
        auditoria = service.explain(decisao_id)
    except Exception as exc:
        raise translate(exc) from exc

    seguro = "".join(c if c.isalnum() or c in " -_" else "-" for c in problema["nome"])
    return _anexo(
        spreadsheet.exportar(problema, estado, auditoria),
        f"{seguro.strip() or 'decisao'}.xlsx",
    )
