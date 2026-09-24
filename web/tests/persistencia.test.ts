/**
 * O armazenamento local pode simplesmente nao existir -- janela privada, dados
 * bloqueados, cota cheia. A tela precisa funcionar igual nesses casos.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { esquecerRecente, lerRecentes, registrarRecente } from "@/lib/persistencia";

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("decisoes recentes", () => {
  it("guarda a mais recente primeiro", () => {
    registrarRecente("d1", "Fornecedores");
    registrarRecente("d2", "Servidores");
    expect(lerRecentes().map((r) => r.id)).toEqual(["d2", "d1"]);
  });

  it("abrir de novo promove sem duplicar", () => {
    registrarRecente("d1", "Fornecedores");
    registrarRecente("d2", "Servidores");
    registrarRecente("d1", "Fornecedores");
    expect(lerRecentes().map((r) => r.id)).toEqual(["d1", "d2"]);
  });

  it("guarda no maximo oito", () => {
    for (let i = 0; i < 12; i++) registrarRecente(`d${i}`, `Decisão ${i}`);
    expect(lerRecentes()).toHaveLength(8);
    expect(lerRecentes()[0].id).toBe("d11");
  });

  it("esquecer remove so a indicada", () => {
    registrarRecente("d1", "A");
    registrarRecente("d2", "B");
    esquecerRecente("d1");
    expect(lerRecentes().map((r) => r.id)).toEqual(["d2"]);
  });

  it("devolve lista vazia quando nunca houve nada", () => {
    expect(lerRecentes()).toEqual([]);
  });
});

describe("armazenamento indisponivel", () => {
  it("leitura devolve vazio em vez de explodir", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(lerRecentes()).toEqual([]);
  });

  it("escrita falha em silencio, sem derrubar a tela", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("cota cheia");
    });
    expect(() => registrarRecente("d1", "A")).not.toThrow();
  });

  it("conteudo corrompido nao quebra a leitura", () => {
    window.localStorage.setItem("fitradeoff:recentes", "{ nao e json");
    expect(lerRecentes()).toEqual([]);
  });
});
