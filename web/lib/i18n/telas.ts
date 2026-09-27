/**
 * Catálogo das páginas: a home, a tela de decisão estruturada e o chat.
 *
 * Só o que a página escreve por conta própria mora aqui. Título de seção,
 * rótulo de botão, conteúdo de dica e atributo `title` são texto de interface e
 * entram; nome de alternativa, de critério e de decisão são dado do usuário e
 * não. `analise.resumo`, `analise.ressalva`, a leitura da auditoria e as
 * declarações vêm do servidor já redigidas, então passar por aqui só
 * duplicaria a tradução no lugar errado.
 *
 * Quatro escolhas que valem explicação:
 *
 * **`pesos` em português, `scaling constants` em inglês.** O termo que o
 * decisor brasileiro reconhece é "peso"; o termo da literatura do método em
 * inglês é `scaling constant`. Traduzir "peso" por "weight" acerta o
 * dicionário e erra a área: quem leu De Almeida et al. lê "weights" como sinal
 * de que quem escreveu não conhece o método.
 *
 * **Os quatro objetivos, em inglês, são os nomes da literatura.** Na home,
 * "escolher a melhor, ordenar todas, classificar em faixas ou montar uma
 * carteira" vira `Choice, Ranking, Sorting or Portfolio` - em inglês esses são
 * os nomes próprios das problemáticas, e a paráfrase soaria como se fossem
 * quatro funcionalidades inventadas aqui.
 *
 * **Frases quebradas por um elemento no meio têm chave por pedaço.** O aviso
 * do chat tem um `<code>` e um link dentro; o texto é dividido nos pontos onde
 * o elemento entra, e não numa tradução por palavra. Cada pedaço ainda é uma
 * oração inteira em todo idioma.
 *
 * **Sem travessão em nenhum idioma.** Onde o português usava "—", o catálogo
 * usa hífen: o travessão é raro em inglês de produto e a mistura dos dois
 * numa mesma tela fica visível.
 */

import { registrar } from "./index";
import "./nucleo";

export const TELAS = registrar({
  // --- home -----------------------------------------------------------------
  /* As quatro legendas da demonstração: o conjunto encolhendo a cada resposta.
     Minúscula inicial de propósito, são legenda e não frase. */
  "tela.home.demo.passo1": {
    pt: "no começo, quatro candidatos",
    en: "at the start, four candidates",
    es: "al comienzo, cuatro candidatos",
  },
  "tela.home.demo.passo2": {
    pt: "você compara duas situações",
    en: "you compare two situations",
    es: "usted compara dos situaciones",
  },
  "tela.home.demo.passo3": { pt: "e outra vez", en: "and again", es: "y otra vez" },
  "tela.home.demo.passo4": {
    pt: "sobra uma. essa é a sua.",
    en: "one is left. that one is yours.",
    es: "queda una. esa es la suya.",
  },
  "tela.home.demo.legenda": {
    pt: "Em geral bastam de duas a cinco comparações.",
    en: "Two to five comparisons are usually enough.",
    es: "En general bastan de dos a cinco comparaciones.",
  },

  "tela.home.titulo": {
    pt: "Escolha sem precisar dizer quanto vale cada coisa.",
    en: "Choose without having to say what each thing is worth.",
    es: "Elija sin tener que decir cuánto vale cada cosa.",
  },
  "tela.home.descricao": {
    pt: "Atribuir peso a critérios é difícil e as pessoas erram nisso. O método FITradeoff não pede pesos: pede que você compare duas situações concretas e diga qual prefere. Com poucas respostas ele chega a uma recomendação - e registra o caminho, para quando alguém perguntar por quê.",
    en: "Assigning weight to criteria is hard, and people get it wrong. The FITradeoff method does not ask for scaling constants: it asks you to compare two concrete situations and say which one you prefer. A few answers are enough to reach a recommendation - and it records the path, for when someone asks why.",
    es: "Asignar peso a los criterios es difícil y las personas se equivocan en eso. El método FITradeoff no pide constantes de escala: pide que usted compare dos situaciones concretas y diga cuál prefiere. Con pocas respuestas llega a una recomendación - y registra el camino, para cuando alguien pregunte por qué.",
  },
  "tela.home.acao.decisao": {
    pt: "Começar uma decisão",
    en: "Start a decision",
    es: "Comenzar una decisión",
  },
  "tela.home.acao.chat": {
    pt: "Descrever em conversa",
    en: "Describe it in a conversation",
    es: "Describir en una conversación",
  },
  "tela.home.acao.ajuda": {
    pt: "As duas entradas levam ao mesmo método. A conversa ajuda quando o problema ainda não está organizado.",
    en: "Both ways in lead to the same method. The conversation helps when the problem is not organized yet.",
    es: "Las dos entradas llevan al mismo método. La conversación ayuda cuando el problema todavía no está organizado.",
  },

  "tela.home.pratica.titulo": {
    pt: "O que isso muda na prática",
    en: "What this changes in practice",
    es: "Qué cambia esto en la práctica",
  },
  "tela.home.pratica.pesos.titulo": {
    pt: "Você não atribui pesos",
    en: "You do not assign scaling constants",
    es: "Usted no asigna constantes de escala",
  },
  "tela.home.pratica.pesos.texto": {
    pt: "Só diz qual de duas situações prefere. O peso de cada critério é deduzido das suas respostas.",
    en: "You only say which of two situations you prefer. Each criterion's scaling constant is inferred from your answers.",
    es: "Solo dice cuál de dos situaciones prefiere. La constante de escala de cada criterio se deduce de sus respuestas.",
  },
  "tela.home.pratica.registro.titulo": {
    pt: "A decisão fica registrada",
    en: "The decision is on record",
    es: "La decisión queda registrada",
  },
  "tela.home.pratica.registro.texto": {
    pt: "Cada resposta vira uma linha em português, com autor e horário. O resultado sai com a trilha que o sustenta.",
    en: "Every answer becomes a line in plain language, with author and time. The result comes out with the trail that backs it.",
    es: "Cada respuesta se convierte en una línea en lenguaje claro, con autor y horario. El resultado sale con la trazabilidad que lo respalda.",
  },
  "tela.home.pratica.objetivos.titulo": {
    pt: "Uma elicitação, quatro objetivos",
    en: "One elicitation, four goals",
    es: "Una elicitación, cuatro objetivos",
  },
  "tela.home.pratica.objetivos.texto": {
    pt: "Escolher a melhor, ordenar todas, classificar em faixas ou montar uma carteira - sem responder nada de novo.",
    en: "Choice, Ranking, Sorting or Portfolio - without answering anything again.",
    es: "Choice, Ranking, Sorting o Portfolio - sin responder nada de nuevo.",
  },
  "tela.home.pratica.parar.titulo": {
    pt: "Dá para parar no meio",
    en: "You can stop partway",
    es: "Se puede parar a mitad de camino",
  },
  "tela.home.pratica.parar.texto": {
    pt: "Se o conjunto já estiver pequeno, você olha as faixas de valor e decide pelos dados.",
    en: "If the set is already small, you look at the value ranges and decide from the data.",
    es: "Si el conjunto ya es pequeño, usted mira las franjas de valor y decide por los datos.",
  },

  "tela.home.rodape": {
    pt: "Método publicado por De Almeida et al. (2016). Implementação independente, sem vínculo com o sistema oficial do CDSID-UFPE.",
    en: "Method published by De Almeida et al. (2016). Independent implementation, unaffiliated with the official CDSID-UFPE system.",
    es: "Método publicado por De Almeida et al. (2016). Implementación independiente, sin vínculo con el sistema oficial del CDSID-UFPE.",
  },

  // --- tela de decisão: moldura ---------------------------------------------
  "tela.decisao.nova": { pt: "Nova decisão", en: "New decision", es: "Nueva decisión" },
  "tela.decisao.outra": { pt: "Outra decisão", en: "Another decision", es: "Otra decisión" },
  /* Nosso texto, não mensagem do servidor: o 404 da API é traduzido aqui
     porque a causa é local (o link aponta para algo que não existe mais). */
  "tela.decisao.erro.naoExiste": {
    pt: "Essa decisão não existe mais. Comece uma nova.",
    en: "This decision no longer exists. Start a new one.",
    es: "Esa decisión ya no existe. Comience una nueva.",
  },

  // --- tela de decisão: dados do problema -----------------------------------
  "tela.decisao.dados.titulo": {
    pt: "Dados do problema",
    en: "Problem data",
    es: "Datos del problema",
  },
  "tela.decisao.voltarAoQueFazia": {
    pt: "voltar ao que eu estava fazendo",
    en: "back to what I was doing",
    es: "volver a lo que estaba haciendo",
  },
  "tela.decisao.dados.imutaveis": {
    pt: "Para mudar os dados, comece outra decisão - alterar os números agora invalidaria as respostas que você já deu.",
    en: "To change the data, start another decision - changing the numbers now would invalidate the answers you have already given.",
    es: "Para cambiar los datos, comience otra decisión - alterar los números ahora invalidaría las respuestas que usted ya dio.",
  },

  "tela.decisao.curvas.titulo": {
    pt: "Como o valor cresce em cada critério",
    en: "How value grows in each criterion",
    es: "Cómo crece el valor en cada criterio",
  },
  "tela.decisao.curvas.ajuda": {
    pt: "Por padrão o método assume crescimento linear. Se num critério os primeiros ganhos valem mais que os últimos, vale ajustar.",
    en: "By default the method assumes linear growth. If in some criterion the first gains are worth more than the last ones, it is worth adjusting.",
    es: "Por defecto el método asume crecimiento lineal. Si en un criterio las primeras ganancias valen más que las últimas, vale la pena ajustar.",
  },
  "tela.decisao.curva.linear": { pt: "linear", en: "linear", es: "lineal" },
  /* Uma curva salva tem os dois extremos mais ao menos um ponto elicitado, ou
     ela não é curva e some da tela. O singular é inalcançável e não tem chave:
     chave morta no catálogo dá a impressão de que alguém esqueceu de usá-la. */
  "tela.decisao.curva.pontos": {
    pt: "curva com {n} pontos",
    en: "curve with {n} points",
    es: "curva con {n} puntos",
  },
  "tela.decisao.curva.ajustar": { pt: "ajustar", en: "adjust", es: "ajustar" },
  "tela.decisao.curvas.dica.titulo": {
    pt: "Para que serve a curva",
    en: "What the curve is for",
    es: "Para qué sirve la curva",
  },
  "tela.decisao.curvas.dica.corpo1": {
    pt: "O método não supõe que valor cresça em linha reta com o desempenho: ir de 30 para 25 dias pode valer muito mais do que ir de 15 para 10.",
    en: "The method does not assume value grows linearly with performance: going from 30 to 25 days may be worth much more than going from 15 to 10.",
    es: "El método no supone que el valor crezca en línea recta con el desempeño: ir de 30 a 25 días puede valer mucho más que ir de 15 a 10.",
  },
  "tela.decisao.curvas.dica.corpo2": {
    pt: "Declarar a curva é opcional. Sem ela vale a reta, que é uma escolha legítima — e só dá para mudar antes de as perguntas começarem.",
    en: "Declaring the curve is optional. Without it the straight line applies, which is a legitimate choice — and it can only be changed before the questions start.",
    es: "Declarar la curva es opcional. Sin ella vale la recta, que es una elección legítima — y solo se puede cambiar antes de que empiecen las preguntas.",
  },
  "tela.decisao.curvas.todasLineares": {
    pt: "todas lineares",
    en: "all linear",
    es: "todas lineales",
  },
  "tela.decisao.curvas.ajustada.uma": {
    pt: "{n} ajustada",
    en: "{n} adjusted",
    es: "{n} ajustada",
  },
  "tela.decisao.curvas.ajustada.varias": {
    pt: "{n} ajustadas",
    en: "{n} adjusted",
    es: "{n} ajustadas",
  },
  "tela.decisao.curvas.abrir": { pt: "ver", en: "show", es: "ver" },
  "tela.decisao.curvas.fechar": { pt: "fechar", en: "hide", es: "ocultar" },
  "tela.decisao.curvas.seguirLinear": {
    pt: "Seguir sem mexer mantém todos lineares — é o padrão, e é uma escolha, não um esquecimento.",
    en: "Moving on without changing anything keeps them all linear — that is the default, and it is a choice, not an oversight.",
    es: "Seguir sin cambiar nada mantiene todas lineales — es el valor predeterminado, y es una elección, no un olvido.",
  },

  // --- tela de decisão: ordem e perguntas -----------------------------------
  "tela.decisao.voltarSemMudarOrdem": {
    pt: "voltar sem mudar a ordem",
    en: "back without changing the order",
    es: "volver sin cambiar el orden",
  },
  "tela.decisao.pergunta.numero": {
    pt: "Pergunta {n}",
    en: "Question {n}",
    es: "Pregunta {n}",
  },
  "tela.decisao.indiferentes": {
    pt: "são indiferentes",
    en: "they are indifferent",
    es: "son indiferentes",
  },
  "tela.decisao.naoSei": { pt: "não sei", en: "I don't know", es: "no sé" },
  "tela.decisao.naoSei.titulo": {
    pt: "Encerra este par sem assumir nada sobre os pesos",
    en: "Ends this pair without assuming anything about the scaling constants",
    es: "Cierra este par sin asumir nada sobre las constantes de escala",
  },
  /* A distinção que mais confunde quem chega ao método: "não sei" e "são
     indiferentes" parecem a mesma desistência, e são opostos. Uma afirma, a
     outra se cala. Dizer isso uma vez, no lugar certo, evita a resposta errada. */
  "tela.decisao.naoSei.dica.titulo": {
    pt: "Não sei responder",
    en: "I don't know how to answer",
    es: "No sé responder",
  },
  "tela.decisao.naoSei.dica.corpo1": {
    pt: "Use quando a comparação não fizer sentido para você. O par se encerra e a pergunta não volta.",
    en: "Use this when the comparison does not make sense to you. The pair ends and the question does not come back.",
    es: "Use esto cuando la comparación no tenga sentido para usted. El par se cierra y la pregunta no vuelve.",
  },
  "tela.decisao.naoSei.dica.corpo2": {
    pt: "Diferente de “são indiferentes”: aquela afirma que as duas valem o mesmo e restringe os pesos; esta não afirma nada, então nada é deduzido a partir dela.",
    en: "Different from “they are indifferent”: that one states both are worth the same and constrains the scaling constants; this one states nothing, so nothing is inferred from it.",
    es: "Diferente de “son indiferentes”: aquella afirma que las dos valen lo mismo y restringe las constantes de escala; esta no afirma nada, así que no se deduce nada a partir de ella.",
  },
  "tela.decisao.indiferentes.dica.titulo": {
    pt: "São indiferentes",
    en: "They are indifferent",
    es: "Son indiferentes",
  },
  "tela.decisao.indiferentes.dica.corpo1": {
    pt: "As duas situações valem exatamente o mesmo para você. Os dois lados puxam com a mesma força.",
    en: "Both situations are worth exactly the same to you. Both sides pull with equal force.",
    es: "Las dos situaciones valen exactamente lo mismo para usted. Los dos lados tiran con la misma fuerza.",
  },
  "tela.decisao.indiferentes.dica.corpo2": {
    pt: "É uma resposta como A ou B, não uma forma de pular: ela restringe os pesos tanto quanto escolher um lado.",
    en: "It is an answer like A or B, not a way to skip: it constrains the scaling constants as much as picking a side.",
    es: "Es una respuesta como A o B, no una forma de saltar: restringe las constantes de escala tanto como elegir un lado.",
  },
  "tela.decisao.conflito.titulo": {
    pt: "Precisa da sua decisão",
    en: "Needs your decision",
    es: "Necesita su decisión",
  },

  // --- tela de decisão: comparação ------------------------------------------
  "tela.decisao.comparar.titulo": {
    pt: "Comparar as alternativas",
    en: "Compare the alternatives",
    es: "Comparar las alternativas",
  },
  /* Vira nome de arquivo PNG. O `{nome}` é o nome que o decisor deu à decisão
     e não se traduz; só o sufixo muda de idioma. */
  "tela.decisao.comparar.arquivo": {
    pt: "{nome} - comparação",
    en: "{nome} - comparison",
    es: "{nome} - comparación",
  },
  "tela.decisao.encerrar": {
    pt: "já decidi, encerrar",
    en: "I have decided, finish",
    es: "ya decidí, terminar",
  },
  "tela.decisao.encerrar.titulo": {
    pt: "Para de perguntar e mostra o resultado com o que já foi respondido",
    en: "Stops asking and shows the result from what has been answered so far",
    es: "Deja de preguntar y muestra el resultado con lo que ya fue respondido",
  },

  // --- tela de decisão: resultado -------------------------------------------
  "tela.decisao.ondeEstamos": { pt: "Onde estamos", en: "Where we stand", es: "Dónde estamos" },
  "tela.decisao.voltarAResponder": {
    pt: "voltar a responder",
    en: "go back to answering",
    es: "volver a responder",
  },

  "tela.decisao.faixasValor.titulo": {
    pt: "Valor global possível de cada alternativa",
    en: "Possible global value of each alternative",
    es: "Valor global posible de cada alternativa",
  },
  "tela.decisao.faixasValor.dica.titulo": {
    pt: "Por que um intervalo",
    en: "Why a range",
    es: "Por qué un intervalo",
  },
  "tela.decisao.faixasValor.dica.corpo1": {
    pt: "Como você ainda não fixou os pesos, o valor de cada alternativa não é um número: é uma faixa.",
    en: "Since you have not fixed the scaling constants, each alternative's value is not a number: it is a range.",
    es: "Como usted todavía no fijó las constantes de escala, el valor de cada alternativa no es un número: es una franja.",
  },
  "tela.decisao.faixasValor.dica.corpo2": {
    pt: "Faixas que não se sobrepõem já decidem. Quando se cruzam, ainda falta informação.",
    en: "Ranges that do not overlap already decide. Where they cross, information is still missing.",
    es: "Las franjas que no se sobreponen ya deciden. Cuando se cruzan, todavía falta información.",
  },

  "tela.decisao.faixasPeso.titulo": {
    pt: "Peso ainda possível de cada critério",
    en: "Scaling constant still possible for each criterion",
    es: "Constante de escala todavía posible de cada criterio",
  },
  "tela.decisao.faixasPeso.dica.titulo": {
    pt: "Os pesos que você nunca informou",
    en: "The scaling constants you never stated",
    es: "Las constantes de escala que usted nunca informó",
  },
  "tela.decisao.faixasPeso.dica.corpo1": {
    pt: "O método deduz estas faixas das suas respostas. Você não precisou arbitrar nenhum número.",
    en: "The method infers these ranges from your answers. You did not have to pick any number yourself.",
    es: "El método deduce estas franjas de sus respuestas. Usted no tuvo que arbitrar ningún número.",
  },
  "tela.decisao.faixasPeso.dica.corpo2": {
    pt: "Quanto mais você responde, mais elas estreitam.",
    en: "The more you answer, the narrower they get.",
    es: "Cuanto más responde, más se estrechan.",
  },

  "tela.decisao.sensibilidade.titulo": {
    pt: "Quanto isso depende dos dados",
    en: "How much this depends on the data",
    es: "Cuánto depende esto de los datos",
  },
  "tela.decisao.auditoria.titulo": {
    pt: "Por que este resultado",
    en: "Why this result",
    es: "Por qué este resultado",
  },

  // --- chat -----------------------------------------------------------------
  "tela.chat.titulo": { pt: "Chat de decisões", en: "Decision chat", es: "Chat de decisiones" },
  "tela.chat.editorial": { pt: "Assistente guiado", en: "Guided assistant", es: "Asistente guiado" },
  "tela.chat.descricao": {
    pt: "Descreva o que precisa decidir. O agente monta o modelo e conduz a elicitação pelo método - as respostas continuam sendo suas.",
    en: "Describe what you need to decide. The agent builds the model and runs the elicitation by the method - the answers are still yours.",
    es: "Describa lo que necesita decidir. El agente arma el modelo y conduce la elicitación por el método - las respuestas siguen siendo suyas.",
  },

  /* A instrução de configuração envolve o nome da variável em <code>, por isso
     só o trecho anterior e o posterior ficam no catálogo. */
  "tela.chat.semChave.aviso": {
    pt: "O chat precisa de uma chave da API da Anthropic para funcionar.",
    en: "The chat needs an Anthropic API key to work.",
    es: "El chat necesita una clave de la API de Anthropic para funcionar.",
  },
  "tela.chat.semChave.titulo": {
    pt: "O assistente está indisponível neste ambiente",
    en: "The assistant is unavailable in this environment",
    es: "El asistente no está disponible en este entorno",
  },
  "tela.chat.semChave.configuracao.antes": {
    pt: "Defina",
    en: "Set",
    es: "Defina",
  },
  "tela.chat.semChave.configuracao.depois": {
    pt: "no ambiente da API e reinicie o servidor.",
    en: "in the API environment and restart the server.",
    es: "en el entorno de la API y reinicie el servidor.",
  },
  "tela.chat.semChave.acao": {
    pt: "Abrir decisão estruturada",
    en: "Open structured decision",
    es: "Abrir decisión estructurada",
  },
  "tela.chat.alternativa.titulo": {
    pt: "Continue pelo fluxo estruturado",
    en: "Continue with the structured flow",
    es: "Continúe por el flujo estructurado",
  },
  "tela.chat.alternativa.item1": {
    pt: "As mesmas problemáticas e etapas do método.",
    en: "The same problem types and method steps.",
    es: "Las mismas problemáticas y etapas del método.",
  },
  "tela.chat.alternativa.item2": {
    pt: "Controle direto sobre alternativas, critérios e desempenhos.",
    en: "Direct control over alternatives, criteria and performances.",
    es: "Control directo sobre alternativas, criterios y desempeños.",
  },
  "tela.chat.alternativa.item3": {
    pt: "Resultados, sensibilidade e trilha de auditoria completos.",
    en: "Complete results, sensitivity analysis and audit trail.",
    es: "Resultados, sensibilidad y trazabilidad de auditoría completos.",
  },

  /* Sugestões de primeira mensagem. Em inglês são reescritas, não traduzidas:
     precisam soar como alguém digitando. */
  "tela.chat.sugestao1": {
    pt: "Preciso escolher entre quatro fornecedores olhando custo, prazo e qualidade.",
    en: "I need to choose among four suppliers looking at cost, lead time and quality.",
    es: "Necesito elegir entre cuatro proveedores mirando costo, plazo y calidad.",
  },
  "tela.chat.sugestao2": {
    pt: "Tenho três propostas de software para comparar. Me ajuda a decidir?",
    en: "I have three software proposals to compare. Can you help me decide?",
    es: "Tengo tres propuestas de software para comparar. ¿Me ayudas a decidir?",
  },
  "tela.chat.sugestao3": {
    pt: "Quero ordenar seis projetos por prioridade, não só escolher um.",
    en: "I want to rank six projects by priority, not just pick one.",
    es: "Quiero ordenar seis proyectos por prioridad, no solo elegir uno.",
  },
  "tela.chat.sugestoes.titulo": {
    pt: "Comece descrevendo uma decisão",
    en: "Start by describing a decision",
    es: "Comience describiendo una decisión",
  },

  /* Prefixo do rastro de ferramentas; a lista e as setas são montadas no
     componente, porque são pontuação e não texto. */
  "tela.chat.metodoAplicado": {
    pt: "método aplicado:",
    en: "method applied:",
    es: "método aplicado:",
  },
  "tela.chat.pensando": { pt: "pensando…", en: "thinking…", es: "pensando…" },
  "tela.chat.entrada": {
    pt: "O que você precisa decidir?",
    en: "What do you need to decide?",
    es: "¿Qué necesita decidir?",
  },
  "tela.chat.enviar": { pt: "Enviar", en: "Send", es: "Enviar" },
  "tela.chat.emAndamento": {
    pt: "decisão em andamento:",
    en: "decision in progress:",
    es: "decisión en curso:",
  },
});
