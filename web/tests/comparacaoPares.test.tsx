/* A ordenação por pares também como tabela de consequências.
 *
 * É a vista padrão do sistema de referência: as opções A e B como duas
 * alternativas hipotéticas, a consequência melhor em azul e a pior em vermelho.
 * O que importa conferir é que a tabela diz o mesmo que os cartões -- escolher
 * A nela é a mesma resposta que o cartão da esquerda. */

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ComparacaoPares } from "@/components/ComparacaoPares";
import { ESPERA_CONFIRMACAO } from "@/components/ui";
import type { CriterioOut } from "@/lib/types";

const QUALIDADE: CriterioOut = {
  chave: "q", nome: "Indice de qualidade", direcao: "max", pior: 0.71, melhor: 0.95, escala: "continua",
};
const CUSTO: CriterioOut = {
  chave: "c", nome: "Custo unitario", direcao: "min", pior: 16.4, melhor: 10.2, escala: "continua", unidade: "R$/un",
};

describe("ComparacaoPares em tabela", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function abrir(onConfirmar = vi.fn()) {
    render(<ComparacaoPares criterios={[QUALIDADE, CUSTO]} ocupado={false} onConfirmar={onConfirmar} />);
    fireEvent.click(screen.getByRole("radio", { name: "Tabela" }));
    return onConfirmar;
  }

  /** O critério de cada linha, na ordem em que a tabela os mostra. */
  const linhas = () => {
    const [, primeira, segunda] = within(screen.getByRole("table")).getAllByRole("row");
    return [primeira, segunda];
  };
  const chaveDe = (linha: HTMLElement) =>
    within(linha).getByRole("rowheader").textContent === QUALIDADE.nome ? "q" : "c";
  const consequencias = (linha: HTMLElement) =>
    [...linha.querySelectorAll("td")].map((c) => [c.textContent, c.getAttribute("data-consequencia")]);

  it("mostra A e B com a melhor em azul e a pior em vermelho", () => {
    abrir();
    const [primeira, segunda] = linhas();
    // a opção A leva o critério da primeira linha ao melhor; a B, o da segunda
    const esperado = (c: CriterioOut, emA: boolean) => {
      const u = c.unidade ? ` ${c.unidade}` : "";
      const melhor = [`${c.melhor}${u}`, "melhor"];
      const pior = [`${c.pior}${u}`, "pior"];
      return emA ? [melhor, pior] : [pior, melhor];
    };
    const crit = (l: HTMLElement) => (chaveDe(l) === "q" ? QUALIDADE : CUSTO);
    expect(consequencias(primeira)).toEqual(esperado(crit(primeira), true));
    expect(consequencias(segunda)).toEqual(esperado(crit(segunda), false));
    expect(screen.getByText(/em azul, a consequência mais preferível/)).toBeInTheDocument();
  });

  for (const lado of ["A", "B"] as const) {
    it(`escolher ${lado} na tabela põe na frente o critério que ${lado} leva ao melhor`, () => {
      const onConfirmar = abrir();
      const [primeira, segunda] = linhas().map(chaveDe);
      fireEvent.click(screen.getByRole("button", { name: `Prefiro a opção ${lado}` }));
      act(() => vi.advanceTimersByTime(ESPERA_CONFIRMACAO + 10));
      fireEvent.click(screen.getByText("Confirmar ordem", { exact: false }));
      expect(onConfirmar).toHaveBeenCalledWith(lado === "A" ? [primeira, segunda] : [segunda, primeira]);
    });
  }
});
