/**
 * Colar uma tabela inteira na matriz de desempenhos.
 *
 * O que se verifica aqui não é só "preencheu": é **o que a colagem recusa**.
 * Uma colagem que aceita tudo em silêncio é pior do que não existir — os
 * números entram deslocados, ninguém percebe, e a decisão sai errada de um
 * jeito que nenhuma tela posterior denuncia.
 */

import { describe, expect, it } from "vitest";

import {
  RASCUNHO_VAZIO,
  adicionarAlternativa,
  adicionarCriterio,
  colarNaMatriz,
  criterioVazio,
  pareceTabela,
  type CriterioRascunho,
  type Rascunho,
} from "@/lib/rascunho";

const criterio = (parcial: Partial<CriterioRascunho> = {}): CriterioRascunho => ({
  ...criterioVazio(),
  nome: "Custo",
  ...parcial,
});

/** Três alternativas × dois critérios contínuos, tudo vazio. */
function grade(): Rascunho {
  let r: Rascunho = { ...RASCUNHO_VAZIO };
  r = adicionarCriterio(r, criterio({ nome: "Custo", direcao: "min" }));
  r = adicionarCriterio(r, criterio({ nome: "Prazo", direcao: "min" }));
  r = adicionarAlternativa(r, "A");
  r = adicionarAlternativa(r, "B");
  r = adicionarAlternativa(r, "C");
  return r;
}

const valores = (r: Rascunho) => r.linhas.map((l) => l.valores);

describe("colar preenche a grade", () => {
  it("bloco com TAB entra a partir do canto", () => {
    const r = colarNaMatriz(grade(), 0, 0, "120\t30\n95\t45\n80\t60");

    expect(r.preenchidas).toBe(6);
    expect(valores(r.rascunho)).toEqual([
      ["120", "30"],
      ["95", "45"],
      ["80", "60"],
    ]);
  });

  it("começa na célula indicada, não no canto", () => {
    const r = colarNaMatriz(grade(), 1, 1, "45\n60");

    expect(valores(r.rascunho)).toEqual([
      ["", ""],
      ["", "45"],
      ["", "60"],
    ]);
  });

  it("aceita ponto e vírgula, preservando o decimal com vírgula", () => {
    const r = colarNaMatriz(grade(), 0, 0, "12,5;30\n9,75;45");

    expect(valores(r.rascunho)[0]).toEqual(["12,5", "30"]);
    expect(valores(r.rascunho)[1]).toEqual(["9,75", "45"]);
  });

  it("aceita vírgula como separador quando não há TAB nem ponto e vírgula", () => {
    const r = colarNaMatriz(grade(), 0, 0, "120,30\n95,45");

    expect(valores(r.rascunho)[0]).toEqual(["120", "30"]);
  });

  it("CRLF do Excel no Windows não vira linha fantasma", () => {
    const r = colarNaMatriz(grade(), 0, 0, "120\t30\r\n95\t45\r\n");

    expect(r.preenchidas).toBe(4);
    expect(valores(r.rascunho)[2]).toEqual(["", ""]);
  });

  it("célula vazia no meio do bloco não apaga o que já estava lá", () => {
    const antes = colarNaMatriz(grade(), 0, 0, "120\t30\n95\t45").rascunho;
    const r = colarNaMatriz(antes, 0, 0, "\t99");

    expect(valores(r.rascunho)[0]).toEqual(["120", "99"]);
  });
});

describe("colar recusa o que não cabe, e conta", () => {
  it("o que passa da última linha é descartado, não cria alternativa", () => {
    const r = colarNaMatriz(grade(), 0, 0, "1\t2\n3\t4\n5\t6\n7\t8");

    expect(r.rascunho.linhas).toHaveLength(3);
    expect(r.preenchidas).toBe(6);
    expect(r.foraDaGrade).toBe(2);
  });

  it("o que passa da última coluna é descartado, não cria critério", () => {
    const r = colarNaMatriz(grade(), 0, 0, "1\t2\t3");

    expect(r.rascunho.colunas).toHaveLength(2);
    expect(r.preenchidas).toBe(2);
    expect(r.foraDaGrade).toBe(1);
  });

  it("critério de escala construída só aceita nível declarado", () => {
    let base: Rascunho = { ...RASCUNHO_VAZIO };
    base = adicionarCriterio(
      base,
      criterio({ nome: "Porte", escala: "discreta", niveis: ["1", "2", "3"] }),
    );
    base = adicionarAlternativa(base, "A");
    base = adicionarAlternativa(base, "B");

    const r = colarNaMatriz(base, 0, 0, "2\n7");

    expect(valores(r.rascunho)).toEqual([["2"], [""]]);
    expect(r.preenchidas).toBe(1);
    expect(r.recusados).toBe(1);
  });

  it("texto que não é tabela não mexe em nada", () => {
    const antes = grade();
    const r = colarNaMatriz(antes, 0, 0, "   ");

    expect(r.rascunho).toBe(antes);
    expect(r.preenchidas).toBe(0);
  });

  it("uma célula só com decimal por vírgula não vira duas células", () => {
    /* Copiar `12,5` de uma célula do Excel põe "12,5\r\n" na área de
       transferência. Tratando a vírgula como separador numa linha só, o número
       virava `12` numa célula e `5` na vizinha — em silêncio, com um aviso
       dizendo "2 células preenchidas". */
    const antes = grade();

    expect(pareceTabela("12,5\r\n")).toBe(false);
    const r = colarNaMatriz(antes, 0, 0, "12,5\r\n");
    expect(r.preenchidas).toBe(0);
    expect(valores(r.rascunho)[0]).toEqual(["", ""]);
  });

  it("mas um bloco de várias linhas separado por vírgula ainda é tabela", () => {
    expect(pareceTabela("120,30\n95,45")).toBe(true);
    expect(pareceTabela("120\t30")).toBe(true);
    expect(pareceTabela("120;30")).toBe(true);
  });
});

describe("colar na carteira alcança a coluna de custo", () => {
  it("a última coluna do bloco vira o custo quando a carteira pede", () => {
    const r = colarNaMatriz(grade(), 0, 0, "120\t30\t900\n95\t45\t750", true);

    expect(r.preenchidas).toBe(6);
    expect(r.rascunho.linhas.map((l) => l.custo)).toEqual(["900", "750", ""]);
  });

  it("sem carteira, essa mesma coluna fica de fora", () => {
    const r = colarNaMatriz(grade(), 0, 0, "120\t30\t900", false);

    expect(r.foraDaGrade).toBe(1);
    expect(r.rascunho.linhas[0].custo).toBe("");
  });
});
