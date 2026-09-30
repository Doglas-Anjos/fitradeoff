# -*- coding: utf-8 -*-
"""Lê o resultado na tela final do FITradeoff oficial.

`resultados/oficial.json` guarda, por caso, o texto da última tela do sistema de
referência: as linhas do `body` coladas com `" | "` e as células com tabulação.
É a única prova que sobra do que ele **concluiu** — a sessão roda num servidor
de terceiros e não se refaz de graça — e é o que permite travar o resultado, e
não só a contagem de perguntas.

Cada problemática escreve o desfecho num formato próprio, daí um extrator para
cada uma. Todos falham alto, por `TelaIlegivel`: um extrator que devolvesse
vazio ao não entender a tela transformaria a comparação de resultado num teste
que passa sem comparar nada — pior do que não existir, porque parece cobertura.
"""

from __future__ import annotations

import re

SEPARADOR_DE_LINHA = " | "
SEPARADOR_DE_CELULA = "\t"

#: Os dois desfechos que a tela do ranking anuncia, com o nome que usamos.
ORDEM_COMPLETA = "ordem completa"
PRE_ORDEM = "pré-ordem completa"

_CATEGORIA = re.compile(r"^C(\d+)$")


class TelaIlegivel(ValueError):
    """A tela não traz o resultado onde ele deveria estar.

    Exceção, e não retorno vazio, por decisão: ver o cabeçalho do módulo.
    """


def _grade(tela):
    return [linha.split(SEPARADOR_DE_CELULA)
            for linha in tela.split(SEPARADOR_DE_LINHA)]


def _cabecalho(grade, reconhece, oque):
    for i, celulas in enumerate(grade):
        if reconhece(celulas):
            return i
    raise TelaIlegivel("a tela não tem o cabeçalho da tabela de %s" % oque)


def _corpo(grade, i):
    """As linhas de dados logo abaixo do cabeçalho na posição ``i``.

    A tabela termina na primeira linha com outro número de colunas. Nada marca
    o fim dela: o IntraWeb despeja rótulos soltos ("Questions Answered:",
    "Total budget:") na sequência, no mesmo `body`, sem separação.
    """
    largura = len(grade[i])
    corpo = []
    for celulas in grade[i + 1:]:
        if len(celulas) != largura:
            break
        corpo.append(celulas)
    return corpo


def _iniciais(nome):
    return "".join(palavra[0] for palavra in nome.split()).upper()


def resolve_alternativa(rotulo, alternativas):
    """O rótulo que a tela mostra, de volta ao nome que foi cadastrado.

    O oficial encurta nome comprido para as iniciais na tabela de resultado --
    "Fornecedor A" volta como "FA" -- mas deixa "Alt 02" inteiro. Como a regra
    do corte não está documentada, aceitam-se as duas formas, e só quando **uma
    única** alternativa responde: com duas candidatas, escolher uma trocaria o
    vencedor sem que nada reclamasse.
    """
    rotulo = rotulo.strip()
    if rotulo in alternativas:
        return rotulo
    candidatas = [a for a in alternativas if _iniciais(a) == rotulo.upper()]
    if len(candidatas) != 1:
        raise TelaIlegivel(
            "o rótulo %r não identifica uma única alternativa entre %s"
            % (rotulo, list(alternativas)))
    return candidatas[0]


def extrai_vencedor(tela, alternativas):
    """Escolha: a alternativa da tabela "Alternatives ... Max Overall Value".

    Exige exatamente uma linha de dados. O oficial tabula só a recomendação;
    uma tabela com mais linhas é outro desfecho e merece ser olhada, não
    acomodada por uma leitura que pega a primeira e segue em frente.
    """
    grade = _grade(tela)
    i = _cabecalho(grade,
                   lambda c: c[0] == "Alternatives" and "Max Overall Value" in c,
                   "escolha")
    corpo = _corpo(grade, i)
    if len(corpo) != 1:
        raise TelaIlegivel(
            "a tabela da escolha tem %d linhas de dados; esperava só a recomendação"
            % len(corpo))
    return resolve_alternativa(corpo[0][0], alternativas)


#: Fim por esgotamento: nao ha mais pergunta de decomposicao, e o resultado e
#: parcial. O oficial oferece seguir pela avaliacao holistica ou encerrar.
PERGUNTAS_ESGOTADAS = "There are no comparisons to be made in the elicitation by decomposition anymore"


def terminou_por_esgotamento(tela):
    """O oficial encerrou porque as perguntas acabaram, sem conclusao completa?

    Na escolha e no ranking essa tela vem sem a tabela final: o que ele afirma e
    so que o resultado e parcial. (No beneficio-custo a mesma frase vem junto da
    carteira, e ai quem vale e a carteira.)
    """
    return PERGUNTAS_ESGOTADAS in tela


def extrai_escolhidas(tela, alternativas):
    """Escolha: todas as alternativas que a tabela final do oficial lista.

    Quase sempre e uma so, a recomendacao, e ``extrai_vencedor`` e o leitor
    certo para travar isso. Mas quando a elicitacao para porque as restantes
    ficaram equivalentes dentro do limiar, o oficial anuncia "a solution with 3
    alternatives" e tabula as tres. Para mostrar o desfecho dos dois lados, e
    esse conjunto que importa.
    """
    grade = _grade(tela)
    i = _cabecalho(grade,
                   lambda c: c[0] == "Alternatives" and "Max Overall Value" in c,
                   "escolha")
    corpo = _corpo(grade, i)
    if not corpo:
        raise TelaIlegivel("a tabela da escolha veio sem linhas")
    return [resolve_alternativa(linha[0], alternativas) for linha in corpo]


def extrai_desfecho_do_ranking(tela):
    """Ranking: ordem completa ou pré-ordem — é tudo o que a tela afirma em texto.

    A ordem em si sai num diagrama de Hasse desenhado, que não vira texto no
    `body`; o desfecho é o que dá para travar.

    Só serve para a tela do módulo de ranking. A tela da carteira **também**
    anuncia "A complete order has been found", falando da ordem dos projetos
    pela razão benefício-custo: apontar este extrator para lá devolveria uma
    resposta plausível e errada.
    """
    if "complete pre-order has been found" in tela:
        return PRE_ORDEM
    if "complete order has been found" in tela:
        return ORDEM_COMPLETA
    raise TelaIlegivel("a tela do ranking não anuncia ordem nem pré-ordem")


def extrai_classes(tela, alternativas, classes):
    """Sorting: a classe de cada alternativa, da tabela "Alternatives / Category".

    O oficial numera as categorias `C1..Cn` da pior para a melhor, e os nomes
    das nossas entram na configuração nessa mesma ordem — por isso `Cn` é
    `classes[n - 1]`, e não há tabela de tradução a manter.

    Cobre todas as alternativas do caso ou levanta: tabela truncada devolveria
    um dicionário menor, e comparar só o que veio deixaria passar exatamente a
    alternativa que mudou de classe.
    """
    grade = _grade(tela)
    i = _cabecalho(grade, lambda c: c[:2] == ["Alternatives", "Category"], "sorting")
    alocacao = {}
    for celulas in _corpo(grade, i):
        achado = _CATEGORIA.match(celulas[1].strip())
        if not achado:
            raise TelaIlegivel("categoria %r fora do padrão C1..Cn" % celulas[1])
        ordem = int(achado.group(1))
        if not 1 <= ordem <= len(classes):
            raise TelaIlegivel("categoria %s além das %d classes configuradas"
                               % (celulas[1], len(classes)))
        alocacao[resolve_alternativa(celulas[0], alternativas)] = classes[ordem - 1]
    faltam = sorted(set(alternativas) - set(alocacao))
    if faltam:
        raise TelaIlegivel("a tabela do sorting não classifica %s" % faltam)
    return alocacao


def extrai_carteira(tela, alternativas):
    """Benefício-custo: o conjunto de projetos da linha sob "Portfolio".

    Vem como ``[Alt 07, Alt 04, ...]\\t$143.00``. A ordem de exibição é a da
    razão benefício-custo dele e não coincide com a nossa, daí devolver
    conjunto: o que os dois sistemas têm de afirmar igual é **quais** projetos
    entram, não em que sequência aparecem.

    A âncora é o cabeçalho "Portfolio", e não o colchete: a mesma tela lista um
    ``[Alt 04]`` em cada linha do ranking de projetos logo abaixo, e a primeira
    delas seria lida como uma carteira de um projeto só.
    """
    grade = _grade(tela)
    i = _cabecalho(grade, lambda c: c[0] == "Portfolio", "benefício-custo")
    corpo = _corpo(grade, i)
    if not corpo:
        raise TelaIlegivel("o cabeçalho Portfolio não é seguido da carteira")
    bruto = corpo[0][0].strip()
    if not (bruto.startswith("[") and bruto.endswith("]")):
        raise TelaIlegivel("a carteira %r não vem entre colchetes" % bruto)
    dentro = bruto[1:-1].strip()
    if not dentro:
        raise TelaIlegivel("a carteira veio vazia")
    return {resolve_alternativa(p, alternativas) for p in dentro.split(",")}
