/**
 * Catálogo dos painéis e dos resultados: a lista de decisões salvas, o painel
 * de progresso da direita e a leitura do resultado de cada problemática.
 *
 * Três decisões que valem explicação:
 *
 * **Plural em chaves separadas.** Não existe `"{n} resposta(s)"` nem número
 * colado num substantivo solto. A frase inteira está no catálogo nas duas
 * formas (`resumo.resposta.um`, `resumo.resposta.varios`) e o componente
 * escolhe. Montar "1" + "resposta" funciona por acidente em português e quebra
 * na primeira língua com regra diferente.
 *
 * **Posição em inglês não leva ordinal.** O `1º` do português viraria `1st`,
 * `2nd`, `3rd`, `21st` - uma regra de sufixo que não cabe num catálogo. `#1`
 * diz a mesma coisa, é o que produto em inglês usa, e não tem exceção.
 *
 * **Os termos do método mandam.** `scaling constants`, não "weights";
 * `Sorting`, não "classification"; `potentially optimal`, não "possible
 * winners". Quem é da área lê o errado como amadorismo.
 */

import { registrar } from "./index";
import "./nucleo";

export const PAINEIS = registrar({
  // --- resumo de uma decisão: "4 alternativas · 3 critérios · 2 respostas" ---
  // O separador " · " é pontuação, não texto: fica no código.
  "resumo.alternativa.um": { pt: "{n} alternativa", en: "{n} alternative" },
  "resumo.alternativa.varios": { pt: "{n} alternativas", en: "{n} alternatives" },
  "resumo.criterio.um": { pt: "{n} critério", en: "{n} criterion" },
  "resumo.criterio.varios": { pt: "{n} critérios", en: "{n} criteria" },
  "resumo.resposta.um": { pt: "{n} resposta", en: "{n} answer" },
  "resumo.resposta.varios": { pt: "{n} respostas", en: "{n} answers" },

  // --- a lista de decisões salvas, nas duas telas em que ela aparece --------
  "paineis.salvas.titulo": { pt: "Decisões salvas", en: "Saved decisions" },
  "paineis.salvas.fechar": {
    pt: "Fechar a lista de decisões salvas",
    en: "Close the saved decisions list",
  },
  "paineis.salvas.buscar.rotulo": {
    pt: "Buscar decisão pelo nome",
    en: "Search decisions by name",
  },
  "paineis.salvas.buscar.dica": { pt: "Buscar pelo nome", en: "Search by name" },
  "paineis.salvas.filtro.rotulo": {
    pt: "Filtrar por tipo de decisão",
    en: "Filter by decision type",
  },
  "paineis.salvas.filtro.todos": { pt: "Todos", en: "All" },
  "paineis.salvas.carregando": {
    pt: "Procurando decisões salvas…",
    en: "Looking for saved decisions…",
  },
  "paineis.salvas.vazio": {
    pt: "Nenhuma decisão salva ainda.",
    en: "No saved decisions yet.",
  },
  "paineis.salvas.vazio.ajuda": {
    pt: "O que você criar aqui fica guardado e reaparece nesta lista.",
    en: "Anything you create here is stored and comes back in this list.",
  },
  "paineis.salvas.semNome": {
    pt: "Nenhuma decisão com esse nome.",
    en: "No decision by that name.",
  },
  "paineis.salvas.semTipo": {
    pt: "Nenhuma decisão desse tipo.",
    en: "No decision of that type.",
  },
  "paineis.salvas.abertaAgora": { pt: "aberta agora", en: "open now" },
  "paineis.salvas.abrindo": { pt: "abrindo…", en: "opening…" },
  /* A alça que redimensiona o painel. O rótulo vai no `aria-label` e no `title`:
     quem chega pelo teclado precisa saber o que as setas fazem ali. */
  "paineis.salvas.largura.rotulo": {
    pt: "Largura do painel de decisões salvas",
    en: "Saved decisions panel width",
  },

  // --- ordenação da lista ---------------------------------------------------
  "paineis.salvas.ordem.rotulo": {
    pt: "Ordenar as decisões",
    en: "Sort the decisions",
  },
  "paineis.salvas.ordem.recente": { pt: "Recentes", en: "Recent" },
  "paineis.salvas.ordem.recente.ajuda": {
    pt: "As modificadas mais recentemente primeiro",
    en: "Most recently changed first",
  },
  "paineis.salvas.ordem.nome": { pt: "Nome", en: "Name" },
  "paineis.salvas.ordem.nome.ajuda": {
    pt: "Em ordem alfabética",
    en: "In alphabetical order",
  },

  /* Quando a decisão mudou pela última vez, em linguagem de quem fala.
     "min" e "h" são abreviaturas, e abreviatura não tem plural nos dois
     idiomas: uma chave resolve 1 e 40. Já "dia" tem, mas o singular é
     inalcançável - um dia atrás é "ontem" -, então não ganha chave. Passado um
     mês o texto deixa de ser relativo e vira a data mesmo, formatada pelo
     locale: "há 47 dias" não localiza ninguém. */
  "paineis.salvas.quando.agora": { pt: "agora mesmo", en: "just now" },
  "paineis.salvas.quando.min": { pt: "há {n} min", en: "{n} min ago" },
  "paineis.salvas.quando.hora": { pt: "há {n} h", en: "{n} h ago" },
  "paineis.salvas.quando.ontem": { pt: "ontem", en: "yesterday" },
  "paineis.salvas.quando.dias": { pt: "há {n} dias", en: "{n} days ago" },

  // --- a mesma lista na tela de entrada, onde há espaço para explicar mais ---
  "paineis.lista.vazio.ajuda": {
    pt: "As decisões criadas aqui ficam guardadas e reaparecem nesta lista - inclusive as que ficaram no meio das perguntas.",
    en: "Decisions created here are stored and come back in this list - including the ones left halfway through the questions.",
  },
  /* Só aparece com mais de seis decisões na lista, então o singular é
     inalcançável e não tem chave. */
  "paineis.lista.buscar.dica": {
    pt: "Buscar entre {n} decisões",
    en: "Search {n} decisions",
  },

  // --- falhas de rede -------------------------------------------------------
  "paineis.erro.servidor": {
    pt: "Não foi possível falar com o servidor.",
    en: "Could not reach the server.",
  },
  "paineis.erro.abrir": {
    pt: "Não foi possível abrir a decisão.",
    en: "Could not open the decision.",
  },

  // --- painel de progresso: cada problemática conta uma coisa diferente -----
  "progresso.escolha.emDisputa": { pt: "Em disputa", en: "Still in contention" },
  "progresso.ranking.definidas": {
    pt: "Posições definidas",
    en: "Positions settled",
  },
  "progresso.ranking.indefinidas": { pt: "Sem posição", en: "No position yet" },
  "progresso.sorting.definidas": { pt: "Classificadas", en: "Sorted" },
  "progresso.sorting.indefinidas": { pt: "Sem classe", en: "No class yet" },
  "progresso.portfolio.definida": {
    pt: "Carteira definida",
    en: "Portfolio settled",
  },
  "progresso.portfolio.indefinida": {
    pt: "Projetos oscilando",
    en: "Projects in play",
  },
  "progresso.deTotal": { pt: "de {total}", en: "of {total}" },
  "progresso.projeto.um": { pt: "projeto", en: "project" },
  "progresso.projeto.varios": { pt: "projetos", en: "projects" },
  "progresso.barra.rotulo": {
    pt: "Quanto da decisão já se resolveu",
    en: "How much of the decision is settled",
  },
  "progresso.barra.andamento": {
    pt: "Avanço da decisão — não há um número fixo de perguntas.",
    en: "Decision progress — there is no fixed number of questions.",
  },
  "progresso.barra.fim": {
    pt: "Resolvido. As perguntas que sobraram não mudariam o resultado.",
    en: "Settled. The remaining questions would not change the result.",
  },
  "progresso.dica.titulo": {
    pt: "O que este número conta",
    en: "What this number counts",
  },
  "progresso.dica.escolha.podemGanhar": {
    pt: "As alternativas que ainda podem ganhar, dependendo de informação que você não deu.",
    en: "The alternatives that can still win, depending on information you have not given.",
  },
  "progresso.dica.escolha.riscadas": {
    pt: "As riscadas foram descartadas: não existe nenhum conjunto de pesos compatível com suas respostas que as favoreça.",
    en: "The crossed-out ones are ruled out: no set of scaling constants compatible with your answers favors them.",
  },
  "progresso.dica.outras": {
    pt: "Quantas alternativas já têm situação definida nesta leitura. Nenhuma é descartada aqui - todas aparecem no resultado.",
    en: "How many alternatives already have a settled standing in this reading. None is ruled out here - all of them appear in the result.",
  },
  "progresso.desfazer": { pt: "Voltar um passo", en: "Back one step" },
  "progresso.exportar": { pt: "Exportar planilha", en: "Export spreadsheet" },

  // --- resultado: ranking ---------------------------------------------------
  "resultado.ranking.titulo": {
    pt: "Posição de cada alternativa",
    en: "Position of each alternative",
  },
  "resultado.ranking.posicao": { pt: "{n}º", en: "#{n}" },
  "resultado.ranking.posicao.faixa": {
    pt: "{de}º–{ate}º",
    en: "#{de}–#{ate}",
  },
  "resultado.ranking.definida": { pt: "definida", en: "settled" },
  "resultado.ranking.emDisputa": { pt: "em disputa", en: "in contention" },
  "resultado.ranking.pendentes": {
    pt: "Ainda não decidido",
    en: "Not decided yet",
  },
  "resultado.ranking.pendentes.ajuda": {
    pt: "O quanto cada uma pode superar a outra, no cenário mais favorável. Diferença pequena significa que responder mais sobre esse par muda pouco.",
    en: "How far each one can get ahead of the other, in its most favorable scenario. A small difference means answering more about this pair changes little.",
  },
  "resultado.ranking.pendentes.tetoVeto": {
    pt: "Com veto declarado, o número é um teto da vantagem: a real é menor ou igual.",
    en: "With a veto declared, the figure is an upper bound on the advantage: the real one is at most this.",
  },
  "resultado.ranking.par": { pt: "Par", en: "Pair" },
  "resultado.ranking.vantagemMax": {
    pt: "vantagem máx.",
    en: "max. advantage",
  },

  // --- resultado: sorting ---------------------------------------------------
  "resultado.sorting.titulo": { pt: "Classificação", en: "Sorting" },
  "resultado.sorting.alternativa": { pt: "Alternativa", en: "Alternative" },
  "resultado.sorting.classe": { pt: "Classe", en: "Class" },
  "resultado.sorting.valorGlobal": { pt: "Valor global", en: "Global value" },
  /* Junta as classes possíveis de uma alternativa indefinida: "A ou B". */
  "resultado.sorting.ou": { pt: "ou", en: "or" },
  "resultado.sorting.indefinida": { pt: "indefinida", en: "unsettled" },

  // --- resultado: portfolio -------------------------------------------------
  "resultado.portfolio.atencao": { pt: "Atenção:", en: "Note:" },
  "resultado.portfolio.carteiras": {
    pt: "Carteiras possíveis (orçamento {orcamento})",
    en: "Possible portfolios (budget {orcamento})",
  },
  "resultado.portfolio.custo": { pt: "custo {custo}", en: "cost {custo}" },
  // --- a sintese do resultado final ------------------------------------------
  "resultado.final.selo": { pt: "Resultado final", en: "Final result" },
  /* Só o rótulo é traduzido; o corpo da ressalva vem do motor, que é onde mora
     a afirmação sobre como o número foi obtido. */
  "resultado.veto.titulo": {
    pt: "Calculado com veto",
    en: "Computed with a veto",
  },
  "resultado.final.emAndamento": {
    pt: "Resultado parcial",
    en: "Partial result",
  },
  "resultado.final.declaracoes.uma": {
    pt: "1 declaração registrada",
    en: "1 statement on record",
  },
  "resultado.final.declaracoes.varias": {
    pt: "{n} declarações registradas",
    en: "{n} statements on record",
  },
  "resultado.final.aindaAberto": {
    pt: "Ainda dá para responder mais perguntas e estreitar o resultado.",
    en: "You can still answer more questions and narrow the result down.",
  },
  "resultado.insight.titulo": {
    pt: "O que mais os números dizem",
    en: "What else the numbers say",
  },
  /* Cada frase abaixo e uma leitura direta das faixas que a tela ja mostra.
     Nenhuma delas afirma mais do que os numeros sustentam. */
  "resultado.insight.margem": {
    pt: "{vencedor} vence em qualquer conjunto de pesos compatível com suas respostas: no cenário mais desfavorável a ela ainda vale {pior}, acima do melhor cenário de qualquer rival ({teto}).",
    en: "{vencedor} wins under every set of scaling constants compatible with your answers: in its worst case it is still worth {pior}, above the best case of any rival ({teto}).",
  },
  "resultado.insight.faixaAberta": {
    pt: "O vencedor está definido, o número não: o valor global de {vencedor} pode estar em qualquer ponto entre {de} e {ate}. Mais respostas estreitam essa faixa sem mudar quem ganha.",
    en: "The winner is settled, the number is not: the overall value of {vencedor} may sit anywhere between {de} and {ate}. More answers narrow that range without changing who wins.",
  },
  "resultado.insight.decisivo": {
    pt: "{criterio} é o critério que decide: pesa pelo menos {piso} em qualquer cenário compatível, e pode chegar a {teto}.",
    en: "{criterio} is the criterion that decides: it weighs at least {piso} under every compatible scenario, and may reach {teto}.",
  },
  "resultado.insight.poucoPeso.um": {
    pt: "{criterios} pesa menos que a fatia igual ({fatia}) em qualquer cenário compatível — corrigir esse dado dificilmente mudaria o resultado.",
    en: "{criterios} weighs less than an equal share ({fatia}) under every compatible scenario — fixing that figure would hardly change the result.",
  },
  "resultado.insight.poucoPeso.varios": {
    pt: "{criterios} pesam menos que a fatia igual ({fatia}) em qualquer cenário compatível — corrigir esses dados dificilmente mudaria o resultado.",
    en: "{criterios} weigh less than an equal share ({fatia}) under every compatible scenario — fixing those figures would hardly change the result.",
  },
  "resultado.insight.trocaFeita": {
    pt: "A troca que você aceitou: {vencedor} é a melhor em {ganha}, e a pior em {perde}.",
    en: "The trade you accepted: {vencedor} is the best on {ganha}, and the worst on {perde}.",
  },
  "resultado.insight.ganha": {
    pt: "{vencedor} é a melhor alternativa em {ganha}, e não é a pior em nenhum critério.",
    en: "{vencedor} is the best alternative on {ganha}, and the worst on none.",
  },
  "resultado.insight.perde": {
    pt: "Vale saber: {vencedor} é a pior alternativa em {perde}. Ela ganha pelo conjunto, não por esse critério.",
    en: "Worth knowing: {vencedor} is the worst alternative on {perde}. It wins on the whole, not on that criterion.",
  },
  "resultado.insight.descarte.semPergunta": {
    pt: "{descartadas} das {total} alternativas caíram só com a ordenação dos critérios, sem nenhuma pergunta de tradeoff.",
    en: "{descartadas} of the {total} alternatives dropped out from the criteria ranking alone, with no tradeoff question.",
  },
  "resultado.insight.descarte.uma": {
    pt: "{descartadas} das {total} alternativas foram descartadas com a ordenação dos critérios e 1 resposta de tradeoff.",
    en: "{descartadas} of the {total} alternatives were ruled out with the criteria ranking and 1 tradeoff answer.",
  },
  "resultado.insight.descarte.varias": {
    pt: "{descartadas} das {total} alternativas foram descartadas com a ordenação dos critérios e {respostas} respostas de tradeoff — é o que o método chama de decidir com informação parcial.",
    en: "{descartadas} of the {total} alternatives were ruled out with the criteria ranking and {respostas} tradeoff answers — this is what the method calls deciding on partial information.",
  },

  "resultado.razao.titulo": {
    pt: "Razão entre benefício e custo",
    en: "Benefit-to-cost ratio",
  },
  "resultado.razao.explicacao": {
    pt: "Cada faixa é exata: o custo é constante e o valor é linear nos pesos, então os extremos saem por programação linear.",
    en: "Each range is exact: cost is constant and value is linear in the scaling constants, so the bounds come from linear programming.",
  },
  "resultado.razao.projeto": { pt: "Projeto", en: "Project" },
  "resultado.razao.custo": { pt: "Custo", en: "Cost" },
  "resultado.razao.faixa": { pt: "Faixa de razão", en: "Ratio range" },
  "resultado.razao.dominancia": {
    pt: "Dominância por razão",
    en: "Dominance by ratio",
  },
  "resultado.razao.domina": {
    pt: "{dominante} domina {dominado}: as faixas não se sobrepõem",
    en: "{dominante} dominates {dominado}: the ranges do not overlap",
  },
  "resultado.portfolio.sempre": {
    pt: "Sempre selecionados",
    en: "Always selected",
  },
  "resultado.portfolio.oscilam": { pt: "Oscilam", en: "Sometimes selected" },
  "resultado.portfolio.nunca": {
    pt: "Nunca selecionados",
    en: "Never selected",
  },

  // --- resultado: escolha ---------------------------------------------------
  "resultado.escolha.dominancia": {
    pt: "Relações de dominância",
    en: "Dominance relations",
  },
});
