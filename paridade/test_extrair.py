# -*- coding: utf-8 -*-
"""Testes do leitor da tela final do oficial.

As entradas são telas **reais**, copiadas de `resultados/oficial.json`. Ficam
fixas aqui de propósito, em vez de lidas do arquivo: o extrator tem de ser
verificável sem depender da medição que ele mesmo interpreta.

O que mais importa nestes testes não é o caminho feliz, e sim a recusa. O
extrator é o que separa "comparamos o resultado" de "achamos que comparamos":
se ele devolvesse vazio ou uma tabela pela metade ao não entender a tela, a
suíte de paridade ficaria verde sem comparar nada.

    python -m pytest paridade/test_extrair.py
"""

from __future__ import annotations

import pathlib
import sys

import pytest

RAIZ = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(RAIZ))

import extrair  # noqa: E402

ESCOLHA_ABREVIADA = (
    "A Solution has been found. | Warning | Tabular Visualization | "
    "Tabular Visualization | Alternatives\tIndice de qualidade\tCusto unitario\t"
    "Prazo de entrega\tMax Overall Value\tMin Overall Value | "
    "FA\t0.95\t10.2\t12\t1.00\t1.00 | Questions Answered: | 0 | "
    "Scaling constants boundaries graph | Exporting Options | "
    "Sensitivity Analysis | FU-T3MMM-WF1a | Results | FITradeoff.org"
)

ESCOLHA_POR_EXTENSO = (
    "A Solution has been found. | Warning | Tabular Visualization | "
    "Tabular Visualization | Alternatives\tIndice de qualidade\tCusto unitario\t"
    "Prazo de entrega\tDurabilidade\tSuporte tecnico\tMax Overall Value\t"
    "Min Overall Value | Alt 02\t0.94\t16.29\t17.18\t5.07\t7.10\t1.00\t0.90 | "
    "Questions Answered: | 10 | Scaling constants boundaries graph | "
    "Exporting Options | Sensitivity Analysis | FU-T3MMM-WF1a | Results | "
    "FITradeoff.org"
)

RANKING_ORDEM = (
    "A complete order has been found. | Warning | Hasse DiagramTabular "
    "Visualization | *The hasse diagram is being generated, please wait a few "
    "seconds. | Hasse Diagram | FU-T3MMM-WF1a | Results | FITradeoff.org | "
    "Exporting Options | Scaling constants boundaries graph | Sensitivity "
    "Analysis | Dominance Matrix"
)

RANKING_PRE_ORDEM = (
    "A complete pre-order has been found. | Warning | Hasse DiagramTabular "
    "Visualization | *The hasse diagram is being generated, please wait a few "
    "seconds. | Hasse Diagram | FU-T3MMM-WF1a | Results | FITradeoff.org | "
    "Exporting Options | Scaling constants boundaries graph | Sensitivity "
    "Analysis | Dominance Matrix"
)

SORTING = (
    "All the alternatives have been sorted into a unique category. This is the "
    "final result. | Warning | Alternatives\tCategory\tMin. Value\tMax. Value | "
    "Alt 01\tC2\t0.37\t0.43 | Alt 02\tC3\t0.96\t1 | Alt 03\tC1\t0\t0.11 | "
    "Alt 04\tC1\t0.21\t0.23 | FU-T3MMM-WF1a | C2 | C3 | C1 | Current Results | "
    "Sorted Alternatives (Global Value Graph): | Sorted Alternatives (Min. "
    "Values and Max. Values): | FITradeoff.org | Scaling constants boundaries "
    "graph | Sensitivity Analysis | Exporting Options"
)

CARTEIRA = (
    "$110.00 | $2.00 | Remaining budget: | Portfolio\tResources Utilization | "
    "[Alt 04, Alt 02, Alt 03, Alt 08]\t$108.00 | Total budget: | FU-TXMMO-WF1 | "
    "Ranking\tProjects\tCost\tCumulative Cost | 1\t[Alt 04]\t$20.00\t$20.00 | "
    "2\t[Alt 02]\t$25.00\t$45.00 | 3\t[Alt 03]\t$35.00\t$80.00 | "
    "4\t[Alt 01]\t$40.00\t$120.00 | 5\t[Alt 08]\t$28.00\t$148.00 | "
    "6\t[Alt 05]\t$30.00\t$178.00 | 7\t[Alt 06]\t$45.00\t$223.00 | "
    "8\t[Alt 07]\t$18.00\t$241.00 | Current Results | A complete order has been "
    "found. | Warning | Ranking | Recommendation | Scaling constants boundaries "
    "graph | FITradeoff.org | Exporting Options | Hasse Diagram | Sensitivity "
    "Analysis | View projects unitary costs"
)

FORNECEDORES = ["Fornecedor A", "Fornecedor B", "Fornecedor C"]
ALT_04 = ["Alt %02d" % i for i in range(1, 5)]
ALT_08 = ["Alt %02d" % i for i in range(1, 9)]
CLASSES = ["Baixa", "Media", "Alta"]


# --- escolha ----------------------------------------------------------------------


def test_le_o_vencedor_pelo_nome_cadastrado():
    assert extrair.extrai_vencedor(
        ESCOLHA_POR_EXTENSO, ["Alt %02d" % i for i in range(1, 7)]) == "Alt 02"


def test_le_o_vencedor_que_o_oficial_abreviou_nas_iniciais():
    """"Fornecedor A" volta da tela como "FA"; sem desabreviar, nada compara."""
    assert extrair.extrai_vencedor(ESCOLHA_ABREVIADA, FORNECEDORES) == "Fornecedor A"


def test_abreviacao_ambigua_e_recusada():
    """Duas alternativas com as mesmas iniciais: escolher uma seria inventar."""
    with pytest.raises(extrair.TelaIlegivel):
        extrair.extrai_vencedor(ESCOLHA_ABREVIADA, ["Fornecedor A", "Fabrica Alfa"])


def test_vencedor_recusa_tela_sem_a_tabela():
    with pytest.raises(extrair.TelaIlegivel):
        extrair.extrai_vencedor(RANKING_ORDEM, FORNECEDORES)


def test_vencedor_recusa_alternativa_que_nao_e_do_caso():
    """Tela de um caso contra as alternativas de outro: erro, não silêncio."""
    with pytest.raises(extrair.TelaIlegivel):
        extrair.extrai_vencedor(ESCOLHA_POR_EXTENSO, FORNECEDORES)


# --- ranking ----------------------------------------------------------------------


def test_distingue_ordem_completa_de_pre_ordem():
    assert extrair.extrai_desfecho_do_ranking(RANKING_ORDEM) == extrair.ORDEM_COMPLETA
    assert extrair.extrai_desfecho_do_ranking(RANKING_PRE_ORDEM) == extrair.PRE_ORDEM


def test_desfecho_recusa_tela_que_nao_anuncia_nada():
    with pytest.raises(extrair.TelaIlegivel):
        extrair.extrai_desfecho_do_ranking(SORTING)


# --- sorting ----------------------------------------------------------------------


def test_le_a_classe_de_cada_alternativa_traduzindo_as_categorias():
    assert extrair.extrai_classes(SORTING, ALT_04, CLASSES) == {
        "Alt 01": "Media", "Alt 02": "Alta", "Alt 03": "Baixa", "Alt 04": "Baixa",
    }


def test_sorting_recusa_tabela_que_nao_cobre_todas_as_alternativas():
    """O caso tem cinco alternativas e a tela classifica quatro: falha.

    É a armadilha central da suíte: um dicionário com quatro chaves compararia
    quatro alternativas e daria verde, calado sobre a quinta.
    """
    with pytest.raises(extrair.TelaIlegivel):
        extrair.extrai_classes(SORTING, ALT_04 + ["Alt 05"], CLASSES)


def test_sorting_recusa_categoria_alem_das_classes_configuradas():
    """`C3` com duas classes configuradas: a configuração não é a da medição."""
    with pytest.raises(extrair.TelaIlegivel):
        extrair.extrai_classes(SORTING, ALT_04, ["Baixa", "Alta"])


def test_sorting_recusa_tela_sem_a_tabela():
    with pytest.raises(extrair.TelaIlegivel):
        extrair.extrai_classes(RANKING_ORDEM, ALT_04, CLASSES)


# --- benefício-custo ---------------------------------------------------------------


def test_le_a_carteira_sem_confundir_com_o_ranking_de_projetos():
    """Abaixo da carteira vem `1 [Alt 04]`, que sozinho pareceria uma carteira."""
    assert extrair.extrai_carteira(CARTEIRA, ALT_08) == {
        "Alt 02", "Alt 03", "Alt 04", "Alt 08"}


def test_carteira_recusa_tela_sem_o_cabecalho():
    with pytest.raises(extrair.TelaIlegivel):
        extrair.extrai_carteira(SORTING, ALT_08)


def test_carteira_recusa_projeto_que_nao_e_do_caso():
    with pytest.raises(extrair.TelaIlegivel):
        extrair.extrai_carteira(CARTEIRA, ALT_04)
