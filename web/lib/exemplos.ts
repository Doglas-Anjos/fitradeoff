/**
 * Casos prontos para experimentar o método sem digitar nada.
 *
 * Um exemplo bom não é só um atalho: é o que ensina o formato. Por isso cada
 * caso tem critérios em direções diferentes (alguns onde maior é melhor, outros
 * onde menor é), unidades reais e números que não são redondos. Um exemplo com
 * tudo "maior é melhor" e valores 10, 20, 30 não mostra nada do que a tela
 * espera de verdade.
 *
 * Os custos aparecem em todos porque a problemática de carteira precisa deles,
 * e trocar de objetivo não deve obrigar a recomeçar.
 *
 * **Todo texto daqui é chave de catálogo, não texto.** Este módulo é puro, sem
 * React, e por isso não pode chamar o hook do idioma: quem monta o rascunho a
 * partir do caso é que resolve as chaves. E precisa resolver todas - um exemplo
 * em português dentro de uma interface em inglês ensina o formato errado e
 * parece defeito da ferramenta, o que é pior que não oferecer exemplo nenhum.
 *
 * Os números ficam como estão. Eles são o dado do caso, não texto dele: mudar de
 * idioma não muda quanto custa um fornecedor. A vírgula decimal é a que os
 * campos aceitam nos dois idiomas (`numeroDe` lê vírgula e ponto).
 */

import type { Direcao, Problematica } from "./types";

export interface CriterioExemplo {
  /** Chave do catálogo com o nome do critério. */
  nome: string;
  /** Chave do catálogo com a unidade; as unidades são compartilhadas. */
  unidade: string;
  direcao: Direcao;
}

export interface Exemplo {
  chave: string;
  /** Chave do catálogo: o título no cartão do caso. */
  titulo: string;
  /** Chave do catálogo: uma linha sobre a decisão que o caso representa. */
  resumo: string;
  /** Problemática que combina com o caso; a tela pode sobrescrever. */
  sugerida: Problematica;
  /** Chave do catálogo: o nome que a decisão recebe ao carregar o caso. */
  nome: string;
  criterios: CriterioExemplo[];
  /** Chaves do catálogo, uma por alternativa. */
  alternativas: string[];
  /** Uma linha por alternativa, uma coluna por critério. */
  consequencias: string[][];
  custos: string[];
}

/* Uma nota sobre `unidade`: ela é sufixo de número, e por isso guarda unidade
   de verdade -- "R$", "dias", "km/l". A faixa de uma escala não entra aqui.
   "Segurança 4 0 a 5" foi o que apareceu na tela quando ela entrou: o valor e a
   faixa colados viram uma coisa só, ilegível. A faixa de um critério já é dita
   pelos próprios extremos, que a tela mostra lado a lado. */
export const EXEMPLOS: Exemplo[] = [
  {
    chave: "fornecedor",
    titulo: "exemplo.fornecedor.titulo",
    resumo: "exemplo.fornecedor.resumo",
    sugerida: "escolha",
    nome: "exemplo.fornecedor.nome",
    criterios: [
      {
        nome: "exemplo.fornecedor.criterio.qualidade",
        unidade: "exemplo.unidade.nenhuma",
        direcao: "max",
      },
      {
        nome: "exemplo.fornecedor.criterio.custo",
        unidade: "exemplo.unidade.reaisPorUnidade",
        direcao: "min",
      },
      {
        nome: "exemplo.fornecedor.criterio.prazo",
        unidade: "exemplo.unidade.dias",
        direcao: "min",
      },
      {
        nome: "exemplo.fornecedor.criterio.capacidade",
        unidade: "exemplo.unidade.milUnidades",
        direcao: "max",
      },
    ],
    alternativas: [
      "exemplo.fornecedor.alternativa.a",
      "exemplo.fornecedor.alternativa.b",
      "exemplo.fornecedor.alternativa.c",
      "exemplo.fornecedor.alternativa.d",
    ],
    consequencias: [
      ["0,82", "12,50", "30", "120"],
      ["0,95", "15,80", "12", "90"],
      ["0,71", "10,20", "45", "200"],
      ["0,88", "14,10", "20", "140"],
    ],
    custos: ["12", "16", "9", "14"],
  },
  {
    chave: "carro",
    titulo: "exemplo.carro.titulo",
    resumo: "exemplo.carro.resumo",
    sugerida: "escolha",
    nome: "exemplo.carro.nome",
    criterios: [
      {
        nome: "exemplo.carro.criterio.preco",
        unidade: "exemplo.unidade.reaisMil",
        direcao: "min",
      },
      {
        nome: "exemplo.carro.criterio.consumo",
        unidade: "exemplo.unidade.kmPorLitro",
        direcao: "max",
      },
      {
        nome: "exemplo.carro.criterio.portaMalas",
        unidade: "exemplo.unidade.litros",
        direcao: "max",
      },
      {
        nome: "exemplo.carro.criterio.manutencao",
        unidade: "exemplo.unidade.reais",
        direcao: "min",
      },
      {
        nome: "exemplo.carro.criterio.seguranca",
        unidade: "exemplo.unidade.nenhuma",
        direcao: "max",
      },
    ],
    alternativas: [
      "exemplo.carro.alternativa.hatch",
      "exemplo.carro.alternativa.sedan",
      "exemplo.carro.alternativa.suv",
      "exemplo.carro.alternativa.eletrico",
    ],
    consequencias: [
      ["89,9", "14,2", "300", "2380", "4"],
      ["112,5", "12,8", "470", "2740", "5"],
      ["147,3", "11,4", "422", "3120", "5"],
      ["168,0", "0", "285", "1490", "4"],
    ],
    custos: ["89,9", "112,5", "147,3", "168"],
  },
  {
    chave: "celular",
    titulo: "exemplo.celular.titulo",
    resumo: "exemplo.celular.resumo",
    sugerida: "ranking",
    nome: "exemplo.celular.nome",
    criterios: [
      {
        nome: "exemplo.celular.criterio.preco",
        unidade: "exemplo.unidade.reais",
        direcao: "min",
      },
      {
        nome: "exemplo.celular.criterio.bateria",
        unidade: "exemplo.unidade.mah",
        direcao: "max",
      },
      {
        nome: "exemplo.celular.criterio.camera",
        unidade: "exemplo.unidade.megapixels",
        direcao: "max",
      },
      {
        nome: "exemplo.celular.criterio.peso",
        unidade: "exemplo.unidade.gramas",
        direcao: "min",
      },
      {
        nome: "exemplo.celular.criterio.armazenamento",
        unidade: "exemplo.unidade.gigabytes",
        direcao: "max",
      },
    ],
    alternativas: [
      "exemplo.celular.alternativa.intermediario",
      "exemplo.celular.alternativa.topo",
      "exemplo.celular.alternativa.bateria",
      "exemplo.celular.alternativa.compacto",
    ],
    consequencias: [
      ["1899", "5000", "50", "195", "128"],
      ["4790", "4400", "200", "221", "512"],
      ["2350", "6800", "64", "228", "256"],
      ["3640", "3900", "48", "167", "256"],
    ],
    custos: ["1899", "4790", "2350", "3640"],
  },
  {
    chave: "controle",
    titulo: "exemplo.controle.titulo",
    resumo: "exemplo.controle.resumo",
    sugerida: "sorting",
    nome: "exemplo.controle.nome",
    criterios: [
      {
        nome: "exemplo.controle.criterio.custo",
        unidade: "exemplo.unidade.reais",
        direcao: "min",
      },
      {
        nome: "exemplo.controle.criterio.tempo",
        unidade: "exemplo.unidade.horas",
        direcao: "min",
      },
      {
        nome: "exemplo.controle.criterio.deteccao",
        unidade: "exemplo.unidade.porcento",
        direcao: "max",
      },
      {
        nome: "exemplo.controle.criterio.treinamento",
        unidade: "exemplo.unidade.horas",
        direcao: "min",
      },
    ],
    alternativas: [
      "exemplo.controle.alternativa.simples",
      "exemplo.controle.alternativa.dupla",
      "exemplo.controle.alternativa.total",
      "exemplo.controle.alternativa.visao",
    ],
    consequencias: [
      ["340", "1,5", "72", "8"],
      ["510", "2,4", "88", "16"],
      ["1470", "9,2", "99", "12"],
      ["2180", "0,7", "94", "40"],
    ],
    custos: ["340", "510", "1470", "2180"],
  },
  /* Os dois abaixo completam a cobertura: com eles, cada uma das cinco leituras
     tem um caso pronto de onde partir. Antes, as duas carteiras -- justamente
     as que exigem custo e orçamento, e as que mais custam para montar à mão --
     não tinham nenhum. */
  {
    chave: "comercial",
    titulo: "exemplo.comercial.titulo",
    resumo: "exemplo.comercial.resumo",
    sugerida: "portfolio",
    nome: "exemplo.comercial.nome",
    criterios: [
      {
        nome: "exemplo.comercial.criterio.alcance",
        unidade: "exemplo.unidade.milPessoas",
        direcao: "max",
      },
      {
        nome: "exemplo.comercial.criterio.conversao",
        unidade: "exemplo.unidade.porcento",
        direcao: "max",
      },
      {
        nome: "exemplo.comercial.criterio.esforco",
        unidade: "exemplo.unidade.horas",
        direcao: "min",
      },
      {
        nome: "exemplo.comercial.criterio.risco",
        unidade: "exemplo.unidade.nenhuma",
        direcao: "min",
      },
    ],
    alternativas: [
      "exemplo.comercial.alternativa.feira",
      "exemplo.comercial.alternativa.digital",
      "exemplo.comercial.alternativa.televendas",
      "exemplo.comercial.alternativa.parceria",
      "exemplo.comercial.alternativa.patrocinio",
    ],
    consequencias: [
      ["48", "3,2", "180", "1"],
      ["310", "1,1", "60", "2"],
      ["22", "6,8", "320", "3"],
      ["95", "4,5", "110", "2"],
      ["260", "0,9", "40", "4"],
    ],
    custos: ["85", "120", "60", "45", "210"],
  },
  {
    chave: "diretoria",
    titulo: "exemplo.diretoria.titulo",
    resumo: "exemplo.diretoria.resumo",
    sugerida: "beneficio_custo",
    nome: "exemplo.diretoria.nome",
    criterios: [
      {
        nome: "exemplo.diretoria.criterio.retorno",
        unidade: "exemplo.unidade.reaisMil",
        direcao: "max",
      },
      {
        nome: "exemplo.diretoria.criterio.estrategia",
        unidade: "exemplo.unidade.nenhuma",
        direcao: "max",
      },
      {
        nome: "exemplo.diretoria.criterio.risco",
        unidade: "exemplo.unidade.nenhuma",
        direcao: "min",
      },
      {
        nome: "exemplo.diretoria.criterio.prazo",
        unidade: "exemplo.unidade.meses",
        direcao: "min",
      },
    ],
    alternativas: [
      "exemplo.diretoria.alternativa.fabrica",
      "exemplo.diretoria.alternativa.sistema",
      "exemplo.diretoria.alternativa.frota",
      "exemplo.diretoria.alternativa.pesquisa",
      "exemplo.diretoria.alternativa.loja",
    ],
    consequencias: [
      ["4200", "5", "4", "36"],
      ["980", "4", "2", "9"],
      ["620", "2", "1", "6"],
      ["2600", "5", "5", "48"],
      ["1450", "3", "3", "18"],
    ],
    custos: ["3100", "450", "520", "1800", "900"],
  },
];

export const exemploPorChave = (chave: string): Exemplo | undefined =>
  EXEMPLOS.find((e) => e.chave === chave);
