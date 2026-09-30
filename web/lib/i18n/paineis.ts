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
  "resumo.alternativa.um": { pt: "{n} alternativa", en: "{n} alternative", es: "{n} alternativa" },
  "resumo.alternativa.varios": { pt: "{n} alternativas", en: "{n} alternatives", es: "{n} alternativas" },
  "resumo.criterio.um": { pt: "{n} critério", en: "{n} criterion", es: "{n} criterio" },
  "resumo.criterio.varios": { pt: "{n} critérios", en: "{n} criteria", es: "{n} criterios" },
  "resumo.resposta.um": { pt: "{n} resposta", en: "{n} answer", es: "{n} respuesta" },
  "resumo.resposta.varios": { pt: "{n} respostas", en: "{n} answers", es: "{n} respuestas" },

  // --- a lista de decisões salvas, nas duas telas em que ela aparece --------
  "paineis.salvas.titulo": { pt: "Decisões salvas", en: "Saved decisions", es: "Decisiones guardadas" },
  "paineis.salvas.fechar": {
    pt: "Fechar a lista de decisões salvas",
    en: "Close the saved decisions list",
    es: "Cerrar la lista de decisiones guardadas",
  },
  "paineis.salvas.buscar.rotulo": {
    pt: "Buscar decisão pelo nome",
    en: "Search decisions by name",
    es: "Buscar decisión por nombre",
  },
  "paineis.salvas.buscar.dica": { pt: "Buscar pelo nome", en: "Search by name", es: "Buscar por nombre" },
  "paineis.salvas.filtro.rotulo": {
    pt: "Filtrar por tipo de decisão",
    en: "Filter by decision type",
    es: "Filtrar por tipo de decisión",
  },
  "paineis.salvas.filtro.todos": { pt: "Todos", en: "All", es: "Todos" },
  "paineis.salvas.carregando": {
    pt: "Procurando decisões salvas…",
    en: "Looking for saved decisions…",
    es: "Buscando decisiones guardadas…",
  },
  "paineis.salvas.vazio": {
    pt: "Nenhuma decisão salva ainda.",
    en: "No saved decisions yet.",
    es: "Todavía no hay decisiones guardadas.",
  },
  "paineis.salvas.vazio.ajuda": {
    pt: "O que você criar aqui fica guardado e reaparece nesta lista.",
    en: "Anything you create here is stored and comes back in this list.",
    es: "Lo que usted cree aquí queda guardado y reaparece en esta lista.",
  },
  "paineis.salvas.semNome": {
    pt: "Nenhuma decisão com esse nome.",
    en: "No decision by that name.",
    es: "Ninguna decisión con ese nombre.",
  },
  "paineis.salvas.semTipo": {
    pt: "Nenhuma decisão desse tipo.",
    en: "No decision of that type.",
    es: "Ninguna decisión de ese tipo.",
  },
  "paineis.salvas.abertaAgora": { pt: "aberta agora", en: "open now", es: "abierta ahora" },
  "paineis.salvas.abrindo": { pt: "abrindo…", en: "opening…", es: "abriendo…" },

  /* A estrela de favorita. O rótulo acessível não muda com o estado - quem
     anuncia isso é o `aria-pressed` -, mas traz o nome da decisão: numa lista
     de vinte itens, vinte botões chamados "Favorita" não distinguem nada.
     A dica explica a consequência, que é o que faz alguém querer clicar. */
  "paineis.salvas.favorita.rotulo": {
    pt: "Favorita: {nome}",
    en: "Favorite: {nome}",
    es: "Favorita: {nome}",
  },
  "paineis.salvas.favorita.dica": {
    pt: "Favoritas aparecem no topo da lista",
    en: "Favorites appear at the top of the list",
    es: "Las favoritas aparecen en el tope de la lista",
  },
  /* A alça que redimensiona o painel. O rótulo vai no `aria-label` e no `title`:
     quem chega pelo teclado precisa saber o que as setas fazem ali. */
  "paineis.salvas.largura.rotulo": {
    pt: "Largura do painel de decisões salvas",
    en: "Saved decisions panel width",
    es: "Ancho del panel de decisiones guardadas",
  },

  // --- ordenação da lista ---------------------------------------------------
  "paineis.salvas.ordem.rotulo": {
    pt: "Ordenar as decisões",
    en: "Sort the decisions",
    es: "Ordenar las decisiones",
  },
  "paineis.salvas.ordem.recente": { pt: "Recentes", en: "Recent", es: "Recientes" },
  "paineis.salvas.ordem.recente.ajuda": {
    pt: "As modificadas mais recentemente primeiro",
    en: "Most recently changed first",
    es: "Las modificadas más recientemente primero",
  },
  "paineis.salvas.ordem.nome": { pt: "Nome", en: "Name", es: "Nombre" },
  "paineis.salvas.ordem.nome.ajuda": {
    pt: "Em ordem alfabética",
    en: "In alphabetical order",
    es: "En orden alfabético",
  },

  /* Quando a decisão mudou pela última vez, em linguagem de quem fala.
     "min" e "h" são abreviaturas, e abreviatura não tem plural em nenhum
     idioma: uma chave resolve 1 e 40. Já "dia" tem, mas o singular é
     inalcançável - um dia atrás é "ontem" -, então não ganha chave. Passado um
     mês o texto deixa de ser relativo e vira a data mesmo, formatada pelo
     locale: "há 47 dias" não localiza ninguém. */
  "paineis.salvas.quando.agora": { pt: "agora mesmo", en: "just now", es: "justo ahora" },
  "paineis.salvas.quando.min": { pt: "há {n} min", en: "{n} min ago", es: "hace {n} min" },
  "paineis.salvas.quando.hora": { pt: "há {n} h", en: "{n} h ago", es: "hace {n} h" },
  "paineis.salvas.quando.ontem": { pt: "ontem", en: "yesterday", es: "ayer" },
  "paineis.salvas.quando.dias": { pt: "há {n} dias", en: "{n} days ago", es: "hace {n} días" },

  // --- a mesma lista na tela de entrada, onde há espaço para explicar mais ---
  "paineis.lista.vazio.ajuda": {
    pt: "As decisões criadas aqui ficam guardadas e reaparecem nesta lista - inclusive as que ficaram no meio das perguntas.",
    en: "Decisions created here are stored and come back in this list - including the ones left halfway through the questions.",
    es: "Las decisiones creadas aquí quedan guardadas y reaparecen en esta lista - incluso las que quedaron a mitad de las preguntas.",
  },
  /* Só aparece com mais de seis decisões na lista, então o singular é
     inalcançável e não tem chave. */
  "paineis.lista.buscar.dica": {
    pt: "Buscar entre {n} decisões",
    en: "Search {n} decisions",
    es: "Buscar entre {n} decisiones",
  },

  // --- falhas de rede -------------------------------------------------------
  "paineis.erro.servidor": {
    pt: "Não foi possível falar com o servidor.",
    en: "Could not reach the server.",
    es: "No fue posible comunicarse con el servidor.",
  },
  "paineis.erro.abrir": {
    pt: "Não foi possível abrir a decisão.",
    en: "Could not open the decision.",
    es: "No fue posible abrir la decisión.",
  },
  /* A estrela volta ao que era quando o pedido falha, e o motivo aparece: sem
     isso a tela mostraria um favorito que o servidor não tem. */
  "paineis.erro.favoritar": {
    pt: "Não foi possível mudar a favorita.",
    en: "Could not change the favorite.",
    es: "No fue posible cambiar la favorita.",
  },

  // --- painel de progresso: cada problemática conta uma coisa diferente -----
  "progresso.escolha.emDisputa": { pt: "Em disputa", en: "Still in contention", es: "Aún en disputa" },
  "progresso.ranking.definidas": {
    pt: "Posições definidas",
    en: "Positions settled",
    es: "Posiciones definidas",
  },
  "progresso.ranking.indefinidas": { pt: "Sem posição", en: "No position yet", es: "Sin posición" },
  "progresso.sorting.definidas": { pt: "Classificadas", en: "Sorted", es: "Clasificadas" },
  "progresso.sorting.indefinidas": { pt: "Sem classe", en: "No class yet", es: "Sin clase" },
  "progresso.portfolio.definida": {
    pt: "Carteira definida",
    en: "Portfolio settled",
    es: "Cartera definida",
  },
  "progresso.portfolio.indefinida": {
    pt: "Projetos oscilando",
    en: "Projects in play",
    es: "Proyectos oscilando",
  },
  "progresso.deTotal": { pt: "de {total}", en: "of {total}", es: "de {total}" },
  "progresso.projeto.um": { pt: "projeto", en: "project", es: "proyecto" },
  "progresso.projeto.varios": { pt: "projetos", en: "projects", es: "proyectos" },
  "progresso.barra.rotulo": {
    pt: "Quanto da decisão já se resolveu",
    en: "How much of the decision is settled",
    es: "Cuánto de la decisión ya se resolvió",
  },
  "progresso.barra.andamento": {
    pt: "Avanço da decisão — não há um número fixo de perguntas.",
    en: "Decision progress — there is no fixed number of questions.",
    es: "Avance de la decisión — no hay un número fijo de preguntas.",
  },
  "progresso.barra.fim": {
    pt: "Resolvido. As perguntas que sobraram não mudariam o resultado.",
    en: "Settled. The remaining questions would not change the result.",
    es: "Resuelto. Las preguntas restantes no cambiarían el resultado.",
  },
  "progresso.dica.titulo": {
    pt: "O que este número conta",
    en: "What this number counts",
    es: "Qué cuenta este número",
  },
  "progresso.dica.escolha.podemGanhar": {
    pt: "As alternativas que ainda podem ganhar, dependendo de informação que você não deu.",
    en: "The alternatives that can still win, depending on information you have not given.",
    es: "Las alternativas que todavía pueden ganar, dependiendo de información que usted no dio.",
  },
  "progresso.dica.escolha.riscadas": {
    pt: "As riscadas foram descartadas: não existe nenhum conjunto de pesos compatível com suas respostas que as favoreça.",
    en: "The crossed-out ones are ruled out: no set of scaling constants compatible with your answers favors them.",
    es: "Las tachadas fueron descartadas: no existe ningún conjunto de constantes de escala compatible con sus respuestas que las favorezca.",
  },
  "progresso.dica.outras": {
    pt: "Quantas alternativas já têm situação definida nesta leitura. Nenhuma é descartada aqui - todas aparecem no resultado.",
    en: "How many alternatives already have a settled standing in this reading. None is ruled out here - all of them appear in the result.",
    es: "Cuántas alternativas ya tienen situación definida en esta lectura. Ninguna es descartada aquí - todas aparecen en el resultado.",
  },
  "progresso.desfazer": { pt: "Voltar um passo", en: "Back one step", es: "Retroceder un paso" },
  "progresso.exportar": { pt: "Exportar planilha", en: "Export spreadsheet", es: "Exportar hoja de cálculo" },
  "progresso.exportar.falha": {
    pt: "Não foi possível exportar a planilha.",
    en: "Could not export the spreadsheet.",
    es: "No fue posible exportar la hoja de cálculo.",
  },

  // --- resultado: ranking ---------------------------------------------------
  "resultado.ranking.titulo": {
    pt: "Posição de cada alternativa",
    en: "Position of each alternative",
    es: "Posición de cada alternativa",
  },
  "resultado.ranking.posicao": { pt: "{n}º", en: "#{n}", es: "#{n}" },
  "resultado.ranking.posicao.faixa": {
    pt: "{de}º–{ate}º",
    en: "#{de}–#{ate}",
    es: "#{de}–#{ate}",
  },
  "resultado.ranking.definida": { pt: "definida", en: "settled", es: "definida" },
  "resultado.ranking.emDisputa": { pt: "em disputa", en: "in contention", es: "en disputa" },
  "resultado.ranking.pendentes.tetoVeto": {
    pt: "Com veto declarado, o número é um teto da vantagem: a real é menor ou igual.",
    en: "With a veto declared, the figure is an upper bound on the advantage: the real one is at most this.",
    es: "Con veto declarado, el número es un techo de la ventaja: la real es menor o igual.",
  },

  // --- resultado: sorting ---------------------------------------------------
  "resultado.sorting.titulo": { pt: "Classificação", en: "Sorting", es: "Clasificación" },
  "resultado.sorting.alternativa": { pt: "Alternativa", en: "Alternative", es: "Alternativa" },
  "resultado.sorting.classe": { pt: "Classe", en: "Class", es: "Clase" },
  "resultado.sorting.valorGlobal": { pt: "Valor global", en: "Global value", es: "Valor global" },
  /* Junta as classes possíveis de uma alternativa indefinida: "A ou B". */
  "resultado.sorting.ou": { pt: "ou", en: "or", es: "o" },
  "resultado.sorting.indefinida": { pt: "indefinida", en: "unsettled", es: "indefinida" },

  // --- resultado: portfolio -------------------------------------------------
  "resultado.portfolio.atencao": { pt: "Atenção:", en: "Note:", es: "Atención:" },
  "resultado.portfolio.carteiras": {
    pt: "Carteiras possíveis (orçamento {orcamento})",
    en: "Possible portfolios (budget {orcamento})",
    es: "Carteras posibles (presupuesto {orcamento})",
  },
  "resultado.portfolio.custo": { pt: "custo {custo}", en: "cost {custo}", es: "costo {custo}" },
  // --- a sintese do resultado final ------------------------------------------
  "resultado.final.selo": { pt: "Resultado final", en: "Final result", es: "Resultado final" },
  /* Só o rótulo é traduzido; o corpo da ressalva vem do motor, que é onde mora
     a afirmação sobre como o número foi obtido. */
  "resultado.veto.titulo": {
    pt: "Calculado com veto",
    en: "Computed with a veto",
    es: "Calculado con veto",
  },
  "resultado.final.emAndamento": {
    pt: "Resultado parcial",
    en: "Partial result",
    es: "Resultado parcial",
  },
  "resultado.final.declaracoes.uma": {
    pt: "1 declaração registrada",
    en: "1 statement on record",
    es: "1 declaración registrada",
  },
  "resultado.final.declaracoes.varias": {
    pt: "{n} declarações registradas",
    en: "{n} statements on record",
    es: "{n} declaraciones registradas",
  },
  "resultado.final.aindaAberto": {
    pt: "Ainda dá para responder mais perguntas e estreitar o resultado.",
    en: "You can still answer more questions and narrow the result down.",
    es: "Todavía se pueden responder más preguntas y estrechar el resultado.",
  },
  "resultado.insight.titulo": {
    pt: "O que mais os números dizem",
    en: "What else the numbers say",
    es: "Qué más dicen los números",
  },
  /* Cada frase abaixo e uma leitura direta das faixas que a tela ja mostra.
     Nenhuma delas afirma mais do que os numeros sustentam. */
  "resultado.insight.margem": {
    pt: "{vencedor} vence em qualquer conjunto de pesos compatível com suas respostas: no cenário mais desfavorável a ela ainda vale {pior}, acima do melhor cenário de qualquer rival ({teto}).",
    en: "{vencedor} wins under every set of scaling constants compatible with your answers: in its worst case it is still worth {pior}, above the best case of any rival ({teto}).",
    es: "{vencedor} gana en cualquier conjunto de constantes de escala compatible con sus respuestas: en el escenario más desfavorable todavía vale {pior}, por encima del mejor escenario de cualquier rival ({teto}).",
  },
  "resultado.insight.faixaAberta": {
    pt: "O vencedor está definido, o número não: o valor global de {vencedor} pode estar em qualquer ponto entre {de} e {ate}. Mais respostas estreitam essa faixa sem mudar quem ganha.",
    en: "The winner is settled, the number is not: the overall value of {vencedor} may sit anywhere between {de} and {ate}. More answers narrow that range without changing who wins.",
    es: "El ganador está definido, el número no: el valor global de {vencedor} puede estar en cualquier punto entre {de} y {ate}. Más respuestas estrechan esa franja sin cambiar quién gana.",
  },
  "resultado.insight.decisivo": {
    pt: "{criterio} é o critério que decide: pesa pelo menos {piso} em qualquer cenário compatível, e pode chegar a {teto}.",
    en: "{criterio} is the criterion that decides: it weighs at least {piso} under every compatible scenario, and may reach {teto}.",
    es: "{criterio} es el criterio que decide: pesa al menos {piso} en cualquier escenario compatible, y puede llegar a {teto}.",
  },
  "resultado.insight.poucoPeso.um": {
    pt: "{criterios} pesa menos que a fatia igual ({fatia}) em qualquer cenário compatível — corrigir esse dado dificilmente mudaria o resultado.",
    en: "{criterios} weighs less than an equal share ({fatia}) under every compatible scenario — fixing that figure would hardly change the result.",
    es: "{criterios} pesa menos que la parte igual ({fatia}) en cualquier escenario compatible — corregir ese dato difícilmente cambiaría el resultado.",
  },
  "resultado.insight.poucoPeso.varios": {
    pt: "{criterios} pesam menos que a fatia igual ({fatia}) em qualquer cenário compatível — corrigir esses dados dificilmente mudaria o resultado.",
    en: "{criterios} weigh less than an equal share ({fatia}) under every compatible scenario — fixing those figures would hardly change the result.",
    es: "{criterios} pesan menos que la parte igual ({fatia}) en cualquier escenario compatible — corregir esos datos difícilmente cambiaría el resultado.",
  },
  "resultado.insight.trocaFeita": {
    pt: "A troca que você aceitou: {vencedor} é a melhor em {ganha}, e a pior em {perde}.",
    en: "The trade you accepted: {vencedor} is the best on {ganha}, and the worst on {perde}.",
    es: "El tradeoff que usted aceptó: {vencedor} es la mejor en {ganha}, y la peor en {perde}.",
  },
  "resultado.insight.ganha": {
    pt: "{vencedor} é a melhor alternativa em {ganha}, e não é a pior em nenhum critério.",
    en: "{vencedor} is the best alternative on {ganha}, and the worst on none.",
    es: "{vencedor} es la mejor alternativa en {ganha}, y no es la peor en ningún criterio.",
  },
  "resultado.insight.perde": {
    pt: "Vale saber: {vencedor} é a pior alternativa em {perde}. Ela ganha pelo conjunto, não por esse critério.",
    en: "Worth knowing: {vencedor} is the worst alternative on {perde}. It wins on the whole, not on that criterion.",
    es: "Vale la pena saber: {vencedor} es la peor alternativa en {perde}. Gana por el conjunto, no por ese criterio.",
  },
  "resultado.insight.descarte.semPergunta": {
    pt: "{descartadas} das {total} alternativas caíram só com a ordenação dos critérios, sem nenhuma pergunta de tradeoff.",
    en: "{descartadas} of the {total} alternatives dropped out from the criteria ranking alone, with no tradeoff question.",
    es: "{descartadas} de las {total} alternativas cayeron solo con la ordenación de los criterios, sin ninguna pregunta de tradeoff.",
  },
  "resultado.insight.descarte.uma": {
    pt: "{descartadas} das {total} alternativas foram descartadas com a ordenação dos critérios e 1 resposta de tradeoff.",
    en: "{descartadas} of the {total} alternatives were ruled out with the criteria ranking and 1 tradeoff answer.",
    es: "{descartadas} de las {total} alternativas fueron descartadas con la ordenación de los criterios y 1 respuesta de tradeoff.",
  },
  "resultado.insight.descarte.varias": {
    pt: "{descartadas} das {total} alternativas foram descartadas com a ordenação dos critérios e {respostas} respostas de tradeoff — é o que o método chama de decidir com informação parcial.",
    en: "{descartadas} of the {total} alternatives were ruled out with the criteria ranking and {respostas} tradeoff answers — this is what the method calls deciding on partial information.",
    es: "{descartadas} de las {total} alternativas fueron descartadas con la ordenación de los criterios y {respostas} respuestas de tradeoff — esto es lo que el método llama decidir con información parcial.",
  },

  "resultado.razao.titulo": {
    pt: "Razão entre benefício e custo",
    en: "Benefit-to-cost ratio",
    es: "Razón entre beneficio y costo",
  },
  "resultado.razao.explicacao": {
    pt: "Cada faixa é exata: o custo é constante e o valor é linear nos pesos, então os extremos saem por programação linear.",
    en: "Each range is exact: cost is constant and value is linear in the scaling constants, so the bounds come from linear programming.",
    es: "Cada franja es exacta: el costo es constante y el valor es lineal en las constantes de escala, así que los extremos salen por programación lineal.",
  },
  "resultado.razao.projeto": { pt: "Projeto", en: "Project", es: "Proyecto" },
  "resultado.razao.custo": { pt: "Custo", en: "Cost", es: "Costo" },
  "resultado.razao.faixa": { pt: "Faixa de razão", en: "Ratio range", es: "Franja de razón" },
  "resultado.razao.dominancia": {
    pt: "Dominância por razão",
    en: "Dominance by ratio",
    es: "Dominancia por razón",
  },
  "resultado.razao.domina": {
    pt: "{dominante} domina {dominado}: as faixas não se sobrepõem",
    en: "{dominante} dominates {dominado}: the ranges do not overlap",
    es: "{dominante} domina a {dominado}: las franjas no se sobreponen",
  },
  "resultado.portfolio.sempre": {
    pt: "Sempre selecionados",
    en: "Always selected",
    es: "Siempre seleccionados",
  },
  "resultado.portfolio.oscilam": { pt: "Oscilam", en: "Sometimes selected", es: "Oscilan" },
  "resultado.portfolio.nunca": {
    pt: "Nunca selecionados",
    en: "Never selected",
    es: "Nunca seleccionados",
  },

  // --- resultado: escolha ---------------------------------------------------
  "resultado.escolha.dominancia": {
    pt: "Relações de dominância",
    en: "Dominance relations",
    es: "Relaciones de dominancia",
  },
});
