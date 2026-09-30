"""O laco de ferramentas do agente.

Testado com um cliente Anthropic de mentira: o que interessa aqui nao e o que o
modelo escreve, e sim que o agente traduza as chamadas para os casos de uso
certos, pare quando deve, e nao derrube a conversa quando uma ferramenta falha.
"""

from dataclasses import dataclass
from typing import Any

import pytest
from fitradeoff import DecisionService, build_container

from fitradeoff_api.agent import MAX_ITERACOES, SYSTEM, TOOLS, DecisionAgent


# --- dublê do SDK -------------------------------------------------------------


@dataclass
class BlocoTexto:
    text: str
    type: str = "text"


@dataclass
class BlocoFerramenta:
    name: str
    input: dict
    id: str = "tu_1"
    type: str = "tool_use"


@dataclass
class RespostaFalsa:
    content: list
    stop_reason: str = "end_turn"


class ClienteFalso:
    """Devolve as respostas programadas, uma por chamada."""

    def __init__(self, respostas: list[RespostaFalsa]) -> None:
        self._respostas = list(respostas)
        self.chamadas: list[dict] = []
        self.messages = self

    def create(self, **kwargs: Any) -> RespostaFalsa:
        self.chamadas.append(kwargs)
        if not self._respostas:
            return RespostaFalsa(content=[BlocoTexto("acabou")])
        return self._respostas.pop(0)


@pytest.fixture
def service(tmp_path):
    return DecisionService(build_container(storage=tmp_path, epsilon=0.0))


def montar(service, respostas) -> DecisionAgent:
    agente = DecisionAgent(service=service, api_key="falsa", model="modelo-teste")
    agente._client = ClienteFalso(respostas)  # noqa: SLF001
    return agente


CRIAR = {
    "nome": "Fornecedores",
    "alternativas": ["A", "B", "C"],
    "criterios": [
        {"chave": "q", "nome": "Qualidade", "direcao": "max"},
        {"chave": "c", "nome": "Custo", "direcao": "min"},
    ],
    "consequencias": [[0.8, 12.0], [0.9, 16.0], [0.7, 10.0]],
}


# --- contrato das ferramentas -------------------------------------------------


def test_toda_ferramenta_tem_schema_estrito():
    """`strict` faz a entrada voltar validada; sem ele um argumento malformado
    vira excecao dentro do motor."""
    for ferramenta in TOOLS:
        assert ferramenta["strict"] is True
        esquema = ferramenta["input_schema"]
        assert esquema["additionalProperties"] is False
        assert "required" in esquema
        assert ferramenta["description"]


def test_instrucoes_proibem_responder_pelo_decisor():
    assert "Nunca responda uma pergunta de tradeoff pelo decisor" in SYSTEM
    assert "Nunca invente" in SYSTEM


def test_ferramentas_cobrem_o_protocolo():
    nomes = {f["name"] for f in TOOLS}
    assert {
        "criar_problema", "ordenar_criterios", "proxima_pergunta",
        "responder", "julgar", "desfazer", "situacao", "explicar",
    } <= nomes


# --- laço ---------------------------------------------------------------------


def test_resposta_sem_ferramenta_encerra_o_turno(service):
    agente = montar(service, [RespostaFalsa(content=[BlocoTexto("Olá, o que decidir?")])])
    turno = agente.conversar([{"role": "user", "content": "oi"}])

    assert turno.resposta == "Olá, o que decidir?"
    assert turno.ferramentas == []
    assert turno.decisao_id is None


def test_chamada_de_ferramenta_vira_caso_de_uso(service):
    agente = montar(service, [
        RespostaFalsa(content=[BlocoFerramenta("criar_problema", CRIAR)], stop_reason="tool_use"),
        RespostaFalsa(content=[BlocoTexto("Pronto, registrei.")]),
    ])
    turno = agente.conversar([{"role": "user", "content": "compare fornecedores"}])

    assert turno.resposta == "Pronto, registrei."
    assert [f["ferramenta"] for f in turno.ferramentas] == ["criar_problema"]
    # a decisao passou a existir de fato
    assert turno.decisao_id is not None
    assert service.describe(turno.decisao_id)["nome"] == "Fornecedores"


def test_o_id_da_decisao_criada_sobe_para_o_front(service):
    agente = montar(service, [
        RespostaFalsa(content=[BlocoFerramenta("criar_problema", CRIAR)], stop_reason="tool_use"),
        RespostaFalsa(content=[BlocoTexto("ok")]),
    ])
    turno = agente.conversar([{"role": "user", "content": "x"}])
    assert turno.decisao_id in {r["id"] for r in service.list()}


def test_varias_ferramentas_no_mesmo_turno(service):
    agente = montar(service, [
        RespostaFalsa(
            content=[
                BlocoFerramenta("listar_problematicas", {}, id="t1"),
                BlocoFerramenta("listar_problemas", {}, id="t2"),
            ],
            stop_reason="tool_use",
        ),
        RespostaFalsa(content=[BlocoTexto("ok")]),
    ])
    turno = agente.conversar([{"role": "user", "content": "x"}])
    assert [f["ferramenta"] for f in turno.ferramentas] == [
        "listar_problematicas", "listar_problemas",
    ]


def test_falha_de_ferramenta_volta_como_resultado_e_nao_derruba(service):
    """O agente precisa da mensagem para se corrigir; uma excecao aqui mataria
    a conversa inteira."""
    agente = montar(service, [
        RespostaFalsa(
            content=[BlocoFerramenta("situacao", {"id": "inexistente"})],
            stop_reason="tool_use",
        ),
        RespostaFalsa(content=[BlocoTexto("Essa decisão não existe.")]),
    ])
    turno = agente.conversar([{"role": "user", "content": "x"}])

    assert turno.resposta == "Essa decisão não existe."
    resultado = turno.ferramentas[0]["resultado"]
    assert "erro" in resultado and "nao encontrada" in resultado["erro"]


def test_ferramenta_desconhecida_nao_quebra(service):
    agente = montar(service, [
        RespostaFalsa(content=[BlocoFerramenta("inventada", {})], stop_reason="tool_use"),
        RespostaFalsa(content=[BlocoTexto("ok")]),
    ])
    turno = agente.conversar([{"role": "user", "content": "x"}])
    assert "desconhecida" in turno.ferramentas[0]["resultado"]["erro"]


def test_recusa_do_modelo_vira_mensagem_util(service):
    agente = montar(service, [RespostaFalsa(content=[], stop_reason="refusal")])
    turno = agente.conversar([{"role": "user", "content": "x"}])
    assert "Nao consigo seguir" in turno.resposta


def test_laco_tem_teto(service):
    """Sem teto, um modelo que so chama ferramentas roda para sempre."""
    infinitas = [
        RespostaFalsa(content=[BlocoFerramenta("listar_problemas", {})], stop_reason="tool_use")
        for _ in range(MAX_ITERACOES + 5)
    ]
    agente = montar(service, infinitas)
    turno = agente.conversar([{"role": "user", "content": "x"}])

    assert "deu voltas demais" in turno.resposta
    assert len(turno.ferramentas) == MAX_ITERACOES


def test_historico_cresce_com_assistente_e_resultados(service):
    agente = montar(service, [
        RespostaFalsa(content=[BlocoFerramenta("listar_problemas", {})], stop_reason="tool_use"),
        RespostaFalsa(content=[BlocoTexto("ok")]),
    ])
    turno = agente.conversar([{"role": "user", "content": "x"}])

    papeis = [m["role"] for m in turno.mensagens]
    # usuario -> assistente(tool_use) -> usuario(tool_result) -> assistente
    assert papeis == ["user", "assistant", "user", "assistant"]
    resultados = turno.mensagens[2]["content"]
    assert resultados[0]["type"] == "tool_result"
    assert resultados[0]["tool_use_id"] == "tu_1"


def test_erro_de_ferramenta_e_marcado_como_erro_no_resultado(service):
    agente = montar(service, [
        RespostaFalsa(content=[BlocoFerramenta("situacao", {"id": "nada"})], stop_reason="tool_use"),
        RespostaFalsa(content=[BlocoTexto("ok")]),
    ])
    turno = agente.conversar([{"role": "user", "content": "x"}])
    resultado = turno.mensagens[2]["content"][0]
    assert resultado["is_error"] is True


def test_o_modelo_e_o_sistema_configurados_sao_usados(service):
    agente = montar(service, [RespostaFalsa(content=[BlocoTexto("ok")])])
    agente.conversar([{"role": "user", "content": "x"}])

    enviado = agente._client.chamadas[0]  # noqa: SLF001
    assert enviado["model"] == "modelo-teste"
    assert enviado["system"] == SYSTEM
    assert len(enviado["tools"]) == len(TOOLS)


def test_decisao_existente_e_mantida_quando_nada_e_criado(service):
    criada = service.create(**CRIAR)
    agente = montar(service, [RespostaFalsa(content=[BlocoTexto("ok")])])
    turno = agente.conversar([{"role": "user", "content": "x"}], decisao_id=criada["id"])
    assert turno.decisao_id == criada["id"]


def test_fluxo_completo_pelo_agente(service):
    """Criar, ordenar e responder — o caminho que o chat percorre de verdade."""
    criada_id: dict = {}

    agente = montar(service, [
        RespostaFalsa(content=[BlocoFerramenta("criar_problema", CRIAR)], stop_reason="tool_use"),
        RespostaFalsa(content=[BlocoTexto("Qual a ordem de importância?")]),
    ])
    turno = agente.conversar([{"role": "user", "content": "compare"}])
    criada_id["id"] = turno.decisao_id

    agente = montar(service, [
        RespostaFalsa(
            content=[BlocoFerramenta("ordenar_criterios", {"id": criada_id["id"], "ordem": ["q", "c"]})],
            stop_reason="tool_use",
        ),
        RespostaFalsa(content=[BlocoTexto("Primeira pergunta…")]),
    ])
    agente.conversar([{"role": "user", "content": "qualidade primeiro"}], decisao_id=criada_id["id"])

    agente = montar(service, [
        RespostaFalsa(
            content=[BlocoFerramenta("responder", {"id": criada_id["id"], "preferencia": "A"})],
            stop_reason="tool_use",
        ),
        RespostaFalsa(content=[BlocoTexto("Registrado.")]),
    ])
    agente.conversar([{"role": "user", "content": "prefiro A"}], decisao_id=criada_id["id"])

    estado = service.state(criada_id["id"])
    assert estado["declaracoes"] == 2
    assert estado["consistente"]


def test_criar_pelo_chat_respeita_o_teto_do_acervo(service):
    """O chat e mais um caminho de criacao: passa pelo mesmo teto (injetado)."""
    from fitradeoff_mcp.teto import AcervoCheio

    def cheio():
        raise AcervoCheio("Seu acervo chegou ao limite de 1 decisoes.")

    agente = montar(service, [
        RespostaFalsa(
            content=[BlocoFerramenta("criar_problema", CRIAR)], stop_reason="tool_use"
        ),
        RespostaFalsa(content=[BlocoTexto("Acervo cheio.")]),
    ])
    agente._antes_de_criar = cheio  # noqa: SLF001
    turno = agente.conversar([{"role": "user", "content": "x"}])

    assert "limite" in turno.ferramentas[0]["resultado"]["erro"]
    assert service.list() == []
