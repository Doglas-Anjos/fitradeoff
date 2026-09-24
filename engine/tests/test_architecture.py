"""Auditoria da propria arquitetura.

Uma arquitetura em camadas que ninguem verifica vira, com o tempo, um grafo
qualquer. Estes testes falham no momento em que alguem inverte uma dependencia,
antes que a inversao vire habito.

Regra: as dependencias apontam sempre para dentro. O dominio nao conhece
ninguem; nenhuma camada interna importa uma externa; solver concreto so aparece
nos adaptadores e na composicao.
"""

import ast
import pathlib

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[1] / "src" / "fitradeoff"

# Da mais interna para a mais externa. Cada camada so pode importar as de indice
# menor -- e a si mesma.
LAYERS = [
    "domain",
    "solvers",
    "problematics",
    "elicitation",
    "repositories",
    "application",
]


def modules_of(layer: str) -> list[pathlib.Path]:
    return sorted((ROOT / layer).glob("*.py"))


SOLVER_PACKAGES = {"scipy", "highspy", "pulp", "ortools", "cvxpy"}


def external_imports(path: pathlib.Path) -> set[str]:
    """Pacotes de terceiros que este modulo importa, pela raiz do nome."""
    tree = ast.parse(path.read_text(encoding="utf-8"))
    found = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and not node.level and node.module:
            found.add(node.module.split(".")[0])
        elif isinstance(node, ast.Import):
            for alias in node.names:
                found.add(alias.name.split(".")[0])
    return found


def internal_imports(path: pathlib.Path) -> set[str]:
    """Camadas do proprio pacote que este modulo importa."""
    tree = ast.parse(path.read_text(encoding="utf-8"))
    found = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.level and node.module:
            # '..domain.problem' vira 'domain'; '.base' fica na propria camada
            found.add(node.module.split(".")[0])
        elif isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name.startswith("fitradeoff."):
                    found.add(alias.name.split(".")[1])
    return {name for name in found if name in LAYERS}


@pytest.mark.parametrize("layer", LAYERS)
def test_camada_so_depende_de_camadas_mais_internas(layer):
    permitidas = set(LAYERS[: LAYERS.index(layer) + 1])
    for module in modules_of(layer):
        violacoes = internal_imports(module) - permitidas
        assert not violacoes, (
            f"{layer}/{module.name} importa {sorted(violacoes)}, que esta "
            f"em camada mais externa."
        )


def test_dominio_nao_conhece_ninguem():
    for module in modules_of("domain"):
        assert internal_imports(module) <= {"domain"}, (
            f"domain/{module.name} deixou de ser independente."
        )


def test_dominio_nao_importa_solver_algum():
    """O dominio pode usar numpy como estrutura de dados, mas nunca um solver."""
    for module in modules_of("domain"):
        violacoes = external_imports(module) & SOLVER_PACKAGES
        assert not violacoes, f"domain/{module.name} importa {sorted(violacoes)}."


def test_scipy_so_aparece_no_adaptador():
    """Trocar de solver deve ser trocar um arquivo, nao caçar imports.

    Tres lugares podem nomear scipy, e nenhum deles e regra de negocio: o
    adaptador que o encapsula, o ``__init__`` que o reexporta, e o container,
    que e justamente onde a escolha de implementacao e feita.
    """
    permitidos = {
        ROOT / "solvers" / "scipy_solver.py",
        ROOT / "solvers" / "__init__.py",
        ROOT / "container.py",
    }
    for module in ROOT.rglob("*.py"):
        if module in permitidos:
            continue
        # checa os imports de verdade, nao o texto: citar o solver numa
        # docstring para explicar a decisao e justamente o que queremos
        for imported in external_imports(module):
            assert imported not in SOLVER_PACKAGES, (
                f"{module.relative_to(ROOT)} importa {imported}; o adaptador "
                f"e o container deveriam ser os unicos lugares."
            )


def test_problematicas_nao_conhecem_persistencia():
    """Uma problematica avalia um espaco de pesos; nao sabe de onde ele veio."""
    for module in modules_of("problematics"):
        assert "repositories" not in internal_imports(module)


def test_composicao_cabe_num_arquivo_so():
    """A raiz do wiring e o unico lugar que instancia adaptadores concretos."""
    container = (ROOT / "container.py").read_text(encoding="utf-8")
    assert "ScipyLinearSolver" in container
    assert "JsonFileDecisionRepository" in container

    for module in ROOT.rglob("*.py"):
        if module.name in ("container.py", "__init__.py"):
            continue
        if module.parent.name in ("solvers", "repositories"):
            continue
        source = module.read_text(encoding="utf-8")
        assert "ScipyLinearSolver(" not in source, (
            f"{module.relative_to(ROOT)} instancia um solver concreto; isso "
            f"pertence ao container."
        )


def test_toda_problematica_registrada_declara_chave_e_rotulo():
    from fitradeoff.problematics import default_registry

    registry = default_registry()
    assert len(registry.keys) == 4
    for key, label in registry.describe().items():
        assert key and label, f"Problematica '{key}' sem rotulo."


# --- DRY: duplicacoes que ja existiram e nao devem voltar ---------------------


def test_problematicas_nao_repetem_o_tratamento_de_inconsistencia():
    """O template em base.py trata isso uma vez. Cada estrategia que refizer o
    teste estara duplicando -- e podendo divergir na mensagem."""
    for module in modules_of("problematics"):
        if module.name in ("base.py", "evaluator.py"):
            continue
        source = module.read_text(encoding="utf-8")
        assert "is_consistent" not in source, (
            f"problematics/{module.name} refaz o teste de consistencia; "
            f"o template de Problematic.analyse ja o faz."
        )


def test_toda_problematica_implementa_o_template():
    for module in modules_of("problematics"):
        if module.name in ("base.py", "evaluator.py", "registry.py", "__init__.py"):
            continue
        source = module.read_text(encoding="utf-8")
        assert "def _analyse(" in source, f"problematics/{module.name} sem _analyse"
        assert "def analyse(" not in source, (
            f"problematics/{module.name} sobrescreve analyse e escapa do template."
        )


def test_formatacao_de_numero_existe_num_lugar_so():
    """A mesma consequencia precisa sair identica no enunciado e na auditoria."""
    achados = [
        module.relative_to(ROOT)
        for module in ROOT.rglob("*.py")
        if module.name != "formatting.py"
        and ":.4g}" in module.read_text(encoding="utf-8")
    ]
    assert not achados, f"formatacao duplicada em {achados}"


def test_persistencia_do_log_passa_por_um_metodo_so():
    """Mutar o registro e salvar em cada caso de uso convida ao esquecimento."""
    source = (ROOT / "application" / "service.py").read_text(encoding="utf-8")
    assert source.count("record.log = ") == 1, (
        "a gravacao do log deve ficar centralizada em _commit"
    )


# --- DTOs ---------------------------------------------------------------------


def test_views_nao_montam_dicionarios_a_mao():
    """O formato de saida e declarado em dto.py, nao improvisado em views.py."""
    source = (ROOT / "application" / "views.py").read_text(encoding="utf-8")
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if not isinstance(node, ast.FunctionDef):
            continue
        for retorno in [n for n in ast.walk(node) if isinstance(n, ast.Return)]:
            assert not isinstance(retorno.value, ast.Dict) or node.name.startswith("_"), (
                f"views.{node.name} devolve dicionario literal; use um DTO."
            )


def test_todo_dto_sabe_se_serializar():
    from fitradeoff.application import dto as dto_module

    publicos = [
        obj
        for name, obj in vars(dto_module).items()
        if name.endswith("DTO") and isinstance(obj, type)
    ]
    assert len(publicos) >= 8
    for classe in publicos:
        assert hasattr(classe, "to_dict"), f"{classe.__name__} sem to_dict"
        assert classe.__dataclass_params__.frozen, f"{classe.__name__} nao e imutavel"
