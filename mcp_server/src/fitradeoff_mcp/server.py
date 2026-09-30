"""Servidor MCP do FITradeoff.

Casca fina sobre ``DecisionService``: traduz protocolo, nao decide nada. Toda a
regra vive no motor, e a mesma camada de casos de uso serviria uma API HTTP sem
alteracao.

    python -m fitradeoff_mcp
"""

from __future__ import annotations

import contextvars
import functools
import logging
import os
import time
from collections.abc import Callable
from pathlib import Path

from fitradeoff import (
    DecisionService,
    InvalidRequest,
    LimitExceeded,
    RecordNotFound,
    ConcurrentModification,
    StorageUnavailable,
    build_container,
)
from fitradeoff.problematics.registry import UnknownProblematic
from fitradeoff.solvers import HighsLinearSolver
from fitradeoff.solvers.base import InfeasibleWeightSpace
from mcp.server.mcpserver import MCPServer

INSTRUCTIONS = """\
Multi-criteria decision support with the FITradeoff method (de Almeida et al.,
2016). The person you are helping is "the decision maker" (DM).

## Language

Always talk to the DM in the language they write in. These instructions are in
English, and the texts the tools return (question wording, next-step hints,
explanations) come in Portuguese: translate them when you present them, without
changing any number, unit or alternative name. Tool parameters and fixed values
(`escolha`, `beneficio_custo`, `nome`, `criterios`...) stay exactly as
documented, whatever the conversation language.

## Stance

Act as a consultant, not as a form. Suggest, ask, and help the DM find out
what they actually need. Do not push them into a problematic before you
understand the case: propose the one that seems to fit, say in one sentence
why, and let them change it. Treat the problematic as settled only when the DM
says explicitly what they want (pick one, order all, group, build a portfolio).

The five problematics:
- `escolha` (choice): which single alternative is best;
- `ranking`: order all alternatives;
- `sorting`: assign alternatives to ordered classes (e.g. approve / review /
  reject);
- `portfolio`: the set of alternatives with the largest total benefit within a
  budget;
- `beneficio_custo`: the set built in order of benefit/cost ratio, for when the
  DM wants efficiency per unit of resource.
Call `list_problematics` when in doubt.

## Read your audience

Adapt depth and wording to who you are talking to, from the signals in the
conversation: the vocabulary they use, whether they bring data or a
spreadsheet, how precise their request is. Re-adjust as you learn more; if you
cannot tell, ask once whether they prefer the short or the detailed version.
Never be condescending, and never hide the method's steps from anyone.

- Knows the domain and is at ease with technology: be sharp. Few words, method
  terms are fine, show the consequence matrix at once, batch confirmations into
  a single message, skip explanations they did not ask for.
- Knows the domain but not the technology: be more verbose about the process,
  not about their field. Say what each step is for before doing it, avoid
  technical jargon (JSON, id, solver, LP, parameter), accept data in whatever
  shape they give it -- a pasted table, a list, a photo transcribed -- and do
  the formatting yourself.
- New to the problem and to technology: spend longer understanding the case.
  One question at a time, with examples of possible answers. Help them build
  the list of alternatives and criteria rather than asking for it ready-made,
  explain in plain words what a criterion and a trade-off are, and check
  understanding before moving on.

## Frame the problem

The method chooses, orders or classifies a DISCRETE set of alternatives
evaluated on several criteria, with an additive value model. It does not
generate alternatives and does not optimise continuous variables. When the
case does not arrive in that shape, say so plainly and help frame it before
calling `create_problem`:
- continuous settings (controller tuning, process parameters, a design of
  experiments response surface): turn them into candidates -- tested runs,
  simulated tunings, points of a Pareto front obtained elsewhere -- and use the
  method to choose among them;
- design of experiments: the method fits when choosing the best setting among
  runs with several responses (yield, cost, time, defects), or when choosing
  which experimental plan to adopt; planning the design and estimating effects
  is outside it;
- control: it fits when choosing among strategies or tunings evaluated on
  overshoot, settling time, control effort, robustness, or when classifying
  operating conditions with `sorting`; real-time control is outside it.
You may help with the parts outside the method from your own knowledge, but
make clear that those parts do not come from FITradeoff.

## Understand the case before creating it

Before `create_problem`, ask only what the conversation has not answered yet:
- what they want at the end: one choice, an order, groups or a portfolio;
- where the alternatives come from: a spreadsheet or list they already have,
  or help finding them; how many, and under which constraints (budget,
  acceptable ranges, mandatory requirements);
- which criteria matter, and whether any performance is unacceptable (veto);
- how deep they want to go: a quick answer, accepting to stop when few
  alternatives remain, or the full elicitation.
Then show the alternatives, the criteria and the consequence matrix, and ask
for confirmation before registering.

Save the DM's decisions. Every question on screen costs them effort, and the
goal is to reach the result with as few as possible. Whatever you can take from
the data or the conversation -- direction and unit of each criterion, scales,
constraints, a likely order of importance -- take it yourself, propose it, and
ask only for confirmation. When they bring a spreadsheet or a dataset, in
whatever layout, map its columns to criteria yourself, infer the direction
where it is obvious (a cost goes down, a yield goes up) and ask only about the
ambiguous ones; do not ask what is already written there.

Do not narrow the alternatives yourself beyond the DM's hard constraints
(budget, mandatory requirements, vetoes). Eliminating is the method's job, and
it does so with the DM's preferences: register the candidates and, afterwards,
say how many it eliminated and why. When the DM asks for more options, add
them -- do not come back with fewer than they had.

Choose criteria that DISCRIMINATE between the alternatives. A criterion only
matters if the alternatives differ on it, and the questions only happen where
alternatives trade one criterion for another. When you propose the criteria,
include the ones on which the likely favourite is weak, not only the ones that
describe what the DM asked for.

When `create_problem` returns `dominadas`, those alternatives are worse than or
equal to another on every criterion: no weights can make them win. Tell the DM
right away, before any question, and offer to remove them. Removing means
calling `create_problem` again without them; before the first question that
costs the DM nothing, and it shrinks the problem.

`create_problem` and `get_problem` also return `conflito` (except in the
portfolio problematics, where cost decides what fits): where each alternative
is the best, before any weight. Show it to the DM as a criteria ×
alternatives table -- it is where the trade-offs are, and what the questions
will explore. If `lider_amplo` is not empty, one alternative is the best on
most criteria: with these criteria there will be little to ask, and the result
will come from the data more than from the DM's preferences. Say so in plain
words, name the criteria where it loses (`perde_em`), and ask whether criteria
are missing on which it would be worse (for a car: engine, equipment, safety,
maintenance). Adding them now costs nothing; after the questions it means
starting over.

## Protocol, in this order

1. `create_problem` with alternatives, criteria and the consequence matrix.
2. `rank_criteria`: the DM orders the CRITERIA by importance, most to least
   important, assuming each goes from its worst to its best performance. Do not
   call this "ranking" with the DM: the step exists in every problematic and has
   nothing to do with the `ranking` problematic. Propose an order from the
   conversation but ask for confirmation -- the order is their preference, not
   yours.
3. Repeat `next_question` -> `answer` until the process ends, or until the depth
   the DM chose.
4. `status` at any time; `explain` to justify the result.

The order alone often eliminates many alternatives. When it leaves only one or
two of several, tell the DM before any question: which were eliminated, and
that their advantages (see `conflito`) were on criteria they ranked lower, so
no weights consistent with their order make them win. If that surprises the
DM, the criteria or the order may not say what they meant -- offer to review
them before going on.

When presenting a question, reproduce both options in full, with every
criterion and its unit. Both situations are hypothetical and deliberately bad in
almost everything: make that clear, or the DM answers a different question. Do
not invent answers and do not infer the DM's preference.

The method works with partial information: it can almost always conclude
without exhausting the questions. When few alternatives remain, say how many
were eliminated and why, and offer two paths: keep answering trade-off
questions, or compare the finalists directly by looking at their value ranges
-- the holistic evaluation the method provides for, which `record_judgment`
registers. The path is the DM's choice; do not jump to the direct comparison on
your own unless they asked for a quick answer.

When showing the result, use tables for alternatives and ranges, never raw
JSON, and never show internal ids unless the DM asks.

## Other tools

- Contradicting statements: when a result comes back with `consistente:
  false`, call `diagnose_inconsistency`, show the DM the statements in
  conflict and the exits, and apply the one they choose with
  `resolve_inconsistency`.
- Uncertain data (prices from ads, specs, forecasts): offer
  `consequence_sensitivity` before the DM acts on the result, to check whether
  it survives the error in the numbers.
- Value that does not grow evenly with performance: `set_value_curve`, before
  `rank_criteria`.
- In `ranking`, pairs left incomparable: `max_differences` shows whether the
  dispute is real or too small to matter.

## Starting over is a new decision

If the DM asks to start again, or changes the alternatives or the constraints,
create another problem with `create_problem` and redo the understanding of the
case to the extent that it changed. Nothing from the previous decision --
alternatives, criteria, order of importance -- carries over without their
confirmation.

A registered problem cannot be edited: adding alternatives or criteria is a new
`create_problem`. Keep everything the DM already accepted -- the alternatives
from before plus the new ones, the criteria, and the order of importance -- and
propose it for confirmation, asking only where the new criteria go in the
order. Tell the DM that the trade-off answers do not carry over: they were
given about a different set of alternatives.

## Approximate results

The portfolio problematics (`portfolio` and `beneficio_custo`) return the
portfolio as an approximate result, sampled from the weight space: tell the DM
so when presenting it. In `beneficio_custo`, the benefit/cost ratio ranges and
the dominance between non-overlapping ranges are exact; only the portfolio is
sampled. The other three problematics are exact.
"""

# Falhas que o agente consegue entender e corrigir sozinho: viram resposta.
_ESPERADAS = (
    InvalidRequest,
    RecordNotFound,
    ConcurrentModification,
    StorageUnavailable,
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

    O solver e novo a cada composicao, de proposito: guardar um entre chamadas
    contrariaria a regra logo abaixo, e nao e preciso. O reuso de modelo que paga
    a troca acontece *dentro* de uma chamada -- uma analise resolve centenas de
    LPs sobre um punhado de espacos de peso --, e isso um solver recem-criado ja
    aproveita.
    """
    return DecisionService(
        build_container(
            storage=storage_directory(),
            solver=HighsLinearSolver(),
            # com banco, o diretorio resolvido pela chave vira o dono das linhas
            database_url=os.environ.get("FITRADEOFF_DATABASE_URL") or None,
        )
    )


# Recriado a cada chamada para que a variavel de ambiente valha inclusive nos
# testes, e para que o servidor nao guarde estado algum entre chamadas.
def service() -> DecisionService:
    return _build_service()


Observador = Callable[[str, str, float], None]
"""(ferramenta, resultado, segundos) -> nada. ``resultado``: ok, erro ou falha.

Quem mede e quem monta o servidor -- a API registra aqui o observador que
alimenta as metricas. Este pacote continua sem saber de Prometheus: em stdio,
ninguem observa, e nada muda.
"""

observadores: list[Observador] = []


def _observar(ferramenta: str, resultado: str, inicio: float) -> None:
    duracao = time.perf_counter() - inicio
    for observador in observadores:
        try:
            observador(ferramenta, resultado, duracao)
        except Exception:  # noqa: BLE001
            # Medir nunca derruba a ferramenta que estava sendo medida.
            logging.getLogger(__name__).exception("observador de ferramenta falhou")


def tool(description: str):
    """Registra a ferramenta e converte falhas previsiveis em resposta util."""

    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            inicio = time.perf_counter()
            try:
                resposta = fn(*args, **kwargs)
            except _ESPERADAS as exc:
                _observar(fn.__name__, "erro", inicio)
                return {"erro": str(exc)}
            except Exception as exc:  # noqa: BLE001
                _observar(fn.__name__, "falha", inicio)
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
            _observar(fn.__name__, "ok", inicio)
            return resposta

        return server.tool(description=description)(wrapper)

    return decorator


@tool(
    "Lists the available problematics and what each one is for. Use it when it "
    "is unclear whether the decision maker wants to pick one alternative, order "
    "all of them, sort them into classes or build a portfolio."
)
def list_problematics() -> dict:
    return service().problematics()


@tool(
    "Registers a decision problem. Call it only after understanding the case "
    "with the decision maker and getting their confirmation of alternatives, "
    "criteria and matrix. Starting over is a new call, inheriting nothing from "
    "the previous decision without their confirmation. Parameter names and "
    "values are in Portuguese and must be kept as documented. `criterios` is a "
    "list of objects with `chave`, `nome`, `direcao` ('max' or 'min'), an "
    "optional `unidade` and, for constructed scales, `niveis` from worst to "
    "best. `consequencias` has one row per alternative and one column per "
    "criterion, in real units. `problematica` is 'escolha' (default), "
    "'ranking', 'sorting', 'portfolio' or 'beneficio_custo'. For 'sorting' pass "
    "configuracao={'perfis': [...]}; for 'portfolio' or 'beneficio_custo', "
    "configuracao={'orcamento': X} and the `custos` list. A criterion also "
    "accepts `veto_superior` and `veto_inferior`, in its own unit: below the "
    "lower one the criterion stops counting and the alternative's global value "
    "is penalised (additive model with veto, de Almeida 2013). Declare a veto "
    "only if the decision maker says some performance is unacceptable -- and "
    "only in 'escolha' or 'ranking', where the method defines it; elsewhere "
    "the call is refused. Pass `limiar_de_equivalencia` only if the decision "
    "maker asks for a threshold other than the default 0.01 -- see "
    "`set_equivalence_threshold`."
)
def create_problem(
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


@tool("Lists the decisions already registered.")
def list_problems() -> dict:
    return {"decisoes": service().list()}


@tool(
    "Shows the problem: criteria with their best and worst performance, the "
    "consequence matrix, the configuration and, outside the portfolio "
    "problematics, `conflito` -- where each alternative is the best."
)
def get_problem(id: str) -> dict:
    return service().describe(id)


@tool(
    "Registers the order of importance of the CRITERIA, stated or confirmed by "
    "the decision maker, and starts the elicitation. It is not the `ranking` "
    "problematic: it does not order alternatives. `ordem` holds the criteria "
    "keys, from the largest weight to the smallest. Reordering after answers "
    "discards those answers."
)
def rank_criteria(id: str, ordem: list[str]) -> dict:
    return service().rank_criteria(id, ordem)


@tool(
    "Returns the next trade-off question, already worded in the problem's "
    "units (in Portuguese; translate to the decision maker's language). "
    "Present both options in full, and make clear they are hypothetical."
)
def next_question(id: str) -> dict:
    return service().next_question(id)


@tool(
    "Registers the decision maker's answer to the current question: 'A', 'B' "
    "or 'indiferente' (indifferent). Only their answer, never yours. Returns "
    "the updated status."
)
def answer(id: str, preferencia: str) -> dict:
    return service().answer(id, preferencia)


@tool(
    "Registers a direct judgment between two real alternatives, when the "
    "decision maker looks at the full performance of both and states which one "
    "they prefer. It is the method's holistic evaluation and coexists with the "
    "trade-off questions. Offer the direct comparison as an option next to the "
    "questions, not instead of them: propose it unprompted only if the "
    "decision maker asked for a quick answer."
)
def record_judgment(id: str, preferida: str, sobre: str) -> dict:
    return service().judge(id, preferida, sobre)


@tool("Undoes the last registered statement.")
def undo(id: str) -> dict:
    return service().undo(id)


@tool(
    "Current status under the problematic in use, with the weight and value "
    "ranges still possible. Use it to tell the decision maker how many "
    "alternatives remain and why the others were eliminated."
)
def status(id: str) -> dict:
    return service().state(id)


@tool(
    "Justifies the result: what the decision maker stated, with author and "
    "timestamp, and what that imposed (text in Portuguese; translate it). Use "
    "it to answer 'why this one?'."
)
def explain(id: str) -> dict:
    return service().explain(id)


@tool(
    "Reads the same decision under another problematic, without asking "
    "anything again. Useful when the decision maker, after choosing, wants the "
    "full ranking or to sort the alternatives into classes -- and a cheap way "
    "to offer more than they asked for without new questions."
)
def change_problematic(
    id: str, problematica: str, configuracao: dict | None = None
) -> dict:
    return service().switch_problematic(id, problematica, configuracao)


@tool(
    "Sets the equivalence threshold between ALTERNATIVES in this decision and "
    "re-reads the same log, without asking anything again. Two alternatives "
    "whose global values differ by less than the threshold count as "
    "indifferent: it is the method's stopping criterion, so raising it ends "
    "sooner and lowering it asks more questions. The default is 0.01, the same "
    "as the official system; it accepts 0 to 0.5, on the global value scale "
    "that goes from 0 to 1. Do not confuse it with `sensitivity_analysis`, "
    "which sweeps something else: the slack between the weights of two "
    "CRITERIA. Pass null to return to the default. Call it only if the "
    "decision maker asks -- the threshold is their choice about how much "
    "difference still matters, not yours."
)
def set_equivalence_threshold(id: str, limiar: float | None = None) -> dict:
    return service().set_equivalence(id, limiar)


@tool(
    "Sensitivity analysis: reprocesses the same answers with other strict "
    "preference slacks between the criteria weights, to show how much the "
    "conclusion depends on them. Nothing is asked again."
)
def sensitivity_analysis(id: str, limiares: list[float]) -> dict:
    return service().sensitivity(id, limiares)


@tool(
    "What if the numbers in the matrix are somewhat wrong? Varies the "
    "consequences of the chosen criteria within a percentage range and "
    "reprocesses the decision in many scenarios, keeping every answer the "
    "decision maker gave. Use it when the data are estimates -- prices from "
    "ads, consumption from spec sheets, forecasts -- to show whether the "
    "result survives the error. `variacoes` is a list of objects with "
    "`criterio` (the criterion key), `para_baixo` and `para_cima` (percent, "
    "default 10). `cenarios` defaults to 200. Requires the order of the "
    "criteria. Not the same as `sensitivity_analysis`, which varies the slack "
    "between weights, not the data."
)
def consequence_sensitivity(
    id: str, variacoes: list[dict], cenarios: int = 200
) -> dict:
    return service().consequence_sensitivity(id, variacoes, cenarios=cenarios)


@tool(
    "Finds which statements of the decision maker contradict each other and "
    "what can be done about it. Call it when a result comes back with "
    "`consistente: false`: no weights satisfy everything that was said. "
    "Present the conflicting statements and the exits (`saidas`) to the "
    "decision maker in plain words, and let them choose -- never pick one "
    "yourself."
)
def diagnose_inconsistency(id: str) -> dict:
    return service().diagnose(id)


@tool(
    "Applies the exit the decision maker chose for an inconsistency: `acao` "
    "is 'desfazer' (undo the last statement), 'inverter' (swap the last answer "
    "for the opposite option) or 'remover' (drop the statement numbered "
    "`sequencia`, as given in the chosen exit, and replay the others). Only "
    "apply an exit the diagnosis offered. When it offers 'reordenar', the exit "
    "is to call "
    "`rank_criteria` again, which restarts the elicitation."
)
def resolve_inconsistency(
    id: str, acao: str, sequencia: int | None = None
) -> dict:
    return service().resolve_inconsistency(id, acao, sequencia)


@tool(
    "Only in the `ranking` problematic: for pairs of alternatives still "
    "incomparable, the largest difference in global value each could have "
    "over the other under the weights still possible. Use it to show the "
    "decision maker whether an unresolved pair is a real dispute or a "
    "difference too small to matter."
)
def max_differences(id: str) -> dict:
    return service().max_differences(id)


@tool(
    "Sets a non-linear value curve for one criterion, for when the decision "
    "maker says value does not grow evenly with performance ('above 500 L the "
    "extra space hardly matters', 'the first 10 km/l matter most'). `pontos` "
    "are [consequence, value] pairs sorted by consequence, value from 0 to 1, "
    "monotonic, including the worst performance (value 0) and the best (value "
    "1); straight segments join the points. Null returns to the linear "
    "scale. Only before `rank_criteria`: changing the scale afterwards would "
    "invalidate the answers already given. Propose the curve from what the "
    "decision maker said and ask for confirmation."
)
def set_value_curve(
    id: str, criterio: str, pontos: list[list[float]] | None = None
) -> dict:
    return service().set_value_curve(id, criterio, pontos)


def main() -> None:
    server.run(transport="stdio")


if __name__ == "__main__":
    main()
