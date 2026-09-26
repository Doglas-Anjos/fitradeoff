/**
 * Catálogo dos gráficos e da elicitação: as visualizações do resultado, as
 * perguntas que o método faz ao decisor e a tela de conflito entre respostas.
 *
 * Quatro decisões que valem explicação:
 *
 * **Texto dentro de SVG é interface.** Rótulo de eixo, legenda, `<title>` de
 * barra e `aria-label` de figura entram aqui como qualquer botão. Um gráfico
 * legendado em português numa tela em inglês é o defeito mais visível que
 * existe, e é justamente o que passa batido em revisão.
 *
 * **Os termos da literatura mandam.** Em inglês, o "peso" do português é
 * `scaling constant`, nunca "weight"; a curva de valor é `value function`; a
 * avaliação holística é `holistic evaluation`; o diagrama é `Hasse diagram` e
 * o que ele mostra é `dominance`.
 *
 * **Plural em chaves separadas.** Nenhum número é colado num substantivo: a
 * frase existe inteira nas duas formas e o componente escolhe qual usar.
 *
 * **Frase com trecho em negrito vira três chaves** (`.antes`, `.termo`,
 * `.depois`). É o preço de manter o negrito no meio da frase sem cravar a
 * ordem das palavras do português no inglês.
 */

import { registrar } from "./index";
import "./nucleo";
/* Estas telas reaproveitam rótulos já escritos: "Relações de dominância" e
   "Alternativa" do resultado, "pior" e "melhor" da estrutura, e os exemplos de
   planilha do cadastro. Importar aqui garante que quem só importa este catálogo
   encontre essas chaves. */
import "./estrutura";
import "./paineis";

export const VISUALIZACOES = registrar({
  // --- as abas de visualização ----------------------------------------------
  "viz.aba.barras": { pt: "Barras", en: "Bars" },
  "viz.aba.radar": { pt: "Radar", en: "Radar" },
  "viz.aba.bolhas": { pt: "Bolhas", en: "Bubbles" },
  "viz.aba.tabela": { pt: "Tabela", en: "Table" },

  /* O que o leitor de tela anuncia no lugar de cada gráfico. Sem isto a figura
     é um buraco na página. */
  "viz.barras.rotulo": {
    pt: "Desempenho por critério",
    en: "Performance by criterion",
  },
  "viz.radar.rotulo": {
    pt: "Desempenho por critério, em radar",
    en: "Performance by criterion, radar chart",
  },
  "viz.bolhas.rotulo": {
    pt: "Desempenho por critério, em bolhas",
    en: "Performance by criterion, bubble chart",
  },

  /* A faixa de leitura vazia e o unico lugar da tela que diz o que o eixo
     vertical mede. Sem ela o grafico tem numeros de 0 a 1 sem dizer de que. */
  /* A tabela alternativa das faixas: existe para quem nao consegue ler a
     barra. Estava cravada em portugues, entao trocar o idioma deixava metade
     do grafico para tras. */
  "faixa.verTabela": { pt: "Ver como tabela", en: "View as a table" },
  "faixa.item": { pt: "Item", en: "Item" },
  "faixa.minimo": { pt: "Mínimo", en: "Minimum" },
  "faixa.maximo": { pt: "Máximo", en: "Maximum" },
  "viz.eixo.legenda": {
    pt: "Aponte um critério para ver os valores · eixo: 0 = pior possível, 1 = melhor possível",
    en: "Point at a criterion to read the values · axis: 0 = worst possible, 1 = best possible",
  },
  "viz.tabela.normalizado": {
    pt: "mostrar valor normalizado (0 a 1) em vez da unidade original",
    en: "show the normalized value (0 to 1) instead of the original unit",
  },

  "viz.dica.titulo": { pt: "Para que servem", en: "What these are for" },
  "viz.dica.corpo1.antes": {
    pt: "É com estes gráficos que você faz a ",
    en: "These charts are how you do the ",
  },
  "viz.dica.corpo1.termo": {
    pt: "avaliação holística",
    en: "holistic evaluation",
  },
  "viz.dica.corpo1.depois": {
    pt: ": olha duas alternativas reais e declara qual prefere.",
    en: ": you look at two real alternatives and state which one you prefer.",
  },
  "viz.dica.corpo2": {
    pt: "Todas mostram o valor de 0 a 1 - pior a melhor dentro de cada critério. Reais e dias não caberiam no mesmo eixo.",
    en: "All of them show value from 0 to 1 - worst to best within each criterion. Money and days would not fit on the same axis.",
  },
  "viz.semAlternativa": {
    pt: "Marque ao menos uma alternativa para ver o gráfico.",
    en: "Select at least one alternative to see the chart.",
  },
  "viz.esconderEmpates": {
    pt: "esconder critérios em que todas empatam",
    en: "hide criteria where every alternative ties",
  },
  "viz.escondido.um": { pt: "({n} escondido)", en: "({n} hidden)" },
  "viz.escondido.varios": { pt: "({n} escondidos)", en: "({n} hidden)" },

  // --- diagrama de Hasse ----------------------------------------------------
  "viz.hasse.rotulo": {
    pt: "Diagrama de dominância entre as alternativas",
    en: "Hasse diagram of dominance between the alternatives",
  },
  "viz.hasse.dica.titulo": {
    pt: "Como ler o diagrama",
    en: "How to read the diagram",
  },
  "viz.hasse.dica.corpo1.antes": { pt: "Uma seta de ", en: "An arrow from " },
  "viz.hasse.dica.corpo1.termo": { pt: "X para Y", en: "X to Y" },
  "viz.hasse.dica.corpo1.depois": {
    pt: " significa que X vence Y para qualquer conjunto de pesos ainda possível - não depende de mais nenhuma resposta sua.",
    en: " means X beats Y for every set of scaling constants still possible - it does not depend on any further answer from you.",
  },
  "viz.hasse.dica.corpo2.antes": { pt: "Alternativas ", en: "Alternatives " },
  "viz.hasse.dica.corpo2.termo": { pt: "lado a lado", en: "side by side" },
  "viz.hasse.dica.corpo2.depois": {
    pt: " são incomparáveis: trocam de posição conforme os pesos. É entre elas que falta informação.",
    en: " are incomparable: they swap positions depending on the scaling constants. They are where information is still missing.",
  },
  "viz.hasse.dica.corpo3": {
    pt: "Setas redundantes são omitidas: se X vence Y e Y vence Z, a seta de X para Z fica subentendida.",
    en: "Redundant arrows are left out: if X beats Y and Y beats Z, the arrow from X to Z is implied.",
  },
  /* Tooltip de aresta e de nó. Os nomes são dados do decisor e entram como
     valor, nunca traduzidos. */
  "viz.hasse.vence": { pt: "{de} vence {para}", en: "{de} beats {para}" },
  "viz.hasse.no": { pt: "{nome} - nível {n}", en: "{nome} - level {n}" },
  "viz.hasse.verLista": { pt: "Ver como lista", en: "View as a list" },
  "viz.hasse.nivel": { pt: "nível {n}:", en: "level {n}:" },
  "viz.hasse.incomparaveis": {
    pt: "(incomparáveis entre si)",
    en: "(incomparable with each other)",
  },

  // --- gráfico de classificação (Gantt) -------------------------------------
  "viz.gantt.titulo": {
    pt: "Faixa de valor e classe de cada alternativa",
    en: "Value range and class of each alternative",
  },
  "viz.gantt.dica.titulo": { pt: "Como ler", en: "How to read this" },
  "viz.gantt.dica.corpo1": {
    pt: "A barra vai do menor ao maior valor global que a alternativa pode ter, dado o que você já respondeu.",
    en: "The bar spans the lowest to the highest global value the alternative can take, given what you have answered so far.",
  },
  "viz.gantt.dica.corpo2": {
    pt: "Barra inteira dentro de uma faixa: alternativa classificada. Barra atravessando um perfil: ainda indefinida - e você vê por quanto.",
    en: "Bar entirely inside one class: the alternative is sorted. Bar crossing a profile: still unsettled - and you can see by how much.",
  },
  "viz.gantt.classeFaixa": {
    pt: "{classe}: de {de} a {ate}",
    en: "{classe}: from {de} to {ate}",
  },
  "viz.gantt.barra": { pt: "{nome}: {de} a {ate}", en: "{nome}: {de} to {ate}" },
  /* Uma alternativa indefinida tem pelo menos duas classes possíveis, então o
     singular é inalcançável e não tem chave. */
  "viz.gantt.classes": { pt: "{n} classes", en: "{n} classes" },

  // --- exportar o gráfico ---------------------------------------------------
  "viz.salvar.rotulo": { pt: "salvar imagem", en: "save image" },
  "viz.salvar.erro": {
    pt: "não encontrei o gráfico nesta seção",
    en: "could not find the chart in this section",
  },

  // --- sensibilidade nas consequências --------------------------------------
  "viz.sensibilidade.titulo": {
    pt: "E se os números estiverem errados?",
    en: "What if the numbers are wrong?",
  },
  "viz.sensibilidade.dica.titulo": {
    pt: "Sensibilidade nas consequências",
    en: "Sensitivity analysis on the consequences",
  },
  "viz.sensibilidade.dica.corpo1.antes": {
    pt: "Sorteia variações nos desempenhos que você informou e resolve o problema de novo em cada cenário, com as ",
    en: "It draws random variations in the performances you entered and solves the problem again in each scenario, with your ",
  },
  "viz.sensibilidade.dica.corpo1.termo": {
    pt: "mesmas respostas",
    en: "same answers",
  },
  "viz.sensibilidade.dica.corpo1.depois": { pt: " suas.", en: "." },
  "viz.sensibilidade.dica.corpo2": {
    pt: "Se a recomendação se mantém na maioria dos cenários, ela não depende de precisão nos dados. Se muda muito, vale conferir os números antes de decidir.",
    en: "If the recommendation holds in most scenarios, it does not depend on precise data. If it changes a lot, check the numbers before deciding.",
  },
  "viz.sensibilidade.variar": { pt: "Variar em até", en: "Vary by up to" },
  "viz.sensibilidade.variar.rotulo": {
    pt: "Percentual de variação",
    en: "Variation percentage",
  },
  "viz.sensibilidade.variar.sufixo": {
    pt: "% para mais e para menos",
    en: "% up and down",
  },
  "viz.sensibilidade.rodar": {
    pt: "Rodar 200 cenários",
    en: "Run 200 scenarios",
  },
  "viz.sensibilidade.rodando": { pt: "Rodando…", en: "Running…" },
  "viz.sensibilidade.criterios": {
    pt: "Critérios a variar",
    en: "Criteria to vary",
  },
  "viz.sensibilidade.semCriterio": {
    pt: "Escolha ao menos um critério.",
    en: "Pick at least one criterion.",
  },
  "viz.sensibilidade.erro.faixa": {
    pt: "A variação precisa ser um percentual entre 0 e 100.",
    en: "The variation must be a percentage between 0 and 100.",
  },
  "viz.sensibilidade.mantiveram": {
    pt: "dos {n} cenários mantiveram a mesma resposta",
    en: "of the {n} scenarios kept the same answer",
  },
  "viz.sensibilidade.leitura.alta": {
    pt: "A recomendação não depende de precisão nos dados que você informou.",
    en: "The recommendation does not depend on precision in the data you entered.",
  },
  "viz.sensibilidade.leitura.media": {
    pt: "A recomendação é razoavelmente estável, mas confira os números dos critérios que mais oscilam.",
    en: "The recommendation is reasonably stable, but check the numbers of the criteria that swing the most.",
  },
  "viz.sensibilidade.leitura.baixa": {
    pt: "A recomendação muda com facilidade. Vale revisar os dados antes de decidir.",
    en: "The recommendation changes easily. It is worth reviewing the data before deciding.",
  },
  "viz.sensibilidade.frequencia": {
    pt: "Em quantos cenários cada alternativa apareceu na solução",
    en: "In how many scenarios each alternative appeared in the solution",
  },
  "viz.sensibilidade.naSolucaoOriginal": {
    pt: "{nome} (na solução original)",
    en: "{nome} (in the original solution)",
  },
  "viz.sensibilidade.destaque": {
    pt: "Em destaque, as que estavam na solução antes de variar nada.",
    en: "Highlighted: the ones in the solution before anything varied.",
  },

  // --- elicitação: o que serve a mais de uma tela ---------------------------
  /* A faixa de um critério, do pior ao melhor desempenho. Pior e melhor já
     vêm com a unidade colada, porque a unidade é dado do problema. */
  "elicitacao.faixa": {
    pt: "de {pior} (pior) até {melhor} (melhor)",
    en: "from {pior} (worst) to {melhor} (best)",
  },
  "elicitacao.confirmarOrdem": {
    pt: "Confirmar ordem e começar",
    en: "Confirm order and start",
  },
  "elicitacao.registrar": { pt: "Registrar", en: "Record" },

  // --- elicitação: ordem das constantes de escala ---------------------------
  "elicitacao.ordem.titulo": {
    pt: "Ordem de importância",
    en: "Order of importance",
  },
  "elicitacao.ordem.dica.titulo": {
    pt: "Importância de quê, exatamente",
    en: "Importance of what, exactly",
  },
  "elicitacao.ordem.dica.corpo1.antes": {
    pt: "Não é qual critério importa mais no abstrato. É qual ",
    en: "It is not which criterion matters most in the abstract. It is which ",
  },
  "elicitacao.ordem.dica.corpo1.termo": {
    pt: "faixa de desempenho",
    en: "range of performance",
  },
  "elicitacao.ordem.dica.corpo1.depois": {
    pt: " vale mais.",
    en: " is worth more.",
  },
  "elicitacao.ordem.dica.corpo2": {
    pt: "Prazo variando de 45 para 12 dias pode valer mais que custo variando de R$ 15,80 para R$ 10,20 - ou menos. Depende dos números do seu problema, não da sua opinião sobre prazo e custo.",
    en: "Lead time going from 45 to 12 days may be worth more than cost going from $15.80 to $10.20 - or less. It depends on the numbers in your problem, not on your opinion about lead time and cost.",
  },
  "elicitacao.ordem.dica.corpo3": {
    pt: "Por isso cada critério mostra a faixa ao lado do nome.",
    en: "That is why each criterion shows its range next to the name.",
  },
  "elicitacao.ordem.instrucao.antes": {
    pt: "Ordene do mais para o menos importante, supondo que cada critério vá do ",
    en: "Order from most to least important, assuming each criterion goes from its ",
  },
  "elicitacao.ordem.instrucao.meio": { pt: " ao ", en: " to its " },
  "elicitacao.ordem.instrucao.depois": {
    pt: " desempenho possível.",
    en: " possible performance.",
  },
  "elicitacao.modo.pares": {
    pt: "Comparar dois a dois",
    en: "Compare two at a time",
  },
  "elicitacao.modo.lista": { pt: "Ordenar a lista", en: "Sort the list" },
  "elicitacao.modo.global": {
    pt: "Escolher um a um",
    en: "Pick one at a time",
  },
  "elicitacao.global.pergunta.antes": {
    pt: "Entre os que sobraram, qual você prefere levar do ",
    en: "Among the ones left, which would you rather take from its ",
  },
  "elicitacao.global.pergunta.meio": { pt: " ao ", en: " to its " },
  "elicitacao.global.pergunta.depois": {
    pt: " desempenho?",
    en: " performance?",
  },
  "elicitacao.global.desfazer": {
    pt: "Desfazer última escolha",
    en: "Undo the last pick",
  },

  // --- elicitação: comparação par a par ------------------------------------
  "elicitacao.par.pergunta": {
    pt: "Qual melhora você prefere?",
    en: "Which improvement do you prefer?",
  },
  "elicitacao.par.ordemDefinida": { pt: "Ordem definida", en: "Order settled" },
  "elicitacao.par.dica.titulo": {
    pt: "Por que comparar assim",
    en: "Why compare this way",
  },
  "elicitacao.par.dica.corpo1": {
    pt: "Cada critério vai do seu pior ao seu melhor desempenho possível. A pergunta é qual dessas duas melhoras vale mais para você.",
    en: "Each criterion goes from its worst to its best possible performance. The question is which of those two improvements is worth more to you.",
  },
  "elicitacao.par.dica.corpo2.antes": {
    pt: "Não é qual critério é mais importante no abstrato - é qual ",
    en: "It is not which criterion is more important in the abstract - it is which ",
  },
  "elicitacao.par.dica.corpo2.termo": { pt: "faixa", en: "range" },
  "elicitacao.par.dica.corpo2.depois": {
    pt: " pesa mais, e a faixa está desenhada nos dois cartões.",
    en: " weighs more, and the range is drawn on both cards.",
  },
  "elicitacao.par.respondidas.um": { pt: "{n} respondida", en: "{n} answered" },
  "elicitacao.par.respondidas.varios": {
    pt: "{n} respondidas",
    en: "{n} answered",
  },
  "elicitacao.par.restantes.um": { pt: "~{n} restante", en: "~{n} to go" },
  "elicitacao.par.restantes.varios": { pt: "~{n} restantes", en: "~{n} to go" },
  "elicitacao.par.melhorarIsto": { pt: "melhorar isto", en: "improve this" },
  "elicitacao.par.ouMelhorarIsto": {
    pt: "ou melhorar isto",
    en: "or improve this",
  },
  "elicitacao.par.prefiro": {
    pt: "Prefiro esta melhora",
    en: "I prefer this improvement",
  },
  "elicitacao.par.escolhida": { pt: "Escolhida", en: "Chosen" },
  "elicitacao.par.indiferente": {
    pt: "as duas valem o mesmo",
    en: "both are worth the same",
  },
  "elicitacao.par.voltarUma": { pt: "voltar uma", en: "back one" },
  "elicitacao.par.ordemFinal": { pt: "Ordem final", en: "Final order" },
  "elicitacao.par.ordemParcial": { pt: "Ordem parcial", en: "Partial order" },
  "elicitacao.par.empates.um": {
    pt: "Você declarou {n} empate. Como o método precisa de uma sequência, a posição relativa nesse par foi arbitrada - não muda o resultado, porque nada foi afirmado sobre ele.",
    en: "You declared {n} tie. Since the method needs a sequence, the relative position in that pair was set arbitrarily - it does not change the result, because nothing was stated about it.",
  },
  "elicitacao.par.empates.varios": {
    pt: "Você declarou {n} empates. Como o método precisa de uma sequência, a posição relativa nesses pares foi arbitrada - não muda o resultado, porque nada foi afirmado sobre eles.",
    en: "You declared {n} ties. Since the method needs a sequence, the relative position in those pairs was set arbitrarily - it does not change the result, because nothing was stated about them.",
  },

  // --- elicitação: a pergunta de tradeoff ----------------------------------
  /* Uma frase so, com os dois ganhos como nos. A versao anterior era partida em
     "antes", "termo" e "depois", o que obriga todo idioma a pôr o destaque na
     mesma posição da frase portuguesa. */
  "elicitacao.tradeoff.pergunta.direta": {
    pt: "O que você prefere ter: {a} ou {b}?",
    en: "Which would you rather have: {a} or {b}?",
  },
  "elicitacao.tradeoff.resto": {
    pt: "Em todos os outros critérios as duas situações são idênticas e estão no pior nível possível.",
    en: "On every other criterion the two situations are identical and sit at the worst possible level.",
  },
  "elicitacao.tradeoff.igualNasDuas": {
    pt: "igual nas duas",
    en: "same in both",
  },
  "elicitacao.tradeoff.noPior": {
    pt: "no pior nível possível",
    en: "at the worst possible level",
  },
  "elicitacao.tradeoff.noMelhor": {
    pt: "no melhor nível possível",
    en: "at the best possible level",
  },
  "elicitacao.tradeoff.escolher": {
    pt: "Prefiro a {situacao}",
    en: "I prefer {situacao}",
  },
  "elicitacao.tradeoff.escolhida": { pt: "Escolhida", en: "Chosen" },
  "elicitacao.tradeoff.nenhuma": {
    pt: "Nenhuma das duas:",
    en: "Neither one:",
  },
  "elicitacao.tradeoff.dica.titulo": {
    pt: "Por que as duas são tão ruins",
    en: "Why both are so bad",
  },
  "elicitacao.tradeoff.dica.corpo1": {
    pt: "É de propósito. Deixando tudo no pior nível menos um ponto, a comparação isola exatamente o que se quer medir: o quanto vale melhorar aquele critério.",
    en: "It is on purpose. With everything at the worst level except one point, the comparison isolates exactly what is being measured: how much improving that criterion is worth.",
  },
  "elicitacao.tradeoff.dica.corpo2": {
    pt: "Se as situações fossem realistas, sua resposta misturaria vários efeitos ao mesmo tempo e não diria nada sobre os pesos.",
    en: "If the situations were realistic, your answer would mix several effects at once and say nothing about the scaling constants.",
  },
  "elicitacao.tradeoff.dica.corpo3": {
    pt: "Nenhuma das duas é uma alternativa real do seu problema.",
    en: "Neither of them is a real alternative in your problem.",
  },
  "elicitacao.tradeoff.situacaoA": { pt: "Situação A", en: "Situation A" },
  "elicitacao.tradeoff.situacaoB": { pt: "Situação B", en: "Situation B" },

  // --- elicitação: curva de valor (função de valor intra-critério) ----------
  "elicitacao.curva.titulo": {
    pt: "Curva de valor - {nome}",
    en: "Value function - {nome}",
  },
  "elicitacao.curva.rotulo": {
    pt: "Curva de valor de {nome}",
    en: "Value function of {nome}",
  },
  "elicitacao.curva.dica.titulo": {
    pt: "Por que isto importa",
    en: "Why this matters",
  },
  "elicitacao.curva.dica.corpo1": {
    pt: "Sem elicitar, o método assume que valor cresce em linha reta com o desempenho - a linha pontilhada no gráfico.",
    en: "With nothing elicited, the method assumes value grows in a straight line with performance - the dashed line in the chart.",
  },
  "elicitacao.curva.dica.corpo2": {
    pt: "Mas ir de 45 para 30 dias pode valer muito mais que ir de 30 para 15. Cada resposta aqui corrige essa suposição.",
    en: "But going from 45 to 30 days may be worth far more than going from 30 to 15. Each answer here corrects that assumption.",
  },
  "elicitacao.curva.dica.corpo3": {
    pt: "Pular é legítimo: a reta continua sendo uma escolha razoável.",
    en: "Skipping is legitimate: the straight line remains a reasonable choice.",
  },
  "elicitacao.curva.pergunta.antes": { pt: "Entre ", en: "Between " },
  "elicitacao.curva.pergunta.meio": { pt: " e ", en: " and " },
  "elicitacao.curva.pergunta.depois": {
    pt: ", qual desempenho fica ",
    en: ", which performance sits ",
  },
  "elicitacao.curva.pergunta.termo": {
    pt: "no meio do caminho em valor",
    en: "halfway in value",
  },
  "elicitacao.curva.explicacao": {
    pt: "Ou seja: sair de {de} até ali vale tanto quanto sair dali até {ate}.",
    en: "In other words: going from {de} to there is worth as much as going from there to {ate}.",
  },
  "elicitacao.curva.entrada.rotulo": {
    pt: "Desempenho intermediário em {nome}",
    en: "Intermediate performance in {nome}",
  },
  "elicitacao.curva.erro.numero": {
    pt: "Informe um número na unidade do critério.",
    en: "Enter a number in the unit of the criterion.",
  },
  "elicitacao.curva.erro.intervalo": {
    pt: "O desempenho precisa ficar entre {de} e {ate}.",
    en: "The performance has to fall between {de} and {ate}.",
  },
  "elicitacao.curva.detalhada": {
    pt: "A curva já está detalhada o bastante. Salve para usá-la na decisão.",
    en: "The curve is detailed enough. Save it to use in the decision.",
  },
  "elicitacao.curva.usarCurva.um": {
    pt: "Usar esta curva ({n} ponto)",
    en: "Use this curve ({n} point)",
  },
  "elicitacao.curva.usarCurva.varios": {
    pt: "Usar esta curva ({n} pontos)",
    en: "Use this curve ({n} points)",
  },
  "elicitacao.curva.usarReta": {
    pt: "Usar a reta",
    en: "Use the straight line",
  },
  "elicitacao.curva.recomecar": { pt: "recomeçar", en: "start over" },
  "elicitacao.curva.cancelar": { pt: "cancelar", en: "cancel" },
  "elicitacao.curva.eixo.pior": { pt: "{valor} (pior)", en: "{valor} (worst)" },
  "elicitacao.curva.eixo.melhor": {
    pt: "{valor} (melhor)",
    en: "{valor} (best)",
  },
  "elicitacao.curva.ponto": {
    pt: "{consequencia} {unidade} vale {valor}",
    en: "{consequencia} {unidade} is worth {valor}",
  },

  // --- elicitação: avaliação holística -------------------------------------
  "elicitacao.holistico.titulo": {
    pt: "Ou compare duas alternativas reais",
    en: "Or compare two real alternatives",
  },
  "elicitacao.holistico.dica.titulo": {
    pt: "Avaliação holística",
    en: "Holistic evaluation",
  },
  "elicitacao.holistico.dica.corpo1": {
    pt: "Em vez de responder sobre situações hipotéticas, você olha os gráficos acima e diz qual alternativa prefere.",
    en: "Instead of answering about hypothetical situations, you look at the charts above and say which alternative you prefer.",
  },
  "elicitacao.holistico.dica.corpo2": {
    pt: "Vale quando a pergunta de tradeoff fica cansativa - com muitos critérios, comparar coisas reais é mais natural.",
    en: "It pays off when the tradeoff question gets tiring - with many criteria, comparing real things is more natural.",
  },
  "elicitacao.holistico.dica.corpo3": {
    pt: "A declaração entra no mesmo modelo. Se contradisser uma resposta anterior, o sistema avisa.",
    en: "The statement enters the same model. If it contradicts an earlier answer, the system says so.",
  },
  "elicitacao.holistico.prefiro": { pt: "prefiro…", en: "I prefer…" },
  "elicitacao.holistico.aEsta": { pt: "…a esta", en: "…over this one" },
  "elicitacao.holistico.emVezDe": { pt: "em vez de", en: "instead of" },
  "elicitacao.holistico.erro.iguais": {
    pt: "Escolha duas alternativas diferentes.",
    en: "Pick two different alternatives.",
  },

  // --- elicitação: declarações que se contradizem --------------------------
  "elicitacao.conflito.titulo.par": {
    pt: "Duas respostas se contradizem",
    en: "Two answers contradict each other",
  },
  "elicitacao.conflito.titulo.impossivel": {
    pt: "Essa afirmação não é possível aqui",
    en: "That statement is not possible here",
  },
  /* O número já chega com dois dígitos, para as declarações alinharem na
     coluna. */
  "elicitacao.conflito.declaracao": {
    pt: "declaração {n}",
    en: "statement {n}",
  },
  "elicitacao.conflito.antes": {
    pt: "você disse antes",
    en: "you said earlier",
  },
  "elicitacao.conflito.agora": {
    pt: "você acabou de dizer",
    en: "you just said",
  },
  "elicitacao.conflito.icone": { pt: "conflita com", en: "conflicts with" },
  "elicitacao.conflito.pergunta": {
    pt: "O que você quer fazer?",
    en: "What do you want to do?",
  },
  "elicitacao.conflito.passaAValer": {
    pt: "passa a valer: {resultado}",
    en: "becomes: {resultado}",
  },

  // --- importar de uma planilha --------------------------------------------
  "importacao.modelo": {
    pt: "Baixar planilha-modelo",
    en: "Download the template spreadsheet",
  },
  "importacao.arraste": {
    pt: "Arraste a planilha aqui",
    en: "Drag the spreadsheet here",
  },
  "importacao.formatos": {
    pt: ".xlsx ou .csv - até 2 MB",
    en: ".xlsx or .csv - up to 2 MB",
  },
  "importacao.escolher": { pt: "Escolher arquivo", en: "Choose a file" },
  "importacao.lendo": { pt: "Lendo {arquivo}…", en: "Reading {arquivo}…" },
  "importacao.colar.titulo": {
    pt: "Ou cole direto do Excel",
    en: "Or paste straight from Excel",
  },
  "importacao.colar.dica.titulo": { pt: "Como colar", en: "How to paste" },
  "importacao.colar.dica.corpo1.antes": {
    pt: "Selecione as células no Excel, ",
    en: "Select the cells in Excel, ",
  },
  "importacao.colar.dica.corpo1.cabecalho": {
    pt: "com o cabeçalho",
    en: "with the header row",
  },
  "importacao.colar.dica.corpo1.meio": {
    pt: " e as linhas ",
    en: " and the rows ",
  },
  "importacao.colar.dica.corpo1.e": { pt: " e ", en: " and " },
  "importacao.colar.dica.corpo1.depois": {
    pt: ", copie e cole aqui.",
    en: ", then copy and paste here.",
  },
  "importacao.colar.dica.corpo2": {
    pt: "Não precisa salvar arquivo nenhum.",
    en: "No need to save a file at all.",
  },
  "importacao.colar.rotulo": {
    pt: "Cole aqui os dados copiados da planilha",
    en: "Paste the data copied from the spreadsheet here",
  },
  "importacao.lerColado": {
    pt: "Ler o que foi colado",
    en: "Read what was pasted",
  },
  "importacao.requisitos.titulo": {
    pt: "O que a planilha precisa ter",
    en: "What the spreadsheet needs",
  },
  "importacao.requisitos.nota.antes": { pt: "A linha ", en: "The " },
  "importacao.requisitos.nota.depois": {
    pt: " é obrigatória: sem ela não dá para saber se um número alto é bom ou ruim. O formato .xls (Excel 97-2003) não é aceito - salve como .xlsx.",
    en: " row is required: without it there is no way to tell whether a high number is good or bad. The .xls format (Excel 97-2003) is not accepted - save as .xlsx.",
  },
  /* Exemplos da planilha. As palavras-chave da primeira coluna (criterio,
     direcao, unidade) e os valores max e min ficam de fora: são o formato que
     o leitor espera, não texto de tela. */
  "importacao.exemplo.qualidade": { pt: "Qualidade", en: "Quality" },
  "importacao.exemplo.custo": { pt: "Custo", en: "Cost" },
  "importacao.exemplo.prazo": { pt: "Prazo", en: "Lead time" },
  "importacao.exemplo.fornecedor": {
    pt: "Fornecedor A",
    en: "Supplier A",
  },
  "importacao.exemplo.dias": { pt: "dias", en: "days" },

  // --- decisões que este navegador já abriu --------------------------------
  "recentes.titulo": {
    pt: "Voltar a uma decisão",
    en: "Back to a decision",
  },
  "recentes.agora": { pt: "agora", en: "just now" },
  "recentes.minutos": { pt: "há {n} min", en: "{n} min ago" },
  "recentes.horas": { pt: "há {n} h", en: "{n} h ago" },
  "recentes.ontem": { pt: "ontem", en: "yesterday" },
  /* Um dia só é "ontem", então esta frase começa em dois e não tem singular. */
  "recentes.dias": { pt: "há {n} dias", en: "{n} days ago" },
  "recentes.remover": {
    pt: "Remover {nome} da lista",
    en: "Remove {nome} from the list",
  },
  "recentes.nota": {
    pt: "Esta lista fica só neste navegador. As decisões em si ficam no servidor.",
    en: "This list stays in this browser only. The decisions themselves live on the server.",
  },
});
