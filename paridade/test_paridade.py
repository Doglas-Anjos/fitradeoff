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


def test_decisao_inteira_com_curva_nao_linear_bate_com_o_oficial():
    from comparar import _criterios
    from fitradeoff import DecisionService, build_container

    caso = next(c for c in CASOS if c["chave"] == "ranking-cruzado")
    crits = _criterios(caso)
    servico = DecisionService(build_container(epsilon=0.0))
    d = servico.create(caso["chave"], caso["alternativas"], crits,
                       caso["consequencias"], problematica="ranking")["id"]
    for chave, pontos in CURVAS_RANKING_CRUZADO.items():
        servico.set_value_curve(d, chave, pontos)
    servico.rank_criteria(d, [c["chave"] for c in crits])

    perguntas = 0
    while "enunciado" in servico.next_question(d):
        servico.answer(d, "A")
        perguntas += 1
    analise = servico.state(d)["analise"]
    assert perguntas == 3
    assert analise["ordem_definida"] == ["Plano A", "Plano C", "Plano B"]
