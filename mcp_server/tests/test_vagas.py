"""As vagas de calculo: por pessoa, no total, e sem vazar vaga nenhuma."""

import asyncio

import pytest

from fitradeoff_mcp.vagas import Ocupado, Vagas


class Medidor:
    """Quantos blocos rodam ao mesmo tempo, por pessoa e no total."""

    def __init__(self):
        self.agora: dict[str, int] = {}
        self.pico: dict[str, int] = {}
        self.total = 0
        self.pico_total = 0

    async def rodar(self, vagas: Vagas, pessoa: str, liberar: asyncio.Event):
        async with vagas.de(pessoa):
            self.agora[pessoa] = self.agora.get(pessoa, 0) + 1
            self.total += 1
            self.pico[pessoa] = max(self.pico.get(pessoa, 0), self.agora[pessoa])
            self.pico_total = max(self.pico_total, self.total)
            await liberar.wait()
            self.agora[pessoa] -= 1
            self.total -= 1


async def _deixa_andar():
    for _ in range(5):
        await asyncio.sleep(0)


def test_uma_pessoa_roda_no_maximo_duas_de_cada_vez():
    async def cenario():
        vagas, medidor, liberar = Vagas(por_pessoa=2, no_total=24), Medidor(), asyncio.Event()
        tarefas = [asyncio.create_task(medidor.rodar(vagas, "ana", liberar)) for _ in range(10)]
        await _deixa_andar()
        assert medidor.agora["ana"] == 2
        liberar.set()
        await asyncio.gather(*tarefas)
        assert medidor.pico["ana"] == 2

    asyncio.run(cenario())


def test_quem_chega_nao_espera_a_fila_de_outra_pessoa():
    """O caso que motivou tudo: 45 pedidos de uma pessoa, um da outra."""

    async def cenario():
        # fila por pessoa folgada aqui: o que se mede e a vez, nao o teto
        vagas, medidor = Vagas(por_pessoa=2, no_total=24, esperando_por_pessoa=50), Medidor()
        da_ana, da_bia = asyncio.Event(), asyncio.Event()
        ana = [asyncio.create_task(medidor.rodar(vagas, "ana", da_ana)) for _ in range(45)]
        await _deixa_andar()
        bia = asyncio.create_task(medidor.rodar(vagas, "bia", da_bia))
        await _deixa_andar()
        # a bia ja esta rodando, com 43 pedidos da ana ainda esperando
        assert medidor.agora == {"ana": 2, "bia": 1}
        da_bia.set()
        await bia
        da_ana.set()
        await asyncio.gather(*ana)

    asyncio.run(cenario())


def test_o_total_nao_passa_do_teto():
    async def cenario():
        vagas, medidor, liberar = Vagas(por_pessoa=2, no_total=3), Medidor(), asyncio.Event()
        tarefas = [
            asyncio.create_task(medidor.rodar(vagas, f"p{i}", liberar)) for i in range(6)
        ]
        await _deixa_andar()
        assert medidor.total == 3
        liberar.set()
        await asyncio.gather(*tarefas)
        assert medidor.pico_total == 3

    asyncio.run(cenario())


def test_quem_ja_passou_sai_da_memoria():
    async def cenario():
        vagas, medidor, liberar = Vagas(), Medidor(), asyncio.Event()
        liberar.set()
        await asyncio.gather(*(medidor.rodar(vagas, f"p{i}", liberar) for i in range(50)))
        assert vagas.pessoas_ativas == 0

    asyncio.run(cenario())


def test_esperar_demais_da_ocupado_e_nao_vaza_vaga():
    async def cenario():
        vagas, medidor, segura = Vagas(por_pessoa=1, no_total=5, espera=0.05), Medidor(), asyncio.Event()
        primeira = asyncio.create_task(medidor.rodar(vagas, "ana", segura))
        await _deixa_andar()
        with pytest.raises(Ocupado):
            async with vagas.de("ana"):
                pass
        segura.set()
        await primeira
        # a vaga que a desistente esperava continua inteira para a proxima
        async with vagas.de("ana"):
            pass
        assert vagas.pessoas_ativas == 0
        assert vagas.livres_no_total == 5

    asyncio.run(cenario())


def test_desistencia_esperando_pelo_total_devolve_a_vaga_da_pessoa():
    """Pegou a vaga da pessoa, esperou pelo total e desistiu: devolve as duas."""

    async def cenario():
        vagas, medidor, segura = Vagas(por_pessoa=2, no_total=1, espera=0.05), Medidor(), asyncio.Event()
        outra = asyncio.create_task(medidor.rodar(vagas, "bia", segura))
        await _deixa_andar()
        with pytest.raises(Ocupado):
            async with vagas.de("ana"):
                pass
        segura.set()
        await outra
        assert vagas.livres_no_total == 1
        assert vagas.pessoas_ativas == 0

    asyncio.run(cenario())


def test_pedido_cancelado_na_espera_nao_vaza_vaga():
    async def cenario():
        vagas, medidor, segura = Vagas(por_pessoa=1, no_total=5), Medidor(), asyncio.Event()
        primeira = asyncio.create_task(medidor.rodar(vagas, "ana", segura))
        await _deixa_andar()
        esperando = asyncio.create_task(medidor.rodar(vagas, "ana", segura))
        await _deixa_andar()
        esperando.cancel()
        with pytest.raises(asyncio.CancelledError):
            await esperando
        segura.set()
        await primeira
        assert vagas.pessoas_ativas == 0
        assert vagas.livres_no_total == 5

    asyncio.run(cenario())


def test_fila_cheia_recusa_na_hora_sem_ocupar_nada():
    from fitradeoff_mcp.vagas import Cheio

    async def cenario():
        vagas, medidor, segura = Vagas(por_pessoa=2, no_total=24, esperando_por_pessoa=3), Medidor(), asyncio.Event()
        dentro = [asyncio.create_task(medidor.rodar(vagas, "ana", segura)) for _ in range(5)]
        await _deixa_andar()
        with pytest.raises(Cheio):
            async with vagas.de("ana"):
                pass
        # a recusa e so para a ana: a bia entra
        async with vagas.de("bia"):
            pass
        segura.set()
        await asyncio.gather(*dentro)
        assert vagas.pessoas_ativas == 0
        assert vagas.livres_no_total == 24

    asyncio.run(cenario())


def test_aviso_quando_o_total_nao_deixa_folga(caplog):
    from fitradeoff_mcp.vagas import avisar_se_sem_folga

    assert Vagas(no_total=24).aviso_de_folga(40) is None
    assert "nao deixa folga" in Vagas(no_total=40).aviso_de_folga(40)

    async def partida(vagas):
        avisar_se_sem_folga(vagas)  # le o limitador real, que so existe no laco

    with caplog.at_level("WARNING"):
        asyncio.run(partida(Vagas(no_total=24)))
        assert "folga" not in caplog.text
        asyncio.run(partida(Vagas(no_total=400)))
        assert "nao deixa folga" in caplog.text


def test_vagas_invalidas_sao_recusadas():
    with pytest.raises(ValueError):
        Vagas(por_pessoa=0)


# --- no MCP -------------------------------------------------------------------


class _Requisicao:
    def __init__(self, scope):
        self.scope = scope


class _Contexto:
    """O minimo de ``ServerRequestContext`` que ``EscopoDaChave`` le."""

    def __init__(self, metodo, vagas, escopo="/dados/pessoas/ana"):
        from fitradeoff_mcp.remoto import CAMPO_DAS_VAGAS, CAMPO_NO_ESCOPO

        self.method = metodo
        self.request = _Requisicao({CAMPO_NO_ESCOPO: escopo, CAMPO_DAS_VAGAS: vagas})


def test_ferramentas_do_mcp_dividem_as_vagas_e_o_resto_passa_direto():
    from fitradeoff_mcp.remoto import EscopoDaChave

    async def cenario():
        vagas, meio, segura = Vagas(por_pessoa=2, no_total=24), EscopoDaChave(), asyncio.Event()
        rodando = {"n": 0}

        async def ferramenta(_ctx):
            rodando["n"] += 1
            await segura.wait()
            rodando["n"] -= 1
            return "ok"

        async def instantaneo(_ctx):
            return "iniciado"

        chamadas = [
            asyncio.create_task(meio(_Contexto("tools/call", vagas), ferramenta))
            for _ in range(5)
        ]
        await _deixa_andar()
        assert rodando["n"] == 2

        # iniciar a conversa nao espera atras dos calculos da mesma pessoa
        assert await asyncio.wait_for(
            meio(_Contexto("initialize", vagas), instantaneo), timeout=0.5
        ) == "iniciado"

        segura.set()
        assert await asyncio.gather(*chamadas) == ["ok"] * 5
        assert vagas.pessoas_ativas == 0

    asyncio.run(cenario())
