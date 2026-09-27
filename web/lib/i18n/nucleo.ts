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
  "nav.decisao": { pt: "Decisão", en: "Decision", es: "Decisión" },
  /* "Conectar", e não "Chaves": neste produto "chave" já é a chave de um
     critério, e o mesmo rótulo para as duas coisas manda a pessoa ao lugar
     errado. O título da tela diz que chaves são o meio. */
  "nav.chaves": { pt: "Conectar", en: "Connect", es: "Conectar" },
  "nav.sobre": { pt: "Sobre o método", en: "About the method", es: "Acerca del método" },
  "nav.sobre.titulo": {
    pt: "Site oficial do método, no CDSID/UFPE",
    en: "Official site of the method, at CDSID/UFPE",
    es: "Sitio oficial del método, en el CDSID/UFPE",
  },
  "nav.abreEmOutraAba": {
    pt: "(abre em outra aba)",
    en: "(opens in a new tab)",
    es: "(se abre en otra pestaña)",
  },
  "nav.idioma": { pt: "Idioma", en: "Language", es: "Idioma" },
  "nav.tema": { pt: "Tema", en: "Theme", es: "Tema" },
  "nav.tema.sistema": { pt: "Seguir o sistema", en: "Follow the system", es: "Seguir el sistema" },
  "nav.tema.claro": { pt: "Claro", en: "Light", es: "Claro" },
  "nav.tema.escuro": { pt: "Escuro", en: "Dark", es: "Oscuro" },
  "nav.menu.abrir": { pt: "Abrir menu", en: "Open menu", es: "Abrir menú" },
  "nav.menu.fechar": { pt: "Fechar menu", en: "Close menu", es: "Cerrar menú" },
  "nav.menu.rotulo": { pt: "Navegação", en: "Navigation", es: "Navegación" },

  // --- as problemáticas, nos termos da literatura ---------------------------
  /* Os nomes seguem o sistema de referencia, nao a traducao mais natural.
     "Montar carteira" descrevia melhor a acao, mas quem chega de um artigo ou
     do sistema oficial procura por "Portfolio (Combinatorial)" -- e quem usa os
     dois lado a lado precisa reconhecer o mesmo modulo nos dois. O ingles das
     variantes de carteira fica em ingles tambem em portugues e espanhol, como la. */
  "problematica.escolha": { pt: "Escolha", en: "Choice", es: "Elección" },
  "problematica.escolha.ajuda": {
    pt: "Termina com uma alternativa recomendada.",
    en: "Ends with one recommended alternative.",
    es: "Termina con una alternativa recomendada.",
  },
  "problematica.ranking": { pt: "Ordenação", en: "Ranking", es: "Ordenación" },
  "problematica.ranking.ajuda": {
    pt: "Do primeiro ao último, ou faixas de posição.",
    en: "From first to last, or ranges of position.",
    es: "Del primero al último, o rangos de posición.",
  },
  "problematica.sorting": { pt: "Classificação", en: "Sorting", es: "Clasificación" },
  "problematica.sorting.ajuda": {
    pt: "Aloca em classes que você define.",
    en: "Assigns to classes you define.",
    es: "Asigna a clases que usted define.",
  },
  "problematica.portfolio": {
    pt: "Portfólio (Combinatorial)",
    en: "Portfolio (Combinatorial)",
    es: "Portafolio (Combinatorial)",
  },
  "problematica.portfolio.ajuda": {
    pt: "Procura o subconjunto de maior valor que cabe no orçamento.",
    en: "Looks for the highest-value subset that fits the budget.",
    es: "Busca el subconjunto de mayor valor que cabe en el presupuesto.",
  },

  /* O helper que no sistema de referencia fica ao lado da caixa de carteira.
     O texto e nosso: a tela oficial que o traz exige criar um problema la
     dentro para ser alcancada, entao ele foi escrito a partir do que as duas
     leituras fazem -- e e o que o nosso motor implementa. */
  "problematica.carteira.grupo": { pt: "Portfólio", en: "Portfolio", es: "Portafolio" },
  "problematica.carteira.dica.titulo": {
    pt: "Qual das duas carteiras",
    en: "Which of the two portfolios",
    es: "Cuál de los dos portafolios",
  },
  "problematica.carteira.dica.combinatorial": {
    pt: "Combinatorial procura o subconjunto de maior valor agregado que cabe no orçamento. É a leitura certa quando os projetos competem pelo mesmo dinheiro e o que importa é o total levado.",
    en: "Combinatorial looks for the subset with the highest aggregate value that fits the budget. It is the right reading when projects compete for the same money and what matters is the total taken.",
    es: "Combinatorial busca el subconjunto de mayor valor agregado que cabe en el presupuesto. Es la lectura correcta cuando los proyectos compiten por el mismo dinero y lo que importa es el total llevado.",
  },
  "problematica.carteira.dica.razao": {
    pt: "Benefit-to-Cost ordena os projetos pela razão entre benefício e custo e desce a lista enquanto o orçamento permitir. É a leitura certa quando o que importa é o retorno por unidade gasta.",
    en: "Benefit-to-Cost ranks projects by the ratio of benefit to cost and works down the list while the budget allows. It is the right reading when what matters is the return per unit spent.",
    es: "Benefit-to-Cost ordena los proyectos según la razón entre beneficio y costo y recorre la lista mientras el presupuesto lo permita. Es la lectura correcta cuando lo que importa es el retorno por unidad gastada.",
  },
  "problematica.carteira.dica.comum": {
    pt: "As duas pedem os mesmos dados — custo por alternativa e um teto de orçamento — e as duas devolvem resultado aproximado, por amostragem do espaço de pesos.",
    en: "Both ask for the same data — a cost per alternative and a budget ceiling — and both return an approximate result, by sampling the space of scaling constants.",
    es: "Las dos piden los mismos datos — costo por alternativa y un techo de presupuesto — y las dos devuelven un resultado aproximado, por muestreo del espacio de las constantes de escala.",
  },

  /* O quinto modulo do sistema de referencia. Em ingles mantem o nome que a
     literatura usa, como os outros quatro. */
  "problematica.beneficio_custo": {
    pt: "Portfólio (Benefit-to-Cost)",
    en: "Portfolio (Benefit-to-Cost)",
    es: "Portafolio (Benefit-to-Cost)",
  },
  "problematica.beneficio_custo.ajuda": {
    pt: "Ordena pela razão entre benefício e custo e desce a lista enquanto o orçamento permitir.",
    en: "Ranks by the ratio of benefit to cost and works down the list while the budget allows.",
    es: "Ordena según la razón entre beneficio y costo y recorre la lista mientras el presupuesto lo permita.",
  },

  // --- rótulos curtos, para selos e filtros ---------------------------------
  "problematica.curto.escolha": { pt: "Escolha", en: "Choice", es: "Elección" },
  "problematica.curto.ranking": { pt: "Ranking", en: "Ranking", es: "Ranking" },
  "problematica.curto.sorting": { pt: "Classificação", en: "Sorting", es: "Clasificación" },
  "problematica.curto.portfolio": { pt: "Combinatorial", en: "Combinatorial", es: "Combinatorial" },
  "problematica.curto.beneficio_custo": {
    pt: "Benefit-to-Cost",
    en: "Benefit-to-Cost",
    es: "Benefit-to-Cost",
  },

  // --- ações recorrentes ----------------------------------------------------
  "acao.voltar": { pt: "Voltar", en: "Back", es: "Volver" },
  "acao.cancelar": { pt: "Cancelar", en: "Cancel", es: "Cancelar" },
  "acao.continuar": { pt: "Continuar", en: "Continue", es: "Continuar" },
  "acao.editar": { pt: "Editar", en: "Edit", es: "Editar" },
  "acao.excluir": { pt: "Excluir", en: "Delete", es: "Eliminar" },
  "acao.adicionar": { pt: "Adicionar", en: "Add", es: "Agregar" },
  "acao.buscar": { pt: "Buscar", en: "Search", es: "Buscar" },
  "acao.fechar": { pt: "Fechar", en: "Close", es: "Cerrar" },

  // peças compartilhadas: dica, modal
  "ui.dica.abrir": { pt: "O que é {assunto}", en: "What is {assunto}", es: "Qué es {assunto}" },

  // o único texto dentro dos diagramas dos objetivos

  // --- vocabulário do método ------------------------------------------------
  "termo.alternativa": { pt: "alternativa", en: "alternative", es: "alternativa" },
  "termo.alternativas": { pt: "alternativas", en: "alternatives", es: "alternativas" },
  "termo.criterio": { pt: "critério", en: "criterion", es: "criterio" },
  "termo.criterios": { pt: "critérios", en: "criteria", es: "criterios" },
  "termo.maximizacao": { pt: "maximização", en: "maximization", es: "maximización" },
  "termo.minimizacao": { pt: "minimização", en: "minimization", es: "minimización" },
  "termo.maiorMelhor": { pt: "maior é melhor", en: "higher is better", es: "mayor es mejor" },
  "termo.menorMelhor": { pt: "menor é melhor", en: "lower is better", es: "menor es mejor" },
});
