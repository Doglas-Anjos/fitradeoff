/* A curva de valor pergunta exatamente o que o sistema de referência pergunta.
 *
 * A tabela abaixo é o que o FITradeoff oficial perguntou, passo a passo, em
 * cada rodada medida em 27/09/2026 (critério de 0 a 100 para maximizar; de 100
 * a 10 para minimizar). Cada pergunta é [a, t, b]: "de a a t, ou de t a b?",
 * arredondada como a tela dele mostra. Toda rodada terminou em "The required
 * points were elicited" depois da última resposta listada.
 *
 * Onde há `pontos`, são os valores que o gráfico final do oficial mostrou para
 * os pontos 0,25, 0,5 e 0,75 -- é deles que saiu a regra do valor fixado.
 *
 * Respostas: I = intervalo inferior, S = superior, N = indiferente. */

import { describe, expect, it } from "vitest";

import {
  LARGURA_FINAL,
  arredondarComoOficial,
  respostaDescartada,
  iniciar,
  proximoPasso,
  responder,
  testado,
  type Busca,
  type Resposta,
} from "@/lib/curvaDeValor";

interface Rodada {
  respostas: string;
  pior: number;
  melhor: number;
  perguntas: number[][];
  /** O gráfico final do oficial: [ponto 0,25, ponto 0,5, ponto 0,75]. */
  pontos?: [number, number, number];
  /** Rodada interrompida de propósito: só as perguntas contam. */
  parcial?: boolean;
}

const RODADAS: Rodada[] = [
  { respostas: "ISINISN", pior: 0, melhor: 100, perguntas: [[0, 50, 100], [0, 25, 100], [0, 38, 100], [0, 19, 38], [38, 69, 100], [38, 53, 100], [38, 61, 100]], pontos: [19, 38, 61] },
  { respostas: "IISN", pior: 0, melhor: 100, perguntas: [[0, 50, 100], [0, 25, 100], [0, 13, 100], [19, 59, 100]] },
  { respostas: "SSIN", pior: 0, melhor: 100, perguntas: [[0, 50, 100], [0, 75, 100], [0, 88, 100], [0, 41, 81]] },
  { respostas: "INNN", pior: 0, melhor: 100, perguntas: [[0, 50, 100], [0, 25, 100], [0, 13, 25], [25, 63, 100]] },
  { respostas: "ISINN", pior: 0, melhor: 100, perguntas: [[0, 50, 100], [0, 25, 100], [0, 38, 100], [0, 19, 38], [38, 69, 100]] },
  { respostas: "SISNN", pior: 0, melhor: 100, perguntas: [[0, 50, 100], [0, 75, 100], [0, 63, 100], [0, 31, 63], [63, 81, 100]] },
  { respostas: "ISSNN", pior: 0, melhor: 100, perguntas: [[0, 50, 100], [0, 25, 100], [0, 38, 100], [0, 22, 44], [44, 72, 100]] },
  { respostas: "SIINN", pior: 0, melhor: 100, perguntas: [[0, 50, 100], [0, 75, 100], [0, 63, 100], [0, 28, 56], [56, 78, 100]] },
  { respostas: "IIIN", pior: 0, melhor: 100, perguntas: [[0, 50, 100], [0, 25, 100], [0, 13, 100], [13, 56, 100]] },
  { respostas: "SSSN", pior: 0, melhor: 100, perguntas: [[0, 50, 100], [0, 75, 100], [0, 88, 100], [0, 44, 88]] },
  { respostas: "IIIN", pior: 100, melhor: 10, perguntas: [[100, 55, 10], [100, 78, 10], [100, 89, 10], [89, 49, 10]] },
  { respostas: "SSSN", pior: 100, melhor: 10, perguntas: [[100, 55, 10], [100, 33, 10], [100, 21, 10], [100, 61, 21]] },
  // As quatro que mostraram a regra dos quartos: a busca para em 1/8 da escala
  // (dois ciclos num quarto de meia escala) e fixa sempre o meio da faixa.
  { respostas: "NISII", pior: 0, melhor: 100, perguntas: [[0, 50, 100], [0, 25, 50], [0, 13, 50], [50, 75, 100], [50, 63, 100]], pontos: [19, 50, 56] },
  { respostas: "NSSSS", pior: 0, melhor: 100, perguntas: [[0, 50, 100], [0, 25, 50], [0, 38, 50], [50, 75, 100], [50, 88, 100]], pontos: [44, 50, 94] },
  { respostas: "ISIIIISI", pior: 0, melhor: 100, perguntas: [[0, 50, 100], [0, 25, 100], [0, 38, 100], [0, 19, 38], [0, 9.38, 38], [38, 69, 100], [38, 53, 100], [38, 61, 100]], pontos: [4.69, 38, 57] },
  { respostas: "ISISIISS", pior: 0, melhor: 100, perguntas: [[0, 50, 100], [0, 25, 100], [0, 38, 100], [0, 19, 38], [0, 28, 38], [38, 69, 100], [38, 53, 100], [38, 61, 100]], pontos: [23, 38, 65] },
  // O ponto 0,5 com a terceira resposta descartada: ILO-ILO-ILO em onze escalas
  // (a quarta pergunta mostra o que ficou), e depois as seis sequências mistas
  // em escalas longe do zero -- foram elas que derrubaram "perto do zero".
  { respostas: "IIIN", pior: 0, melhor: 1, perguntas: [[0, 0.5, 1], [0, 0.25, 1], [0, 0.13, 1], [0.13, 0.56, 1]], parcial: true },
  { respostas: "IIIN", pior: 0, melhor: 0.25, perguntas: [[0, 0.13, 0.25], [0, 0.06, 0.25], [0, 0.03, 0.25], [0.03, 0.14, 0.25]], parcial: true },
  { respostas: "IIIN", pior: 10, melhor: 100, perguntas: [[10, 55, 100], [10, 33, 100], [10, 21, 100], [21, 61, 100]], parcial: true },
  { respostas: "IIIN", pior: 20, melhor: 100, perguntas: [[20, 60, 100], [20, 40, 100], [20, 30, 100], [30, 65, 100]], parcial: true },
  { respostas: "IIIN", pior: 30, melhor: 100, perguntas: [[30, 65, 100], [30, 48, 100], [30, 39, 100], [34, 67, 100]], parcial: true },
  { respostas: "IIIN", pior: 50, melhor: 100, perguntas: [[50, 75, 100], [50, 63, 100], [50, 56, 100], [53, 77, 100]], parcial: true },
  { respostas: "IIIN", pior: 100, melhor: 200, perguntas: [[100, 150, 200], [100, 125, 200], [100, 113, 200], [106, 153, 200]], parcial: true },
  { respostas: "IIIN", pior: 0.7, melhor: 1.7, perguntas: [[0.7, 1.2, 1.7], [0.7, 0.95, 1.7], [0.7, 0.83, 1.7], [0.76, 1.23, 1.7]], parcial: true },
  { respostas: "IIIN", pior: 0.7, melhor: 0.95, perguntas: [[0.7, 0.83, 0.95], [0.7, 0.76, 0.95], [0.7, 0.73, 0.95], [0.72, 0.83, 0.95]], parcial: true },
  { respostas: "SSSN", pior: 90, melhor: 0, perguntas: [[90, 45, 0], [90, 23, 0], [90, 11, 0], [90, 51, 11]], parcial: true },
  { respostas: "SSSN", pior: 16, melhor: 10, perguntas: [[16, 13, 10], [16, 11.5, 10], [16, 10.75, 10], [16, 13.19, 10.38]], parcial: true },
  { respostas: "ISIN", pior: 100, melhor: 200, perguntas: [[100, 150, 200], [100, 125, 200], [100, 138, 200], [100, 116, 131]], parcial: true },
  { respostas: "SISN", pior: 100, melhor: 200, perguntas: [[100, 150, 200], [100, 175, 200], [100, 163, 200], [100, 131, 163]], parcial: true },
  { respostas: "IISN", pior: 100, melhor: 200, perguntas: [[100, 150, 200], [100, 125, 200], [100, 113, 200], [113, 156, 200]], parcial: true },
  { respostas: "SSIN", pior: 100, melhor: 200, perguntas: [[100, 150, 200], [100, 175, 200], [100, 188, 200], [100, 141, 181]], parcial: true },
  { respostas: "ISSN", pior: 100, melhor: 200, perguntas: [[100, 150, 200], [100, 125, 200], [100, 138, 200], [100, 119, 138]], parcial: true },
  { respostas: "SIIN", pior: 100, melhor: 200, perguntas: [[100, 150, 200], [100, 175, 200], [100, 163, 200], [100, 128, 156]], parcial: true },
  { respostas: "ISIN", pior: 16, melhor: 10, perguntas: [[16, 13, 10], [16, 14.5, 10], [16, 13.75, 10], [16, 14.88, 13.75]], parcial: true },
  { respostas: "SISN", pior: 16, melhor: 10, perguntas: [[16, 13, 10], [16, 11.5, 10], [16, 12.25, 10], [16, 13.94, 11.88]], parcial: true },
  { respostas: "ISIN", pior: 30, melhor: 100, perguntas: [[30, 65, 100], [30, 48, 100], [30, 56, 100], [30, 41, 52]], parcial: true },
  { respostas: "SISN", pior: 30, melhor: 100, perguntas: [[30, 65, 100], [30, 83, 100], [30, 74, 100], [30, 52, 74]], parcial: true },
  // a Durabilidade do bc-08 com curva, que abriu esta investigação
  { respostas: "SISN", pior: 4.921, melhor: 8.869, perguntas: [[4.92, 6.9, 8.87], [4.92, 7.88, 8.87], [4.92, 7.39, 8.87], [4.92, 6.15, 7.39]], parcial: true },
];

const LETRA: Record<string, Resposta> = { I: "inferior", S: "superior", N: "indiferente" };

/** Roda a nossa regra com as mesmas respostas; devolve perguntas, fim e pontos. */
function simular(respostas: string, pior: number, melhor: number) {
  const emConsequencia = (s: number) => pior + s * (melhor - pior);
  const pontos: [number, number][] = [
    [0, 0],
    [1, 1],
  ];
  const perguntas: number[][] = [];
  let busca: Busca | null = null;
  for (const letra of respostas) {
    const passo = proximoPasso(pontos);
    if (!busca) {
      if (!passo) throw new Error("perguntou depois de encerrar");
      busca = iniciar(passo, { pior, melhor });
    }
    perguntas.push(
      [busca.a, testado(busca), busca.b].map((s) => arredondarComoOficial(emConsequencia(s), melhor - pior)),
    );
    const r = responder(busca, LETRA[letra]);
    if ("fixa" in r) {
      pontos.push([r.fixa, busca.alvo]);
      busca = null;
    } else {
      busca = r.segue;
    }
  }
  const valorDe = (v: number) => {
    const p = pontos.find(([, valor]) => Math.abs(valor - v) < 1e-9);
    return p ? arredondarComoOficial(emConsequencia(p[0]), melhor - pior) : null;
  };
  return {
    perguntas,
    encerrou: busca === null && proximoPasso(pontos) === null,
    pontos: [valorDe(0.25), valorDe(0.5), valorDe(0.75)],
  };
}

describe("curva de valor, contra o sistema de referência", () => {
  it.each(RODADAS)("respostas $respostas (de $pior a $melhor)", ({ respostas, pior, melhor, perguntas, pontos, parcial }) => {
    const nossa = simular(respostas, pior, melhor);
    expect(nossa.perguntas).toEqual(perguntas);
    if (!parcial) expect(nossa.encerrou).toBe(true);
    if (pontos) expect(nossa.pontos).toEqual(pontos);
  });

  it("a tabela cobre as oito combinações de três respostas no ponto 0,5", () => {
    const tres = new Set(
      RODADAS.filter((r) => r.pior === 0).map((r) => r.respostas.slice(0, 3)).filter((r) => !r.includes("N")),
    );
    expect(tres.size).toBe(8);
  });
});

describe("as regras, uma a uma", () => {
  const comecar = () => iniciar(proximoPasso([[0, 0], [1, 1]])!, { pior: 0, melhor: 100 });
  const segue = (b: Busca, r: Resposta) => (responder(b, r) as { segue: Busca }).segue;

  it("começa pelo ponto de valor 0,5, testando o meio da faixa", () => {
    const b = comecar();
    expect(b.alvo).toBe(0.5);
    expect(testado(b)).toBe(0.5);
  });

  it("indiferente fixa o ponto testado na hora", () => {
    expect(responder(comecar(), "indiferente")).toEqual({ fixa: 0.5 });
  });

  it(`para quando a faixa chega a ${LARGURA_FINAL} da escala: três ciclos no ponto 0,5`, () => {
    let b = comecar();
    b = segue(b, "inferior");
    b = segue(b, "inferior");
    expect("fixa" in responder(b, "inferior")).toBe(true);
  });

  it("num quarto de meia escala, dois ciclos bastam", () => {
    let b = iniciar(proximoPasso([[0, 0], [1, 1], [0.5, 0.5]])!);
    expect(b).toMatchObject({ alvo: 0.25, a: 0, b: 0.5 });
    b = segue(b, "inferior");
    expect("fixa" in responder(b, "superior")).toBe(true);
  });

  it("ponto 0,5 abaixo da metade da largura: a resposta que desce o limite de cima se perde", () => {
    // 0 a 100, ILO, IUP, ILO: faixa final 0,25-0,375; 37,5 < 50 e ILO desce o
    // limite de cima, então fica o último testado
    const b = segue(segue(comecar(), "inferior"), "superior");
    expect(responder(b, "inferior")).toEqual({ fixa: 0.375 });
  });

  it("ponto 0,5 acima da metade da largura: o que se perde é subir o limite de baixo", () => {
    // IUP, IUP, ILO: 87,5 > 50 e ILO desce o de cima -- vale, fica o meio
    const b = segue(segue(comecar(), "superior"), "superior");
    expect(responder(b, "inferior")).toEqual({ fixa: 0.8125 });
  });

  it("nos quartos, sempre o meio da faixa final -- mesmo com respostas iguais", () => {
    // ponto 0,75 entre 0,5 e 1, ILO e ILO: faixa final 0,5-0,625; o oficial fixa 56,25
    let b = iniciar(proximoPasso([[0, 0], [1, 1], [0.5, 0.5], [0.2, 0.25]])!);
    expect(b.alvo).toBe(0.75);
    b = segue(b, "inferior");
    expect(responder(b, "inferior")).toEqual({ fixa: 0.5625 });
  });

  it("pula o ponto de quarto cujo intervalo é mais estreito que um quarto da faixa", () => {
    expect(proximoPasso([[0, 0], [1, 1], [0.1875, 0.5]])).toEqual({ alvo: 0.75, a: 0.1875, b: 1 });
    expect(proximoPasso([[0, 0], [1, 1], [0.8125, 0.5], [0.4, 0.25]])).toBeNull();
    // com um quarto exato, pergunta
    expect(proximoPasso([[0, 0], [1, 1], [0.25, 0.5]])).toEqual({ alvo: 0.25, a: 0, b: 0.25 });
  });

  it("encerra depois do 0,25 e do 0,75: três pontos, e não mais", () => {
    expect(proximoPasso([[0, 0], [1, 1], [0.5, 0.5], [0.3, 0.25], [0.7, 0.75]])).toBeNull();
  });

  it("a metade é da largura, sem a origem: de 100 a 200 ela fica abaixo da escala toda", () => {
    const e = { pior: 100, melhor: 200 };
    // todo ponto testado passa da metade (50): só subir o limite de baixo se perde
    expect(respostaDescartada(0.375, "superior", e)).toBe(true);
    expect(respostaDescartada(0.375, "inferior", e)).toBe(false);
    // ILO-ILO-ILO fica com o meio: 0,0625, e não 0,125
    let b = iniciar(proximoPasso([[0, 0], [1, 1]])!, e);
    b = segue(b, "inferior");
    b = segue(b, "inferior");
    expect(responder(b, "inferior")).toEqual({ fixa: 0.0625 });
  });

  it("em escala de minimizar, os limites se invertem em consequência", () => {
    // 16 -> 10: ILO sobe o limite de baixo em consequência (13 -> 13,75), acima de 3
    expect(respostaDescartada(0.375, "inferior", { pior: 16, melhor: 10 })).toBe(true);
    expect(respostaDescartada(0.625, "superior", { pior: 16, melhor: 10 })).toBe(false);
  });

  it("sem a escala, o ponto 0,5 fica sempre no meio", () => {
    const b = segue(segue(iniciar(proximoPasso([[0, 0], [1, 1]])!), "inferior"), "superior");
    expect(responder(b, "inferior")).toEqual({ fixa: 0.3125 });
  });

  it("arredonda como a tela do oficial: inteiro só com valor e escala acima de 10", () => {
    expect([37.5, 12.5, 9.375, 4.6875].map((v) => arredondarComoOficial(v, 100))).toEqual([38, 13, 9.38, 4.69]);
    expect([11.5, 13.1875, 0.8333].map((v) => arredondarComoOficial(v, 6))).toEqual([11.5, 13.19, 0.83]);
  });
});

/* Escala discreta: o que o oficial perguntou, em cada rodada de 28/09/2026, num
 * critério Likert de maximizar. `valores` é o gráfico final dele: o valor de
 * cada nível fixado (os outros ele interpola). */
interface RodadaDiscreta {
  respostas: string;
  niveis: number[];
  perguntas: number[][];
  valores?: Record<number, number>;
}

const RODADAS_DISCRETAS: RodadaDiscreta[] = [
  { respostas: "ISIS", niveis: [1, 2, 3, 4, 5], perguntas: [[1, 3, 5], [1, 2, 5], [2, 4, 5], [2, 3, 5]], valores: { 2: 0.5, 3: 0.75 } },
  { respostas: "SISI", niveis: [1, 2, 3, 4, 5], perguntas: [[1, 3, 5], [1, 4, 5], [1, 3, 4]] },
  { respostas: "IIII", niveis: [1, 2, 3, 4, 5], perguntas: [[1, 3, 5], [1, 2, 5], [2, 4, 5], [2, 3, 5]] },
  { respostas: "SSSS", niveis: [1, 2, 3, 4, 5], perguntas: [[1, 3, 5], [1, 4, 5], [1, 3, 4]] },
  { respostas: "NIII", niveis: [1, 2, 3, 4, 5], perguntas: [[1, 3, 5], [1, 2, 3], [3, 4, 5]] },
  { respostas: "IIII", niveis: [1, 2, 3], perguntas: [[1, 2, 3]] },
];

function simularDiscreta(respostas: string, niveis: number[]) {
  const [pior, melhor] = [niveis[0], niveis[niveis.length - 1]];
  const emS = (c: number) => (c - pior) / (melhor - pior);
  const emC = (s: number) => Math.round((pior + s * (melhor - pior)) * 1e6) / 1e6;
  const niveisS = niveis.map(emS);
  const pontos: [number, number][] = [[0, 0], [1, 1]];
  const perguntas: number[][] = [];
  let busca: Busca | null = null;
  for (const letra of respostas + "NNNNNNNN") {
    if (!busca) {
      const passo = proximoPasso(pontos, niveisS);
      if (!passo) break;
      busca = iniciar(passo, { pior, melhor }, niveisS);
    }
    perguntas.push([busca.a, testado(busca), busca.b].map(emC));
    const r = responder(busca, LETRA[letra]);
    if ("fixa" in r) {
      pontos.push([r.fixa, busca.alvo]);
      busca = null;
    } else {
      busca = r.segue;
    }
  }
  const valores: Record<number, number> = {};
  for (const [s, v] of pontos) if (v > 0 && v < 1) valores[emC(s)] = v;
  return { perguntas, valores };
}

describe("curva em escala discreta, contra o sistema de referência", () => {
  it.each(RODADAS_DISCRETAS)("respostas $respostas em $niveis", ({ respostas, niveis, perguntas, valores }) => {
    const nossa = simularDiscreta(respostas, niveis);
    expect(nossa.perguntas).toEqual(perguntas);
    if (valores) expect(nossa.valores).toEqual(valores);
  });

  it("só fixa valor em nível, e fica com o último testado quando a faixa se esgota", () => {
    // ISIS de 1 a 5: o 0,5 fica entre 2 e 3, sem nível dentro -- fica o 2
    expect(simularDiscreta("ISIS", [1, 2, 3, 4, 5]).valores).toEqual({ 2: 0.5, 3: 0.75 });
    // SISI: entre 3 e 4 -- fica o 4, o último testado, e não o de baixo
    expect(simularDiscreta("SISI", [1, 2, 3, 4, 5]).valores).toEqual({ 3: 0.25, 4: 0.5 });
  });

  it("com dois níveis não há o que perguntar -- o oficial nem oferece a curva", () => {
    expect(proximoPasso([[0, 0], [1, 1]], [0, 1])).toBeNull();
  });

  it("níveis que não são 1..n seguem a posição do nível", () => {
    // mesma escala de cinco níveis, espaçada de outro jeito: as mesmas escolhas
    const nossa = simularDiscreta("ISIS", [0, 10, 40, 70, 100]);
    expect(nossa.perguntas).toEqual([[0, 40, 100], [0, 10, 100], [10, 70, 100], [10, 40, 100]]);
  });
});
