/**
 * As leituras do resultado.
 *
 * Cada frase da sintese e uma afirmacao sobre a decisao do usuario, entao o
 * que este arquivo protege nao e o texto: e o direito de dizer aquilo.
 *
 * O caso que mais importa e o das faixas que se sobrepoem. As faixas de valor
 * sao calculadas alternativa a alternativa, cada uma no seu proprio vertice do
 * politopo de pesos -- entao sobreposicao NAO quer dizer ordem incerta, e a
 * ausencia dela nao quer dizer nada sobre quem ganha. So a direcao segura pode
 * ser afirmada, e e ela que os testes fixam.
 */

import { describe, expect, it } from "vitest";

import { insightsDoResultado } from "@/lib/insights";
import type { Estado, Problema } from "@/lib/types";

const criterio = (chave: string, nome: string) => ({
  chave,
  nome,
  direcao: "max" as const,
  unidade: "",
  melhor: 1,
  pior: 0,
  escala: "continua" as const,
});

const PROBLEMA: Problema = {
  id: "d1",
  nome: "Fornecedores",
  problematica: "escolha",
  criterios: [criterio("q", "Qualidade"), criterio("c", "Custo"), criterio("p", "Prazo")],
  consequencias: {
    A: { q: 1, c: 0, p: 0.5 },
    B: { q: 0, c: 1, p: 0.5 },
    C: { q: 0.4, c: 0.4, p: 0.4 },
  },
  valores: {
    A: { q: 1, c: 0, p: 0.5 },
    B: { q: 0, c: 1, p: 0.5 },
    C: { q: 0.4, c: 0.4, p: 0.4 },
  },
  declaracoes_registradas: 3,
};

const estado = (extra: Partial<Estado> = {}): Estado => ({
  id: "d1",
  nome: "Fornecedores",
  problematica: "escolha",
  elicitacao_iniciada: true,
  declaracoes: 3,
  consistente: true,
  analise: {
    problematica: "escolha",
    resolvido: true,
    indefinidas: [],
    resumo: "Recomendação: A.",
    recomendacao: "A",
    potencialmente_otimas: ["A"],
  },
  ...extra,
});

const chaves = (p: Problema, e: Estado) =>
  insightsDoResultado(p, e).map((i) => i.chave);

describe("a margem da recomendacao", () => {
  it("afirma a vitoria quando o pior caso dela supera o melhor caso de todos", () => {
    const e = estado({
      faixas_de_valor: { A: [0.7, 0.9], B: [0.1, 0.6], C: [0.2, 0.5] },
    });
    const achado = insightsDoResultado(PROBLEMA, e).find(
      (i) => i.chave === "resultado.insight.margem",
    );
    expect(achado).toBeDefined();
    expect(achado?.valores).toMatchObject({ vencedor: "A", pior: "0.700", teto: "0.600" });
  });

  it("cala quando as faixas se sobrepoem", () => {
    /* Sobreposicao nao prova incerteza -- os extremos acontecem em pesos
       diferentes -- entao a tela nao pode dizer nem uma coisa nem outra. */
    const e = estado({
      faixas_de_valor: { A: [0.4, 0.9], B: [0.1, 0.6], C: [0.2, 0.5] },
    });
    expect(chaves(PROBLEMA, e)).not.toContain("resultado.insight.margem");
  });

  it("cala no limite exato, em que empatar nao e vencer", () => {
    const e = estado({
      faixas_de_valor: { A: [0.6, 0.9], B: [0.1, 0.6], C: [0.2, 0.5] },
    });
    expect(chaves(PROBLEMA, e)).not.toContain("resultado.insight.margem");
  });

  it("cala quando ha uma alternativa so, porque nao ha do que vencer", () => {
    const so: Problema = { ...PROBLEMA, valores: { A: { q: 1, c: 0, p: 0.5 } } };
    const e = estado({ faixas_de_valor: { A: [0.7, 0.9] } });
    expect(chaves(so, e)).not.toContain("resultado.insight.margem");
  });
});

describe("a faixa que continua aberta", () => {
  it("avisa quando o valor do vencedor ainda tem folga", () => {
    const e = estado({ faixas_de_valor: { A: [0.5, 0.9], B: [0.1, 0.2] } });
    expect(chaves(PROBLEMA, e)).toContain("resultado.insight.faixaAberta");
  });

  it("cala quando a faixa ja e estreita", () => {
    const e = estado({ faixas_de_valor: { A: [0.88, 0.9], B: [0.1, 0.2] } });
    expect(chaves(PROBLEMA, e)).not.toContain("resultado.insight.faixaAberta");
  });
});

describe("o peso dos criterios", () => {
  it("nomeia o criterio decisivo pelo piso, nao pelo teto", () => {
    const e = estado({
      faixas_de_peso: { Qualidade: [0.5, 0.9], Custo: [0.0, 0.95], Prazo: [0.05, 0.3] },
    });
    const achado = insightsDoResultado(PROBLEMA, e).find(
      (i) => i.chave === "resultado.insight.decisivo",
    );
    // Custo tem o maior teto, mas pode valer zero: quem decide e Qualidade
    expect(achado?.valores.criterio).toBe("Qualidade");
  });

  it("cala quando dois criterios empatam no piso", () => {
    const e = estado({
      faixas_de_peso: { Qualidade: [0.3, 0.9], Custo: [0.3, 0.9], Prazo: [0.0, 0.3] },
    });
    expect(chaves(PROBLEMA, e)).not.toContain("resultado.insight.decisivo");
  });

  it("aponta os criterios cujo teto nao alcanca a fatia igual", () => {
    // tres criterios: a fatia igual e 1/3
    const e = estado({
      faixas_de_peso: { Qualidade: [0.5, 0.9], Custo: [0.0, 0.3], Prazo: [0.0, 0.2] },
    });
    const achado = insightsDoResultado(PROBLEMA, e).find((i) =>
      i.chave.startsWith("resultado.insight.poucoPeso"),
    );
    expect(achado?.chave).toBe("resultado.insight.poucoPeso.varios");
    expect(achado?.valores.criterios).toBe("Prazo, Custo");
  });

  it("cala quando todo criterio pode alcancar a fatia igual", () => {
    const e = estado({
      faixas_de_peso: { Qualidade: [0.2, 0.5], Custo: [0.2, 0.5], Prazo: [0.2, 0.5] },
    });
    expect(chaves(PROBLEMA, e)).not.toContain("resultado.insight.poucoPeso.um");
    expect(chaves(PROBLEMA, e)).not.toContain("resultado.insight.poucoPeso.varios");
  });
});

describe("a troca que a recomendacao representa", () => {
  it("diz onde ela ganha e onde ela perde", () => {
    // A e a melhor em Qualidade e a pior em Custo
    const achado = insightsDoResultado(PROBLEMA, estado()).find(
      (i) => i.chave === "resultado.insight.trocaFeita",
    );
    expect(achado?.valores).toMatchObject({ ganha: "Qualidade", perde: "Custo" });
  });

  it("nao conta empate como vantagem nem como sacrificio", () => {
    /* Prazo vale 0.5 em A e em B: a comparacao e estrita dos dois lados, entao
       Prazo nao aparece em nenhuma das duas listas. */
    const achado = insightsDoResultado(PROBLEMA, estado()).find(
      (i) => i.chave === "resultado.insight.trocaFeita",
    );
    expect(achado?.valores.ganha).not.toContain("Prazo");
    expect(achado?.valores.perde).not.toContain("Prazo");
  });

  it("usa a frase sem ressalva quando a recomendacao nao e pior em nada", () => {
    const domina: Problema = {
      ...PROBLEMA,
      valores: { A: { q: 1, c: 1, p: 1 }, B: { q: 0, c: 0, p: 0 } },
    };
    expect(chaves(domina, estado())).toContain("resultado.insight.ganha");
  });

  it("usa a ressalva sozinha quando ela so perde", () => {
    const perde: Problema = {
      ...PROBLEMA,
      valores: { A: { q: 0, c: 0, p: 0 }, B: { q: 1, c: 1, p: 1 } },
    };
    expect(chaves(perde, estado())).toContain("resultado.insight.perde");
  });
});

describe("quanto se decidiu com quao pouco", () => {
  it("conta as alternativas descartadas e as respostas de tradeoff", () => {
    const achado = insightsDoResultado(PROBLEMA, estado()).find((i) =>
      i.chave.startsWith("resultado.insight.descarte"),
    );
    // 3 alternativas, 1 sobrevivente, 3 declaracoes = ordenacao + 2 respostas
    expect(achado?.chave).toBe("resultado.insight.descarte.varias");
    expect(achado?.valores).toMatchObject({ descartadas: 2, total: 3, respostas: 2 });
  });

  it("tem frase propria quando a ordenacao sozinha ja descartou", () => {
    const achado = insightsDoResultado(PROBLEMA, estado({ declaracoes: 1 })).find((i) =>
      i.chave.startsWith("resultado.insight.descarte"),
    );
    expect(achado?.chave).toBe("resultado.insight.descarte.semPergunta");
  });

  it("cala quando nada foi descartado ainda", () => {
    const e = estado({
      analise: {
        problematica: "escolha",
        resolvido: false,
        indefinidas: [0, 1, 2],
        resumo: "...",
        potencialmente_otimas: ["A", "B", "C"],
      },
    });
    expect(chaves(PROBLEMA, e).some((c) => c.startsWith("resultado.insight.descarte"))).toBe(
      false,
    );
  });
});

describe("quando nao se afirma nada", () => {
  it("uma decisao inconsistente nao rende leitura nenhuma", () => {
    expect(insightsDoResultado(PROBLEMA, estado({ consistente: false }))).toEqual([]);
  });

  it("sem analise, nada", () => {
    expect(insightsDoResultado(PROBLEMA, estado({ analise: undefined }))).toEqual([]);
  });

  it("sem recomendacao, so as leituras que nao dependem dela", () => {
    const e = estado({
      analise: {
        problematica: "ranking",
        resolvido: true,
        indefinidas: [],
        resumo: "...",
      },
      faixas_de_peso: { Qualidade: [0.5, 0.9], Custo: [0.0, 0.2], Prazo: [0.0, 0.2] },
      faixas_de_valor: { A: [0.7, 0.9], B: [0.1, 0.2] },
    });
    const lidas = chaves(PROBLEMA, e);
    expect(lidas).toContain("resultado.insight.decisivo");
    expect(lidas).not.toContain("resultado.insight.margem");
    expect(lidas).not.toContain("resultado.insight.trocaFeita");
  });
});
