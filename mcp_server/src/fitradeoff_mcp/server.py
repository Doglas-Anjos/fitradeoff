"""Servidor MCP do FITradeoff.

Casca fina sobre ``DecisionService``: traduz protocolo, nao decide nada. Toda a
regra vive no motor, e a mesma camada de casos de uso serviria uma API HTTP sem
alteracao.

    python -m fitradeoff_mcp
"""

from __future__ import annotations

import contextvars
import functools
import os
from pathlib import Path

from fitradeoff import (
    DecisionService,
    InvalidRequest,
    LimitExceeded,
    RecordNotFound,
    build_container,
)
from fitradeoff.problematics.registry import UnknownProblematic
from fitradeoff.solvers.base import InfeasibleWeightSpace
from mcp.server.mcpserver import MCPServer

INSTRUCTIONS = """\
Apoio a decisao multicriterio pelo metodo FITradeoff (De Almeida et al., 2016).

Cinco problematicas: `escolha` (qual e a melhor), `ranking` (ordenar todas),
`sorting` (alocar em classes), `portfolio` (a carteira de maior beneficio
agregado dentro do orcamento) e `beneficio_custo` (a carteira montada pela ordem
da razao beneficio/custo, para quem quer eficiencia por unidade de recurso).
Chame `listar_problematicas` se estiver em duvida sobre qual serve.

Protocolo, nesta ordem:

1. `criar_problema` com alternativas, criterios e a matriz de consequencias.
2. `ordenar_criterios`: o decisor ordena os criterios do mais para o menos
   importante, supondo que cada um va do pior ao melhor desempenho possivel.
   Proponha uma ordem a partir da conversa, mas peca confirmacao -- a ordem e
   uma declaracao de preferencia dele, nao sua.
3. Repita `proxima_pergunta` -> `responder` ate o processo encerrar.
4. `situacao` a qualquer momento; `explicar` para justificar o resultado.

Ao apresentar uma pergunta, reproduza as duas opcoes por inteiro, com todos os
criterios e suas unidades. As duas situacoes sao hipoteticas e propositalmente
ruins em quase tudo: deixe isso claro, ou o decisor responde a outra pergunta.
Nao invente respostas, nao deduza a preferencia do decisor e nao pule perguntas.

O metodo trabalha com informacao parcial: quase sempre da para concluir sem
esgotar as perguntas. Se o decisor quiser parar antes, apresente as faixas de
valor e deixe que ele decida olhando os dados -- e a avaliacao holistica
prevista pelo metodo, e `julgar` registra o que ele decidir assim.

As problematicas de carteira (`portfolio` e `beneficio_custo`) devolvem a
carteira como resultado aproximado, por amostragem do espaco de pesos: diga
isso ao decisor ao apresentar a carteira. Em `beneficio_custo` as faixas de
razao beneficio/custo e a dominancia entre faixas que nao se sobrepoem sao
exatas; so a carteira e amostrada. As outras tres problematicas sao exatas.
"""

# Falhas que o agente consegue entender e corrigir sozinho: viram resposta.
_ESPERADAS = (
    InvalidRequest,
    RecordNotFound,
    UnknownProblematic,
    InfeasibleWeightSpace,
    LimitExceeded,
    ValueError,
    KeyError,
    IndexError,
    TypeError,
)

server = MCPServer(name="fitradeoff", instructions=INSTRUCTIONS)


DEFAULT_STORAGE = Path.home() / ".fitradeoff" / "decisoes"


escopo_da_chamada: contextvars.ContextVar[Path | None] = contextvars.ContextVar(
    "escopo_da_chamada", default=None
)
"""Diretorio de dados desta chamada, quando o transporte souber de quem ela e.

Em stdio nao ha pergunta a fazer: o processo e do proprio usuario, e o
diretorio vem do ambiente. Por HTTP o processo atende varios clientes, e cada
chamada chega com uma chave -- entao quem responde "de quem sao estes dados" e
o transporte, nao o ambiente. A variavel de contexto e o unico lugar onde essa
resposta caberia sem mexer na assinatura das catorze ferramentas.

Quem a preenche e ``remoto.EscopoDaChave``, no mesmo task que executa a
ferramenta. Preenche-la de um middleware ASGI nao funcionaria: o transporte
streamable-HTTP executa a chamada num task group proprio, que nao herda o
contexto da requisicao.
"""


def storage_directory() -> Path:
    """Diretorio de dados, sempre absoluto.

    Um caminho relativo dependeria do diretorio de trabalho de quem lancou o
    processo -- que num servidor MCP e o cliente, nao nos. Resolver aqui evita
    gravar em lugar imprevisto e deixa o erro visivel na partida, nao na
    primeira escrita.
    """
    # O escopo da chamada manda sobre o ambiente: por HTTP, quem apresentou a
    # chave decide onde grava, e a variavel de ambiente do servidor nao pode
    # sobrepor isso.
    do_transporte = escopo_da_chamada.get()
    if do_transporte is not None:
        return do_transporte
    configured = os.environ.get("FITRADEOFF_DATA")
    if not configured:
        return DEFAULT_STORAGE
    return Path(configured).expanduser().resolve()


def _build_service() -> DecisionService:
    """Composicao do servidor.

    O processo roda como o proprio usuario, em stdio, atendendo um unico
    cliente: nao ha fronteira de privilegio a defender aqui dentro. O que
    protegemos e o que atravessa a fronteira que existe -- entrada vinda do
    agente -- por tres meios: identificadores confinados ao diretorio de dados,
    tetos de tamanho em ``Limits``, e validacao de toda declaracao relida do
    disco antes de virar restricao.
    """
    return DecisionService(build_container(storage=storage_directory()))


# Recriado a cada chamada para que a variavel de ambiente valha inclusive nos
# testes, e para que o servidor nao guarde estado algum entre chamadas.
def service() -> DecisionService:
    return _build_service()


def tool(description: str):
    """Registra a ferramenta e converte falhas previsiveis em resposta util."""

    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                return fn(*args, **kwargs)
            except _ESPERADAS as exc:
                return {"erro": str(exc)}
            except Exception as exc:  # noqa: BLE001
                # Rede de seguranca: uma excecao crua atravessando o protocolo
                # nao diz nada ao decisor e ainda pode expor caminho de arquivo
                # ou trecho de codigo. Melhor uma mensagem inutil porem contida.
                return {
                    "erro": (
                        f"Falha inesperada ({type(exc).__name__}). A decisao nao "
                        f"foi alterada. Se persistir, verifique o arquivo da "
                        f"decisao no diretorio de dados."
                    )
                }

        return server.tool(description=description)(wrapper)

    return decorator


@tool(
    "Lista as problematicas disponiveis e para que serve cada uma. Use quando "
    "nao estiver claro se o decisor quer escolher uma, ordenar todas, "
    "classificar em faixas ou montar uma carteira."
)
def listar_problematicas() -> dict:
    return service().problematics()


@tool(
    "Registra um problema de decisao. `criterios` e uma lista de objetos com "
    "chave, nome, direcao ('max' ou 'min'), unidade opcional e, para escalas "
    "construidas, `niveis` do pior para o melhor. `consequencias` traz uma linha "
    "por alternativa e uma coluna por criterio, na unidade real. Para "
    "`problematica='sorting'` passe configuracao={'perfis': [...]}; para "
    "'portfolio' ou 'beneficio_custo', configuracao={'orcamento': X} e a lista "
    "`custos`. Um criterio aceita ainda `veto_superior` e `veto_inferior`, na "
    "unidade dele: abaixo do inferior o criterio deixa de contar e o valor "
    "global da alternativa e penalizado (modelo aditivo com veto, de Almeida "
    "2013). So declare veto se o decisor disser que existe um desempenho "
    "inaceitavel -- e so em 'escolha' ou 'ranking', que sao onde o metodo o "
    "define; nas outras o registro e recusado. "
    "`limiar_de_equivalencia` so precisa vir se o decisor pedir outro limiar "
    "que nao o padrao 0,01 -- veja `definir_limiar_de_equivalencia`."
)
def criar_problema(
    nome: str,
    alternativas: list[str],
    criterios: list[dict],
    consequencias: list[list[float]],
    problematica: str = "escolha",
    configuracao: dict | None = None,
    custos: list[float] | None = None,
    limiar_de_equivalencia: float | None = None,
) -> dict:
    return service().create(
        nome=nome,
        alternativas=alternativas,
        criterios=criterios,
        consequencias=consequencias,
        problematica=problematica,
        configuracao=configuracao,
        custos=custos,
        limiar_de_equivalencia=limiar_de_equivalencia,
    )


@tool("Lista as decisoes ja registradas.")
def listar_problemas() -> dict:
    return {"decisoes": service().list()}


@tool(
    "Mostra o problema: criterios com melhor e pior desempenho, matriz de "
    "consequencias e configuracao."
)
def ver_problema(id: str) -> dict:
    return service().describe(id)


@tool(
    "Registra a ordenacao dos criterios por importancia e inicia a elicitacao. "
    "`ordem` traz as chaves dos criterios, do maior peso para o menor. "
    "Reordenar apos respostas dadas descarta as respostas."
)
def ordenar_criterios(id: str, ordem: list[str]) -> dict:
    return service().rank_criteria(id, ordem)


@tool(
    "Devolve a proxima pergunta de tradeoff, ja enunciada nas unidades do "
    "problema. Apresente as duas opcoes por inteiro ao decisor."
)
def proxima_pergunta(id: str) -> dict:
    return service().next_question(id)


@tool(
    "Registra a resposta do decisor a pergunta corrente: 'A', 'B' ou "
    "'indiferente'. Devolve a situacao atualizada."
)
def responder(id: str, preferencia: str) -> dict:
    return service().answer(id, preferencia)


@tool(
    "Registra um julgamento direto entre duas alternativas reais, quando o "
    "decisor olha o desempenho completo das duas e declara qual prefere. E a "
    "avaliacao holistica do metodo, e convive com as perguntas de tradeoff."
)
def julgar(id: str, preferida: str, sobre: str) -> dict:
    return service().judge(id, preferida, sobre)


@tool("Desfaz a ultima declaracao registrada.")
def desfazer(id: str) -> dict:
    return service().undo(id)


@tool(
    "Situacao atual sob a problematica em uso, com as faixas de peso e de valor "
    "ainda possiveis."
)
def situacao(id: str) -> dict:
    return service().state(id)


@tool(
    "Justifica o resultado: o que o decisor declarou, em portugues, com autor e "
    "instante, e o que isso impos. Use para responder 'por que essa?'."
)
def explicar(id: str) -> dict:
    return service().explain(id)


@tool(
    "Le a mesma decisao sob outra problematica, sem reelicitar nada. Util quando "
    "o decisor, depois de escolher, quer ver o ranking completo ou classificar "
    "as alternativas em faixas."
)
def mudar_problematica(
    id: str, problematica: str, configuracao: dict | None = None
) -> dict:
    return service().switch_problematic(id, problematica, configuracao)


@tool(
    "Ajusta o limiar de equivalencia entre ALTERNATIVAS desta decisao e rele o "
    "mesmo log, sem reelicitar nada. Duas alternativas cujo valor global difere "
    "por menos que o limiar contam como indiferentes: e o criterio de parada do "
    "metodo, e subi-lo encerra antes, enquanto baixa-lo pede mais perguntas. O "
    "padrao e 0,01, o mesmo do sistema oficial; aceita de 0 a 0,5, na escala de "
    "valor global, que vai de 0 a 1. Nao confunda com `analise_sensibilidade`, "
    "que varre outra coisa: a folga entre os pesos de dois CRITERIOS. Passe nulo "
    "para voltar ao padrao. So chame se o decisor pedir -- o limiar e uma "
    "escolha dele sobre quanta diferenca ainda importa, nao sua."
)
def definir_limiar_de_equivalencia(id: str, limiar: float | None = None) -> dict:
    return service().set_equivalence(id, limiar)


@tool(
    "Analise de sensibilidade: reprocessa as mesmas respostas com outras folgas "
    "de preferencia estrita entre os pesos dos criterios, para mostrar o quanto a "
    "conclusao depende delas. Nada e reelicitado."
)
def analise_sensibilidade(id: str, limiares: list[float]) -> dict:
    return service().sensitivity(id, limiares)


def main() -> None:
    server.run(transport="stdio")


if __name__ == "__main__":
    main()
