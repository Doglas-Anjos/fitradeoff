"""Mapa de conflito: onde as alternativas disputam, antes de qualquer peso."""

import pytest

from fitradeoff import DecisionService

CRITERIOS = [
    {"chave": "preco", "nome": "Preco", "direcao": "min"},
    {"chave": "espaco", "nome": "Espaco", "direcao": "max"},
    {"chave": "ano", "nome": "Ano", "direcao": "max"},
]


@pytest.fixture
def service(container):
    return DecisionService(container)


def test_dominada_nao_e_lider_amplo(service):
    """Ela empata no topo com quem a domina; o aviso sobre ela e `dominadas`."""
    criada = service.create(
        nome="Com copia pior",
        alternativas=["Forte", "Copia cara", "Barato"],
        criterios=CRITERIOS,
        consequencias=[[20, 510, 2013], [26, 510, 2013], [15, 420, 2008]],
    )
    assert [d["alternativa"] for d in criada["dominadas"]] == ["Copia cara"]
    assert [l["alternativa"] for l in criada["conflito"]["lider_amplo"]] == ["Forte"]


def test_carteira_nao_recebe_mapa(service):
    """No orcamento o custo entra na conta: liderar criterio nao diz quem entra."""
    criada = service.create(
        nome="Carteira",
        alternativas=["A", "B", "C"],
        criterios=CRITERIOS,
        consequencias=[[20, 510, 2013], [26, 480, 2011], [15, 420, 2008]],
        problematica="portfolio",
        configuracao={"orcamento": 2},
        custos=[1, 1, 1],
    )
    assert "conflito" not in criada
    assert "conflito" not in service.describe(criada["id"])


def test_poucos_criterios_nao_acusam_lider(service):
    """Com dois criterios, liderar os dois e dominar -- nao ha o que avisar a mais."""
    criada = service.create(
        nome="Dois criterios",
        alternativas=["A", "B", "C"],
        criterios=CRITERIOS[:2],
        consequencias=[[20, 510], [26, 480], [15, 420]],
    )
    assert criada["conflito"]["lider_amplo"] == []


def test_vetada_nao_e_lider_amplo(service):
    """Abaixo do veto, o valor global e penalizado: liderar o resto nao diz que
    ela vence, e o aviso de `lider_amplo` enganaria o decisor."""
    matriz = [[15, 510, 2005], [20, 480, 2013], [26, 420, 2011]]
    sem_veto = service.create(
        nome="Sem veto", alternativas=["Forte", "B", "C"],
        criterios=CRITERIOS, consequencias=matriz,
    )
    assert [l["alternativa"] for l in sem_veto["conflito"]["lider_amplo"]] == ["Forte"]

    com_veto = service.create(
        nome="Com veto", alternativas=["Forte", "B", "C"],
        criterios=[*CRITERIOS[:2], {**CRITERIOS[2], "veto_inferior": 2010}],
        consequencias=matriz,
    )
    assert com_veto["conflito"]["lider_amplo"] == []
