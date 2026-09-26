import { describe, expect, it } from "vitest";

import {
  SORTING_PADRAO,
  numeroDe,
  validarSorting,
  type ConfigSorting,
} from "@/components/ConfiguracaoProblematica";
import { ehCarteira, exigeAjustes } from "@/lib/rascunho";

const com = (parcial: Partial<ConfigSorting>): ConfigSorting => ({
  ...SORTING_PADRAO,
  ...parcial,
});

describe("numeroDe", () => {
  it("aceita vírgula, que é como se digita em português", () => {
    expect(numeroDe("0,35")).toBe(0.35);
    expect(numeroDe("0.35")).toBe(0.35);
  });

  it("devolve NaN no que não é número, em vez de zero", () => {
    // zero seria um corte válido e silencioso; NaN faz a validação falar
    expect(Number.isNaN(numeroDe("abc"))).toBe(true);
  });
});

/* Como no rascunho: a validacao devolve a chave da recusa, nao a frase. */
describe("validarSorting", () => {
  it("aprova o padrão", () => {
    expect(validarSorting(SORTING_PADRAO)).toBeNull();
  });

  it("exige nome em toda faixa", () => {
    expect(validarSorting(com({ classes: ["Baixa", "  ", "Alta"] }))?.chave).toBe(
      "dominio.sorting.faixaSemNome",
    );
  });

  it("recusa corte fora de 0 a 1, porque o corte é em valor global", () => {
    const fora = "dominio.sorting.corteForaDaEscala";
    expect(validarSorting(com({ cortes: ["0,35", "1,5"] }))?.chave).toBe(fora);
    expect(validarSorting(com({ cortes: ["0", "0,7"] }))?.chave).toBe(fora);
  });

  it("recusa corte que não é número", () => {
    expect(validarSorting(com({ cortes: ["0,35", "alto"] }))?.chave).toBe(
      "dominio.sorting.corteNaoNumero",
    );
  });

  it("exige cortes crescentes, da pior faixa para a melhor", () => {
    const crescentes = "dominio.sorting.cortesCrescentes";
    expect(validarSorting(com({ cortes: ["0,7", "0,35"] }))?.chave).toBe(crescentes);
    // empate tambem nao serve: deixaria uma faixa de largura zero
    expect(validarSorting(com({ cortes: ["0,5", "0,5"] }))?.chave).toBe(crescentes);
  });

  it("o padrão tem um corte a menos que faixas", () => {
    expect(SORTING_PADRAO.cortes).toHaveLength(SORTING_PADRAO.classes.length - 1);
  });
});

/**
 * O predicado das carteiras.
 *
 * Existe porque a pergunta "isto é uma carteira?" era feita comparando com o
 * literal `"portfolio"` em sete lugares do front. Quando o motor ganhou a
 * carteira por razão, cada um precisou ser achado à mão — e um não foi, o que
 * derrubou a tela de decisão inteira com um erro de cliente.
 */
describe("ehCarteira", () => {
  it("vale para as duas leituras de carteira", () => {
    expect(ehCarteira("portfolio")).toBe(true);
    expect(ehCarteira("beneficio_custo")).toBe(true);
  });

  it("não vale para as outras três", () => {
    for (const p of ["escolha", "ranking", "sorting"] as const) {
      expect(ehCarteira(p), `${p} não é carteira`).toBe(false);
    }
  });

  it("as duas carteiras exigem ajuste antes de criar; escolha e ranking não", () => {
    /* As duas pedem custo e orçamento. Se uma delas pulasse o passo de ajustes,
       a criação falharia no motor com "orcamento ausente" — que foi o defeito
       que o painel de configuração nasceu para impedir. */
    expect(exigeAjustes("portfolio")).toBe(true);
    expect(exigeAjustes("beneficio_custo")).toBe(true);
    expect(exigeAjustes("sorting")).toBe(true);
    expect(exigeAjustes("escolha")).toBe(false);
    expect(exigeAjustes("ranking")).toBe(false);
  });
});
