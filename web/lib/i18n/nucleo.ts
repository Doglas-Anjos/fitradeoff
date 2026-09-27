/**
 * Catálogo do núcleo: navegação, rótulos do método e ações que aparecem em
 * toda tela.
 *
 * Os nomes das problemáticas seguem a literatura em inglês, não a tradução
 * literal do português. Quem pesquisa a área procura por `Sorting` e
 * `Portfolio`; "Classification" e "Basket" seriam invenção nossa.
 */

import { registrar } from "./index";

export const NUCLEO = registrar({
  "nav.decisao": { pt: "Decisão", en: "Decision" },
  "nav.chat": { pt: "Chat", en: "Chat" },
  "nav.sobre": { pt: "Sobre o método", en: "About the method" },
  "nav.sobre.titulo": {
    pt: "Site oficial do método, no CDSID/UFPE",
    en: "Official site of the method, at CDSID/UFPE",
  },
  "nav.abreEmOutraAba": {
    pt: "(abre em outra aba)",
    en: "(opens in a new tab)",
  },
  "nav.idioma": { pt: "Idioma", en: "Language" },
  "nav.menu.abrir": { pt: "Abrir menu", en: "Open menu" },
  "nav.menu.fechar": { pt: "Fechar menu", en: "Close menu" },
  "nav.menu.rotulo": { pt: "Navegação", en: "Navigation" },

  // --- as problemáticas, nos termos da literatura ---------------------------
  /* Os nomes seguem o sistema de referencia, nao a traducao mais natural.
     "Montar carteira" descrevia melhor a acao, mas quem chega de um artigo ou
     do sistema oficial procura por "Portfolio (Combinatorial)" -- e quem usa os
     dois lado a lado precisa reconhecer o mesmo modulo nos dois. O ingles das
     variantes de carteira fica em ingles tambem em portugues, como la. */
  "problematica.escolha": { pt: "Escolha", en: "Choice" },
  "problematica.escolha.ajuda": {
    pt: "Termina com uma alternativa recomendada.",
    en: "Ends with one recommended alternative.",
  },
  "problematica.ranking": { pt: "Ordenação", en: "Ranking" },
  "problematica.ranking.ajuda": {
    pt: "Do primeiro ao último, ou faixas de posição.",
    en: "From first to last, or ranges of position.",
  },
  "problematica.sorting": { pt: "Classificação", en: "Sorting" },
  "problematica.sorting.ajuda": {
    pt: "Aloca em classes que você define.",
    en: "Assigns to classes you define.",
  },
  "problematica.portfolio": {
    pt: "Portfólio (Combinatorial)",
    en: "Portfolio (Combinatorial)",
  },
  "problematica.portfolio.ajuda": {
    pt: "Procura o subconjunto de maior valor que cabe no orçamento.",
    en: "Looks for the highest-value subset that fits the budget.",
  },

  /* O helper que no sistema de referencia fica ao lado da caixa de carteira.
     O texto e nosso: a tela oficial que o traz exige criar um problema la
     dentro para ser alcancada, entao ele foi escrito a partir do que as duas
     leituras fazem -- e e o que o nosso motor implementa. */
  "problematica.carteira.grupo": { pt: "Portfólio", en: "Portfolio" },
  "problematica.carteira.dica.titulo": {
    pt: "Qual das duas carteiras",
    en: "Which of the two portfolios",
  },
  "problematica.carteira.dica.combinatorial": {
    pt: "Combinatorial procura o subconjunto de maior valor agregado que cabe no orçamento. É a leitura certa quando os projetos competem pelo mesmo dinheiro e o que importa é o total levado.",
    en: "Combinatorial looks for the subset with the highest aggregate value that fits the budget. It is the right reading when projects compete for the same money and what matters is the total taken.",
  },
  "problematica.carteira.dica.razao": {
    pt: "Benefit-to-Cost ordena os projetos pela razão entre benefício e custo e desce a lista enquanto o orçamento permitir. É a leitura certa quando o que importa é o retorno por unidade gasta.",
    en: "Benefit-to-Cost ranks projects by the ratio of benefit to cost and works down the list while the budget allows. It is the right reading when what matters is the return per unit spent.",
  },
  "problematica.carteira.dica.comum": {
    pt: "As duas pedem os mesmos dados — custo por alternativa e um teto de orçamento — e as duas devolvem resultado aproximado, por amostragem do espaço de pesos.",
    en: "Both ask for the same data — a cost per alternative and a budget ceiling — and both return an approximate result, by sampling the space of scaling constants.",
  },

  /* O quinto modulo do sistema de referencia. Em ingles mantem o nome que a
     literatura usa, como os outros quatro. */
  "problematica.beneficio_custo": {
    pt: "Portfólio (Benefit-to-Cost)",
    en: "Portfolio (Benefit-to-Cost)",
  },
  "problematica.beneficio_custo.ajuda": {
    pt: "Ordena pela razão entre benefício e custo e desce a lista enquanto o orçamento permitir.",
    en: "Ranks by the ratio of benefit to cost and works down the list while the budget allows.",
  },

  // --- rótulos curtos, para selos e filtros ---------------------------------
  "problematica.curto.escolha": { pt: "Escolha", en: "Choice" },
  "problematica.curto.ranking": { pt: "Ranking", en: "Ranking" },
  "problematica.curto.sorting": { pt: "Classificação", en: "Sorting" },
  "problematica.curto.portfolio": { pt: "Combinatorial", en: "Combinatorial" },
  "problematica.curto.beneficio_custo": {
    pt: "Benefit-to-Cost",
    en: "Benefit-to-Cost",
  },

  // --- ações recorrentes ----------------------------------------------------
  "acao.voltar": { pt: "Voltar", en: "Back" },
  "acao.cancelar": { pt: "Cancelar", en: "Cancel" },
  "acao.continuar": { pt: "Continuar", en: "Continue" },
  "acao.editar": { pt: "Editar", en: "Edit" },
  "acao.excluir": { pt: "Excluir", en: "Delete" },
  "acao.adicionar": { pt: "Adicionar", en: "Add" },
  "acao.buscar": { pt: "Buscar", en: "Search" },
  "acao.fechar": { pt: "Fechar", en: "Close" },

  // peças compartilhadas: dica, modal
  "ui.dica.abrir": { pt: "O que é {assunto}", en: "What is {assunto}" },

  // o único texto dentro dos diagramas dos objetivos

  // --- vocabulário do método ------------------------------------------------
  "termo.alternativa": { pt: "alternativa", en: "alternative" },
  "termo.alternativas": { pt: "alternativas", en: "alternatives" },
  "termo.criterio": { pt: "critério", en: "criterion" },
  "termo.criterios": { pt: "critérios", en: "criteria" },
  "termo.maximizacao": { pt: "maximização", en: "maximization" },
  "termo.minimizacao": { pt: "minimização", en: "minimization" },
  "termo.maiorMelhor": { pt: "maior é melhor", en: "higher is better" },
  "termo.menorMelhor": { pt: "menor é melhor", en: "lower is better" },
});
