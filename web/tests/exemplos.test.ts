/**
 * Os casos prontos, como dados.
 *
 * O defeito que trouxe este arquivo: "Segurança" vinha com a unidade "0 a 5", e
 * a tela de comparação escreve valor e unidade colados. Saía **"4 0 a 5"** --
 * duas informações grudadas numa só, ilegível.
 *
 * A causa é conceitual, não de layout: `unidade` é sufixo de número e guarda
 * unidade de verdade ("R$", "dias", "km/l"). A faixa de uma escala não é
 * unidade, e já está dita pelos próprios extremos do critério. Consertar só a
 * ocorrência deixaria a porta aberta para a próxima, então o que se verifica
 * aqui é a regra.
 */

import { describe, expect, it } from "vitest";

import { DOMINIO } from "@/lib/i18n/dominio";
import { EXEMPLOS } from "@/lib/exemplos";

/** "0 a 5", "0 to 5", "1-10": faixa, não unidade. */
const PARECE_FAIXA = /^\d+([.,]\d+)?\s*(a|to|-|–|até)\s*\d+([.,]\d+)?$/i;

const traduzido = (chave: string, idioma: "pt" | "en" | "es") =>
  (DOMINIO[chave]?.[idioma] ?? chave).trim();

describe("as unidades dos casos prontos", () => {
  const unidades = EXEMPLOS.flatMap((exemplo) =>
    exemplo.criterios.map((criterio) => ({
      caso: exemplo.chave,
      criterio: criterio.nome,
      chave: criterio.unidade,
    })),
  );

  it("nenhuma unidade é a faixa da escala disfarçada", () => {
    for (const { caso, criterio, chave } of unidades) {
      for (const idioma of ["pt", "en", "es"] as const) {
        const texto = traduzido(chave, idioma);
        expect(
          PARECE_FAIXA.test(texto),
          `${caso} · ${criterio} (${idioma}) usa "${texto}" como unidade, e isso é uma faixa`,
        ).toBe(false);
      }
    }
  });

  it("toda chave de unidade existe no catálogo, em todo idioma", () => {
    /* Uma chave sem tradução aparece na tela como a própria chave -- e ao lado
       de um número ela passa por unidade estranha em vez de erro. */
    for (const { caso, criterio, chave } of unidades) {
      expect(DOMINIO[chave], `${caso} · ${criterio}: chave ${chave} não existe`).toBeDefined();
      expect(typeof DOMINIO[chave]?.pt).toBe("string");
      expect(typeof DOMINIO[chave]?.en).toBe("string");
      expect(typeof DOMINIO[chave]?.es).toBe("string");
    }
  });
});

describe("a forma dos casos prontos", () => {
  it("cada caso tem uma linha de consequências por alternativa", () => {
    for (const exemplo of EXEMPLOS) {
      expect(exemplo.consequencias, exemplo.chave).toHaveLength(
        exemplo.alternativas.length,
      );
    }
  });

  it("cada linha tem uma coluna por critério", () => {
    for (const exemplo of EXEMPLOS) {
      for (const [i, linha] of exemplo.consequencias.entries()) {
        expect(linha, `${exemplo.chave}, linha ${i}`).toHaveLength(
          exemplo.criterios.length,
        );
      }
    }
  });

  it("os casos de carteira trazem um custo por alternativa", () => {
    /* Sem custo, aplicar o caso levaria a pessoa até o passo de orçamento para
       ela descobrir lá que falta o dado -- e voltar dois passos para preenchê-lo
       à mão, alternativa por alternativa. */
    for (const exemplo of EXEMPLOS) {
      if (exemplo.sugerida !== "portfolio" && exemplo.sugerida !== "beneficio_custo") {
        continue;
      }
      expect(exemplo.custos, exemplo.chave).toHaveLength(exemplo.alternativas.length);
      for (const custo of exemplo.custos) {
        expect(Number(custo.replace(",", ".")), `${exemplo.chave}: custo "${custo}"`)
          .toBeGreaterThan(0);
      }
    }
  });
});
