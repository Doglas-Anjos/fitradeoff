"""O mecanismo de veto.

O decisor declara, por criterio, um desempenho abaixo do qual a alternativa
deixa de ser aceitavel. Nao elimina ninguem: penaliza o valor global, pela
formulacao de de Almeida (2013) reproduzida em Palha et al. (2019),

    z_i(x) = 0 se v_i(x) <= l_i ; 1 se v_i(x) >= u_i ; interpolado entre eles
    V'(x)  = [ SUM_i k_i z_i(x) ] . [ SUM_i k_i v_i(x) ]

O que este arquivo protege nao e a formula em si -- e a consequencia dela para
um motor que decide por programacao linear. ``V'`` e produto de duas funcoes
lineares em ``k``, logo quadratica: o teste de dominancia deixa de ser um LP.
A saida escolhida foi o envelope ``[r_min . V_min, r_max . V_max]``, que sai de
LPs exatos e **contem** a faixa verdadeira.

Um envelope conservador tem dois erros possiveis, e eles nao valem o mesmo:
deixar de declarar uma dominancia que existe e perda de poder; declarar uma que
nao existe e mentir sobre a decisao de alguem. Os testes abaixo cobram o
segundo com dureza e aceitam o primeiro.
"""

import numpy as np
import pytest

from conftest import make_problem
from fitradeoff.domain import Criterion, Direction, Problem
from fitradeoff.domain.weights import WeightSpace, ordering_constraints
from fitradeoff.problematics import Evaluator
from fitradeoff.problematics.benefit_cost import BenefitCostProblematic
from fitradeoff.problematics.choice import ChoiceProblematic
from fitradeoff.problematics.portfolio import PortfolioProblematic
from fitradeoff.problematics.ranking import RankingProblematic
from fitradeoff.problematics.sorting import SortingProblematic
from fitradeoff.problematics.veto import RESSALVA_VETO


@pytest.fixture
def espaco():
    """Espaco de pesos so com a ordenacao declarada: k0 >= k1 >= k2."""
    return WeightSpace(3).with_constraints(
        ordering_constraints(3, (0, 1, 2), epsilon=0.0, source="ordem")
    )


def criterio(chave, *, direcao=Direction.MAX, alto=None, baixo=None, direto=False):
    """Criterio de teste.

    ``direto`` fixa a escala como a identidade em [0, 1], via curva de valor.
    Sem isso a escala se ajusta ao minimo e ao maximo observados, e a matriz de
    valor deixa de ser a que o teste escreveu -- o que basta para transformar um
    contraexemplo cuidadoso em outra coisa.
    """
    return Criterion(
        key=chave,
        name=chave,
        direction=direcao,
        veto_upper=alto,
        veto_lower=baixo,
        value_points=((0.0, 0.0), (1.0, 1.0)) if direto else None,
    )


# --- o fator por criterio -------------------------------------------------------


def test_sem_veto_o_fator_e_um():
    """A garantia que permite ligar a funcionalidade sem mexer em ninguem."""
    p = make_problem([[10.0, 1.0], [5.0, 2.0]])
    assert not p.has_veto
    assert np.array_equal(p.veto_factors, np.ones_like(p.consequences))


def test_acima_do_limite_superior_nada_muda():
    p = Problem(
        "t",
        (criterio("a", alto=80.0, baixo=60.0), criterio("b")),
        ("A", "B"),
        np.array([[90.0, 1.0], [80.0, 2.0]]),
    )
    # 90 e 80 estao no limite ou acima: aceitaveis, fator 1
    assert p.veto_factors[0, 0] == pytest.approx(1.0)
    assert p.veto_factors[1, 0] == pytest.approx(1.0)


def test_no_limite_inferior_o_criterio_deixa_de_contar():
    p = Problem(
        "t",
        (criterio("a", alto=80.0, baixo=60.0), criterio("b")),
        ("A", "B"),
        np.array([[60.0, 1.0], [90.0, 2.0]]),
    )
    assert p.veto_factors[0, 0] == pytest.approx(0.0)


def test_entre_os_limites_o_fator_cai_proporcionalmente():
    """A regiao de hesitacao do guia: nem aceitavel nem rejeitado."""
    p = Problem(
        "t",
        (criterio("a", alto=80.0, baixo=60.0), criterio("b")),
        ("A", "B"),
        np.array([[70.0, 1.0], [100.0, 2.0]]),
    )
    # a escala e linear entre o pior (70) e o melhor (100) observados, entao o
    # fator se apura em valor, nao na unidade bruta -- o que importa e que 70
    # fique estritamente entre 0 e 1
    assert 0.0 < p.veto_factors[0, 0] < 1.0


def test_criterio_de_minimizacao_le_os_limites_na_direcao_certa():
    """Em minimizacao, "acima do limite superior" quer dizer numero menor.

    Quem resolve isso e a escala, e nao um `if` sobre a direcao -- por isso o
    fator e apurado em valor.
    """
    p = Problem(
        "t",
        (criterio("dias", direcao=Direction.MIN, alto=20.0, baixo=40.0), criterio("b")),
        ("Rapido", "Lento"),
        np.array([[15.0, 1.0], [45.0, 2.0]]),
    )
    assert p.veto_factors[0, 0] == pytest.approx(1.0), "15 dias e melhor que 20"
    assert p.veto_factors[1, 0] == pytest.approx(0.0), "45 dias e pior que 40"


def test_um_limite_so_vira_degrau_sem_hesitacao():
    """O guia: sem os dois limites "you will not count the hesitation region"."""
    p = Problem(
        "t",
        (criterio("a", baixo=70.0), criterio("b")),
        ("A", "B", "C"),
        np.array([[60.0, 1.0], [70.0, 2.0], [80.0, 3.0]]),
    )
    coluna = p.veto_factors[:, 0]
    assert set(np.unique(coluna)) <= {0.0, 1.0}, "sem hesitacao, so 0 ou 1"
    assert coluna[0] == 0.0 and coluna[2] == 1.0


# --- o envelope -----------------------------------------------------------------


def test_sem_veto_o_envelope_e_a_faixa_de_valor(evaluator, espaco):
    """Ligar a funcionalidade nao pode mudar nada para quem nao a usa."""
    p = make_problem([[1.0, 0.0, 0.5], [0.0, 1.0, 0.5], [0.5, 0.5, 1.0]])
    assert evaluator.penalized_bounds(p, espaco) == evaluator.value_bounds(p, espaco)


def test_o_envelope_contem_a_faixa_verdadeira(evaluator, espaco):
    """O ponto da escolha: o intervalo e conservador, nunca estreito demais.

    Confere contra o valor penalizado calculado ponto a ponto em vertices do
    espaco -- se algum deles caisse fora do envelope, o envelope seria mentira.
    """
    p = Problem(
        "t",
        (
            criterio("a", alto=0.9, baixo=0.3),
            criterio("b"),
            criterio("c"),
        ),
        ("A", "B", "C"),
        np.array([[0.5, 1.0, 0.0], [1.0, 0.0, 0.5], [0.0, 0.5, 1.0]]),
    )
    envelopes = evaluator.penalized_bounds(p, espaco)
    vertices = evaluator.sample_weight_vertices(p, espaco, 24)
    assert len(vertices), "sem vertices nao ha o que conferir"

    for i in range(p.n_alternatives):
        for k in vertices:
            penalizado = float(k @ p.veto_factors[i]) * float(k @ p.values[i])
            assert envelopes[i].lower - 1e-9 <= penalizado <= envelopes[i].upper + 1e-9


def test_o_veto_derruba_o_teto_de_quem_e_vetado(evaluator, espaco):
    p = Problem(
        "t",
        (criterio("a", alto=0.9, baixo=0.3), criterio("b"), criterio("c")),
        ("Vetada", "Livre"),
        np.array([[0.0, 1.0, 1.0], [1.0, 1.0, 1.0]]),
    )
    com = evaluator.penalized_bounds(p, espaco)
    sem = evaluator.value_bounds(p, espaco)
    assert com[0].upper < sem[0].upper, "a vetada devia perder teto"


# --- a dominancia ---------------------------------------------------------------


def test_sem_veto_a_dominancia_continua_exata(evaluator, espaco):
    p = make_problem([[1.0, 1.0, 1.0], [0.0, 0.0, 0.0]])
    assert evaluator.vetoed_dominates(p, espaco, 0, 1)
    assert not evaluator.vetoed_dominates(p, espaco, 1, 0)


def test_ninguem_domina_a_si_mesmo(evaluator, espaco):
    p = make_problem([[1.0, 0.0, 0.5], [0.0, 1.0, 0.5]])
    assert not evaluator.vetoed_dominates(p, espaco, 0, 0)


def test_o_conservadorismo_nunca_afirma_o_que_e_falso(evaluator, espaco):
    """O erro que nao se admite.

    Para cada par declarado dominante sob veto, confere em vertices que o valor
    penalizado do dominante e de fato maior. Uma unica violacao seria uma
    afirmacao falsa sobre a decisao de alguem.
    """
    p = Problem(
        "t",
        (criterio("a", alto=0.8, baixo=0.2), criterio("b"), criterio("c")),
        ("A", "B", "C", "D"),
        np.array(
            [
                [0.9, 0.8, 0.7],
                [0.1, 0.9, 0.2],
                [0.5, 0.5, 0.5],
                [0.0, 0.1, 0.0],
            ]
        ),
    )
    vertices = evaluator.sample_weight_vertices(p, espaco, 24)
    penalizado = lambda i, k: float(k @ p.veto_factors[i]) * float(k @ p.values[i])

    declarados = 0
    for melhor in range(p.n_alternatives):
        for pior in range(p.n_alternatives):
            if not evaluator.vetoed_dominates(p, espaco, melhor, pior):
                continue
            declarados += 1
            for k in vertices:
                assert penalizado(melhor, k) >= penalizado(pior, k) - 1e-9, (
                    f"{p.alternatives[melhor]} foi declarada dominante sobre "
                    f"{p.alternatives[pior]} e perde em algum vetor de pesos"
                )
    assert declarados, "o caso precisa declarar alguma dominancia para provar algo"


def test_o_conservadorismo_custa_poder_e_isso_e_aceito(evaluator, espaco):
    """O outro lado da moeda, registrado de proposito.

    Com veto, o envelope e mais largo que a faixa real, entao pares que o teste
    exato declararia dominantes podem deixar de ser declarados. Perder poder de
    discriminacao e o preco de nunca mentir -- e o teste existe para que essa
    troca fique visivel a quem ler, e nao seja descoberta como surpresa.
    """
    p = Problem(
        "t",
        (criterio("a", alto=0.9, baixo=0.1), criterio("b"), criterio("c")),
        ("A", "B"),
        np.array([[1.0, 1.0, 1.0], [0.5, 0.5, 0.5]]),
    )
    # sem veto A domina B sem discussao
    exato = evaluator.dominates(p, espaco, 0, 1)
    sob_veto = evaluator.vetoed_dominates(p, espaco, 0, 1)
    assert exato, "o caso base precisa ter dominancia"
    # sob veto pode ou nao ser declarada; o que nao pode e inverter
    assert not evaluator.vetoed_dominates(p, espaco, 1, 0)
    if not sob_veto:
        envelopes = evaluator.penalized_bounds(p, espaco)
        assert envelopes[0].lower < envelopes[1].upper, "so o envelope justifica calar"


# --- a otimalidade potencial ------------------------------------------------------


#: Consequencias do contraexemplo, com a escala fixada em identidade.
#: ``Solida`` ganha de ``Nichada`` em todo vetor de pesos viavel -- mas so no
#: valor sem penalidade. E pessima no terceiro criterio, onde ``Nichada`` e
#: otima, e e ali que o veto morde.
CONTRAEXEMPLO = np.array([[1.0, 1.0, 0.0], [0.49, 0.49, 1.0]])


def test_o_veto_nao_descarta_alternativa_que_ainda_pode_vencer(evaluator, espaco):
    """O erro mais caro do veto, e o menos obvio.

    O LP de otimalidade potencial responde sobre o valor **sem** penalidade.
    Sob veto ele pode descartar uma alternativa que, penalizada a rival, seria a
    melhor -- e descartar e sumir com a opcao da tela antes de o decisor a ver.
    O teste constroi exatamente esse caso e exibe o vetor de pesos em que a
    descartada vence, para que o contraexemplo nao dependa de acreditar no
    envelope.
    """
    sem_veto = Problem(
        "t",
        tuple(criterio(c, direto=True) for c in "abc"),
        ("Solida", "Nichada"),
        CONTRAEXEMPLO,
    )
    assert evaluator.potentially_optimal(sem_veto, espaco) == (0,), (
        "o caso base precisa descartar Nichada, senao nao prova nada"
    )

    com_veto = Problem(
        "t",
        (
            criterio("a", direto=True),
            criterio("b", direto=True),
            criterio("c", direto=True, alto=0.3, baixo=0.2),
        ),
        ("Solida", "Nichada"),
        CONTRAEXEMPLO,
    )
    # no centro do espaco de pesos, Nichada de fato supera Solida sob veto
    k = np.array([1 / 3, 1 / 3, 1 / 3])
    penalizado = lambda i: float(k @ com_veto.veto_factors[i]) * float(
        k @ com_veto.values[i]
    )
    assert penalizado(1) > penalizado(0), "o contraexemplo perdeu a graca"

    assert 1 in evaluator.potentially_optimal(com_veto, espaco), (
        "Nichada foi descartada, e existe vetor de pesos em que ela vence"
    )


def test_sem_veto_a_otimalidade_potencial_continua_a_exata(evaluator, espaco):
    p = make_problem([[1.0, 1.0, 1.0], [0.0, 0.0, 0.0], [0.5, 0.5, 0.5]])
    assert evaluator.potentially_optimal(p, espaco) == (0,)


# --- onde o veto vale, e onde nao vale --------------------------------------------


def problema_com_veto(custos=None):
    """Duas alternativas que o envelope nao separa: seguem indefinidas.

    Escolhido assim de proposito -- um par ja decidido nao exercitaria nem a
    ressalva nem a diferenca maxima, que e onde estao as afirmacoes a proteger.
    """
    return Problem(
        "t",
        (
            criterio("a", direto=True, alto=0.8, baixo=0.2),
            criterio("b", direto=True),
            criterio("c", direto=True),
        ),
        ("Ampla", "Focada"),
        np.array([[0.85, 0.4, 0.4], [0.5, 0.9, 0.9]]),
        costs=custos,
    )


@pytest.mark.parametrize(
    "construir",
    [
        pytest.param(
            lambda ev: SortingProblematic(ev, profiles=(0.5,)), id="sorting"
        ),
        pytest.param(
            lambda ev: BenefitCostProblematic(ev, budget=10.0), id="beneficio_custo"
        ),
    ],
)
def test_as_problematicas_sem_veto_recusam_em_vez_de_calcular(
    evaluator, espaco, construir
):
    """O guia do sistema de referencia oferece o veto em escolha e ordenacao.

    Nas outras, a escolha e recusar. Calcular em silencio uma faixa que ignora o
    veto entregaria ao decisor um numero que ele leria como se tivesse veto --
    pior que nao entregar numero nenhum.
    """
    problematica = construir(evaluator)
    p = problema_com_veto(custos=(4.0, 5.0))
    with pytest.raises(ValueError, match="veto"):
        problematica.analyse(p, espaco)
    with pytest.raises(ValueError, match="veto"):
        problematica.validate(p)


def test_a_recusa_nao_atrapalha_quem_nao_usa_veto(evaluator, espaco):
    """A recusa e por veto declarado, nao por problematica."""
    sem_veto = make_problem([[0.9, 0.2, 0.7], [0.1, 0.9, 0.3]], costs=(4.0, 5.0))
    BenefitCostProblematic(evaluator, budget=10.0).validate(sem_veto)
    SortingProblematic(evaluator, profiles=(0.5,)).validate(sem_veto)


@pytest.mark.parametrize("classe", [ChoiceProblematic, RankingProblematic])
def test_escolha_e_ordenacao_aceitam_e_publicam_a_ressalva(evaluator, espaco, classe):
    """Aceitar o veto obriga a dizer como o numero foi obtido.

    Um teto conservador apresentado como se fosse exato e o resultado mentindo
    sobre a propria precisao.
    """
    analise = classe(evaluator).analyse(problema_com_veto(), espaco)
    assert analise.detail["veto_ativo"] is True
    assert analise.detail["ressalva"] == RESSALVA_VETO


@pytest.mark.parametrize("classe", [ChoiceProblematic, RankingProblematic])
def test_sem_veto_nao_aparece_ressalva_nenhuma(evaluator, espaco, classe):
    sem_veto = make_problem([[0.9, 0.2, 0.7], [0.1, 0.9, 0.3]])
    analise = classe(evaluator).analyse(sem_veto, espaco)
    assert "veto_ativo" not in analise.detail
    assert "ressalva" not in analise.detail


def test_a_diferenca_maxima_sob_veto_e_um_teto_declarado(evaluator, espaco):
    """No ranking, o numero "supera em ate" muda de natureza sob veto.

    Deixa de ser o maximo exato e passa a ser um limite superior dele. Quem
    consome precisa saber disso pelo proprio dado, e nao por leitura de codigo.
    """
    linhas = RankingProblematic(evaluator).max_differences(problema_com_veto(), espaco)
    assert linhas, "o caso precisa ter par indefinido para provar algo"
    assert all(linha["limite_superior"] for linha in linhas)

    sem_veto = make_problem([[0.9, 0.2, 0.7], [0.1, 0.9, 0.3]])
    exatas = RankingProblematic(evaluator).max_differences(sem_veto, espaco)
    assert all("limite_superior" not in linha for linha in exatas)


def test_a_analise_do_ranking_nao_calcula_diferencas_maximas(evaluator, espaco):
    """Saem sob demanda: dentro da analise custavam 80% dela com 200 alternativas."""
    sem_veto = make_problem([[0.9, 0.2, 0.7], [0.1, 0.9, 0.3]])
    analise = RankingProblematic(evaluator).analyse(sem_veto, espaco)
    assert "diferencas_maximas" not in analise.detail


# --- a coerencia dos limites ------------------------------------------------------


def test_o_par_invertido_e_recusado_no_dominio(evaluator):
    """A regra mora no `Criterion`, e nao na validacao de entrada da API.

    Invertido, `veto_factor` reordena os limites e segue -- aplicando o oposto
    do que o decisor declarou, sem aviso. A API conferia isso num validador
    Pydantic, mas o servidor MCP monta o criterio direto e escapava dele. No
    dominio, todo caminho de entrada passa pela mesma regra.
    """
    with pytest.raises(ValueError, match="invertidos"):
        Criterion("q", "Q", direction=Direction.MAX, veto_upper=10.0, veto_lower=90.0)

    with pytest.raises(ValueError, match="invertidos"):
        Criterion("d", "D", direction=Direction.MIN, veto_upper=40.0, veto_lower=20.0)

    # e os pares certos passam, nas duas direcoes
    assert Criterion("q", "Q", veto_upper=90.0, veto_lower=10.0).has_veto
    assert Criterion(
        "d", "D", direction=Direction.MIN, veto_upper=20.0, veto_lower=40.0
    ).has_veto


def test_limites_iguais_pedem_que_se_declare_um_so():
    with pytest.raises(ValueError, match="apenas um"):
        Criterion("q", "Q", veto_upper=50.0, veto_lower=50.0)


def test_um_limite_so_sempre_passa():
    """Nao ha ordem a conferir, e o degrau e uma declaracao valida."""
    assert Criterion("q", "Q", veto_lower=50.0).has_veto
    assert Criterion("q", "Q", veto_upper=50.0).has_veto


def test_numa_escala_construida_o_limite_precisa_ser_um_nivel():
    """Fora dos niveis, o erro aparecia muito depois e falava de outra coisa.

    `DiscreteScale.value_of` rebenta ao montar a matriz de valor, com uma
    mensagem sobre consequencia que nao cita veto nenhum -- e a decisao ja teria
    sido aceita e persistida.
    """
    with pytest.raises(ValueError, match="níveis declarados"):
        Criterion("q", "Q", levels=(1.0, 2.0, 3.0), veto_lower=1.5)

    assert Criterion("q", "Q", levels=(1.0, 2.0, 3.0), veto_lower=2.0).has_veto


def test_na_escala_construida_a_ordem_se_confere_pelos_niveis(evaluator, espaco):
    """A direcao nao se aplica: quem diz o que e melhor e a ordem dos niveis."""
    with pytest.raises(ValueError, match="invertidos"):
        Criterion("q", "Q", levels=(1.0, 2.0, 3.0), veto_upper=1.0, veto_lower=3.0)

    bom = Criterion("q", "Q", levels=(1.0, 2.0, 3.0), veto_upper=3.0, veto_lower=1.0)
    p = Problem(
        "t",
        (bom, criterio("b"), criterio("c")),
        ("A", "B"),
        np.array([[1.0, 0.0, 1.0], [3.0, 1.0, 0.0]]),
    )
    # o nivel pior fica com fator 0, o melhor com 1
    assert p.veto_factors[0, 0] == pytest.approx(0.0)
    assert p.veto_factors[1, 0] == pytest.approx(1.0)


def test_a_recusa_alcanca_quem_monta_o_criterio_por_dicionario():
    """O caminho do servidor MCP e o da persistencia."""
    from fitradeoff.repositories.serialization import criterion_from_dict

    with pytest.raises(ValueError, match="invertidos"):
        criterion_from_dict(
            {"chave": "q", "nome": "Q", "direcao": "max",
             "veto_superior": 10.0, "veto_inferior": 90.0}
        )
