/* A pausa entre escolher e registrar, agora num gancho só.
 *
 * A pergunta de tradeoff e a comparação par a par tinham cada uma a sua cópia
 * do relógio. O que as duas prometem, e o que este arquivo cobra: a escolha
 * aparece antes de valer, vale uma vez só, e não vale se a tela sai antes. */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ESPERA_CONFIRMACAO,
  useRespostaComConfirmacao,
} from "@/lib/useRespostaComConfirmacao";

type Lado = "A" | "B" | "indiferente";

describe("useRespostaComConfirmacao", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("mostra a escolha na pausa e só então registra", () => {
    const aoConfirmar = vi.fn();
    const { result } = renderHook(() =>
      useRespostaComConfirmacao<Lado>(aoConfirmar),
    );

    act(() => {
      expect(result.current.responder("A")).toBe(true);
    });
    expect(result.current.escolhida).toBe("A");
    expect(result.current.pausado).toBe(true);
    expect(result.current.estadoDe("A")).toBe("escolhido");
    expect(result.current.estadoDe("B")).toBe("preterido");
    expect(aoConfirmar).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(ESPERA_CONFIRMACAO));
    expect(aoConfirmar).toHaveBeenCalledTimes(1);
    expect(aoConfirmar).toHaveBeenCalledWith("A");
    // sem `manterEscolha` a pergunta seguinte começa limpa
    expect(result.current.escolhida).toBeNull();
    expect(result.current.estadoDe("A")).toBe("neutro");
  });

  it("aceita um clique por pergunta, mesmo dois no mesmo quadro", () => {
    const aoConfirmar = vi.fn();
    const { result } = renderHook(() =>
      useRespostaComConfirmacao<Lado>(aoConfirmar),
    );

    act(() => {
      result.current.responder("A");
      // mesmo quadro: o estado ainda não trocou, a guarda tem de segurar
      expect(result.current.responder("B")).toBe(false);
    });
    act(() => vi.advanceTimersByTime(ESPERA_CONFIRMACAO));
    expect(aoConfirmar).toHaveBeenCalledTimes(1);
    expect(aoConfirmar).toHaveBeenCalledWith("A");
  });

  it("não aceita resposta com a página ocupada", () => {
    const aoConfirmar = vi.fn();
    const { result } = renderHook(() =>
      useRespostaComConfirmacao<Lado>(aoConfirmar, { bloqueado: true }),
    );
    act(() => {
      expect(result.current.responder("A")).toBe(false);
    });
    act(() => vi.advanceTimersByTime(ESPERA_CONFIRMACAO));
    expect(result.current.escolhida).toBeNull();
    expect(aoConfirmar).not.toHaveBeenCalled();
  });

  it("sair da tela no meio da pausa não registra nada", () => {
    const aoConfirmar = vi.fn();
    const { result, unmount } = renderHook(() =>
      useRespostaComConfirmacao<Lado>(aoConfirmar),
    );
    act(() => {
      result.current.responder("B");
    });
    unmount();
    act(() => vi.advanceTimersByTime(ESPERA_CONFIRMACAO * 2));
    expect(aoConfirmar).not.toHaveBeenCalled();
  });

  it("com `manterEscolha`, a escolha fica acesa e trava novas respostas", () => {
    const aoConfirmar = vi.fn();
    const { result } = renderHook(() =>
      useRespostaComConfirmacao<Lado>(aoConfirmar, { manterEscolha: true }),
    );
    act(() => {
      result.current.responder("indiferente");
    });
    act(() => vi.advanceTimersByTime(ESPERA_CONFIRMACAO));
    expect(aoConfirmar).toHaveBeenCalledWith("indiferente");
    expect(result.current.escolhida).toBe("indiferente");
    // na indiferença, por padrão, os dois lados recuam
    expect(result.current.estadoDe("A")).toBe("preterido");
    expect(result.current.estadoDe("indiferente")).toBe("escolhido");
    act(() => {
      expect(result.current.responder("A")).toBe(false);
    });
  });

  it("`neutrasEm` deixa os lados neutros e acende só a resposta dada", () => {
    const { result } = renderHook(() =>
      useRespostaComConfirmacao<Lado>(() => {}, { neutrasEm: ["indiferente"] }),
    );
    act(() => {
      result.current.responder("indiferente");
    });
    expect(result.current.estadoDe("A")).toBe("neutro");
    expect(result.current.estadoDe("B")).toBe("neutro");
    expect(result.current.estadoDe("indiferente")).toBe("escolhido");
  });

  it("dispara com o `aoConfirmar` mais recente, sem reiniciar a contagem", () => {
    const primeiro = vi.fn();
    const segundo = vi.fn();
    const { result, rerender } = renderHook(
      ({ f }: { f: (r: Lado) => void }) => useRespostaComConfirmacao<Lado>(f),
      { initialProps: { f: primeiro } },
    );
    act(() => {
      result.current.responder("A");
    });
    rerender({ f: segundo });
    act(() => vi.advanceTimersByTime(ESPERA_CONFIRMACAO));
    expect(primeiro).not.toHaveBeenCalled();
    expect(segundo).toHaveBeenCalledWith("A");
  });
});
