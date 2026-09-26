/**
 * Catálogo da tela de paridade.
 *
 * O texto aqui fala com quem precisa **confiar** no resultado: orientador,
 * banca, alguém decidindo se adota a ferramenta. Por isso nomeia o sistema de
 * referência e a versão, diz como a medição foi feita, e não esconde as duas
 * divergências que restam — uma comparação que só mostra o que deu certo não
 * serve como argumento.
 */

import { registrar } from "./index";
import "./nucleo";

export const PARIDADE_TEXTOS = registrar({
  "nav.paridade": { pt: "Paridade", en: "Parity" },

  "paridade.titulo": {
    pt: "Equivalência com o sistema oficial",
    en: "Equivalence with the official system",
  },
  "paridade.subtitulo": {
    pt: "Os mesmos problemas rodados aqui e no FITradeoff do CDSID/UFPE, pergunta a pergunta.",
    en: "The same problems run here and on CDSID/UFPE's FITradeoff, question by question.",
  },
  "paridade.medidoEm": { pt: "medido em {data}", en: "measured on {data}" },
  "paridade.versaoOficial": {
    pt: "Sistema de referência: FU-T3MMM-WF1a",
    en: "Reference system: FU-T3MMM-WF1a",
  },

  "paridade.placar": {
    pt: "{bate} de {total} casos batem",
    en: "{bate} of {total} cases match",
  },
  "paridade.placar.detalhe": {
    pt: "Mesmo número de perguntas nas duas fases: ordenação das constantes de escala e elicitação por decomposição.",
    en: "Same number of questions in both phases: ranking of scaling constants and elicitation by decomposition.",
  },
  "paridade.placar.travados": {
    pt: "Em {n} caso o sistema oficial não completa.",
    en: "In {n} case the official system does not complete.",
  },
  "paridade.placar.travadosVarios": {
    pt: "Em {n} casos o sistema oficial não completa.",
    en: "In {n} cases the official system does not complete.",
  },
  "paridade.maior": {
    pt: "Maior problema testado: {n} alternativas.",
    en: "Largest problem tested: {n} alternatives.",
  },

  "paridade.metodo.titulo": { pt: "Como a medição é feita", en: "How it is measured" },
  "paridade.metodo.corpo1": {
    pt: "Cada caso é cadastrado nos dois sistemas com as mesmas alternativas, os mesmos critérios e a mesma matriz — e respondido com a mesma política: sempre a opção A.",
    en: "Each case is entered into both systems with the same alternatives, criteria and performance matrix — and answered with the same policy: always option A.",
  },
  "paridade.metodo.corpo2": {
    pt: "A política fixa não é a resposta de um decisor real. É a única forma de o percurso ser reproduzível dos dois lados: o que se verifica não é se a recomendação está certa, e sim se os dois sistemas fazem as mesmas perguntas e chegam ao mesmo lugar.",
    en: "The fixed policy is not a real decision maker's answer. It is the only way to make the run reproducible on both sides: what is checked is not whether the recommendation is right, but whether both systems ask the same questions and arrive at the same place.",
  },
  "paridade.metodo.corpo3": {
    pt: "Dois parâmetros são igualados de propósito: função de valor linear em todos os critérios, e limiar de equivalência em 0,01, que é o padrão dele.",
    en: "Two parameters are matched on purpose: linear value function on every criterion, and equivalence threshold at 0.01, which is its default.",
  },

  "paridade.tabela.titulo": { pt: "Caso a caso", en: "Case by case" },
  "paridade.tabela.caso": { pt: "Caso", en: "Case" },
  "paridade.tabela.tamanho": { pt: "Alt × Crit", en: "Alt × Crit" },
  "paridade.tabela.oficial": { pt: "Oficial", en: "Official" },
  "paridade.tabela.nosso": { pt: "Nosso", en: "Ours" },
  "paridade.tabela.legenda": {
    pt: "Ordenação / tradeoff — o número de perguntas em cada fase.",
    en: "Ranking / tradeoff — the number of questions in each phase.",
  },
  "paridade.tabela.bate": { pt: "bate", en: "match" },
  "paridade.tabela.difere": { pt: "difere", en: "differs" },
  "paridade.tabela.trava": { pt: "não completa", en: "does not complete" },

  "paridade.telas.titulo": { pt: "As mesmas telas", en: "The same screens" },
  "paridade.telas.corpo": {
    pt: "O fluxo é o mesmo: escolher o módulo, cadastrar, preencher a matriz, declarar a função de valor, ordenar as constantes de escala, responder os tradeoffs.",
    en: "The flow is the same: pick the module, register, fill the matrix, declare the value function, rank the scaling constants, answer the tradeoffs.",
  },
  "paridade.telas.matriz": { pt: "Matriz de desempenhos", en: "Performance matrix" },
  "paridade.telas.matriz.nota": {
    pt: "Lá os critérios são C1, C2, C3, com uma tabela de apoio dizendo qual é qual; aqui o nome e a direção ficam no cabeçalho, e dá para colar a tabela do Excel.",
    en: "There the criteria are C1, C2, C3, with a side table saying which is which; here the name and direction sit in the header, and you can paste the table from Excel.",
  },
  "paridade.telas.ordenacao": {
    pt: "Ordenação das constantes de escala",
    en: "Ranking of the scaling constants",
  },
  "paridade.telas.ordenacao.nota": {
    pt: "Comparação par a par, com a faixa de cada critério desenhada. É o mesmo par, no mesmo ponto, nos dois sistemas.",
    en: "Pairwise comparison, with each criterion's range drawn. Same pair, same point, in both systems.",
  },
  "paridade.telas.tradeoff": { pt: "Pergunta de tradeoff", en: "Tradeoff question" },
  "paridade.telas.tradeoff.nota": {
    pt: "Duas consequências hipotéticas, ambas ruins em quase tudo. Marcamos o que é idêntico nas duas situações, para que a comparação seja só sobre o que muda.",
    en: "Two hypothetical consequences, both bad at almost everything. We mark what is identical in both, so the comparison is only about what changes.",
  },
  "paridade.telas.oficialLegenda": { pt: "Oficial", en: "Official" },
  "paridade.telas.nossoLegenda": { pt: "Nossa", en: "Ours" },

  "paridade.achados.titulo": {
    pt: "O que a comparação encontrou",
    en: "What the comparison found",
  },
  "paridade.achados.intro": {
    pt: "Três divergências de método. Nas três, as perguntas iniciais eram idênticas e a diferença estava em quando cada sistema para. As correções valem para a maioria dos casos, mas não fecham tudo — cada uma foi medida contra a instância em que a divergência apareceu, e casos novos mostraram que a regra não generaliza por completo.",
    en: "Three methodological divergences. In all three the initial questions were identical and the difference was in when each system stops. The fixes hold for most cases but do not close everything — each was measured against the instance where the divergence showed up, and new cases showed the rule does not fully generalise.",
  },
  "paridade.achados.abertura.titulo": {
    pt: "A pergunta de abertura",
    en: "The opening question",
  },
  "paridade.achados.abertura.corpo": {
    pt: "O oficial abre confrontando o critério mais importante com o menos importante, e só depois refina par a par. Nós só perguntávamos sobre pares consecutivos — sempre uma pergunta a menos.",
    en: "The official opens by pitting the most important criterion against the least important, and only then refines pair by pair. We only asked about consecutive pairs — always one question fewer.",
  },
  "paridade.achados.limiar.titulo": {
    pt: "O limiar de equivalência",
    en: "The equivalence threshold",
  },
  "paridade.achados.limiar.corpo": {
    pt: "Ele declara dominância quando a desvantagem máxima cabe no limiar. Medido num caso de 12 alternativas: 0,0092 abaixo de 0,01. Nós exigíamos vantagem até a última casa e gastávamos quatro perguntas atrás de uma diferença que ninguém sente.",
    en: "It declares dominance when the maximum disadvantage fits within the threshold. Measured on a 12-alternative case: 0.0092 below 0.01. We required an advantage down to the last decimal, spending four extra questions chasing a difference nobody feels.",
  },
  "paridade.achados.sorting.titulo": {
    pt: "A classificação decide pela largura",
    en: "Sorting decides by range width",
  },
  "paridade.achados.sorting.corpo": {
    pt: "Não é a profundidade com que a faixa atravessa o corte, é a largura da faixa. Se o valor global não pode mais ser fixado com precisão melhor que o limiar, nenhuma pergunta futura decide de que lado a alternativa está.",
    en: "It is not how deep the range crosses the cut, it is how wide the range is. If the global value can no longer be pinned more precisely than the threshold, no future question decides which side the alternative falls on.",
  },

  "paridade.restam.titulo": {
    pt: "O que permanece diferente",
    en: "What is still different",
  },
  "paridade.restam.instancias.titulo": {
    pt: "Ranking e classificação: uma instância cada",
    en: "Ranking and sorting: one instance each",
  },
  "paridade.restam.instancias.corpo": {
    pt: "Num caso de 20 alternativas o ranking fica em 22 perguntas contra 21 dele; numa classificação de 6, em 22 contra 18. São as mesmas problemáticas já corrigidas, divergindo em instâncias diferentes das que serviram de medida. Nos dois o desfecho é o mesmo — ordem completa de um lado e do outro, classificação completa de um lado e do outro.",
    en: "In one 20-alternative case the ranking takes 22 questions against its 21; in a 6-alternative sorting, 22 against 18. These are the same problematics already fixed, diverging on instances other than the ones used as the measure. In both the outcome is the same — a complete order on both sides, a complete sorting on both sides.",
  },
  "paridade.restam.bc.titulo": {
    pt: "Benefício-custo: mesma carteira, menos perguntas",
    en: "Benefit-to-cost: same portfolio, fewer questions",
  },
  "paridade.restam.bc.corpo": {
    pt: "A carteira é a mesma, conferida projeto a projeto — inclusive com 20 projetos e mais de um milhão de subconjuntos possíveis. A nossa parada dispara quando a carteira está definida; ele continua. Cinco hipóteses foram testadas para explicar o ponto em que ele para, e todas foram refutadas. Forçar mais perguntas do nosso lado não muda a carteira.",
    en: "The portfolio is the same, checked project by project — including with 20 projects and over a million possible subsets. Our stop fires once the portfolio is settled; it keeps going. Five hypotheses were tested to explain where it stops, and all were refuted. Forcing more questions on our side does not change the portfolio.",
  },
  "paridade.restam.carteira.titulo": {
    pt: "Portfólio combinatorial: não comparável em sessão",
    en: "Combinatorial portfolio: not comparable in session",
  },
  "paridade.restam.carteira.corpo": {
    pt: "Esse módulo roda num sistema separado e, depois da matriz, entra num processamento assíncrono que avisa por e-mail. Ele enumera carteiras offline; nós aproximamos por amostragem e respondemos na hora. É diferença de arquitetura, não de configuração.",
    en: "That module runs on a separate system and, after the matrix, enters an asynchronous job that notifies by e-mail. It enumerates portfolios offline; we approximate by sampling and answer immediately. That is an architectural difference, not a configuration one.",
  },
  "paridade.restam.degenerado.titulo": {
    pt: "Onde o oficial não completa",
    en: "Where the official does not complete",
  },
  "paridade.restam.degenerado.corpo": {
    pt: "Com todas as alternativas idênticas, todo critério tem faixa zero e a elicitação da função valor não tem o que fazer: ele trava. Nós respondemos que as alternativas ficaram equivalentes dentro do limiar, e que qualquer uma serve.",
    en: "With all alternatives identical, every criterion has zero range and the value function elicitation has nothing to work with: it hangs. We answer that the alternatives are equivalent within the threshold, and any of them will do.",
  },

  "paridade.reproduzir.titulo": { pt: "Refazer a medição", en: "Reproducing this" },
  "paridade.reproduzir.corpo": {
    pt: "Os casos, o roteiro de automação e os resultados brutos estão no repositório, em paridade/. A tela lê um arquivo gerado a partir deles — quem duvidar roda de novo e confere.",
    en: "The cases, the automation script and the raw results are in the repository, under paridade/. This screen reads a file generated from them — anyone who doubts it can re-run and check.",
  },
});
