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
  "viz.aba.barras": { pt: "Barras", en: "Bars", es: "Barras" },
  "viz.aba.radar": { pt: "Radar", en: "Radar", es: "Radar" },
  "viz.aba.bolhas": { pt: "Bolhas", en: "Bubbles", es: "Burbujas" },
  "viz.aba.tabela": { pt: "Tabela", en: "Table", es: "Tabla" },

  /* O que o leitor de tela anuncia no lugar de cada gráfico. Sem isto a figura
     é um buraco na página. */
  "viz.barras.rotulo": {
    pt: "Desempenho por critério",
    en: "Performance by criterion",
    es: "Desempeño por criterio",
  },
  "viz.radar.rotulo": {
    pt: "Desempenho por critério, em radar",
    en: "Performance by criterion, radar chart",
    es: "Desempeño por criterio, en radar",
  },
  "viz.bolhas.rotulo": {
    pt: "Desempenho por critério, em bolhas",
    en: "Performance by criterion, bubble chart",
    es: "Desempeño por criterio, en burbujas",
  },

  /* A faixa de leitura vazia e o unico lugar da tela que diz o que o eixo
     vertical mede. Sem ela o grafico tem numeros de 0 a 1 sem dizer de que. */
  /* A tabela alternativa das faixas: existe para quem nao consegue ler a
     barra. Estava cravada em portugues, entao trocar o idioma deixava metade
     do grafico para tras. */
  "faixa.verTabela": { pt: "Ver como tabela", en: "View as a table", es: "Ver como tabla" },
  "faixa.item": { pt: "Item", en: "Item", es: "Ítem" },
  "faixa.minimo": { pt: "Mínimo", en: "Minimum", es: "Mínimo" },
  "faixa.maximo": { pt: "Máximo", en: "Maximum", es: "Máximo" },
  "viz.eixo.legenda": {
    pt: "Aponte um critério para ver os valores · eixo: 0 = pior possível, 1 = melhor possível",
    en: "Point at a criterion to read the values · axis: 0 = worst possible, 1 = best possible",
    es: "Señale un criterio para ver los valores · eje: 0 = peor posible, 1 = mejor posible",
  },
  "viz.tabela.normalizado": {
    pt: "mostrar valor normalizado (0 a 1) em vez da unidade original",
    en: "show the normalized value (0 to 1) instead of the original unit",
    es: "mostrar el valor normalizado (0 a 1) en vez de la unidad original",
  },

  "viz.dica.titulo": { pt: "Para que servem", en: "What these are for", es: "Para qué sirven" },
  "viz.dica.corpo1.antes": {
    pt: "É com estes gráficos que você faz a ",
    en: "These charts are how you do the ",
    es: "Con estos gráficos usted hace la ",
  },
  "viz.dica.corpo1.termo": {
    pt: "avaliação holística",
    en: "holistic evaluation",
    es: "evaluación holística",
  },
  "viz.dica.corpo1.depois": {
    pt: ": olha duas alternativas reais e declara qual prefere.",
    en: ": you look at two real alternatives and state which one you prefer.",
    es: ": mira dos alternativas reales y declara cuál prefiere.",
  },
  "viz.dica.corpo2": {
    pt: "Todas mostram o valor de 0 a 1 - pior a melhor dentro de cada critério. Reais e dias não caberiam no mesmo eixo.",
    en: "All of them show value from 0 to 1 - worst to best within each criterion. Money and days would not fit on the same axis.",
    es: "Todas muestran el valor de 0 a 1 - peor a mejor dentro de cada criterio. El dinero y los días no cabrían en el mismo eje.",
  },
  "viz.semAlternativa": {
    pt: "Marque ao menos uma alternativa para ver o gráfico.",
    en: "Select at least one alternative to see the chart.",
    es: "Marque al menos una alternativa para ver el gráfico.",
  },
  "viz.esconderEmpates": {
    pt: "esconder critérios em que todas empatam",
    en: "hide criteria where every alternative ties",
    es: "ocultar criterios en los que todas empatan",
  },
  "viz.escondido.um": { pt: "({n} escondido)", en: "({n} hidden)", es: "({n} oculto)" },
  "viz.escondido.varios": { pt: "({n} escondidos)", en: "({n} hidden)", es: "({n} ocultos)" },

  // --- diagrama de Hasse ----------------------------------------------------
  "viz.hasse.rotulo": {
    pt: "Diagrama de dominância entre as alternativas",
    en: "Hasse diagram of dominance between the alternatives",
    es: "Diagrama de dominancia entre las alternativas",
  },
  "viz.hasse.dica.titulo": {
    pt: "Como ler o diagrama",
    en: "How to read the diagram",
    es: "Cómo leer el diagrama",
  },
  "viz.hasse.dica.corpo1.antes": { pt: "Uma seta de ", en: "An arrow from ", es: "Una flecha de " },
  "viz.hasse.dica.corpo1.termo": { pt: "X para Y", en: "X to Y", es: "X a Y" },
  "viz.hasse.dica.corpo1.depois": {
    pt: " significa que X vence Y para qualquer conjunto de pesos ainda possível - não depende de mais nenhuma resposta sua.",
    en: " means X beats Y for every set of scaling constants still possible - it does not depend on any further answer from you.",
    es: " significa que X vence a Y para cualquier conjunto de constantes de escala todavía posible - no depende de ninguna respuesta más suya.",
  },
  "viz.hasse.dica.corpo2.antes": { pt: "Alternativas ", en: "Alternatives ", es: "Las alternativas " },
  "viz.hasse.dica.corpo2.termo": { pt: "lado a lado", en: "side by side", es: "lado a lado" },
  "viz.hasse.dica.corpo2.depois": {
    pt: " são incomparáveis: trocam de posição conforme os pesos. É entre elas que falta informação.",
    en: " are incomparable: they swap positions depending on the scaling constants. They are where information is still missing.",
    es: " son incomparables: cambian de posición según las constantes de escala. Es entre ellas donde falta información.",
  },
  "viz.hasse.dica.corpo3": {
    pt: "Setas redundantes são omitidas: se X vence Y e Y vence Z, a seta de X para Z fica subentendida.",
    en: "Redundant arrows are left out: if X beats Y and Y beats Z, the arrow from X to Z is implied.",
    es: "Las flechas redundantes se omiten: si X vence a Y y Y vence a Z, la flecha de X a Z queda sobreentendida.",
  },
  /* Tooltip de aresta e de nó. Os nomes são dados do decisor e entram como
     valor, nunca traduzidos. */
  "viz.hasse.vence": { pt: "{de} vence {para}", en: "{de} beats {para}", es: "{de} vence a {para}" },
  "viz.hasse.no": { pt: "{nome} - nível {n}", en: "{nome} - level {n}", es: "{nome} - nivel {n}" },
  "viz.hasse.verLista": { pt: "Ver como lista", en: "View as a list", es: "Ver como lista" },
  "viz.hasse.nivel": { pt: "nível {n}:", en: "level {n}:", es: "nivel {n}:" },
  "viz.hasse.incomparaveis": {
    pt: "(incomparáveis entre si)",
    en: "(incomparable with each other)",
    es: "(incomparables entre sí)",
  },

  // --- gráfico de classificação (Gantt) -------------------------------------
  "viz.gantt.titulo": {
    pt: "Faixa de valor e classe de cada alternativa",
    en: "Value range and class of each alternative",
    es: "Franja de valor y clase de cada alternativa",
  },
  "viz.gantt.dica.titulo": { pt: "Como ler", en: "How to read this", es: "Cómo leer esto" },
  "viz.gantt.dica.corpo1": {
    pt: "A barra vai do menor ao maior valor global que a alternativa pode ter, dado o que você já respondeu.",
    en: "The bar spans the lowest to the highest global value the alternative can take, given what you have answered so far.",
    es: "La barra va del menor al mayor valor global que la alternativa puede tener, dado lo que usted ya respondió.",
  },
  "viz.gantt.dica.corpo2": {
    pt: "Barra inteira dentro de uma faixa: alternativa classificada. Barra atravessando um perfil: ainda indefinida - e você vê por quanto.",
    en: "Bar entirely inside one class: the alternative is sorted. Bar crossing a profile: still unsettled - and you can see by how much.",
    es: "Barra entera dentro de una clase: alternativa clasificada. Barra atravesando un perfil: todavía indefinida - y usted ve por cuánto.",
  },
  "viz.gantt.classeFaixa": {
    pt: "{classe}: de {de} a {ate}",
    en: "{classe}: from {de} to {ate}",
    es: "{classe}: de {de} a {ate}",
  },
  "viz.gantt.barra": { pt: "{nome}: {de} a {ate}", en: "{nome}: {de} to {ate}", es: "{nome}: {de} a {ate}" },
  /* Uma alternativa indefinida tem pelo menos duas classes possíveis, então o
     singular é inalcançável e não tem chave. */
  "viz.gantt.classes": { pt: "{n} classes", en: "{n} classes", es: "{n} clases" },

  // --- exportar o gráfico ---------------------------------------------------
  "viz.salvar.rotulo": { pt: "salvar imagem", en: "save image", es: "guardar imagen" },
  "viz.salvar.erro": {
    pt: "não encontrei o gráfico nesta seção",
    en: "could not find the chart in this section",
    es: "no se encontró el gráfico en esta sección",
  },

  // --- sensibilidade nas consequências --------------------------------------
  "viz.sensibilidade.titulo": {
    pt: "E se os números estiverem errados?",
    en: "What if the numbers are wrong?",
    es: "¿Y si los números están equivocados?",
  },
  "viz.sensibilidade.dica.titulo": {
    pt: "Sensibilidade nas consequências",
    en: "Sensitivity analysis on the consequences",
    es: "Sensibilidad en las consecuencias",
  },
  "viz.sensibilidade.dica.corpo1.antes": {
    pt: "Sorteia variações nos desempenhos que você informou e resolve o problema de novo em cada cenário, com as ",
    en: "It draws random variations in the performances you entered and solves the problem again in each scenario, with your ",
    es: "Sortea variaciones en los desempeños que usted informó y resuelve el problema de nuevo en cada escenario, con las ",
  },
  "viz.sensibilidade.dica.corpo1.termo": {
    pt: "mesmas respostas",
    en: "same answers",
    es: "mismas respuestas",
  },
  "viz.sensibilidade.dica.corpo1.depois": { pt: " suas.", en: ".", es: " suyas." },
  "viz.sensibilidade.dica.corpo2": {
    pt: "Se a recomendação se mantém na maioria dos cenários, ela não depende de precisão nos dados. Se muda muito, vale conferir os números antes de decidir.",
    en: "If the recommendation holds in most scenarios, it does not depend on precise data. If it changes a lot, check the numbers before deciding.",
    es: "Si la recomendación se mantiene en la mayoría de los escenarios, no depende de la precisión de los datos. Si cambia mucho, vale la pena revisar los números antes de decidir.",
  },
  "viz.sensibilidade.variar": { pt: "Variar em até", en: "Vary by up to", es: "Variar hasta" },
  "viz.sensibilidade.variar.rotulo": {
    pt: "Percentual de variação",
    en: "Variation percentage",
    es: "Porcentaje de variación",
  },
  "viz.sensibilidade.variar.sufixo": {
    pt: "% para mais e para menos",
    en: "% up and down",
    es: "% hacia arriba y hacia abajo",
  },
  "viz.sensibilidade.rodar": {
    pt: "Rodar 200 cenários",
    en: "Run 200 scenarios",
    es: "Correr 200 escenarios",
  },
  "viz.sensibilidade.rodando": { pt: "Rodando…", en: "Running…", es: "Corriendo…" },
  "viz.sensibilidade.criterios": {
    pt: "Critérios a variar",
    en: "Criteria to vary",
    es: "Criterios a variar",
  },
  "viz.sensibilidade.semCriterio": {
    pt: "Escolha ao menos um critério.",
    en: "Pick at least one criterion.",
    es: "Elija al menos un criterio.",
  },
  "viz.sensibilidade.erro.faixa": {
    pt: "A variação precisa ser um percentual entre 0 e 100.",
    en: "The variation must be a percentage between 0 and 100.",
    es: "La variación tiene que ser un porcentaje entre 0 y 100.",
  },
  "viz.sensibilidade.mantiveram": {
    pt: "dos {n} cenários mantiveram a mesma resposta",
    en: "of the {n} scenarios kept the same answer",
    es: "de los {n} escenarios mantuvieron la misma respuesta",
  },
  "viz.sensibilidade.leitura.alta": {
    pt: "A recomendação não depende de precisão nos dados que você informou.",
    en: "The recommendation does not depend on precision in the data you entered.",
    es: "La recomendación no depende de la precisión de los datos que usted informó.",
  },
  "viz.sensibilidade.leitura.media": {
    pt: "A recomendação é razoavelmente estável, mas confira os números dos critérios que mais oscilam.",
    en: "The recommendation is reasonably stable, but check the numbers of the criteria that swing the most.",
    es: "La recomendación es razonablemente estable, pero revise los números de los criterios que más oscilan.",
  },
  "viz.sensibilidade.leitura.baixa": {
    pt: "A recomendação muda com facilidade. Vale revisar os dados antes de decidir.",
    en: "The recommendation changes easily. It is worth reviewing the data before deciding.",
    es: "La recomendación cambia con facilidad. Vale la pena revisar los datos antes de decidir.",
  },
  "viz.sensibilidade.frequencia": {
    pt: "Em quantos cenários cada alternativa apareceu na solução",
    en: "In how many scenarios each alternative appeared in the solution",
    es: "En cuántos escenarios apareció cada alternativa en la solución",
  },
  "viz.sensibilidade.naSolucaoOriginal": {
    pt: "{nome} (na solução original)",
    en: "{nome} (in the original solution)",
    es: "{nome} (en la solución original)",
  },
  "viz.sensibilidade.destaque": {
    pt: "Em destaque, as que estavam na solução antes de variar nada.",
    en: "Highlighted: the ones in the solution before anything varied.",
    es: "Destacadas, las que estaban en la solución antes de variar nada.",
  },

  // --- elicitação: o que serve a mais de uma tela ---------------------------
  /* A faixa de um critério, do pior ao melhor desempenho. Pior e melhor já
     vêm com a unidade colada, porque a unidade é dado do problema. */
  "elicitacao.faixa": {
    pt: "de {pior} (pior) até {melhor} (melhor)",
    en: "from {pior} (worst) to {melhor} (best)",
    es: "de {pior} (peor) hasta {melhor} (mejor)",
  },
  /* Uma ponta da faixa desenhada, quando não há altura para nomear as pontas
     numa linha própria. Fica como chave, e não como parênteses colados no
     componente, porque a pontuação também é escolha de idioma: o dia em que o
     inglês preferir "worst: 45 days" a troca é aqui. */
  "elicitacao.faixa.extremo": {
    pt: "{valor} ({nivel})",
    en: "{valor} ({nivel})",
    es: "{valor} ({nivel})",
  },
  "elicitacao.confirmarOrdem": {
    pt: "Confirmar ordem e começar",
    en: "Confirm order and start",
    es: "Confirmar orden y comenzar",
  },
  "elicitacao.registrar": { pt: "Registrar", en: "Record", es: "Registrar" },

  // --- elicitação: ordem das constantes de escala ---------------------------
  "elicitacao.ordem.titulo": {
    pt: "Ordem de importância",
    en: "Order of importance",
    es: "Orden de importancia",
  },
  "elicitacao.ordem.dica.titulo": {
    pt: "Importância de quê, exatamente",
    en: "Importance of what, exactly",
    es: "Importancia de qué, exactamente",
  },
  "elicitacao.ordem.dica.corpo1.antes": {
    pt: "Não é qual critério importa mais no abstrato. É qual ",
    en: "It is not which criterion matters most in the abstract. It is which ",
    es: "No es cuál criterio importa más en abstracto. Es cuál ",
  },
  "elicitacao.ordem.dica.corpo1.termo": {
    pt: "faixa de desempenho",
    en: "range of performance",
    es: "franja de desempeño",
  },
  "elicitacao.ordem.dica.corpo1.depois": {
    pt: " vale mais.",
    en: " is worth more.",
    es: " vale más.",
  },
  "elicitacao.ordem.dica.corpo2": {
    pt: "Prazo variando de 45 para 12 dias pode valer mais que custo variando de R$ 15,80 para R$ 10,20 - ou menos. Depende dos números do seu problema, não da sua opinião sobre prazo e custo.",
    en: "Lead time going from 45 to 12 days may be worth more than cost going from $15.80 to $10.20 - or less. It depends on the numbers in your problem, not on your opinion about lead time and cost.",
    es: "El plazo variando de 45 a 12 días puede valer más que el costo variando de $15,80 a $10,20 - o menos. Depende de los números de su problema, no de su opinión sobre plazo y costo.",
  },
  "elicitacao.ordem.dica.corpo3": {
    pt: "Por isso cada critério mostra a faixa ao lado do nome.",
    en: "That is why each criterion shows its range next to the name.",
    es: "Por eso cada criterio muestra la franja al lado del nombre.",
  },
  "elicitacao.ordem.instrucao.antes": {
    pt: "Ordene do mais para o menos importante, supondo que cada critério vá do ",
    en: "Order from most to least important, assuming each criterion goes from its ",
    es: "Ordene del más al menos importante, suponiendo que cada criterio vaya del ",
  },
  "elicitacao.ordem.instrucao.meio": { pt: " ao ", en: " to its ", es: " al " },
  "elicitacao.ordem.instrucao.depois": {
    pt: " desempenho possível.",
    en: " possible performance.",
    es: " desempeño posible.",
  },
  "elicitacao.modo.pares": {
    pt: "Comparar dois a dois",
    en: "Compare two at a time",
    es: "Comparar de dos en dos",
  },
  "elicitacao.modo.lista": { pt: "Ordenar a lista", en: "Sort the list", es: "Ordenar la lista" },

  /* A saída da comparação par a par. Não é "não sei": ali a resposta pode ser
     pulada porque o par vira uma restrição a menos, e o método segue. Aqui a
     ordenação precisa ficar completa -- a inserção binária não tem onde
     encaixar um critério cuja posição ninguém disse. O que existe de verdade é
     trocar de modo, e é isso que se oferece. */
  "elicitacao.par.travou": {
    pt: "Não consegue comparar estes dois?",
    en: "Cannot compare these two?",
    es: "¿No consigue comparar estos dos?",
  },
  "elicitacao.par.travou.acao": {
    pt: "ordenar arrastando",
    en: "order by dragging",
    es: "ordenar arrastrando",
  },
  "elicitacao.par.travou.dica.titulo": {
    pt: "Por que não há “não sei” aqui",
    en: "Why there is no “I don't know” here",
    es: "Por qué no hay “no sé” aquí",
  },
  "elicitacao.par.travou.dica.corpo1": {
    pt: "Nas perguntas de tradeoff dá para pular: o par vira uma restrição a menos e o método segue com o que sobrou.",
    en: "In the tradeoff questions you can skip: the pair becomes one less constraint and the method carries on with what is left.",
    es: "En las preguntas de tradeoff se puede saltar: el par se convierte en una restricción menos y el método sigue con lo que queda.",
  },
  "elicitacao.par.travou.dica.corpo2": {
    pt: "A ordem dos critérios, não: ela precisa ficar completa, e um critério sem posição não tem onde entrar. Vendo todos de uma vez costuma ser mais fácil do que dois a dois.",
    en: "The ranking of criteria cannot: it has to be complete, and a criterion with no position has nowhere to go. Seeing them all at once is usually easier than two by two.",
    es: "El orden de los criterios no: tiene que quedar completo, y un criterio sin posición no tiene dónde entrar. Verlos todos a la vez suele ser más fácil que de dos en dos.",
  },
  "elicitacao.modo.global": {
    pt: "Escolher um a um",
    en: "Pick one at a time",
    es: "Elegir uno a uno",
  },
  "elicitacao.global.pergunta.antes": {
    pt: "Entre os que sobraram, qual você prefere levar do ",
    en: "Among the ones left, which would you rather take from its ",
    es: "Entre los que quedaron, ¿cuál prefiere llevar del ",
  },
  "elicitacao.global.pergunta.meio": { pt: " ao ", en: " to its ", es: " al " },
  "elicitacao.global.pergunta.depois": {
    pt: " desempenho?",
    en: " performance?",
    es: " desempeño?",
  },
  "elicitacao.global.desfazer": {
    pt: "Desfazer última escolha",
    en: "Undo the last pick",
    es: "Deshacer la última elección",
  },

  // --- elicitação: comparação par a par ------------------------------------
  "elicitacao.par.pergunta": {
    pt: "Qual melhora você prefere?",
    en: "Which improvement do you prefer?",
    es: "¿Cuál mejora prefiere?",
  },
  "elicitacao.par.ordemDefinida": { pt: "Ordem definida", en: "Order settled", es: "Orden definido" },
  "elicitacao.par.dica.titulo": {
    pt: "Por que comparar assim",
    en: "Why compare this way",
    es: "Por qué comparar así",
  },
  "elicitacao.par.dica.corpo1": {
    pt: "Cada critério vai do seu pior ao seu melhor desempenho possível. A pergunta é qual dessas duas melhoras vale mais para você.",
    en: "Each criterion goes from its worst to its best possible performance. The question is which of those two improvements is worth more to you.",
    es: "Cada criterio va de su peor a su mejor desempeño posible. La pregunta es cuál de esas dos mejoras vale más para usted.",
  },
  "elicitacao.par.dica.corpo2.antes": {
    pt: "Não é qual critério é mais importante no abstrato - é qual ",
    en: "It is not which criterion is more important in the abstract - it is which ",
    es: "No es cuál criterio es más importante en abstracto - es cuál ",
  },
  "elicitacao.par.dica.corpo2.termo": { pt: "faixa", en: "range", es: "franja" },
  "elicitacao.par.dica.corpo2.depois": {
    pt: " pesa mais, e a faixa está desenhada nos dois cartões.",
    en: " weighs more, and the range is drawn on both cards.",
    es: " pesa más, y la franja está dibujada en las dos tarjetas.",
  },
  "elicitacao.par.respondidas.um": { pt: "{n} respondida", en: "{n} answered", es: "{n} respondida" },
  "elicitacao.par.respondidas.varios": {
    pt: "{n} respondidas",
    en: "{n} answered",
    es: "{n} respondidas",
  },
  "elicitacao.par.restantes.um": { pt: "~{n} restante", en: "~{n} to go", es: "~{n} restante" },
  "elicitacao.par.restantes.varios": { pt: "~{n} restantes", en: "~{n} to go", es: "~{n} restantes" },
  "elicitacao.par.melhorarIsto": { pt: "melhorar isto", en: "improve this", es: "mejorar esto" },
  "elicitacao.par.ouMelhorarIsto": {
    pt: "ou melhorar isto",
    en: "or improve this",
    es: "o mejorar esto",
  },
  "elicitacao.par.prefiro": {
    pt: "Prefiro esta melhora",
    en: "I prefer this improvement",
    es: "Prefiero esta mejora",
  },
  "elicitacao.par.escolhida": { pt: "Escolhida", en: "Chosen", es: "Elegida" },
  "elicitacao.par.indiferente": {
    pt: "as duas valem o mesmo",
    en: "both are worth the same",
    es: "las dos valen lo mismo",
  },
  /* A dica do botão central. Quem nunca usou o método lê "as duas valem o
     mesmo" como "tanto faz, pule" — e é o oposto: é uma afirmação forte, que
     restringe os pesos tanto quanto escolher um lado. */
  "elicitacao.par.indiferente.dica.titulo": {
    pt: "As duas valem o mesmo",
    en: "Both are worth the same",
    es: "Las dos valen lo mismo",
  },
  "elicitacao.par.indiferente.dica.corpo1": {
    pt: "Responda assim quando levar um critério do pior ao melhor desempenho valer exatamente o mesmo que levar o outro. Os dois lados puxam com a mesma força.",
    en: "Answer this when taking one criterion from worst to best performance is worth exactly the same as taking the other. Both sides pull with equal force.",
    es: "Responda así cuando llevar un criterio del peor al mejor desempeño valga exactamente lo mismo que llevar el otro. Los dos lados tiran con la misma fuerza.",
  },
  "elicitacao.par.indiferente.dica.corpo2": {
    pt: "Não é pular a pergunta: é uma declaração, e ela fixa a relação entre os dois pesos com a mesma força de escolher um lado.",
    en: "This is not skipping the question: it is a statement, and it fixes the relation between the two scaling constants as firmly as picking a side.",
    es: "No es saltar la pregunta: es una declaración, y fija la relación entre las dos constantes de escala con la misma fuerza que elegir un lado.",
  },
  "elicitacao.par.voltarUma": { pt: "voltar uma", en: "back one", es: "volver una" },
  "elicitacao.par.ordemFinal": { pt: "Ordem final", en: "Final order", es: "Orden final" },
  "elicitacao.par.ordemParcial": { pt: "Ordem parcial", en: "Partial order", es: "Orden parcial" },
  "elicitacao.par.empates.um": {
    pt: "Você declarou {n} empate. Como o método precisa de uma sequência, a posição relativa nesse par foi arbitrada - não muda o resultado, porque nada foi afirmado sobre ele.",
    en: "You declared {n} tie. Since the method needs a sequence, the relative position in that pair was set arbitrarily - it does not change the result, because nothing was stated about it.",
    es: "Usted declaró {n} empate. Como el método necesita una secuencia, la posición relativa en ese par fue arbitrada - no cambia el resultado, porque nada fue afirmado sobre él.",
  },
  "elicitacao.par.empates.varios": {
    pt: "Você declarou {n} empates. Como o método precisa de uma sequência, a posição relativa nesses pares foi arbitrada - não muda o resultado, porque nada foi afirmado sobre eles.",
    en: "You declared {n} ties. Since the method needs a sequence, the relative position in those pairs was set arbitrarily - it does not change the result, because nothing was stated about them.",
    es: "Usted declaró {n} empates. Como el método necesita una secuencia, la posición relativa en esos pares fue arbitrada - no cambia el resultado, porque nada fue afirmado sobre ellos.",
  },

  // --- elicitação: a pergunta de tradeoff ----------------------------------
  /* Uma frase so, com os dois ganhos como nos. A versao anterior era partida em
     "antes", "termo" e "depois", o que obriga todo idioma a pôr o destaque na
     mesma posição da frase portuguesa. */
  "elicitacao.tradeoff.pergunta.direta": {
    pt: "O que você prefere ter: {a} ou {b}?",
    en: "Which would you rather have: {a} or {b}?",
    es: "¿Qué prefiere tener: {a} o {b}?",
  },
  "elicitacao.tradeoff.resto": {
    pt: "Em todos os outros critérios as duas situações são idênticas e estão no pior nível possível.",
    en: "On every other criterion the two situations are identical and sit at the worst possible level.",
    es: "En todos los demás criterios las dos situaciones son idénticas y están en el peor nivel posible.",
  },
  "elicitacao.tradeoff.igualNasDuas": {
    pt: "igual nas duas",
    en: "same in both",
    es: "igual en las dos",
  },
  "elicitacao.tradeoff.noPior": {
    pt: "no pior nível possível",
    en: "at the worst possible level",
    es: "en el peor nivel posible",
  },
  "elicitacao.tradeoff.noMelhor": {
    pt: "no melhor nível possível",
    en: "at the best possible level",
    es: "en el mejor nivel posible",
  },
  "elicitacao.tradeoff.escolher": {
    pt: "Prefiro a {situacao}",
    en: "I prefer {situacao}",
    es: "Prefiero la {situacao}",
  },
  "elicitacao.tradeoff.escolhida": { pt: "Escolhida", en: "Chosen", es: "Elegida" },
  "elicitacao.tradeoff.nenhuma": {
    pt: "Nenhuma das duas:",
    en: "Neither one:",
    es: "Ninguna de las dos:",
  },
  "elicitacao.tradeoff.dica.titulo": {
    pt: "Por que as duas são tão ruins",
    en: "Why both are so bad",
    es: "Por qué las dos son tan malas",
  },
  "elicitacao.tradeoff.dica.corpo1": {
    pt: "É de propósito. Deixando tudo no pior nível menos um ponto, a comparação isola exatamente o que se quer medir: o quanto vale melhorar aquele critério.",
    en: "It is on purpose. With everything at the worst level except one point, the comparison isolates exactly what is being measured: how much improving that criterion is worth.",
    es: "Es a propósito. Dejando todo en el peor nivel menos un punto, la comparación aísla exactamente lo que se quiere medir: cuánto vale mejorar ese criterio.",
  },
  "elicitacao.tradeoff.dica.corpo2": {
    pt: "Se as situações fossem realistas, sua resposta misturaria vários efeitos ao mesmo tempo e não diria nada sobre os pesos.",
    en: "If the situations were realistic, your answer would mix several effects at once and say nothing about the scaling constants.",
    es: "Si las situaciones fueran realistas, su respuesta mezclaría varios efectos a la vez y no diría nada sobre las constantes de escala.",
  },
  "elicitacao.tradeoff.dica.corpo3": {
    pt: "Nenhuma das duas é uma alternativa real do seu problema.",
    en: "Neither of them is a real alternative in your problem.",
    es: "Ninguna de las dos es una alternativa real de su problema.",
  },
  "elicitacao.tradeoff.situacaoA": { pt: "Situação A", en: "Situation A", es: "Situación A" },
  "elicitacao.tradeoff.situacaoB": { pt: "Situação B", en: "Situation B", es: "Situación B" },

  // --- elicitação: curva de valor (função de valor intra-critério) ----------
  "elicitacao.curva.titulo": {
    pt: "Curva de valor - {nome}",
    en: "Value function - {nome}",
    es: "Curva de valor - {nome}",
  },
  "elicitacao.curva.rotulo": {
    pt: "Curva de valor de {nome}",
    en: "Value function of {nome}",
    es: "Curva de valor de {nome}",
  },
  "elicitacao.curva.dica.titulo": {
    pt: "Por que isto importa",
    en: "Why this matters",
    es: "Por qué esto importa",
  },
  "elicitacao.curva.dica.corpo1": {
    pt: "Sem elicitar, o método assume que valor cresce em linha reta com o desempenho - a linha pontilhada no gráfico.",
    en: "With nothing elicited, the method assumes value grows in a straight line with performance - the dashed line in the chart.",
    es: "Sin elicitar, el método asume que el valor crece en línea recta con el desempeño - la línea punteada en el gráfico.",
  },
  "elicitacao.curva.dica.corpo2": {
    pt: "Mas ir de 45 para 30 dias pode valer muito mais que ir de 30 para 15. Cada resposta aqui corrige essa suposição.",
    en: "But going from 45 to 30 days may be worth far more than going from 30 to 15. Each answer here corrects that assumption.",
    es: "Pero ir de 45 a 30 días puede valer mucho más que ir de 30 a 15. Cada respuesta aquí corrige esa suposición.",
  },
  "elicitacao.curva.dica.corpo3": {
    pt: "Pular é legítimo: a reta continua sendo uma escolha razoável.",
    en: "Skipping is legitimate: the straight line remains a reasonable choice.",
    es: "Saltar es legítimo: la recta sigue siendo una elección razonable.",
  },
  "elicitacao.curva.pergunta.antes": { pt: "Entre ", en: "Between ", es: "Entre " },
  "elicitacao.curva.pergunta.meio": { pt: " e ", en: " and ", es: " y " },
  "elicitacao.curva.pergunta.depois": {
    pt: ", qual desempenho fica ",
    en: ", which performance sits ",
    es: ", qué desempeño queda ",
  },
  "elicitacao.curva.pergunta.termo": {
    pt: "no meio do caminho em valor",
    en: "halfway in value",
    es: "a mitad de camino en valor",
  },
  "elicitacao.curva.explicacao": {
    pt: "Ou seja: sair de {de} até ali vale tanto quanto sair dali até {ate}.",
    en: "In other words: going from {de} to there is worth as much as going from there to {ate}.",
    es: "Es decir: ir de {de} hasta ahí vale tanto como ir de ahí hasta {ate}.",
  },
  "elicitacao.curva.entrada.rotulo": {
    pt: "Desempenho intermediário em {nome}",
    en: "Intermediate performance in {nome}",
    es: "Desempeño intermedio en {nome}",
  },
  "elicitacao.curva.erro.numero": {
    pt: "Informe um número na unidade do critério.",
    en: "Enter a number in the unit of the criterion.",
    es: "Informe un número en la unidad del criterio.",
  },
  "elicitacao.curva.erro.intervalo": {
    pt: "O desempenho precisa ficar entre {de} e {ate}.",
    en: "The performance has to fall between {de} and {ate}.",
    es: "El desempeño tiene que quedar entre {de} y {ate}.",
  },
  "elicitacao.curva.detalhada": {
    pt: "A curva já está detalhada o bastante. Salve para usá-la na decisão.",
    en: "The curve is detailed enough. Save it to use in the decision.",
    es: "La curva ya está lo bastante detallada. Guárdela para usarla en la decisión.",
  },
  "elicitacao.curva.usarCurva.um": {
    pt: "Usar esta curva ({n} ponto)",
    en: "Use this curve ({n} point)",
    es: "Usar esta curva ({n} punto)",
  },
  "elicitacao.curva.usarCurva.varios": {
    pt: "Usar esta curva ({n} pontos)",
    en: "Use this curve ({n} points)",
    es: "Usar esta curva ({n} puntos)",
  },
  "elicitacao.curva.usarReta": {
    pt: "Usar a reta",
    en: "Use the straight line",
    es: "Usar la recta",
  },
  "elicitacao.curva.recomecar": { pt: "recomeçar", en: "start over", es: "reiniciar" },
  "elicitacao.curva.cancelar": { pt: "cancelar", en: "cancel", es: "cancelar" },
  "elicitacao.curva.eixo.pior": { pt: "{valor} (pior)", en: "{valor} (worst)", es: "{valor} (peor)" },
  "elicitacao.curva.eixo.melhor": {
    pt: "{valor} (melhor)",
    en: "{valor} (best)",
    es: "{valor} (mejor)",
  },
  "elicitacao.curva.ponto": {
    pt: "{consequencia} {unidade} vale {valor}",
    en: "{consequencia} {unidade} is worth {valor}",
    es: "{consequencia} {unidade} vale {valor}",
  },

  // --- elicitação: avaliação holística -------------------------------------
  "elicitacao.holistico.titulo": {
    pt: "Ou compare duas alternativas reais",
    en: "Or compare two real alternatives",
    es: "O compare dos alternativas reales",
  },
  "elicitacao.holistico.dica.titulo": {
    pt: "Avaliação holística",
    en: "Holistic evaluation",
    es: "Evaluación holística",
  },
  "elicitacao.holistico.dica.corpo1": {
    pt: "Em vez de responder sobre situações hipotéticas, você olha os gráficos acima e diz qual alternativa prefere.",
    en: "Instead of answering about hypothetical situations, you look at the charts above and say which alternative you prefer.",
    es: "En vez de responder sobre situaciones hipotéticas, usted mira los gráficos de arriba y dice cuál alternativa prefiere.",
  },
  "elicitacao.holistico.dica.corpo2": {
    pt: "Vale quando a pergunta de tradeoff fica cansativa - com muitos critérios, comparar coisas reais é mais natural.",
    en: "It pays off when the tradeoff question gets tiring - with many criteria, comparing real things is more natural.",
    es: "Vale la pena cuando la pregunta de tradeoff se vuelve cansadora - con muchos criterios, comparar cosas reales es más natural.",
  },
  "elicitacao.holistico.dica.corpo3": {
    pt: "A declaração entra no mesmo modelo. Se contradisser uma resposta anterior, o sistema avisa.",
    en: "The statement enters the same model. If it contradicts an earlier answer, the system says so.",
    es: "La declaración entra en el mismo modelo. Si contradice una respuesta anterior, el sistema avisa.",
  },
  "elicitacao.holistico.prefiro": { pt: "prefiro…", en: "I prefer…", es: "prefiero…" },
  "elicitacao.holistico.aEsta": { pt: "…a esta", en: "…over this one", es: "…a esta" },
  "elicitacao.holistico.emVezDe": { pt: "em vez de", en: "instead of", es: "en vez de" },
  "elicitacao.holistico.erro.iguais": {
    pt: "Escolha duas alternativas diferentes.",
    en: "Pick two different alternatives.",
    es: "Elija dos alternativas diferentes.",
  },

  // --- elicitação: declarações que se contradizem --------------------------
  "elicitacao.conflito.titulo.par": {
    pt: "Duas respostas se contradizem",
    en: "Two answers contradict each other",
    es: "Dos respuestas se contradicen",
  },
  "elicitacao.conflito.titulo.impossivel": {
    pt: "Essa afirmação não é possível aqui",
    en: "That statement is not possible here",
    es: "Esa afirmación no es posible aquí",
  },
  /* O número já chega com dois dígitos, para as declarações alinharem na
     coluna. */
  "elicitacao.conflito.declaracao": {
    pt: "declaração {n}",
    en: "statement {n}",
    es: "declaración {n}",
  },
  "elicitacao.conflito.antes": {
    pt: "você disse antes",
    en: "you said earlier",
    es: "usted dijo antes",
  },
  "elicitacao.conflito.agora": {
    pt: "você acabou de dizer",
    en: "you just said",
    es: "usted acaba de decir",
  },
  "elicitacao.conflito.icone": { pt: "conflita com", en: "conflicts with", es: "entra en conflicto con" },
  "elicitacao.conflito.pergunta": {
    pt: "O que você quer fazer?",
    en: "What do you want to do?",
    es: "¿Qué quiere hacer?",
  },
  "elicitacao.conflito.passaAValer": {
    pt: "passa a valer: {resultado}",
    en: "becomes: {resultado}",
    es: "pasa a valer: {resultado}",
  },

  // --- importar de uma planilha --------------------------------------------
  "importacao.modelo": {
    pt: "Baixar planilha-modelo",
    en: "Download the template spreadsheet",
    es: "Descargar la plantilla de hoja de cálculo",
  },
  "importacao.arraste": {
    pt: "Arraste a planilha aqui",
    en: "Drag the spreadsheet here",
    es: "Arrastre la hoja de cálculo aquí",
  },
  "importacao.formatos": {
    pt: ".xlsx ou .csv - até 2 MB",
    en: ".xlsx or .csv - up to 2 MB",
    es: ".xlsx o .csv - hasta 2 MB",
  },
  "importacao.escolher": { pt: "Escolher arquivo", en: "Choose a file", es: "Elegir archivo" },
  "importacao.lendo": { pt: "Lendo {arquivo}…", en: "Reading {arquivo}…", es: "Leyendo {arquivo}…" },
  "importacao.colar.titulo": {
    pt: "Ou cole direto do Excel",
    en: "Or paste straight from Excel",
    es: "O pegue directo desde Excel",
  },
  "importacao.colar.dica.titulo": { pt: "Como colar", en: "How to paste", es: "Cómo pegar" },
  "importacao.colar.dica.corpo1.antes": {
    pt: "Selecione as células no Excel, ",
    en: "Select the cells in Excel, ",
    es: "Seleccione las celdas en Excel, ",
  },
  "importacao.colar.dica.corpo1.cabecalho": {
    pt: "com o cabeçalho",
    en: "with the header row",
    es: "con el encabezado",
  },
  "importacao.colar.dica.corpo1.meio": {
    pt: " e as linhas ",
    en: " and the rows ",
    es: " y las filas ",
  },
  "importacao.colar.dica.corpo1.e": { pt: " e ", en: " and ", es: " y " },
  "importacao.colar.dica.corpo1.depois": {
    pt: ", copie e cole aqui.",
    en: ", then copy and paste here.",
    es: ", copie y pegue aquí.",
  },
  "importacao.colar.dica.corpo2": {
    pt: "Não precisa salvar arquivo nenhum.",
    en: "No need to save a file at all.",
    es: "No hace falta guardar ningún archivo.",
  },
  "importacao.colar.rotulo": {
    pt: "Cole aqui os dados copiados da planilha",
    en: "Paste the data copied from the spreadsheet here",
    es: "Pegue aquí los datos copiados de la hoja de cálculo",
  },
  "importacao.lerColado": {
    pt: "Ler o que foi colado",
    en: "Read what was pasted",
    es: "Leer lo que fue pegado",
  },
  "importacao.requisitos.titulo": {
    pt: "O que a planilha precisa ter",
    en: "What the spreadsheet needs",
    es: "Qué necesita tener la hoja de cálculo",
  },
  "importacao.requisitos.nota.antes": { pt: "A linha ", en: "The ", es: "La fila " },
  "importacao.requisitos.nota.depois": {
    pt: " é obrigatória: sem ela não dá para saber se um número alto é bom ou ruim. O formato .xls (Excel 97-2003) não é aceito - salve como .xlsx.",
    en: " row is required: without it there is no way to tell whether a high number is good or bad. The .xls format (Excel 97-2003) is not accepted - save as .xlsx.",
    es: " es obligatoria: sin ella no hay forma de saber si un número alto es bueno o malo. El formato .xls (Excel 97-2003) no es aceptado - guarde como .xlsx.",
  },
  /* Exemplos da planilha. As palavras-chave da primeira coluna (criterio,
     direcao, unidade) e os valores max e min ficam de fora: são o formato que
     o leitor espera, não texto de tela. */
  "importacao.exemplo.qualidade": { pt: "Qualidade", en: "Quality", es: "Calidad" },
  "importacao.exemplo.custo": { pt: "Custo", en: "Cost", es: "Costo" },
  "importacao.exemplo.prazo": { pt: "Prazo", en: "Lead time", es: "Plazo" },
  "importacao.exemplo.fornecedor": {
    pt: "Fornecedor A",
    en: "Supplier A",
    es: "Proveedor A",
  },
  "importacao.exemplo.dias": { pt: "dias", en: "days", es: "días" },

  // --- decisões que este navegador já abriu --------------------------------
  "recentes.titulo": {
    pt: "Voltar a uma decisão",
    en: "Back to a decision",
    es: "Volver a una decisión",
  },
  "recentes.agora": { pt: "agora", en: "just now", es: "ahora" },
  "recentes.minutos": { pt: "há {n} min", en: "{n} min ago", es: "hace {n} min" },
  "recentes.horas": { pt: "há {n} h", en: "{n} h ago", es: "hace {n} h" },
  "recentes.ontem": { pt: "ontem", en: "yesterday", es: "ayer" },
  /* Um dia só é "ontem", então esta frase começa em dois e não tem singular. */
  "recentes.dias": { pt: "há {n} dias", en: "{n} days ago", es: "hace {n} días" },
  "recentes.remover": {
    pt: "Remover {nome} da lista",
    en: "Remove {nome} from the list",
    es: "Quitar {nome} de la lista",
  },
  "recentes.nota": {
    pt: "Esta lista fica só neste navegador. As decisões em si ficam no servidor.",
    en: "This list stays in this browser only. The decisions themselves live on the server.",
    es: "Esta lista queda solo en este navegador. Las decisiones en sí quedan en el servidor.",
  },
});
