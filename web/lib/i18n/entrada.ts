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
  },
  "entrada.objetivo.descricao": {
    pt: "Duas escolhas antes de começar: que resposta você quer no fim, e de onde vêm os dados. Uma decisão já começada pode ser retomada de onde parou.",
    en: "Two choices before you start: what answer you want at the end, and where the data comes from. A decision already under way can be picked up where you left off.",
  },
  "entrada.objetivo.pergunta": {
    pt: "O que você quer decidir?",
    en: "What do you want to decide?",
  },
  "entrada.objetivo.dica.titulo": {
    pt: "Os quatro objetivos",
    en: "The four goals",
  },
  "entrada.objetivo.dica.perguntas": {
    pt: "As perguntas que você vai responder são as mesmas nos quatro. O que muda é a resposta no fim: uma alternativa recomendada, uma ordem completa, uma faixa para cada uma, ou um conjunto que caiba no orçamento.",
    en: "The questions you answer are the same in all four. What changes is the answer at the end: one recommended alternative, a full ranking, a class for each alternative, or a set that fits the budget.",
  },
  "entrada.objetivo.dica.trocar": {
    pt: "Dá para trocar depois, sem responder nada de novo.",
    en: "You can switch later without answering anything again.",
  },
  "entrada.fonte.pergunta": {
    pt: "De onde vêm os dados?",
    en: "Where does the data come from?",
  },

  "entrada.modo.manual": {
    pt: "Cadastrar problema novo",
    en: "Enter a new problem",
  },
  "entrada.modo.manual.ajuda": {
    pt: "Alternativas e critérios na mão, um a um.",
    en: "Alternatives and criteria by hand, one at a time.",
  },
  "entrada.modo.planilha": {
    pt: "Importar planilha",
    en: "Import a spreadsheet",
  },
  "entrada.modo.planilha.ajuda": {
    pt: ".xlsx, .csv ou colado direto do Excel.",
    en: ".xlsx, .csv, or pasted straight from Excel.",
  },

  /* O eco da escolha, partido onde a frase abraça o destaque e o número: o
     texto entre os dois pedaços muda de lugar de um idioma para o outro. */
  "entrada.resumo.antes": { pt: "Você vai", en: "You will" },
  "entrada.resumo.meio": { pt: ", {modo}. São", en: ", {modo}. That is" },
  "entrada.resumo.passos": { pt: "passos", en: "steps" },
  "entrada.resumo.escolha": {
    pt: "escolher a melhor alternativa",
    en: "choose the best alternative",
  },
  "entrada.resumo.ranking": {
    pt: "ordenar todas as alternativas",
    en: "rank all the alternatives",
  },
  "entrada.resumo.sorting": {
    pt: "classificar cada alternativa numa faixa",
    en: "sort each alternative into a class",
  },
  "entrada.resumo.beneficio_custo": {
    pt: "montar uma carteira pela razão entre benefício e custo",
    en: "build a portfolio by benefit-to-cost ratio",
  },
  "entrada.resumo.portfolio": {
    pt: "montar uma carteira dentro de um orçamento",
    en: "build a portfolio within a budget",
  },
  "entrada.resumo.modo.manual": {
    pt: "cadastrando alternativas e critérios na mão",
    en: "entering alternatives and criteria by hand",
  },
  "entrada.resumo.modo.planilha": {
    pt: "importando os dados de uma planilha",
    en: "importing the data from a spreadsheet",
  },

  // --- ações que nomeiam o destino, e não um "continuar" qualquer ------------
  "entrada.acao.manual": {
    pt: "Continuar para alternativas e critérios",
    en: "Continue to alternatives and criteria",
  },
  "entrada.acao.planilha": {
    pt: "Continuar para a planilha",
    en: "Continue to the spreadsheet",
  },
  "entrada.acao.salvas": {
    pt: "Ver decisões salvas",
    en: "View saved decisions",
  },
  "entrada.acao.criar": { pt: "Criar decisão", en: "Create decision" },
  "entrada.acao.continuarFaixas": {
    pt: "Continuar para as faixas",
    en: "Continue to the classes",
  },
  "entrada.acao.continuarOrcamento": {
    pt: "Continuar para o orçamento",
    en: "Continue to the budget",
  },
  "entrada.acao.voltarObjetivo": {
    pt: "Voltar ao objetivo",
    en: "Back to the goal",
  },
  "entrada.acao.voltarPlanilha": {
    pt: "Voltar à planilha",
    en: "Back to the spreadsheet",
  },
  "entrada.acao.voltarDesempenhos": {
    pt: "Voltar aos desempenhos",
    en: "Back to the performances",
  },

  // --- a trilha de passos ---------------------------------------------------
  "entrada.trilha.rotulo": {
    pt: "Progresso do cadastro",
    en: "Setup progress",
  },
  "entrada.trilha.objetivo": { pt: "Objetivo", en: "Goal" },
  "entrada.trilha.estrutura": { pt: "Estrutura", en: "Structure" },
  "entrada.trilha.desempenhos": { pt: "Desempenhos", en: "Performances" },
  "entrada.trilha.planilha": { pt: "Planilha", en: "Spreadsheet" },
  "entrada.trilha.faixas": { pt: "Faixas", en: "Classes" },
  "entrada.trilha.orcamento": { pt: "Orçamento", en: "Budget" },
  "entrada.trilha.ajustes": { pt: "Ajustes", en: "Settings" },

  // --- casos prontos --------------------------------------------------------
  "entrada.exemplos.titulo": {
    pt: "Começar de um caso pronto",
    en: "Start from a ready-made case",
  },
  "entrada.exemplos.ajuda": {
    pt: "Preenche alternativas, critérios e desempenhos de uma vez. Dá para alterar tudo depois.",
    en: "Fills in alternatives, criteria and performances at once. You can change all of it afterwards.",
  },
  "entrada.exemplos.contagem": {
    pt: "{alternativas} alternativas · {criterios} critérios",
    en: "{alternativas} alternatives · {criterios} criteria",
  },
  "entrada.exemplos.mostrar": {
    pt: "ver os {n} casos",
    en: "show the {n} cases",
  },
  "entrada.exemplos.recolher": { pt: "recolher", en: "hide" },
  "entrada.exemplos.objetivoAjustado": {
    pt: "Objetivo ajustado para {objetivo} — é o que este caso usa.",
    en: "Goal switched to {objetivo} — that is what this case uses.",
  },
  "entrada.exemplos.feitoPara": { pt: "para {objetivo}", en: "for {objetivo}" },
  "entrada.exemplos.substituir.titulo": {
    pt: "Substituir o que você já preencheu?",
    en: "Replace what you have already filled in?",
  },
  "entrada.exemplos.substituir.confirmar": {
    pt: "Substituir pelo exemplo",
    en: "Replace with the example",
  },
  "entrada.exemplos.substituir.antes": { pt: "Carregar", en: "Loading" },
  "entrada.exemplos.substituir.depois": {
    pt: "apaga as alternativas, os critérios e os desempenhos que já estão no cadastro, e põe os do exemplo no lugar.",
    en: "clears the alternatives, the criteria and the performances already entered, and puts the ones from the example in their place.",
  },
  "entrada.exemplos.substituir.semVolta": {
    pt: "Não dá para desfazer.",
    en: "This cannot be undone.",
  },

  // --- passo 2 (manual): a estrutura ---------------------------------------
  "entrada.estrutura.titulo": {
    pt: "Quem são as opções e o que importa",
    en: "The options and what matters",
  },
  "entrada.estrutura.descricao": {
    pt: "Primeiro a estrutura do problema: as alternativas que você compara e os critérios em que elas se comparam. Os números vêm no passo seguinte.",
    en: "The structure of the problem first: the alternatives you compare and the criteria you compare them on. The numbers come in the next step.",
  },

  // --- passo 3 (manual): os desempenhos ------------------------------------
  "entrada.matriz.titulo": {
    pt: "Desempenho de cada alternativa",
    en: "Performance of each alternative",
  },
  "entrada.matriz.dica.titulo": {
    pt: "Que números entram aqui",
    en: "Which numbers go here",
  },
  "entrada.matriz.dica.reais": {
    pt: "O desempenho real: R$ 12,50, 30 dias, 0,82. Nada de notas de 1 a 10: o método trabalha com os números do problema.",
    en: "The real performance: $12.50, 30 days, 0.82. No 1-to-10 scores: the method works with the problem's own numbers.",
  },
  "entrada.matriz.dica.normaliza": {
    pt: "Ele normaliza tudo depois, então unidades diferentes na mesma tabela não são problema.",
    en: "It normalizes everything afterwards, so different units in the same table are not a problem.",
  },

  // --- planilha -------------------------------------------------------------
  "entrada.planilha.titulo": {
    pt: "Importar de uma planilha",
    en: "Import from a spreadsheet",
  },
  "entrada.planilha.descricao": {
    pt: "Ler não é criar: os dados voltam para você conferir antes de virarem decisão.",
    en: "Reading is not creating: the data comes back for you to check before it becomes a decision.",
  },
  "entrada.planilha.dadosColados": {
    pt: "os dados colados",
    en: "the pasted data",
  },

  // --- decisões salvas ------------------------------------------------------
  "entrada.salvas.titulo": { pt: "Decisões salvas", en: "Saved decisions" },
  "entrada.salvas.descricao": {
    pt: "Retome de onde parou. As respostas já dadas continuam guardadas.",
    en: "Pick up where you left off. The answers you already gave are still there.",
  },

  // --- conferência do que veio da planilha ----------------------------------
  "entrada.conferencia.titulo": {
    pt: "Confira o que foi lido",
    en: "Check what was read",
  },
  "entrada.conferencia.dica.titulo": {
    pt: "Por que conferir antes",
    en: "Why check first",
  },
  "entrada.conferencia.dica.antes": { pt: "A", en: "The" },
  "entrada.conferencia.dica.depois": {
    pt: "de cada critério é o único dado que inverte o resultado inteiro sem dar sinal nenhum.",
    en: "of each criterion is the only piece of data that flips the whole result without any sign that it did.",
  },
  "entrada.conferencia.dica.invertida": {
    pt: "Uma planilha lida com “menor é melhor” trocado por “maior” recomenda justamente a pior opção - e parece correta.",
    en: "A spreadsheet read with “lower is better” swapped for “higher” recommends the worst option of all - and it looks right.",
  },
  "entrada.conferencia.origemColada": {
    pt: "Colado da planilha",
    en: "Pasted from a spreadsheet",
  },
  "entrada.conferencia.resumo": {
    pt: "{origem} · {alternativas} alternativas · {criterios} critérios{custos}. Nada foi gravado ainda.",
    en: "{origem} · {alternativas} alternatives · {criterios} criteria{custos}. Nothing has been saved yet.",
  },
  "entrada.conferencia.comCustos": { pt: " · com custos", en: " · with costs" },
  "entrada.conferencia.nome": { pt: "Nome da decisão", en: "Decision name" },
  "entrada.conferencia.nome.ajuda": {
    pt: "Veio da planilha; dá para trocar.",
    en: "It came from the spreadsheet; you can change it.",
  },
  "entrada.conferencia.semNome": {
    pt: "Decisão sem nome",
    en: "Untitled decision",
  },
  "entrada.conferencia.aviso.antes": {
    pt: "Todos os critérios ficaram como",
    en: "Every criterion came in as",
  },
  "entrada.conferencia.aviso.depois": {
    pt: ". Pode estar certo - mas é raro. Vale conferir linha por linha.",
    en: ". It may be right, but it is rare. Worth checking line by line.",
  },
  "entrada.conferencia.coluna.alternativa": {
    pt: "Alternativa",
    en: "Alternative",
  },
  "entrada.conferencia.direcaoDe": {
    pt: "Direção de {criterio}",
    en: "Direction of {criterio}",
  },
  "entrada.conferencia.confirmar": {
    pt: "Está certo, criar a decisão",
    en: "This is right, create the decision",
  },
  "entrada.conferencia.outraPlanilha": {
    pt: "escolher outra planilha",
    en: "choose another spreadsheet",
  },

  // --- a direção de um critério, no controle segmentado ---------------------
  "entrada.direcao.maior": { pt: "maior", en: "higher" },
  "entrada.direcao.maior.ajuda": {
    pt: "Quanto maior o número, melhor",
    en: "The higher the number, the better",
  },
  "entrada.direcao.menor": { pt: "menor", en: "lower" },
  "entrada.direcao.menor.ajuda": {
    pt: "Quanto menor o número, melhor",
    en: "The lower the number, the better",
  },

  // --- termos que aparecem em destaque no meio de uma frase -----------------
  "entrada.termo.direcao": { pt: "direção", en: "direction" },
  "entrada.termo.valorGlobal": { pt: "valor global", en: "global value" },
  "entrada.termo.conjunto": { pt: "conjunto", en: "set" },
  "entrada.termo.custo": { pt: "Custo", en: "Cost" },

  // --- as faixas do sorting -------------------------------------------------
  "entrada.ajustes.descricao": {
    pt: "Último passo antes de criar a decisão. Nada foi gravado ainda.",
    en: "Last step before creating the decision. Nothing has been saved yet.",
  },
  "entrada.faixas.titulo": {
    pt: "As faixas de classificação",
    en: "The classification classes",
  },
  "entrada.faixas.dica.titulo": {
    pt: "Por que definir faixas",
    en: "Why define classes",
  },
  "entrada.faixas.dica.diferenca": {
    pt: "Classificar é diferente de ordenar: em vez de dizer quem é melhor que quem, cada alternativa cai numa faixa.",
    en: "Sorting is not ranking: instead of saying which alternative beats which, each one falls into a class.",
  },
  "entrada.faixas.dica.suas": {
    pt: "As faixas são suas - quem decide o que conta como “Alta” é você, não o método.",
    en: "The classes are yours - you decide what counts as “High”, not the method.",
  },
  "entrada.faixas.escala.antes": {
    pt: "Cada faixa vai até um ponto da escala de",
    en: "Each class ends at a point on the",
  },
  "entrada.faixas.escala.depois": {
    pt: ", que vai de 0 a 1. Zero é uma alternativa com o pior desempenho em todos os critérios; 1 é a melhor em todos. Não é a unidade de nenhum critério.",
    en: " scale, which runs from 0 to 1. Zero is an alternative with the worst performance on every criterion; 1 is the best on all of them. It is not the unit of any criterion.",
  },
  "entrada.faixas.quantas": { pt: "Quantas faixas?", en: "How many classes?" },
  "entrada.faixas.quantidade": {
    pt: "Quantidade de faixas",
    en: "Number of classes",
  },
  "entrada.faixas.opcao": {
    pt: "{n} faixas de classificação",
    en: "{n} classification classes",
  },
  "entrada.faixas.padrao": { pt: "Faixa {n}", en: "Class {n}" },
  "entrada.faixas.nome": { pt: "Nome da faixa {n}", en: "Class {n} name" },
  "entrada.faixas.corte": {
    pt: "Corte entre a faixa {a} e a {b}",
    en: "Cut between class {a} and class {b}",
  },
  "entrada.faixas.de": { pt: "de", en: "from" },
  "entrada.faixas.ate": { pt: "até", en: "to" },
  /* Os extremos da escada de faixas são números escritos à mão: o separador
     decimal muda de idioma junto com o resto da tela. */
  "entrada.faixas.zero": { pt: "0,00", en: "0.00" },
  "entrada.faixas.um": { pt: "1,00", en: "1.00" },

  // --- o orçamento da carteira ---------------------------------------------
  "entrada.orcamento.titulo": {
    pt: "O limite da carteira",
    en: "The portfolio limit",
  },
  "entrada.orcamento.dica.titulo": {
    pt: "Por que um orçamento",
    en: "Why a budget",
  },
  "entrada.orcamento.dica.antes": {
    pt: "Aqui não se escolhe uma alternativa, mas um",
    en: "Here you do not pick one alternative but a",
  },
  "entrada.orcamento.dica.depois": {
    pt: "delas que caiba no orçamento.",
    en: "of them that fits the budget.",
  },
  "entrada.orcamento.dica.aproximado": {
    pt: "Este é o único resultado aproximado do método: ele vem de uma amostragem do espaço de pesos, e a tela avisa isso no fim.",
    en: "This is the method's only approximate result: it comes from sampling the space of scaling constants, and the screen says so at the end.",
  },
  "entrada.orcamento.rotulo": {
    pt: "Orçamento disponível",
    en: "Available budget",
  },
  "entrada.orcamento.total.antes": {
    pt: "Custar tudo sairia por",
    en: "Taking everything would cost",
  },
  "entrada.orcamento.total.depois": {
    pt: ". Um orçamento acima disso torna a escolha trivial - cabe tudo.",
    en: ". A budget above that makes the choice trivial - everything fits.",
  },
  "entrada.orcamento.custos.planilha.antes": {
    pt: "O custo de cada alternativa vem da linha",
    en: "The cost of each alternative comes from the",
  },
  "entrada.orcamento.custos.planilha.depois": {
    pt: "da planilha - o modelo para baixar já traz essa linha.",
    en: "row of the spreadsheet - the template you can download already has it.",
  },
  "entrada.orcamento.custos.matriz.antes": {
    pt: "O custo de cada alternativa veio da coluna",
    en: "The cost of each alternative came from the",
  },
  "entrada.orcamento.custos.matriz.depois": {
    pt: "do passo dos desempenhos - volte lá para corrigir algum.",
    en: "column in the performances step - go back there to fix any of them.",
  },
});
