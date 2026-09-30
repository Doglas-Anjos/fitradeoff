"""O que cada lado concluiu, em texto, para a tela de paridade.

Os textos que vao para a tela levam acento; comentarios e docstrings seguem a
convencao do codigo, sem.

A contagem de perguntas diz se os dois sistemas percorreram o mesmo caminho; o
desfecho diz se chegaram ao mesmo lugar. A tela precisa das duas coisas, e o
desfecho em termos concretos -- quem venceu, quem ficou em que classe, que
carteira --, nao a frase de estado do motor ("todas foram classificadas").

O lado oficial sai da tela final que ele deixou gravada, pelos leitores de
``extrair.py``. Quando a tela nao foi guardada, ou nao pode ser lida, o desfecho
dele fica ``None`` e a tela de paridade diz isso, em vez de supor.
"""

from __future__ import annotations

import extrair

#: O que cada caso testa, quando o nome e o tamanho nao bastam para dizer.
NOTAS = {
    "escolha-dominante": "uma alternativa domina as outras: a ordenação dos critérios já basta",
    "escolha-minima": "2 × 2 em conflito puro: o menor problema que ainda exige tradeoff",
    "ranking-cruzado": "cada alternativa lidera um critério: a ordem só sai das perguntas",
    "ranking-06": "até a ordem completa",
    "sorting-04": "classes com fronteira folgada",
    "escolha-empate": "três alternativas idênticas: todo critério tem faixa zero",
    "est-quase-empate": "alternativas a 0,1% umas das outras",
    "est-binario-unidades": "um critério de só dois valores, custo em milhares, prazo em frações",
    "est-discreto7": "nota de 7 níveis sem curva",
    "est-respostas-ab": "respostas alternando A e B",
    "fin-E1-escolha-curva-nota": "curva não linear em todos os critérios e nota de 1 a 5",
    "fin-E2-escolha-min-milhoes": "custo em milhões",
    "fin-E3-escolha-quase-empate": "doze alternativas quase empatadas, com a qualidade quase constante",
    "fin-R2-ranking-curva-nota4": "curva não linear e nota de 4 níveis",
    "fin-S1-sorting-7x25-4c": "quatro classes",
    "fin-S2-sorting-perfis-pontas": "limites entre as classes perto das pontas",
    "fin-S3-sorting-curva-nota": "curva não linear e nota discreta",
    "fin-S4-sorting-2c-milhares": "duas classes, custo em milhares",
    "fin-B1-bc-orcamento-apertado": "orçamento apertado: só um projeto cabe",
    "fin-B2-bc-orcamento-folgado": "orçamento folgado: todos os projetos cabem",
    "fin-B3-bc-curva-nota": "curva não linear e nota discreta",
    "fin-B4-bc-7x30-misto": "o maior caso de benefício-custo",
    "fin-B5-bc-razoes-iguais": "projetos com a mesma razão benefício/custo",
    "sorting-20-qualidade-0.60": "qualidade reescalada para 0,60 a 0,80",
    "sorting-20-custo-em-milhares": "qualidade reescalada e custo em milhares",
    "vol-bc-3x8": "o orçamento decide a carteira antes de qualquer pergunta",
}


def _num(x) -> str:
    x = float(x or 0)
    return ("%.0f" % x) if x == int(x) else ("%.2f" % x)


def _respostas(respostas: str) -> str:
    if not respostas:
        return "respostas sempre A"
    if set(respostas) == {"B"}:
        return "todas as respostas B"
    return "respostas %s e depois A" % respostas


def descricao(caso: dict) -> str:
    """Uma linha dizendo o que o caso e e o que ele testa."""
    partes = ["%d alternativas e %d critérios" % (len(caso["alternativas"]), len(caso["criterios"]))]
    config = caso.get("configuracao") or {}
    if config.get("classes"):
        partes.append("%d classes" % len(config["classes"]))
    custos = caso.get("custos")
    if custos:
        orcamento = caso.get("orcamento") or config.get("orcamento")
        partes.append("orçamento de %s para custos que somam %s" % (_num(orcamento), _num(sum(custos))))
    niveis = [c.get("niveis") for c in caso["criterios"] if isinstance(c, dict) and c.get("niveis")]
    if niveis:
        partes.append("critério discreto de %d níveis" % len(niveis[0]))
    if caso.get("curvas"):
        partes.append("curva de valor não linear")
    partes.append(_respostas(caso.get("respostas") or ""))
    texto = "; ".join(partes)
    texto = texto[0].upper() + texto[1:] + "."
    nota = NOTAS.get(caso.get("chave", ""))
    return texto + (" " + nota[0].upper() + nota[1:] + "." if nota else "")


def _lista(nomes, ordem) -> str:
    return ", ".join(sorted(nomes, key=ordem.index))


def _classes(alocacao: dict, classes: list, ordem: list) -> str:
    grupos = []
    for classe in reversed(classes):  # da melhor para a pior
        membros = [a for a, c in alocacao.items() if c == classe]
        if membros:
            grupos.append("%s: %s" % (classe, _lista(membros, ordem)))
    return " · ".join(grupos)


def desfecho(caso: dict, problematica: str, analise: dict, tela: str | None) -> dict:
    """O que cada lado concluiu, em texto, e se as conclusoes batem.

    ``oficial`` e ``bate`` ficam ``None`` quando a tela final dele nao foi
    guardada ou nao pode ser lida.
    """
    ordem = list(caso["alternativas"])
    nosso, oficial, bate = "", None, None
    try:
        if problematica == "escolha":
            poas = list(analise.get("potencialmente_otimas") or [])
            if analise.get("recomendacao"):
                meus = [analise["recomendacao"]]
                nosso = "Recomenda %s." % meus[0]
            elif analise.get("equivalentes_no_limiar") is not None:
                meus = poas
                nosso = "%d alternativas equivalentes dentro do limiar: %s." % (len(poas), _lista(poas, ordem))
            else:
                meus = None
                nosso = "Sem recomendação única: %s seguem em disputa." % _lista(poas, ordem)
            if tela and extrair.terminou_por_esgotamento(tela) and "Max Overall Value" not in tela:
                oficial = "Perguntas esgotadas sem recomendação única: o resultado dele é parcial."
                bate = meus is None
            elif tela:
                deles = extrair.extrai_escolhidas(tela, ordem)
                oficial = ("Recomenda %s." % deles[0] if len(deles) == 1 else
                           "%d alternativas equivalentes dentro do limiar: %s."
                           % (len(deles), _lista(deles, ordem)))
                bate = meus is not None and set(meus) == set(deles)
        elif problematica == "ranking":
            niveis = analise.get("niveis") or []
            completa = all(len(n) == 1 for n in niveis)
            resolvido = analise.get("resolvido", True)
            texto = " > ".join(n[0] if len(n) == 1 else "{%s}" % ", ".join(n) for n in niveis)
            if not resolvido:
                nosso = ("Perguntas esgotadas sem ordem completa: %s. Entre chaves, alternativas"
                         " que ainda não foram ordenadas." % texto)
            elif completa:
                nosso = "Ordem completa: %s." % texto
            else:
                nosso = ("Pré-ordem completa: %s. Entre chaves, alternativas equivalentes dentro"
                         " do limiar." % texto)
            if tela and extrair.terminou_por_esgotamento(tela):
                oficial = "Perguntas esgotadas sem ordem completa: o resultado dele é parcial."
                bate = not resolvido
            elif tela:
                tipo = extrair.extrai_desfecho_do_ranking(tela)
                oficial = (("Ordem completa." if tipo == extrair.ORDEM_COMPLETA else "Pré-ordem completa.")
                           + " O oficial desenha a ordem num diagrama e não a escreve na tela;"
                           " o que dá para comparar é o tipo de ordem.")
                bate = resolvido and (tipo == extrair.ORDEM_COMPLETA) == completa
        elif problematica == "sorting":
            classes = analise.get("classes") or (caso.get("configuracao") or {}).get("classes")
            aloc = analise.get("alocacao") or {}
            definidas = {a: v["classes_possiveis"][0] for a, v in aloc.items()
                         if len(v["classes_possiveis"]) == 1}
            abertas = ["%s (%s)" % (a, " ou ".join(v["classes_possiveis"]))
                       for a, v in aloc.items() if len(v["classes_possiveis"]) > 1]
            nosso = _classes(definidas, classes, ordem)
            if abertas:
                nosso += " · ainda entre duas classes: " + ", ".join(abertas)
            if tela:
                deles = extrair.extrai_classes(tela, ordem, classes)
                oficial = _classes(deles, classes, ordem)
                bate = not abertas and definidas == deles
        elif problematica in ("beneficio_custo", "portfolio"):
            custos = caso.get("custos") or []
            custo = lambda ps: _num(sum(custos[ordem.index(p)] for p in ps))  # noqa: E731
            carteira = (analise.get("carteira_mais_frequente") or {}).get("projetos") or []
            nosso = "Carteira: %s (custo %s)." % (_lista(carteira, ordem), custo(carteira))
            if len(analise.get("portfolios_encontrados") or []) > 1:
                nosso += " É a mais frequente nas amostras de pesos; outra carteira ainda é possível."
            if tela:
                deles = extrair.extrai_carteira(tela, ordem)
                oficial = "Carteira: %s (custo %s)." % (_lista(deles, ordem), custo(deles))
                bate = set(carteira) == set(deles)
    except extrair.TelaIlegivel:
        return {"nosso": nosso, "oficial": None, "bate": None}
    return {"nosso": nosso, "oficial": oficial, "bate": bate}
