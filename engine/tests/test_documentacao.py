"""O padrao de documentacao, na parte que da para conferir sem ler: quem precisa
de docstring tem uma.

As regras estao em PADRAO_DE_DOCUMENTACAO.md, na raiz. Este teste cobre a
presenca; o conteudo (a fonte da regra, a exatidao, o custo) e conferido na
revisao do PR. Varre o back-end inteiro -- motor, API e servidor MCP --, porque
um auditor chega por qualquer uma das tres portas.
"""

import ast
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parents[2]
PACOTES = [
    RAIZ / "engine" / "src" / "fitradeoff",
    RAIZ / "api" / "src" / "fitradeoff_api",
    RAIZ / "mcp_server" / "src" / "fitradeoff_mcp",
]

#: Acima deste tamanho de corpo, funcao ou metodo publico precisa de docstring.
LINHAS_DISPENSADAS = 5

#: Serializacao direta de campos: a docstring seria o nome repetido.
NOMES_DISPENSADOS = {"to_dict"}


def _linhas_do_corpo(no: ast.AST) -> int:
    return no.end_lineno - no.body[0].lineno + 1


def _decoradores(no: ast.AST) -> list[str]:
    return [ast.unparse(d) for d in getattr(no, "decorator_list", [])]


def _e_rota(no: ast.AST) -> bool:
    """Decorada com ``@router.get(...)``, ``@app.post(...)`` e afins."""
    return any(
        d.split("(")[0].split(".")[-1] in {"get", "post", "put", "patch", "delete"}
        for d in _decoradores(no)
    )


def _e_ferramenta_mcp(no: ast.AST) -> bool:
    """A descricao da ferramenta vai no decorador, que ja a exige."""
    return any(d.startswith("tool(") or d.startswith("server.tool(") for d in _decoradores(no))


def _classes_do_pacote(pacote: Path) -> dict[str, tuple[list[str], set[str]]]:
    """Nome da classe -> (nomes das bases, metodos com docstring)."""
    classes: dict[str, tuple[list[str], set[str]]] = {}
    for arquivo in pacote.rglob("*.py"):
        for no in ast.walk(ast.parse(arquivo.read_text(encoding="utf-8"))):
            if isinstance(no, ast.ClassDef):
                bases = [ast.unparse(b).split(".")[-1] for b in no.bases]
                documentados = {
                    m.name
                    for m in no.body
                    if isinstance(m, (ast.FunctionDef, ast.AsyncFunctionDef))
                    and ast.get_docstring(m)
                }
                classes[no.name] = (bases, documentados)
    return classes


def _documentado_na_base(classe: str, metodo: str, classes, visitadas=None) -> bool:
    """A sobrescrita herda a docstring da base, onde o contrato mora."""
    visitadas = visitadas or set()
    for base in classes.get(classe, ([], set()))[0]:
        if base in visitadas or base not in classes:
            continue
        visitadas.add(base)
        if metodo in classes[base][1] or _documentado_na_base(base, metodo, classes, visitadas):
            return True
    return False


def _faltas(pacote: Path) -> list[str]:
    classes = _classes_do_pacote(pacote)
    faltas = []
    for arquivo in sorted(pacote.rglob("*.py")):
        relativo = arquivo.relative_to(RAIZ).as_posix()
        arvore = ast.parse(arquivo.read_text(encoding="utf-8"))
        if not ast.get_docstring(arvore):
            faltas.append(f"{relativo}: modulo sem docstring")

        def visita(no, classe=None):
            for filho in ast.iter_child_nodes(no):
                if isinstance(filho, ast.ClassDef):
                    if not filho.name.startswith("_") and not ast.get_docstring(filho):
                        faltas.append(f"{relativo}:{filho.lineno}: classe {filho.name}")
                    visita(filho, filho.name)
                elif isinstance(filho, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    # funcoes aninhadas nao sao superficie publica: nao se desce nelas
                    if ast.get_docstring(filho) or _e_ferramenta_mcp(filho):
                        continue
                    if _e_rota(filho):
                        faltas.append(f"{relativo}:{filho.lineno}: rota {filho.name}")
                        continue
                    if filho.name.startswith("_") or filho.name in NOMES_DISPENSADOS:
                        continue
                    if _linhas_do_corpo(filho) <= LINHAS_DISPENSADAS:
                        continue
                    if classe and _documentado_na_base(classe, filho.name, classes):
                        continue
                    onde = f"{classe}.{filho.name}" if classe else filho.name
                    faltas.append(f"{relativo}:{filho.lineno}: {onde}")

        visita(arvore)
    return faltas


@pytest.mark.parametrize("pacote", [p for p in PACOTES if p.exists()], ids=lambda p: p.name)
def test_quem_precisa_de_docstring_tem_uma(pacote):
    faltas = _faltas(pacote)
    assert not faltas, (
        f"{len(faltas)} item(ns) sem a docstring que PADRAO_DE_DOCUMENTACAO.md exige:\n  "
        + "\n  ".join(faltas)
    )
