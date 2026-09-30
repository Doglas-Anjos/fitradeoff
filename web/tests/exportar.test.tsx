/**
 * Exportar a planilha com a identidade junto.
 *
 * O botao era um `<a href>`: link simples nao leva cabecalho, e com o portao
 * ligado a API respondia 401 -- o navegador salvava o JSON do erro no lugar da
 * planilha. O que importa aqui e que o download saia por `fetch`, com o mesmo
 * `Authorization` das outras chamadas, e que vire arquivo com o nome certo.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/identidade", () => ({
  cabecalho: vi.fn(async () => ({ Authorization: "Bearer abc" })),
  identidadeLigada: vi.fn(() => true),
  irParaLogin: vi.fn(() => true),
}));

import { PainelProgresso } from "@/components/PainelProgresso";
import { api, nomeDoAnexo } from "@/lib/api";
import * as identidade from "@/lib/identidade";
import type { Problema } from "@/lib/types";

const PROBLEMA = {
  id: "d1",
  nome: "Fornecedores",
  problematica: "escolha",
  criterios: [],
  consequencias: { A: {}, B: {} },
  valores: {},
  declaracoes_registradas: 0,
} as unknown as Problema;

/** Resposta montada a mao: o `Response` do jsdom nao aceita Blob como corpo. */
function planilha(disposicao: string | null, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(disposicao ? { "Content-Disposition": disposicao } : {}),
    blob: async () => new Blob(["xlsx"]),
    json: async () => ({ detail: "nao autenticado" }),
  } as unknown as Response;
}

let cliques: HTMLAnchorElement[];

beforeEach(() => {
  cliques = [];
  // jsdom nao implementa URL de objeto, nem navega ao clicar num link.
  URL.createObjectURL = vi.fn(() => "blob:planilha");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    cliques.push(this);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("exportar planilha", () => {
  it("baixa por fetch com o Authorization e salva com o nome da API", async () => {
    const buscar = vi.fn(async () =>
      planilha(
        "attachment; filename=\"Decisao.xlsx\"; filename*=UTF-8''Decis%C3%A3o.xlsx",
      ),
    );
    vi.stubGlobal("fetch", buscar);

    render(
      <PainelProgresso problema={PROBLEMA} estado={null} onDesfazer={() => {}} podeDesfazer={false} />,
    );
    // Botao, e nao link: link nenhum leva cabecalho.
    expect(screen.queryByRole("link", { name: /Exportar/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Exportar/i }));

    await waitFor(() => expect(cliques).toHaveLength(1));
    expect(buscar).toHaveBeenCalledTimes(1);
    const [caminho, init] = buscar.mock.calls[0] as unknown as [string, RequestInit];
    expect(caminho).toBe("/api/decisoes/d1/exportar");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer abc");

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(cliques[0].href).toBe("blob:planilha");
    expect(cliques[0].download).toBe("Decisão.xlsx");
    // O link temporario nao fica no documento.
    expect(document.querySelector("a[download]")).toBeNull();
  });

  it("sem Content-Disposition, usa decisao-<id>.xlsx", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => planilha(null)));
    const anexo = await api.exportar("d1");
    expect(anexo.nome).toBe("decisao-d1.xlsx");
  });

  it("401 com sessao do FasorX segue o caminho de fim de sessao", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => planilha(null, 401)));
    await expect(api.exportar("d1")).rejects.toThrow("Sessão encerrada");
    expect(identidade.irParaLogin).toHaveBeenCalled();
  });
});

describe("nomeDoAnexo", () => {
  it("prefere filename*, cai para filename, e depois para a reserva", () => {
    expect(nomeDoAnexo("attachment; filename*=UTF-8''a%20b.xlsx", "r")).toBe("a b.xlsx");
    expect(nomeDoAnexo('attachment; filename="x.xlsx"', "r")).toBe("x.xlsx");
    expect(nomeDoAnexo("attachment", "r")).toBe("r");
    expect(nomeDoAnexo(null, "r")).toBe("r");
  });
});
