"""Entrada nao confiavel: validacao, contencao e limites.

Cada teste aqui corresponde a um vetor que foi verificado na pratica antes de
ser corrigido, nao a uma preocupacao hipotetica.
"""

import json
import re

import numpy as np
import pytest

from conftest import ALTERNATIVAS, CONSEQUENCIAS, CRITERIOS_SPEC, make_problem
from fitradeoff import DecisionService, LimitExceeded, Limits, build_container
from fitradeoff.domain import (
    CriteriaRanking,
    HolisticJudgement,
    Preference,
    TradeoffAnswer,
    statement_from_dict,
)
from fitradeoff.repositories import (
    DecisionRecord,
    InMemoryDecisionRepository,
    JsonFileDecisionRepository,
    RecordNotFound,
)


@pytest.fixture
def service(container):
    return DecisionService(container)


# --- declaracoes vindas de fora -----------------------------------------------


def test_tradeoff_com_criterio_inexistente_e_recusado():
    """Um log de outra versao, ou adulterado, nao pode estourar la dentro."""
    problem = make_problem([[1.0, 2.0], [3.0, 4.0]])
    answer = TradeoffAnswer(criterion=99, rival=0, value=0.5, preference=Preference.FIRST)

    with pytest.raises(ValueError, match="indice 99 nao existe"):
        answer.constraints(problem, epsilon=0.0)


def test_tradeoff_com_indice_negativo_e_recusado():
    problem = make_problem([[1.0, 2.0], [3.0, 4.0]])
    with pytest.raises(ValueError, match="nao existe"):
        TradeoffAnswer(-1, 0, 0.5, Preference.FIRST).constraints(problem, 0.0)


def test_julgamento_com_alternativa_inexistente_e_recusado():
    problem = make_problem([[1.0, 2.0], [3.0, 4.0]])
    with pytest.raises(ValueError, match="nao existe"):
        HolisticJudgement(preferred=0, over=50).constraints(problem, 0.0)


def test_ordenacao_com_criterio_inexistente_e_recusada():
    problem = make_problem([[1.0, 2.0], [3.0, 4.0]])
    with pytest.raises(ValueError, match="exatamente uma vez"):
        CriteriaRanking((0, 7)).constraints(problem, 0.0)


def test_declaracao_de_tipo_desconhecido_e_recusada():
    with pytest.raises(ValueError, match="tipo desconhecido"):
        statement_from_dict({"tipo": "exec", "payload": "rm -rf"})


def test_log_adulterado_em_disco_da_erro_claro(tmp_path, clock):
    """Vetor confirmado: antes, um indice fora da faixa virava IndexError cru."""
    service = DecisionService(
        build_container(storage=tmp_path, epsilon=0.0, clock=clock)
    )
    criada = service.create("t", ALTERNATIVAS, CRITERIOS_SPEC, CONSEQUENCIAS)
    pid = criada["id"]
    service.rank_criteria(pid, ["qualidade", "custo", "prazo"])

    arquivo = tmp_path / f"{pid}.json"
    dados = json.loads(arquivo.read_text(encoding="utf-8"))
    dados["auditoria"].append(
        {
            "sequencia": 99,
            "autor": "invasor",
            "registrado_em": "2026-01-01T00:00:00+00:00",
            "declaracao": {
                "tipo": "tradeoff", "criterio": 99, "rival": 0,
                "valor": 0.5, "preferencia": "A",
            },
        }
    )
    arquivo.write_text(json.dumps(dados), encoding="utf-8")

    with pytest.raises(ValueError, match="indice 99 nao existe"):
        service.state(pid)


# --- contencao de caminho -----------------------------------------------------


@pytest.mark.parametrize(
    "perigoso",
    ["../fuga", "..", "sub/dir", "a\\b", "", "x" * 65, "arquivo.json", "a b", "a.b"],
)
def test_identificadores_perigosos_sao_recusados(tmp_path, perigoso):
    repo = JsonFileDecisionRepository(tmp_path)
    with pytest.raises(ValueError, match="Identificador invalido"):
        repo.get(perigoso)


@pytest.mark.parametrize("reservado", ["con", "nul", "aux", "com1", "prn"])
def test_nomes_reservados_do_windows_nao_abrem_dispositivo(tmp_path, reservado):
    """Casam com o padrao de identificador, mas o sufixo .json os mantem como
    caminho de arquivo comum: caem em 'nao encontrada', nao no dispositivo."""
    with pytest.raises(RecordNotFound):
        JsonFileDecisionRepository(tmp_path).get(reservado)


def test_os_dois_adaptadores_recusam_as_mesmas_entradas(tmp_path):
    """Um duble que aceita o que o real recusa esconde os bugs que importam."""
    disco = JsonFileDecisionRepository(tmp_path)
    memoria = InMemoryDecisionRepository()
    for perigoso in ("../fuga", "sub/dir", "", "x" * 65):
        with pytest.raises(ValueError):
            disco.get(perigoso)
        with pytest.raises(ValueError):
            memoria.get(perigoso)


def test_gravacao_fica_dentro_do_diretorio(tmp_path, clock):
    repo = JsonFileDecisionRepository(tmp_path)
    record = DecisionRecord(
        id="abc123", problem=make_problem([[1.0, 2.0], [3.0, 4.0]]),
        created_at=clock.now(),
    )
    repo.save(record)
    gravados = list(tmp_path.rglob("*.json"))
    assert gravados == [tmp_path / "abc123.json"]


# --- identificadores ----------------------------------------------------------


def test_identificador_tem_entropia_suficiente(service):
    """O id tambem e credencial: quem o tem le a decisao."""
    criada = service.create("t", ALTERNATIVAS, CRITERIOS_SPEC, CONSEQUENCIAS)
    assert re.fullmatch(r"[0-9a-f]{32}", criada["id"])  # 128 bits


def test_identificadores_nao_se_repetem(service):
    ids = {
        service.create("t", ALTERNATIVAS, CRITERIOS_SPEC, CONSEQUENCIAS)["id"]
        for _ in range(20)
    }
    assert len(ids) == 20


# --- limites de tamanho -------------------------------------------------------


def test_alternativas_demais_sao_recusadas(service):
    """Vetor confirmado: o custo cresce com o quadrado do numero de alternativas."""
    n = service.limits.max_alternatives + 1
    with pytest.raises(LimitExceeded, match="excedem o limite"):
        service.create(
            "dos", [f"a{i}" for i in range(n)], CRITERIOS_SPEC,
            np.zeros((n, 3)).tolist(),
        )


def test_criterios_demais_sao_recusados(service):
    n = service.limits.max_criteria + 1
    criterios = [{"chave": f"c{j}", "nome": f"C{j}"} for j in range(n)]
    with pytest.raises(LimitExceeded, match="criterios excedem"):
        service.create("dos", ["a", "b"], criterios, np.zeros((2, n)).tolist())


def test_nome_gigante_e_recusado(service):
    with pytest.raises(LimitExceeded, match="caracteres"):
        service.create("x" * 5000, ALTERNATIVAS, CRITERIOS_SPEC, CONSEQUENCIAS)


def test_niveis_demais_sao_recusados(service):
    criterios = [
        {"chave": "a", "nome": "A", "niveis": list(range(100))},
        {"chave": "b", "nome": "B"},
    ]
    with pytest.raises(LimitExceeded, match="niveis"):
        service.create("x", ["p", "q"], criterios, [[0, 1], [1, 2]])


def test_amostras_demais_no_portfolio_sao_recusadas(service):
    with pytest.raises(LimitExceeded, match="amostras excedem"):
        service.create(
            "x", ALTERNATIVAS, CRITERIOS_SPEC, CONSEQUENCIAS,
            problematica="portfolio",
            configuracao={"orcamento": 10.0, "amostras": 10**6},
            custos=[1.0, 2.0, 3.0, 4.0],
        )


def test_limiares_demais_na_sensibilidade_sao_recusados(service):
    criada = service.create("x", ALTERNATIVAS, CRITERIOS_SPEC, CONSEQUENCIAS)
    service.rank_criteria(criada["id"], ["qualidade", "custo", "prazo"])
    excesso = [0.01 * i for i in range(service.limits.max_sensitivity_points + 1)]
    with pytest.raises(LimitExceeded, match="limiares excedem"):
        service.sensitivity(criada["id"], excesso)


def test_limites_sao_injetaveis(container):
    """Um uso em lote eleva o teto conscientemente, em vez de descobri-lo travando."""
    apertado = DecisionService(container, limits=Limits(max_alternatives=2))
    with pytest.raises(LimitExceeded):
        apertado.create("x", ALTERNATIVAS, CRITERIOS_SPEC, CONSEQUENCIAS)

    folgado = DecisionService(container, limits=Limits(max_alternatives=1000))
    assert "erro" not in folgado.create(
        "x", ALTERNATIVAS, CRITERIOS_SPEC, CONSEQUENCIAS
    )


# --- valores numericos --------------------------------------------------------


def test_consequencias_nao_finitas_sao_recusadas(service):
    with pytest.raises(ValueError, match="nao finitos"):
        service.create(
            "x", ["a", "b"],
            [{"chave": "c0", "nome": "C0"}, {"chave": "c1", "nome": "C1"}],
            [[float("nan"), 1.0], [2.0, float("inf")]],
        )


def test_autoria_e_rotulo_nao_prova(service):
    """O motor aceita o campo, mas a trilha diz que ele nao e autenticado."""
    criada = service.create("x", ALTERNATIVAS, CRITERIOS_SPEC, CONSEQUENCIAS)
    service.rank_criteria(criada["id"], ["qualidade", "custo", "prazo"])
    trilha = service.explain(criada["id"])
    assert "nao autenticado" in trilha["nota_sobre_autoria"]
