/**
 * Os cinco módulos, e o que cada um tem de prova.
 *
 * O sistema de referência organiza tudo por módulo: quem chega escolhe um
 * antes de cadastrar qualquer coisa. Esta área segue a mesma divisão, porque
 * quem quer conferir a equivalência quer conferir *do módulo que vai usar* — e
 * o placar agregado não responde isso.
 *
 * A prosa mora no catálogo de tradução, sob `paridade.mod.<rota>.*`. Aqui fica
 * só o que não é texto: a rota, a chave da problemática nos dados medidos, e se
 * o módulo chegou a ser comparado. Esse último campo é o que impede a tela de
 * apresentar um módulo não testado com a mesma cara dos testados.
 */

import { PARIDADE, type CasoParidade } from "@/lib/paridade";

export interface Modulo {
  /** Último segmento da rota, e sufixo das chaves de tradução. */
  rota: string;
  /** Como a problemática aparece em `lib/paridade.ts`. */
  problematica: string;
  /**
   * `exato` quando o resultado sai de programação linear, sem amostragem.
   * As duas carteiras aproximam a seleção final, e a tela precisa dizer isso
   * no lugar onde alguém leria o resultado — não só na documentação.
   */
  exatidao: "exato" | "aproximado";
  /**
   * Sufixo da chave em `paridade.restam.*`, quando este módulo tem uma
   * divergência conhecida. Fica no registro, e não deduzido dos dados, porque
   * "tem caso que nao bate" e "temos uma explicacao para isso" sao coisas
   * diferentes -- a classificacao nao tem divergencia e o combinatorial tem
   * uma sem nenhum caso que a exiba.
   */
  divergencia?: string;
}

export const MODULOS: Modulo[] = [
  {
    rota: "escolha",
    problematica: "escolha",
    exatidao: "exato",
    divergencia: "degenerado",
  },
  {
    rota: "ordenacao",
    problematica: "ranking",
    exatidao: "exato",
  },
  { rota: "classificacao", problematica: "sorting", exatidao: "exato" },
  {
    rota: "combinatorial",
    problematica: "portfolio",
    exatidao: "aproximado",
    divergencia: "carteira",
  },
  {
    rota: "beneficio-custo",
    problematica: "beneficio_custo",
    exatidao: "aproximado",
  },
];

export function moduloPorRota(rota: string | undefined): Modulo | undefined {
  return MODULOS.find((m) => m.rota === rota);
}

export function casosDe(modulo: Modulo): CasoParidade[] {
  return PARIDADE.filter((c) => c.problematica === modulo.problematica);
}

export interface PlacarModulo {
  /** Casos em que os dois sistemas puderam ser comparados. */
  comparaveis: number;
  /** Destes, quantos bateram em número de perguntas. */
  bate: number;
  /** Casos em que o sistema oficial não completa. */
  travados: number;
  maiorProblema: number;
}

export function placarDe(modulo: Modulo): PlacarModulo {
  const casos = casosDe(modulo);
  const comparaveis = casos.filter((c) => c.oficial !== null);
  return {
    comparaveis: comparaveis.length,
    bate: comparaveis.filter((c) => c.bate).length,
    travados: casos.length - comparaveis.length,
    maiorProblema: casos.reduce((m, c) => Math.max(m, c.alternativas), 0),
  };
}
