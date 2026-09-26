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
 * "$k". Os números, ao contrário, são os mesmos nos dois idiomas: são o dado do
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
  "dominio.criterio.semNome": { pt: "Critério", en: "Criterion" },
  "dominio.criterio.nomeObrigatorio": {
    pt: "Dê um nome ao critério.",
    en: "Give the criterion a name.",
  },
  "dominio.criterio.minimoNiveis": {
    pt: "Uma escala construída precisa de ao menos dois níveis.",
    en: "A constructed scale needs at least two levels.",
  },
  "dominio.criterio.nivelNaoNumero": {
    pt: "Cada nível precisa ser um número.",
    en: "Every level has to be a number.",
  },
  "dominio.criterio.niveisCrescentes": {
    pt: "Os níveis vão do pior para o melhor desempenho, em ordem crescente.",
    en: "The levels run from worst to best performance, in increasing order.",
  },

  // --- validação do veto ----------------------------------------------------
  "dominio.criterio.vetoNaoNumero": {
    pt: "Os limites de veto precisam ser números, na unidade do critério.",
    en: "Veto thresholds have to be numbers, in the criterion's unit.",
  },
  "dominio.criterio.vetoIgual": {
    pt: "Os dois limites são iguais. Para um corte seco, preencha só um deles.",
    en: "Both thresholds are the same. For a hard cut-off, fill in only one.",
  },
  "dominio.criterio.vetoForaDosNiveis": {
    pt: "Neste critério a escala é construída: o limite de veto tem de ser um dos níveis declarados.",
    en: "This criterion uses a constructed scale: the veto threshold has to be one of the declared levels.",
  },
  "dominio.criterio.vetoOrdemNiveis": {
    pt: "Os níveis vão do pior para o melhor, então o limite aceitável tem de vir depois do inaceitável.",
    en: "Levels run from worst to best, so the acceptable threshold has to come after the unacceptable one.",
  },
  "dominio.criterio.vetoOrdemMax": {
    pt: "Neste critério o maior é melhor, então o limite aceitável tem de ser maior que o inaceitável.",
    en: "Higher is better on this criterion, so the acceptable threshold has to be above the unacceptable one.",
  },
  "dominio.criterio.vetoOrdemMin": {
    pt: "Neste critério o menor é melhor, então o limite aceitável tem de ser menor que o inaceitável.",
    en: "Lower is better on this criterion, so the acceptable threshold has to be below the unacceptable one.",
  },
  "dominio.estrutura.vetoNaoSeAplica": {
    pt: "O veto está declarado em {criterios}, mas este objetivo de decisão não o usa - o método o prevê só para escolher a melhor e para ordenar. Apague os limites ou volte a um desses dois objetivos.",
    en: "A veto is declared on {criterios}, but this decision goal does not use it - the method defines it only for choice and ranking. Clear the thresholds or go back to one of those two goals.",
  },

  // --- validação da estrutura -----------------------------------------------
  "dominio.estrutura.minimoAlternativas": {
    pt: "Cadastre ao menos duas alternativas - não há o que comparar com uma.",
    en: "Enter at least two alternatives - there is nothing to compare with one.",
  },
  "dominio.estrutura.alternativaRepetida": {
    pt: 'Há duas alternativas chamadas "{nome}".',
    en: 'There are two alternatives called "{nome}".',
  },
  "dominio.estrutura.minimoCriterios": {
    pt: "Cadastre ao menos dois critérios. Com um só, não há o que equilibrar: vence quem for melhor nele.",
    en: "Enter at least two criteria. With only one there is nothing to trade off: whichever is best on it wins.",
  },
  /* O nome do critério na frente do problema dele: sem isso, quem tem oito
     critérios cadastrados não sabe qual recusou o avanço. */
  "dominio.estrutura.criterioInvalido": {
    pt: "{nome}: {problema}",
    en: "{nome}: {problema}",
  },

  // --- validação da matriz de consequências ---------------------------------
  "dominio.matriz.naoNumero": {
    pt: 'O desempenho de "{alternativa}" em "{criterio}" precisa ser um número.',
    en: 'The performance of "{alternativa}" on "{criterio}" has to be a number.',
  },
  "dominio.matriz.nivelInvalido": {
    pt: '"{alternativa}" em "{criterio}": escolha um dos níveis declarados.',
    en: '"{alternativa}" on "{criterio}": pick one of the declared levels.',
  },
  "dominio.matriz.soInteiros": {
    pt: '"{criterio}" aceita só valores inteiros.',
    en: '"{criterio}" only accepts whole numbers.',
  },

  // --- validação das faixas do sorting --------------------------------------
  "dominio.sorting.faixaSemNome": {
    pt: "Dê um nome a cada faixa.",
    en: "Give every class a name.",
  },
  "dominio.sorting.corteNaoNumero": {
    pt: "Cada corte precisa ser um número entre 0 e 1.",
    en: "Every cut has to be a number between 0 and 1.",
  },
  "dominio.sorting.corteForaDaEscala": {
    pt: "Os cortes ficam entre 0 e 1, sem incluir os extremos.",
    en: "The cuts sit between 0 and 1, the ends excluded.",
  },
  "dominio.sorting.cortesCrescentes": {
    pt: "Os cortes devem subir da pior faixa para a melhor.",
    en: "The cuts have to rise from the worst class to the best.",
  },

  // --- validação da carteira ------------------------------------------------
  "dominio.portfolio.semOrcamento": {
    pt: "Informe o orçamento disponível, maior que zero.",
    en: "Enter the available budget, greater than zero.",
  },
  "dominio.portfolio.orcamentoCurto": {
    pt: "Nenhuma alternativa cabe no orçamento - a carteira sairia vazia.",
    en: "No alternative fits the budget - the portfolio would come out empty.",
  },
  "dominio.custo.obrigatorio": {
    pt: 'Informe o custo de "{alternativa}".',
    en: 'Enter the cost of "{alternativa}".',
  },
  /* A alternativa ainda sem nome é citada pela posição, porque é o único jeito
     de apontá-la. */
  "dominio.custo.alternativaSemNome": {
    pt: "alternativa {n}",
    en: "alternative {n}",
  },

  /* A resposta da API já chega escrita, e não tem chave. Passa por aqui para o
     caminho da falha ser um só, em vez de a tela ter dois campos de erro. */
  "dominio.erro.api": { pt: "{detalhe}", en: "{detalhe}" },

  // --- unidades dos casos prontos -------------------------------------------
  /* Compartilhadas entre os casos: o mesmo "R$" aparece em três deles, e uma
     unidade traduzida de dois jeitos diferentes na mesma tela é erro visível.
     As que não mudam de idioma (km/l, mAh, GB) também ficam aqui, para nenhuma
     unidade depender do resgate que devolve a chave crua. */
  /* Vazia de propósito: um critério de nota não tem unidade, e a faixa dele
     já aparece nos próprios extremos. */
  "exemplo.unidade.nenhuma": { pt: "", en: "" },
  "exemplo.unidade.reais": { pt: "R$", en: "$" },
  "exemplo.unidade.reaisPorUnidade": { pt: "R$/un", en: "$/unit" },
  "exemplo.unidade.reaisMil": { pt: "R$ mil", en: "$k" },
  "exemplo.unidade.milUnidades": { pt: "mil un.", en: "k units" },
  "exemplo.unidade.milPessoas": { pt: "mil pessoas", en: "k people" },
  "exemplo.unidade.dias": { pt: "dias", en: "days" },
  "exemplo.unidade.horas": { pt: "h", en: "h" },
  "exemplo.unidade.litros": { pt: "litros", en: "liters" },
  "exemplo.unidade.kmPorLitro": { pt: "km/l", en: "km/l" },
  "exemplo.unidade.gramas": { pt: "g", en: "g" },
  "exemplo.unidade.mah": { pt: "mAh", en: "mAh" },
  "exemplo.unidade.megapixels": { pt: "MP", en: "MP" },
  "exemplo.unidade.gigabytes": { pt: "GB", en: "GB" },
  "exemplo.unidade.porcento": { pt: "%", en: "%" },
  "exemplo.unidade.meses": { pt: "meses", en: "months" },

  // --- caso 1: seleção de fornecedor ----------------------------------------
  "exemplo.fornecedor.titulo": {
    pt: "Seleção de fornecedor",
    en: "Supplier selection",
  },
  "exemplo.fornecedor.resumo": {
    pt: "Quatro fornecedores, com preço, prazo, qualidade e capacidade.",
    en: "Four suppliers, on price, lead time, quality and capacity.",
  },
  "exemplo.fornecedor.nome": {
    pt: "Seleção de fornecedor",
    en: "Supplier selection",
  },
  "exemplo.fornecedor.criterio.qualidade": {
    pt: "Índice de qualidade",
    en: "Quality index",
  },
  "exemplo.fornecedor.criterio.custo": {
    pt: "Custo unitário",
    en: "Unit cost",
  },
  "exemplo.fornecedor.criterio.prazo": {
    pt: "Prazo de entrega",
    en: "Lead time",
  },
  "exemplo.fornecedor.criterio.capacidade": {
    pt: "Capacidade mensal",
    en: "Monthly capacity",
  },
  "exemplo.fornecedor.alternativa.a": {
    pt: "Fornecedor A",
    en: "Supplier A",
  },
  "exemplo.fornecedor.alternativa.b": {
    pt: "Fornecedor B",
    en: "Supplier B",
  },
  "exemplo.fornecedor.alternativa.c": {
    pt: "Fornecedor C",
    en: "Supplier C",
  },
  "exemplo.fornecedor.alternativa.d": {
    pt: "Fornecedor D",
    en: "Supplier D",
  },

  // --- caso 2: compra de um carro -------------------------------------------
  "exemplo.carro.titulo": { pt: "Compra de um carro", en: "Buying a car" },
  "exemplo.carro.resumo": {
    pt: "Quatro modelos, entre preço, consumo, espaço e manutenção.",
    en: "Four models, across price, fuel economy, space and upkeep.",
  },
  "exemplo.carro.nome": { pt: "Qual carro comprar", en: "Which car to buy" },
  "exemplo.carro.criterio.preco": { pt: "Preço", en: "Price" },
  "exemplo.carro.criterio.consumo": {
    pt: "Consumo na estrada",
    en: "Highway fuel economy",
  },
  "exemplo.carro.criterio.portaMalas": {
    pt: "Porta-malas",
    en: "Trunk space",
  },
  "exemplo.carro.criterio.manutencao": {
    pt: "Manutenção anual",
    en: "Annual maintenance",
  },
  "exemplo.carro.criterio.seguranca": {
    pt: "Nota de segurança",
    en: "Safety rating",
  },
  "exemplo.carro.alternativa.hatch": {
    pt: "Hatch 1.0 turbo",
    en: "1.0 turbo hatchback",
  },
  "exemplo.carro.alternativa.sedan": {
    pt: "Sedã 1.6 automático",
    en: "1.6 automatic sedan",
  },
  "exemplo.carro.alternativa.suv": {
    pt: "SUV compacto",
    en: "Compact SUV",
  },
  "exemplo.carro.alternativa.eletrico": {
    pt: "Elétrico de entrada",
    en: "Entry-level electric",
  },

  // --- caso 3: escolha de celular -------------------------------------------
  "exemplo.celular.titulo": {
    pt: "Escolha de celular",
    en: "Choosing a phone",
  },
  "exemplo.celular.resumo": {
    pt: "Quatro aparelhos, entre preço, bateria, câmera e peso.",
    en: "Four handsets, across price, battery, camera and weight.",
  },
  "exemplo.celular.nome": {
    pt: "Qual celular comprar",
    en: "Which phone to buy",
  },
  "exemplo.celular.criterio.preco": { pt: "Preço", en: "Price" },
  "exemplo.celular.criterio.bateria": { pt: "Bateria", en: "Battery" },
  "exemplo.celular.criterio.camera": {
    pt: "Câmera principal",
    en: "Main camera",
  },
  "exemplo.celular.criterio.peso": { pt: "Peso", en: "Weight" },
  "exemplo.celular.criterio.armazenamento": {
    pt: "Armazenamento",
    en: "Storage",
  },
  "exemplo.celular.alternativa.intermediario": {
    pt: "Intermediário 5G",
    en: "Mid-range 5G",
  },
  "exemplo.celular.alternativa.topo": {
    pt: "Topo de linha",
    en: "Flagship",
  },
  "exemplo.celular.alternativa.bateria": {
    pt: "Bateria reforçada",
    en: "Long-battery model",
  },
  "exemplo.celular.alternativa.compacto": {
    pt: "Compacto premium",
    en: "Premium compact",
  },

  // --- caso 4: plano de controle de qualidade -------------------------------
  /* "Amostragem simples" e "dupla" são os nomes dos planos na literatura de
     controle de qualidade, e em inglês são `single` e `double sampling`. */
  "exemplo.controle.titulo": {
    pt: "Plano de controle de qualidade",
    en: "Quality control plan",
  },
  "exemplo.controle.resumo": {
    pt: "Quatro planos de inspeção, entre custo, tempo e detecção de falhas.",
    en: "Four inspection plans, across cost, time and defect detection.",
  },
  "exemplo.controle.nome": {
    pt: "Plano de controle de qualidade",
    en: "Quality control plan",
  },
  "exemplo.controle.criterio.custo": {
    pt: "Custo por lote",
    en: "Cost per batch",
  },
  "exemplo.controle.criterio.tempo": {
    pt: "Tempo de inspeção",
    en: "Inspection time",
  },
  "exemplo.controle.criterio.deteccao": {
    pt: "Detecção de falhas",
    en: "Defect detection",
  },
  "exemplo.controle.criterio.treinamento": {
    pt: "Treinamento exigido",
    en: "Training required",
  },
  "exemplo.controle.alternativa.simples": {
    pt: "Amostragem simples",
    en: "Single sampling",
  },
  "exemplo.controle.alternativa.dupla": {
    pt: "Amostragem dupla",
    en: "Double sampling",
  },
  "exemplo.controle.alternativa.total": {
    pt: "Inspeção 100%",
    en: "100% inspection",
  },
  "exemplo.controle.alternativa.visao": {
    pt: "Visão computacional",
    en: "Machine vision",
  },

  // --- carteira de campanhas: a leitura combinatorial -------------------------
  "exemplo.comercial.titulo": {
    pt: "Campanhas do trimestre",
    en: "Campaigns for the quarter",
  },
  "exemplo.comercial.resumo": {
    pt: "Cinco campanhas com custo próprio, para caber num orçamento.",
    en: "Five campaigns, each with its own cost, to fit within a budget.",
  },
  "exemplo.comercial.nome": {
    pt: "Campanhas do trimestre",
    en: "Campaigns for the quarter",
  },
  "exemplo.comercial.criterio.alcance": { pt: "Alcance", en: "Reach" },
  "exemplo.comercial.criterio.conversao": {
    pt: "Conversão esperada",
    en: "Expected conversion",
  },
  "exemplo.comercial.criterio.esforco": {
    pt: "Esforço da equipe",
    en: "Team effort",
  },
  "exemplo.comercial.criterio.risco": {
    pt: "Risco para a marca",
    en: "Brand risk",
  },
  "exemplo.comercial.alternativa.feira": {
    pt: "Feira do setor",
    en: "Industry trade show",
  },
  "exemplo.comercial.alternativa.digital": {
    pt: "Mídia digital",
    en: "Digital media",
  },
  "exemplo.comercial.alternativa.televendas": {
    pt: "Força de televendas",
    en: "Telesales push",
  },
  "exemplo.comercial.alternativa.parceria": {
    pt: "Parceria com revenda",
    en: "Reseller partnership",
  },
  "exemplo.comercial.alternativa.patrocinio": {
    pt: "Patrocínio esportivo",
    en: "Sports sponsorship",
  },

  // --- carteira de investimentos: a leitura por razão -------------------------
  "exemplo.diretoria.titulo": {
    pt: "Investimentos da diretoria",
    en: "Board-level investments",
  },
  "exemplo.diretoria.resumo": {
    pt: "Cinco projetos de porte diferente, para escolher por retorno sobre o gasto.",
    en: "Five projects of different sizes, to pick by return on spend.",
  },
  "exemplo.diretoria.nome": {
    pt: "Investimentos da diretoria",
    en: "Board-level investments",
  },
  "exemplo.diretoria.criterio.retorno": {
    pt: "Retorno esperado",
    en: "Expected return",
  },
  "exemplo.diretoria.criterio.estrategia": {
    pt: "Impacto estratégico",
    en: "Strategic impact",
  },
  "exemplo.diretoria.criterio.risco": {
    pt: "Risco de execução",
    en: "Execution risk",
  },
  "exemplo.diretoria.criterio.prazo": {
    pt: "Prazo até o resultado",
    en: "Time to result",
  },
  "exemplo.diretoria.alternativa.fabrica": {
    pt: "Ampliar a fábrica",
    en: "Expand the plant",
  },
  "exemplo.diretoria.alternativa.sistema": {
    pt: "Trocar o sistema de gestão",
    en: "Replace the management system",
  },
  "exemplo.diretoria.alternativa.frota": {
    pt: "Renovar a frota",
    en: "Renew the fleet",
  },
  "exemplo.diretoria.alternativa.pesquisa": {
    pt: "Centro de pesquisa",
    en: "Research centre",
  },
  "exemplo.diretoria.alternativa.loja": {
    pt: "Loja própria",
    en: "Company-owned store",
  },
});
