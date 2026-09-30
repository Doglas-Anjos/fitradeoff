/**
 * A ordenacao por comparacao precisa produzir a ordem certa com poucas
 * perguntas -- e ser reconstrutivel, para que voltar atras funcione.
 */

import { describe, expect, it } from "vitest";

import {
  iniciar,
  proxima,
  reconstruir,
  responder,
  restantes,
  terminou,
  type EstadoOrdenacao,
  type RespostaComparacao,
} from "@/lib/ordenacaoPorComparacao";

/** Responde como se a ordem verdadeira fosse a informada. */
function simular(criterios: string[], verdadeira: string[]): {
  ordem: string[];
  perguntas: number;
} {
  let estado = iniciar(criterios);
  let perguntas = 0;
  while (!terminou(estado)) {
    const c = proxima(estado)!;
    const resposta: RespostaComparacao =
      verdadeira.indexOf(c.a) < verdadeira.indexOf(c.b) ? "A" : "B";
    estado = responder(estado, resposta);
    perguntas++;
    if (perguntas > 100) throw new Error("não convergiu");
  }
  return { ordem: estado.ordenados, perguntas };
}

describe("ordenacao por comparacao", () => {
  it("um criterio nao precisa de pergunta", () => {
    const estado = iniciar(["a"]);
    expect(terminou(estado)).toBe(true);
    expect(estado.ordenados).toEqual(["a"]);
  });

  it("lista vazia nao quebra", () => {
    expect(terminou(iniciar([]))).toBe(true);
  });

  it("reproduz a ordem verdadeira", () => {
    const criterios = ["a", "b", "c", "d", "e"];
    const verdadeira = ["c", "a", "e", "b", "d"];
    expect(simular(criterios, verdadeira).ordem).toEqual(verdadeira);
  });

  it("reproduz a ordem mesmo quando a entrada ja esta ordenada", () => {
    const ordem = ["a", "b", "c", "d"];
    expect(simular(ordem, ordem).ordem).toEqual(ordem);
  });

  it("reproduz a ordem invertida", () => {
    const criterios = ["a", "b", "c", "d"];
    const verdadeira = ["d", "c", "b", "a"];
    expect(simular(criterios, verdadeira).ordem).toEqual(verdadeira);
  });

  it("faz menos perguntas que todos contra todos", () => {
    const criterios = ["a", "b", "c", "d", "e", "f", "g"];
    const { perguntas } = simular(criterios, ["d", "b", "f", "a", "g", "c", "e"]);
    const todosContraTodos = (7 * 6) / 2; // 21
    expect(perguntas).toBeLessThan(todosContraTodos);
    expect(perguntas).toBeLessThanOrEqual(15);
  });

  /* As duas sequências abaixo foram lidas nas telas do FITradeoff oficial
     (30/09/2026). Cada par é [já ordenado, novo], como ele os mostra. */
  function sequencia(criterios: string[], verdadeira: string[]): string[][] {
    let estado = iniciar(criterios);
    const pares: string[][] = [];
    while (!terminou(estado)) {
      const c = proxima(estado)!;
      pares.push([c.b, c.a]);
      estado = responder(
        estado,
        verdadeira.indexOf(c.a) < verdadeira.indexOf(c.b) ? "A" : "B",
      );
    }
    return pares;
  }

  it("com sete criterios ja na ordem, faz as 15 comparacoes do oficial", () => {
    const c = ["Q", "C", "P", "D", "S", "Co", "E"];
    expect(sequencia(c, c)).toEqual([
      ["Q", "C"],
      ["Q", "P"], ["C", "P"],
      ["C", "D"], ["P", "D"],
      ["C", "S"], ["P", "S"], ["D", "S"],
      ["P", "Co"], ["D", "Co"], ["S", "Co"],
      ["P", "E"], ["D", "E"], ["S", "E"], ["Co", "E"],
    ]);
  });

  it("quem fica acima do meio sobe um a um, como no oficial", () => {
    // Consumo vence Prazo (o meio) e perde para Custo: 10 comparacoes
    const c = ["Q", "C", "P", "D", "S", "Co"];
    expect(sequencia(c, ["Q", "C", "Co", "P", "D", "S"])).toEqual([
      ["Q", "C"],
      ["Q", "P"], ["C", "P"],
      ["C", "D"], ["P", "D"],
      ["C", "S"], ["P", "S"], ["D", "S"],
      ["P", "Co"], ["C", "Co"],
    ]);
  });

  it("a estimativa de restantes nunca fica abaixo do que de fato falta", () => {
    const c = ["a", "b", "c", "d", "e", "f", "g"];
    const verdadeira = ["d", "b", "f", "a", "g", "c", "e"];
    let estado = iniciar(c);
    let feitas = 0;
    const estimativas: number[] = [];
    while (!terminou(estado)) {
      estimativas.push(restantes(estado));
      const p = proxima(estado)!;
      estado = responder(estado, verdadeira.indexOf(p.a) < verdadeira.indexOf(p.b) ? "A" : "B");
      feitas++;
    }
    estimativas.forEach((e, i) => expect(e).toBeGreaterThanOrEqual(feitas - i));
    expect(restantes(estado)).toBe(0);
  });

  it("o empate posiciona sem afirmar ordem, e fica registrado", () => {
    let estado = iniciar(["a", "b"]);
    estado = responder(estado, "indiferente");
    expect(terminou(estado)).toBe(true);
    expect(estado.empates).toEqual([["b", "a"]]);
    expect(estado.ordenados).toHaveLength(2);
  });

  it("estima quantas perguntas faltam", () => {
    const estado = iniciar(["a", "b", "c", "d"]);
    expect(restantes(estado)).toBeGreaterThan(0);
    // e a estimativa diminui conforme se responde
    const depois = responder(estado, "A");
    expect(restantes(depois)).toBeLessThanOrEqual(restantes(estado));
  });

  it("nao ha pergunta quando a ordem esta completa", () => {
    let estado = iniciar(["a", "b"]);
    estado = responder(estado, "A");
    expect(proxima(estado)).toBeNull();
  });

  it("reconstruir do historico da o mesmo estado", () => {
    const criterios = ["a", "b", "c", "d"];
    const respostas: RespostaComparacao[] = ["A", "B", "A"];

    let passo: EstadoOrdenacao = iniciar(criterios);
    for (const r of respostas) passo = responder(passo, r);

    expect(reconstruir(criterios, respostas)).toEqual(passo);
  });

  it("reconstruir com menos respostas volta no tempo", () => {
    const criterios = ["a", "b", "c", "d"];
    const cheio = reconstruir(criterios, ["A", "B", "A", "B"]);
    const anterior = reconstruir(criterios, ["A", "B", "A"]);
    expect(anterior.ordenados.length).toBeLessThanOrEqual(cheio.ordenados.length);
  });

  it("responder depois de terminar nao muda nada", () => {
    let estado = iniciar(["a", "b"]);
    estado = responder(estado, "A");
    expect(responder(estado, "B")).toEqual(estado);
  });
});
