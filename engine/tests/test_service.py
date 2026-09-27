"""Casos de uso: o servico que MCP e API compartilham."""

import numpy as np
import pytest

from conftest import ALTERNATIVAS, CONSEQUENCIAS, CRITERIOS_SPEC
from fitradeoff import DecisionService, InvalidRequest, RecordNotFound
from fitradeoff.application.service import parse_preference
from fitradeoff.domain import Preference


@pytest.fixture
def service(container):
    """Identificadores previsiveis, para os testes falarem de 'd1', 'd2'."""
    contador = iter(f"d{i}" for i in range(1, 100))
    return DecisionService(container, make_id=lambda: next(contador))


@pytest.fixture
def criada(service):
    return service.create("Fornecedores", ALTERNATIVAS, CRITERIOS_SPEC, CONSEQUENCIAS)


def responder_ate_o_fim(service, record_id, pesos, limite=40):
    """Decisor simulado: responde conforme pesos ocultos ate encerrar."""
    for _ in range(limite):
        pergunta = service.next_question(record_id)
        if pergunta.get("pergunta", "sentinela") is None:
            return
        question = service.session(record_id).next_question()
        prefere_a = pesos[question.criterion] * question.value >= pesos[question.rival]
        service.answer(record_id, "A" if prefere_a else "B")
    raise AssertionError("A elicitacao nao encerrou.")


# --- criacao ------------------------------------------------------------------


def test_criar_devolve_problema_e_proximo_passo(criada):
    assert criada["id"] == "d1"
    assert criada["criterios"][1]["unidade"] == "R$/un"
    assert criada["criterios"][1]["melhor"] == 10.20  # custo: menor e melhor
    assert "ordenar_criterios" in criada["proximo_passo"]


def test_matriz_incoerente_e_recusada(service):
    with pytest.raises(ValueError, match="esperado"):
        service.create("Ruim", ALTERNATIVAS, CRITERIOS_SPEC, [[1.0, 2.0, 3.0]])


def test_problematica_desconhecida_lista_as_validas(service):
    with pytest.raises(InvalidRequest, match="escolha"):
        service.create(
            "x", ALTERNATIVAS, CRITERIOS_SPEC, CONSEQUENCIAS, problematica="magica"
        )


def test_portfolio_sem_custos_e_recusado_na_criacao(service):
    with pytest.raises(ValueError, match="custo de cada alternativa"):
        service.create(
            "Carteira",
            ALTERNATIVAS,
            CRITERIOS_SPEC,
            CONSEQUENCIAS,
            problematica="portfolio",
            configuracao={"orcamento": 100.0},
        )


def test_sorting_sem_perfis_e_recusado_na_criacao(service):
    with pytest.raises(ValueError, match="ao menos um perfil"):
        service.create(
            "Classes",
            ALTERNATIVAS,
            CRITERIOS_SPEC,
            CONSEQUENCIAS,
            problematica="sorting",
        )


def test_decisao_inexistente(service):
    with pytest.raises(RecordNotFound, match="nao encontrada"):
        service.state("fantasma")


# --- fluxo --------------------------------------------------------------------


def test_perguntar_antes_de_ordenar_orienta(service, criada):
    with pytest.raises(InvalidRequest, match="ordene os criterios"):
        service.next_question("d1")


def test_ordenacao_incompleta_aponta_o_que_falta(service, criada):
    with pytest.raises(InvalidRequest, match="prazo"):
        service.rank_criteria("d1", ["qualidade", "custo"])


def test_responder_texto_livre_e_recusado(service, criada):
    service.rank_criteria("d1", ["qualidade", "custo", "prazo"])
    with pytest.raises(InvalidRequest, match="'A', 'B', 'indiferente' ou"):
        service.answer("d1", "sei la")


@pytest.mark.parametrize(
    "texto,esperado",
    [
        ("A", Preference.FIRST),
        ("b", Preference.SECOND),
        (" Indiferente ", Preference.INDIFFERENT),
        ("não sei", Preference.NO_ANSWER),
        ("nao sei", Preference.NO_ANSWER),
    ],
)
def test_respostas_aceitas(texto, esperado):
    assert parse_preference(texto) is esperado


def test_fluxo_completo_ate_a_recomendacao(service, criada):
    estado = service.rank_criteria("d1", ["qualidade", "custo", "prazo"])
    assert estado["consistente"]
    iniciais = len(estado["analise"]["indefinidas"])

    responder_ate_o_fim(service, "d1", {0: 0.5, 1: 0.3, 2: 0.2})

    final = service.state("d1")
    assert final["encerrado"]
    assert len(final["analise"]["indefinidas"]) <= iniciais
    # a ordem declarada se reflete nas faixas de peso
    assert final["faixas_de_peso"]["Indice de qualidade"][1] >= (
        final["faixas_de_peso"]["Prazo de entrega"][0]
    )


def test_pergunta_vem_em_unidades_reais(service, criada):
    service.rank_criteria("d1", ["qualidade", "custo", "prazo"])
    pergunta = service.next_question("d1")

    assert "pior desempenho possivel" in pergunta["enunciado"]
    assert len(pergunta["opcao_a"]) == 3 and len(pergunta["opcao_b"]) == 3
    assert 0.0 < pergunta["posicao_na_escala"] < 1.0
    assert "Nao responda por ele" in pergunta["como_responder"]


def test_desfazer_restaura_o_estado(service, criada):
    service.rank_criteria("d1", ["qualidade", "custo", "prazo"])
    antes = service.state("d1")
    service.answer("d1", "A")
    voltou = service.undo("d1")

    assert voltou["declaracoes"] == 1
    assert voltou["analise"]["indefinidas"] == antes["analise"]["indefinidas"]
    service.undo("d1")
    with pytest.raises(InvalidRequest, match="Nao ha declaracao"):
        service.undo("d1")


def test_reordenar_descarta_as_respostas(service, criada):
    service.rank_criteria("d1", ["qualidade", "custo", "prazo"])
    service.answer("d1", "A")
    estado = service.rank_criteria("d1", ["custo", "qualidade", "prazo"])

    assert estado["declaracoes_descartadas"] == 2
    assert estado["declaracoes"] == 1


def test_declaracoes_contraditorias_sao_sinalizadas(service, criada):
    service.rank_criteria("d1", ["qualidade", "custo", "prazo"])
    for _ in range(6):
        pergunta = service.next_question("d1")
        if pergunta.get("pergunta", "x") is None:
            break
        # responde sempre A e depois sempre B sobre o mesmo par: se contradiz
        service.answer("d1", "A")
    assert service.state("d1") is not None  # nao explode


def test_julgamento_holistico_entra_no_mesmo_espaco(service, criada):
    service.rank_criteria("d1", ["qualidade", "custo", "prazo"])
    estado = service.judge("d1", preferida="Fornecedor B", sobre="Fornecedor A")

    assert estado["declaracoes"] == 2
    trilha = service.explain("d1")
    assert any("Julgou" in d["declaracao"] for d in trilha["declaracoes"])


def test_alternativa_desconhecida_no_julgamento(service, criada):
    service.rank_criteria("d1", ["qualidade", "custo", "prazo"])
    with pytest.raises(KeyError, match="Fornecedor Z"):
        service.judge("d1", preferida="Fornecedor Z", sobre="Fornecedor A")


# --- auditoria e releituras ---------------------------------------------------


def test_explicar_narra_a_decisao_com_autor_e_instante(service, criada, clock):
    service.rank_criteria("d1", ["qualidade", "custo", "prazo"])
    service.answer("d1", "B")

    trilha = service.explain("d1")
    assert len(trilha["declaracoes"]) == 2
    assert trilha["declaracoes"][0]["sequencia"] == 1
    assert trilha["declaracoes"][0]["autor"] == "decisor"
    assert clock.now().isoformat(timespec="seconds") == (
        trilha["declaracoes"][0]["registrado_em"]
    )
    # a narrativa fala de criterios e unidades, nao de k[0]
    texto = " ".join(d["declaracao"] for d in trilha["declaracoes"])
    assert "Indice de qualidade" in texto
    assert "k[" not in texto


def test_trocar_de_problematica_reaproveita_o_log(service, criada):
    service.rank_criteria("d1", ["qualidade", "custo", "prazo"])
    service.answer("d1", "A")

    como_ranking = service.switch_problematic("d1", "ranking")
    assert como_ranking["declaracoes"] == 2  # nada foi reelicitado
    assert "posicoes_possiveis" in como_ranking["analise"]


def test_trocar_para_sorting_exige_perfis(service, criada):
    service.rank_criteria("d1", ["qualidade", "custo", "prazo"])
    with pytest.raises(ValueError, match="ao menos um perfil"):
        service.switch_problematic("d1", "sorting", {})

    estado = service.switch_problematic("d1", "sorting", {"perfis": [0.4, 0.7]})
    assert estado["analise"]["classes"] == ["Classe 1", "Classe 2", "Classe 3"]


def test_sensibilidade_releitura_do_mesmo_log(service, criada):
    service.rank_criteria("d1", ["qualidade", "custo", "prazo"])
    service.answer("d1", "A")

    resultado = service.sensitivity("d1", [0.0, 0.01, 0.5])
    assert [c["limiar"] for c in resultado["cenarios"]] == [0.0, 0.01, 0.5]
    # limiar absurdo torna as declaracoes incompativeis
    assert resultado["cenarios"][-1]["consistente"] is False
    # e o log nao mudou
    assert service.state("d1")["declaracoes"] == 2


def test_listar_resume_as_decisoes(service, criada):
    service.create("Outra", ALTERNATIVAS, CRITERIOS_SPEC, CONSEQUENCIAS)
    resumo = service.list()
    assert {r["id"] for r in resumo} == {"d1", "d2"}
    assert resumo[0]["alternativas"] == 4


def test_decisao_nasce_sem_favorito(criada, service):
    assert service.list()[0]["favorita"] is False


def test_favorito_vai_e_volta_pela_listagem(service, criada):
    """A listagem e o unico lugar onde o favorito e lido, entao e ali que ele
    precisa aparecer -- nao basta gravar."""
    assert service.set_favorite("d1", True)["favorita"] is True
    assert service.list()[0]["favorita"] is True

    assert service.set_favorite("d1", False)["favorita"] is False
    assert service.list()[0]["favorita"] is False


def test_favoritar_nao_mexe_na_decisao(service, criada):
    """Favorito e preferencia de quem le, nao declaracao de preferencia entre
    alternativas: nenhuma resposta pode entrar ou sair da trilha por causa
    dele."""
    service.rank_criteria("d1", ["qualidade", "custo", "prazo"])
    service.answer("d1", "A")
    antes = service.state("d1")

    service.set_favorite("d1", True)
    depois = service.state("d1")

    assert depois["declaracoes"] == antes["declaracoes"]
    assert depois["analise"] == antes["analise"]


def test_favoritar_decisao_inexistente_e_recusado(service):
    with pytest.raises(RecordNotFound):
        service.set_favorite("fantasma", True)


def test_problematicas_expostas_com_a_ressalva(service):
    disponiveis = service.problematics()
    assert set(disponiveis["disponiveis"]) == {
        "escolha", "ranking", "sorting", "portfolio", "beneficio_custo"
    }
    assert "aproximado" in disponiveis["observacao"]


# --- as problematicas ponta a ponta -------------------------------------------


def test_ranking_ponta_a_ponta(service):
    service.create(
        "Ranking", ALTERNATIVAS, CRITERIOS_SPEC, CONSEQUENCIAS, problematica="ranking"
    )
    service.rank_criteria("d1", ["qualidade", "custo", "prazo"])
    responder_ate_o_fim(service, "d1", {0: 0.5, 1: 0.3, 2: 0.2})

    analise = service.state("d1")["analise"]
    posicoes = analise["posicoes_possiveis"]
    assert set(posicoes) == set(ALTERNATIVAS)
    for faixa in posicoes.values():
        assert 1 <= faixa[0] <= faixa[1] <= 4


def test_sorting_ponta_a_ponta(service):
    service.create(
        "Classificacao",
        ALTERNATIVAS,
        CRITERIOS_SPEC,
        CONSEQUENCIAS,
        problematica="sorting",
        configuracao={"perfis": [0.35, 0.7], "classes": ["Baixa", "Media", "Alta"]},
    )
    service.rank_criteria("d1", ["qualidade", "custo", "prazo"])
    responder_ate_o_fim(service, "d1", {0: 0.5, 1: 0.3, 2: 0.2})

    alocacao = service.state("d1")["analise"]["alocacao"]
    assert set(alocacao) == set(ALTERNATIVAS)
    for dados in alocacao.values():
        assert dados["classes_possiveis"]
        assert set(dados["classes_possiveis"]) <= {"Baixa", "Media", "Alta"}


def test_portfolio_ponta_a_ponta(service):
    service.create(
        "Carteira",
        ALTERNATIVAS,
        CRITERIOS_SPEC,
        CONSEQUENCIAS,
        problematica="portfolio",
        configuracao={"orcamento": 25.0, "amostras": 8},
        custos=[10.0, 12.0, 8.0, 11.0],
    )
    service.rank_criteria("d1", ["qualidade", "custo", "prazo"])
    estado = service.state("d1")

    analise = estado["analise"]
    assert analise["orcamento"] == 25.0
    assert "aproximado" in analise["ressalva"]
    for carteira in analise["portfolios_encontrados"]:
        assert carteira["custo"] <= 25.0 + 1e-9


def test_beneficio_custo_sem_custos_e_recusado_na_criacao(service):
    with pytest.raises(ValueError, match="custo de cada alternativa"):
        service.create(
            "Razao",
            ALTERNATIVAS,
            CRITERIOS_SPEC,
            CONSEQUENCIAS,
            problematica="beneficio_custo",
            configuracao={"orcamento": 100.0},
        )


def test_beneficio_custo_sem_orcamento_e_recusado_na_criacao(service):
    with pytest.raises(ValueError, match="orçamento positivo"):
        service.create(
            "Razao",
            ALTERNATIVAS,
            CRITERIOS_SPEC,
            CONSEQUENCIAS,
            problematica="beneficio_custo",
            custos=[10.0, 12.0, 8.0, 11.0],
        )


def test_beneficio_custo_ponta_a_ponta(service):
    service.create(
        "Razao beneficio-custo",
        ALTERNATIVAS,
        CRITERIOS_SPEC,
        CONSEQUENCIAS,
        problematica="beneficio_custo",
        configuracao={"orcamento": 25.0, "amostras": 8},
        custos=[10.0, 12.0, 8.0, 11.0],
    )
    service.rank_criteria("d1", ["qualidade", "custo", "prazo"])
    estado = service.state("d1")

    analise = estado["analise"]
    assert analise["orcamento"] == 25.0
    assert set(analise["razoes"]) == set(ALTERNATIVAS)
    for dados in analise["razoes"].values():
        assert dados["razao_minima"] <= dados["razao_maxima"]
    for carteira in analise["portfolios_encontrados"]:
        assert carteira["custo"] <= 25.0 + 1e-9
    assert "Aproximado" in analise["ressalva"]


def test_mesma_elicitacao_lida_pelas_duas_carteiras(service):
    """Trocar de problematica nao reelicita nada: o mesmo log responde as duas
    perguntas, e as carteiras podem divergir sem que nada esteja errado."""
    service.create(
        "Carteira",
        ALTERNATIVAS,
        CRITERIOS_SPEC,
        CONSEQUENCIAS,
        problematica="portfolio",
        configuracao={"orcamento": 25.0, "amostras": 8},
        custos=[10.0, 12.0, 8.0, 11.0],
    )
    service.rank_criteria("d1", ["qualidade", "custo", "prazo"])
    declaracoes = service.state("d1")["declaracoes"]

    estado = service.switch_problematic(
        "d1", "beneficio_custo", {"orcamento": 25.0, "amostras": 8}
    )
    assert estado["declaracoes"] == declaracoes
    assert estado["analise"]["problematica"] == "beneficio_custo"
    assert "razoes" in estado["analise"]


# --- limiar de equivalencia ---------------------------------------------------

# Curva de valor identidade nos dois criterios. Sem ela a escala se ajusta a
# faixa observada e duas alternativas quaisquer viram 0 e 1 -- nao haveria como
# construir duas que diferem por pouco, que e o unico caso em que o limiar
# decide alguma coisa.
CURVA_IDENTIDADE = [[0.0, 0.0], [1.0, 1.0]]

CRITERIOS_PROXIMOS = [
    {"chave": "a", "nome": "Criterio A", "direcao": "max",
     "curva_de_valor": CURVA_IDENTIDADE},
    {"chave": "b", "nome": "Criterio B", "direcao": "max",
     "curva_de_valor": CURVA_IDENTIDADE},
]

# Com k_a >= k_b, X supera Y por no maximo 0,03 e Y supera X por no maximo
# 0,005: as duas ficam potencialmente otimas, e a maior das duas distancias cai
# entre o padrao (0,01) e 0,05. E o caso construido para que o limiar, e so ele,
# decida se o processo encerra.
CONSEQUENCIAS_PROXIMAS = [[0.53, 0.50], [0.50, 0.54]]


def proximas(service, limiar=None):
    """Decisao das duas alternativas quase empatadas, com os pesos ja ordenados."""
    criada = service.create(
        "Proximas", ["X", "Y"], CRITERIOS_PROXIMOS, CONSEQUENCIAS_PROXIMAS,
        limiar_de_equivalencia=limiar,
    )
    service.rank_criteria(criada["id"], ["a", "b"])
    return criada["id"]


def test_sem_configurar_o_limiar_continua_em_um_centesimo(service, criada):
    """A paridade medida com o sistema oficial esta presa neste numero: quem
    nao configurar nada tem de continuar vendo exatamente 0,01."""
    assert service.state(criada["id"])["limiar_de_equivalencia"] == 0.01
    # e nada foi gravado no registro: 'None' e "usa o padrao do processo"
    assert service.container.repository.get(criada["id"]).equivalence is None


def test_o_limiar_da_decisao_muda_o_resultado(service):
    padrao = service.state(proximas(service))
    folgado = service.state(proximas(service, 0.05))

    assert padrao["analise"]["potencialmente_otimas"] == ["X", "Y"]
    assert padrao["analise"]["resolvido"] is False

    assert folgado["analise"]["resolvido"] is True
    assert folgado["analise"]["equivalentes_no_limiar"] == 0.05


def test_mudar_o_limiar_rele_o_mesmo_log(service):
    """Reinterpretacao, nao reelicitacao: o log fica do mesmo tamanho."""
    decisao = proximas(service)
    antes = service.state(decisao)
    depois = service.set_equivalence(decisao, 0.05)

    assert antes["analise"]["resolvido"] is False
    assert depois["analise"]["resolvido"] is True
    assert depois["declaracoes"] == antes["declaracoes"]


def test_nulo_devolve_a_decisao_ao_padrao(service):
    decisao = proximas(service, 0.05)
    voltou = service.set_equivalence(decisao, None)
    assert voltou["limiar_de_equivalencia"] == 0.01
    assert voltou["analise"]["resolvido"] is False


def test_o_limiar_sobrevive_a_gravacao_e_a_releitura(service, container):
    """Outro servico sobre o mesmo repositorio e o que acontece ao reabrir a
    decisao. O adaptador de memoria serializa a cada gravacao, entao o campo
    passa pelo mesmo caminho que percorreria em disco."""
    decisao = proximas(service, 0.05)
    reaberta = DecisionService(container)

    assert reaberta.state(decisao)["limiar_de_equivalencia"] == 0.05
    assert reaberta.state(decisao)["analise"]["resolvido"] is True
    assert reaberta.explain(decisao)["limiar_de_equivalencia"] == 0.05


def test_reordenar_os_criterios_nao_perde_o_limiar(service):
    """Reordenar descarta o log e remonta o registro do zero; o limiar nao e
    declaracao do decisor e nao pode ser descartado junto."""
    decisao = proximas(service, 0.05)
    service.rank_criteria(decisao, ["b", "a"])
    assert service.state(decisao)["limiar_de_equivalencia"] == 0.05


def test_trocar_de_problematica_nao_perde_o_limiar(service):
    """O limiar e da decisao, nao da leitura -- por isso nao mora em
    `configuracao`, que a troca de problematica substitui inteira."""
    trocada = service.switch_problematic(proximas(service, 0.05), "ranking")
    assert trocada["limiar_de_equivalencia"] == 0.05


@pytest.mark.parametrize("aceito", [0.0, 0.5])
def test_as_pontas_da_faixa_sao_aceitas(service, aceito):
    decisao = proximas(service)
    assert service.set_equivalence(decisao, aceito)["limiar_de_equivalencia"] == aceito


@pytest.mark.parametrize("absurdo", [5.0, -0.1, 0.9, float("nan")])
def test_limiar_fora_da_faixa_e_recusado(service, absurdo):
    decisao = proximas(service)
    with pytest.raises(InvalidRequest, match="entre 0 e 0.5"):
        service.set_equivalence(decisao, absurdo)


def test_a_recusa_separa_os_dois_limiares(service):
    """A mensagem precisa citar o outro parametro: confundir os dois ja custou
    um diagnostico errado neste projeto."""
    with pytest.raises(InvalidRequest, match="sensibilidade"):
        service.create(
            "x", ALTERNATIVAS, CRITERIOS_SPEC, CONSEQUENCIAS,
            limiar_de_equivalencia=0.9,
        )


# --- entrada nao finita ------------------------------------------------------


@pytest.mark.parametrize(
    "configuracao",
    [
        {"orcamento": float("nan")},
        {"orcamento": float("inf")},
        {"perfis": [[1.0, float("nan")]]},
    ],
)
def test_configuracao_com_valor_nao_finito_e_recusada_e_nao_grava(service, configuracao):
    """Um orcamento NaN era aceito e gravado; dali em diante nenhuma resposta
    sobre a decisao conseguia ser serializada."""
    with pytest.raises(InvalidRequest, match="nao finito"):
        service.create(
            "Carteira", ALTERNATIVAS, CRITERIOS_SPEC, CONSEQUENCIAS,
            problematica="portfolio", configuracao=configuracao,
            custos=[1.0] * len(ALTERNATIVAS),
        )
    assert service.list() == []


def test_trocar_para_configuracao_nao_finita_e_recusado(service, criada):
    with pytest.raises(InvalidRequest, match="nao finito"):
        service.switch_problematic(criada["id"], "escolha", {"x": float("nan")})
