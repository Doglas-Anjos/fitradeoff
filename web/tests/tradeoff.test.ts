/**
 * O enunciado da pergunta chega como texto da API e e quebrado aqui para virar
 * grafico. E o ponto que quebra calado: se o formato mudar do outro lado, as
 * barras somem e nenhum erro aparece.
 */

import { describe, expect, it } from "vitest";

import { parseLinha } from "@/components/TradeoffChart";

describe("parseLinha", () => {
  it("le o criterio em destaque com unidade", () => {
    const l = parseLinha("Custo unitario: 12.5 R$/un", 0.5);
    expect(l.criterio).toBe("Custo unitario");
    expect(l.texto).toBe("12.5 R$/un");
    expect(l.destaque).toBe(true);
    expect(l.fracao).toBe(0.5);
  });

  it("marca o pior desempenho com fracao zero", () => {
    const l = parseLinha("Prazo de entrega: 45 dias (o pior possivel)", 0.5);
    expect(l.texto).toBe("45 dias");
    expect(l.destaque).toBe(false);
    expect(l.fracao).toBe(0);
  });

  it("marca o melhor desempenho com fracao um", () => {
    const l = parseLinha("Custo unitario: 10.2 R$/un (o melhor possivel)", 0.5);
    expect(l.texto).toBe("10.2 R$/un");
    expect(l.destaque).toBe(true);
    expect(l.fracao).toBe(1);
  });

  it("funciona sem unidade", () => {
    const l = parseLinha("Indice de qualidade: 0.83", 0.75);
    expect(l.texto).toBe("0.83");
    expect(l.fracao).toBe(0.75);
  });

  it("preserva dois pontos dentro do valor", () => {
    // um criterio de horario chegaria assim
    const l = parseLinha("Janela de entrega: 08:30 h", 0.5);
    expect(l.criterio).toBe("Janela de entrega");
    expect(l.texto).toBe("08:30 h");
  });

  it("aceita nome de criterio com acento", () => {
    const l = parseLinha("Índice de qualidade: 0.95 (o melhor possivel)", 0.5);
    expect(l.criterio).toBe("Índice de qualidade");
    expect(l.fracao).toBe(1);
  });
});
