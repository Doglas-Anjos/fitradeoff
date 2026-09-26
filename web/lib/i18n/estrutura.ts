/**
 * Catálogo da tela de estrutura: alternativas, critérios, matriz de
 * consequências, trilha de etapas e a lista reordenável.
 *
 * O inglês segue a literatura do método, não a tradução literal: a escala
 * discreta é uma `constructed scale`, a contínua é `natural scale`, e o campo
 * que diz se o número alto é bom chama-se `criterion direction` -- quem chega
 * de um artigo procura por esses termos.
 *
 * Contagem com plural tem duas chaves, e o componente escolhe qual usar. Somar
 * pedaços ("1" + " " + "critério") funciona em português por acidente e quebra
 * em qualquer idioma cuja regra de plural seja outra.
 */

import { createElement, Fragment, type ReactNode } from "react";

import { registrar } from "./index";

/**
 * Texto traduzido com nós no meio: cada `{nome}` da tradução vira o nó de mesmo
 * nome.
 *
 * Existe para que uma frase com destaque continue sendo uma frase só no
 * catálogo. Quebrá-la em "antes", "o negrito" e "depois" obrigaria todo idioma
 * a pôr o destaque na mesma posição da frase portuguesa, o que nem sempre é
 * onde ele cabe.
 */
export function comNos(texto: string, nos: Record<string, ReactNode>): ReactNode[] {
  return texto.split(/(\{[a-zA-Z]+\})/).map((parte, i) => {
    const nome = /^\{([a-zA-Z]+)\}$/.exec(parte)?.[1];
    return nome && nome in nos
      ? createElement(Fragment, { key: i }, nos[nome])
      : parte;
  });
}

export const ESTRUTURA = registrar({
  // --- a tela: nome do problema e objetivo escolhido -------------------------
  "estrutura.problema.nome": { pt: "Nome do problema", en: "Problem name" },
  "estrutura.problema.nome.ajuda": {
    pt: "Como esta decisão vai aparecer na lista depois.",
    en: "How this decision will show up in the list later.",
  },
  "estrutura.problema.nome.exemplo": {
    pt: "Seleção de fornecedor",
    en: "Supplier selection",
  },
  "estrutura.problema.nome.dica.titulo": {
    pt: "Pode deixar para depois",
    en: "You can leave this for later",
  },
  /* {tela} é o nome da tela de decisões salvas, que vem do catálogo dos painéis:
     ela se chama "Decisões salvas" / "Saved decisions", e não "Continuar uma
     decisão". Uma dica que manda a pessoa para uma tela com outro nome faz ela
     procurar o que não existe. */
  "estrutura.problema.nome.dica.corpo": {
    pt: "O nome não entra em conta nenhuma. Serve para você reencontrar esta decisão em “{tela}”.",
    en: "The name enters no computation. It is what lets you find this decision again under “{tela}”.",
  },
  "estrutura.objetivo.rotulo": { pt: "Objetivo", en: "Goal" },
  "estrutura.objetivo.trocar": { pt: "trocar objetivo", en: "change goal" },
  "estrutura.voltarAoObjetivo": {
    pt: "Voltar ao objetivo",
    en: "Back to the goal",
  },
  "estrutura.exemplo": {
    pt: "ou preencher com um caso de exemplo",
    en: "or fill it in with an example case",
  },
  "estrutura.continuar": {
    pt: "Continuar para os desempenhos",
    en: "Continue to the consequence matrix",
  },

  // --- ações de um item cadastrado -------------------------------------------
  "estrutura.item.editar": { pt: "Editar {nome}", en: "Edit {nome}" },
  "estrutura.item.excluir": { pt: "Excluir {nome}", en: "Delete {nome}" },
  "estrutura.item.cancelarEdicao": {
    pt: "Cancelar edição",
    en: "Cancel editing",
  },

  // --- alternativas ---------------------------------------------------------
  "estrutura.alternativas.titulo": { pt: "Alternativas", en: "Alternatives" },
  /* A contagem diz o que falta, não o que há: "0 alternativas - mínimo 2"
     cobrava um requisito e deixava a conta para quem lê. */
  "estrutura.alternativas.faltamDuas": {
    pt: "Faltam 2 alternativas",
    en: "2 more alternatives needed",
  },
  "estrutura.alternativas.faltaUma": {
    pt: "Falta 1 alternativa",
    en: "1 more alternative needed",
  },
  "estrutura.alternativas.contagem": {
    pt: "{n} alternativas",
    en: "{n} alternatives",
  },
  "estrutura.alternativas.dica.titulo": {
    pt: "O que é uma alternativa",
    en: "What an alternative is",
  },
  "estrutura.alternativas.dica.corpo1": {
    pt: "São as opções entre as quais você decide - os fornecedores, os projetos, os candidatos.",
    en: "They are the options you are deciding between - the suppliers, the projects, the candidates.",
  },
  "estrutura.alternativas.dica.corpo2": {
    pt: "O desempenho de cada uma vem no passo seguinte; aqui só entram os nomes.",
    en: "How each one performs comes in the next step; only the names go here.",
  },
  "estrutura.alternativas.vazio": {
    pt: "As opções que você está comparando: os fornecedores, os projetos, os candidatos. Pelo menos duas.",
    en: "The options you are comparing: the suppliers, the projects, the candidates. At least two.",
  },
  "estrutura.alternativa.nova": {
    pt: "Nome da nova alternativa",
    en: "Name of the new alternative",
  },
  "estrutura.alternativa.exemplo": {
    pt: "Alternativa {n}",
    en: "Alternative {n}",
  },
  "estrutura.alternativa.novoNome": {
    pt: "Novo nome de {nome}",
    en: "New name for {nome}",
  },
  "estrutura.alternativa.salvarNome": { pt: "Salvar nome", en: "Save name" },
  "estrutura.alternativa.erro.semNome": {
    pt: "Escreva o nome da alternativa.",
    en: "Type the name of the alternative.",
  },
  "estrutura.alternativa.erro.nomeVazio": {
    pt: "O nome não pode ficar vazio.",
    en: "The name cannot be left empty.",
  },
  "estrutura.alternativa.erro.repetida": {
    pt: 'Já existe uma alternativa "{nome}".',
    en: 'There is already an alternative called "{nome}".',
  },

  // --- critérios ------------------------------------------------------------
  "estrutura.criterios.titulo": { pt: "Critérios", en: "Criteria" },
  "estrutura.criterios.faltamDois": {
    pt: "Faltam 2 critérios",
    en: "2 more criteria needed",
  },
  "estrutura.criterios.faltaUm": {
    pt: "Falta 1 critério",
    en: "1 more criterion needed",
  },
  "estrutura.criterios.contagem": { pt: "{n} critérios", en: "{n} criteria" },
  "estrutura.criterios.dica.titulo": {
    pt: "O que é um critério",
    en: "What a criterion is",
  },
  "estrutura.criterios.dica.corpo1": {
    pt: "São os aspectos em que as alternativas se comparam: custo, prazo, qualidade.",
    en: "They are the aspects the alternatives are compared on: cost, lead time, quality.",
  },
  /* {termo} é o destaque da frase: "direção" em português, o termo da
     literatura em inglês. */
  "estrutura.criterios.dica.corpo2": {
    pt: "A {termo} diz se um número alto é bom ou ruim, e é o único dado que inverte a decisão inteira sem dar sinal.",
    en: "The {termo} says whether a high number is good or bad, and it is the one piece of data that flips the whole decision without any warning.",
  },
  "estrutura.criterios.dica.corpo2.termo": {
    pt: "direção",
    en: "criterion direction",
  },
  "estrutura.criterios.vazio": {
    pt: "O que diferencia as opções: custo, prazo, qualidade. Pelo menos dois - e cada um precisa dizer se o número alto é bom ou ruim.",
    en: "What sets the options apart: cost, lead time, quality. At least two - and each one has to say whether a high number is good or bad.",
  },

  // --- o formulário do critério ---------------------------------------------
  "estrutura.criterio.editando": {
    pt: "Editando “{nome}”.",
    en: "Editing “{nome}”.",
  },
  "estrutura.criterio.nome": { pt: "Nome do critério", en: "Criterion name" },
  "estrutura.criterio.nome.exemplo": {
    pt: "Custo unitário",
    en: "Unit cost",
  },
  "estrutura.criterio.unidade": { pt: "Unidade", en: "Unit" },
  "estrutura.criterio.unidade.exemplo": { pt: "R$/un", en: "$/unit" },
  "estrutura.criterio.unidade.dica.titulo": {
    pt: "Para que serve a unidade",
    en: "What the unit is for",
  },
  "estrutura.criterio.unidade.dica.corpo1": {
    pt: "Ela não entra na conta - aparece nas perguntas, para você responder olhando grandezas reais.",
    en: "It enters no computation - it shows up in the questions, so you answer looking at real quantities.",
  },
  "estrutura.criterio.unidade.dica.corpo2": {
    pt: "“De 45 para 12 dias” diz muito mais que “de 45 para 12”.",
    en: "“From 45 to 12 days” says far more than “from 45 to 12”.",
  },
  // --- modelo de veto ---------------------------------------------------------
  /* O rótulo usa "desempenho inaceitável" e não "veto" sozinho: quem nunca leu
     o artigo lê "veto" como eliminação, que é justamente o que este modelo não
     faz. O termo técnico aparece na dica, junto da fonte. */
  "estrutura.criterio.veto": {
    pt: "Desempenho inaceitável neste critério",
    en: "Unacceptable performance on this criterion",
  },
  "estrutura.criterio.veto.opcional": {
    pt: "opcional",
    en: "optional",
  },
  "estrutura.criterio.veto.selo": {
    pt: "com veto",
    en: "veto set",
  },
  "estrutura.criterio.veto.selo.titulo": {
    pt: "Este critério tem limites de veto declarados",
    en: "This criterion has veto thresholds declared",
  },
  "estrutura.criterio.veto.explicacao": {
    pt: "Se houver um desempenho tão ruim que comprometa a alternativa inteira, diga qual é. A alternativa {naoElimina}: o valor global dela é penalizado, tanto mais quanto pior for o desempenho.",
    en: "If some performance is bad enough to compromise the whole alternative, say where. The alternative {naoElimina}: its overall value is penalised, the more so the worse the performance.",
  },
  "estrutura.criterio.veto.naoElimina": {
    pt: "não é eliminada",
    en: "is not eliminated",
  },
  "estrutura.criterio.veto.aceitavel.max": {
    pt: "Aceitável a partir de",
    en: "Acceptable from",
  },
  "estrutura.criterio.veto.aceitavel.min": {
    pt: "Aceitável até",
    en: "Acceptable up to",
  },
  "estrutura.criterio.veto.aceitavel.ajuda": {
    pt: "Daqui em diante nada é penalizado.",
    en: "From here on nothing is penalised.",
  },
  "estrutura.criterio.veto.inaceitavel.max": {
    pt: "Inaceitável abaixo de",
    en: "Unacceptable below",
  },
  "estrutura.criterio.veto.inaceitavel.min": {
    pt: "Inaceitável acima de",
    en: "Unacceptable above",
  },
  "estrutura.criterio.veto.inaceitavel.ajuda": {
    pt: "Aqui o critério deixa de contar a favor da alternativa.",
    en: "Here the criterion stops counting in the alternative's favour.",
  },
  "estrutura.criterio.veto.vazio": {
    pt: "sem limite",
    en: "no threshold",
  },
  "estrutura.criterio.veto.umSo": {
    pt: "Entre os dois limites a penalidade é proporcional. Preenchendo só um, o corte é seco naquele ponto, sem faixa intermediária.",
    en: "Between the two thresholds the penalty is proportional. Filling in only one makes it a hard cut-off at that point, with no middle range.",
  },
  /* Dito no cadastro, e não só no resultado: quem declara o veto precisa saber
     o preço antes de pagá-lo. */
  "estrutura.criterio.veto.custo": {
    pt: "Com veto, o resultado passa a trabalhar com faixas mais largas, e pode levar mais perguntas até uma recomendação.",
    en: "With a veto, the result works with wider ranges, and it may take more questions to reach a recommendation.",
  },
  "estrutura.criterio.veto.dica.titulo": {
    pt: "Como o veto entra na conta",
    en: "How the veto enters the computation",
  },
  "estrutura.criterio.veto.dica.corpo1": {
    pt: "O valor global da alternativa é multiplicado por um fator que cai conforme o desempenho piora neste critério: 1 no aceitável, 0 no inaceitável, proporcional entre os dois.",
    en: "The alternative's overall value is multiplied by a factor that drops as performance worsens on this criterion: 1 at the acceptable threshold, 0 at the unacceptable one, proportional in between.",
  },
  "estrutura.criterio.veto.dica.corpo2": {
    pt: "Uma alternativa ótima em tudo o mais continua na disputa, mas com o valor reduzido - e pode perder para outra que seja apenas razoável em tudo.",
    en: "An alternative that excels at everything else stays in play, but with reduced value - and may lose to one that is merely reasonable across the board.",
  },
  "estrutura.criterio.veto.dica.fonte": {
    pt: "Modelo aditivo com veto (de Almeida, 2013). O método o prevê para escolher a melhor e para ordenar.",
    en: "Additive model with veto (de Almeida, 2013). The method defines it for choice and for ranking.",
  },

  "estrutura.criterio.unidade.selo": {
    pt: "Unidade em que o critério é medido",
    en: "Unit the criterion is measured in",
  },

  "estrutura.criterio.escala": { pt: "Tipo de escala", en: "Scale type" },
  "estrutura.criterio.escala.etiqueta": {
    pt: "Tipo de escala do critério",
    en: "Criterion scale type",
  },
  "estrutura.criterio.escala.dica.titulo": {
    pt: "Contínua ou discreta",
    en: "Continuous or discrete",
  },
  "estrutura.criterio.escala.dica.continua": {
    pt: "{termo}: o desempenho é um número dentro de uma faixa - preço, prazo, peso.",
    en: "{termo}: performance is a number inside a range - price, lead time, weight.",
  },
  "estrutura.criterio.escala.dica.discreta": {
    pt: "{termo}: são níveis nomeados em ordem, como “ruim, médio, bom”. Você declara os níveis e o método trabalha com a ordem entre eles.",
    en: "{termo}: named levels in order, such as “poor, fair, good”. You declare the levels and the method works with the order between them.",
  },
  "estrutura.criterio.escala.continua": { pt: "Contínua", en: "Continuous" },
  "estrutura.criterio.escala.continua.ajuda": {
    pt: "Qualquer número dentro de uma faixa, como preço ou prazo",
    en: "Any number inside a range, such as price or lead time",
  },
  "estrutura.criterio.escala.discreta": { pt: "Discreta", en: "Discrete" },
  "estrutura.criterio.escala.discreta.ajuda": {
    pt: "Níveis nomeados em ordem, como ruim, médio e bom",
    en: "Named levels in order, such as poor, fair and good",
  },

  "estrutura.criterio.direcao": { pt: "O que é melhor", en: "Which way is better" },
  "estrutura.criterio.direcao.etiqueta": {
    pt: "Direção do critério",
    en: "Criterion direction",
  },
  "estrutura.criterio.direcao.dica.titulo": {
    pt: "O dado mais perigoso da tela",
    en: "The most dangerous field on the screen",
  },
  "estrutura.criterio.direcao.dica.corpo1": {
    pt: "É o único campo que inverte o resultado inteiro sem dar nenhum sinal de erro.",
    en: "It is the only field that flips the entire result without raising any error.",
  },
  "estrutura.criterio.direcao.dica.corpo2": {
    pt: "Um custo marcado como “maior é melhor” faz o método recomendar a alternativa mais cara - com toda a aparência de estar certa.",
    en: "A cost marked as “higher is better” makes the method recommend the most expensive alternative - looking entirely right while doing it.",
  },
  /* Os mesmos termos do sistema de referência e da literatura: quem chega de lá
     procura por eles, não por "maior". */
  "estrutura.criterio.direcao.dica.corpo3": {
    pt: "“Maior é melhor” é o que a literatura do método chama de {max}; “menor é melhor”, de {min}.",
    en: "“Higher is better” is what the method's literature calls {max}; “lower is better”, {min}.",
  },
  "estrutura.criterio.direcao.maior": { pt: "maior", en: "higher" },
  "estrutura.criterio.direcao.maior.ajuda": {
    pt: "Quanto maior o número, melhor a alternativa",
    en: "The higher the number, the better the alternative",
  },
  "estrutura.criterio.direcao.menor": { pt: "menor", en: "lower" },
  "estrutura.criterio.direcao.menor.ajuda": {
    pt: "Quanto menor o número, melhor a alternativa",
    en: "The lower the number, the better the alternative",
  },
  "estrutura.criterio.direcao.selo.max": {
    pt: "Critério de maximização",
    en: "Maximization criterion",
  },
  "estrutura.criterio.direcao.selo.min": {
    pt: "Critério de minimização",
    en: "Minimization criterion",
  },

  "estrutura.criterio.inteiro": {
    pt: "Só valores inteiros",
    en: "Whole numbers only",
  },
  "estrutura.criterio.inteiro.dica.titulo": {
    pt: "Quando marcar",
    en: "When to check this",
  },
  "estrutura.criterio.inteiro.dica.corpo1": {
    pt: "Marque quando meio não existe: número de pessoas, de licenças, de viagens.",
    en: "Check it when halves do not exist: number of people, of licences, of trips.",
  },
  "estrutura.criterio.inteiro.dica.corpo2": {
    pt: "Serve para a tela não sugerir 2,5 onde só cabe 2 ou 3.",
    en: "It keeps the screen from suggesting 2.5 where only 2 or 3 fit.",
  },
  "estrutura.criterio.inteiro.selo": { pt: "só inteiros", en: "integers only" },

  "estrutura.criterio.salvar": {
    pt: "Salvar alterações",
    en: "Save changes",
  },
  "estrutura.criterio.cancelar": { pt: "cancelar", en: "cancel" },
  "estrutura.criterio.erro.repetido": {
    pt: 'Já existe um critério "{nome}".',
    en: 'There is already a criterion called "{nome}".',
  },

  // --- níveis de uma escala construída --------------------------------------
  "estrutura.niveis.ordem": {
    pt: "Os níveis vão {termo} desempenho. É a ordem que diz o que é bom - não a direção.",
    en: "The levels run {termo} in performance. The order is what says what is good, not the direction.",
  },
  "estrutura.niveis.ordem.termo": {
    pt: "do pior para o melhor",
    en: "from worst to best",
  },
  "estrutura.niveis.pior": { pt: "pior", en: "worst" },
  "estrutura.niveis.melhor": { pt: "melhor", en: "best" },
  "estrutura.niveis.intermediario": { pt: "nível {n}", en: "level {n}" },
  "estrutura.niveis.campo": { pt: "Nível {n}", en: "Level {n}" },
  "estrutura.niveis.remover": {
    pt: "Remover nível {n}",
    en: "Remove level {n}",
  },
  "estrutura.niveis.adicionar": { pt: "nível", en: "level" },
  "estrutura.niveis.selo": { pt: "escala construída", en: "constructed scale" },
  "estrutura.niveis.selo.titulo": {
    pt: "Níveis declarados, do pior para o melhor",
    en: "Declared levels, from worst to best",
  },
  "estrutura.niveis.contagemUm": { pt: "{n} nível", en: "{n} level" },
  "estrutura.niveis.contagem": { pt: "{n} níveis", en: "{n} levels" },

  // --- matriz de consequências ----------------------------------------------
  /* A estrutura já foi validada com dois de cada, então a contagem nunca cai no
     singular aqui. */
  "estrutura.matriz.resumo": {
    pt: "{linhas} alternativas × {colunas} critérios. Para mudar a estrutura, volte ao passo anterior.",
    en: "{linhas} alternatives × {colunas} criteria. To change the structure, go back to the previous step.",
  },
  "estrutura.matriz.role": {
    pt: "Role a tabela para o lado para ver os outros critérios.",
    en: "Scroll the table sideways to see the other criteria.",
  },
  "estrutura.matriz.coluna.alternativa": {
    pt: "Alternativa",
    en: "Alternative",
  },
  "estrutura.matriz.coluna.custo": { pt: "Custo", en: "Cost" },
  "estrutura.matriz.coluna.custo.ajuda": {
    pt: "consome o orçamento",
    en: "consumes the budget",
  },
  "estrutura.matriz.custoDe": {
    pt: "Custo de {nome}",
    en: "Cost of {nome}",
  },
  "estrutura.matriz.voltar": {
    pt: "Voltar à estrutura",
    en: "Back to the structure",
  },

  // --- lista reordenável ----------------------------------------------------
  "estrutura.lista.moverAcima": {
    pt: "Mover {item} para cima",
    en: "Move {item} up",
  },
  "estrutura.lista.moverAbaixo": {
    pt: "Mover {item} para baixo",
    en: "Move {item} down",
  },
  "estrutura.lista.anuncioMovimento": {
    pt: "{item} agora está na posição {posicao} de {total}.",
    en: "{item} is now in position {posicao} of {total}.",
  },
  "estrutura.lista.comoUsar": {
    pt: "Arraste pelos pontos à esquerda, ou use as setas.",
    en: "Drag by the dots on the left, or use the arrows.",
  },

  // --- barra de etapas da decisão -------------------------------------------
  "estrutura.etapas.rotulo": {
    pt: "Etapas da decisão",
    en: "Decision steps",
  },
  "estrutura.etapas.problema": { pt: "Problema", en: "Problem" },
  "estrutura.etapas.ordem": { pt: "Importância", en: "Importance" },
  "estrutura.etapas.perguntas": { pt: "Perguntas", en: "Questions" },
  "estrutura.etapas.resultado": { pt: "Resultado", en: "Result" },
  "estrutura.etapas.confirmar": {
    pt: "Confirmar mudança de ordem",
    en: "Confirm order change",
  },
  "estrutura.etapas.descarte": {
    pt: "Mudar a ordem descarta suas {respostas}. Elas comparavam outra sequência de critérios e não valem para a nova ordem.",
    en: "Changing the order discards your {respostas}. They compared a different sequence of criteria and do not hold for the new order.",
  },
  "estrutura.etapas.descarte.umaResposta": {
    pt: "{n} resposta",
    en: "{n} answer",
  },
  "estrutura.etapas.descarte.respostas": {
    pt: "{n} respostas",
    en: "{n} answers",
  },
  "estrutura.etapas.descartar": {
    pt: "Descartar e reordenar",
    en: "Discard and reorder",
  },

  // --- trilha de um cadastro ------------------------------------------------
  "estrutura.passos.rotulo": {
    pt: "Progresso do cadastro",
    en: "Setup progress",
  },
  /* {n} e {total} entram como nós, para os dígitos manterem a fonte tabular. */
  "estrutura.passos.contador": {
    pt: "Passo {n} de {total}",
    en: "Step {n} of {total}",
  },
});
