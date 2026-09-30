/**
 * O provedor da decisão aberta, sem a página em volta.
 *
 * O que se protege aqui é o que a página inteira perderia sem aviso: carregar
 * a decisão num trajeto só (problema e estado em paralelo), aplicar o estado
 * que a própria mutação devolveu em vez de buscá-lo de novo, e a etapa que
 * vem da URL não abrir uma etapa ainda não alcançada.
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DecisaoProvider, useDecisao } from "@/app/decisao/contexto";
import { api, ApiError } from "@/lib/api";
import type { Estado, Pergunta, Problema } from "@/lib/types";

const push = vi.fn();
const replace = vi.fn();
let busca = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => busca,
}));

const PROBLEMA: Problema = {
  id: "d1",
  nome: "Fornecedor",
  problematica: "escolha",
  criterios: [],
  consequencias: { A: {}, B: {} },
  valores: {},
  declaracoes_registradas: 0,
};

const estadoCom = (parcial: Partial<Estado>): Estado => ({
  id: "d1",
  nome: "Fornecedor",
  problematica: "escolha",
  elicitacao_iniciada: true,
  declaracoes: 1,
  consistente: true,
  ...parcial,
});

const perguntaNumero = (n: number): Pergunta => ({
  id: `p${n}`,
  enunciado: `pergunta ${n}`,
  criterio_em_foco: "c1",
  criterio_rival: "c2",
  opcao_a: [],
  opcao_b: [],
  posicao_na_escala: 0,
  como_responder: "",
});

const envolver = ({ children }: { children: React.ReactNode }) => (
  <DecisaoProvider>{children}</DecisaoProvider>
);

beforeEach(() => {
  busca = new URLSearchParams("id=d1");
  push.mockReset();
  replace.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DecisaoProvider", () => {
  it("carrega o problema e o estado em paralelo e expõe os dois", async () => {
    let soltarProblema: (p: Problema) => void = () => {};
    const ver = vi
      .spyOn(api, "ver")
      .mockReturnValue(new Promise<Problema>((r) => (soltarProblema = r)));
    const estado = vi.spyOn(api, "estado").mockResolvedValue(estadoCom({}));
    vi.spyOn(api, "pergunta").mockResolvedValue(perguntaNumero(1) as never);

    const { result } = renderHook(() => useDecisao(), { wrapper: envolver });

    // o estado já foi pedido enquanto o problema ainda não voltou
    await waitFor(() => expect(estado).toHaveBeenCalledWith("d1"));
    expect(ver).toHaveBeenCalledWith("d1");
    expect(result.current.state.ocupado).toBe(true);
    expect(result.current.state.problema).toBeNull();

    await act(async () => soltarProblema(PROBLEMA));

    await waitFor(() => expect(result.current.state.problema).toEqual(PROBLEMA));
    expect(result.current.state.estado?.declaracoes).toBe(1);
    expect(result.current.state.pergunta?.id).toBe("p1");
    expect(result.current.state.ocupado).toBe(false);
    expect(result.current.state.etapa).toBe("perguntas");
  });

  it("responder aplica o estado que a própria resposta devolveu", async () => {
    vi.spyOn(api, "ver").mockResolvedValue(PROBLEMA);
    const estado = vi.spyOn(api, "estado").mockResolvedValue(estadoCom({}));
    const pergunta = vi
      .spyOn(api, "pergunta")
      .mockResolvedValueOnce(perguntaNumero(1) as never)
      .mockResolvedValueOnce(perguntaNumero(2) as never);
    const responder = vi
      .spyOn(api, "responder")
      .mockResolvedValue(estadoCom({ declaracoes: 2 }));

    const { result } = renderHook(() => useDecisao(), { wrapper: envolver });
    await waitFor(() => expect(result.current.state.pergunta?.id).toBe("p1"));

    await act(() => result.current.actions.responder("A"));

    // a pergunta deste teste nao traz pergunta_id: a resposta vai sem ele
    expect(responder).toHaveBeenCalledWith("d1", "A", undefined);
    // o estado veio na resposta: nada de um segundo GET /estado
    expect(estado).toHaveBeenCalledTimes(1);
    expect(pergunta).toHaveBeenCalledTimes(2);
    expect(result.current.state.estado?.declaracoes).toBe(2);
    expect(result.current.state.pergunta?.id).toBe("p2");
    expect(result.current.state.ocupado).toBe(false);
  });

  it("responde com o pergunta_id da pergunta que está na tela", async () => {
    vi.spyOn(api, "ver").mockResolvedValue(PROBLEMA);
    vi.spyOn(api, "estado").mockResolvedValue(estadoCom({}));
    vi.spyOn(api, "pergunta")
      .mockResolvedValueOnce({ ...perguntaNumero(1), pergunta_id: "q1" } as never)
      .mockResolvedValueOnce(perguntaNumero(2) as never);
    const responder = vi.spyOn(api, "responder").mockResolvedValue(estadoCom({ declaracoes: 2 }));

    const { result } = renderHook(() => useDecisao(), { wrapper: envolver });
    await waitFor(() => expect(result.current.state.pergunta?.id).toBe("p1"));
    await act(() => result.current.actions.responder("B"));

    expect(responder).toHaveBeenCalledWith("d1", "B", "q1");
  });

  it("se a pergunta mudou (409), recarrega e mostra a atual, com o aviso", async () => {
    vi.spyOn(api, "ver").mockResolvedValue(PROBLEMA);
    const estado = vi.spyOn(api, "estado").mockResolvedValue(estadoCom({}));
    vi.spyOn(api, "pergunta")
      .mockResolvedValueOnce({ ...perguntaNumero(1), pergunta_id: "q1" } as never)
      .mockResolvedValueOnce({ ...perguntaNumero(2), pergunta_id: "q2" } as never);
    vi.spyOn(api, "responder").mockRejectedValue(
      new ApiError(409, "A pergunta mudou desde que foi exibida; recarregue e responda a pergunta atual."),
    );

    const { result } = renderHook(() => useDecisao(), { wrapper: envolver });
    await waitFor(() => expect(result.current.state.pergunta?.id).toBe("p1"));
    await act(() => result.current.actions.responder("A"));

    expect(estado).toHaveBeenCalledTimes(2); // o estado foi relido
    expect(result.current.state.pergunta?.id).toBe("p2");
    expect(result.current.state.erro).toMatch(/A pergunta mudou/);
  });

  it("uma etapa na URL ainda não alcançada abre na etapa natural", async () => {
    busca = new URLSearchParams("id=d1&etapa=resultado");
    vi.spyOn(api, "ver").mockResolvedValue(PROBLEMA);
    vi.spyOn(api, "estado").mockResolvedValue(estadoCom({}));
    vi.spyOn(api, "pergunta").mockResolvedValue(perguntaNumero(1) as never);

    const { result } = renderHook(() => useDecisao(), { wrapper: envolver });
    await waitFor(() => expect(result.current.state.problema).not.toBeNull());

    // sem análise, "resultado" não foi alcançada
    expect(result.current.state.revisando).toBe("resultado");
    expect(result.current.state.etapa).toBe("perguntas");
  });

  it("encerrar grava o fim na URL sem rolar a página", async () => {
    vi.spyOn(api, "ver").mockResolvedValue(PROBLEMA);
    vi.spyOn(api, "estado").mockResolvedValue(estadoCom({}));
    vi.spyOn(api, "pergunta").mockResolvedValue(perguntaNumero(1) as never);

    const { result } = renderHook(() => useDecisao(), { wrapper: envolver });
    await waitFor(() => expect(result.current.state.problema).not.toBeNull());

    act(() => result.current.actions.encerrar());
    expect(push).toHaveBeenCalledWith("/decisao?id=d1&fim=1", { scroll: false });
  });

  it("fora de um provedor, o hook falha em vez de devolver nada", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useDecisao())).toThrow(/DecisaoProvider/);
  });
});
