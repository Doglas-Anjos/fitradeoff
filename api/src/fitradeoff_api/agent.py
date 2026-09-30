"""O agente que conduz a decisao por conversa.

As ferramentas sao as mesmas operacoes do ``DecisionService`` -- as mesmas que
o servidor MCP expoe e que a tela classica usa. O agente nao tem atalho: se ele
recomendar uma alternativa, foi o metodo que a apontou.

Loop manual em vez do tool runner do SDK, por duas razoes concretas: o front
precisa do rastro das ferramentas usadas (para mostrar o que aconteceu) e do
identificador da decisao criada no meio da conversa, e queremos um teto de
iteracoes que o runner nao expoe.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from collections.abc import Callable
from typing import Any

import anthropic
from fitradeoff import DecisionService

# Teto de idas ao modelo por mensagem do usuario. Uma decisao inteira costuma
# caber em poucas; o teto existe para que um laco inesperado pare.
MAX_ITERACOES = 12

SYSTEM = """\
Voce conduz decisoes multicriterio pelo metodo FITradeoff (De Almeida et al., \
2016), conversando em portugues do Brasil.

Cinco problematicas: `escolha` (qual e a melhor), `ranking` (ordenar todas), \
`sorting` (alocar em classes), `portfolio` (a carteira de maior beneficio \
agregado dentro do orcamento) e `beneficio_custo` (a carteira montada pela \
ordem da razao beneficio/custo, quando o decisor quer eficiencia por unidade \
de recurso).

Protocolo, nesta ordem:

1. Entenda o problema conversando. Levante alternativas, criterios, unidades e \
a direcao de cada criterio (mais e melhor, ou menos e melhor). Confirme os \
numeros antes de registrar.
2. `criar_problema`.
3. `ordenar_criterios`: o decisor ordena os criterios do mais para o menos \
importante, supondo que cada um va do pior ao melhor desempenho possivel. \
Proponha uma ordem a partir da conversa, mas peca confirmacao -- a ordem e uma \
declaracao de preferencia dele, nao sua.
4. Repita `proxima_pergunta` -> `responder` ate encerrar.

Ao apresentar uma pergunta de tradeoff, reproduza as duas opcoes por inteiro, \
com todos os criterios e suas unidades, exatamente como vierem no enunciado. \
As duas situacoes sao hipoteticas e propositalmente ruins em quase tudo: deixe \
isso claro, ou o decisor responde a outra pergunta.

Regras que nao se quebram:

- Nunca responda uma pergunta de tradeoff pelo decisor. Faca a pergunta e pare.
- Nunca invente uma consequencia, um criterio ou uma recomendacao. Tudo o que \
voce afirmar sobre a decisao vem das ferramentas.
- Se o decisor quiser parar antes do fim, mostre as faixas de valor e deixe \
que ele decida olhando os dados -- e a avaliacao holistica prevista pelo \
metodo, e `julgar` registra o que ele decidir assim.
- As problematicas de carteira (`portfolio` e `beneficio_custo`) devolvem a \
carteira de forma aproximada, por amostragem do espaco de pesos. Diga isso ao \
apresentar a carteira. Em `beneficio_custo` as faixas de razao beneficio/custo \
e a dominancia entre faixas disjuntas sao exatas; so a carteira e amostrada. \
As outras tres problematicas sao exatas.

Seja direto e curto. O decisor quer decidir, nao ler sobre programacao linear.\
"""


def _tool(nome: str, descricao: str, propriedades: dict, obrigatorios: list[str]):
    return {
        "name": nome,
        "description": descricao,
        "input_schema": {
            "type": "object",
            "properties": propriedades,
            "required": obrigatorios,
            "additionalProperties": False,
        },
        # a entrada volta validada contra o schema, o que evita um argumento
        # malformado virar excecao dentro do motor
        "strict": True,
    }


_ID = {"type": "string", "description": "Identificador da decisao"}

TOOLS = [
    _tool(
        "listar_problematicas",
        "Lista as problematicas disponiveis e para que serve cada uma.",
        {},
        [],
    ),
    _tool(
        "criar_problema",
        "Registra um problema de decisao. 'criterios' e uma lista de objetos com "
        "chave, nome, direcao ('max' ou 'min') e unidade opcional. "
        "'consequencias' traz uma linha por alternativa e uma coluna por "
        "criterio, na unidade real. Um criterio aceita ainda limites de veto -- "
        "veja a descricao deles; so declare se o decisor disser que existe um "
        "desempenho inaceitavel, e so em 'escolha' ou 'ranking'.",
        {
            "nome": {"type": "string"},
            "alternativas": {"type": "array", "items": {"type": "string"}},
            "criterios": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "chave": {"type": "string"},
                        "nome": {"type": "string"},
                        "direcao": {"type": "string", "enum": ["max", "min"]},
                        "unidade": {"type": "string"},
                        "veto_superior": {
                            "type": "number",
                            "description": "Desempenho, na unidade do criterio, "
                            "a partir do qual nada e penalizado.",
                        },
                        "veto_inferior": {
                            "type": "number",
                            "description": "Desempenho em que o criterio deixa "
                            "de contar. A alternativa nao e eliminada: o valor "
                            "global dela e penalizado. So vale em 'escolha' e "
                            "'ranking'; nas outras o registro e recusado.",
                        },
                    },
                    "required": ["chave", "nome", "direcao"],
                    "additionalProperties": False,
                },
            },
            "consequencias": {
                "type": "array",
                "items": {"type": "array", "items": {"type": "number"}},
            },
            "problematica": {
                "type": "string",
                "enum": [
                    "escolha", "ranking", "sorting", "portfolio", "beneficio_custo",
                ],
            },
            "configuracao": {
                "type": "object",
                "description": "Para sorting: {'perfis': [...]}. Para portfolio "
                "e beneficio_custo: {'orcamento': X}.",
                "additionalProperties": True,
            },
            "custos": {
                "type": "array",
                "items": {"type": "number"},
                "description": "Obrigatorio nas problematicas de carteira "
                "(portfolio e beneficio_custo).",
            },
        },
        ["nome", "alternativas", "criterios", "consequencias"],
    ),
    _tool("listar_problemas", "Lista as decisoes ja registradas.", {}, []),
    _tool("ver_problema", "Mostra o problema completo.", {"id": _ID}, ["id"]),
    _tool(
        "ordenar_criterios",
        "Registra a ordenacao dos criterios por importancia e inicia a "
        "elicitacao. 'ordem' traz as chaves, do maior peso para o menor.",
        {"id": _ID, "ordem": {"type": "array", "items": {"type": "string"}}},
        ["id", "ordem"],
    ),
    _tool(
        "proxima_pergunta",
        "Proxima pergunta de tradeoff, nas unidades do problema.",
        {"id": _ID},
        ["id"],
    ),
    _tool(
        "responder",
        "Registra a resposta do decisor: 'A', 'B' ou 'indiferente'. Use apenas "
        "com o que o decisor efetivamente respondeu.",
        {"id": _ID, "preferencia": {"type": "string", "enum": ["A", "B", "indiferente"]}},
        ["id", "preferencia"],
    ),
    _tool(
        "julgar",
        "Registra um julgamento direto entre duas alternativas reais, quando o "
        "decisor olha o desempenho completo das duas e declara qual prefere.",
        {"id": _ID, "preferida": {"type": "string"}, "sobre": {"type": "string"}},
        ["id", "preferida", "sobre"],
    ),
    _tool("desfazer", "Desfaz a ultima declaracao.", {"id": _ID}, ["id"]),
    _tool("situacao", "Situacao atual da decisao.", {"id": _ID}, ["id"]),
    _tool(
        "explicar",
        "Justificativa: o que o decisor declarou e o que isso descartou.",
        {"id": _ID},
        ["id"],
    ),
    _tool(
        "mudar_problematica",
        "Le a mesma decisao sob outra problematica, sem reelicitar nada.",
        {
            "id": _ID,
            "problematica": {
                "type": "string",
                "enum": [
                    "escolha", "ranking", "sorting", "portfolio", "beneficio_custo",
                ],
            },
            "configuracao": {"type": "object", "additionalProperties": True},
        },
        ["id", "problematica"],
    ),
    _tool(
        "analise_sensibilidade",
        "Reprocessa as mesmas respostas com outras folgas de preferencia "
        "estrita entre os pesos dos criterios.",
        {"id": _ID, "limiares": {"type": "array", "items": {"type": "number"}}},
        ["id", "limiares"],
    ),
]


@dataclass
class Turno:
    """O que uma mensagem do usuario produziu."""

    resposta: str
    decisao_id: str | None = None
    ferramentas: list[dict] = field(default_factory=list)
    mensagens: list[dict] = field(default_factory=list)


class DecisionAgent:
    """Conduz a conversa, chamando o motor pelas ferramentas."""

    def __init__(
        self,
        service: DecisionService,
        api_key: str,
        model: str,
        em_vaga: Callable[[Callable[[], Any]], Any] | None = None,
        antes_de_criar: Callable[[], None] | None = None,
    ) -> None:
        self._service = service
        # O teto de decisoes do acervo (deps.conferir_teto). Injetado, e nao
        # calculado aqui, porque o agente nao sabe de quem e o acervo: quem o
        # monta sabe. Sem ele (testes, uso direto), nao ha teto.
        self._antes_de_criar = antes_de_criar or (lambda: None)
        self._client = anthropic.Anthropic(api_key=api_key)
        self._model = model
        # Roda cada ferramenta com uma vaga de calculo da pessoa. So a
        # ferramenta: a espera pelo modelo, que e a maior parte da conversa, nao
        # ocupa vaga de ninguem. Sem ele (testes, uso direto), roda sem fila.
        self._em_vaga = em_vaga or (lambda funcao: funcao())

    def _executar(self, nome: str, args: dict) -> Any:
        """Traduz a chamada da ferramenta para o caso de uso correspondente."""
        s = self._service

        def criar() -> Any:
            self._antes_de_criar()
            return s.create(
                nome=args["nome"],
                alternativas=args["alternativas"],
                criterios=args["criterios"],
                consequencias=args["consequencias"],
                problematica=args.get("problematica") or "escolha",
                configuracao=args.get("configuracao"),
                custos=args.get("custos"),
            )

        despacho = {
            "listar_problematicas": lambda: s.problematics(),
            "criar_problema": criar,
            "listar_problemas": lambda: {"decisoes": s.list()},
            "ver_problema": lambda: s.describe(args["id"]),
            "ordenar_criterios": lambda: s.rank_criteria(args["id"], args["ordem"]),
            "proxima_pergunta": lambda: s.next_question(args["id"]),
            "responder": lambda: s.answer(args["id"], args["preferencia"]),
            "julgar": lambda: s.judge(args["id"], args["preferida"], args["sobre"]),
            "desfazer": lambda: s.undo(args["id"]),
            "situacao": lambda: s.state(args["id"]),
            "explicar": lambda: s.explain(args["id"]),
            "mudar_problematica": lambda: s.switch_problematic(
                args["id"], args["problematica"], args.get("configuracao")
            ),
            "analise_sensibilidade": lambda: s.sensitivity(args["id"], args["limiares"]),
        }
        if nome not in despacho:
            return {"erro": f"Ferramenta desconhecida: {nome}"}
        try:
            return self._em_vaga(despacho[nome])
        except Exception as exc:  # noqa: BLE001
            # O agente precisa da mensagem para se corrigir sozinho -- uma
            # excecao que sobe aqui derrubaria a conversa inteira.
            return {"erro": f"{type(exc).__name__}: {exc}"}

    def _sistema(self, decisao_id: str | None) -> str:
        """As instrucoes, com a decisao em foco quando a tela diz qual e.

        Sem isto, o ``decisao_id`` que a tela manda so voltava na resposta: o
        modelo nunca o via, e numa conversa retomada perguntava de novo o que
        ja estava registrado ou criava uma decisao nova. O nome vai junto para
        o modelo confirmar com o decisor que e a decisao certa; se ela nao
        existe (apagada, de outro acervo), nada e acrescentado.
        """
        if not decisao_id:
            return SYSTEM
        try:
            nome = str(self._service.describe(decisao_id).get("nome") or "")
        except Exception:  # noqa: BLE001
            return SYSTEM
        return (
            f"{SYSTEM}\n\nDecisao em foco nesta conversa: id `{decisao_id}`, "
            f"nome {json.dumps(nome[:200], ensure_ascii=False)}. Continue esta "
            "decisao usando este id nas ferramentas; so crie outra se o decisor "
            "pedir."
        )

    def conversar(self, mensagens: list[dict], decisao_id: str | None = None) -> Turno:
        """Processa a conversa ate o modelo parar de chamar ferramentas.

        Erros: as excecoes do SDK da Anthropic (limite de uso, falha do
        servico, rede) sobem sem traducao; a rota as traduz para 502 ou 503.
        """
        historico = list(mensagens)
        usadas: list[dict] = []
        atual = decisao_id
        sistema = self._sistema(decisao_id)

        for _ in range(MAX_ITERACOES):
            resposta = self._client.messages.create(
                model=self._model,
                max_tokens=8000,
                system=sistema,
                tools=TOOLS,
                messages=historico,
            )

            if resposta.stop_reason == "refusal":
                return Turno(
                    resposta=(
                        "Nao consigo seguir com este pedido. Se for engano, "
                        "reformule descrevendo a decisao em outros termos."
                    ),
                    decisao_id=atual,
                    ferramentas=usadas,
                    mensagens=historico,
                )

            chamadas = [b for b in resposta.content if b.type == "tool_use"]
            if not chamadas:
                texto = "\n".join(b.text for b in resposta.content if b.type == "text")
                historico.append({"role": "assistant", "content": resposta.content})
                return Turno(
                    resposta=texto.strip(),
                    decisao_id=atual,
                    ferramentas=usadas,
                    mensagens=historico,
                )

            historico.append({"role": "assistant", "content": resposta.content})

            resultados = []
            for chamada in chamadas:
                saida = self._executar(chamada.name, dict(chamada.input))
                if chamada.name == "criar_problema" and isinstance(saida, dict):
                    atual = saida.get("id") or atual
                usadas.append({"ferramenta": chamada.name, "resultado": saida})
                resultados.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": chamada.id,
                        "content": _texto(saida),
                        "is_error": isinstance(saida, dict) and "erro" in saida,
                    }
                )
            historico.append({"role": "user", "content": resultados})

        return Turno(
            resposta=(
                "A conversa deu voltas demais sem concluir. Me diga em uma frase "
                "o que voce quer decidir e eu recomeco."
            ),
            decisao_id=atual,
            ferramentas=usadas,
            mensagens=historico,
        )


def _texto(valor: Any) -> str:
    return json.dumps(valor, ensure_ascii=False, default=str)
