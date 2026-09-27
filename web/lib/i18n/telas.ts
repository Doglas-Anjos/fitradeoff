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
 * oração inteira nos dois idiomas.
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
  },
  "tela.home.demo.passo2": {
    pt: "você compara duas situações",
    en: "you compare two situations",
  },
  "tela.home.demo.passo3": { pt: "e outra vez", en: "and again" },
  "tela.home.demo.passo4": {
    pt: "sobra uma. essa é a sua.",
    en: "one is left. that one is yours.",
  },
  "tela.home.demo.legenda": {
    pt: "Em geral bastam de duas a cinco comparações.",
    en: "Two to five comparisons are usually enough.",
  },

  "tela.home.titulo": {
    pt: "Escolha sem precisar dizer quanto vale cada coisa.",
    en: "Choose without having to say what each thing is worth.",
  },
  "tela.home.descricao": {
    pt: "Atribuir peso a critérios é difícil e as pessoas erram nisso. O método FITradeoff não pede pesos: pede que você compare duas situações concretas e diga qual prefere. Com poucas respostas ele chega a uma recomendação - e registra o caminho, para quando alguém perguntar por quê.",
    en: "Assigning weight to criteria is hard, and people get it wrong. The FITradeoff method does not ask for scaling constants: it asks you to compare two concrete situations and say which one you prefer. A few answers are enough to reach a recommendation - and it records the path, for when someone asks why.",
  },
  "tela.home.acao.decisao": {
    pt: "Começar uma decisão",
    en: "Start a decision",
  },
  "tela.home.acao.chat": {
    pt: "Descrever em conversa",
    en: "Describe it in a conversation",
  },
  "tela.home.acao.ajuda": {
    pt: "As duas entradas levam ao mesmo método. A conversa ajuda quando o problema ainda não está organizado.",
    en: "Both ways in lead to the same method. The conversation helps when the problem is not organized yet.",
  },

  "tela.home.pratica.titulo": {
    pt: "O que isso muda na prática",
    en: "What this changes in practice",
  },
  "tela.home.pratica.pesos.titulo": {
    pt: "Você não atribui pesos",
    en: "You do not assign scaling constants",
  },
  "tela.home.pratica.pesos.texto": {
    pt: "Só diz qual de duas situações prefere. O peso de cada critério é deduzido das suas respostas.",
    en: "You only say which of two situations you prefer. Each criterion's scaling constant is inferred from your answers.",
  },
  "tela.home.pratica.registro.titulo": {
    pt: "A decisão fica registrada",
    en: "The decision is on record",
  },
  "tela.home.pratica.registro.texto": {
    pt: "Cada resposta vira uma linha em português, com autor e horário. O resultado sai com a trilha que o sustenta.",
    en: "Every answer becomes a line in plain language, with author and time. The result comes out with the trail that backs it.",
  },
  "tela.home.pratica.objetivos.titulo": {
    pt: "Uma elicitação, quatro objetivos",
    en: "One elicitation, four goals",
  },
  "tela.home.pratica.objetivos.texto": {
    pt: "Escolher a melhor, ordenar todas, classificar em faixas ou montar uma carteira - sem responder nada de novo.",
    en: "Choice, Ranking, Sorting or Portfolio - without answering anything again.",
  },
  "tela.home.pratica.parar.titulo": {
    pt: "Dá para parar no meio",
    en: "You can stop partway",
  },
  "tela.home.pratica.parar.texto": {
    pt: "Se o conjunto já estiver pequeno, você olha as faixas de valor e decide pelos dados.",
    en: "If the set is already small, you look at the value ranges and decide from the data.",
  },

  "tela.home.rodape": {
    pt: "Método publicado por De Almeida et al. (2016). Implementação independente, sem vínculo com o sistema oficial do CDSID-UFPE.",
    en: "Method published by De Almeida et al. (2016). Independent implementation, unaffiliated with the official CDSID-UFPE system.",
  },

  // --- tela de decisão: moldura ---------------------------------------------
  "tela.decisao.nova": { pt: "Nova decisão", en: "New decision" },
  "tela.decisao.outra": { pt: "Outra decisão", en: "Another decision" },
  /* Nosso texto, não mensagem do servidor: o 404 da API é traduzido aqui
     porque a causa é local (o link aponta para algo que não existe mais). */
  "tela.decisao.erro.naoExiste": {
    pt: "Essa decisão não existe mais. Comece uma nova.",
    en: "This decision no longer exists. Start a new one.",
  },

  // --- tela de decisão: dados do problema -----------------------------------
  "tela.decisao.dados.titulo": {
    pt: "Dados do problema",
    en: "Problem data",
  },
  "tela.decisao.voltarAoQueFazia": {
    pt: "voltar ao que eu estava fazendo",
    en: "back to what I was doing",
  },
  "tela.decisao.dados.imutaveis": {
    pt: "Para mudar os dados, comece outra decisão - alterar os números agora invalidaria as respostas que você já deu.",
    en: "To change the data, start another decision - changing the numbers now would invalidate the answers you have already given.",
  },

  "tela.decisao.curvas.titulo": {
    pt: "Como o valor cresce em cada critério",
    en: "How value grows in each criterion",
  },
  "tela.decisao.curvas.ajuda": {
    pt: "Por padrão o método assume crescimento linear. Se num critério os primeiros ganhos valem mais que os últimos, vale ajustar.",
    en: "By default the method assumes linear growth. If in some criterion the first gains are worth more than the last ones, it is worth adjusting.",
  },
  "tela.decisao.curva.linear": { pt: "linear", en: "linear" },
  /* Uma curva salva tem os dois extremos mais ao menos um ponto elicitado, ou
     ela não é curva e some da tela. O singular é inalcançável e não tem chave:
     chave morta no catálogo dá a impressão de que alguém esqueceu de usá-la. */
  "tela.decisao.curva.pontos": {
    pt: "curva com {n} pontos",
    en: "curve with {n} points",
  },
  "tela.decisao.curva.ajustar": { pt: "ajustar", en: "adjust" },
  "tela.decisao.curvas.dica.titulo": {
    pt: "Para que serve a curva",
    en: "What the curve is for",
  },
  "tela.decisao.curvas.dica.corpo1": {
    pt: "O método não supõe que valor cresça em linha reta com o desempenho: ir de 30 para 25 dias pode valer muito mais do que ir de 15 para 10.",
    en: "The method does not assume value grows linearly with performance: going from 30 to 25 days may be worth much more than going from 15 to 10.",
  },
  "tela.decisao.curvas.dica.corpo2": {
    pt: "Declarar a curva é opcional. Sem ela vale a reta, que é uma escolha legítima — e só dá para mudar antes de as perguntas começarem.",
    en: "Declaring the curve is optional. Without it the straight line applies, which is a legitimate choice — and it can only be changed before the questions start.",
  },
  "tela.decisao.curvas.todasLineares": {
    pt: "todas lineares",
    en: "all linear",
  },
  "tela.decisao.curvas.ajustada.uma": {
    pt: "{n} ajustada",
    en: "{n} adjusted",
  },
  "tela.decisao.curvas.ajustada.varias": {
    pt: "{n} ajustadas",
    en: "{n} adjusted",
  },
  "tela.decisao.curvas.abrir": { pt: "ver", en: "show" },
  "tela.decisao.curvas.fechar": { pt: "fechar", en: "hide" },
  "tela.decisao.curvas.seguirLinear": {
    pt: "Seguir sem mexer mantém todos lineares — é o padrão, e é uma escolha, não um esquecimento.",
    en: "Moving on without changing anything keeps them all linear — that is the default, and it is a choice, not an oversight.",
  },

  // --- tela de decisão: ordem e perguntas -----------------------------------
  "tela.decisao.voltarSemMudarOrdem": {
    pt: "voltar sem mudar a ordem",
    en: "back without changing the order",
  },
  "tela.decisao.pergunta.numero": {
    pt: "Pergunta {n}",
    en: "Question {n}",
  },
  "tela.decisao.indiferentes": {
    pt: "são indiferentes",
    en: "they are indifferent",
  },
  "tela.decisao.naoSei": { pt: "não sei", en: "I don't know" },
  "tela.decisao.naoSei.titulo": {
    pt: "Encerra este par sem assumir nada sobre os pesos",
    en: "Ends this pair without assuming anything about the scaling constants",
  },
  /* A distinção que mais confunde quem chega ao método: "não sei" e "são
     indiferentes" parecem a mesma desistência, e são opostos. Uma afirma, a
     outra se cala. Dizer isso uma vez, no lugar certo, evita a resposta errada. */
  "tela.decisao.naoSei.dica.titulo": {
    pt: "Não sei responder",
    en: "I don't know how to answer",
  },
  "tela.decisao.naoSei.dica.corpo1": {
    pt: "Use quando a comparação não fizer sentido para você. O par se encerra e a pergunta não volta.",
    en: "Use this when the comparison does not make sense to you. The pair ends and the question does not come back.",
  },
  "tela.decisao.naoSei.dica.corpo2": {
    pt: "Diferente de “são indiferentes”: aquela afirma que as duas valem o mesmo e restringe os pesos; esta não afirma nada, então nada é deduzido a partir dela.",
    en: "Different from “they are indifferent”: that one states both are worth the same and constrains the scaling constants; this one states nothing, so nothing is inferred from it.",
  },
  "tela.decisao.indiferentes.dica.titulo": {
    pt: "São indiferentes",
    en: "They are indifferent",
  },
  "tela.decisao.indiferentes.dica.corpo1": {
    pt: "As duas situações valem exatamente o mesmo para você. Os dois lados puxam com a mesma força.",
    en: "Both situations are worth exactly the same to you. Both sides pull with equal force.",
  },
  "tela.decisao.indiferentes.dica.corpo2": {
    pt: "É uma resposta como A ou B, não uma forma de pular: ela restringe os pesos tanto quanto escolher um lado.",
    en: "It is an answer like A or B, not a way to skip: it constrains the scaling constants as much as picking a side.",
  },
  "tela.decisao.conflito.titulo": {
    pt: "Precisa da sua decisão",
    en: "Needs your decision",
  },

  // --- tela de decisão: comparação ------------------------------------------
  "tela.decisao.comparar.titulo": {
    pt: "Comparar as alternativas",
    en: "Compare the alternatives",
  },
  /* Vira nome de arquivo PNG. O `{nome}` é o nome que o decisor deu à decisão
     e não se traduz; só o sufixo muda de idioma. */
  "tela.decisao.comparar.arquivo": {
    pt: "{nome} - comparação",
    en: "{nome} - comparison",
  },
  "tela.decisao.encerrar": {
    pt: "já decidi, encerrar",
    en: "I have decided, finish",
  },
  "tela.decisao.encerrar.titulo": {
    pt: "Para de perguntar e mostra o resultado com o que já foi respondido",
    en: "Stops asking and shows the result from what has been answered so far",
  },

  // --- tela de decisão: resultado -------------------------------------------
  "tela.decisao.ondeEstamos": { pt: "Onde estamos", en: "Where we stand" },
  "tela.decisao.voltarAResponder": {
    pt: "voltar a responder",
    en: "go back to answering",
  },

  "tela.decisao.faixasValor.titulo": {
    pt: "Valor global possível de cada alternativa",
    en: "Possible global value of each alternative",
  },
  "tela.decisao.faixasValor.dica.titulo": {
    pt: "Por que um intervalo",
    en: "Why a range",
  },
  "tela.decisao.faixasValor.dica.corpo1": {
    pt: "Como você ainda não fixou os pesos, o valor de cada alternativa não é um número: é uma faixa.",
    en: "Since you have not fixed the scaling constants, each alternative's value is not a number: it is a range.",
  },
  "tela.decisao.faixasValor.dica.corpo2": {
    pt: "Faixas que não se sobrepõem já decidem. Quando se cruzam, ainda falta informação.",
    en: "Ranges that do not overlap already decide. Where they cross, information is still missing.",
  },

  "tela.decisao.faixasPeso.titulo": {
    pt: "Peso ainda possível de cada critério",
    en: "Scaling constant still possible for each criterion",
  },
  "tela.decisao.faixasPeso.dica.titulo": {
    pt: "Os pesos que você nunca informou",
    en: "The scaling constants you never stated",
  },
  "tela.decisao.faixasPeso.dica.corpo1": {
    pt: "O método deduz estas faixas das suas respostas. Você não precisou arbitrar nenhum número.",
    en: "The method infers these ranges from your answers. You did not have to pick any number yourself.",
  },
  "tela.decisao.faixasPeso.dica.corpo2": {
    pt: "Quanto mais você responde, mais elas estreitam.",
    en: "The more you answer, the narrower they get.",
  },

  "tela.decisao.sensibilidade.titulo": {
    pt: "Quanto isso depende dos dados",
    en: "How much this depends on the data",
  },
  "tela.decisao.auditoria.titulo": {
    pt: "Por que este resultado",
    en: "Why this result",
  },

  // --- chat -----------------------------------------------------------------
  "tela.chat.titulo": { pt: "Chat de decisões", en: "Decision chat" },
  "tela.chat.editorial": { pt: "Assistente guiado", en: "Guided assistant" },
  "tela.chat.descricao": {
    pt: "Descreva o que precisa decidir. O agente monta o modelo e conduz a elicitação pelo método - as respostas continuam sendo suas.",
    en: "Describe what you need to decide. The agent builds the model and runs the elicitation by the method - the answers are still yours.",
  },

  /* A instrução de configuração envolve o nome da variável em <code>, por isso
     só o trecho anterior e o posterior ficam no catálogo. */
  "tela.chat.semChave.aviso": {
    pt: "O chat precisa de uma chave da API da Anthropic para funcionar.",
    en: "The chat needs an Anthropic API key to work.",
  },
  "tela.chat.semChave.titulo": {
    pt: "O assistente está indisponível neste ambiente",
    en: "The assistant is unavailable in this environment",
  },
  "tela.chat.semChave.configuracao.antes": {
    pt: "Defina",
    en: "Set",
  },
  "tela.chat.semChave.configuracao.depois": {
    pt: "no ambiente da API e reinicie o servidor.",
    en: "in the API environment and restart the server.",
  },
  "tela.chat.semChave.acao": {
    pt: "Abrir decisão estruturada",
    en: "Open structured decision",
  },
  "tela.chat.alternativa.titulo": {
    pt: "Continue pelo fluxo estruturado",
    en: "Continue with the structured flow",
  },
  "tela.chat.alternativa.item1": {
    pt: "As mesmas problemáticas e etapas do método.",
    en: "The same problem types and method steps.",
  },
  "tela.chat.alternativa.item2": {
    pt: "Controle direto sobre alternativas, critérios e desempenhos.",
    en: "Direct control over alternatives, criteria and performances.",
  },
  "tela.chat.alternativa.item3": {
    pt: "Resultados, sensibilidade e trilha de auditoria completos.",
    en: "Complete results, sensitivity analysis and audit trail.",
  },

  /* Sugestões de primeira mensagem. Em inglês são reescritas, não traduzidas:
     precisam soar como alguém digitando. */
  "tela.chat.sugestao1": {
    pt: "Preciso escolher entre quatro fornecedores olhando custo, prazo e qualidade.",
    en: "I need to choose among four suppliers looking at cost, lead time and quality.",
  },
  "tela.chat.sugestao2": {
    pt: "Tenho três propostas de software para comparar. Me ajuda a decidir?",
    en: "I have three software proposals to compare. Can you help me decide?",
  },
  "tela.chat.sugestao3": {
    pt: "Quero ordenar seis projetos por prioridade, não só escolher um.",
    en: "I want to rank six projects by priority, not just pick one.",
  },
  "tela.chat.sugestoes.titulo": {
    pt: "Comece descrevendo uma decisão",
    en: "Start by describing a decision",
  },

  /* Prefixo do rastro de ferramentas; a lista e as setas são montadas no
     componente, porque são pontuação e não texto. */
  "tela.chat.metodoAplicado": {
    pt: "método aplicado:",
    en: "method applied:",
  },
  "tela.chat.pensando": { pt: "pensando…", en: "thinking…" },
  "tela.chat.entrada": {
    pt: "O que você precisa decidir?",
    en: "What do you need to decide?",
  },
  "tela.chat.enviar": { pt: "Enviar", en: "Send" },
  "tela.chat.emAndamento": {
    pt: "decisão em andamento:",
    en: "decision in progress:",
  },
});
