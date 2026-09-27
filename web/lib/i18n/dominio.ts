/**
 * Catálogo dos módulos de domínio: as recusas da validação do rascunho e os
 * casos prontos de `lib/exemplos.ts`.
 *
 * Os dois módulos que este catálogo serve são puros - nenhum importa React -,
 * então nenhum dos dois pode chamar o hook. Eles devolvem *chaves*, e quem
 * renderiza traduz. Daí este arquivo existir separado dos outros quatro: ele é
 * o único que guarda texto de coisa que não é tela.
 *
 * `traduzir` mora aqui, e não em `lib/rascunho.ts`, para o rascunho continuar
 * sem saber que idioma existe: ele descreve a recusa, este módulo a escreve.
 *
 * Um exemplo em português dentro de uma interface em inglês é pior que não ter
 * exemplo - ele ensina o formato errado e parece defeito. Por isso os casos
 * prontos vêm traduzidos até nas unidades: "R$ mil" não é "R$ thousand", é
 * "$k". Os números, ao contrário, são os mesmos em todo idioma: são o dado do
 * caso, não texto dele.
 */

import { registrar } from "./index";
import type { Mensagem } from "../rascunho";

/** A tradução, como o provedor a entrega. */
export type Tradutor = (
  chave: string,
  valores?: Record<string, string | number>,
) => string;

/**
 * Escreve uma mensagem de domínio no idioma da tela.
 *
 * Um valor de interpolação pode ser outra mensagem - é o caso de
 * `dominio.estrutura.criterioInvalido`, que emenda o nome do critério ao
 * problema encontrado nele. A recursão resolve o de dentro primeiro, porque
 * `t` só sabe interpolar texto.
 */
export function traduzir(m: Mensagem, t: Tradutor): string {
  if (!m.valores) return t(m.chave);
  const planos: Record<string, string | number> = {};
  for (const [nome, valor] of Object.entries(m.valores)) {
    planos[nome] = typeof valor === "object" ? traduzir(valor, t) : valor;
  }
  return t(m.chave, planos);
}

export const DOMINIO = registrar({
  // --- validação do critério ------------------------------------------------
  "dominio.criterio.semNome": { pt: "Critério", en: "Criterion", es: "Criterio" },
  "dominio.criterio.nomeObrigatorio": {
    pt: "Dê um nome ao critério.",
    en: "Give the criterion a name.",
    es: "Dé un nombre al criterio.",
  },
  "dominio.criterio.minimoNiveis": {
    pt: "Uma escala construída precisa de ao menos dois níveis.",
    en: "A constructed scale needs at least two levels.",
    es: "Una escala construida necesita al menos dos niveles.",
  },
  "dominio.criterio.nivelNaoNumero": {
    pt: "Cada nível precisa ser um número.",
    en: "Every level has to be a number.",
    es: "Cada nivel tiene que ser un número.",
  },
  "dominio.criterio.niveisCrescentes": {
    pt: "Os níveis vão do pior para o melhor desempenho, em ordem crescente.",
    en: "The levels run from worst to best performance, in increasing order.",
    es: "Los niveles van del peor al mejor desempeño, en orden creciente.",
  },

  // --- validação do veto ----------------------------------------------------
  "dominio.criterio.vetoNaoNumero": {
    pt: "Os limites de veto precisam ser números, na unidade do critério.",
    en: "Veto thresholds have to be numbers, in the criterion's unit.",
    es: "Los límites de veto tienen que ser números, en la unidad del criterio.",
  },
  "dominio.criterio.vetoIgual": {
    pt: "Os dois limites são iguais. Para um corte seco, preencha só um deles.",
    en: "Both thresholds are the same. For a hard cut-off, fill in only one.",
    es: "Los dos límites son iguales. Para un corte seco, complete solo uno de ellos.",
  },
  "dominio.criterio.vetoForaDosNiveis": {
    pt: "Neste critério a escala é construída: o limite de veto tem de ser um dos níveis declarados.",
    en: "This criterion uses a constructed scale: the veto threshold has to be one of the declared levels.",
    es: "En este criterio la escala es construida: el límite de veto tiene que ser uno de los niveles declarados.",
  },
  "dominio.criterio.vetoOrdemNiveis": {
    pt: "Os níveis vão do pior para o melhor, então o limite aceitável tem de vir depois do inaceitável.",
    en: "Levels run from worst to best, so the acceptable threshold has to come after the unacceptable one.",
    es: "Los niveles van del peor al mejor, así que el límite aceptable tiene que venir después del inaceptable.",
  },
  "dominio.criterio.vetoOrdemMax": {
    pt: "Neste critério o maior é melhor, então o limite aceitável tem de ser maior que o inaceitável.",
    en: "Higher is better on this criterion, so the acceptable threshold has to be above the unacceptable one.",
    es: "En este criterio mayor es mejor, así que el límite aceptable tiene que ser mayor que el inaceptable.",
  },
  "dominio.criterio.vetoOrdemMin": {
    pt: "Neste critério o menor é melhor, então o limite aceitável tem de ser menor que o inaceitável.",
    en: "Lower is better on this criterion, so the acceptable threshold has to be below the unacceptable one.",
    es: "En este criterio menor es mejor, así que el límite aceptable tiene que ser menor que el inaceptable.",
  },
  "dominio.estrutura.vetoNaoSeAplica": {
    pt: "O veto está declarado em {criterios}, mas este objetivo de decisão não o usa - o método o prevê só para escolher a melhor e para ordenar. Apague os limites ou volte a um desses dois objetivos.",
    en: "A veto is declared on {criterios}, but this decision goal does not use it - the method defines it only for choice and ranking. Clear the thresholds or go back to one of those two goals.",
    es: "El veto está declarado en {criterios}, pero este objetivo de decisión no lo usa - el método lo prevé solo para elegir la mejor y para ordenar. Borre los límites o vuelva a uno de esos dos objetivos.",
  },

  // --- validação da estrutura -----------------------------------------------
  "dominio.estrutura.minimoAlternativas": {
    pt: "Cadastre ao menos duas alternativas - não há o que comparar com uma.",
    en: "Enter at least two alternatives - there is nothing to compare with one.",
    es: "Registre al menos dos alternativas - no hay nada que comparar con una sola.",
  },
  "dominio.estrutura.alternativaRepetida": {
    pt: 'Há duas alternativas chamadas "{nome}".',
    en: 'There are two alternatives called "{nome}".',
    es: 'Hay dos alternativas llamadas "{nome}".',
  },
  "dominio.estrutura.minimoCriterios": {
    pt: "Cadastre ao menos dois critérios. Com um só, não há o que equilibrar: vence quem for melhor nele.",
    en: "Enter at least two criteria. With only one there is nothing to trade off: whichever is best on it wins.",
    es: "Registre al menos dos criterios. Con uno solo, no hay nada que equilibrar: gana quien sea mejor en él.",
  },
  /* O nome do critério na frente do problema dele: sem isso, quem tem oito
     critérios cadastrados não sabe qual recusou o avanço. */
  "dominio.estrutura.criterioInvalido": {
    pt: "{nome}: {problema}",
    en: "{nome}: {problema}",
    es: "{nome}: {problema}",
  },

  // --- validação da matriz de consequências ---------------------------------
  "dominio.matriz.naoNumero": {
    pt: 'O desempenho de "{alternativa}" em "{criterio}" precisa ser um número.',
    en: 'The performance of "{alternativa}" on "{criterio}" has to be a number.',
    es: 'El desempeño de "{alternativa}" en "{criterio}" tiene que ser un número.',
  },
  "dominio.matriz.nivelInvalido": {
    pt: '"{alternativa}" em "{criterio}": escolha um dos níveis declarados.',
    en: '"{alternativa}" on "{criterio}": pick one of the declared levels.',
    es: '"{alternativa}" en "{criterio}": elija uno de los niveles declarados.',
  },
  "dominio.matriz.soInteiros": {
    pt: '"{criterio}" aceita só valores inteiros.',
    en: '"{criterio}" only accepts whole numbers.',
    es: '"{criterio}" solo acepta valores enteros.',
  },

  // --- validação das faixas do sorting --------------------------------------
  "dominio.sorting.faixaSemNome": {
    pt: "Dê um nome a cada faixa.",
    en: "Give every class a name.",
    es: "Dé un nombre a cada clase.",
  },
  "dominio.sorting.corteNaoNumero": {
    pt: "Cada corte precisa ser um número entre 0 e 1.",
    en: "Every cut has to be a number between 0 and 1.",
    es: "Cada corte tiene que ser un número entre 0 y 1.",
  },
  "dominio.sorting.corteForaDaEscala": {
    pt: "Os cortes ficam entre 0 e 1, sem incluir os extremos.",
    en: "The cuts sit between 0 and 1, the ends excluded.",
    es: "Los cortes quedan entre 0 y 1, sin incluir los extremos.",
  },
  "dominio.sorting.cortesCrescentes": {
    pt: "Os cortes devem subir da pior faixa para a melhor.",
    en: "The cuts have to rise from the worst class to the best.",
    es: "Los cortes deben subir de la peor clase a la mejor.",
  },

  // --- validação da carteira ------------------------------------------------
  "dominio.portfolio.semOrcamento": {
    pt: "Informe o orçamento disponível, maior que zero.",
    en: "Enter the available budget, greater than zero.",
    es: "Informe el presupuesto disponible, mayor que cero.",
  },
  "dominio.portfolio.orcamentoCurto": {
    pt: "Nenhuma alternativa cabe no orçamento - a carteira sairia vazia.",
    en: "No alternative fits the budget - the portfolio would come out empty.",
    es: "Ninguna alternativa cabe en el presupuesto - la cartera saldría vacía.",
  },
  "dominio.custo.obrigatorio": {
    pt: 'Informe o custo de "{alternativa}".',
    en: 'Enter the cost of "{alternativa}".',
    es: 'Informe el costo de "{alternativa}".',
  },
  /* A alternativa ainda sem nome é citada pela posição, porque é o único jeito
     de apontá-la. */
  "dominio.custo.alternativaSemNome": {
    pt: "alternativa {n}",
    en: "alternative {n}",
    es: "alternativa {n}",
  },

  /* A resposta da API já chega escrita, e não tem chave. Passa por aqui para o
     caminho da falha ser um só, em vez de a tela ter dois campos de erro. */
  "dominio.erro.api": { pt: "{detalhe}", en: "{detalhe}", es: "{detalhe}" },

  // --- unidades dos casos prontos -------------------------------------------
  /* Compartilhadas entre os casos: o mesmo "R$" aparece em três deles, e uma
     unidade traduzida de dois jeitos diferentes na mesma tela é erro visível.
     As que não mudam de idioma (km/l, mAh, GB) também ficam aqui, para nenhuma
     unidade depender do resgate que devolve a chave crua. */
  /* Vazia de propósito: um critério de nota não tem unidade, e a faixa dele
     já aparece nos próprios extremos. */
  "exemplo.unidade.nenhuma": { pt: "", en: "", es: "" },
  "exemplo.unidade.reais": { pt: "R$", en: "$", es: "$" },
  "exemplo.unidade.reaisPorUnidade": { pt: "R$/un", en: "$/unit", es: "$/ud" },
  "exemplo.unidade.reaisMil": { pt: "R$ mil", en: "$k", es: "$ mil" },
  "exemplo.unidade.milUnidades": { pt: "mil un.", en: "k units", es: "mil ud." },
  "exemplo.unidade.milPessoas": { pt: "mil pessoas", en: "k people", es: "mil personas" },
  "exemplo.unidade.dias": { pt: "dias", en: "days", es: "días" },
  "exemplo.unidade.horas": { pt: "h", en: "h", es: "h" },
  "exemplo.unidade.litros": { pt: "litros", en: "liters", es: "litros" },
  "exemplo.unidade.kmPorLitro": { pt: "km/l", en: "km/l", es: "km/l" },
  "exemplo.unidade.gramas": { pt: "g", en: "g", es: "g" },
  "exemplo.unidade.mah": { pt: "mAh", en: "mAh", es: "mAh" },
  "exemplo.unidade.megapixels": { pt: "MP", en: "MP", es: "MP" },
  "exemplo.unidade.gigabytes": { pt: "GB", en: "GB", es: "GB" },
  "exemplo.unidade.porcento": { pt: "%", en: "%", es: "%" },
  "exemplo.unidade.meses": { pt: "meses", en: "months", es: "meses" },

  // --- caso 1: seleção de fornecedor ----------------------------------------
  "exemplo.fornecedor.titulo": {
    pt: "Seleção de fornecedor",
    en: "Supplier selection",
    es: "Selección de proveedor",
  },
  "exemplo.fornecedor.resumo": {
    pt: "Quatro fornecedores, com preço, prazo, qualidade e capacidade.",
    en: "Four suppliers, on price, lead time, quality and capacity.",
    es: "Cuatro proveedores, con precio, plazo, calidad y capacidad.",
  },
  "exemplo.fornecedor.nome": {
    pt: "Seleção de fornecedor",
    en: "Supplier selection",
    es: "Selección de proveedor",
  },
  "exemplo.fornecedor.criterio.qualidade": {
    pt: "Índice de qualidade",
    en: "Quality index",
    es: "Índice de calidad",
  },
  "exemplo.fornecedor.criterio.custo": {
    pt: "Custo unitário",
    en: "Unit cost",
    es: "Costo unitario",
  },
  "exemplo.fornecedor.criterio.prazo": {
    pt: "Prazo de entrega",
    en: "Lead time",
    es: "Plazo de entrega",
  },
  "exemplo.fornecedor.criterio.capacidade": {
    pt: "Capacidade mensal",
    en: "Monthly capacity",
    es: "Capacidad mensual",
  },
  "exemplo.fornecedor.alternativa.a": {
    pt: "Fornecedor A",
    en: "Supplier A",
    es: "Proveedor A",
  },
  "exemplo.fornecedor.alternativa.b": {
    pt: "Fornecedor B",
    en: "Supplier B",
    es: "Proveedor B",
  },
  "exemplo.fornecedor.alternativa.c": {
    pt: "Fornecedor C",
    en: "Supplier C",
    es: "Proveedor C",
  },
  "exemplo.fornecedor.alternativa.d": {
    pt: "Fornecedor D",
    en: "Supplier D",
    es: "Proveedor D",
  },

  // --- caso 2: compra de um carro -------------------------------------------
  "exemplo.carro.titulo": { pt: "Compra de um carro", en: "Buying a car", es: "Compra de un auto" },
  "exemplo.carro.resumo": {
    pt: "Quatro modelos, entre preço, consumo, espaço e manutenção.",
    en: "Four models, across price, fuel economy, space and upkeep.",
    es: "Cuatro modelos, entre precio, consumo, espacio y mantenimiento.",
  },
  "exemplo.carro.nome": { pt: "Qual carro comprar", en: "Which car to buy", es: "Qué auto comprar" },
  "exemplo.carro.criterio.preco": { pt: "Preço", en: "Price", es: "Precio" },
  "exemplo.carro.criterio.consumo": {
    pt: "Consumo na estrada",
    en: "Highway fuel economy",
    es: "Consumo en carretera",
  },
  "exemplo.carro.criterio.portaMalas": {
    pt: "Porta-malas",
    en: "Trunk space",
    es: "Baúl",
  },
  "exemplo.carro.criterio.manutencao": {
    pt: "Manutenção anual",
    en: "Annual maintenance",
    es: "Mantenimiento anual",
  },
  "exemplo.carro.criterio.seguranca": {
    pt: "Nota de segurança",
    en: "Safety rating",
    es: "Calificación de seguridad",
  },
  "exemplo.carro.alternativa.hatch": {
    pt: "Hatch 1.0 turbo",
    en: "1.0 turbo hatchback",
    es: "Hatchback 1.0 turbo",
  },
  "exemplo.carro.alternativa.sedan": {
    pt: "Sedã 1.6 automático",
    en: "1.6 automatic sedan",
    es: "Sedán 1.6 automático",
  },
  "exemplo.carro.alternativa.suv": {
    pt: "SUV compacto",
    en: "Compact SUV",
    es: "SUV compacto",
  },
  "exemplo.carro.alternativa.eletrico": {
    pt: "Elétrico de entrada",
    en: "Entry-level electric",
    es: "Eléctrico de entrada",
  },

  // --- caso 3: escolha de celular -------------------------------------------
  "exemplo.celular.titulo": {
    pt: "Escolha de celular",
    en: "Choosing a phone",
    es: "Elección de celular",
  },
  "exemplo.celular.resumo": {
    pt: "Quatro aparelhos, entre preço, bateria, câmera e peso.",
    en: "Four handsets, across price, battery, camera and weight.",
    es: "Cuatro dispositivos, entre precio, batería, cámara y peso.",
  },
  "exemplo.celular.nome": {
    pt: "Qual celular comprar",
    en: "Which phone to buy",
    es: "Qué celular comprar",
  },
  "exemplo.celular.criterio.preco": { pt: "Preço", en: "Price", es: "Precio" },
  "exemplo.celular.criterio.bateria": { pt: "Bateria", en: "Battery", es: "Batería" },
  "exemplo.celular.criterio.camera": {
    pt: "Câmera principal",
    en: "Main camera",
    es: "Cámara principal",
  },
  "exemplo.celular.criterio.peso": { pt: "Peso", en: "Weight", es: "Peso" },
  "exemplo.celular.criterio.armazenamento": {
    pt: "Armazenamento",
    en: "Storage",
    es: "Almacenamiento",
  },
  "exemplo.celular.alternativa.intermediario": {
    pt: "Intermediário 5G",
    en: "Mid-range 5G",
    es: "Gama media 5G",
  },
  "exemplo.celular.alternativa.topo": {
    pt: "Topo de linha",
    en: "Flagship",
    es: "Gama alta",
  },
  "exemplo.celular.alternativa.bateria": {
    pt: "Bateria reforçada",
    en: "Long-battery model",
    es: "Batería reforzada",
  },
  "exemplo.celular.alternativa.compacto": {
    pt: "Compacto premium",
    en: "Premium compact",
    es: "Compacto premium",
  },

  // --- caso 4: plano de controle de qualidade -------------------------------
  /* "Amostragem simples" e "dupla" são os nomes dos planos na literatura de
     controle de qualidade, e em inglês são `single` e `double sampling`. */
  "exemplo.controle.titulo": {
    pt: "Plano de controle de qualidade",
    en: "Quality control plan",
    es: "Plan de control de calidad",
  },
  "exemplo.controle.resumo": {
    pt: "Quatro planos de inspeção, entre custo, tempo e detecção de falhas.",
    en: "Four inspection plans, across cost, time and defect detection.",
    es: "Cuatro planes de inspección, entre costo, tiempo y detección de fallas.",
  },
  "exemplo.controle.nome": {
    pt: "Plano de controle de qualidade",
    en: "Quality control plan",
    es: "Plan de control de calidad",
  },
  "exemplo.controle.criterio.custo": {
    pt: "Custo por lote",
    en: "Cost per batch",
    es: "Costo por lote",
  },
  "exemplo.controle.criterio.tempo": {
    pt: "Tempo de inspeção",
    en: "Inspection time",
    es: "Tiempo de inspección",
  },
  "exemplo.controle.criterio.deteccao": {
    pt: "Detecção de falhas",
    en: "Defect detection",
    es: "Detección de fallas",
  },
  "exemplo.controle.criterio.treinamento": {
    pt: "Treinamento exigido",
    en: "Training required",
    es: "Entrenamiento requerido",
  },
  "exemplo.controle.alternativa.simples": {
    pt: "Amostragem simples",
    en: "Single sampling",
    es: "Muestreo simple",
  },
  "exemplo.controle.alternativa.dupla": {
    pt: "Amostragem dupla",
    en: "Double sampling",
    es: "Muestreo doble",
  },
  "exemplo.controle.alternativa.total": {
    pt: "Inspeção 100%",
    en: "100% inspection",
    es: "Inspección 100%",
  },
  "exemplo.controle.alternativa.visao": {
    pt: "Visão computacional",
    en: "Machine vision",
    es: "Visión computacional",
  },

  // --- carteira de campanhas: a leitura combinatorial -------------------------
  "exemplo.comercial.titulo": {
    pt: "Campanhas do trimestre",
    en: "Campaigns for the quarter",
    es: "Campañas del trimestre",
  },
  "exemplo.comercial.resumo": {
    pt: "Cinco campanhas com custo próprio, para caber num orçamento.",
    en: "Five campaigns, each with its own cost, to fit within a budget.",
    es: "Cinco campañas con costo propio, para caber en un presupuesto.",
  },
  "exemplo.comercial.nome": {
    pt: "Campanhas do trimestre",
    en: "Campaigns for the quarter",
    es: "Campañas del trimestre",
  },
  "exemplo.comercial.criterio.alcance": { pt: "Alcance", en: "Reach", es: "Alcance" },
  "exemplo.comercial.criterio.conversao": {
    pt: "Conversão esperada",
    en: "Expected conversion",
    es: "Conversión esperada",
  },
  "exemplo.comercial.criterio.esforco": {
    pt: "Esforço da equipe",
    en: "Team effort",
    es: "Esfuerzo del equipo",
  },
  "exemplo.comercial.criterio.risco": {
    pt: "Risco para a marca",
    en: "Brand risk",
    es: "Riesgo para la marca",
  },
  "exemplo.comercial.alternativa.feira": {
    pt: "Feira do setor",
    en: "Industry trade show",
    es: "Feria del sector",
  },
  "exemplo.comercial.alternativa.digital": {
    pt: "Mídia digital",
    en: "Digital media",
    es: "Medios digitales",
  },
  "exemplo.comercial.alternativa.televendas": {
    pt: "Força de televendas",
    en: "Telesales push",
    es: "Fuerza de televentas",
  },
  "exemplo.comercial.alternativa.parceria": {
    pt: "Parceria com revenda",
    en: "Reseller partnership",
    es: "Alianza con revendedor",
  },
  "exemplo.comercial.alternativa.patrocinio": {
    pt: "Patrocínio esportivo",
    en: "Sports sponsorship",
    es: "Patrocinio deportivo",
  },

  // --- carteira de investimentos: a leitura por razão -------------------------
  "exemplo.diretoria.titulo": {
    pt: "Investimentos da diretoria",
    en: "Board-level investments",
    es: "Inversiones de la dirección",
  },
  "exemplo.diretoria.resumo": {
    pt: "Cinco projetos de porte diferente, para escolher por retorno sobre o gasto.",
    en: "Five projects of different sizes, to pick by return on spend.",
    es: "Cinco proyectos de tamaño diferente, para elegir por retorno sobre el gasto.",
  },
  "exemplo.diretoria.nome": {
    pt: "Investimentos da diretoria",
    en: "Board-level investments",
    es: "Inversiones de la dirección",
  },
  "exemplo.diretoria.criterio.retorno": {
    pt: "Retorno esperado",
    en: "Expected return",
    es: "Retorno esperado",
  },
  "exemplo.diretoria.criterio.estrategia": {
    pt: "Impacto estratégico",
    en: "Strategic impact",
    es: "Impacto estratégico",
  },
  "exemplo.diretoria.criterio.risco": {
    pt: "Risco de execução",
    en: "Execution risk",
    es: "Riesgo de ejecución",
  },
  "exemplo.diretoria.criterio.prazo": {
    pt: "Prazo até o resultado",
    en: "Time to result",
    es: "Plazo hasta el resultado",
  },
  "exemplo.diretoria.alternativa.fabrica": {
    pt: "Ampliar a fábrica",
    en: "Expand the plant",
    es: "Ampliar la fábrica",
  },
  "exemplo.diretoria.alternativa.sistema": {
    pt: "Trocar o sistema de gestão",
    en: "Replace the management system",
    es: "Cambiar el sistema de gestión",
  },
  "exemplo.diretoria.alternativa.frota": {
    pt: "Renovar a frota",
    en: "Renew the fleet",
    es: "Renovar la flota",
  },
  "exemplo.diretoria.alternativa.pesquisa": {
    pt: "Centro de pesquisa",
    en: "Research centre",
    es: "Centro de investigación",
  },
  "exemplo.diretoria.alternativa.loja": {
    pt: "Loja própria",
    en: "Company-owned store",
    es: "Tienda propia",
  },
});
