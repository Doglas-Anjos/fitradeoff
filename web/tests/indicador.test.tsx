/* "Calculando…": aparece só quando a espera é perceptível, e explica a demora.
 *
 * O que importa aqui são os dois tempos. Um aviso que pisca a cada clique ensina
 * a ignorá-lo; um que nunca explica a demora deixa a tela com cara de travada. */

import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IndicadorCalculando } from "@/components/IndicadorCalculando";

describe("IndicadorCalculando", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("não aparece num cálculo rápido", () => {
    const { rerender } = render(<IndicadorCalculando ativo />);
    act(() => vi.advanceTimersByTime(250));
    rerender(<IndicadorCalculando ativo={false} />);
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("aparece depois de 300 ms e explica depois de 3 s", () => {
    render(<IndicadorCalculando ativo />);
    const regiao = screen.getByRole("status");
    expect(regiao).toHaveTextContent("");

    act(() => vi.advanceTimersByTime(300));
    expect(regiao).toHaveTextContent("Calculando…");
    expect(regiao).not.toHaveTextContent("alguns segundos");

    act(() => vi.advanceTimersByTime(2700));
    expect(regiao).toHaveTextContent("alguns segundos");
  });

  it("some quando o cálculo termina", () => {
    const { rerender } = render(<IndicadorCalculando ativo />);
    act(() => vi.advanceTimersByTime(3000));
    rerender(<IndicadorCalculando ativo={false} />);
    const regiao = screen.getByRole("status");
    expect(regiao).toHaveTextContent("");
    expect(regiao).toHaveAttribute("data-visivel", "false");
  });

  it("a região de anúncio existe antes de haver o que anunciar", () => {
    // leitor de tela só anuncia mudança numa região que já estava na página
    render(<IndicadorCalculando ativo={false} />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});
