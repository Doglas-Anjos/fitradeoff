"""Os DTOs definem o contrato de saida: o formato precisa ser estavel."""

import pytest

from conftest import ALTERNATIVAS, CONSEQUENCIAS, CRITERIOS_SPEC
from fitradeoff import DecisionService
from fitradeoff.application import (
    AnalysisDTO,
    AuditDTO,
    ProblemDTO,
    QuestionDTO,
    StateDTO,
    analysis_dto,
    audit_dto,
    problem_dto,
    question_dto,
    state_dto,
    summary_dto,
)


@pytest.fixture
def service(container):
    return DecisionService(container)


@pytest.fixture
def iniciada(service):
    criada = service.create("Fornecedores", ALTERNATIVAS, CRITERIOS_SPEC, CONSEQUENCIAS)
    service.rank_criteria(criada["id"], ["qualidade", "custo", "prazo"])
    return criada["id"]


def load(service, record_id):
    record = service.container.repository.get(record_id)
    return record, service.container.session_for(record)


# --- tipos --------------------------------------------------------------------


def test_views_devolvem_dto_tipado_e_nao_dicionario_solto(service, iniciada):
    record, session = load(service, iniciada)

    assert isinstance(problem_dto(record), ProblemDTO)
    assert isinstance(state_dto(record, session), StateDTO)
    assert isinstance(audit_dto(record, session), AuditDTO)
    assert isinstance(analysis_dto(session.analyse()), AnalysisDTO)
    assert isinstance(question_dto(record.id, session.present_question()), QuestionDTO)


def test_dto_e_imutavel(service, iniciada):
    record, _ = load(service, iniciada)
    dto = problem_dto(record)
    with pytest.raises(Exception):  # FrozenInstanceError
        dto.nome = "outro"


def test_campo_inexistente_e_erro_na_construcao_nao_em_producao():
    with pytest.raises(TypeError):
        AnalysisDTO(
            problematica="escolha", resolvido=True, indefinidas=[],
            resumo="x", campo_que_nao_existe=1,
        )


# --- serializacao -------------------------------------------------------------


def test_campos_nulos_nao_poluem_a_resposta(service, iniciada):
    """Um estado sem analise nao deve devolver 'analise': null."""
    criada = service.create("Nova", ALTERNATIVAS, CRITERIOS_SPEC, CONSEQUENCIAS)
    record, session = load(service, criada["id"])
    payload = state_dto(record, session).to_dict()

    assert "analise" not in payload
    assert "aviso" not in payload
    assert payload["proximo_passo"]  # este sim esta presente


def test_estado_iniciado_traz_analise_e_faixas(service, iniciada):
    record, session = load(service, iniciada)
    payload = state_dto(record, session).to_dict()

    assert payload["elicitacao_iniciada"] is True
    assert payload["consistente"] is True
    assert payload["analise"]["problematica"] == "escolha"
    assert set(payload["faixas_de_peso"]) == {
        "Indice de qualidade", "Custo unitario", "Prazo de entrega"
    }


def test_detalhe_da_analise_sobe_para_o_topo(service, iniciada):
    """O agente le com menos cerimonia se o detalhe nao fica aninhado."""
    record, session = load(service, iniciada)
    payload = analysis_dto(session.analyse()).to_dict()

    assert "potencialmente_otimas" in payload  # veio de detail
    assert "resumo" in payload
    assert "detalhe" not in payload


def test_problema_omite_custos_quando_nao_ha(service, iniciada):
    record, _ = load(service, iniciada)
    assert "custos" not in problem_dto(record).to_dict()


def test_problema_traz_custos_quando_ha(service):
    criada = service.create(
        "Carteira", ALTERNATIVAS, CRITERIOS_SPEC, CONSEQUENCIAS,
        problematica="portfolio", configuracao={"orcamento": 20.0},
        custos=[1.0, 2.0, 3.0, 4.0],
    )
    record, _ = load(service, criada["id"])
    payload = problem_dto(record).to_dict()
    assert payload["custos"] == dict(zip(ALTERNATIVAS, [1.0, 2.0, 3.0, 4.0]))


def test_pergunta_serializa_todos_os_campos(service, iniciada):
    record, session = load(service, iniciada)
    payload = question_dto(record.id, session.present_question()).to_dict()

    assert set(payload) == {
        "id", "enunciado", "criterio_em_foco", "criterio_rival",
        "opcao_a", "opcao_b", "posicao_na_escala", "como_responder",
    }


def test_trilha_declara_que_autoria_nao_e_autenticada(service, iniciada):
    record, session = load(service, iniciada)
    payload = audit_dto(record, session).to_dict()
    assert "nao autenticado" in payload["nota_sobre_autoria"]


def test_resumo_da_listagem(service, iniciada):
    record, _ = load(service, iniciada)
    payload = summary_dto(record).to_dict()
    assert payload == {
        "id": iniciada, "nome": "Fornecedores", "problematica": "escolha",
        "alternativas": 4, "criterios": 3, "declaracoes": 1,
    }


# --- o servico devolve exatamente o que os DTOs definem -----------------------


def test_servico_devolve_o_mesmo_que_os_dto(service, iniciada):
    record, session = load(service, iniciada)
    assert service.state(iniciada) == state_dto(record, session).to_dict()
    assert service.describe(iniciada) == problem_dto(record).to_dict()
    assert service.explain(iniciada) == audit_dto(record, session).to_dict()
