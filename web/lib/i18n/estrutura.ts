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
  "estrutura.problema.nome": { pt: "Nome do problema", en: "Problem name", es: "Nombre del problema" },
  "estrutura.problema.nome.ajuda": {
    pt: "Como esta decisão vai aparecer na lista depois.",
    en: "How this decision will show up in the list later.",
    es: "Cómo va a aparecer esta decisión en la lista después.",
  },
  "estrutura.problema.nome.exemplo": {
    pt: "Seleção de fornecedor",
    en: "Supplier selection",
    es: "Selección de proveedor",
  },
  "estrutura.problema.nome.dica.titulo": {
    pt: "Pode deixar para depois",
    en: "You can leave this for later",
    es: "Puede dejarlo para después",
  },
  /* {tela} é o nome da tela de decisões salvas, que vem do catálogo dos painéis:
     ela se chama "Decisões salvas" / "Saved decisions", e não "Continuar uma
     decisão". Uma dica que manda a pessoa para uma tela com outro nome faz ela
     procurar o que não existe. */
  "estrutura.problema.nome.dica.corpo": {
    pt: "O nome não entra em conta nenhuma. Serve para você reencontrar esta decisão em “{tela}”.",
    en: "The name enters no computation. It is what lets you find this decision again under “{tela}”.",
    es: "El nombre no entra en ningún cálculo. Sirve para que usted vuelva a encontrar esta decisión en “{tela}”.",
  },
  "estrutura.objetivo.rotulo": { pt: "Objetivo", en: "Goal", es: "Objetivo" },
  "estrutura.objetivo.trocar": { pt: "trocar objetivo", en: "change goal", es: "cambiar objetivo" },
  "estrutura.voltarAoObjetivo": {
    pt: "Voltar ao objetivo",
    en: "Back to the goal",
    es: "Volver al objetivo",
  },
  "estrutura.continuar": {
    pt: "Continuar para os desempenhos",
    en: "Continue to the consequence matrix",
    es: "Continuar a los desempeños",
  },

  // --- ações de um item cadastrado -------------------------------------------
  "estrutura.item.editar": { pt: "Editar {nome}", en: "Edit {nome}", es: "Editar {nome}" },
  "estrutura.item.excluir": { pt: "Excluir {nome}", en: "Delete {nome}", es: "Eliminar {nome}" },
  "estrutura.item.cancelarEdicao": {
    pt: "Cancelar edição",
    en: "Cancel editing",
    es: "Cancelar edición",
  },

  // --- alternativas ---------------------------------------------------------
  "estrutura.alternativas.titulo": { pt: "Alternativas", en: "Alternatives", es: "Alternativas" },
  /* A contagem diz o que falta, não o que há: "0 alternativas - mínimo 2"
     cobrava um requisito e deixava a conta para quem lê. */
  "estrutura.alternativas.faltamDuas": {
    pt: "Faltam 2 alternativas",
    en: "2 more alternatives needed",
    es: "Faltan 2 alternativas",
  },
  "estrutura.alternativas.faltaUma": {
    pt: "Falta 1 alternativa",
    en: "1 more alternative needed",
    es: "Falta 1 alternativa",
  },
  "estrutura.alternativas.contagem": {
    pt: "{n} alternativas",
    en: "{n} alternatives",
    es: "{n} alternativas",
  },
  "estrutura.alternativas.dica.titulo": {
    pt: "O que é uma alternativa",
    en: "What an alternative is",
    es: "Qué es una alternativa",
  },
  "estrutura.alternativas.dica.corpo1": {
    pt: "São as opções entre as quais você decide - os fornecedores, os projetos, os candidatos.",
    en: "They are the options you are deciding between - the suppliers, the projects, the candidates.",
    es: "Son las opciones entre las que usted decide - los proveedores, los proyectos, los candidatos.",
  },
  "estrutura.alternativas.dica.corpo2": {
    pt: "O desempenho de cada uma vem no passo seguinte; aqui só entram os nomes.",
    en: "How each one performs comes in the next step; only the names go here.",
    es: "El desempeño de cada una viene en el paso siguiente; aquí solo entran los nombres.",
  },
  "estrutura.alternativas.vazio": {
    pt: "As opções que você está comparando: os fornecedores, os projetos, os candidatos. Pelo menos duas.",
    en: "The options you are comparing: the suppliers, the projects, the candidates. At least two.",
    es: "Las opciones que usted está comparando: los proveedores, los proyectos, los candidatos. Al menos dos.",
  },
  /* Rótulo da superfície rebaixada onde se digita. Nomear a região é metade da
     separação: o relevo diz "isto é outra coisa", e o rótulo diz o que é. */
  "estrutura.alternativas.regiao": {
    pt: "Adicionar alternativa",
    en: "Add alternative",
    es: "Añadir alternativa",
  },
  "estrutura.criterios.regiao": {
    pt: "Adicionar critério",
    en: "Add criterion",
    es: "Añadir criterio",
  },
  "estrutura.alternativa.nova": {
    pt: "Nome da nova alternativa",
    en: "Name of the new alternative",
    es: "Nombre de la nueva alternativa",
  },
  "estrutura.alternativa.exemplo": {
    pt: "Alternativa {n}",
    en: "Alternative {n}",
    es: "Alternativa {n}",
  },
  "estrutura.alternativa.novoNome": {
    pt: "Novo nome de {nome}",
    en: "New name for {nome}",
    es: "Nuevo nombre de {nome}",
  },
  "estrutura.alternativa.salvarNome": { pt: "Salvar nome", en: "Save name", es: "Guardar nombre" },
  "estrutura.alternativa.erro.semNome": {
    pt: "Escreva o nome da alternativa.",
    en: "Type the name of the alternative.",
    es: "Escriba el nombre de la alternativa.",
  },
  "estrutura.alternativa.excluida": {
    pt: "Alternativa “{nome}” excluída.",
    en: "Alternative “{nome}” deleted.",
    es: "Alternativa «{nome}» eliminada.",
  },
  "estrutura.alternativa.erro.nomeVazio": {
    pt: "O nome não pode ficar vazio.",
    en: "The name cannot be left empty.",
    es: "El nombre no puede quedar vacío.",
  },
  "estrutura.alternativa.erro.repetida": {
    pt: 'Já existe uma alternativa "{nome}".',
    en: 'There is already an alternative called "{nome}".',
    es: 'Ya existe una alternativa "{nome}".',
  },

  // --- critérios ------------------------------------------------------------
  "estrutura.criterios.titulo": { pt: "Critérios", en: "Criteria", es: "Criterios" },
  "estrutura.criterios.faltamDois": {
    pt: "Faltam 2 critérios",
    en: "2 more criteria needed",
    es: "Faltan 2 criterios",
  },
  "estrutura.criterios.faltaUm": {
    pt: "Falta 1 critério",
    en: "1 more criterion needed",
    es: "Falta 1 criterio",
  },
  "estrutura.criterios.contagem": { pt: "{n} critérios", en: "{n} criteria", es: "{n} criterios" },
  "estrutura.criterios.dica.titulo": {
    pt: "O que é um critério",
    en: "What a criterion is",
    es: "Qué es un criterio",
  },
  "estrutura.criterios.dica.corpo1": {
    pt: "São os aspectos em que as alternativas se comparam: custo, prazo, qualidade.",
    en: "They are the aspects the alternatives are compared on: cost, lead time, quality.",
    es: "Son los aspectos en los que las alternativas se comparan: costo, plazo, calidad.",
  },
  /* {termo} é o destaque da frase: "direção" em português, o termo da
     literatura em inglês. */
  "estrutura.criterios.dica.corpo2": {
    pt: "A {termo} diz se um número alto é bom ou ruim, e é o único dado que inverte a decisão inteira sem dar sinal.",
    en: "The {termo} says whether a high number is good or bad, and it is the one piece of data that flips the whole decision without any warning.",
    es: "La {termo} dice si un número alto es bueno o malo, y es el único dato que invierte toda la decisión sin dar ninguna señal.",
  },
  "estrutura.criterios.dica.corpo2.termo": {
    pt: "direção",
    en: "criterion direction",
    es: "dirección",
  },
  "estrutura.criterios.vazio": {
    pt: "O que diferencia as opções: custo, prazo, qualidade. Pelo menos dois - e cada um precisa dizer se o número alto é bom ou ruim.",
    en: "What sets the options apart: cost, lead time, quality. At least two - and each one has to say whether a high number is good or bad.",
    es: "Lo que diferencia las opciones: costo, plazo, calidad. Al menos dos - y cada uno debe decir si un número alto es bueno o malo.",
  },

  // --- o formulário do critério ---------------------------------------------
  "estrutura.criterio.editando": {
    pt: "Editando “{nome}”.",
    en: "Editing “{nome}”.",
    es: "Editando “{nome}”.",
  },
  "estrutura.criterio.nome": { pt: "Nome do critério", en: "Criterion name", es: "Nombre del criterio" },
  "estrutura.criterio.nome.exemplo": {
    pt: "Custo unitário",
    en: "Unit cost",
    es: "Costo unitario",
  },
  "estrutura.criterio.unidade": { pt: "Unidade", en: "Unit", es: "Unidad" },
  "estrutura.criterio.unidade.exemplo": { pt: "R$/un", en: "$/unit", es: "$/ud" },
  "estrutura.criterio.unidade.dica.titulo": {
    pt: "Para que serve a unidade",
    en: "What the unit is for",
    es: "Para qué sirve la unidad",
  },
  "estrutura.criterio.unidade.dica.corpo1": {
    pt: "Ela não entra na conta - aparece nas perguntas, para você responder olhando grandezas reais.",
    en: "It enters no computation - it shows up in the questions, so you answer looking at real quantities.",
    es: "No entra en el cálculo - aparece en las preguntas, para que usted responda mirando magnitudes reales.",
  },
  "estrutura.criterio.unidade.dica.corpo2": {
    pt: "“De 45 para 12 dias” diz muito mais que “de 45 para 12”.",
    en: "“From 45 to 12 days” says far more than “from 45 to 12”.",
    es: "“De 45 a 12 días” dice mucho más que “de 45 a 12”.",
  },
  // --- modelo de veto ---------------------------------------------------------
  /* O rótulo usa "desempenho inaceitável" e não "veto" sozinho: quem nunca leu
     o artigo lê "veto" como eliminação, que é justamente o que este modelo não
     faz. O termo técnico aparece na dica, junto da fonte. */
  "estrutura.criterio.veto": {
    pt: "Desempenho inaceitável neste critério",
    en: "Unacceptable performance on this criterion",
    es: "Desempeño inaceptable en este criterio",
  },
  "estrutura.criterio.veto.opcional": {
    pt: "opcional",
    en: "optional",
    es: "opcional",
  },
  "estrutura.criterio.veto.selo": {
    pt: "com veto",
    en: "veto set",
    es: "con veto",
  },
  "estrutura.criterio.veto.selo.titulo": {
    pt: "Este critério tem limites de veto declarados",
    en: "This criterion has veto thresholds declared",
    es: "Este criterio tiene límites de veto declarados",
  },
  "estrutura.criterio.veto.explicacao": {
    pt: "Se houver um desempenho tão ruim que comprometa a alternativa inteira, diga qual é. A alternativa {naoElimina}: o valor global dela é penalizado, tanto mais quanto pior for o desempenho.",
    en: "If some performance is bad enough to compromise the whole alternative, say where. The alternative {naoElimina}: its overall value is penalised, the more so the worse the performance.",
    es: "Si hay un desempeño tan malo que compromete a toda la alternativa, indique cuál es. La alternativa {naoElimina}: su valor global es penalizado, tanto más cuanto peor sea el desempeño.",
  },
  "estrutura.criterio.veto.naoElimina": {
    pt: "não é eliminada",
    en: "is not eliminated",
    es: "no es eliminada",
  },
  "estrutura.criterio.veto.aceitavel.max": {
    pt: "Aceitável a partir de",
    en: "Acceptable from",
    es: "Aceptable a partir de",
  },
  "estrutura.criterio.veto.aceitavel.min": {
    pt: "Aceitável até",
    en: "Acceptable up to",
    es: "Aceptable hasta",
  },
  "estrutura.criterio.veto.aceitavel.ajuda": {
    pt: "Daqui em diante nada é penalizado.",
    en: "From here on nothing is penalised.",
    es: "De aquí en adelante nada es penalizado.",
  },
  "estrutura.criterio.veto.inaceitavel.max": {
    pt: "Inaceitável abaixo de",
    en: "Unacceptable below",
    es: "Inaceptable por debajo de",
  },
  "estrutura.criterio.veto.inaceitavel.min": {
    pt: "Inaceitável acima de",
    en: "Unacceptable above",
    es: "Inaceptable por encima de",
  },
  "estrutura.criterio.veto.inaceitavel.ajuda": {
    pt: "Aqui o critério deixa de contar a favor da alternativa.",
    en: "Here the criterion stops counting in the alternative's favour.",
    es: "Aquí el criterio deja de contar a favor de la alternativa.",
  },
  "estrutura.criterio.veto.vazio": {
    pt: "sem limite",
    en: "no threshold",
    es: "sin límite",
  },
  "estrutura.criterio.veto.umSo": {
    pt: "Entre os dois limites a penalidade é proporcional. Preenchendo só um, o corte é seco naquele ponto, sem faixa intermediária.",
    en: "Between the two thresholds the penalty is proportional. Filling in only one makes it a hard cut-off at that point, with no middle range.",
    es: "Entre los dos límites la penalidad es proporcional. Completando solo uno, el corte es seco en ese punto, sin franja intermedia.",
  },
  /* Dito no cadastro, e não só no resultado: quem declara o veto precisa saber
     o preço antes de pagá-lo. */
  "estrutura.criterio.veto.custo": {
    pt: "Com veto, o resultado passa a trabalhar com faixas mais largas, e pode levar mais perguntas até uma recomendação.",
    en: "With a veto, the result works with wider ranges, and it may take more questions to reach a recommendation.",
    es: "Con veto, el resultado pasa a trabajar con franjas más amplias, y puede llevar más preguntas hasta una recomendación.",
  },
  "estrutura.criterio.veto.dica.titulo": {
    pt: "Como o veto entra na conta",
    en: "How the veto enters the computation",
    es: "Cómo entra el veto en el cálculo",
  },
  "estrutura.criterio.veto.dica.corpo1": {
    pt: "O valor global da alternativa é multiplicado por um fator que cai conforme o desempenho piora neste critério: 1 no aceitável, 0 no inaceitável, proporcional entre os dois.",
    en: "The alternative's overall value is multiplied by a factor that drops as performance worsens on this criterion: 1 at the acceptable threshold, 0 at the unacceptable one, proportional in between.",
    es: "El valor global de la alternativa se multiplica por un factor que cae a medida que el desempeño empeora en este criterio: 1 en el aceptable, 0 en el inaceptable, proporcional entre los dos.",
  },
  "estrutura.criterio.veto.dica.corpo2": {
    pt: "Uma alternativa ótima em tudo o mais continua na disputa, mas com o valor reduzido - e pode perder para outra que seja apenas razoável em tudo.",
    en: "An alternative that excels at everything else stays in play, but with reduced value - and may lose to one that is merely reasonable across the board.",
    es: "Una alternativa óptima en todo lo demás sigue en disputa, pero con el valor reducido - y puede perder frente a otra que sea apenas razonable en todo.",
  },
  "estrutura.criterio.veto.dica.fonte": {
    pt: "Modelo aditivo com veto (de Almeida, 2013). O método o prevê para escolher a melhor e para ordenar.",
    en: "Additive model with veto (de Almeida, 2013). The method defines it for choice and for ranking.",
    es: "Modelo aditivo con veto (de Almeida, 2013). El método lo prevé para elegir la mejor y para ordenar.",
  },

  "estrutura.criterio.unidade.selo": {
    pt: "Unidade em que o critério é medido",
    en: "Unit the criterion is measured in",
    es: "Unidad en la que se mide el criterio",
  },

  "estrutura.criterio.escala": { pt: "Tipo de escala", en: "Scale type", es: "Tipo de escala" },
  "estrutura.criterio.escala.etiqueta": {
    pt: "Tipo de escala do critério",
    en: "Criterion scale type",
    es: "Tipo de escala del criterio",
  },
  "estrutura.criterio.escala.dica.titulo": {
    pt: "Contínua ou discreta",
    en: "Continuous or discrete",
    es: "Continua o discreta",
  },
  "estrutura.criterio.escala.dica.continua": {
    pt: "{termo}: o desempenho é um número dentro de uma faixa - preço, prazo, peso.",
    en: "{termo}: performance is a number inside a range - price, lead time, weight.",
    es: "{termo}: el desempeño es un número dentro de una franja - precio, plazo, peso.",
  },
  "estrutura.criterio.escala.dica.discreta": {
    pt: "{termo}: são níveis nomeados em ordem, como “ruim, médio, bom”. Você declara os níveis e o método trabalha com a ordem entre eles.",
    en: "{termo}: named levels in order, such as “poor, fair, good”. You declare the levels and the method works with the order between them.",
    es: "{termo}: son niveles nombrados en orden, como “malo, medio, bueno”. Usted declara los niveles y el método trabaja con el orden entre ellos.",
  },
  "estrutura.criterio.escala.continua": { pt: "Contínua", en: "Continuous", es: "Continua" },
  "estrutura.criterio.escala.continua.ajuda": {
    pt: "Qualquer número dentro de uma faixa, como preço ou prazo",
    en: "Any number inside a range, such as price or lead time",
    es: "Cualquier número dentro de una franja, como precio o plazo",
  },
  "estrutura.criterio.escala.discreta": { pt: "Discreta", en: "Discrete", es: "Discreta" },
  "estrutura.criterio.escala.discreta.ajuda": {
    pt: "Níveis nomeados em ordem, como ruim, médio e bom",
    en: "Named levels in order, such as poor, fair and good",
    es: "Niveles nombrados en orden, como malo, medio y bueno",
  },

  "estrutura.criterio.direcao": { pt: "O que é melhor", en: "Which way is better", es: "Qué es mejor" },
  "estrutura.criterio.direcao.etiqueta": {
    pt: "Direção do critério",
    en: "Criterion direction",
    es: "Dirección del criterio",
  },
  "estrutura.criterio.direcao.dica.titulo": {
    pt: "O dado mais perigoso da tela",
    en: "The most dangerous field on the screen",
    es: "El dato más peligroso de la pantalla",
  },
  "estrutura.criterio.direcao.dica.corpo1": {
    pt: "É o único campo que inverte o resultado inteiro sem dar nenhum sinal de erro.",
    en: "It is the only field that flips the entire result without raising any error.",
    es: "Es el único campo que invierte todo el resultado sin dar ninguna señal de error.",
  },
  "estrutura.criterio.direcao.dica.corpo2": {
    pt: "Um custo marcado como “maior é melhor” faz o método recomendar a alternativa mais cara - com toda a aparência de estar certa.",
    en: "A cost marked as “higher is better” makes the method recommend the most expensive alternative - looking entirely right while doing it.",
    es: "Un costo marcado como “mayor es mejor” hace que el método recomiende la alternativa más cara - con toda la apariencia de estar correcta.",
  },
  /* Os mesmos termos do sistema de referência e da literatura: quem chega de lá
     procura por eles, não por "maior". */
  "estrutura.criterio.direcao.dica.corpo3": {
    pt: "“Maior é melhor” é o que a literatura do método chama de {max}; “menor é melhor”, de {min}.",
    en: "“Higher is better” is what the method's literature calls {max}; “lower is better”, {min}.",
    es: "“Mayor es mejor” es lo que la literatura del método llama {max}; “menor es mejor”, {min}.",
  },
  "estrutura.criterio.direcao.maior": { pt: "maior", en: "higher", es: "mayor" },
  "estrutura.criterio.direcao.maior.ajuda": {
    pt: "Quanto maior o número, melhor a alternativa",
    en: "The higher the number, the better the alternative",
    es: "Cuanto mayor el número, mejor la alternativa",
  },
  "estrutura.criterio.direcao.menor": { pt: "menor", en: "lower", es: "menor" },
  "estrutura.criterio.direcao.menor.ajuda": {
    pt: "Quanto menor o número, melhor a alternativa",
    en: "The lower the number, the better the alternative",
    es: "Cuanto menor el número, mejor la alternativa",
  },
  "estrutura.criterio.direcao.selo.max": {
    pt: "Critério de maximização",
    en: "Maximization criterion",
    es: "Criterio de maximización",
  },
  "estrutura.criterio.direcao.selo.min": {
    pt: "Critério de minimização",
    en: "Minimization criterion",
    es: "Criterio de minimización",
  },

  "estrutura.criterio.inteiro": {
    pt: "Só valores inteiros",
    en: "Whole numbers only",
    es: "Solo valores enteros",
  },
  "estrutura.criterio.inteiro.dica.titulo": {
    pt: "Quando marcar",
    en: "When to check this",
    es: "Cuándo marcar",
  },
  "estrutura.criterio.inteiro.dica.corpo1": {
    pt: "Marque quando meio não existe: número de pessoas, de licenças, de viagens.",
    en: "Check it when halves do not exist: number of people, of licences, of trips.",
    es: "Marque cuando la mitad no existe: número de personas, de licencias, de viajes.",
  },
  "estrutura.criterio.inteiro.dica.corpo2": {
    pt: "Serve para a tela não sugerir 2,5 onde só cabe 2 ou 3.",
    en: "It keeps the screen from suggesting 2.5 where only 2 or 3 fit.",
    es: "Sirve para que la pantalla no sugiera 2,5 donde solo cabe 2 o 3.",
  },
  "estrutura.criterio.inteiro.selo": { pt: "só inteiros", en: "integers only", es: "solo enteros" },

  "estrutura.criterio.salvar": {
    pt: "Salvar alterações",
    en: "Save changes",
    es: "Guardar cambios",
  },
  "estrutura.criterio.cancelar": { pt: "cancelar", en: "cancel", es: "cancelar" },
  "estrutura.criterio.excluido": {
    pt: "Critério “{nome}” excluído, com a coluna de desempenhos.",
    en: "Criterion “{nome}” deleted, with its column of performances.",
    es: "Criterio «{nome}» eliminado, con su columna de desempeños.",
  },
  "estrutura.criterio.erro.repetido": {
    pt: 'Já existe um critério "{nome}".',
    en: 'There is already a criterion called "{nome}".',
    es: 'Ya existe un criterio "{nome}".',
  },

  // --- níveis de uma escala construída --------------------------------------
  "estrutura.niveis.ordem": {
    pt: "Os níveis vão {termo} desempenho. É a ordem que diz o que é bom - não a direção.",
    en: "The levels run {termo} in performance. The order is what says what is good, not the direction.",
    es: "Los niveles van {termo} en desempeño. Es el orden el que dice qué es bueno - no la dirección.",
  },
  "estrutura.niveis.ordem.termo": {
    pt: "do pior para o melhor",
    en: "from worst to best",
    es: "del peor al mejor",
  },
  "estrutura.niveis.pior": { pt: "pior", en: "worst", es: "peor" },
  "estrutura.niveis.melhor": { pt: "melhor", en: "best", es: "mejor" },
  "estrutura.niveis.intermediario": { pt: "nível {n}", en: "level {n}", es: "nivel {n}" },
  "estrutura.niveis.campo": { pt: "Nível {n}", en: "Level {n}", es: "Nivel {n}" },
  "estrutura.niveis.remover": {
    pt: "Remover nível {n}",
    en: "Remove level {n}",
    es: "Quitar nivel {n}",
  },
  "estrutura.niveis.adicionar": { pt: "nível", en: "level", es: "nivel" },
  "estrutura.niveis.selo": { pt: "escala construída", en: "constructed scale", es: "escala construida" },
  "estrutura.niveis.selo.titulo": {
    pt: "Níveis declarados, do pior para o melhor",
    en: "Declared levels, from worst to best",
    es: "Niveles declarados, del peor al mejor",
  },
  "estrutura.niveis.contagemUm": { pt: "{n} nível", en: "{n} level", es: "{n} nivel" },
  "estrutura.niveis.contagem": { pt: "{n} níveis", en: "{n} levels", es: "{n} niveles" },

  // --- matriz de consequências ----------------------------------------------
  /* A estrutura já foi validada com dois de cada, então a contagem nunca cai no
     singular aqui. */
  "estrutura.matriz.resumo": {
    pt: "{linhas} alternativas × {colunas} critérios. Para mudar a estrutura, volte ao passo anterior.",
    en: "{linhas} alternatives × {colunas} criteria. To change the structure, go back to the previous step.",
    es: "{linhas} alternativas × {colunas} criterios. Para cambiar la estructura, vuelva al paso anterior.",
  },
  "estrutura.matriz.role": {
    pt: "Role a tabela para o lado para ver os outros critérios.",
    en: "Scroll the table sideways to see the other criteria.",
    es: "Desplace la tabla hacia el lado para ver los otros criterios.",
  },

  /* Colar do Excel. A dica precisa dizer *onde* a colagem começa, senão a
     pessoa cola com o foco em qualquer lugar e os números entram deslocados —
     e aí duvida da ferramenta, não do próprio clique. */
  "estrutura.matriz.colar.dica": {
    pt: "Dá para colar a tabela inteira do Excel: clique na célula onde o bloco começa e tecle Ctrl+V.",
    en: "You can paste a whole table from Excel: click the cell where the block starts and press Ctrl+V.",
    es: "Se puede pegar la tabla entera desde Excel: haga clic en la celda donde comienza el bloque y presione Ctrl+V.",
  },
  "estrutura.matriz.colar.feito": {
    pt: "{n} células preenchidas.",
    en: "{n} cells filled.",
    es: "{n} celdas completadas.",
  },
  "estrutura.matriz.colar.umaCelula": {
    pt: "1 célula preenchida.",
    en: "1 cell filled.",
    es: "1 celda completada.",
  },
  "estrutura.matriz.colar.nada": {
    pt: "Nada foi colado: o conteúdo não parecia uma tabela.",
    en: "Nothing was pasted: the content did not look like a table.",
    es: "No se pegó nada: el contenido no parecía una tabla.",
  },
  "estrutura.matriz.colar.foraDaGrade": {
    pt: "{n} valores ficaram de fora: não cabem a partir dessa célula.",
    en: "{n} values were left out: they do not fit from that cell on.",
    es: "{n} valores quedaron fuera: no caben a partir de esa celda.",
  },
  "estrutura.matriz.colar.recusados": {
    pt: "{n} valores recusados: não são níveis declarados do critério.",
    en: "{n} values rejected: they are not declared levels of the criterion.",
    es: "{n} valores rechazados: no son niveles declarados del criterio.",
  },
  "estrutura.matriz.coluna.alternativa": {
    pt: "Alternativa",
    en: "Alternative",
    es: "Alternativa",
  },
  "estrutura.matriz.coluna.custo": { pt: "Custo", en: "Cost", es: "Costo" },
  "estrutura.matriz.coluna.custo.ajuda": {
    pt: "consome o orçamento",
    en: "consumes the budget",
    es: "consume el presupuesto",
  },
  "estrutura.matriz.custoDe": {
    pt: "Custo de {nome}",
    en: "Cost of {nome}",
    es: "Costo de {nome}",
  },
  "estrutura.matriz.voltar": {
    pt: "Voltar à estrutura",
    en: "Back to the structure",
    es: "Volver a la estructura",
  },

  // --- lista reordenável ----------------------------------------------------
  "estrutura.lista.moverAcima": {
    pt: "Mover {item} para cima",
    en: "Move {item} up",
    es: "Mover {item} hacia arriba",
  },
  "estrutura.lista.moverAbaixo": {
    pt: "Mover {item} para baixo",
    en: "Move {item} down",
    es: "Mover {item} hacia abajo",
  },
  "estrutura.lista.anuncioMovimento": {
    pt: "{item} agora está na posição {posicao} de {total}.",
    en: "{item} is now in position {posicao} of {total}.",
    es: "{item} ahora está en la posición {posicao} de {total}.",
  },
  "estrutura.lista.comoUsar": {
    pt: "Arraste pelos pontos à esquerda, ou use as setas.",
    en: "Drag by the dots on the left, or use the arrows.",
    es: "Arrastre por los puntos a la izquierda, o use las flechas.",
  },

  // --- barra de etapas da decisão -------------------------------------------
  "estrutura.etapas.rotulo": {
    pt: "Etapas da decisão",
    en: "Decision steps",
    es: "Etapas de la decisión",
  },
  "estrutura.etapas.problema": { pt: "Problema", en: "Problem", es: "Problema" },
  "estrutura.etapas.ordem": { pt: "Importância", en: "Importance", es: "Importancia" },
  "estrutura.etapas.perguntas": { pt: "Perguntas", en: "Questions", es: "Preguntas" },
  "estrutura.etapas.resultado": { pt: "Resultado", en: "Result", es: "Resultado" },
  "estrutura.etapas.confirmar": {
    pt: "Confirmar mudança de ordem",
    en: "Confirm order change",
    es: "Confirmar cambio de orden",
  },
  "estrutura.etapas.descarte": {
    pt: "Mudar a ordem descarta suas {respostas}. Elas comparavam outra sequência de critérios e não valem para a nova ordem.",
    en: "Changing the order discards your {respostas}. They compared a different sequence of criteria and do not hold for the new order.",
    es: "Cambiar el orden descarta sus {respostas}. Comparaban otra secuencia de criterios y no valen para el nuevo orden.",
  },
  "estrutura.etapas.descarte.umaResposta": {
    pt: "{n} resposta",
    en: "{n} answer",
    es: "{n} respuesta",
  },
  "estrutura.etapas.descarte.respostas": {
    pt: "{n} respostas",
    en: "{n} answers",
    es: "{n} respuestas",
  },
  "estrutura.etapas.descartar": {
    pt: "Descartar e reordenar",
    en: "Discard and reorder",
    es: "Descartar y reordenar",
  },

  // --- trilha de um cadastro ------------------------------------------------
  "estrutura.passos.rotulo": {
    pt: "Progresso do cadastro",
    en: "Setup progress",
    es: "Progreso del registro",
  },
  /* {n} e {total} entram como nós, para os dígitos manterem a fonte tabular. */
  "estrutura.passos.contador": {
    pt: "Passo {n} de {total}",
    en: "Step {n} of {total}",
    es: "Paso {n} de {total}",
  },
});
