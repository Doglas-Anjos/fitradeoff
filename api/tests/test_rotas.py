"""As rotas HTTP: cada falha do motor precisa virar o código certo.

Um 500 onde deveria haver 404 ou 409 esconde do cliente que o erro é dele, e
leva quem integra a tratar tudo como indisponibilidade do serviço.
"""

import pytest
from fastapi.testclient import TestClient

from fitradeoff_api import create_app
from fitradeoff_api.config import Settings

BASE = {
    "nome": "Fornecedores",
    "alternativas": ["A", "B", "C"],
    "criterios": [
        {"chave": "q", "nome": "Qualidade", "direcao": "max"},
        {"chave": "c", "nome": "Custo", "direcao": "min", "unidade": "R$"},
    ],
    "consequencias": [[0.8, 12.0], [0.9, 16.0], [0.7, 10.0]],
}


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("FITRADEOFF_DATA", str(tmp_path))
    from fitradeoff_api import deps

    deps.get_settings.cache_clear()
    app = create_app(Settings(storage=tmp_path))
    app.dependency_overrides[deps.get_settings] = lambda: Settings(storage=tmp_path)
    return TestClient(app)


@pytest.fixture
def decisao(client):
    return client.post("/api/decisoes", json=BASE).json()["id"]


# --- códigos de status --------------------------------------------------------


@pytest.mark.parametrize(
    "metodo,caminho,corpo",
    [
        ("get", "/api/decisoes/fantasma", None),
        ("get", "/api/decisoes/fantasma/estado", None),
        ("get", "/api/decisoes/fantasma/auditoria", None),
        ("get", "/api/decisoes/fantasma/pergunta", None),
        ("post", "/api/decisoes/fantasma/ordenacao", {"ordem": ["q", "c"]}),
        ("post", "/api/decisoes/fantasma/resposta", {"preferencia": "A"}),
        ("post", "/api/decisoes/fantasma/desfazer", {}),
        ("post", "/api/decisoes/fantasma/julgamento", {"preferida": "A", "sobre": "B"}),
        ("post", "/api/decisoes/fantasma/sensibilidade", {"limiares": [0.01]}),
        ("post", "/api/decisoes/fantasma/problematica", {"problematica": "ranking"}),
    ],
)
def test_decisao_inexistente_devolve_404(client, metodo, caminho, corpo):
    resposta = getattr(client, metodo)(caminho, **({"json": corpo} if corpo is not None else {}))
    assert resposta.status_code == 404
    assert "nao encontrada" in resposta.json()["detail"]


def test_pedido_fora_de_ordem_devolve_409(client, decisao):
    # perguntar antes de ordenar os pesos
    r = client.get(f"/api/decisoes/{decisao}/pergunta")
    assert r.status_code == 409
    assert "ordene os criterios" in r.json()["detail"]


def test_ordenacao_com_um_item_e_recusada_pelo_schema(client, decisao):
    """Uma ordenacao de um criterio so e malformada: o schema recusa antes de
    chegar ao motor, e 422 e o codigo certo para corpo invalido."""
    r = client.post(f"/api/decisoes/{decisao}/ordenacao", json={"ordem": ["q"]})
    assert r.status_code == 422


def test_ordenacao_com_criterio_inexistente_devolve_409(client, decisao):
    """Corpo bem formado, mas o pedido nao faz sentido para este problema:
    ai a mensagem precisa dizer o que falta e o que sobra."""
    r = client.post(f"/api/decisoes/{decisao}/ordenacao", json={"ordem": ["q", "inexistente"]})
    assert r.status_code == 409
    detalhe = r.json()["detail"]
    assert "inexistente" in detalhe
    assert "c" in detalhe


def test_responder_sem_pergunta_pendente_devolve_409(client, decisao):
    r = client.post(f"/api/decisoes/{decisao}/resposta", json={"preferencia": "A"})
    assert r.status_code == 409


def test_desfazer_sem_nada_a_desfazer_devolve_409(client, decisao):
    r = client.post(f"/api/decisoes/{decisao}/desfazer", json={})
    assert r.status_code == 409
    assert "Nao ha declaracao" in r.json()["detail"]


def test_alternativa_desconhecida_no_julgamento_devolve_400(client, decisao):
    client.post(f"/api/decisoes/{decisao}/ordenacao", json={"ordem": ["q", "c"]})
    r = client.post(
        f"/api/decisoes/{decisao}/julgamento", json={"preferida": "Z", "sobre": "A"}
    )
    assert r.status_code == 400
    assert "Z" in r.json()["detail"]


def test_preferencia_invalida_devolve_409(client, decisao):
    client.post(f"/api/decisoes/{decisao}/ordenacao", json={"ordem": ["q", "c"]})
    r = client.post(f"/api/decisoes/{decisao}/resposta", json={"preferencia": "talvez"})
    assert r.status_code == 409


def test_problematica_desconhecida_devolve_422_pelo_schema(client):
    r = client.post("/api/decisoes", json={**BASE, "problematica": "magica"})
    assert r.status_code == 422


def test_corpo_malformado_devolve_422(client):
    assert client.post("/api/decisoes", json={"nome": "só isso"}).status_code == 422


def test_entrada_grande_demais_devolve_413(client):
    n = 600
    r = client.post(
        "/api/decisoes",
        json={
            "nome": "grande",
            "alternativas": [f"a{i}" for i in range(n)],
            "criterios": BASE["criterios"],
            "consequencias": [[0.0, 0.0]] * n,
        },
    )
    assert r.status_code == 413


def test_sorting_sem_perfis_devolve_400(client):
    r = client.post("/api/decisoes", json={**BASE, "problematica": "sorting"})
    assert r.status_code == 400
    assert "perfil" in r.json()["detail"]


# --- validação de entrada -----------------------------------------------------


def test_alternativas_repetidas_sao_recusadas(client):
    r = client.post("/api/decisoes", json={**BASE, "alternativas": ["A", "A", "C"]})
    assert r.status_code == 422
    assert "repetidos" in str(r.json()["detail"])


def test_niveis_fora_de_ordem_sao_recusados(client):
    criterios = [
        {"chave": "q", "nome": "Q", "direcao": "max", "niveis": [3.0, 1.0, 2.0]},
        {"chave": "c", "nome": "C", "direcao": "min"},
    ]
    r = client.post("/api/decisoes", json={**BASE, "criterios": criterios})
    assert r.status_code == 422
    assert "ordenados" in str(r.json()["detail"])


def test_um_nivel_so_e_recusado(client):
    criterios = [
        {"chave": "q", "nome": "Q", "direcao": "max", "niveis": [1.0]},
        {"chave": "c", "nome": "C", "direcao": "min"},
    ]
    assert client.post("/api/decisoes", json={**BASE, "criterios": criterios}).status_code == 422


# --- caminho feliz ------------------------------------------------------------


def test_ciclo_completo(client, decisao):
    assert client.post(
        f"/api/decisoes/{decisao}/ordenacao", json={"ordem": ["q", "c"]}
    ).status_code == 200

    for _ in range(10):
        pergunta = client.get(f"/api/decisoes/{decisao}/pergunta").json()
        if pergunta.get("pergunta", "x") is None:
            break
        client.post(f"/api/decisoes/{decisao}/resposta", json={"preferencia": "A"})

    estado = client.get(f"/api/decisoes/{decisao}/estado").json()
    assert estado["encerrado"]
    assert estado["analise"]["resumo"]

    trilha = client.get(f"/api/decisoes/{decisao}/auditoria").json()
    assert len(trilha["declaracoes"]) >= 2


def test_trocar_problematica_reaproveita_o_log(client, decisao):
    client.post(f"/api/decisoes/{decisao}/ordenacao", json={"ordem": ["q", "c"]})
    client.post(f"/api/decisoes/{decisao}/resposta", json={"preferencia": "A"})

    r = client.post(f"/api/decisoes/{decisao}/problematica", json={"problematica": "ranking"})
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["declaracoes"] == 2
    assert "posicoes_possiveis" in corpo["analise"]


def test_sensibilidade_nao_altera_o_log(client, decisao):
    client.post(f"/api/decisoes/{decisao}/ordenacao", json={"ordem": ["q", "c"]})
    antes = client.get(f"/api/decisoes/{decisao}/estado").json()["declaracoes"]

    r = client.post(f"/api/decisoes/{decisao}/sensibilidade", json={"limiares": [0.0, 0.05]})
    assert r.status_code == 200
    assert len(r.json()["cenarios"]) == 2
    assert client.get(f"/api/decisoes/{decisao}/estado").json()["declaracoes"] == antes


def test_julgamento_holistico_entra_no_mesmo_espaco(client, decisao):
    client.post(f"/api/decisoes/{decisao}/ordenacao", json={"ordem": ["q", "c"]})
    r = client.post(
        f"/api/decisoes/{decisao}/julgamento", json={"preferida": "B", "sobre": "C"}
    )
    assert r.status_code == 200
    assert r.json()["declaracoes"] == 2


def test_listagem_e_problematicas(client, decisao):
    assert len(client.get("/api/decisoes").json()["decisoes"]) == 1
    disponiveis = client.get("/api/problematicas").json()["disponiveis"]
    assert set(disponiveis) == {"escolha", "ranking", "sorting", "portfolio"}


def test_saude_informa_se_o_chat_esta_disponivel(client):
    corpo = client.get("/api/saude").json()
    assert corpo["ok"] is True
    assert "chat_disponivel" in corpo


def test_chat_sem_chave_devolve_503_com_alternativa(client):
    r = client.post("/api/chat", json={"mensagens": [{"papel": "user", "texto": "oi"}]})
    assert r.status_code == 503
    assert "ANTHROPIC_API_KEY" in r.json()["detail"]


# --- curva de valor -----------------------------------------------------------


def test_curva_de_valor_muda_o_resultado(client):
    criada = client.post(
        "/api/decisoes",
        json={
            "nome": "curva",
            "alternativas": ["A", "B", "C"],
            "criterios": [
                {"chave": "p", "nome": "Prazo", "direcao": "min", "unidade": "dias"},
                {"chave": "c", "nome": "Custo", "direcao": "min"},
            ],
            "consequencias": [[12.0, 10.0], [30.0, 12.0], [45.0, 8.0]],
        },
    ).json()

    # linear: 30 dias entre 12 e 45 vale 0.4545
    assert criada["valores"]["B"]["p"] == pytest.approx(0.4545, abs=1e-3)

    r = client.post(
        f"/api/decisoes/{criada['id']}/curva-de-valor",
        json={"criterio": "p", "pontos": [[12, 1.0], [30, 0.35], [45, 0.0]]},
    )
    assert r.status_code == 200
    assert r.json()["valores"]["B"]["p"] == pytest.approx(0.35)


def test_curva_pode_ser_removida(client):
    criada = client.post("/api/decisoes", json=BASE).json()
    client.post(
        f"/api/decisoes/{criada['id']}/curva-de-valor",
        json={"criterio": "q", "pontos": [[0.7, 0.0], [0.8, 0.7], [0.9, 1.0]]},
    )
    r = client.post(
        f"/api/decisoes/{criada['id']}/curva-de-valor",
        json={"criterio": "q", "pontos": None},
    )
    assert r.status_code == 200


def test_curva_depois_de_iniciar_e_recusada(client, decisao):
    """Mudar a escala depois invalidaria as respostas ja dadas."""
    client.post(f"/api/decisoes/{decisao}/ordenacao", json={"ordem": ["q", "c"]})
    r = client.post(
        f"/api/decisoes/{decisao}/curva-de-valor",
        json={"criterio": "q", "pontos": [[0.7, 0.0], [0.9, 1.0]]},
    )
    assert r.status_code == 409
    assert "antes de ordenar" in r.json()["detail"]


def test_curva_malformada_e_recusada(client, decisao):
    r = client.post(
        f"/api/decisoes/{decisao}/curva-de-valor",
        json={"criterio": "q", "pontos": [[0.7, 0.3], [0.9, 0.9]]},
    )
    assert r.status_code == 400
    assert "pior desempenho" in r.json()["detail"]


def test_curva_de_criterio_inexistente(client, decisao):
    r = client.post(
        f"/api/decisoes/{decisao}/curva-de-valor",
        json={"criterio": "fantasma", "pontos": [[0.0, 0.0], [1.0, 1.0]]},
    )
    assert r.status_code == 400


# --- resposta "nao sei" -------------------------------------------------------


def test_nao_sei_encerra_o_par_sem_afirmar_nada(client, decisao):
    client.post(f"/api/decisoes/{decisao}/ordenacao", json={"ordem": ["q", "c"]})
    antes = client.get(f"/api/decisoes/{decisao}/auditoria").json()
    n_restricoes = len(antes["restricoes_ativas"])

    r = client.post(f"/api/decisoes/{decisao}/resposta", json={"preferencia": "não sei"})
    assert r.status_code == 200

    depois = client.get(f"/api/decisoes/{decisao}/auditoria").json()
    # a declaracao entra na trilha, mas nenhuma restricao nova entra no modelo
    assert len(depois["declaracoes"]) == len(antes["declaracoes"]) + 1
    assert len(depois["restricoes_ativas"]) == n_restricoes
    assert "Não soube comparar" in depois["declaracoes"][-1]["declaracao"]
