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


def test_marcar_uso_nao_ressuscita_chave_revogada_no_meio(local, monkeypatch):
    """A revogacao que chega entre a leitura e a gravacao do uso fica valendo."""
    import threading
    import time

    chave, texto = cofre.criar(local, "Notebook roubado")
    original = cofre._ler
    revogacao: list[threading.Thread] = []

    def lendo_e_deixando_revogar(settings, estrito=False):
        lidas = original(settings, estrito=estrito)
        if not revogacao and threading.current_thread() is threading.main_thread():
            # Dentro da marcacao de uso: outra thread revoga agora, enquanto a
            # lista lida ainda contem a chave.
            t = threading.Thread(target=cofre.revogar, args=(local, chave.id))
            revogacao.append(t)
            t.start()
            time.sleep(0.3)
        return lidas

    monkeypatch.setattr(cofre, "_ler", lendo_e_deixando_revogar)
    cofre._marcar_uso(local, chave.id, cofre.datetime.now(cofre.timezone.utc))
    revogacao[0].join(timeout=15)
    monkeypatch.setattr(cofre, "_ler", original)

    assert cofre.listar(local) == []
    assert cofre.resolver(local)(texto) is None


def test_emissoes_simultaneas_nao_se_apagam(local):
    """Sem trava, duas emissoes lendo a mesma lista gravam uma por cima da outra."""
    import threading

    erros: list[BaseException] = []

    def emitir(nome: str) -> None:
        for i in range(8):
            try:
                cofre.criar(local, f"{nome} {i}")
            except BaseException as exc:  # noqa: BLE001
                erros.append(exc)

    threads = [threading.Thread(target=emitir, args=(f"t{n}",)) for n in range(3)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=60)

    assert erros == []
    assert len(cofre.listar(local)) == 24


def test_gravacao_nao_depende_de_um_provisorio_de_nome_fixo(local):
    """Um nome fixo seria dividido por duas gravacoes simultaneas."""
    cofre.criar(local, "Primeira")
    # Ocupa o nome que a versao antiga usava: com provisorio unico, nao importa.
    (cofre.caminho(local).parent / "chaves.json.parcial").mkdir()
    cofre.criar(local, "Segunda")
    assert len(cofre.listar(local)) == 2
    assert not list(cofre.caminho(local).parent.glob("chaves.json.*.parcial"))


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


def portador(settings: Settings, pessoa: str, idade: int = 0) -> dict[str, str]:
    import time

    import jwt

    assinado = jwt.encode(
        {
            "sub": pessoa,
            "iss": EMISSOR,
            "aud": "fitradeoff-mcp",
            "exp": int(time.time()) + 300,
            # O FasorX sempre manda iat; a emissao de chave exige que seja recente.
            "iat": int(time.time()) - idade,
        },
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


# --- validade -------------------------------------------------------------------


def _reescrever(settings, mudar) -> None:
    """Altera o cofre gravado registro a registro, como um arquivo antigo estaria."""
    arquivo = cofre.caminho(settings)
    bruto = json.loads(arquivo.read_text(encoding="utf-8"))
    for registro in bruto["chaves"]:
        mudar(registro)
    arquivo.write_text(json.dumps(bruto), encoding="utf-8")


def test_toda_chave_nasce_com_validade(local):
    from datetime import datetime, timedelta, timezone

    chave, _ = cofre.criar(local, "Claude na web", "a" * 32)
    vence = datetime.fromisoformat(chave.expira_em)
    esperado = datetime.now(timezone.utc) + timedelta(days=local.chave_dias)
    assert abs((vence - esperado).total_seconds()) < 60
    assert chave.publica()["expira_em"] == chave.expira_em

    # A do dono tambem vence por padrao...
    do_dono, _ = cofre.criar(local, "linha de comando")
    assert do_dono.expira_em is not None
    # ...e so deixa de vencer quando ele pede, explicitamente.
    eterna, _ = cofre.criar(local, "CI", dias=0)
    assert eterna.expira_em is None
    assert eterna.publica()["expira_em"] is None


def test_chave_de_pessoa_nao_pode_ser_eterna(local):
    with pytest.raises(ValueError, match="validade"):
        cofre.criar(local, "x", "a" * 32, dias=0)
    with pytest.raises(ValueError):
        cofre.criar(local, "x", dias=-1)


def test_chave_vencida_nao_abre_e_nao_ganha_carimbo(local):
    _, texto = cofre.criar(local, "Notebook", "a" * 32)
    _reescrever(local, lambda r: r.update(expira_em="2000-01-01T00:00:00+00:00"))

    assert cofre.resolver(local)(texto) is None
    [chave] = cofre.listar(local, "a" * 32)
    assert chave.ultimo_uso is None, "recusada nao pode aparecer como em uso"
    assert chave.vencida()


def test_chave_de_pessoa_antiga_vence_90_dias_depois_de_criada(local):
    """Regra das chaves gravadas antes de ``expira_em`` existir."""
    from datetime import datetime, timedelta, timezone

    _, recente = cofre.criar(local, "recente", "a" * 32)
    _, velha = cofre.criar(local, "velha", "b" * 32)
    agora = datetime.now(timezone.utc)
    ha_89 = (agora - timedelta(days=89)).isoformat(timespec="seconds")
    ha_91 = (agora - timedelta(days=91)).isoformat(timespec="seconds")

    def legado(registro):
        registro.pop("expira_em", None)
        registro["criada_em"] = ha_89 if registro["rotulo"] == "recente" else ha_91

    _reescrever(local, legado)
    resolve = cofre.resolver(local)
    assert resolve(recente) is not None
    assert resolve(velha) is None

    [antiga] = cofre.listar(local, "b" * 32)
    esperado = datetime.fromisoformat(ha_91) + timedelta(days=90)
    assert antiga.publica()["expira_em"] == esperado.isoformat(timespec="seconds")


def test_chave_antiga_do_dono_continua_sem_prazo(local):
    _, texto = cofre.criar(local, "linha de comando")

    def legado(registro):
        registro.pop("expira_em", None)
        registro["criada_em"] = "2020-01-01T00:00:00+00:00"

    _reescrever(local, legado)
    assert cofre.resolver(local)(texto) == local.storage
    assert cofre.listar(local)[0].publica()["expira_em"] is None


def test_a_lista_da_rota_mostra_o_vencimento(cliente):
    cliente.post("/api/chaves", json={"rotulo": "Claude"})
    [chave] = cliente.get("/api/chaves").json()["chaves"]
    assert chave["expira_em"]


def test_vencida_nao_conta_no_teto_e_some_depois_da_purga(local):
    from datetime import datetime, timedelta, timezone

    dono = "a" * 32
    for i in range(cofre.LIMITE_POR_PESSOA):
        cofre.criar(local, f"chave {i}", dono)
    agora = datetime.now(timezone.utc)
    ontem = (agora - timedelta(days=1)).isoformat(timespec="seconds")
    _reescrever(local, lambda r: r.update(expira_em=ontem))

    # As dez vencidas nao ocupam vaga, e continuam listadas como vencidas.
    cofre.criar(local, "nova", dono)
    assert len(cofre.listar(local, dono)) == cofre.LIMITE_POR_PESSOA + 1

    velho = (agora - cofre.PURGA - timedelta(days=1)).isoformat(timespec="seconds")

    def envelhecer(registro):
        if registro["rotulo"] != "nova":
            registro["expira_em"] = velho

    _reescrever(local, envelhecer)
    cofre.criar(local, "mais uma", dono)
    assert {c.rotulo for c in cofre.listar(local, dono)} == {"nova", "mais uma"}


def test_cli_aceita_dias(local, monkeypatch, capsys):
    monkeypatch.setattr("fitradeoff_api.config.load_settings", lambda: local)
    assert cofre._cli(["criar", "CI", "--dias", "0"]) == 0
    assert "sem prazo" in capsys.readouterr().out
    assert cofre._cli(["criar", "Notebook", "--dias", "7"]) == 0
    assert cofre._cli(["listar"]) == 0
    saida = capsys.readouterr().out
    assert "sem prazo" in saida and "vence " in saida


# --- emissao com token recente -------------------------------------------------


def test_token_velho_nao_emite_chave(tmp_path):
    """Um token de 5 minutos vazado nao pode virar uma chave de 90 dias."""
    s = com_identidade(tmp_path)
    with cliente_de(s, client=DE_FORA) as c:
        velho = portador(s, "fasorx:1", idade=s.chave_token_recente_s + 30)
        r = c.post("/api/chaves", json={"rotulo": "Claude"}, headers=velho)
        assert r.status_code == 403
        assert "Entre de novo para emitir uma chave" in r.json()["detail"]
        # O mesmo token segue valendo para listar e revogar: so a emissao exige
        # sessao confirmada agora.
        assert c.get("/api/chaves", headers=velho).status_code == 200

        novo = portador(s, "fasorx:1")
        assert c.post("/api/chaves", json={"rotulo": "Claude"}, headers=novo).status_code == 201
    assert cofre.listar(s) == []  # nada foi parar no acervo do dono


def test_token_sem_iat_nao_emite_chave(tmp_path):
    import time

    import jwt

    s = com_identidade(tmp_path)
    sem_iat = jwt.encode(
        {
            "sub": "fasorx:1",
            "iss": EMISSOR,
            "aud": "fitradeoff-mcp",
            "exp": int(time.time()) + 300,
        },
        s.jwt_secret,
        algorithm="HS256",
    )
    with cliente_de(s, client=DE_FORA) as c:
        r = c.post(
            "/api/chaves", json={"rotulo": "x"}, headers={"Authorization": f"Bearer {sem_iat}"}
        )
    assert r.status_code == 403


# --- o arquivo compartilhado ---------------------------------------------------


def test_revogar_durante_o_carimbo_nao_ressuscita_a_chave(local, monkeypatch):
    """A corrida real: o MCP resolve a chave e, antes de carimbar o uso, a tela
    revoga. Sem a trava e a releitura, o carimbo regravava a lista antiga --
    com a chave revogada dentro."""
    chave, texto = cofre.criar(local, "Claude")
    original = cofre._marcar_uso

    def revoga_no_meio(settings, id, quando):
        # A revogacao chega entre a resolucao (que ja achou a chave) e o
        # carimbo -- exatamente a janela da corrida.
        assert cofre.revogar(settings, chave.id) is True
        original(settings, id, quando)

    monkeypatch.setattr(cofre, "_marcar_uso", revoga_no_meio)
    cofre.resolver(local)(texto)

    assert cofre.listar(local) == []
    monkeypatch.setattr(cofre, "_marcar_uso", original)
    assert cofre.resolver(local)(texto) is None


def test_revogacao_espera_o_carimbo_que_esta_gravando(local, monkeypatch):
    """A outra ordem da corrida: o carimbo ja releu a lista quando a revogacao
    chega. A trava faz a revogacao esperar, e ela ganha no fim."""
    import threading

    chave, texto = cofre.criar(local, "Claude")
    releu = threading.Event()
    pode_gravar = threading.Event()
    gravar_original = cofre._gravar

    def gravar_devagar(settings, chaves):
        if any(c.ultimo_uso for c in chaves) and not pode_gravar.is_set():
            releu.set()
            pode_gravar.wait(5)
        gravar_original(settings, chaves)

    monkeypatch.setattr(cofre, "_gravar", gravar_devagar)
    uso = threading.Thread(target=lambda: cofre.resolver(local)(texto))
    uso.start()
    assert releu.wait(5)

    resultado: list[bool] = []
    revoga = threading.Thread(target=lambda: resultado.append(cofre.revogar(local, chave.id)))
    revoga.start()
    revoga.join(0.3)
    assert revoga.is_alive(), "a revogacao devia esperar a trava do carimbo"

    pode_gravar.set()
    uso.join(5)
    revoga.join(5)
    assert resultado == [True]
    assert cofre.listar(local) == []
    assert cofre.resolver(local)(texto) is None


def test_gravacoes_concorrentes_nao_perdem_chave(local):
    """Varias threads emitindo e carimbando juntas: nenhuma emissao se perde."""
    import threading

    _, texto = cofre.criar(local, "a que sera usada")
    resolve = cofre.resolver(local)
    erros: list[BaseException] = []

    def emitir(i):
        try:
            cofre.criar(local, f"t{i}")
        except BaseException as exc:  # noqa: BLE001
            erros.append(exc)

    def usar():
        try:
            for _ in range(5):
                resolve(texto)
        except BaseException as exc:  # noqa: BLE001
            erros.append(exc)

    threads = [threading.Thread(target=emitir, args=(i,)) for i in range(12)]
    threads += [threading.Thread(target=usar) for _ in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert not erros
    assert len(cofre.listar(local)) == 13
    # E nenhum provisorio ficou para tras.
    assert not list(cofre.caminho(local).parent.glob(".chaves-*.tmp"))


def test_cofre_corrompido_nao_e_apagado_pela_gravacao(local):
    from datetime import datetime, timezone

    cofre.criar(local, "Antes da queda de energia")
    arquivo = cofre.caminho(local)
    arquivo.write_text('{"chaves": [{"id"', encoding="utf-8")

    with pytest.raises(cofre.CofreCorrompido):
        cofre.criar(local, "depois")
    with pytest.raises(cofre.CofreCorrompido):
        cofre.revogar(local, "qualquer")
    # O carimbo de uso desiste em silencio, e tambem nao grava.
    cofre._marcar_uso(local, "qualquer", datetime.now(timezone.utc))

    assert arquivo.read_text(encoding="utf-8") == '{"chaves": [{"id"'


def test_cofre_corrompido_leva_503_na_emissao(cliente, local):
    cofre.criar(local, "x")
    cofre.caminho(local).write_text("lixo", encoding="utf-8")
    r = cliente.post("/api/chaves", json={"rotulo": "y"})
    assert r.status_code == 503
    assert cofre.caminho(local).read_text(encoding="utf-8") == "lixo"


def test_indice_reaproveitado_e_invalidado_quando_o_arquivo_muda(local, monkeypatch):
    _, texto = cofre.criar(local, "Claude")
    resolve = cofre.resolver(local)
    assert resolve(texto) == local.storage  # monta o indice e carimba

    leituras = 0
    original = cofre._ler

    def contando(settings, estrito=False):
        nonlocal leituras
        leituras += 1
        return original(settings, estrito)

    monkeypatch.setattr(cofre, "_ler", contando)
    resolve(texto)  # o carimbo mudou o arquivo: rele uma vez
    resolve(texto)
    resolve(texto)
    assert leituras == 1, "com o arquivo parado, cada chamada nao deve reler o cofre"

    # Revogada por outro processo (aqui, direto no arquivo): o indice percebe.
    cofre.caminho(local).write_text(json.dumps({"chaves": []}), encoding="utf-8")
    assert resolve(texto) is None


def test_a_trava_vale_entre_processos(local):
    """A api e o mcp sao processos distintos: a trava precisa ser do sistema de
    arquivos, e nao so de thread. Um processo filho segura a trava; a emissao
    daqui espera ele soltar."""
    import os
    import subprocess
    import sys
    import time

    cofre.criar(local, "existente")
    script = (
        "import sys, time\n"
        "from fitradeoff_api import chaves\n"
        "from fitradeoff_api.config import Settings\n"
        "from pathlib import Path\n"
        "s = Settings(storage=Path(sys.argv[1]))\n"
        "with chaves._trava(s):\n"
        "    print('travado', flush=True)\n"
        "    time.sleep(1.5)\n"
    )
    filho = subprocess.Popen(
        [sys.executable, "-c", script, str(local.storage)],
        stdout=subprocess.PIPE,
        text=True,
        env={**os.environ},
    )
    try:
        assert filho.stdout.readline().strip() == "travado"
        inicio = time.monotonic()
        cofre.criar(local, "depois da trava")
        assert time.monotonic() - inicio > 0.5, "a emissao nao esperou a trava do outro processo"
    finally:
        filho.wait(10)
    assert len(cofre.listar(local)) == 2
