/* A tela da curva de valor conduz a mesma sequência do sistema de referência.
 *
 * A regra em si está coberta em `curvaDeValor.test.ts`, contra as rodadas
 * medidas no oficial. Aqui o que se confere é que a tela a usa: que pergunta o
 * que a regra manda, que a tabela acumula como a do oficial e que encerra onde
 * ele encerra. */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CurvaDeValor } from "@/components/CurvaDeValor";
import type { CriterioOut } from "@/lib/types";

const QUALIDADE: CriterioOut = {
  chave: "q", nome: "Qualidade", direcao: "max", pior: 0, melhor: 100, escala: "continua",
};
const CUSTO: CriterioOut = {
  chave: "c", nome: "Custo", direcao: "min", pior: 100, melhor: 10, escala: "continua",
};

const pergunta = () => screen.getByRole("radiogroup").getAttribute("aria-label");

function responder(tipo: "inferior" | "superior" | "indiferente") {
  const opcoes = within(screen.getByRole("radiogroup")).getAllByRole("radio");
  fireEvent.click(opcoes[{ inferior: 0, superior: 1, indiferente: 2 }[tipo]]);
}

describe("CurvaDeValor", () => {
  it("pergunta com os números, como o oficial", () => {
    render(<CurvaDeValor criterio={QUALIDADE} onSalvar={() => {}} onCancelar={() => {}} />);
    expect(pergunta()).toBe(
      "O que traz maior aumento de valor: aumentar de 0 para 50, ou de 50 para 100?",
    );
    responder("inferior");
    expect(pergunta()).toContain("aumentar de 0 para 25, ou de 25 para 100");
  });

  it("num critério de minimizar, fala em reduzir, do pior para o melhor", () => {
    render(<CurvaDeValor criterio={CUSTO} onSalvar={() => {}} onCancelar={() => {}} />);
    expect(pergunta()).toContain("reduzir de 100 para 55, ou de 55 para 10");
  });

  it("numa faixa estreita, mantém as casas que a escala pede", () => {
    const indice: CriterioOut = {
      chave: "i", nome: "Indice", direcao: "max", pior: 0.71, melhor: 0.95, escala: "continua",
    };
    render(<CurvaDeValor criterio={indice} onSalvar={() => {}} onCancelar={() => {}} />);
    expect(pergunta()).toContain("aumentar de 0.71 para 0.83, ou de 0.83 para 0.95");
  });

  it("segue a rodada ILO-IUP-ILO-Ind-ILO-IUP-Ind do oficial até o fim", () => {
    const onSalvar = vi.fn();
    render(<CurvaDeValor criterio={QUALIDADE} onSalvar={onSalvar} onCancelar={() => {}} />);
    const vistas: string[] = [];
    for (const r of ["inferior", "superior", "inferior", "indiferente", "inferior", "superior", "indiferente"] as const) {
      vistas.push(pergunta()!);
      responder(r);
    }
    // a 4ª pergunta busca o ponto 0,25 entre 0 e 37,5 -- a 3ª resposta, igual
    // à 1ª, deixou o meio-valor no último ponto testado
    // com os números arredondados como o oficial os mostra ("0 to 19 or 19 to 38")
    expect(vistas[3]).toContain("de 0 para 19, ou de 19 para 38");
    expect(vistas[4]).toContain("de 38 para 69, ou de 69 para 100");

    // encerrou: sem pergunta, com a mensagem, e a tabela com os sete ciclos
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("pontos necessários foram elicitados");
    const linhas = within(screen.getByRole("table")).getAllByRole("row");
    expect(linhas).toHaveLength(1 + 7);
    expect(linhas[1]).toHaveTextContent("0 a 50");
    expect(linhas[3]).toHaveTextContent("25 a 38");

    fireEvent.click(screen.getByText("Usar esta curva (3 pontos)"));
    const salvos = onSalvar.mock.calls[0][0] as [number, number][];
    expect(salvos.map(([c, v]) => [v, c]).sort()).toEqual([
      [0, 0], [0.25, 18.75], [0.5, 37.5], [0.75, 60.9375], [1, 100],
    ]);
  });
});

describe("CurvaDeValor em escala construída", () => {
  const NOTA: CriterioOut = {
    chave: "n", nome: "Nota", direcao: "max", pior: 1, melhor: 5, escala: "construida",
    niveis: [1, 2, 3, 4, 5],
  };

  it("pergunta só níveis, como o oficial", () => {
    render(<CurvaDeValor criterio={NOTA} onSalvar={() => {}} onCancelar={() => {}} />);
    expect(pergunta()).toContain("aumentar de 1 para 3, ou de 3 para 5");
    responder("superior");
    // de 3 a 5 o meio é 4, um nível
    expect(pergunta()).toContain("aumentar de 1 para 4, ou de 4 para 5");
  });
});

describe("AvaliacaoIntraCriterio", () => {
  it("não oferece curva numa escala construída de 7 níveis", async () => {
    const { AvaliacaoIntraCriterio } = await import("@/components/AvaliacaoIntraCriterio");
    const sete: CriterioOut = {
      chave: "n", nome: "Nota", direcao: "max", pior: 1, melhor: 7, escala: "construida",
      niveis: [1, 2, 3, 4, 5, 6, 7],
    };
    render(<AvaliacaoIntraCriterio criterios={[QUALIDADE, sete]} ocupado={false} onSalvar={() => {}} />);
    expect(screen.getAllByRole("button", { name: /ajustar/i })).toHaveLength(1);
    expect(screen.getByText(/com 7 níveis não há curva a elicitar/)).toBeTruthy();
  });
});
