# -*- coding: utf-8 -*-
"""Trava a paridade medida contra o sistema oficial.

Os testes do motor verificam cada regra descoberta na comparação — a pergunta de
abertura, o piso propagado, o empate que fecha a pré-ordem, o ε/2 do sorting.
Nenhum deles verifica o que a comparação **conclui**: que rodar 17 problemas nos
dois sistemas dá o mesmo número de perguntas em 14 deles.

Sem este arquivo, uma mudança no motor podia alterar essa contagem em silêncio, e
o relatório e a tela de paridade passariam a afirmar um número que já não é
verdade. Aqui a afirmação vira asserção.

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

from casos import CASOS  # noqa: E402
from comparar import roda_nosso  # noqa: E402

RESULTADOS = RAIZ / "resultados"

#: Casos em que os dois sistemas ainda divergem, com o vão documentado.
#: Não são falhas escondidas: estão no relatório e na tela. Ficam aqui para que
#: **fechar** um deles também quebre o teste — e obrigue a atualizar os dois.
DIVERGENCIAS = {
    # o oficial abandona um par que ainda tem faixa; causa não identificada
    "ranking-20": (21, 22),
    # a nossa parada dispara quando a carteira está definida; ele continua.
    # A carteira final é a mesma, conferida projeto a projeto.
    "bc-20": (17, 11),
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
