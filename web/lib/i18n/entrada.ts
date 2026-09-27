/**
 * Catálogo da tela de entrada: o caminho que vai do objetivo da decisão até os
 * dados prontos para virar problema.
 *
 * Importa o núcleo porque reaproveita as chaves de uso geral dele
 * (`problematica.*`, `termo.*`). Sem esse import, um componente da entrada
 * renderizado sozinho - num teste, por exemplo - ficaria sem elas e mostraria a
 * chave crua.
 *
 * O inglês segue a literatura do método, não o português: `sorting` aloca em
 * `classes`, a carteira é um `portfolio`, e o que a carteira amostra é o espaço
 * das `scaling constants` - nunca "weights".
 */

import { registrar } from "./index";
import "./nucleo";

export const ENTRADA = registrar({
  // --- passo 1: o objetivo e a forma de entrada ------------------------------
  "entrada.objetivo.titulo": {
    pt: "O objetivo da decisão",
    en: "The goal of the decision",
    es: "El objetivo de la decisión",
  },
  "entrada.objetivo.descricao": {
    pt: "Duas escolhas antes de começar: que resposta você quer no fim, e de onde vêm os dados. Uma decisão já começada pode ser retomada de onde parou.",
    en: "Two choices before you start: what answer you want at the end, and where the data comes from. A decision already under way can be picked up where you left off.",
    es: "Dos elecciones antes de empezar: qué respuesta quiere al final, y de dónde vienen los datos. Una decisión ya iniciada puede retomarse donde se dejó.",
  },
  "entrada.objetivo.pergunta": {
    pt: "O que você quer decidir?",
    en: "What do you want to decide?",
    es: "¿Qué quiere decidir?",
  },
  "entrada.objetivo.dica.titulo": {
    pt: "Os quatro objetivos",
    en: "The four goals",
    es: "Los cuatro objetivos",
  },
  "entrada.objetivo.dica.perguntas": {
    pt: "As perguntas que você vai responder são as mesmas nos quatro. O que muda é a resposta no fim: uma alternativa recomendada, uma ordem completa, uma faixa para cada uma, ou um conjunto que caiba no orçamento.",
    en: "The questions you answer are the same in all four. What changes is the answer at the end: one recommended alternative, a full ranking, a class for each alternative, or a set that fits the budget.",
    es: "Las preguntas que usted responde son las mismas en los cuatro. Lo que cambia es la respuesta al final: una alternativa recomendada, una ordenación completa, una clase para cada una, o un conjunto que quepa en el presupuesto.",
  },
  "entrada.objetivo.dica.trocar": {
    pt: "Dá para trocar depois, sem responder nada de novo.",
    en: "You can switch later without answering anything again.",
    es: "Se puede cambiar después, sin responder nada de nuevo.",
  },
  "entrada.fonte.pergunta": {
    pt: "De onde vêm os dados?",
    en: "Where does the data come from?",
    es: "¿De dónde vienen los datos?",
  },

  "entrada.modo.manual": {
    pt: "Cadastrar problema novo",
    en: "Enter a new problem",
    es: "Registrar un problema nuevo",
  },
  "entrada.modo.manual.ajuda": {
    pt: "Alternativas e critérios na mão, um a um.",
    en: "Alternatives and criteria by hand, one at a time.",
    es: "Alternativas y criterios a mano, uno a uno.",
  },
  "entrada.modo.planilha": {
    pt: "Importar planilha",
    en: "Import a spreadsheet",
    es: "Importar hoja de cálculo",
  },
  "entrada.modo.planilha.ajuda": {
    pt: ".xlsx, .csv ou colado direto do Excel.",
    en: ".xlsx, .csv, or pasted straight from Excel.",
    es: ".xlsx, .csv o pegado directo desde Excel.",
  },

  /* O eco da escolha, partido onde a frase abraça o destaque e o número: o
     texto entre os dois pedaços muda de lugar de um idioma para o outro. */
  "entrada.resumo.antes": { pt: "Você vai", en: "You will", es: "Usted va a" },
  "entrada.resumo.meio": { pt: ", {modo}. São", en: ", {modo}. That is", es: ", {modo}. Son" },
  "entrada.resumo.passos": { pt: "passos", en: "steps", es: "pasos" },
  "entrada.resumo.escolha": {
    pt: "escolher a melhor alternativa",
    en: "choose the best alternative",
    es: "elegir la mejor alternativa",
  },
  "entrada.resumo.ranking": {
    pt: "ordenar todas as alternativas",
    en: "rank all the alternatives",
    es: "ordenar todas las alternativas",
  },
  "entrada.resumo.sorting": {
    pt: "classificar cada alternativa numa faixa",
    en: "sort each alternative into a class",
    es: "clasificar cada alternativa en una clase",
  },
  "entrada.resumo.beneficio_custo": {
    pt: "montar uma carteira pela razão entre benefício e custo",
    en: "build a portfolio by benefit-to-cost ratio",
    es: "armar un portafolio por la razón entre beneficio y costo",
  },
  "entrada.resumo.portfolio": {
    pt: "montar uma carteira dentro de um orçamento",
    en: "build a portfolio within a budget",
    es: "armar un portafolio dentro de un presupuesto",
  },
  "entrada.resumo.modo.manual": {
    pt: "cadastrando alternativas e critérios na mão",
    en: "entering alternatives and criteria by hand",
    es: "registrando alternativas y criterios a mano",
  },
  "entrada.resumo.modo.planilha": {
    pt: "importando os dados de uma planilha",
    en: "importing the data from a spreadsheet",
    es: "importando los datos de una hoja de cálculo",
  },

  // --- ações que nomeiam o destino, e não um "continuar" qualquer ------------
  "entrada.acao.manual": {
    pt: "Continuar para alternativas e critérios",
    en: "Continue to alternatives and criteria",
    es: "Continuar a alternativas y criterios",
  },
  "entrada.acao.planilha": {
    pt: "Continuar para a planilha",
    en: "Continue to the spreadsheet",
    es: "Continuar a la hoja de cálculo",
  },
  "entrada.acao.salvas": {
    pt: "Ver decisões salvas",
    en: "View saved decisions",
    es: "Ver decisiones guardadas",
  },
  "entrada.acao.criar": { pt: "Criar decisão", en: "Create decision", es: "Crear decisión" },
  "entrada.acao.continuarFaixas": {
    pt: "Continuar para as faixas",
    en: "Continue to the classes",
    es: "Continuar a las clases",
  },
  "entrada.acao.continuarOrcamento": {
    pt: "Continuar para o orçamento",
    en: "Continue to the budget",
    es: "Continuar al presupuesto",
  },
  "entrada.acao.voltarObjetivo": {
    pt: "Voltar ao objetivo",
    en: "Back to the goal",
    es: "Volver al objetivo",
  },
  "entrada.acao.voltarPlanilha": {
    pt: "Voltar à planilha",
    en: "Back to the spreadsheet",
    es: "Volver a la hoja de cálculo",
  },
  "entrada.acao.voltarDesempenhos": {
    pt: "Voltar aos desempenhos",
    en: "Back to the performances",
    es: "Volver a los desempeños",
  },

  // --- a trilha de passos ---------------------------------------------------
  "entrada.trilha.rotulo": {
    pt: "Progresso do cadastro",
    en: "Setup progress",
    es: "Progreso del registro",
  },
  "entrada.trilha.objetivo": { pt: "Objetivo", en: "Goal", es: "Objetivo" },
  "entrada.trilha.estrutura": { pt: "Estrutura", en: "Structure", es: "Estructura" },
  "entrada.trilha.desempenhos": { pt: "Desempenhos", en: "Performances", es: "Desempeños" },
  "entrada.trilha.planilha": { pt: "Planilha", en: "Spreadsheet", es: "Hoja de cálculo" },
  "entrada.trilha.faixas": { pt: "Faixas", en: "Classes", es: "Clases" },
  "entrada.trilha.orcamento": { pt: "Orçamento", en: "Budget", es: "Presupuesto" },
  "entrada.trilha.ajustes": { pt: "Ajustes", en: "Settings", es: "Ajustes" },

  // --- casos prontos --------------------------------------------------------
  "entrada.exemplos.titulo": {
    pt: "Começar de um caso pronto",
    en: "Start from a ready-made case",
    es: "Empezar desde un caso listo",
  },
  "entrada.exemplos.ajuda": {
    pt: "Preenche alternativas, critérios e desempenhos de uma vez. Dá para alterar tudo depois.",
    en: "Fills in alternatives, criteria and performances at once. You can change all of it afterwards.",
    es: "Completa alternativas, criterios y desempeños de una vez. Se puede cambiar todo después.",
  },
  "entrada.exemplos.contagem": {
    pt: "{alternativas} alternativas · {criterios} critérios",
    en: "{alternativas} alternatives · {criterios} criteria",
    es: "{alternativas} alternativas · {criterios} criterios",
  },
  "entrada.exemplos.mostrar": {
    pt: "ver os {n} casos",
    en: "show the {n} cases",
    es: "ver los {n} casos",
  },
  "entrada.exemplos.recolher": { pt: "recolher", en: "hide", es: "ocultar" },
  "entrada.exemplos.objetivoAjustado": {
    pt: "Objetivo ajustado para {objetivo} — é o que este caso usa.",
    en: "Goal switched to {objetivo} — that is what this case uses.",
    es: "Objetivo ajustado a {objetivo} — es lo que usa este caso.",
  },
  "entrada.exemplos.feitoPara": { pt: "para {objetivo}", en: "for {objetivo}", es: "para {objetivo}" },
  "entrada.exemplos.substituir.titulo": {
    pt: "Substituir o que você já preencheu?",
    en: "Replace what you have already filled in?",
    es: "¿Reemplazar lo que usted ya completó?",
  },
  "entrada.exemplos.substituir.confirmar": {
    pt: "Substituir pelo exemplo",
    en: "Replace with the example",
    es: "Reemplazar por el ejemplo",
  },
  "entrada.exemplos.substituir.antes": { pt: "Carregar", en: "Loading", es: "Cargar" },
  "entrada.exemplos.substituir.depois": {
    pt: "apaga as alternativas, os critérios e os desempenhos que já estão no cadastro, e põe os do exemplo no lugar.",
    en: "clears the alternatives, the criteria and the performances already entered, and puts the ones from the example in their place.",
    es: "borra las alternativas, los criterios y los desempeños ya registrados, y pone en su lugar los del ejemplo.",
  },
  "entrada.exemplos.substituir.semVolta": {
    pt: "Não dá para desfazer.",
    en: "This cannot be undone.",
    es: "Esto no se puede deshacer.",
  },

  // --- passo 2 (manual): a estrutura ---------------------------------------
  "entrada.estrutura.titulo": {
    pt: "Quem são as opções e o que importa",
    en: "The options and what matters",
    es: "Cuáles son las opciones y qué importa",
  },
  "entrada.estrutura.descricao": {
    pt: "Primeiro a estrutura do problema: as alternativas que você compara e os critérios em que elas se comparam. Os números vêm no passo seguinte.",
    en: "The structure of the problem first: the alternatives you compare and the criteria you compare them on. The numbers come in the next step.",
    es: "Primero la estructura del problema: las alternativas que usted compara y los criterios en los que se comparan. Los números vienen en el siguiente paso.",
  },

  // --- passo 3 (manual): os desempenhos ------------------------------------
  "entrada.matriz.titulo": {
    pt: "Desempenho de cada alternativa",
    en: "Performance of each alternative",
    es: "Desempeño de cada alternativa",
  },
  "entrada.matriz.dica.titulo": {
    pt: "Que números entram aqui",
    en: "Which numbers go here",
    es: "Qué números van aquí",
  },
  "entrada.matriz.dica.reais": {
    pt: "O desempenho real: R$ 12,50, 30 dias, 0,82. Nada de notas de 1 a 10: o método trabalha com os números do problema.",
    en: "The real performance: $12.50, 30 days, 0.82. No 1-to-10 scores: the method works with the problem's own numbers.",
    es: "El desempeño real: $12,50, 30 días, 0,82. Nada de notas de 1 a 10: el método trabaja con los números propios del problema.",
  },
  "entrada.matriz.dica.normaliza": {
    pt: "Ele normaliza tudo depois, então unidades diferentes na mesma tabela não são problema.",
    en: "It normalizes everything afterwards, so different units in the same table are not a problem.",
    es: "Él normaliza todo después, así que unidades diferentes en la misma tabla no son un problema.",
  },

  // --- planilha -------------------------------------------------------------
  "entrada.planilha.titulo": {
    pt: "Importar de uma planilha",
    en: "Import from a spreadsheet",
    es: "Importar desde una hoja de cálculo",
  },
  "entrada.planilha.descricao": {
    pt: "Ler não é criar: os dados voltam para você conferir antes de virarem decisão.",
    en: "Reading is not creating: the data comes back for you to check before it becomes a decision.",
    es: "Leer no es crear: los datos vuelven para que usted los revise antes de que se conviertan en decisión.",
  },
  "entrada.planilha.dadosColados": {
    pt: "os dados colados",
    en: "the pasted data",
    es: "los datos pegados",
  },

  // --- decisões salvas ------------------------------------------------------
  "entrada.salvas.titulo": { pt: "Decisões salvas", en: "Saved decisions", es: "Decisiones guardadas" },
  "entrada.salvas.descricao": {
    pt: "Retome de onde parou. As respostas já dadas continuam guardadas.",
    en: "Pick up where you left off. The answers you already gave are still there.",
    es: "Retome donde se quedó. Las respuestas ya dadas siguen guardadas.",
  },

  // --- conferência do que veio da planilha ----------------------------------
  "entrada.conferencia.titulo": {
    pt: "Confira o que foi lido",
    en: "Check what was read",
    es: "Revise lo que fue leído",
  },
  "entrada.conferencia.dica.titulo": {
    pt: "Por que conferir antes",
    en: "Why check first",
    es: "Por qué revisar antes",
  },
  "entrada.conferencia.dica.antes": { pt: "A", en: "The", es: "La" },
  "entrada.conferencia.dica.depois": {
    pt: "de cada critério é o único dado que inverte o resultado inteiro sem dar sinal nenhum.",
    en: "of each criterion is the only piece of data that flips the whole result without any sign that it did.",
    es: "de cada criterio es el único dato que invierte todo el resultado sin dar ninguna señal.",
  },
  "entrada.conferencia.dica.invertida": {
    pt: "Uma planilha lida com “menor é melhor” trocado por “maior” recomenda justamente a pior opção - e parece correta.",
    en: "A spreadsheet read with “lower is better” swapped for “higher” recommends the worst option of all - and it looks right.",
    es: "Una hoja de cálculo leída con “menor es mejor” cambiado por “mayor” recomienda justamente la peor opción - y parece correcta.",
  },
  "entrada.conferencia.origemColada": {
    pt: "Colado da planilha",
    en: "Pasted from a spreadsheet",
    es: "Pegado desde una hoja de cálculo",
  },
  "entrada.conferencia.resumo": {
    pt: "{origem} · {alternativas} alternativas · {criterios} critérios{custos}. Nada foi gravado ainda.",
    en: "{origem} · {alternativas} alternatives · {criterios} criteria{custos}. Nothing has been saved yet.",
    es: "{origem} · {alternativas} alternativas · {criterios} criterios{custos}. Todavía no se ha guardado nada.",
  },
  "entrada.conferencia.comCustos": { pt: " · com custos", en: " · with costs", es: " · con costos" },
  "entrada.conferencia.nome": { pt: "Nome da decisão", en: "Decision name", es: "Nombre de la decisión" },
  "entrada.conferencia.nome.ajuda": {
    pt: "Veio da planilha; dá para trocar.",
    en: "It came from the spreadsheet; you can change it.",
    es: "Vino de la hoja de cálculo; se puede cambiar.",
  },
  "entrada.conferencia.semNome": {
    pt: "Decisão sem nome",
    en: "Untitled decision",
    es: "Decisión sin nombre",
  },
  "entrada.conferencia.aviso.antes": {
    pt: "Todos os critérios ficaram como",
    en: "Every criterion came in as",
    es: "Todos los criterios quedaron como",
  },
  "entrada.conferencia.aviso.depois": {
    pt: ". Pode estar certo - mas é raro. Vale conferir linha por linha.",
    en: ". It may be right, but it is rare. Worth checking line by line.",
    es: ". Puede estar correcto - pero es raro. Vale la pena revisar línea por línea.",
  },
  "entrada.conferencia.coluna.alternativa": {
    pt: "Alternativa",
    en: "Alternative",
    es: "Alternativa",
  },
  "entrada.conferencia.direcaoDe": {
    pt: "Direção de {criterio}",
    en: "Direction of {criterio}",
    es: "Dirección de {criterio}",
  },
  "entrada.conferencia.confirmar": {
    pt: "Está certo, criar a decisão",
    en: "This is right, create the decision",
    es: "Está correcto, crear la decisión",
  },
  "entrada.conferencia.outraPlanilha": {
    pt: "escolher outra planilha",
    en: "choose another spreadsheet",
    es: "elegir otra hoja de cálculo",
  },

  // --- a direção de um critério, no controle segmentado ---------------------
  "entrada.direcao.maior": { pt: "maior", en: "higher", es: "mayor" },
  "entrada.direcao.maior.ajuda": {
    pt: "Quanto maior o número, melhor",
    en: "The higher the number, the better",
    es: "Cuanto mayor el número, mejor",
  },
  "entrada.direcao.menor": { pt: "menor", en: "lower", es: "menor" },
  "entrada.direcao.menor.ajuda": {
    pt: "Quanto menor o número, melhor",
    en: "The lower the number, the better",
    es: "Cuanto menor el número, mejor",
  },

  // --- termos que aparecem em destaque no meio de uma frase -----------------
  "entrada.termo.direcao": { pt: "direção", en: "direction", es: "dirección" },
  "entrada.termo.valorGlobal": { pt: "valor global", en: "global value", es: "valor global" },
  "entrada.termo.conjunto": { pt: "conjunto", en: "set", es: "conjunto" },
  "entrada.termo.custo": { pt: "Custo", en: "Cost", es: "Costo" },

  // --- as faixas do sorting -------------------------------------------------
  "entrada.ajustes.descricao": {
    pt: "Último passo antes de criar a decisão. Nada foi gravado ainda.",
    en: "Last step before creating the decision. Nothing has been saved yet.",
    es: "Último paso antes de crear la decisión. Todavía no se ha guardado nada.",
  },
  "entrada.faixas.titulo": {
    pt: "As faixas de classificação",
    en: "The classification classes",
    es: "Las clases de clasificación",
  },
  "entrada.faixas.dica.titulo": {
    pt: "Por que definir faixas",
    en: "Why define classes",
    es: "Por qué definir clases",
  },
  "entrada.faixas.dica.diferenca": {
    pt: "Classificar é diferente de ordenar: em vez de dizer quem é melhor que quem, cada alternativa cai numa faixa.",
    en: "Sorting is not ranking: instead of saying which alternative beats which, each one falls into a class.",
    es: "Clasificar es diferente de ordenar: en vez de decir quién es mejor que quién, cada alternativa cae en una clase.",
  },
  "entrada.faixas.dica.suas": {
    pt: "As faixas são suas - quem decide o que conta como “Alta” é você, não o método.",
    en: "The classes are yours - you decide what counts as “High”, not the method.",
    es: "Las clases son suyas - quien decide qué cuenta como “Alta” es usted, no el método.",
  },
  "entrada.faixas.escala.antes": {
    pt: "Cada faixa vai até um ponto da escala de",
    en: "Each class ends at a point on the",
    es: "Cada clase llega hasta un punto de la escala de",
  },
  "entrada.faixas.escala.depois": {
    pt: ", que vai de 0 a 1. Zero é uma alternativa com o pior desempenho em todos os critérios; 1 é a melhor em todos. Não é a unidade de nenhum critério.",
    en: " scale, which runs from 0 to 1. Zero is an alternative with the worst performance on every criterion; 1 is the best on all of them. It is not the unit of any criterion.",
    es: ", que va de 0 a 1. Cero es una alternativa con el peor desempeño en todos los criterios; 1 es la mejor en todos. No es la unidad de ningún criterio.",
  },
  "entrada.faixas.quantas": { pt: "Quantas faixas?", en: "How many classes?", es: "¿Cuántas clases?" },
  "entrada.faixas.quantidade": {
    pt: "Quantidade de faixas",
    en: "Number of classes",
    es: "Cantidad de clases",
  },
  "entrada.faixas.opcao": {
    pt: "{n} faixas de classificação",
    en: "{n} classification classes",
    es: "{n} clases de clasificación",
  },
  "entrada.faixas.padrao": { pt: "Faixa {n}", en: "Class {n}", es: "Clase {n}" },
  "entrada.faixas.nome": { pt: "Nome da faixa {n}", en: "Class {n} name", es: "Nombre de la clase {n}" },
  "entrada.faixas.corte": {
    pt: "Corte entre a faixa {a} e a {b}",
    en: "Cut between class {a} and class {b}",
    es: "Corte entre la clase {a} y la {b}",
  },
  "entrada.faixas.de": { pt: "de", en: "from", es: "de" },
  "entrada.faixas.ate": { pt: "até", en: "to", es: "hasta" },
  /* Os extremos da escada de faixas são números escritos à mão: o separador
     decimal muda de idioma junto com o resto da tela. */
  "entrada.faixas.zero": { pt: "0,00", en: "0.00", es: "0,00" },
  "entrada.faixas.um": { pt: "1,00", en: "1.00", es: "1,00" },

  // --- o orçamento da carteira ---------------------------------------------
  "entrada.orcamento.titulo": {
    pt: "O limite da carteira",
    en: "The portfolio limit",
    es: "El límite de la cartera",
  },
  "entrada.orcamento.dica.titulo": {
    pt: "Por que um orçamento",
    en: "Why a budget",
    es: "Por qué un presupuesto",
  },
  "entrada.orcamento.dica.antes": {
    pt: "Aqui não se escolhe uma alternativa, mas um",
    en: "Here you do not pick one alternative but a",
    es: "Aquí no se elige una alternativa, sino un",
  },
  "entrada.orcamento.dica.depois": {
    pt: "delas que caiba no orçamento.",
    en: "of them that fits the budget.",
    es: "de ellas que quepa en el presupuesto.",
  },
  "entrada.orcamento.dica.aproximado": {
    pt: "Este é o único resultado aproximado do método: ele vem de uma amostragem do espaço de pesos, e a tela avisa isso no fim.",
    en: "This is the method's only approximate result: it comes from sampling the space of scaling constants, and the screen says so at the end.",
    es: "Este es el único resultado aproximado del método: viene de un muestreo del espacio de las constantes de escala, y la pantalla lo avisa al final.",
  },
  "entrada.orcamento.rotulo": {
    pt: "Orçamento disponível",
    en: "Available budget",
    es: "Presupuesto disponible",
  },
  "entrada.orcamento.total.antes": {
    pt: "Custar tudo sairia por",
    en: "Taking everything would cost",
    es: "Tomar todo costaría",
  },
  "entrada.orcamento.total.depois": {
    pt: ". Um orçamento acima disso torna a escolha trivial - cabe tudo.",
    en: ". A budget above that makes the choice trivial - everything fits.",
    es: ". Un presupuesto por encima de eso hace que la elección sea trivial - cabe todo.",
  },
  "entrada.orcamento.custos.planilha.antes": {
    pt: "O custo de cada alternativa vem da linha",
    en: "The cost of each alternative comes from the",
    es: "El costo de cada alternativa viene de la fila",
  },
  "entrada.orcamento.custos.planilha.depois": {
    pt: "da planilha - o modelo para baixar já traz essa linha.",
    en: "row of the spreadsheet - the template you can download already has it.",
    es: "de la hoja de cálculo - la plantilla para descargar ya trae esa fila.",
  },
  "entrada.orcamento.custos.matriz.antes": {
    pt: "O custo de cada alternativa veio da coluna",
    en: "The cost of each alternative came from the",
    es: "El costo de cada alternativa vino de la columna",
  },
  "entrada.orcamento.custos.matriz.depois": {
    pt: "do passo dos desempenhos - volte lá para corrigir algum.",
    en: "column in the performances step - go back there to fix any of them.",
    es: "del paso de los desempeños - vuelva allá para corregir alguno.",
  },
});
