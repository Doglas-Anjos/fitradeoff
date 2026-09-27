"""Quatro leituras do mesmo caso, a partir de uma unica elicitacao.

O decisor responde uma vez; as quatro leituras saem do mesmo log de auditoria.

Sao quatro das **cinco** problematicas registradas: escolha, ranking, sorting e
portfolio combinatorial. Falta `beneficio_custo`, a outra leitura de carteira,
que chegou depois deste exemplo -- o nome do arquivo ficou como estava para nao
quebrar o comando publicado no README.

    python examples/quatro_problematicas.py
"""

import numpy as np

from fitradeoff import DecisionService, build_container

CRITERIOS = [
    {"chave": "qualidade", "nome": "Indice de qualidade", "direcao": "max"},
    {"chave": "custo", "nome": "Custo unitario", "direcao": "min", "unidade": "R$/un"},
    {"chave": "prazo", "nome": "Prazo de entrega", "direcao": "min", "unidade": "dias"},
    {"chave": "capacidade", "nome": "Capacidade mensal", "direcao": "max",
     "unidade": "mil un."},
]

ALTERNATIVAS = ["Fornecedor A", "Fornecedor B", "Fornecedor C", "Fornecedor D",
                "Fornecedor E"]

CONSEQUENCIAS = [
    [0.82, 12.50, 30, 120],
    [0.95, 15.80, 12, 90],
    [0.71, 10.20, 45, 200],
    [0.88, 14.10, 20, 140],
    [0.79, 13.00, 25, 110],
]

CUSTOS = [12.0, 16.0, 9.0, 14.0, 13.0]
ORDEM = ["qualidade", "custo", "prazo", "capacidade"]

# Pesos verdadeiros do decisor: ocultos do motor, so para simular as respostas.
PESOS = {0: 0.40, 1: 0.30, 2: 0.20, 3: 0.10}


def titulo(texto: str) -> None:
    print(f"\n{'=' * 70}\n{texto}\n{'=' * 70}")


def responder_tudo(service: DecisionService, id_: str) -> int:
    """Decisor simulado: responde conforme seus pesos verdadeiros."""
    perguntas = 0
    while True:
        resposta = service.next_question(id_)
        if resposta.get("pergunta", "sentinela") is None:
            return perguntas

        print(f"\n--- pergunta {perguntas + 1} ---")
        print(resposta["enunciado"])

        question = service.session(id_).next_question()
        escolha = (
            "A"
            if PESOS[question.criterion] * question.value >= PESOS[question.rival]
            else "B"
        )
        print(f">>> decisor responde: {escolha}")
        service.answer(id_, escolha)
        perguntas += 1


def main() -> None:
    service = DecisionService(build_container(epsilon=0.0))

    titulo("ELICITACAO (uma unica vez)")
    criada = service.create(
        "Selecao de fornecedor", ALTERNATIVAS, CRITERIOS, CONSEQUENCIAS,
        custos=CUSTOS,
    )
    id_ = criada["id"]

    service.rank_criteria(id_, ORDEM)
    print("Ordem declarada: " + " > ".join(ORDEM))
    inicial = service.state(id_)["analise"]
    print(f"Antes de perguntar: {inicial['resumo']}")

    perguntas = responder_tudo(service, id_)
    print(f"\nEncerrado apos {perguntas} perguntas.")

    titulo("1. ESCOLHA")
    analise = service.state(id_)["analise"]
    print(analise["resumo"])
    for relacao in analise["dominancia"][:5]:
        print(f"  {relacao}")

    # confere contra os pesos verdadeiros
    problem = service.session(id_).problem
    pesos = np.array([PESOS[j] for j in range(problem.n_criteria)])
    otima = problem.alternatives[int(np.argmax(problem.values @ pesos))]
    print(f"Otima pelos pesos verdadeiros: {otima}")

    titulo("2. RANKING (mesma elicitacao, outra leitura)")
    analise = service.switch_problematic(id_, "ranking")["analise"]
    print(analise["resumo"])
    for alternativa, faixa in analise["posicoes_possiveis"].items():
        posicao = f"{faixa[0]}" if faixa[0] == faixa[1] else f"{faixa[0]}-{faixa[1]}"
        print(f"  {alternativa:16s} posicao {posicao}")

    titulo("3. SORTING")
    analise = service.switch_problematic(
        id_, "sorting",
        {"perfis": [0.35, 0.65], "classes": ["Descartado", "Reserva", "Preferencial"]},
    )["analise"]
    print(analise["resumo"])
    for alternativa, dados in analise["alocacao"].items():
        faixa = dados["faixa_de_valor"]
        classes = ", ".join(dados["classes_possiveis"])
        print(f"  {alternativa:16s} valor [{faixa[0]:.3f}, {faixa[1]:.3f}] -> {classes}")

    titulo("4. PORTFOLIO (orcamento de 35)")
    analise = service.switch_problematic(
        id_, "portfolio", {"orcamento": 35.0, "amostras": 16}
    )["analise"]
    print(analise["resumo"])
    for carteira in analise["portfolios_encontrados"]:
        print(f"  custo {carteira['custo']:5.1f}: {', '.join(carteira['projetos'])}")
    print(f"  sempre: {analise['sempre_selecionados']}")
    print(f"  nunca:  {analise['nunca_selecionados']}")
    print(f"  NOTA: {analise['ressalva']}")

    titulo("AUDITORIA")
    trilha = service.explain(id_)
    for declaracao in trilha["declaracoes"]:
        print(f"  [{declaracao['sequencia']}] {declaracao['declaracao']}")

    titulo("SENSIBILIDADE (mesmo log, outros limiares)")
    service.switch_problematic(id_, "escolha")
    for cenario in service.sensitivity(id_, [0.0, 0.02, 0.10])["cenarios"]:
        estado = cenario["resumo"] if cenario["consistente"] else "inconsistente"
        print(f"  limiar {cenario['limiar']:.2f}: {estado}")


if __name__ == "__main__":
    main()
