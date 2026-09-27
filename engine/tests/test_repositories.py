"""Persistencia: os dois adaptadores devem se comportar identicamente."""

import json

import pytest

from conftest import make_problem
from fitradeoff.domain import AuditLog, CriteriaRanking, Preference, TradeoffAnswer
from fitradeoff.repositories import (
    DecisionRecord,
    InMemoryDecisionRepository,
    JsonFileDecisionRepository,
    RecordNotFound,
)


@pytest.fixture(params=["memoria", "arquivo"])
def repository(request, tmp_path):
    """Cada teste roda contra os dois adaptadores."""
    if request.param == "memoria":
        return InMemoryDecisionRepository()
    return JsonFileDecisionRepository(tmp_path)


@pytest.fixture
def record(clock):
    problem = make_problem(
        [[1.0, 2.0, 3.0], [3.0, 2.0, 1.0]], costs=[5.0, 7.0], names=["X", "Y"]
    )
    log = AuditLog().record(CriteriaRanking((0, 1, 2)), clock, actor="ana")
    log = log.record(TradeoffAnswer(0, 1, 0.25, Preference.SECOND), clock)
    return DecisionRecord(
        id="abc123",
        problem=problem,
        log=log,
        problematic_key="portfolio",
        settings={"orcamento": 10.0},
        created_at=clock.now(),
    )


def test_registro_sobrevive_ao_ciclo_de_gravacao(repository, record):
    repository.save(record)
    lido = repository.get("abc123")

    assert lido.id == record.id
    assert lido.problem.alternatives == record.problem.alternatives
    assert lido.problem.consequences.tolist() == record.problem.consequences.tolist()
    assert lido.problem.costs == record.problem.costs
    assert lido.problematic_key == "portfolio"
    assert lido.settings == {"orcamento": 10.0}
    assert lido.created_at == record.created_at


def test_log_sobrevive_com_autor_e_instante(repository, record):
    repository.save(record)
    lido = repository.get("abc123")

    assert lido.log.statements() == record.log.statements()
    assert lido.log.entries[0].actor == "ana"
    assert lido.log.entries[1].recorded_at == record.log.entries[1].recorded_at


def test_criterios_discretos_sobrevivem(repository, clock):
    problem = make_problem(
        [[1.0, 0.0], [3.0, 1.0]], levels=[(1.0, 2.0, 3.0), None]
    )
    repository.save(DecisionRecord(id="disc", problem=problem, created_at=clock.now()))
    lido = repository.get("disc")
    assert lido.problem.criteria[0].levels == (1.0, 2.0, 3.0)


def test_registro_ausente_levanta_erro_nomeado(repository):
    with pytest.raises(RecordNotFound, match="sumiu"):
        repository.get("sumiu")


def test_existencia(repository, record):
    assert not repository.exists("abc123")
    repository.save(record)
    assert repository.exists("abc123")


def test_listagem(repository, record, clock):
    assert repository.list() == []
    repository.save(record)
    repository.save(
        DecisionRecord(
            id="outro",
            problem=make_problem([[1.0, 2.0], [3.0, 4.0]]),
            created_at=clock.now(),
        )
    )
    assert {r.id for r in repository.list()} == {"abc123", "outro"}


def test_remocao(repository, record):
    repository.save(record)
    repository.delete("abc123")
    assert not repository.exists("abc123")
    with pytest.raises(RecordNotFound):
        repository.delete("abc123")


def test_gravar_de_novo_substitui(repository, record, clock):
    repository.save(record)
    record.log = record.log.without_last()
    repository.save(record)
    assert len(repository.get("abc123").log) == 1


# --- especificos do adaptador de arquivo --------------------------------------


def test_identificador_com_travessia_de_caminho_e_recusado(tmp_path):
    repo = JsonFileDecisionRepository(tmp_path)
    for perigoso in ("../fuga", "sub/dir", "a\\b", ""):
        with pytest.raises(ValueError, match="Identificador invalido"):
            repo.get(perigoso)


def test_arquivo_corrompido_e_ignorado_na_listagem(tmp_path, record):
    repo = JsonFileDecisionRepository(tmp_path)
    repo.save(record)
    (tmp_path / "lixo.json").write_text("{ nao e json", encoding="utf-8")

    assert [r.id for r in repo.list()] == ["abc123"]


def test_arquivo_gravado_e_json_legivel(tmp_path, record):
    repo = JsonFileDecisionRepository(tmp_path)
    repo.save(record)
    dados = json.loads((tmp_path / "abc123.json").read_text(encoding="utf-8"))

    # so o problema e o log; nada de estado derivado
    assert set(dados) == {
        "id", "nome", "problematica", "criado_em", "alternativas",
        "criterios", "consequencias", "custos", "configuracao", "auditoria",
        "limiar_de_equivalencia", "favorita",
    }


def test_diretorio_inexistente_lista_vazio(tmp_path):
    assert JsonFileDecisionRepository(tmp_path / "nao-existe").list() == []


def test_curva_de_valor_sobrevive_ao_ciclo(repository, clock):
    """Se a curva se perder na gravacao, a decisao volta a ser linear em
    silencio -- e o resultado muda sem ninguem perceber."""
    from dataclasses import replace

    problem = make_problem([[12.0, 1.0], [45.0, 2.0]])
    com_curva = replace(
        problem,
        criteria=(
            replace(
                problem.criteria[0],
                value_points=((12.0, 1.0), (30.0, 0.35), (45.0, 0.0)),
            ),
            problem.criteria[1],
        ),
    )
    repository.save(
        DecisionRecord(id="curva", problem=com_curva, created_at=clock.now())
    )
    lido = repository.get("curva")

    assert lido.problem.criteria[0].value_points == (
        (12.0, 1.0), (30.0, 0.35), (45.0, 0.0),
    )
    # e continua produzindo o mesmo valor
    assert lido.problem.values[0][0] == 1.0


def test_limites_de_veto_sobrevivem_ao_ciclo(repository, clock):
    """Mesmo risco da curva, com consequencia maior.

    Um veto que se perde na gravacao nao deixa rastro: a decisao reabre sem
    penalidade nenhuma, o resultado muda, e nada na tela diz que mudou.
    """
    from dataclasses import replace

    problem = make_problem([[12.0, 1.0], [45.0, 2.0]])
    com_veto = replace(
        problem,
        criteria=(
            replace(problem.criteria[0], veto_upper=40.0, veto_lower=20.0),
            problem.criteria[1],
        ),
    )
    assert com_veto.has_veto
    repository.save(
        DecisionRecord(id="veto", problem=com_veto, created_at=clock.now())
    )
    lido = repository.get("veto")

    assert lido.problem.criteria[0].veto_upper == 40.0
    assert lido.problem.criteria[0].veto_lower == 20.0
    assert lido.problem.has_veto
    # e a penalidade apurada e a mesma de antes de gravar
    assert lido.problem.veto_factors.tolist() == com_veto.veto_factors.tolist()


def test_criterio_sem_veto_nao_ganha_campo_nenhum(repository, clock):
    """O registro de quem nao usa veto nao pode mudar de forma."""
    from fitradeoff.repositories.serialization import criterion_to_dict

    problem = make_problem([[12.0, 1.0], [45.0, 2.0]])
    gravado = criterion_to_dict(problem.criteria[0])
    assert "veto_superior" not in gravado
    assert "veto_inferior" not in gravado


def test_limiar_de_equivalencia_sobrevive_ao_ciclo(repository, record):
    """Sem isto, reabrir a decisao a avaliaria com outro limiar -- e a
    recomendacao gravada passaria a depender de quem abriu o arquivo."""
    record.equivalence = 0.05
    repository.save(record)
    assert repository.get("abc123").equivalence == 0.05


def test_registro_gravado_antes_do_campo_volta_sem_limiar(record):
    """Arquivo antigo nao tem a chave. ``None`` e "usa o padrao", que e
    exatamente o comportamento que ele tinha quando foi gravado."""
    from fitradeoff.repositories.serialization import record_from_dict, record_to_dict

    dados = record_to_dict(record)
    del dados["limiar_de_equivalencia"]
    assert record_from_dict(dados).equivalence is None


def test_favorita_sobrevive_ao_ciclo(repository, record):
    """Sem isto o destaque se perderia ao reabrir -- e o favorito voltaria a
    valer so enquanto o processo estivesse de pe, que e o problema que guarda-lo
    no servidor veio resolver."""
    record.favorite = True
    repository.save(record)
    assert repository.get("abc123").favorite is True


def test_registro_gravado_antes_do_campo_volta_sem_favorita(record):
    """Arquivo gravado antes do campo existir nao tem a chave, e carregar
    precisa dar "nao favorita" em vez de estourar: era assim que ele estava."""
    from fitradeoff.repositories.serialization import record_from_dict, record_to_dict

    dados = record_to_dict(record)
    del dados["favorita"]
    assert record_from_dict(dados).favorite is False


def test_arquivo_em_disco_sem_o_campo_continua_carregando(tmp_path, record):
    """O caso real: o JSON ja esta gravado na maquina de alguem, sem a chave.

    O teste acima confere a conversao; este confere o caminho inteiro, porque e
    o repositorio que le o arquivo -- e uma decisao antiga que deixasse de
    abrir seria a pior forma possivel de estrear um campo novo.
    """
    repo = JsonFileDecisionRepository(tmp_path)
    repo.save(record)
    arquivo = tmp_path / "abc123.json"
    dados = json.loads(arquivo.read_text(encoding="utf-8"))
    del dados["favorita"]
    arquivo.write_text(json.dumps(dados), encoding="utf-8")

    assert repo.get("abc123").favorite is False
    assert [r.favorite for r in repo.list()] == [False]
