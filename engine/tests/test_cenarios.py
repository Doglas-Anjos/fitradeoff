"""Dez percursos completos, dois por objetivo de decisao.

Os outros testes verificam pecas. Estes atravessam o produto inteiro -- criar,
ordenar criterios, responder ate o fim -- e existem por dois motivos.

O primeiro e cobertura de verdade: cada objetivo ganha um caso facil e um caso
dificil, porque so o dificil exercita o que o metodo tem de proprio. Uma escolha
em que uma alternativa domina todas as outras termina sem nenhuma pergunta de
tradeoff, e nao prova nada sobre a elicitacao; uma em que duas se equivalem em
quase tudo e o que mostra o metodo trabalhando.

O segundo e documentacao executavel. Cada percurso grava o que a tela mostraria
em cada passo, e esse registro vira o relatorio em HTML. Um relatorio escrito a
mao descreve o que o autor lembra; este descreve o que o motor fez na ultima vez
que rodou, e envelhece junto com o codigo em vez de virar ficcao.

A politica de resposta e fixa e declarada: sempre a opcao A. Nao e a resposta de
um decisor real -- e a unica forma de o percurso ser reproduzivel. O que se
verifica nao e "a recomendacao esta certa", que depende da preferencia de quem
responde, e sim que o processo termina, termina consistente, e termina dizendo o
que aquele objetivo tem de dizer.
"""

import json
import os
import pathlib

import pytest

from conftest import ALTERNATIVAS, CONSEQUENCIAS, CRITERIOS_SPEC
from fitradeoff import DecisionService

# Teto de seguranca: um percurso que nao termina e defeito, nao caso de teste.
MAX_PERGUNTAS = 40

ORDEM_PADRAO = ["qualidade", "custo", "prazo"]


# --- os casos ------------------------------------------------------------------
#
# Cada um traz o minimo para ser reproduzido e o suficiente para ser lido no
# relatorio: por que ele existe, e o que se espera ver no fim.

CENARIOS = [
    # --- escolha ---------------------------------------------------------------
    {
        "chave": "escolha-dominante",
        "objetivo": "escolha",
        "titulo": "Escolha com uma alternativa dominante",
        "porque": (
            "O caso facil. Uma alternativa e melhor que as outras em todos os "
            "criterios, entao a ordenacao dos criterios ja basta e nenhuma "
            "pergunta de tradeoff precisa ser feita."
        ),
        "espera": "Resolve sem nenhuma pergunta de tradeoff.",
        "alternativas": ["Fornecedor A", "Fornecedor B", "Fornecedor C"],
        "criterios": CRITERIOS_SPEC,
        "consequencias": [
            [0.95, 10.20, 12],  # melhor em tudo
            [0.80, 14.00, 30],
            [0.71, 16.40, 45],
        ],
        "ordem": ORDEM_PADRAO,
    },
    {
        "chave": "escolha-disputada",
        "objetivo": "escolha",
        "titulo": "Escolha entre duas quase equivalentes",
        "porque": (
            "O caso dificil, e o que mostra o metodo trabalhando: duas "
            "alternativas trocam de lugar conforme o peso dos criterios, e so "
            "as perguntas de tradeoff separam as duas."
        ),
        "espera": "Precisa de perguntas; termina com uma recomendacao.",
        "alternativas": ALTERNATIVAS,
        "criterios": CRITERIOS_SPEC,
        "consequencias": CONSEQUENCIAS,
        "ordem": ORDEM_PADRAO,
    },
    # --- ranking ---------------------------------------------------------------
    {
        "chave": "ranking-escalonado",
        "objetivo": "ranking",
        "titulo": "Ordenacao de alternativas escalonadas",
        "porque": (
            "Desempenhos que decrescem juntos em todos os criterios: a ordem "
            "sai quase de graca, e serve de linha de base."
        ),
        "espera": "Ordem completa, da primeira a ultima.",
        "alternativas": ["Plano A", "Plano B", "Plano C", "Plano D"],
        "criterios": CRITERIOS_SPEC,
        "consequencias": [
            [0.95, 10.0, 10],
            [0.85, 12.0, 20],
            [0.75, 14.0, 30],
            [0.65, 16.0, 40],
        ],
        "ordem": ORDEM_PADRAO,
    },
    {
        "chave": "ranking-cruzado",
        "objetivo": "ranking",
        "titulo": "Ordenacao com desempenhos cruzados",
        "porque": (
            "Cada alternativa lidera num criterio diferente. A ordem so aparece "
            "depois que as perguntas dizem quanto vale cada troca, e pode "
            "sobrar par sem ordem definida -- o que e resultado, nao falha."
        ),
        "espera": "Ordem ou faixas de posicao; pares indefinidos sao aceitaveis.",
        "alternativas": ["Plano A", "Plano B", "Plano C"],
        "criterios": CRITERIOS_SPEC,
        "consequencias": [
            [0.95, 16.0, 40],  # melhor qualidade, pior no resto
            [0.70, 10.0, 38],  # melhor custo
            [0.72, 15.5, 10],  # melhor prazo
        ],
        "ordem": ORDEM_PADRAO,
    },
    # --- sorting ---------------------------------------------------------------
    {
        "chave": "sorting-separado",
        "objetivo": "sorting",
        "titulo": "Classificacao com grupos separados",
        "porque": (
            "Tres grupos bem distantes uns dos outros: cada alternativa cai "
            "numa classe so, e nenhuma fica na fronteira."
        ),
        "espera": "Toda alternativa com classe definida.",
        "alternativas": ["Alta 1", "Alta 2", "Media", "Baixa"],
        "criterios": CRITERIOS_SPEC,
        "consequencias": [
            [0.95, 10.0, 10],
            [0.93, 10.5, 11],
            [0.80, 13.0, 25],
            [0.62, 17.0, 44],
        ],
        "ordem": ORDEM_PADRAO,
        "configuracao": {"perfis": [0.35, 0.7], "classes": ["Baixa", "Media", "Alta"]},
    },
    {
        "chave": "sorting-parou-antes",
        "objetivo": "sorting",
        "titulo": "Classificacao interrompida antes do fim",
        "porque": (
            "O decisor para depois de duas perguntas, que e o caminho previsto "
            "pelo metodo: com informacao parcial quase sempre da para concluir "
            "sem esgotar a elicitacao. Uma alternativa fica entre duas classes, "
            "e o honesto e dizer isso em vez de escolher uma para parecer "
            "decidido."
        ),
        "espera": "Ao menos uma alternativa com duas classes possiveis.",
        "alternativas": ["Alta", "Meio do caminho", "Baixa"],
        "criterios": CRITERIOS_SPEC,
        "consequencias": [
            [0.95, 10.0, 10],
            [0.83, 13.2, 27],
            [0.62, 17.0, 44],
        ],
        "ordem": ORDEM_PADRAO,
        "configuracao": {"perfis": [0.30, 0.62], "classes": ["Baixa", "Media", "Alta"]},
        "limite_respostas": 2,
    },
    # --- carteira combinatorial ------------------------------------------------
    {
        "chave": "carteira-apertada",
        "objetivo": "portfolio",
        "titulo": "Carteira com orcamento apertado",
        "porque": (
            "O orcamento paga menos da metade dos projetos. E o caso em que a "
            "restricao morde, e em que a selecao deixa de ser 'os melhores' "
            "para ser 'os que cabem juntos'."
        ),
        "espera": "Carteira menor que o conjunto; projetos nunca selecionados.",
        "alternativas": ["Projeto A", "Projeto B", "Projeto C", "Projeto D", "Projeto E"],
        "criterios": CRITERIOS_SPEC,
        "consequencias": [
            [0.90, 11.0, 15],
            [0.70, 13.0, 22],
            [0.85, 12.0, 18],
            [0.60, 16.0, 35],
            [0.78, 14.0, 25],
        ],
        "ordem": ORDEM_PADRAO,
        "custos": [40.0, 25.0, 35.0, 20.0, 30.0],
        "configuracao": {"orcamento": 60.0},
    },
    {
        "chave": "carteira-folgada",
        "objetivo": "portfolio",
        "titulo": "Carteira com orcamento folgado",
        "porque": (
            "O orcamento paga quase tudo. Serve de contraste: mostra que a "
            "carteira nao e 'escolher os melhores', e sim o que a restricao "
            "permite -- sem restricao, quase nada e descartado."
        ),
        "espera": "Carteira grande; poucos ou nenhum projeto de fora.",
        "alternativas": ["Projeto A", "Projeto B", "Projeto C", "Projeto D", "Projeto E"],
        "criterios": CRITERIOS_SPEC,
        "consequencias": [
            [0.90, 11.0, 15],
            [0.70, 13.0, 22],
            [0.85, 12.0, 18],
            [0.60, 16.0, 35],
            [0.78, 14.0, 25],
        ],
        "ordem": ORDEM_PADRAO,
        "custos": [40.0, 25.0, 35.0, 20.0, 30.0],
        "configuracao": {"orcamento": 140.0},
    },
    # --- carteira por razao ----------------------------------------------------
    {
        "chave": "razao-clara",
        "objetivo": "beneficio_custo",
        "titulo": "Carteira por razao com dominancia clara",
        "porque": (
            "Um projeto barato e bom, outro caro e fraco: as faixas de razao "
            "nao se sobrepoem e a dominancia e declaravel sem amostragem "
            "nenhuma -- as faixas saem por programacao linear."
        ),
        "espera": "Ao menos um par dominante declarado.",
        "alternativas": ["Projeto A", "Projeto B", "Projeto C", "Projeto D"],
        "criterios": CRITERIOS_SPEC,
        "consequencias": [
            [0.92, 10.5, 12],  # bom e barato
            [0.60, 16.5, 44],  # fraco e caro
            [0.80, 13.0, 25],
            [0.70, 14.5, 30],
        ],
        "ordem": ORDEM_PADRAO,
        "custos": [10.0, 90.0, 30.0, 45.0],
        "configuracao": {"orcamento": 70.0},
    },
    {
        "chave": "razao-disputada",
        "objetivo": "beneficio_custo",
        "titulo": "Carteira por razao com faixas sobrepostas",
        "porque": (
            "Projetos de eficiencia parecida: as faixas de razao se sobrepoem e "
            "quase nada pode ser declarado dominante. E o caso que obriga a "
            "ressalva sobre o que e exato e o que e amostrado."
        ),
        "espera": "Menos dominancia que o caso claro; ressalva presente.",
        "alternativas": ["Projeto A", "Projeto B", "Projeto C", "Projeto D"],
        "criterios": CRITERIOS_SPEC,
        # cada um lidera num criterio diferente: quem vale mais depende do peso,
        # e por isso as faixas de razao se sobrepoem
        "consequencias": [
            [0.95, 16.0, 40],
            [0.70, 10.0, 38],
            [0.72, 15.5, 10],
            [0.80, 13.0, 25],
        ],
        "ordem": ORDEM_PADRAO,
        "custos": [30.0, 30.0, 30.0, 30.0],
        "configuracao": {"orcamento": 60.0},
    },
]


# --- o percurso ----------------------------------------------------------------


def percorrer(service: DecisionService, cenario: dict) -> dict:
    """Roda um cenario de ponta a ponta e devolve o que cada tela mostraria."""
    criada = service.create(
        cenario["titulo"],
        cenario["alternativas"],
        cenario["criterios"],
        cenario["consequencias"],
        problematica=cenario["objetivo"],
        configuracao=cenario.get("configuracao"),
        custos=cenario.get("custos"),
    )
    decisao = criada["id"]
    telas = [
        {
            "tela": "Estrutura e desempenhos",
            "o_que_mostra": (
                f"{len(cenario['alternativas'])} alternativas e "
                f"{len(cenario['criterios'])} criterios, com a matriz preenchida."
            ),
            "estado": service.state(decisao),
        }
    ]

    service.rank_criteria(decisao, cenario["ordem"])
    telas.append(
        {
            "tela": "Importancia dos criterios",
            "o_que_mostra": "Ordem declarada: " + " > ".join(cenario["ordem"]),
            "estado": service.state(decisao),
        }
    )

    perguntas = []
    # Alguns cenarios param antes do fim de proposito: e o caminho que o metodo
    # preve, e o unico jeito de ver o que ele diz quando ainda nao sabe tudo.
    limite = cenario.get("limite_respostas", MAX_PERGUNTAS)
    for _ in range(limite):
        proxima = service.next_question(decisao)
        if "enunciado" not in proxima:
            break
        perguntas.append(
            {
                "criterio_em_foco": proxima["criterio_em_foco"],
                "criterio_rival": proxima["criterio_rival"],
                "opcao_a": proxima["opcao_a"],
                "opcao_b": proxima["opcao_b"],
            }
        )
        service.answer(decisao, "A")
    else:
        if limite == MAX_PERGUNTAS:  # pragma: no cover - seria defeito
            pytest.fail(
                f"{cenario['chave']}: nao terminou em {MAX_PERGUNTAS} perguntas"
            )

    final = service.state(decisao)
    telas.append(
        {
            "tela": "Perguntas de tradeoff",
            "o_que_mostra": (
                f"{len(perguntas)} pergunta(s), sempre respondidas com a opcao A."
            ),
            "perguntas": perguntas,
        }
    )
    telas.append(
        {
            "tela": "Resultado",
            "o_que_mostra": final["analise"]["resumo"],
            "estado": final,
        }
    )

    return {
        "chave": cenario["chave"],
        "objetivo": cenario["objetivo"],
        "titulo": cenario["titulo"],
        "porque": cenario["porque"],
        "espera": cenario["espera"],
        "alternativas": cenario["alternativas"],
        "criterios": [c["nome"] for c in cenario["criterios"]],
        "consequencias": cenario["consequencias"],
        "custos": cenario.get("custos"),
        "configuracao": cenario.get("configuracao"),
        "ordem": cenario["ordem"],
        "perguntas_feitas": len(perguntas),
        "parou_antes": cenario.get("limite_respostas") is not None,
        "telas": telas,
        "auditoria": service.explain(decisao),
    }


@pytest.fixture(scope="module")
def resultados():
    """Roda os dez percursos uma vez e compartilha o registro entre os testes."""
    from fitradeoff import build_container

    service = DecisionService(build_container(epsilon=0.0))
    return {c["chave"]: percorrer(service, c) for c in CENARIOS}


IDS = [c["chave"] for c in CENARIOS]


def carteiras(analise: dict) -> list[dict]:
    """As carteiras encontradas, nas duas leituras de portfolio.

    Este percurso achou o defeito que a funcao agora nao precisa mais contornar:
    a combinatorial publicava `portfolios_encontrados` e a por razao publicava
    `carteiras_encontradas`. Nao era so feio -- a tela lia o primeiro nome, e a
    lista de carteiras simplesmente nao aparecia na leitura por razao. Os dois
    nomes viraram um so no motor.
    """
    return analise.get("portfolios_encontrados", [])


# --- o que todo percurso precisa cumprir ---------------------------------------


@pytest.mark.parametrize("chave", IDS)
def test_o_percurso_termina_consistente(resultados, chave):
    final = resultados[chave]["telas"][-1]["estado"]
    assert final["consistente"], f"{chave} terminou com declaracoes incompativeis"


@pytest.mark.parametrize("chave", IDS)
def test_o_resultado_diz_alguma_coisa(resultados, chave):
    """Um resumo vazio seria uma tela de resultado sem resultado."""
    assert resultados[chave]["telas"][-1]["estado"]["analise"]["resumo"].strip()


@pytest.mark.parametrize("chave", IDS)
def test_a_trilha_registra_a_ordenacao_e_cada_resposta(resultados, chave):
    caso = resultados[chave]
    trilha = caso["auditoria"]["declaracoes"]
    # a primeira declaracao e a ordem dos criterios; as demais sao respostas
    assert len(trilha) == 1 + caso["perguntas_feitas"]


@pytest.mark.parametrize("chave", IDS)
def test_toda_pergunta_mostra_os_dois_lados_por_inteiro(resultados, chave):
    """Sem ver as duas situacoes completas, o decisor responde a uma pergunta
    diferente da que o modelo registra."""
    caso = resultados[chave]
    n = len(caso["criterios"])
    for tela in caso["telas"]:
        for pergunta in tela.get("perguntas", []):
            assert len(pergunta["opcao_a"]) == n
            assert len(pergunta["opcao_b"]) == n


# --- o que cada objetivo tem de proprio ----------------------------------------


def test_escolha_dominante_nao_precisa_de_pergunta(resultados):
    """O ponto do metodo: quando a ordenacao ja decide, ela decide."""
    assert resultados["escolha-dominante"]["perguntas_feitas"] == 0
    analise = resultados["escolha-dominante"]["telas"][-1]["estado"]["analise"]
    assert analise["recomendacao"] == "Fornecedor A"


def test_escolha_disputada_precisa_perguntar(resultados):
    """Se este caso resolvesse sozinho, o par de cenarios nao provaria nada
    sobre a elicitacao."""
    assert resultados["escolha-disputada"]["perguntas_feitas"] > 0


@pytest.mark.parametrize("chave", ["ranking-escalonado", "ranking-cruzado"])
def test_ranking_publica_posicoes_possiveis(resultados, chave):
    analise = resultados[chave]["telas"][-1]["estado"]["analise"]
    posicoes = analise["posicoes_possiveis"]
    assert set(posicoes) == set(resultados[chave]["alternativas"])
    for faixa in posicoes.values():
        assert 1 <= faixa[0] <= faixa[1] <= len(posicoes)


def test_ranking_escalonado_sai_sem_empate(resultados):
    analise = resultados["ranking-escalonado"]["telas"][-1]["estado"]["analise"]
    assert analise["resolvido"]


@pytest.mark.parametrize("chave", ["sorting-separado", "sorting-parou-antes"])
def test_sorting_aloca_toda_alternativa_em_ao_menos_uma_classe(resultados, chave):
    analise = resultados[chave]["telas"][-1]["estado"]["analise"]
    for nome, dados in analise["alocacao"].items():
        assert dados["classes_possiveis"], f"{nome} ficou sem classe"


def test_sorting_parou_antes_admite_duas_classes(resultados):
    """Forcar uma classe unica sobre uma alternativa de fronteira seria afirmar
    mais do que as declaracoes sustentam."""
    analise = resultados["sorting-parou-antes"]["telas"][-1]["estado"]["analise"]
    indefinidas = [
        nome
        for nome, dados in analise["alocacao"].items()
        if len(dados["classes_possiveis"]) > 1
    ]
    assert indefinidas, "nenhuma alternativa ficou entre duas classes"


@pytest.mark.parametrize(
    "chave", ["carteira-apertada", "carteira-folgada", "razao-clara", "razao-disputada"]
)
def test_carteira_respeita_o_orcamento(resultados, chave):
    caso = resultados[chave]
    analise = caso["telas"][-1]["estado"]["analise"]
    teto = caso["configuracao"]["orcamento"]
    for carteira in carteiras(analise):
        assert carteira["custo"] <= teto + 1e-9, f"{chave} estourou o orcamento"


@pytest.mark.parametrize(
    "chave", ["carteira-apertada", "carteira-folgada", "razao-clara", "razao-disputada"]
)
def test_as_duas_carteiras_publicam_a_lista_sob_o_mesmo_nome(resultados, chave):
    """Dois nomes para a mesma coisa custaram a lista inteira numa das telas.

    A leitura por razao publicava `carteiras_encontradas` e a tela lia
    `portfolios_encontrados`: nada quebrava, nenhum erro aparecia, e a lista de
    carteiras simplesmente nao existia para quem usava a leitura por razao.
    """
    analise = resultados[chave]["telas"][-1]["estado"]["analise"]
    assert analise.get("portfolios_encontrados"), f"{chave} nao publicou a lista"
    assert "carteiras_encontradas" not in analise, f"{chave} ainda usa o nome antigo"


@pytest.mark.parametrize(
    "chave", ["carteira-apertada", "carteira-folgada", "razao-clara", "razao-disputada"]
)
def test_toda_carteira_publica_a_ressalva_de_amostragem(resultados, chave):
    """A carteira final e aproximada. Omitir isso e afirmar mais do que o metodo
    apurou."""
    analise = resultados[chave]["telas"][-1]["estado"]["analise"]
    assert analise.get("ressalva"), f"{chave} nao publicou a ressalva"


def test_orcamento_apertado_deixa_projeto_de_fora(resultados):
    analise = resultados["carteira-apertada"]["telas"][-1]["estado"]["analise"]
    for carteira in carteiras(analise):
        assert len(carteira["projetos"]) < 5


def test_orcamento_folgado_leva_mais_do_que_o_apertado(resultados):
    """O contraste entre os dois cenarios e o que mostra que a restricao manda."""

    def maior(chave):
        analise = resultados[chave]["telas"][-1]["estado"]["analise"]
        return max(len(c["projetos"]) for c in carteiras(analise))

    assert maior("carteira-folgada") > maior("carteira-apertada")


@pytest.mark.parametrize("chave", ["razao-clara", "razao-disputada"])
def test_razao_publica_a_faixa_de_cada_projeto(resultados, chave):
    analise = resultados[chave]["telas"][-1]["estado"]["analise"]
    for nome, faixa in analise["razoes"].items():
        assert faixa["razao_minima"] <= faixa["razao_maxima"], nome
        assert faixa["custo"] > 0, nome


def test_razao_clara_declara_dominancia(resultados):
    analise = resultados["razao-clara"]["telas"][-1]["estado"]["analise"]
    assert analise["dominancia_por_razao"], "faixas disjuntas e nenhuma dominancia"


def test_razao_disputada_declara_menos_dominancia_que_a_clara(resultados):
    """Faixas que se sobrepoem nao autorizam declarar dominancia -- e o criterio
    conservador e justamente o que torna a declaracao confiavel.

    Comparado no primeiro estado analisado, antes das perguntas. No fim ja nao
    serve: desde 28/09/2026 a elicitacao por razao so encerra quando a ordem das
    razoes fecha (como no sistema oficial), e ai os dois cenarios terminam com a
    ordem completa. A diferenca que este teste defende aparece onde as faixas
    ainda se sobrepoem -- no comeco.
    """

    def quantas(chave):
        primeira = next(
            t for t in resultados[chave]["telas"] if (t["estado"] or {}).get("analise")
        )
        return len(primeira["estado"]["analise"].get("dominancia_por_razao") or [])

    assert quantas("razao-disputada") < quantas("razao-clara")


# --- o registro para o relatorio ------------------------------------------------


def test_grava_o_registro_dos_percursos(resultados, tmp_path_factory):
    """Nao verifica comportamento: publica o que os testes acabaram de exercer.

    O relatorio em HTML le este arquivo. Escrever daqui, e nao de um script a
    parte, e o que garante que o relatorio descreve a versao que passou nos
    testes -- e nao uma rodada de ontem.
    """
    destino = pathlib.Path(
        os.environ.get("FITRADEOFF_RELATORIO", "../artifacts/percursos.json")
    )
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(
        json.dumps(list(resultados.values()), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    assert len(resultados) == 10, "dois cenarios para cada um dos cinco objetivos"
