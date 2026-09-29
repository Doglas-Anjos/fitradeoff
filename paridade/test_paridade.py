# -*- coding: utf-8 -*-
"""Trava a paridade medida contra o sistema oficial.

Os testes do motor verificam cada regra descoberta na comparação — a pergunta de
abertura, o piso propagado, o empate que fecha a pré-ordem, o ε/2 do sorting.
Nenhum deles verifica o que a comparação **conclui**: que rodar 17 problemas nos
dois sistemas dá o mesmo número de perguntas em 14 deles.

Sem este arquivo, uma mudança no motor podia alterar essa contagem em silêncio, e
o relatório e a tela de paridade passariam a afirmar um número que já não é
verdade. Aqui a afirmação vira asserção.

Contagem de perguntas, porém, não é resultado. Uma mudança podia manter os
números e trocar o vencedor, o tipo de desfecho, a classe de uma alternativa ou
a carteira. Por isso a segunda metade do arquivo compara o **resultado**, lido
por `extrair.py` da tela final que o oficial deixou gravada. Nos 16 casos que
ele completa o resultado bate em todos — inclusive nos dois em que o número de
perguntas diverge, que é o que dá a essas duas divergências o caráter de
diferença de processo e não de conclusão.

Roda sem rede e sem conta: o lado oficial é o que ficou gravado em
`resultados/oficial.json`, medido com `comparar.py oficial`. Comparar contra o
arquivo é o ponto — é ele que a tela exibe e que o relatório cita.

    python -m pytest paridade/
"""

from __future__ import annotations

import json
import pathlib
import sys

import pytest

RAIZ = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(RAIZ))
sys.path.insert(0, str(RAIZ.parent / "engine" / "src"))

import extrair  # noqa: E402
from casos import CASOS, POR_CHAVE  # noqa: E402
from comparar import roda_nosso  # noqa: E402

RESULTADOS = RAIZ / "resultados"

#: Casos em que os dois sistemas ainda divergem, com o vão documentado.
#: Não são falhas escondidas: estão no relatório e na tela. Ficam aqui para que
#: **fechar** um deles também quebre o teste — e obrigue a atualizar os dois.
DIVERGENCIAS: dict[str, tuple[int, int]] = {
    # Vazio desde 28/09/2026. As duas que havia fecharam por medição, não por
    # ajuste de número:
    #
    # - `ranking-20` (21 contra 22): o oficial abandona o par cujo critério
    #   rival já não pode pesar mais que um valor desprezível -- ver
    #   `PESO_DESPREZIVEL` em `engine/.../elicitation/selectors.py`;
    # - `bc-20` (17 contra 11): o oficial só encerra quando a ORDEM das razões
    #   benefício/custo fecha, par a par, e não quando a carteira fica única --
    #   ver o cabeçalho de `engine/.../problematics/benefit_cost.py`.
    #
    # Uma divergência nova entra aqui, nomeada e com o que se sabe dela.
}

#: O oficial não completa com matriz degenerada: faixa zero em todo critério.
NAO_COMPLETA = {"escolha-empate"}


@pytest.fixture(scope="module")
def oficial():
    caminho = RESULTADOS / "oficial.json"
    if not caminho.exists():
        pytest.skip("sem resultados/oficial.json; rode `comparar.py oficial`")
    return json.loads(caminho.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def nosso():
    """Roda o nosso motor agora, e não lê o gravado: é o que se quer verificar."""
    return {caso["chave"]: roda_nosso(caso) for caso in CASOS}


def _passos(registro):
    return registro["steps_ordenacao"], registro["steps_tradeoff"]


@pytest.mark.parametrize("chave", sorted(
    c["chave"] for c in CASOS
    if c["chave"] not in DIVERGENCIAS and c["chave"] not in NAO_COMPLETA
))
def test_mesmo_numero_de_perguntas_do_oficial(chave, oficial, nosso):
    """As duas fases, ordenação e tradeoff, com a mesma contagem dos dois lados."""
    registro = oficial.get(chave)
    assert registro and not registro.get("erro"), (
        "%s não tem medição do oficial; refaça `comparar.py oficial`" % chave
    )
    assert _passos(nosso[chave]) == _passos(registro)


@pytest.mark.parametrize("chave", sorted(DIVERGENCIAS))
def test_divergencia_conhecida_nao_piora(chave, oficial, nosso):
    """O vão documentado continua o mesmo — nem cresce, nem fecha sem aviso.

    Fechar é bom e quebra este teste de propósito: quem fechar precisa tirar o
    caso de `DIVERGENCIAS` e corrigir o relatório e a tela, senão os três passam
    a dizer coisas diferentes.
    """
    esperado_oficial, esperado_nosso = DIVERGENCIAS[chave]
    assert _passos(oficial[chave])[1] == esperado_oficial
    assert _passos(nosso[chave])[1] == esperado_nosso


@pytest.mark.parametrize("chave", sorted(NAO_COMPLETA))
def test_respondemos_onde_o_oficial_trava(chave, oficial, nosso):
    """Matriz degenerada: ele não completa, nós concluímos."""
    assert oficial[chave].get("erro"), (
        "%s passou a completar no oficial; a afirmação do relatório mudou" % chave
    )
    assert nosso[chave]["resumo"]


# --- o resultado, e não só o que ele custou em perguntas ---------------------------
#
# Não há divergência de resultado conhecida: nos 16 casos que o oficial completa
# os dois sistemas chegam ao mesmo lugar. Se um dia aparecer uma, ela se declara
# aqui como `DIVERGENCIAS` faz — nomeada, com o que se sabe dela. Afrouxar a
# asserção para acomodá-la devolveria o buraco que esta seção veio fechar.

#: Problemáticas cujo resultado é comparado abaixo. É inventário, conferido por
#: `test_toda_problematica_medida_tem_o_resultado_travado`.
RESULTADO_TRAVADO = {"escolha", "ranking", "sorting", "beneficio_custo"}


def _chaves(modulo):
    return sorted(c["chave"] for c in CASOS
                  if c["modulo"] == modulo and c["chave"] not in NAO_COMPLETA)


def _tela_final(chave, oficial):
    """O caso e a tela que o oficial deixou, conferida antes de ser lida.

    Medição faltando é falha, e não skip: um `oficial.json` incompleto faria as
    comparações de resultado sumirem sem que a suíte mudasse de cor.
    """
    registro = oficial.get(chave)
    assert registro and not registro.get("erro"), (
        "%s não tem medição do oficial; refaça `comparar.py oficial`" % chave
    )
    tela = registro.get("tela_final")
    assert tela, (
        "%s foi medido sem guardar a tela final; refaça `comparar.py oficial`" % chave
    )
    return POR_CHAVE[chave], tela


def _desfecho_nosso(analise):
    """Ordem completa é cada nível do Hasse com uma alternativa só.

    Sai dos níveis e não do `resumo`, que é texto escrito para o decisor ler e
    pode ser reformulado sem que o desfecho mude.
    """
    return (extrair.ORDEM_COMPLETA
            if all(len(nivel) == 1 for nivel in analise["niveis"])
            else extrair.PRE_ORDEM)


@pytest.mark.parametrize("chave", _chaves("escolha"))
def test_mesmo_vencedor_do_oficial(chave, oficial, nosso):
    """A recomendação aponta a mesma alternativa dos dois lados."""
    caso, tela = _tela_final(chave, oficial)
    assert nosso[chave]["analise"]["recomendacao"] == extrair.extrai_vencedor(
        tela, caso["alternativas"])


@pytest.mark.parametrize("chave", _chaves("ranking"))
def test_mesmo_tipo_de_desfecho_no_ranking(chave, oficial, nosso):
    """Ordem completa dos dois lados, ou pré-ordem dos dois.

    A ordem em si não dá para comparar: o oficial a entrega como diagrama de
    Hasse desenhado, e a tela não a escreve em lugar nenhum. O tipo de desfecho
    é o que sobra — e não é pouco, porque é ele que muda quando o limiar de
    equivalência passa a valer ou deixa de valer.
    """
    _, tela = _tela_final(chave, oficial)
    assert _desfecho_nosso(nosso[chave]["analise"]) == \
        extrair.extrai_desfecho_do_ranking(tela)


@pytest.mark.parametrize("chave", _chaves("sorting"))
def test_mesma_classe_para_cada_alternativa(chave, oficial, nosso):
    """Alternativa por alternativa, e não "quantas ficaram em cada classe".

    Comparar o total por classe deixaria passar uma troca entre duas.
    """
    caso, tela = _tela_final(chave, oficial)
    delas = extrair.extrai_classes(tela, caso["alternativas"],
                                   caso["configuracao"]["classes"])
    alocacao = nosso[chave]["analise"]["alocacao"]
    for alternativa in caso["alternativas"]:
        possiveis = alocacao[alternativa]["classes_possiveis"]
        # lista de um elemento: o oficial só encerra com a alocação única, e
        # ficar com duas classes possíveis também é divergir dele
        assert possiveis == [delas[alternativa]], (
            "%s: o oficial fecha em %s, nós em %s"
            % (alternativa, delas[alternativa], possiveis)
        )


@pytest.mark.parametrize("chave", _chaves("beneficio_custo"))
def test_mesma_carteira_do_oficial(chave, oficial, nosso):
    """O mesmo conjunto de projetos; a ordem de exibição difere e não conta.

    Vale para `bc-20`, onde ele faz seis perguntas a mais: a carteira sai igual
    entre os 2²⁰ subconjuntos possíveis. Era o que sustentava a divergência
    declarada acima, conferido à mão uma vez; aqui passa a ser verificado.
    """
    caso, tela = _tela_final(chave, oficial)
    nossa = nosso[chave]["analise"]["carteira_mais_frequente"]["projetos"]
    assert set(nossa) == extrair.extrai_carteira(tela, caso["alternativas"])


def test_toda_problematica_medida_tem_o_resultado_travado():
    """Problemática nova entra comparando resultado, ou este teste avisa.

    Um caso de `portfolio` acrescentado a `casos.py` passaria a ter as
    perguntas contadas e o resultado ignorado, com a suíte verde: é o mesmo
    buraco que esta seção veio fechar, um nível acima. A segunda asserção pega
    o outro lado do mesmo risco — parametrização vazia gera zero testes, e zero
    testes passam.
    """
    medidas = {c["modulo"] for c in CASOS if c["chave"] not in NAO_COMPLETA}
    assert medidas <= RESULTADO_TRAVADO, (
        "sem comparação de resultado: %s" % sorted(medidas - RESULTADO_TRAVADO)
    )
    for modulo in sorted(RESULTADO_TRAVADO):
        assert _chaves(modulo), "nenhum caso de %s para comparar" % modulo


def test_o_placar_do_relatorio_confere(oficial, nosso):
    """O número que a tela e o relatório exibem sai desta mesma contagem."""
    comparaveis = [c["chave"] for c in CASOS
                   if not oficial.get(c["chave"], {}).get("erro")]
    batem = [k for k in comparaveis if _passos(nosso[k]) == _passos(oficial[k])]
    assert len(batem) == len(comparaveis) - len(DIVERGENCIAS)
    assert len(comparaveis) == len(CASOS) - len(NAO_COMPLETA)


def test_a_tela_mostra_o_que_foi_medido():
    """`web/lib/paridade.ts` é gerado: não pode ficar para trás do JSON."""
    gerado = RAIZ.parent / "web" / "lib" / "paridade.ts"
    if not gerado.exists():
        pytest.skip("a tela de paridade ainda não foi gerada")
    texto = gerado.read_text(encoding="utf-8")
    for caso in CASOS:
        assert '"chave": "%s"' % caso["chave"] in texto, (
            "%s não está na tela; rode `gerar_web.py`" % caso["chave"]
        )


# --- uma decisão inteira com curva de valor não linear -------------------------
#
# Medido no oficial em 28/09/2026: o caso `ranking-cruzado` com a curva de cada
# critério elicitada (Qualidade ILO-ILO-ILO-IUP-Ind, Custo IUP-IUP-IUP-ILO-Ind,
# Prazo ILO-IUP-Ind-Ind-Ind), e depois ordenação e decomposição respondendo
# sempre A. Os pontos abaixo são os que a nossa regra dá para essas respostas --
# conferidos contra os gráficos finais dele (0,72 e 0,89; 14,59 e 10,38; 34, 29
# e 19). Ele terminou com 3 perguntas de tradeoff e a ordem A > C > B ("Questions
# Answered: 3" na visualização em tabela); linear, o mesmo caso faz 8.

CURVAS_RANKING_CRUZADO = {
    "c0": [[0.70, 0], [0.715625, 0.5], [0.89140625, 0.75], [0.95, 1]],
    "c1": [[10, 1], [10.375, 0.5], [14.59375, 0.25], [16, 0]],
    "c2": [[10, 1], [19.375, 0.75], [28.75, 0.5], [34.375, 0.25], [40, 0]],
}


# Os outros três, na mesma rodada e com as mesmas respostas de curva por
# critério (Durabilidade IUP-ILO-IUP-Ind-Ind). Os pontos conferem com os gráficos
# e com os extremos das perguntas dele. O `bc-08` é o que mostrou as duas regras
# que faltavam: a Durabilidade fixa o 0,5 no último testado (7,39, e não 7,64 --
# ver `web/lib/curvaDeValor.ts`), e o par de critérios sai da lista quando as
# pontas da faixa mostram o mesmo número com duas casas (`CASAS_DA_TELA`). As 21
# perguntas saem iguais às dele, uma a uma.

CURVAS_SORTING_04 = {
    "c0": [[0.655, 0], [0.671438, 0.5], [0.856359, 0.75], [0.918, 1]],
    "c1": [[9.743, 1], [10.250813, 0.5], [15.963703, 0.25], [17.868, 0]],
    "c2": [[10.25, 1], [20.1175, 0.75], [29.985, 0.5], [35.9055, 0.25], [41.826, 0]],
}

CURVAS_BC_08 = {
    "c0": [[0.609, 0], [0.631, 0.5], [0.8785, 0.75], [0.961, 1]],
    "c1": [[9.015, 1], [9.581812, 0.5], [15.958453, 0.25], [18.084, 0]],
    "c2": [[11.527, 1], [22.103875, 0.75], [32.68075, 0.5], [39.026875, 0.25], [45.373, 0]],
    "c3": [[4.921, 0], [6.15475, 0.25], [7.3885, 0.5], [8.12875, 0.75], [8.869, 1]],
}


def _decisao_com_curva(chave, problematica, curvas):
    """Percorre o caso com as curvas dadas, respondendo sempre A."""
    from comparar import _criterios
    from fitradeoff import DecisionService, build_container

    caso = next(c for c in CASOS if c["chave"] == chave)
    crits = _criterios(caso)
    extra = {}
    if caso.get("custos"):
        extra = {"custos": caso["custos"], "configuracao": {"orcamento": caso["orcamento"]}}
    elif caso.get("configuracao"):
        extra = {"configuracao": caso["configuracao"]}
    servico = DecisionService(build_container(epsilon=0.0))
    d = servico.create(caso["chave"], caso["alternativas"], crits,
                       caso["consequencias"], problematica=problematica, **extra)["id"]
    for criterio, pontos in curvas.items():
        servico.set_value_curve(d, criterio, pontos)
    servico.rank_criteria(d, [c["chave"] for c in crits])

    perguntas = 0
    while "enunciado" in servico.next_question(d):
        servico.answer(d, "A")
        perguntas += 1
    return perguntas, servico.state(d)["analise"]


def test_decisao_inteira_com_curva_nao_linear_bate_com_o_oficial():
    perguntas, analise = _decisao_com_curva("ranking-cruzado", "ranking", CURVAS_RANKING_CRUZADO)
    assert perguntas == 3
    assert analise["ordem_definida"] == ["Plano A", "Plano C", "Plano B"]


def test_escolha_com_curva_bate_com_o_oficial():
    perguntas, analise = _decisao_com_curva("ranking-cruzado", "escolha", CURVAS_RANKING_CRUZADO)
    # "A Solution has been found", Plano A, "Questions Answered: 3"
    assert perguntas == 3
    assert analise["potencialmente_otimas"] == ["Plano A"]


def test_sorting_com_curva_bate_com_o_oficial():
    perguntas, analise = _decisao_com_curva("sorting-04", "sorting", CURVAS_SORTING_04)
    # C1..C3 dele são Baixa..Alta; as faixas também batem (Alt 01: 0,48 a 0,63)
    assert perguntas == 4
    classes = {alt: a["classes_possiveis"] for alt, a in analise["alocacao"].items()}
    assert classes == {"Alt 01": ["Media"], "Alt 02": ["Alta"], "Alt 03": ["Baixa"], "Alt 04": ["Media"]}
    assert analise["alocacao"]["Alt 01"]["faixa_de_valor"] == pytest.approx([0.48, 0.63], abs=0.005)


def test_beneficio_custo_com_curva_bate_com_o_oficial():
    perguntas, analise = _decisao_com_curva("bc-08", "beneficio_custo", CURVAS_BC_08)
    # ele: "There are no comparisons to be made in the elicitation by
    # decomposition anymore", com [Alt 05][Alt 08] na mesma posição e a carteira
    # [Alt 04, Alt 02, Alt 03, Alt 05]
    assert perguntas == 21
    assert analise["pares_sem_ordem_de_razao"] == ["Alt 05 vs Alt 08"]
    assert analise["carteira_mais_frequente"]["projetos"] == ["Alt 02", "Alt 03", "Alt 04", "Alt 05"]


# --- escala construída (discreta) --------------------------------------------
#
# Medido no oficial em 28/09/2026: uma nota de 1 a 5 (Likert, "Discrete" no
# cadastro dele), com a curva elicitada ILO-IUP-ILO-IUP -- que dá valor 0,5 ao
# nível 2 e 0,75 ao 3; o 4 ele interpola --, e qualidade e custo com as curvas do
# `ranking-cruzado`. Duas ordens: a nota por último, só como rival, e a nota no
# meio, em foco. Em foco, o oficial pergunta a nota nos níveis e, entre dois
# níveis, só no terço, no meio e nos dois terços (numa tela própria de critério
# discreto, com o valor exato no gráfico). As respostas variam de propósito: cada
# uma leva a um valor diferente, lido no gráfico dele.

CURVA_NOTA = [[1, 0], [2, 0.5], [3, 0.75], [5, 1]]


def _decisao_discreta(criterios, consequencias, respostas="", linear=False,
                      problematica="ranking", **extra):
    from fitradeoff import DecisionService, build_container

    servico = DecisionService(build_container(epsilon=0.0))
    d = servico.create("discreto", ["Alt 1", "Alt 2", "Alt 3", "Alt 4"], criterios,
                       consequencias, problematica=problematica, **extra)["id"]
    curvas = {"Indice de qualidade": CURVAS_RANKING_CRUZADO["c0"],
              "Custo unitario": CURVAS_RANKING_CRUZADO["c1"], "Nota": CURVA_NOTA}
    for c in [] if linear else criterios:
        servico.set_value_curve(d, c["chave"], curvas[c["nome"]])
    servico.rank_criteria(d, [c["chave"] for c in criterios])
    pares, notas = [], []
    while True:
        q = servico.next_question(d)
        if "enunciado" not in q:
            break
        pares.append((q["criterio_em_foco"], q["criterio_rival"]))
        if q["criterio_em_foco"] == "Nota":
            notas.append(round(float(q["opcao_a"][0].split(": ")[1]), 2))
        servico.answer(d, (respostas + "A" * 99)[len(pares) - 1])
    return pares, notas, servico.state(d)["analise"]


Q_ = {"chave": "q", "nome": "Indice de qualidade", "direcao": "max"}
C_ = {"chave": "c", "nome": "Custo unitario", "direcao": "min"}
N_ = {"chave": "n", "nome": "Nota", "direcao": "max", "niveis": [1, 2, 3, 4, 5]}
QUAL, CUSTO, NOTA = "Indice de qualidade", "Custo unitario", "Nota"


def test_nota_discreta_como_rival_bate_com_o_oficial():
    pares, _, analise = _decisao_discreta(
        [Q_, C_, N_], [[0.95, 16.0, 2], [0.70, 10.0, 4], [0.80, 13.0, 5], [0.85, 15.0, 1]])
    q, c, n = QUAL, CUSTO, NOTA
    assert pares == [(q, n), (q, c), (c, n), (q, c), (c, n), (c, n)]
    assert analise["resolvido"]  # "A complete order has been found"


@pytest.mark.parametrize("respostas, notas", [
    ("", [2, 1.5, 1.33]),
    ("AAAAAB", [2, 1.5, 1.33]),
    ("AAAAB", [2, 1.5, 1.67]),
    ("AABAAA", [2, 3, 2.5, 2.33]),
    ("AABAAB", [2, 3, 2.5, 2.67]),
])
def test_nota_discreta_em_foco_bate_com_o_oficial(respostas, notas):
    pares, perguntadas, analise = _decisao_discreta(
        [Q_, N_, C_], [[0.95, 2, 16.0], [0.70, 4, 10.0], [0.80, 5, 13.0], [0.85, 1, 15.0]],
        respostas)
    q, n = QUAL, NOTA
    assert pares[:4] == [(q, CUSTO), (q, n), (n, CUSTO), (q, n)]
    assert perguntadas == notas
    assert len(pares) == 2 + 2 + len(notas) - 1  # 6 ou 7, como o oficial
    # "There are no comparisons to be made ... anymore", com avaliação holística
    assert not analise["resolvido"]


@pytest.mark.parametrize("respostas, notas", [("", [3, 2]), ("AAB", [3, 4])])
def test_nota_discreta_sem_curva_so_pergunta_nivel(respostas, notas):
    """Sem curva, o oficial não pergunta entre níveis: terço e meio são só com curva."""
    pares, perguntadas, analise = _decisao_discreta(
        [Q_, N_, C_], [[0.95, 2, 16.0], [0.70, 4, 10.0], [0.80, 5, 13.0], [0.85, 1, 15.0]],
        respostas, linear=True)
    q, n, c = QUAL, NOTA, CUSTO
    assert pares == [(q, c), (q, n), (n, c), (q, n), (n, c), (q, n)]
    assert perguntadas == notas
    assert analise["resolvido"]  # "A complete order has been found"


def test_sorting_20_com_qualidade_reescalada_bate_com_o_oficial():
    """O caso que separou as leituras do fim de um par (28/09/2026).

    `sorting-20` com a qualidade levada para 0,60..0,80, linear. O oficial faz
    22 perguntas e termina sem classificar todas ("no comparisons to be made
    anymore"). As duas leituras anteriores do fim de par davam 24 e 17; a faixa
    abaixo de 0,01 na unidade do criterio (`LARGURA_MINIMA`) da as mesmas 22.
    """
    import copy

    from comparar import roda_nosso

    caso = copy.deepcopy(next(c for c in CASOS if c["chave"] == "sorting-20"))
    coluna = [linha[0] for linha in caso["consequencias"]]
    lo, hi = min(coluna), max(coluna)
    caso["consequencias"] = [
        [round(0.6 + (linha[0] - lo) / (hi - lo) * 0.2, 4)] + list(linha[1:])
        for linha in caso["consequencias"]
    ]
    resultado = roda_nosso(caso)
    assert resultado["steps_tradeoff"] == 22
    assert not resultado["analise"]["resolvido"]


def test_custo_em_milhares_so_acaba_pelo_peso():
    """O mesmo caso com o custo multiplicado por 1000 (28/09/2026).

    Numa unidade grande a faixa em consequencia nunca chega a 0,01, e o par
    `Custo x Prazo` so acaba pelo peso do rival. O oficial faz 25 perguntas -- uma
    a mais que o `PESO_DESPREZIVEL` antigo (1e-5) dava, e foi essa medida que
    estreitou a janela dele para 3,70e-6..7,40e-6.
    """
    import copy

    from comparar import roda_nosso

    caso = copy.deepcopy(next(c for c in CASOS if c["chave"] == "sorting-20"))
    coluna = [linha[0] for linha in caso["consequencias"]]
    lo, hi = min(coluna), max(coluna)
    caso["consequencias"] = [
        [round(0.6 + (linha[0] - lo) / (hi - lo) * 0.2, 4), round(linha[1] * 1000, 1)]
        + list(linha[2:])
        for linha in caso["consequencias"]
    ]
    assert roda_nosso(caso)["steps_tradeoff"] == 25


NOTA_NO_MEIO = [[0.95, 2, 16.0], [0.70, 4, 10.0], [0.80, 5, 13.0], [0.85, 1, 15.0]]


def test_nota_discreta_em_foco_na_escolha_bate_com_o_oficial():
    pares, _, analise = _decisao_discreta([Q_, N_, C_], NOTA_NO_MEIO, problematica="escolha")
    assert pares == [(QUAL, CUSTO), (QUAL, NOTA), (NOTA, CUSTO)]
    assert analise["potencialmente_otimas"] == ["Alt 1"]  # "A Solution has been found"


def test_nota_discreta_em_foco_no_sorting_bate_com_o_oficial():
    pares, _, analise = _decisao_discreta(
        [Q_, N_, C_], NOTA_NO_MEIO, problematica="sorting",
        configuracao={"perfis": [0.35, 0.7], "classes": ["Baixa", "Media", "Alta"]})
    assert pares == [(QUAL, CUSTO), (QUAL, NOTA), (NOTA, CUSTO), (QUAL, NOTA)]
    # C3, C1, C2, C2 na tela dele
    classes = {a: x["classes_possiveis"] for a, x in analise["alocacao"].items()}
    assert classes == {"Alt 1": ["Alta"], "Alt 2": ["Baixa"], "Alt 3": ["Media"], "Alt 4": ["Media"]}


def test_nota_discreta_em_foco_no_beneficio_custo_bate_com_o_oficial():
    pares, _, analise = _decisao_discreta(
        [Q_, N_, C_], NOTA_NO_MEIO, problematica="beneficio_custo",
        custos=[40.0, 25.0, 35.0, 20.0], configuracao={"orcamento": 60.0})
    assert pares == [(QUAL, CUSTO), (QUAL, NOTA), (NOTA, CUSTO), (QUAL, NOTA)]
    assert analise["carteira_mais_frequente"]["projetos"] == ["Alt 1", "Alt 4"]  # [Alt 4, Alt 1], $60


# --- todos os casos medidos alem dos 16 lineares ----------------------------
#
# `resultados/casos_medidos.json` (lido por `medidos.py`) guarda cada caso medido
# no oficial depois dos 16 lineares -- curva continua, criterio discreto,
# estresse --, com o que ele fez: as duas contagens e, quando capturada, a
# sequencia de pares ("entre-niveis" e a tela propria de criterio discreto). E o
# mesmo registro que a tela de paridade conta. Cada caso novo que entrar la passa
# a ser conferido aqui, sem mais codigo.

import medidos as _medidos

_REGISTRO = _medidos.carregar()


@pytest.mark.parametrize("caso", _REGISTRO, ids=[c["chave"] for c in _REGISTRO])
def test_caso_medido_bate_com_o_oficial(caso):
    nosso = _medidos.roda(caso)
    oficial = caso["oficial"]
    assert nosso["tradeoff"] == oficial["tradeoff"]
    assert nosso["ordenacao"] == oficial["ordenacao"]
    if "pares" in oficial:
        assert nosso["pares"] == oficial["pares"]
