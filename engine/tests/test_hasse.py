"""O que o diagrama de Hasse recebe do ranking.

O desenho segue o do sistema de referencia: setas pretas para dominancia vinda
da decomposicao, vermelhas para a declarada numa avaliacao holistica, linhas
cinzentas sem seta para indiferenca, e posicoes do ranking separadas por linhas
tracejadas. Estes testes cobrem os dados de cada uma dessas pecas.
"""

import pathlib

import pytest

from fitradeoff import DecisionService, build_container

CRITERIOS = [
    {"chave": "x", "nome": "X", "direcao": "max"},
    {"chave": "y", "nome": "Y", "direcao": "max"},
]


@pytest.fixture
def service(tmp_path: pathlib.Path):
    return DecisionService(build_container(storage=tmp_path))


def analise(service, consequencias, nomes, limiar=None, julgamentos=()):
    criada = service.create(
        nome="h", alternativas=nomes, criterios=CRITERIOS, consequencias=consequencias,
        problematica="ranking", limiar_de_equivalencia=limiar,
    )
    estado = service.rank_criteria(criada["id"], ["x", "y"])
    for preferida, sobre in julgamentos:
        estado = service.judge(criada["id"], preferida, sobre)
    return estado["analise"]


def test_empate_vira_indiferenca_e_nao_colapsa_as_camadas(service):
    """A ~ B > C > D. Antes, o empate fazia as quatro cairem numa camada so,
    o par virar duas setas opostas e o C ficar sem nenhuma seta chegando.

    A e B se cruzam de verdade: A vence quando o peso de X domina, B quando os
    pesos se igualam, e cada uma supera a outra por menos que o limiar. Um par
    em que uma e melhor em todo peso nao empata, mesmo dentro do limiar -- o
    oficial o ordena (ver test_problematics).
    """
    an = analise(service, [[100, 96], [98, 100], [50, 50], [10, 10]],
                 ["A", "B", "C", "D"], limiar=0.05)
    assert an["niveis"] == [["A", "B"], ["C"], ["D"]]
    assert {(a["de"], a["para"]) for a in an["dominancia_direta"]} == {
        ("A", "C"), ("B", "C"), ("C", "D"),
    }
    assert an["indiferencas"] == [{"a": "A", "b": "B"}]


def test_posicoes_sao_os_cortes_em_que_tudo_acima_supera_tudo_abaixo(service):
    an = analise(service, [[100, 96], [98, 100], [50, 50], [10, 10]],
                 ["A", "B", "C", "D"], limiar=0.05)
    assert an["posicoes"] == [["A", "B"], ["C"], ["D"]]


def test_sem_corte_limpo_fica_tudo_numa_posicao(service):
    """Ninguem supera todos, e o oficial mostra 'Position 1' com todas as
    alternativas -- ainda que haja dominancia la dentro. (Caso achado por busca:
    A e D incomparaveis entre si e com parte do resto.)"""
    an = analise(service, [[30, 100], [20, 80], [60, 0], [100, 10]], ["A", "B", "C", "D"])
    assert len(an["posicoes"]) == 1
    assert sorted(an["posicoes"][0]) == ["A", "B", "C", "D"]
    assert {(a["de"], a["para"]) for a in an["dominancia_direta"]} == {
        ("A", "B"), ("D", "B"), ("D", "C"),
    }


def test_ranking_completo_tem_uma_alternativa_por_posicao(service):
    an = analise(service, [[100, 100], [60, 60], [10, 10]], ["A", "B", "C"])
    assert an["posicoes"] == [["A"], ["B"], ["C"]]
    assert an["indiferencas"] == []


def test_seta_declarada_em_avaliacao_holistica_vem_marcada(service):
    # A sobre D so existe porque o decisor disse; com ela a ordem fecha, A > D > B > C
    an = analise(service, [[30, 100], [20, 80], [60, 0], [100, 10]], ["A", "B", "C", "D"],
                 julgamentos=[("A", "D")])
    origem = {(a["de"], a["para"]): a["origem"] for a in an["dominancia_direta"]}
    assert origem[("A", "D")] == "holistica"
    assert origem[("D", "B")] == "decomposicao"
    assert an["posicoes"] == [["A"], ["D"], ["B"], ["C"]]
