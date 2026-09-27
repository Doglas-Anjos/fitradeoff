/**
 * Catálogo da área de paridade.
 *
 * O texto aqui fala com quem precisa **confiar** no resultado: orientador,
 * banca, alguém decidindo se adota a ferramenta. Por isso nomeia o sistema de
 * referência e a versão, diz como a medição foi feita, e não esconde o que
 * ficou de fora — uma comparação que só mostra o que deu certo não serve como
 * argumento, serve como propaganda.
 *
 * O tom é de conversa, e isso é decisão, não descuido. A versão anterior era
 * uma sequência de afirmações densas, corretas e ilegíveis para quem não já
 * conhecia o método: quem chega aqui está tentando decidir se acredita, e
 * ninguém decide isso lendo uma tabela de conformidade. Explicar o porquê de
 * cada escolha custa mais palavras e é o que faz o argumento funcionar.
 *
 * Termo técnico continua mandando sobre a tradução fácil: `sorting`,
 * `scaling constants`, `pre-order`. Quem é da área lê o errado como amadorismo.
 */

import { registrar } from "./index";
import "./nucleo";

export const PARIDADE_TEXTOS = registrar({
  "nav.paridade": { pt: "Paridade", en: "Parity", es: "Paridad" },

  "paridade.editorial": {
    pt: "Evidência e validação",
    en: "Evidence and validation",
    es: "Evidencia y validación",
  },
  "paridade.sumario": { pt: "Nesta página", en: "On this page", es: "En esta página" },
  "paridade.sumario.compacto": {
    pt: "Seções desta página",
    en: "Page sections",
    es: "Secciones de esta página",
  },
  "paridade.sumario.lateral": { pt: "Sumário lateral", en: "Side contents", es: "Índice lateral" },

  "paridade.titulo": {
    pt: "Isto dá o mesmo resultado que o FITradeoff oficial?",
    en: "Does this give the same result as the official FITradeoff?",
    es: "¿Esto da el mismo resultado que el FITradeoff oficial?",
  },
  "paridade.subtitulo": {
    pt: "A resposta curta é que sim, com duas ressalvas conhecidas e uma parte que não deu para testar. A resposta longa é esta página.",
    en: "The short answer is yes, with two known caveats and one part we could not test. The long answer is this page.",
    es: "La respuesta corta es que sí, con dos salvedades conocidas y una parte que no fue posible probar. La respuesta larga es esta página.",
  },
  "paridade.medidoEm": { pt: "medido em {data}", en: "measured on {data}", es: "medido el {data}" },
  "paridade.versaoOficial": {
    pt: "Sistema de referência: FU-T3MMM-WF1a, do CDSID/UFPE",
    en: "Reference system: FU-T3MMM-WF1a, by CDSID/UFPE",
    es: "Sistema de referencia: FU-T3MMM-WF1a, del CDSID/UFPE",
  },

  "paridade.placar": {
    pt: "{bate} de {total} casos batem",
    en: "{bate} of {total} cases match",
    es: "{bate} de {total} casos coinciden",
  },
  "paridade.placar.detalhe": {
    pt: "Batem no número de perguntas das duas fases — a ordenação das constantes de escala e a elicitação por decomposição. Na recomendação final, os {total} batem.",
    en: "They match on the number of questions in both phases — ranking of the scaling constants and elicitation by decomposition. On the final recommendation, all {total} match.",
    es: "Coinciden en el número de preguntas de las dos fases — la ordenación de las constantes de escala y la elicitación por descomposición. En la recomendación final, los {total} coinciden.",
  },
  "paridade.placar.travados": {
    pt: "Em {n} caso o sistema oficial não completa.",
    en: "In {n} case the official system does not complete.",
    es: "En {n} caso el sistema oficial no completa.",
  },
  "paridade.placar.travadosVarios": {
    pt: "Em {n} casos o sistema oficial não completa.",
    en: "In {n} cases the official system does not complete.",
    es: "En {n} casos el sistema oficial no completa.",
  },
  "paridade.maior": {
    pt: "Maior problema testado: {n} alternativas.",
    en: "Largest problem tested: {n} alternatives.",
    es: "Mayor problema probado: {n} alternativas.",
  },

  /* --- o que "equivalente" quer dizer -------------------------------------- */

  "paridade.significa.titulo": {
    pt: "O que “equivalente” quer dizer aqui",
    en: "What “equivalent” means here",
    es: "Qué quiere decir “equivalente” aquí",
  },
  "paridade.significa.corpo1": {
    pt: "Não quer dizer que as telas são parecidas. Elas não são, e nem deveriam ser: o sistema de referência foi desenhado para desktop, e este aqui abre no celular. Copiar a aparência não provaria nada sobre o método.",
    en: "It does not mean the screens look alike. They do not, and they should not: the reference system was designed for desktop, and this one opens on a phone. Copying the looks would prove nothing about the method.",
    es: "No quiere decir que las pantallas se parezcan. No lo son, y no deberían serlo: el sistema de referencia fue diseñado para escritorio, y este se abre en el celular. Copiar la apariencia no probaría nada sobre el método.",
  },
  "paridade.significa.corpo2": {
    pt: "Quer dizer uma coisa bem mais específica: dado o mesmo problema, e um decisor que responda exatamente as mesmas coisas, os dois sistemas fazem as mesmas perguntas, na mesma ordem, param no mesmo momento e recomendam a mesma coisa.",
    en: "It means something much more specific: given the same problem, and a decision maker who answers exactly the same things, both systems ask the same questions, in the same order, stop at the same moment and recommend the same thing.",
    es: "Quiere decir algo mucho más específico: dado el mismo problema, y un decisor que responda exactamente las mismas cosas, los dos sistemas hacen las mismas preguntas, en el mismo orden, se detienen en el mismo momento y recomiendan lo mismo.",
  },
  "paridade.significa.corpo3": {
    pt: "O número de perguntas é onde mais insistimos, e vale dizer por quê. Chegar ao mesmo resultado não prova muito sozinho — com três alternativas, dois sistemas quaisquer concordam por falta de caminho alternativo. O que o FITradeoff realmente decide é **quando parar de perguntar**: ele trabalha com informação parcial exatamente para não esgotar o decisor. Se um sistema faz 22 perguntas e o outro 21 no mesmo problema, os dois podem acertar a recomendação e ainda assim um deles está com o critério de parada errado — e o critério de parada é o que faz o método valer a pena.",
    en: "The question count is what we pushed hardest on, and it is worth saying why. Reaching the same result proves little on its own — with three alternatives, any two systems agree for lack of alternative paths. What FITradeoff actually decides is **when to stop asking**: it works with partial information precisely so as not to exhaust the decision maker. If one system asks 22 questions and the other 21 on the same problem, both may get the recommendation right and one of them still has the wrong stopping rule — and the stopping rule is what makes the method worth using.",
    es: "El número de preguntas es en lo que más insistimos, y vale la pena decir por qué. Llegar al mismo resultado no prueba mucho por sí solo — con tres alternativas, dos sistemas cualesquiera concuerdan por falta de caminos alternativos. Lo que el FITradeoff realmente decide es **cuándo dejar de preguntar**: trabaja con información parcial precisamente para no agotar al decisor. Si un sistema hace 22 preguntas y el otro 21 en el mismo problema, los dos pueden acertar la recomendación y aun así uno de ellos tiene el criterio de parada equivocado — y el criterio de parada es lo que hace que el método valga la pena.",
  },

  /* --- como a medição foi feita -------------------------------------------- */

  "paridade.metodo.titulo": {
    pt: "Como a conferência foi feita",
    en: "How the check was run",
    es: "Cómo se hizo la verificación",
  },
  "paridade.metodo.corpo1": {
    pt: "Cada caso foi cadastrado nos dois sistemas com as mesmas alternativas, os mesmos critérios e a mesma matriz de desempenhos. Depois um robô respondeu às perguntas dos dois lados seguindo sempre a mesma política: escolher a opção A, todas as vezes.",
    en: "Each case was entered into both systems with the same alternatives, the same criteria and the same performance matrix. A robot then answered the questions on both sides following one fixed policy: pick option A, every time.",
    es: "Cada caso fue registrado en los dos sistemas con las mismas alternativas, los mismos criterios y la misma matriz de desempeños. Después un robot respondió las preguntas en los dos lados siguiendo siempre la misma política: elegir la opción A, todas las veces.",
  },
  "paridade.metodo.corpo2": {
    pt: "Responder sempre A não é o que um decisor faria, e não é para ser. Se as respostas variassem, qualquer divergência de percurso poderia ser explicada por “o robô respondeu diferente dos dois lados”, e não haveria o que concluir. Com política fixa, se os dois sistemas divergem, a divergência é deles.",
    en: "Always answering A is not what a decision maker would do, and it is not meant to be. If the answers varied, any divergence in the path could be explained away as “the robot answered differently on each side”, and nothing could be concluded. With a fixed policy, when the two systems diverge, the divergence is theirs.",
    es: "Responder siempre A no es lo que haría un decisor, y no pretende serlo. Si las respuestas variaran, cualquier divergencia en el recorrido podría explicarse como “el robot respondió distinto en cada lado”, y no habría nada que concluir. Con política fija, si los dos sistemas divergen, la divergencia es de ellos.",
  },
  "paridade.metodo.corpo3": {
    pt: "Dois parâmetros foram igualados de propósito, porque sem isso a comparação não teria sentido: função de valor linear em todos os critérios, e limiar de equivalência em 0,01 — que é o padrão de lá, e virou o nosso.",
    en: "Two parameters were matched on purpose, because without that the comparison would be meaningless: a linear value function on every criterion, and an equivalence threshold of 0.01 — their default, which became ours.",
    es: "Dos parámetros fueron igualados a propósito, porque sin eso la comparación no tendría sentido: función de valor lineal en todos los criterios, y límite de equivalencia en 0,01 — que es el predeterminado de allá, y se volvió el nuestro.",
  },

  /* --- os cinco módulos ----------------------------------------------------- */

  "paridade.modulos.titulo": {
    pt: "Os cinco módulos, um por um",
    en: "The five modules, one by one",
    es: "Los cinco módulos, uno por uno",
  },
  "paridade.modulos.corpo": {
    pt: "O sistema de referência organiza tudo por módulo: quem chega escolhe um antes de cadastrar qualquer coisa. Seguimos a mesma divisão aqui, porque quem quer conferir a equivalência quer conferir a do módulo que vai usar — e o placar somado não responde isso. Cada página abaixo diz que pergunta aquele módulo responde, como o método chega à resposta, o que foi testado e o que ficou de fora.",
    en: "The reference system organises everything by module: you pick one before entering anything. We follow the same split here, because whoever wants to check the equivalence wants to check it for the module they will use — and the aggregate score does not answer that. Each page below says what question that module answers, how the method gets there, what was tested and what was left out.",
    es: "El sistema de referencia organiza todo por módulo: quien llega elige uno antes de registrar cualquier cosa. Seguimos la misma división aquí, porque quien quiere verificar la equivalencia quiere verificar la del módulo que va a usar — y el puntaje agregado no responde eso. Cada página a continuación dice qué pregunta responde ese módulo, cómo el método llega a la respuesta, qué fue probado y qué quedó fuera.",
  },
  "paridade.modulos.placar": {
    pt: "{bate} de {total} casos batem",
    en: "{bate} of {total} cases match",
    es: "{bate} de {total} casos coinciden",
  },
  "paridade.modulos.semCaso": { pt: "Sem caso comparado", en: "No case compared", es: "Sin caso comparado" },
  "paridade.modulos.verMais": {
    pt: "Abrir a tela deste módulo",
    en: "Open this module's page",
    es: "Abrir la pantalla de este módulo",
  },
  "paridade.modulos.cadaUmTela": {
    pt: "Cada um tem a sua própria tela, com as capturas dos dois sistemas e o que foi conferido ali.",
    en: "Each has its own page, with the captures from both systems and what was checked there.",
    es: "Cada uno tiene su propia pantalla, con las capturas de los dos sistemas y lo que se comprobó allí.",
  },
  "paridade.modulo.telas.titulo": {
    pt: "As telas, lado a lado",
    en: "The screens, side by side",
    es: "Las pantallas, lado a lado",
  },
  "paridade.modulo.telas.corpo": {
    pt: "Estas três telas são as mesmas para os cinco módulos — o caminho até a resposta não muda, só a leitura que o motor faz no fim. Role para comparar: a captura em foco é a que está sendo olhada, e a outra recua.",
    en: "These three screens are the same for all five modules — the path to the answer does not change, only the reading the engine makes at the end. Scroll to compare: the capture in focus is the one being looked at, and the other recedes.",
    es: "Estas tres pantallas son las mismas para los cinco módulos — el camino hasta la respuesta no cambia, solo la lectura que el motor hace al final. Desplácese para comparar: la captura en foco es la que se está mirando, y la otra retrocede.",
  },
  "paridade.modulos.exato": { pt: "Resultado exato", en: "Exact result", es: "Resultado exacto" },
  "paridade.modulos.aproximado": {
    pt: "Carteira aproximada",
    en: "Approximated portfolio",
    es: "Cartera aproximada",
  },

  /* --- tabela de casos ------------------------------------------------------ */

  "paridade.tabela.titulo": { pt: "Caso a caso", en: "Case by case", es: "Caso por caso" },
  "paridade.tabela.caso": { pt: "Caso", en: "Case", es: "Caso" },
  "paridade.tabela.tamanho": { pt: "Alt × Crit", en: "Alt × Crit", es: "Alt × Crit" },
  "paridade.tabela.oficial": { pt: "Oficial", en: "Official", es: "Oficial" },
  "paridade.tabela.nosso": { pt: "Nosso", en: "Ours", es: "Nuestro" },
  "paridade.tabela.legenda": {
    pt: "Ordenação / tradeoff — o número de perguntas em cada fase.",
    en: "Ranking / tradeoff — the number of questions in each phase.",
    es: "Ordenación / tradeoff — el número de preguntas en cada fase.",
  },
  "paridade.tabela.bate": { pt: "bate", en: "match", es: "coincide" },
  "paridade.tabela.difere": { pt: "difere", en: "differs", es: "difiere" },
  "paridade.tabela.trava": { pt: "não completa", en: "does not complete", es: "no completa" },
  "paridade.tabela.naoComparavel": {
    pt: "não comparável",
    en: "not comparable",
    es: "no comparable",
  },

  /* --- capturas ------------------------------------------------------------- */

  "paridade.telas.titulo": { pt: "As mesmas telas", en: "The same screens", es: "Las mismas pantallas" },
  "paridade.telas.corpo": {
    pt: "O caminho é o mesmo nos dois, e é o mesmo para os cinco módulos: escolher o módulo, cadastrar, preencher a matriz, declarar a função de valor, ordenar as constantes de escala, responder os tradeoffs. As capturas abaixo são do mesmo caso, no mesmo ponto, nos dois sistemas.",
    en: "The path is the same on both, and the same for all five modules: pick the module, register, fill the matrix, declare the value function, rank the scaling constants, answer the tradeoffs. The captures below are of the same case, at the same point, on both systems.",
    es: "El camino es el mismo en los dos, y es el mismo para los cinco módulos: elegir el módulo, registrar, completar la matriz, declarar la función de valor, ordenar las constantes de escala, responder los tradeoffs. Las capturas a continuación son del mismo caso, en el mismo punto, en los dos sistemas.",
  },
  "paridade.telas.matriz": { pt: "Matriz de desempenhos", en: "Performance matrix", es: "Matriz de desempeños" },
  "paridade.telas.matriz.nota": {
    pt: "Lá os critérios são C1, C2, C3, com uma tabela de apoio dizendo qual é qual; aqui o nome e a direção ficam no cabeçalho, e dá para colar a tabela do Excel de uma vez.",
    en: "There the criteria are C1, C2, C3, with a side table saying which is which; here the name and direction sit in the header, and you can paste the whole table from Excel at once.",
    es: "Allá los criterios son C1, C2, C3, con una tabla de apoyo que dice cuál es cuál; aquí el nombre y la dirección quedan en el encabezado, y se puede pegar la tabla de Excel de una vez.",
  },
  "paridade.telas.ordenacao": {
    pt: "Ordenação das constantes de escala",
    en: "Ranking of the scaling constants",
    es: "Ordenación de las constantes de escala",
  },
  "paridade.telas.ordenacao.nota": {
    pt: "Comparação par a par, com a faixa de cada critério desenhada. É o mesmo par, no mesmo ponto, nos dois sistemas.",
    en: "Pairwise comparison, with each criterion's range drawn. Same pair, same point, in both systems.",
    es: "Comparación por pares, con la franja de cada criterio dibujada. Es el mismo par, en el mismo punto, en los dos sistemas.",
  },
  "paridade.telas.tradeoff": { pt: "Pergunta de tradeoff", en: "Tradeoff question", es: "Pregunta de tradeoff" },
  "paridade.telas.tradeoff.nota": {
    pt: "Duas consequências hipotéticas, ambas ruins em quase tudo. Marcamos o que é idêntico nas duas situações, para que a comparação seja só sobre o que muda.",
    en: "Two hypothetical consequences, both bad at almost everything. We mark what is identical in both, so the comparison is only about what changes.",
    es: "Dos consecuencias hipotéticas, ambas malas en casi todo. Marcamos lo que es idéntico en las dos situaciones, para que la comparación sea solo sobre lo que cambia.",
  },
  "paridade.telas.oficialLegenda": { pt: "Oficial", en: "Official", es: "Oficial" },
  "paridade.telas.pausar": {
    pt: "Pausar a alternância",
    en: "Pause the alternation",
    es: "Pausar la alternancia",
  },
  "paridade.telas.retomar": {
    pt: "Retomar a alternância",
    en: "Resume the alternation",
    es: "Reanudar la alternancia",
  },
  "paridade.telas.alternar": {
    pt: "Alternar entre os dois sistemas",
    en: "Switch between the two systems",
    es: "Alternar entre los dos sistemas",
  },
  "paridade.telas.nossoLegenda": { pt: "Nossa", en: "Ours", es: "Nuestra" },

  /* --- o que a comparação encontrou ----------------------------------------- */

  "paridade.achados.titulo": {
    pt: "O que a comparação encontrou",
    en: "What the comparison found",
    es: "Qué encontró la comparación",
  },
  "paridade.achados.intro": {
    pt: "Três divergências de método, e vale notar o padrão: nas três, as perguntas iniciais eram idênticas e a diferença estava em quando cada sistema para. Nenhuma foi no critério de escolha da próxima pergunta, que era onde a gente procurava no começo. As correções valem para a maioria dos casos, mas não fecham tudo — cada uma foi medida contra a instância em que a divergência apareceu, e casos novos mostraram que a regra não generaliza por completo.",
    en: "Three methodological divergences, and the pattern is worth noting: in all three the initial questions were identical and the difference was in when each system stops. None was in the rule for picking the next question, which is where we looked first. The fixes hold for most cases but do not close everything — each was measured against the instance where the divergence showed up, and new cases showed the rule does not fully generalise.",
    es: "Tres divergencias de método, y vale la pena notar el patrón: en las tres, las preguntas iniciales eran idénticas y la diferencia estaba en cuándo se detiene cada sistema. Ninguna estaba en el criterio de elección de la próxima pregunta, que era donde buscábamos al principio. Las correcciones valen para la mayoría de los casos, pero no cierran todo — cada una fue medida contra la instancia en que la divergencia apareció, y casos nuevos mostraron que la regla no generaliza por completo.",
  },
  "paridade.achados.abertura.titulo": {
    pt: "A pergunta de abertura",
    en: "The opening question",
    es: "La pregunta de apertura",
  },
  "paridade.achados.abertura.corpo": {
    pt: "O oficial abre confrontando o critério mais importante com o menos importante, e só depois refina par a par. Nós só perguntávamos sobre pares consecutivos — e ficávamos sempre uma pergunta atrás.",
    en: "The official opens by pitting the most important criterion against the least important, and only then refines pair by pair. We only asked about consecutive pairs — and were always one question behind.",
    es: "El oficial abre confrontando el criterio más importante con el menos importante, y solo después refina par por par. Nosotros solo preguntábamos sobre pares consecutivos — y quedábamos siempre una pregunta atrás.",
  },
  "paridade.achados.limiar.titulo": {
    pt: "O limiar de equivalência",
    en: "The equivalence threshold",
    es: "El límite de equivalencia",
  },
  "paridade.achados.limiar.corpo": {
    pt: "Ele declara dominância quando a desvantagem máxima cabe no limiar. Medido num caso de 12 alternativas: 0,0092, abaixo de 0,01. Nós exigíamos vantagem até a última casa decimal, e gastávamos quatro perguntas atrás de uma diferença que nenhum decisor sente.",
    en: "It declares dominance when the maximum disadvantage fits within the threshold. Measured on a 12-alternative case: 0.0092, below 0.01. We required an advantage down to the last decimal, spending four extra questions chasing a difference no decision maker feels.",
    es: "Él declara dominancia cuando la desventaja máxima cabe dentro del límite. Medido en un caso de 12 alternativas: 0,0092, por debajo de 0,01. Nosotros exigíamos ventaja hasta el último decimal, y gastábamos cuatro preguntas persiguiendo una diferencia que ningún decisor siente.",
  },
  "paridade.achados.sorting.titulo": {
    pt: "A classificação decide pela largura",
    en: "Sorting decides by range width",
    es: "La clasificación decide por el ancho",
  },
  "paridade.achados.sorting.corpo": {
    pt: "Não é a profundidade com que a faixa atravessa o corte, é a largura da faixa. Se o valor global não pode mais ser fixado com precisão melhor que o limiar, nenhuma pergunta futura decide de que lado a alternativa está.",
    en: "It is not how deep the range crosses the cut, it is how wide the range is. If the global value can no longer be pinned more precisely than the threshold, no future question decides which side the alternative falls on.",
    es: "No es cuán profundo la franja cruza el corte, es cuán ancha es la franja. Si el valor global ya no puede fijarse con más precisión que el límite, ninguna pregunta futura decide de qué lado queda la alternativa.",
  },

  /* --- o que não foi testado ------------------------------------------------ */

  "paridade.naoTestamos.titulo": {
    pt: "O que não foi testado",
    en: "What was not tested",
    es: "Qué no fue probado",
  },
  "paridade.naoTestamos.intro": {
    pt: "Toda comparação tem borda. Estas são as nossas, e ficam nesta página em vez de numa nota de rodapé, porque quem for usar isto como argumento precisa saber onde o argumento acaba. Nenhum dos itens abaixo é impedimento para usar a ferramenta; todos são coisas sobre as quais esta página não fala.",
    en: "Every comparison has edges. These are ours, and they sit on this page rather than in a footnote, because whoever uses this as an argument needs to know where the argument ends. None of the items below prevents using the tool; all of them are things this page does not speak to.",
    es: "Toda comparación tiene bordes. Estos son los nuestros, y están en esta página en vez de en una nota al pie, porque quien vaya a usar esto como argumento necesita saber dónde termina el argumento. Ninguno de los ítems a continuación impide usar la herramienta; todos son cosas sobre las que esta página no habla.",
  },
  "paridade.naoTestamos.carteira.titulo": {
    pt: "Portfólio Combinatorial: nenhum caso comparado",
    en: "Combinatorial Portfolio: no case compared",
    es: "Portafolio Combinatorial: ningún caso comparado",
  },
  "paridade.naoTestamos.carteira.corpo": {
    pt: "É o único dos cinco módulos sem um único caso medido dos dois lados. Lá ele não responde na hora: depois da matriz, o sistema enfileira um processamento assíncrono e avisa por e-mail quando termina, e o robô não consegue acompanhar isso dentro de uma sessão. O módulo existe aqui, tem testes próprios e a ressalva de aproximação acompanha o resultado — mas contra o oficial ele não foi verificado.",
    en: "It is the only one of the five modules without a single case measured on both sides. There it does not answer on the spot: after the matrix the system queues an asynchronous job and notifies by e-mail when it finishes, and the robot cannot follow that within a session. The module exists here, has its own tests and carries the approximation caveat with the result — but it was not verified against the official.",
    es: "Es el único de los cinco módulos sin un solo caso medido en los dos lados. Allá no responde en el momento: después de la matriz, el sistema encola un procesamiento asíncrono y avisa por correo cuando termina, y el robot no puede seguir eso dentro de una sesión. El módulo existe aquí, tiene pruebas propias y la salvedad de aproximación acompaña el resultado — pero contra el oficial no fue verificado.",
  },
  "paridade.naoTestamos.qualidade.titulo": {
    pt: "Se a recomendação é boa",
    en: "Whether the recommendation is good",
    es: "Si la recomendación es buena",
  },
  "paridade.naoTestamos.qualidade.corpo": {
    pt: "O que foi comparado é o percurso e o desfecho sob respostas idênticas. Se a alternativa recomendada é a certa para um decisor de verdade é outra pergunta — e ela não depende da implementação, depende das preferências dele. Os dois sistemas errariam juntos, se fosse o caso.",
    en: "What was compared is the path and the outcome under identical answers. Whether the recommended alternative is right for a real decision maker is a different question — and it does not depend on the implementation, it depends on their preferences. Both systems would be wrong together, if it came to that.",
    es: "Lo que se comparó es el recorrido y el desenlace bajo respuestas idénticas. Si la alternativa recomendada es la correcta para un decisor real es otra pregunta — y no depende de la implementación, depende de sus preferencias. Los dos sistemas se equivocarían juntos, si fuera el caso.",
  },
  "paridade.naoTestamos.curva.titulo": {
    pt: "Função de valor não linear",
    en: "Non-linear value function",
    es: "Función de valor no lineal",
  },
  "paridade.naoTestamos.curva.corpo": {
    pt: "Todos os casos rodaram com valor linear nos dois lados, de propósito, para isolar o que estava sendo comparado. Nosso motor aceita curva elicitada ponto a ponto, e o oficial também — essa combinação nunca foi rodada lado a lado.",
    en: "Every case ran with a linear value function on both sides, on purpose, to isolate what was being compared. Our engine accepts a curve elicited point by point, and so does the official — that combination was never run side by side.",
    es: "Todos los casos corrieron con valor lineal en los dos lados, a propósito, para aislar lo que se estaba comparando. Nuestro motor acepta una curva elicitada punto por punto, y el oficial también — esa combinación nunca se corrió lado a lado.",
  },
  "paridade.naoTestamos.veto.titulo": { pt: "O mecanismo de veto", en: "The veto mechanism", es: "El mecanismo de veto" },
  "paridade.naoTestamos.veto.corpo": {
    pt: "Implementado aqui para escolha e ordenação, como lá, seguindo a formulação de de Almeida (2013). Nunca foi rodado lado a lado, e é a parte em que menos caberia confiança cega: o valor penalizado é quadrático nos pesos, então a dominância deixa de ser um programa linear e a nossa sai de um envelope conservador — faixas mais largas que as verdadeiras, nunca mais estreitas.",
    en: "Implemented here for choice and ranking, as there, following de Almeida (2013). It was never run side by side, and it is the part where blind trust would be least warranted: the penalised value is quadratic in the weights, so dominance stops being a linear program and ours comes from a conservative envelope — ranges wider than the true ones, never narrower.",
    es: "Implementado aquí para elección y ordenación, como allá, siguiendo la formulación de de Almeida (2013). Nunca se corrió lado a lado, y es la parte donde menos cabría la confianza ciega: el valor penalizado es cuadrático en las constantes de escala, así que la dominancia deja de ser un programa lineal y la nuestra sale de una envolvente conservadora — franjas más anchas que las verdaderas, nunca más estrechas.",
  },
  "paridade.naoTestamos.discretos.titulo": {
    pt: "Critérios com níveis declarados",
    en: "Criteria with declared levels",
    es: "Criterios con niveles declarados",
  },
  "paridade.naoTestamos.discretos.corpo": {
    pt: "Todos os casos usam escala contínua. Escala construída, com níveis discretos declarados, existe nos dois sistemas e não entrou na comparação.",
    en: "Every case uses a continuous scale. Constructed scales, with declared discrete levels, exist on both systems and did not enter the comparison.",
    es: "Todos los casos usan escala continua. La escala construida, con niveles discretos declarados, existe en los dos sistemas y no entró en la comparación.",
  },
  "paridade.naoTestamos.tamanho.titulo": {
    pt: "Problemas acima de 20 alternativas",
    en: "Problems above 20 alternatives",
    es: "Problemas con más de 20 alternativas",
  },
  "paridade.naoTestamos.tamanho.corpo": {
    pt: "Vinte é o maior caso medido dos dois lados, e foi escolhido de propósito: com três ou quatro alternativas duas implementações concordam por coincidência, porque há poucos caminhos possíveis; com vinte são 190 pares para ordenar. Acima disso não medimos do lado de lá.",
    en: "Twenty is the largest case measured on both sides, and it was chosen on purpose: with three or four alternatives two implementations agree by coincidence, because there are few possible paths; with twenty there are 190 pairs to order. Above that we did not measure the other side.",
    es: "Veinte es el caso más grande medido en los dos lados, y fue elegido a propósito: con tres o cuatro alternativas dos implementaciones concuerdan por coincidencia, porque hay pocos caminos posibles; con veinte son 190 pares para ordenar. Por encima de eso no medimos del otro lado.",
  },
  "paridade.naoTestamos.grupo.titulo": { pt: "Decisão em grupo", en: "Group decision", es: "Decisión en grupo" },
  "paridade.naoTestamos.grupo.corpo": {
    pt: "Não existe em nenhum dos dois, então não havia o que comparar. Fica registrado porque é a pergunta que mais aparece depois de ver o resto funcionando.",
    en: "It exists on neither, so there was nothing to compare. It is recorded here because it is the question that comes up most often once the rest is seen working.",
    es: "No existe en ninguno de los dos, así que no había nada que comparar. Queda registrado porque es la pregunta que más aparece después de ver el resto funcionando.",
  },

  /* --- divergências que restam ---------------------------------------------- */

  "paridade.restam.titulo": {
    pt: "O que permanece diferente",
    en: "What is still different",
    es: "Qué sigue siendo diferente",
  },
  "paridade.restam.instancias.titulo": {
    pt: "Ordenação: uma pergunta, numa instância",
    en: "Ranking: one question, in one instance",
    es: "Ordenación: una pregunta, en una instancia",
  },
  "paridade.restam.instancias.corpo": {
    pt: "Num caso de 20 alternativas a ordenação fica em 22 perguntas contra 21 dele. As 20 primeiras são idênticas; no passo 21 o oficial abandona um par que ainda tinha faixa e vai direto ao que fecha a ordem. Parece seleção com lookahead, mas trocar o seletor dá 10 perguntas nesse caso e quebra dois que hoje batem. A causa continua desconhecida; o desfecho é o mesmo, pré-ordem completa dos dois lados.",
    en: "In one 20-alternative case the ranking takes 22 questions against its 21. The first 20 are identical; at step 21 the official abandons a pair that still had range and goes straight to the one that closes the order. It looks like lookahead selection, but switching the selector gives 10 questions there and breaks two cases that currently match. The cause remains unknown; the outcome is the same, a complete pre-order on both sides.",
    es: "En un caso de 20 alternativas la ordenación queda en 22 preguntas contra 21 de él. Las primeras 20 son idénticas; en el paso 21 el oficial abandona un par que todavía tenía franja y va directo al que cierra el orden. Parece selección con lookahead, pero cambiar el selector da 10 preguntas en ese caso y rompe dos que hoy coinciden. La causa sigue siendo desconocida; el desenlace es el mismo, preorden completo en los dos lados.",
  },
  "paridade.restam.bc.titulo": {
    pt: "Benefício-custo: mesma carteira, menos perguntas",
    en: "Benefit-to-cost: same portfolio, fewer questions",
    es: "Beneficio-costo: misma cartera, menos preguntas",
  },
  "paridade.restam.bc.corpo": {
    pt: "A carteira é a mesma, conferida projeto a projeto — inclusive com 20 projetos e mais de um milhão de subconjuntos possíveis. A nossa parada dispara quando a carteira está definida; ele continua. Cinco hipóteses foram testadas para explicar onde ele para, e todas foram refutadas. Forçar mais perguntas do nosso lado não muda a carteira.",
    en: "The portfolio is the same, checked project by project — including with 20 projects and over a million possible subsets. Our stop fires once the portfolio is settled; it keeps going. Five hypotheses were tested to explain where it stops, and all were refuted. Forcing more questions on our side does not change the portfolio.",
    es: "La cartera es la misma, verificada proyecto por proyecto — incluso con 20 proyectos y más de un millón de subconjuntos posibles. Nuestra parada se activa cuando la cartera está definida; él continúa. Se probaron cinco hipótesis para explicar dónde se detiene, y todas fueron refutadas. Forzar más preguntas de nuestro lado no cambia la cartera.",
  },
  "paridade.restam.carteira.titulo": {
    pt: "Portfólio Combinatorial: não comparável em sessão",
    en: "Combinatorial Portfolio: not comparable in session",
    es: "Portafolio Combinatorial: no comparable en sesión",
  },
  "paridade.restam.carteira.corpo": {
    pt: "Esse módulo roda num sistema separado e, depois da matriz, entra num processamento assíncrono que avisa por e-mail. Ele enumera carteiras offline; nós aproximamos por amostragem e respondemos na hora. É diferença de arquitetura, não de configuração.",
    en: "That module runs on a separate system and, after the matrix, enters an asynchronous job that notifies by e-mail. It enumerates portfolios offline; we approximate by sampling and answer immediately. That is an architectural difference, not a configuration one.",
    es: "Ese módulo corre en un sistema separado y, después de la matriz, entra en un procesamiento asíncrono que avisa por correo. Enumera carteras offline; nosotros aproximamos por muestreo y respondemos al instante. Es una diferencia de arquitectura, no de configuración.",
  },
  "paridade.restam.degenerado.titulo": {
    pt: "Onde o oficial não completa",
    en: "Where the official does not complete",
    es: "Dónde el oficial no completa",
  },
  "paridade.restam.degenerado.corpo": {
    pt: "Com todas as alternativas idênticas, todo critério tem faixa zero e a elicitação da função valor não tem o que fazer: ele trava. Nós respondemos que as alternativas ficaram equivalentes dentro do limiar, e que qualquer uma serve.",
    en: "With all alternatives identical, every criterion has zero range and the value function elicitation has nothing to work with: it hangs. We answer that the alternatives are equivalent within the threshold, and any of them will do.",
    es: "Con todas las alternativas idénticas, cada criterio tiene franja cero y la elicitación de la función de valor no tiene con qué trabajar: se traba. Nosotros respondemos que las alternativas quedaron equivalentes dentro del límite, y que cualquiera sirve.",
  },

  "paridade.reproduzir.titulo": { pt: "Refazer a medição", en: "Reproducing this", es: "Rehacer la medición" },
  "paridade.reproduzir.corpo": {
    pt: "Os casos, o roteiro de automação e os resultados brutos estão no repositório, em paridade/. Esta tela lê um arquivo gerado a partir deles, e não consulta nada ao vivo: rodar o lado oficial leva minutos por caso e depende de servidor de terceiros e de conta. Datado e versionado, o número é conferível — quem duvidar roda de novo.",
    en: "The cases, the automation script and the raw results are in the repository, under paridade/. This screen reads a file generated from them, and queries nothing live: running the official side takes minutes per case and depends on a third-party server and an account. Dated and versioned, the number can be checked — anyone who doubts it can re-run.",
    es: "Los casos, el guion de automatización y los resultados brutos están en el repositorio, en paridade/. Esta pantalla lee un archivo generado a partir de ellos, y no consulta nada en vivo: correr el lado oficial toma minutos por caso y depende de un servidor de terceros y de una cuenta. Fechado y versionado, el número es verificable — quien dude puede volver a correrlo.",
  },

  /* ========================================================================== */
  /* As cinco páginas de módulo                                                 */
  /* ========================================================================== */

  "paridade.modulo.voltar": { pt: "Paridade", en: "Parity", es: "Paridad" },
  "paridade.modulo.naoEncontrado": {
    pt: "Não há módulo com esse nome.",
    en: "There is no module by that name.",
    es: "No hay un módulo con ese nombre.",
  },
  "paridade.modulo.responde": {
    pt: "Que pergunta este módulo responde",
    en: "What question this module answers",
    es: "Qué pregunta responde este módulo",
  },
  "paridade.modulo.comoLe": { pt: "Como o método chega lá", en: "How the method gets there", es: "Cómo llega el método hasta ahí" },
  "paridade.modulo.exatidao": {
    pt: "O que é exato e o que é aproximado",
    en: "What is exact and what is approximated",
    es: "Qué es exacto y qué es aproximado",
  },
  "paridade.modulo.testado": { pt: "O que foi testado", en: "What was tested", es: "Qué fue probado" },
  "paridade.modulo.divergencia": {
    pt: "Onde ainda não bate",
    en: "Where it still does not match",
    es: "Dónde todavía no coincide",
  },
  "paridade.modulo.semCasos.titulo": {
    pt: "Este módulo não foi comparado",
    en: "This module was not compared",
    es: "Este módulo no fue comparado",
  },
  "paridade.modulo.resultados.titulo": {
    pt: "O que cada caso devolveu",
    en: "What each case returned",
    es: "Qué devolvió cada caso",
  },
  "paridade.modulo.resultados.legenda": {
    pt: "A recomendação que o nosso motor produziu em cada caso, com a política de resposta fixa. Nos casos marcados como iguais, o sistema oficial chegou à mesma recomendação.",
    en: "The recommendation our engine produced for each case, under the fixed answering policy. In the cases marked as matching, the official system reached the same recommendation.",
    es: "La recomendación que produjo nuestro motor en cada caso, con la política de respuesta fija. En los casos marcados como iguales, el sistema oficial llegó a la misma recomendación.",
  },
  "paridade.modulo.nomeOficial": { pt: "Lá se chama", en: "Called there", es: "Allá se llama" },

  /* --- escolha -------------------------------------------------------------- */

  "paridade.mod.escolha.nome": { pt: "Escolha", en: "Choice", es: "Elección" },
  "paridade.mod.escolha.oficial": { pt: "Choice", en: "Choice", es: "Choice" },
  "paridade.mod.escolha.resumo": {
    pt: "Qual é a melhor alternativa.",
    en: "Which alternative is best.",
    es: "Cuál es la mejor alternativa.",
  },
  "paridade.mod.escolha.responde": {
    pt: "Você tem um conjunto de opções e precisa levar uma. Não interessa a ordem entre as que ficaram para trás, nem em que faixa elas caem: interessa qual sai na frente. É o caso do fornecedor que vai ser contratado, do equipamento que vai ser comprado, do local que vai receber a obra.",
    en: "You have a set of options and need to take one. The order among the ones left behind does not matter, nor which band they fall into: what matters is which comes out ahead. It is the supplier that gets hired, the equipment that gets bought, the site that gets the works.",
    es: "Usted tiene un conjunto de opciones y necesita llevarse una. No importa el orden entre las que quedaron atrás, ni en qué franja caen: importa cuál sale adelante. Es el caso del proveedor que va a ser contratado, del equipo que va a ser comprado, del lugar que va a recibir la obra.",
  },
  "paridade.mod.escolha.comoLe": {
    pt: "O método não pergunta pesos, porque ninguém sabe responder “quanto vale o prazo em relação ao custo” com um número. Em vez disso ele mantém o conjunto de alternativas que ainda poderiam ser a melhor, para algum vetor de pesos compatível com tudo o que você já respondeu — as potencialmente ótimas. Cada resposta corta um pedaço do espaço de pesos e o conjunto encolhe. Quando sobra uma, acabou. Se sobrarem várias empatadas dentro do limiar, também acabou: mais perguntas não separariam, e a tela diz isso em vez de continuar insistindo.",
    en: "The method does not ask for weights, because nobody can answer “how much is lead time worth against cost” with a number. Instead it keeps the set of alternatives that could still be the best, for some weight vector consistent with everything you have answered — the potentially optimal ones. Each answer cuts a slice off the weight space and the set shrinks. When one is left, it is done. If several are left tied within the threshold, it is also done: more questions would not separate them, and the screen says so instead of pressing on.",
    es: "El método no pregunta por las constantes de escala, porque nadie sabe responder “cuánto vale el plazo en relación al costo” con un número. En vez de eso mantiene el conjunto de alternativas que todavía podrían ser la mejor, para algún vector de constantes de escala compatible con todo lo que usted ya respondió — las potencialmente óptimas. Cada respuesta recorta un pedazo del espacio de constantes de escala y el conjunto se encoge. Cuando queda una, terminó. Si quedan varias empatadas dentro del límite, también terminó: más preguntas no las separarían, y la pantalla lo dice en vez de seguir insistiendo.",
  },
  "paridade.mod.escolha.exatidao": {
    pt: "Exato. Cada alternativa entra ou sai do conjunto por um programa linear, não por amostragem — a resposta é a mesma que se obteria varrendo o espaço de pesos inteiro.",
    en: "Exact. Each alternative enters or leaves the set through a linear program, not through sampling — the answer is the same you would get by sweeping the entire weight space.",
    es: "Exacto. Cada alternativa entra o sale del conjunto por un programa lineal, no por muestreo — la respuesta es la misma que se obtendría recorriendo todo el espacio de constantes de escala.",
  },
  "paridade.mod.escolha.testado": {
    pt: "É o módulo com mais casos, e o que mais variou de forma: de duas alternativas e dois critérios, que é o mínimo que o motor aceita, até vinte por cinco. Tem um caso com alternativa dominante, para ver se os dois encerram cedo do mesmo jeito, e um caso degenerado com três alternativas idênticas — que é onde o oficial trava e nós respondemos.",
    en: "It is the module with the most cases, and the one that varied most in shape: from two alternatives and two criteria, the minimum the engine accepts, up to twenty by five. It includes a case with a dominant alternative, to see whether both finish early in the same way, and a degenerate case with three identical alternatives — which is where the official hangs and we answer.",
    es: "Es el módulo con más casos, y el que más varió de forma: de dos alternativas y dos criterios, que es el mínimo que acepta el motor, hasta veinte por cinco. Tiene un caso con alternativa dominante, para ver si los dos terminan pronto de la misma manera, y un caso degenerado con tres alternativas idénticas — que es donde el oficial se traba y nosotros respondemos.",
  },

  /* --- ordenação ------------------------------------------------------------ */

  "paridade.mod.ordenacao.nome": { pt: "Ordenação", en: "Ranking", es: "Ordenación" },
  "paridade.mod.ordenacao.oficial": { pt: "Ranking", en: "Ranking", es: "Ranking" },
  "paridade.mod.ordenacao.resumo": {
    pt: "Em que ordem todas ficam.",
    en: "What order they all fall into.",
    es: "En qué orden quedan todas.",
  },
  "paridade.mod.ordenacao.responde": {
    pt: "Aqui não basta saber quem ganha. Você quer a fila inteira — para publicar um resultado de edital, distribuir recurso por posição, ou simplesmente para conseguir justificar por que o terceiro ficou em terceiro. É bem mais caro que a escolha, em perguntas: separar o primeiro do segundo costuma ser fácil, separar o sétimo do oitavo é o que consome a elicitação.",
    en: "Here knowing the winner is not enough. You want the whole queue — to publish a call's result, to allocate resources by position, or simply to be able to justify why third came third. It is much more expensive than choice, in questions: separating first from second is usually easy, separating seventh from eighth is what consumes the elicitation.",
    es: "Aquí no basta con saber quién gana. Usted quiere la fila entera — para publicar el resultado de una convocatoria, distribuir recursos por posición, o simplemente para poder justificar por qué el tercero quedó en tercer lugar. Es bastante más caro que la elección, en preguntas: separar el primero del segundo suele ser fácil, separar el séptimo del octavo es lo que consume la elicitación.",
  },
  "paridade.mod.ordenacao.comoLe": {
    pt: "A leitura é par a par: para cada par, o sistema pergunta se dá para afirmar que uma nunca fica atrás da outra, sob qualquer peso ainda admissível. Quando todo par está decidido, a ordem está pronta. Duas alternativas podem terminar empatadas, e nesse caso o que sai não é uma ordem estrita — é uma pré-ordem completa, com os empates declarados como empates. O oficial chama isso de “a complete pre-order has been found”, e nós dizemos o mesmo, porque fingir uma ordem estrita onde ela não existe seria inventar informação que o decisor não deu.",
    en: "The reading is pairwise: for each pair, the system asks whether one can be said never to fall behind the other, under any weights still admissible. Once every pair is decided, the order is ready. Two alternatives may end up tied, and then what comes out is not a strict order — it is a complete pre-order, with ties declared as ties. The official calls this “a complete pre-order has been found”, and we say the same, because faking a strict order where none exists would invent information the decision maker never gave.",
    es: "La lectura es por pares: para cada par, el sistema pregunta si se puede afirmar que una nunca queda detrás de la otra, bajo cualquier peso todavía admisible. Cuando todo par está decidido, el orden está listo. Dos alternativas pueden terminar empatadas, y en ese caso lo que sale no es un orden estricto — es un preorden completo, con los empates declarados como empates. El oficial llama a esto “a complete pre-order has been found”, y nosotros decimos lo mismo, porque fingir un orden estricto donde no existe sería inventar información que el decisor no dio.",
  },
  "paridade.mod.ordenacao.exatidao": {
    pt: "Exato, pelo mesmo motivo da escolha: cada par é decidido por programa linear.",
    en: "Exact, for the same reason as choice: each pair is decided by a linear program.",
    es: "Exacto, por el mismo motivo que la elección: cada par se decide por programa lineal.",
  },
  "paridade.mod.ordenacao.testado": {
    pt: "Cinco casos, de três a vinte alternativas. O de três tem preferências cruzadas de propósito — nenhuma alternativa domina outra por Pareto, então a ordem só sai da elicitação. É neste módulo que mora a divergência de uma pergunta que ainda não foi explicada.",
    en: "Five cases, from three to twenty alternatives. The three-alternative one has deliberately crossed preferences — no alternative Pareto-dominates another, so the order can only come out of the elicitation. This is the module where the one unexplained question of divergence lives.",
    es: "Cinco casos, de tres a veinte alternativas. El de tres tiene preferencias cruzadas a propósito — ninguna alternativa domina a otra por Pareto, así que el orden solo puede salir de la elicitación. Es en este módulo donde vive la divergencia de una pregunta que todavía no fue explicada.",
  },

  /* --- classificação -------------------------------------------------------- */

  "paridade.mod.classificacao.nome": { pt: "Classificação", en: "Sorting", es: "Clasificación" },
  "paridade.mod.classificacao.oficial": { pt: "Sorting", en: "Sorting", es: "Sorting" },
  "paridade.mod.classificacao.resumo": {
    pt: "Em que classe cada uma cai.",
    en: "Which class each one falls into.",
    es: "En qué clase cae cada una.",
  },
  "paridade.mod.classificacao.responde": {
    pt: "Aqui as alternativas não competem entre si. Cada uma é medida contra faixas fixas que você define antes — aprovado e reprovado, A/B/C, prioridade alta, média e baixa. Duas podem cair na mesma classe sem problema nenhum, e todas podem cair na mesma. É o caso da triagem de propostas, da classificação de risco de uma carteira de contratos, do enquadramento de fornecedores em faixas de homologação.",
    en: "Here the alternatives do not compete with each other. Each is measured against fixed bands you define beforehand — pass and fail, A/B/C, high, medium and low priority. Two may fall into the same class with no problem, and all of them may. It is the case for screening proposals, risk-rating a contract portfolio, or placing suppliers into approval bands.",
    es: "Aquí las alternativas no compiten entre sí. Cada una se mide contra franjas fijas que usted define de antemano — aprobado y reprobado, A/B/C, prioridad alta, media y baja. Dos pueden caer en la misma clase sin ningún problema, y todas pueden caer en la misma. Es el caso de la selección de propuestas, la clasificación de riesgo de una cartera de contratos, la ubicación de proveedores en franjas de homologación.",
  },
  "paridade.mod.classificacao.comoLe": {
    pt: "Você declara os cortes entre as classes. O sistema calcula a faixa em que o valor global de cada alternativa ainda pode estar, dado o que você já respondeu, e olha que classes essa faixa alcança. Enquanto a faixa cruzar um corte, a alternativa está indecisa e ainda há o que perguntar. Quando a faixa fica inteira dentro de uma classe — ou fica estreita demais para que qualquer pergunta futura a mova de lado —, a alternativa está classificada.",
    en: "You declare the cuts between classes. The system computes the range the global value of each alternative can still be in, given what you have answered, and looks at which classes that range reaches. While the range straddles a cut, the alternative is undecided and there is still something to ask. When the range sits entirely inside one class — or becomes too narrow for any future question to move it across — the alternative is classified.",
    es: "Usted declara los cortes entre las clases. El sistema calcula la franja en la que el valor global de cada alternativa todavía puede estar, dado lo que usted ya respondió, y observa qué clases alcanza esa franja. Mientras la franja cruce un corte, la alternativa está indecisa y todavía hay algo que preguntar. Cuando la franja queda entera dentro de una clase — o queda demasiado estrecha para que cualquier pregunta futura la mueva de lado —, la alternativa está clasificada.",
  },
  "paridade.mod.classificacao.exatidao": {
    pt: "Exato. Os extremos da faixa de valor saem de programas lineares, e a comparação com os cortes é aritmética.",
    en: "Exact. The ends of the value range come from linear programs, and comparing them against the cuts is arithmetic.",
    es: "Exacto. Los extremos de la franja de valor salen de programas lineales, y la comparación con los cortes es aritmética.",
  },
  "paridade.mod.classificacao.testado": {
    pt: "Três casos, de quatro a vinte alternativas, todos com três classes e dois cortes. Foi aqui que apareceu a divergência mais difícil de fechar: a regra certa não é sobre quanto a faixa atravessa o corte, e sim sobre quão estreita ela já é. Levou duas medições a mais para acertar — a primeira tentativa foi por analogia, sem medir, e errou por muito.",
    en: "Three cases, from four to twenty alternatives, all with three classes and two cuts. This is where the hardest divergence to close appeared: the right rule is not about how far the range crosses the cut, but about how narrow it already is. It took two extra measurements to get right — the first attempt was by analogy, without measuring, and missed badly.",
    es: "Tres casos, de cuatro a veinte alternativas, todos con tres clases y dos cortes. Fue aquí donde apareció la divergencia más difícil de cerrar: la regla correcta no es sobre cuánto la franja atraviesa el corte, sino sobre cuán estrecha ya es. Tomó dos mediciones adicionales acertar — el primer intento fue por analogía, sin medir, y falló bastante.",
  },

  /* --- portfólio combinatorial ---------------------------------------------- */

  "paridade.mod.combinatorial.nome": {
    pt: "Portfólio (Combinatorial)",
    en: "Portfolio (Combinatorial)",
    es: "Portafolio (Combinatorial)",
  },
  "paridade.mod.combinatorial.oficial": {
    pt: "Portfólio (Combinatorial)",
    en: "Portfolio (Combinatorial)",
    es: "Portfolio (Combinatorial)",
  },
  "paridade.mod.combinatorial.resumo": {
    pt: "Que conjunto levar dentro do orçamento.",
    en: "Which set to take within the budget.",
    es: "Qué conjunto llevar dentro del presupuesto.",
  },
  "paridade.mod.combinatorial.responde": {
    pt: "Não é escolher a melhor, é escolher o melhor conjunto. Os projetos disputam um orçamento comum, e o melhor conjunto quase nunca é o dos melhores projetos individualmente: um projeto excelente e caro pode custar dois projetos bons que juntos rendem mais. É o caso da carteira de investimentos, do plano de obras do ano, da seleção de propostas dentro de um edital com teto.",
    en: "It is not picking the best, it is picking the best set. The projects compete for one shared budget, and the best set is almost never the set of individually best projects: one excellent, expensive project can cost as much as two good ones that together yield more. It is the case for an investment portfolio, a year's works plan, or selecting proposals under a capped call.",
    es: "No se trata de elegir el mejor, se trata de elegir el mejor conjunto. Los proyectos compiten por un presupuesto común, y el mejor conjunto casi nunca es el de los mejores proyectos individualmente: un proyecto excelente y caro puede costar lo mismo que dos proyectos buenos que juntos rinden más. Es el caso de la cartera de inversiones, del plan de obras del año, de la selección de propuestas dentro de una convocatoria con techo.",
  },
  "paridade.mod.combinatorial.comoLe": {
    pt: "O espaço deixa de ser de alternativas e passa a ser de subconjuntos — com 20 projetos, mais de um milhão deles. Para cada vetor de pesos amostrado do espaço viável, o sistema resolve qual conjunto maximiza o benefício agregado sem estourar o orçamento, e a carteira apresentada é a que se sustenta ao longo do espaço.",
    en: "The space stops being one of alternatives and becomes one of subsets — with 20 projects, over a million of them. For each weight vector sampled from the feasible space, the system solves which set maximises aggregate benefit without exceeding the budget, and the portfolio presented is the one that holds up across the space.",
    es: "El espacio deja de ser de alternativas y pasa a ser de subconjuntos — con 20 proyectos, más de un millón de ellos. Para cada vector de constantes de escala muestreado del espacio factible, el sistema resuelve qué conjunto maximiza el beneficio agregado sin exceder el presupuesto, y la cartera presentada es la que se sostiene a lo largo del espacio.",
  },
  "paridade.mod.combinatorial.exatidao": {
    pt: "Aproximado, e a tela diz isso junto do resultado, não só aqui. A carteira sai por amostragem de vértices do espaço de pesos, porque a seleção ótima depende da ordem completa dos projetos e essa ordem depende do vetor de pesos — resolver exatamente seria programação bilinear, que não tem solução barata no caso geral.",
    en: "Approximated, and the screen says so next to the result, not just here. The portfolio comes from sampling vertices of the weight space, because the optimal selection depends on the full ordering of the projects and that ordering depends on the weight vector — solving it exactly would be bilinear programming, which has no cheap solution in the general case.",
    es: "Aproximado, y la pantalla lo dice junto al resultado, no solo aquí. La cartera sale por muestreo de vértices del espacio de constantes de escala, porque la selección óptima depende del orden completo de los proyectos y ese orden depende del vector de constantes de escala — resolverlo exactamente sería programación bilineal, que no tiene solución barata en el caso general.",
  },
  "paridade.mod.combinatorial.semCasos": {
    pt: "Este é o único dos cinco sem um único caso medido dos dois lados, e é uma limitação da comparação, não do módulo. No sistema de referência ele não responde durante a sessão: depois da matriz, o cálculo entra numa fila e o resultado chega por e-mail. O robô que conduz a comparação não tem como acompanhar isso — ele precisa ver a próxima tela para saber que o passo funcionou. Enumerar carteiras offline é uma decisão de arquitetura deles, e é legítima; só torna a comparação passo a passo impossível do jeito que ela é feita nos outros quatro módulos.",
    en: "This is the only one of the five without a single case measured on both sides, and that is a limitation of the comparison, not of the module. On the reference system it does not answer during the session: after the matrix, the computation joins a queue and the result arrives by e-mail. The robot driving the comparison cannot follow that — it needs to see the next screen to know the step worked. Enumerating portfolios offline is an architectural decision of theirs, and a legitimate one; it just makes the step-by-step comparison impossible in the way it is done for the other four modules.",
    es: "Este es el único de los cinco sin un solo caso medido en los dos lados, y es una limitación de la comparación, no del módulo. En el sistema de referencia no responde durante la sesión: después de la matriz, el cálculo entra en una cola y el resultado llega por correo. El robot que conduce la comparación no tiene cómo seguir eso — necesita ver la próxima pantalla para saber que el paso funcionó. Enumerar carteras offline es una decisión de arquitectura de ellos, y es legítima; solo hace que la comparación paso a paso sea imposible de la manera en que se hace en los otros cuatro módulos.",
  },
  "paridade.mod.combinatorial.testado": {
    pt: "Contra o sistema oficial, nada. O módulo tem os seus próprios testes de motor, incluindo a verificação de que a carteira devolvida respeita o orçamento e de que nenhum subconjunto amostrado supera a escolhida, mas isso é teste nosso contra nós mesmos — não é paridade.",
    en: "Against the official system, nothing. The module has its own engine tests, including checks that the returned portfolio respects the budget and that no sampled subset beats the chosen one, but that is us testing against ourselves — it is not parity.",
    es: "Contra el sistema oficial, nada. El módulo tiene sus propias pruebas de motor, incluyendo la verificación de que la cartera devuelta respeta el presupuesto y de que ningún subconjunto muestreado supera al elegido, pero eso es una prueba nuestra contra nosotros mismos — no es paridad.",
  },

  /* --- benefício-custo ------------------------------------------------------ */

  "paridade.mod.beneficio-custo.nome": {
    pt: "Portfólio (Benefit-to-Cost)",
    en: "Portfolio (Benefit-to-Cost)",
    es: "Portafolio (Benefit-to-Cost)",
  },
  "paridade.mod.beneficio-custo.oficial": {
    pt: "Portfólio (Benefit-to-Cost)",
    en: "Portfolio (Benefit-to-Cost)",
    es: "Portfolio (Benefit-to-Cost)",
  },
  "paridade.mod.beneficio-custo.resumo": {
    pt: "Que projetos rendem mais por real gasto.",
    en: "Which projects return most per unit spent.",
    es: "Qué proyectos rinden más por unidad gastada.",
  },
  "paridade.mod.beneficio-custo.responde": {
    pt: "A matéria-prima é a mesma da carteira combinatorial — projetos, benefícios, custos, orçamento — e a pergunta parece a mesma, mas o critério é outro. Aqui você ordena os projetos pela razão entre benefício e custo e vai levando nessa ordem enquanto o dinheiro durar. Quem quer eficiência por unidade de recurso quer este; quem quer o melhor conjunto possível quer o combinatorial. Os dois podem devolver carteiras diferentes para os mesmos dados, e isso não é defeito de nenhum dos dois.",
    en: "The raw material is the same as the combinatorial portfolio — projects, benefits, costs, budget — and the question looks the same, but the criterion is different. Here you order the projects by the ratio of benefit to cost and take them in that order while the money lasts. Whoever wants efficiency per unit of resource wants this one; whoever wants the best possible set wants the combinatorial one. The two can return different portfolios for the same data, and that is not a fault in either.",
    es: "La materia prima es la misma que la cartera combinatorial — proyectos, beneficios, costos, presupuesto — y la pregunta parece la misma, pero el criterio es otro. Aquí usted ordena los proyectos por la razón entre beneficio y costo y va llevando en ese orden mientras el dinero alcance. Quien quiere eficiencia por unidad de recurso quiere este; quien quiere el mejor conjunto posible quiere el combinatorial. Los dos pueden devolver carteras diferentes para los mismos datos, y eso no es un defecto de ninguno de los dos.",
  },
  "paridade.mod.beneficio-custo.comoLe": {
    pt: "A faixa da razão de cada projeto sai direto por programa linear: o custo é constante e o valor global é linear nos pesos, logo a razão também é, e os seus extremos sobre o espaço viável são obteníveis sem amostrar nada. Quando as faixas de dois projetos não se sobrepõem, a ordem entre eles está decidida e nenhuma pergunta futura a muda — e isso é conferível na tela, olhando as barras.",
    en: "Each project's ratio range comes straight out of a linear program: the cost is constant and the global value is linear in the weights, so the ratio is too, and its extremes over the feasible space are obtainable without sampling anything. When two projects' ranges do not overlap, the order between them is settled and no future question changes it — and that is checkable on screen, by looking at the bars.",
    es: "La franja de la razón de cada proyecto sale directo de un programa lineal: el costo es constante y el valor global es lineal en las constantes de escala, luego la razón también lo es, y sus extremos sobre el espacio factible se obtienen sin muestrear nada. Cuando las franjas de dos proyectos no se sobreponen, el orden entre ellos está decidido y ninguna pregunta futura lo cambia — y eso es verificable en la pantalla, mirando las barras.",
  },
  "paridade.mod.beneficio-custo.exatidao": {
    pt: "Misto, e a distinção importa o bastante para estar na tela do resultado. As faixas de razão e a dominância entre faixas disjuntas são exatas, por programação linear. A carteira final é aproximada por amostragem, pelo mesmo motivo da combinatorial: a seleção gulosa depende da ordem completa, e a ordem depende do vetor de pesos.",
    en: "Mixed, and the distinction matters enough to appear on the result screen. The ratio ranges and the dominance between disjoint ranges are exact, by linear programming. The final portfolio is approximated by sampling, for the same reason as the combinatorial one: greedy selection depends on the full ordering, and the ordering depends on the weight vector.",
    es: "Mixto, y la distinción importa lo suficiente como para estar en la pantalla del resultado. Las franjas de razón y la dominancia entre franjas disjuntas son exactas, por programación lineal. La cartera final es aproximada por muestreo, por el mismo motivo que la combinatorial: la selección voraz depende del orden completo, y el orden depende del vector de constantes de escala.",
  },
  "paridade.mod.beneficio-custo.testado": {
    pt: "Dois casos, de oito e vinte projetos. Nos dois a carteira é idêntica à do sistema oficial, conferida projeto a projeto — e no de vinte isso significa concordar sobre um subconjunto entre mais de um milhão. O que diverge é quantas perguntas cada um faz antes de parar, e não o que cada um responde.",
    en: "Two cases, of eight and twenty projects. In both the portfolio is identical to the official system's, checked project by project — and in the twenty-project one that means agreeing on one subset out of more than a million. What differs is how many questions each asks before stopping, not what each answers.",
    es: "Dos casos, de ocho y veinte proyectos. En los dos la cartera es idéntica a la del sistema oficial, verificada proyecto por proyecto — y en el de veinte eso significa concordar en un subconjunto entre más de un millón. Lo que diverge es cuántas preguntas hace cada uno antes de detenerse, no lo que cada uno responde.",
  },
});
