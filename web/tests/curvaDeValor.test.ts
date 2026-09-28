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
  excecaoDoMeioVale,
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
  // A exceção do ponto 0,5 (terceira resposta igual à primeira) depende da
  // escala: nas que começam perto do zero fica o último testado; nas outras, o
  // meio. ILO-ILO-ILO em onze escalas, e a quarta pergunta mostra o que ficou.
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
      busca = iniciar(passo, excecaoDoMeioVale(pior, melhor));
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
  const comecar = () => iniciar(proximoPasso([[0, 0], [1, 1]])!);
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

  it("ponto 0,5, terceira resposta igual à primeira: fica o último testado", () => {
    // ILO, IUP, ILO: faixa final 0,25-0,375, e o oficial fixa 0,375
    const b = segue(segue(comecar(), "inferior"), "superior");
    expect(responder(b, "inferior")).toEqual({ fixa: 0.375 });
  });

  it("ponto 0,5, terceira resposta diferente da primeira: fica o meio da faixa final", () => {
    // IUP, IUP, ILO: faixa final 0,75-0,875, e o oficial fixa 0,8125
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

  it("a exceção do ponto 0,5 só vale em escala que começa perto do zero", () => {
    expect([[0, 100], [10, 100], [20, 100], [90, 0], [100, 10]].map(([p, m]) => excecaoDoMeioVale(p, m)))
      .toEqual([true, true, true, true, true]);
    expect([[30, 100], [50, 100], [100, 200], [0.7, 0.95], [16, 10]].map(([p, m]) => excecaoDoMeioVale(p, m)))
      .toEqual([false, false, false, false, false]);
    // longe do zero, ILO-ILO-ILO fica com o meio: 0,0625, e não 0,125
    let b = iniciar(proximoPasso([[0, 0], [1, 1]])!, false);
    b = segue(b, "inferior");
    b = segue(b, "inferior");
    expect(responder(b, "inferior")).toEqual({ fixa: 0.0625 });
  });

  it("arredonda como a tela do oficial: inteiro só com valor e escala acima de 10", () => {
    expect([37.5, 12.5, 9.375, 4.6875].map((v) => arredondarComoOficial(v, 100))).toEqual([38, 13, 9.38, 4.69]);
    expect([11.5, 13.1875, 0.8333].map((v) => arredondarComoOficial(v, 6))).toEqual([11.5, 13.19, 0.83]);
  });
});
