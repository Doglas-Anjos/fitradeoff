"""As chaves do MCP remoto: o cofre, a porta das rotas, e a volta inteira.

Tres coisas aqui nao podem passar sem teste, porque errar qualquer uma delas
nao aparece na tela -- aparece depois, em quem nao devia ter entrado:

1. o texto da chave nao pode sobrar em lugar nenhum depois da resposta que o criou;
2. revogar precisa fechar a porta de fato, e nao so apagar a linha da lista;
3. a emissao precisa estar fechada quando o servidor esta publicado.
"""

import json

import pytest
from fastapi.testclient import TestClient

from fitradeoff_api import chaves as cofre
from fitradeoff_api import create_app
from fitradeoff_api.config import Settings

LOCAL = "http://127.0.0.1:8000"
# O `TestClient` se apresenta como "testclient", que nao e loopback e por isso
# seria recusado pela porta das rotas de chave. Em uso real quem chega aqui e o
# rewrite do Next, que conecta de 127.0.0.1 -- e e isso que este par representa.
DAQUI = ("127.0.0.1", 50000)
DE_FORA = ("203.0.113.9", 41234)

CABECALHOS_MCP = {
    "Accept": "application/json, text/event-stream",
    "Content-Type": "application/json",
}


def ajustes(tmp_path, **mudancas) -> Settings:
    return Settings(storage=tmp_path / "decisoes", **mudancas)


@pytest.fixture
def local(tmp_path, monkeypatch):
    """A situacao normal: plataforma rodando no computador do decisor."""
    return ajustes(tmp_path)


def cliente_de(settings, **kwargs) -> TestClient:
    from fitradeoff_api import deps

    deps.get_settings.cache_clear()
    app = create_app(settings)
    app.dependency_overrides[deps.get_settings] = lambda: settings
    kwargs.setdefault("client", DAQUI)
    return TestClient(app, base_url=LOCAL, **kwargs)


@pytest.fixture
def cliente(local):
    with cliente_de(local) as c:
        yield c


# --- o cofre ------------------------------------------------------------------


def test_o_texto_da_chave_nao_fica_gravado(local):
    """O que o arquivo guarda nao serve para entrar."""
    chave, texto = cofre.criar(local, "Claude na web")

    gravado = cofre.caminho(local).read_text(encoding="utf-8")
    assert texto not in gravado
    assert chave.resumo in gravado
    # O prefixo fica, porque e o que distingue duas chaves na tela -- e ele
    # sozinho nao reconstitui o resto.
    assert chave.prefixo in gravado


def test_a_chave_criada_abre_o_acervo_e_a_invalida_nao(local):
    _, texto = cofre.criar(local, "Cursor")
    resolve = cofre.resolver(local)

    assert resolve(texto) == local.storage
    assert resolve("fit_inventada") is None
    assert resolve("") is None


def test_revogar_fecha_a_porta(local):
    chave, texto = cofre.criar(local, "Notebook velho")
    assert cofre.resolver(local)(texto) == local.storage

    assert cofre.revogar(local, chave.id) is True
    assert cofre.resolver(local)(texto) is None
    assert cofre.revogar(local, chave.id) is False


def test_uma_chave_revogada_nao_derruba_as_outras(local):
    primeira, texto_primeira = cofre.criar(local, "Primeira")
    _, texto_segunda = cofre.criar(local, "Segunda")

    cofre.revogar(local, primeira.id)

    resolve = cofre.resolver(local)
    assert resolve(texto_primeira) is None
    assert resolve(texto_segunda) == local.storage


def test_rotulo_vazio_e_limite_recusados(local):
    with pytest.raises(ValueError):
        cofre.criar(local, "   ")
    with pytest.raises(ValueError):
        cofre.criar(local, "x" * (cofre.LIMITE_ROTULO + 1))


def test_teto_de_chaves(local):
    for i in range(cofre.LIMITE):
        cofre.criar(local, f"Chave {i}")
    with pytest.raises(ValueError):
        cofre.criar(local, "A que passa do teto")


def test_arquivo_corrompido_nao_derruba_a_tela(local):
    cofre.criar(local, "Antes da queda de energia")
    cofre.caminho(local).write_text('{"chaves": [{"id"', encoding="utf-8")

    # Perde chaves, que se regeram; nao perde acesso a decisao alguma, e a tela
    # abre.
    assert cofre.listar(local) == []
    assert cofre.resolver(local)("qualquer") is None


def test_ultimo_uso_e_registrado_uma_vez_por_minuto(local, monkeypatch):
    """Sem a granularidade, uma conversa de vinte perguntas seriam vinte escritas."""
    _, texto = cofre.criar(local, "Claude na web")
    resolve = cofre.resolver(local)

    gravacoes = 0
    original = cofre._gravar

    def contando(settings, chaves):
        nonlocal gravacoes
        gravacoes += 1
        original(settings, chaves)

    monkeypatch.setattr(cofre, "_gravar", contando)

    resolve(texto)
    assert gravacoes == 1
    assert cofre.listar(local)[0].ultimo_uso is not None

    resolve(texto)
    resolve(texto)
    assert gravacoes == 1, "o mesmo minuto nao se registra de novo"


# --- as rotas -----------------------------------------------------------------


def test_emitir_devolve_o_texto_uma_vez_e_a_lista_nunca(cliente):
    criada = cliente.post("/api/chaves", json={"rotulo": "Claude na web"})
    assert criada.status_code == 201
    texto = criada.json()["texto"]
    assert texto.startswith(cofre.PREFIXO)

    listagem = cliente.get("/api/chaves").json()
    assert [c["rotulo"] for c in listagem["chaves"]] == ["Claude na web"]
    assert texto not in json.dumps(listagem)
    assert "resumo" not in listagem["chaves"][0]


def test_a_listagem_diz_para_onde_apontar_o_cliente(cliente, local):
    listagem = cliente.get("/api/chaves").json()
    assert listagem["url"] == local.mcp_url
    assert listagem["publicado"] is False
    assert listagem["aviso"] is None


def test_revogar_pela_rota(cliente):
    id = cliente.post("/api/chaves", json={"rotulo": "Temporaria"}).json()["chave"]["id"]

    assert cliente.delete(f"/api/chaves/{id}").status_code == 200
    assert cliente.get("/api/chaves").json()["chaves"] == []
    assert cliente.delete(f"/api/chaves/{id}").status_code == 404


def test_rotulo_invalido_recusado_pela_rota(cliente):
    assert cliente.post("/api/chaves", json={"rotulo": ""}).status_code == 422
    assert cliente.post("/api/chaves", json={"rotulo": "x" * 61}).status_code == 422


# --- a porta ------------------------------------------------------------------


def test_de_fora_nao_emite_sem_token_configurado(local):
    """Administrar de longe e uma decisao: precisa ser configurada antes."""
    with cliente_de(local, client=DE_FORA) as c:
        resposta = c.get("/api/chaves")
        assert resposta.status_code == 503
        assert "FITRADEOFF_ADMIN_TOKEN" in resposta.json()["detail"]
        assert c.post("/api/chaves", json={"rotulo": "Alheia"}).status_code == 503


def test_publicar_nao_atrapalha_quem_emite_do_proprio_computador(tmp_path):
    """O caminho do tunel: o MCP sai para o mundo, a emissao fica aqui.

    A regra ja foi mais apertada -- publicado exigia token ate no loopback -- e
    isso quebrava exatamente este caso, que e o primeiro que alguem tenta.
    """
    publicado = ajustes(
        tmp_path,
        mcp_hosts=["fit.exemplo.org"],
        mcp_url="https://fit.exemplo.org/mcp",
    )
    with cliente_de(publicado) as c:
        listagem = c.get("/api/chaves")
        assert listagem.status_code == 200
        assert listagem.json()["publicado"] is True
        assert c.post("/api/chaves", json={"rotulo": "Claude na web"}).status_code == 201


SEGREDO_DO_DONO = "segredo-do-dono-" + "x" * 32


def test_de_fora_exige_o_token_de_administracao(tmp_path):
    configurado = ajustes(tmp_path, admin_token=SEGREDO_DO_DONO)
    with cliente_de(configurado, client=DE_FORA) as c:
        # 403 e nao 401: falta permissao, nao sessao. Com 401 a tela tratava
        # como sessao encerrada e mandava a pessoa, ja logada, de volta ao login.
        assert c.get("/api/chaves").status_code == 403
        assert (
            c.get("/api/chaves", headers={"X-Fitradeoff-Admin": "chute"}).status_code
            == 403
        )
        assert (
            c.get(
                "/api/chaves", headers={"X-Fitradeoff-Admin": SEGREDO_DO_DONO}
            ).status_code
            == 200
        )


def test_token_de_administracao_curto_nao_abre_a_emissao(tmp_path):
    """Atras da aplicacao da frente, esta rota e publica e sem limite de tentativas."""
    curto = ajustes(tmp_path, admin_token="segredo")
    with cliente_de(curto, client=DE_FORA) as c:
        r = c.get("/api/chaves", headers={"X-Fitradeoff-Admin": "segredo"})
    assert r.status_code == 503
    assert "curto demais" in r.json()["detail"]


def test_avisa_quando_a_url_publica_nao_foi_declarada(tmp_path):
    """O 421 do SDK nao menciona MCP, nem chave, nem variavel de ambiente."""
    incoerente = ajustes(tmp_path, mcp_url="https://fit.exemplo.org/mcp")
    with cliente_de(incoerente) as c:
        aviso = c.get("/api/chaves").json()["aviso"]
    assert aviso is not None
    assert "FITRADEOFF_MCP_HOSTS" in aviso


# --- a volta inteira ----------------------------------------------------------


def test_a_chave_emitida_na_tela_abre_o_mcp(cliente):
    """O que a tela promete: gere aqui, cole no cliente, e as ferramentas aparecem."""
    texto = cliente.post("/api/chaves", json={"rotulo": "Claude na web"}).json()["texto"]

    pedido = {"jsonrpc": "2.0", "id": 1, "method": "tools/list"}
    recusado = cliente.post("/mcp", json=pedido, headers=CABECALHOS_MCP)
    assert recusado.status_code == 401

    aberto = cliente.post(
        "/mcp",
        json=pedido,
        headers={**CABECALHOS_MCP, "Authorization": f"Bearer {texto}"},
    )
    assert aberto.status_code == 200
    assert "create_problem" in aberto.text

    # E revogar fecha, sem reiniciar nada.
    id = cliente.get("/api/chaves").json()["chaves"][0]["id"]
    cliente.delete(f"/api/chaves/{id}")
    depois = cliente.post(
        "/mcp",
        json=pedido,
        headers={**CABECALHOS_MCP, "Authorization": f"Bearer {texto}"},
    )
    assert depois.status_code == 401


# --- sem navegador ------------------------------------------------------------


def test_o_cli_emite_lista_e_revoga(tmp_path, monkeypatch, capsys):
    """O caminho de quem administra um servidor publicado: um comando, por SSH."""
    monkeypatch.setenv("FITRADEOFF_DATA", str(tmp_path / "decisoes"))

    assert cofre._cli(["criar", "Claude na web"]) == 0
    texto = capsys.readouterr().out.splitlines()[0].strip()
    assert texto.startswith(cofre.PREFIXO)

    # A chave emitida pelo comando vale no servidor, como qualquer outra.
    settings = Settings(storage=tmp_path / "decisoes")
    assert cofre.resolver(settings)(texto) == settings.storage

    assert cofre._cli(["listar"]) == 0
    listagem = capsys.readouterr().out
    assert "Claude na web" in listagem
    assert texto not in listagem, "a listagem nunca mostra a chave inteira"

    id = cofre.listar(settings)[0].id
    assert cofre._cli(["revogar", id]) == 0
    assert cofre.resolver(settings)(texto) is None


def test_o_cli_recusa_rotulo_vazio_sem_estourar(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("FITRADEOFF_DATA", str(tmp_path / "decisoes"))

    assert cofre._cli(["criar", "   "]) == 1
    assert "Erro" in capsys.readouterr().out


def test_o_cli_avisa_quando_a_chave_nao_existe(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("FITRADEOFF_DATA", str(tmp_path / "decisoes"))

    assert cofre._cli(["revogar", "nao-existe"]) == 1
    assert "nao encontrada" in capsys.readouterr().out


# --- chaves por pessoa ----------------------------------------------------------
#
# Com o FasorX autenticando na frente, qualquer pessoa logada emite a PROPRIA
# chave, e ela abre so o acervo dessa pessoa -- o mesmo que ela ve na tela.

EMISSOR = "https://principal.exemplo.org"


def com_identidade(tmp_path, **mudancas) -> Settings:
    return ajustes(
        tmp_path,
        jwt_secret="segredo-compartilhado-entre-as-duas-aplicacoes",
        jwt_issuer=EMISSOR,
        jwt_audience="fitradeoff-mcp",
        **mudancas,
    )


def portador(settings: Settings, pessoa: str) -> dict[str, str]:
    import time

    import jwt

    assinado = jwt.encode(
        {"sub": pessoa, "iss": EMISSOR, "aud": "fitradeoff-mcp", "exp": int(time.time()) + 300},
        settings.jwt_secret,
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {assinado}"}


def test_pessoa_logada_emite_a_propria_chave_sem_token_de_admin(tmp_path):
    from fitradeoff_api import identidade

    s = com_identidade(tmp_path)
    with cliente_de(s, client=DE_FORA) as c:
        r = c.post("/api/chaves", json={"rotulo": "Claude"}, headers=portador(s, "fasorx:1"))
    assert r.status_code == 201
    texto = r.json()["texto"]

    # A chave abre o acervo DESSA pessoa -- o mesmo diretorio que a API abre
    # para o token dela. E nao o acervo do dono da plataforma.
    abre = cofre.resolver(s)(texto)
    assert abre == identidade.acervo_de(s, EMISSOR, "fasorx:1")
    assert abre != s.storage


def test_cada_pessoa_ve_e_revoga_so_as_proprias(tmp_path):
    s = com_identidade(tmp_path)
    ana, bia = portador(s, "fasorx:1"), portador(s, "fasorx:2")
    with cliente_de(s, client=DE_FORA) as c:
        id_ana = c.post("/api/chaves", json={"rotulo": "da Ana"}, headers=ana).json()["chave"]["id"]

        assert [k["rotulo"] for k in c.get("/api/chaves", headers=ana).json()["chaves"]] == ["da Ana"]
        assert c.get("/api/chaves", headers=bia).json()["chaves"] == []

        # A Bia nao revoga a chave da Ana -- e o 404 nao confirma que o id existe.
        assert c.delete(f"/api/chaves/{id_ana}", headers=bia).status_code == 404
        assert c.delete(f"/api/chaves/{id_ana}", headers=ana).status_code == 200


def test_chave_do_dono_continua_abrindo_o_acervo_principal_e_nao_aparece_para_pessoas(tmp_path):
    s = com_identidade(tmp_path)
    chave_do_dono, texto = cofre.criar(s, "linha de comando")
    assert cofre.resolver(s)(texto) == s.storage
    with cliente_de(s, client=DE_FORA) as c:
        lista = c.get("/api/chaves", headers=portador(s, "fasorx:1")).json()["chaves"]
    assert chave_do_dono.id not in [k["id"] for k in lista]


def test_token_invalido_leva_401_e_sem_token_vale_a_regra_do_admin(tmp_path):
    s = com_identidade(tmp_path)
    with cliente_de(s, client=DE_FORA) as c:
        invalido = c.get("/api/chaves", headers={"Authorization": "Bearer nao-e-jwt"})
        assert invalido.status_code == 401
        # Sem token e sem FITRADEOFF_ADMIN_TOKEN: a emissao das chaves do DONO
        # segue fechada, como antes.
        assert c.get("/api/chaves").status_code == 503


def test_teto_de_chaves_por_pessoa(tmp_path):
    s = com_identidade(tmp_path)
    dono = "a" * 32
    for i in range(cofre.LIMITE_POR_PESSOA):
        cofre.criar(s, f"chave {i}", dono)
    with pytest.raises(ValueError, match="Limite"):
        cofre.criar(s, "uma a mais", dono)
    # O teto e de cada um: outra pessoa ainda emite.
    cofre.criar(s, "de outra pessoa", "b" * 32)


def test_dono_adulterado_no_arquivo_nao_abre_nada(tmp_path):
    """Um "../" gravado no dono nao pode apontar para fora de /dados/pessoas."""
    s = com_identidade(tmp_path)
    _, texto = cofre.criar(s, "legitima", "c" * 32)
    arquivo = cofre.caminho(s)
    bruto = json.loads(arquivo.read_text(encoding="utf-8"))
    bruto["chaves"][0]["dono"] = "../../etc"
    arquivo.write_text(json.dumps(bruto), encoding="utf-8")
    assert cofre.resolver(s)(texto) is None


def test_criar_recusa_dono_fora_do_formato(tmp_path):
    s = com_identidade(tmp_path)
    with pytest.raises(ValueError):
        cofre.criar(s, "x", "../fora")


def test_decisao_criada_pelo_assistente_aparece_na_tela_de_quem_emitiu_a_chave(tmp_path):
    """A promessa da tela Conectar, de ponta a ponta, com duas pessoas.

    A Ana emite a chave na tela (com o token do FasorX), o assistente dela cria
    uma decisao pelo MCP com essa chave, e a decisao aparece na lista da Ana --
    e nao na da Bia, nem no acervo do dono da plataforma.
    """
    from fitradeoff_api.mcp_remoto import create_mcp_app

    s = com_identidade(tmp_path)
    ana, bia = portador(s, "fasorx:1"), portador(s, "fasorx:2")

    with cliente_de(s, client=DE_FORA) as api:
        texto = api.post("/api/chaves", json={"rotulo": "Claude da Ana"}, headers=ana).json()["texto"]

    criar = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "create_problem",
            "arguments": {
                "nome": "Decisao da Ana",
                "alternativas": ["A", "B", "C"],
                "criterios": [
                    {"chave": "q", "nome": "Qualidade", "direcao": "max"},
                    {"chave": "c", "nome": "Custo", "direcao": "min"},
                ],
                "consequencias": [[0.8, 10.0], [0.9, 15.0], [0.7, 8.0]],
            },
        },
    }
    with TestClient(create_mcp_app(s), base_url="http://127.0.0.1:8765", client=DE_FORA) as mcp:
        r = mcp.post("/mcp", json=criar, headers={**CABECALHOS_MCP, "Authorization": f"Bearer {texto}"})
        assert r.status_code == 200, r.text

    with cliente_de(s, client=DE_FORA) as api:
        da_ana = api.get("/api/decisoes", headers=ana)
        da_bia = api.get("/api/decisoes", headers=bia)
    assert da_ana.status_code == 200
    assert "Decisao da Ana" in da_ana.text
    assert "Decisao da Ana" not in da_bia.text
    assert not s.storage.exists(), "nada pode ir para o acervo do dono da plataforma"


def test_endereco_do_mcp_vem_do_dominio_publico_quando_a_url_nao_foi_declarada(monkeypatch):
    """Em producao a tela mostrava http://127.0.0.1:8000/mcp/... para colar no assistente."""
    from fitradeoff_api.config import _mcp_url

    monkeypatch.delenv("FITRADEOFF_MCP_URL", raising=False)
    monkeypatch.setenv("FITRADEOFF_MCP_HOSTS", "fitradeoff.fasorx.com.br")
    assert _mcp_url() == "https://fitradeoff.fasorx.com.br/mcp"

    # Vazio (como o compose passa quando nao declarado) conta como ausente.
    monkeypatch.setenv("FITRADEOFF_MCP_URL", "")
    assert _mcp_url() == "https://fitradeoff.fasorx.com.br/mcp"

    # Declarada, vence -- e a barra final sai.
    monkeypatch.setenv("FITRADEOFF_MCP_URL", "https://outro.exemplo.org/mcp/")
    assert _mcp_url() == "https://outro.exemplo.org/mcp"

    # Sem nada publico declarado: o endereco local, para o desenvolvimento.
    monkeypatch.delenv("FITRADEOFF_MCP_URL")
    monkeypatch.setenv("FITRADEOFF_MCP_HOSTS", "127.0.0.1:8765,localhost")
    assert _mcp_url() == "http://127.0.0.1:8000/mcp"
