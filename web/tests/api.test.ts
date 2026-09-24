/**
 * Cliente da API: o que importa aqui e a traducao de falha.
 *
 * O FastAPI devolve `detail` como string nos nossos erros e como lista de
 * objetos quando o Pydantic recusa o corpo. Tratar so o primeiro caso faz a
 * tela mostrar "[object Object]" justamente quando o usuario errou o
 * preenchimento -- o momento em que ele mais precisa da mensagem.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { api, ApiError } from "@/lib/api";

function respostaFalsa(status: number, corpo: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
  } as Response;
}

afterEach(() => vi.unstubAllGlobals());

describe("tratamento de erro", () => {
  it("usa o detail quando ele e uma string", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      respostaFalsa(404, { detail: "Decisao 'x' nao encontrada." }),
    ));
    await expect(api.estado("x")).rejects.toThrow("Decisao 'x' nao encontrada.");
  });

  it("junta as mensagens quando o Pydantic devolve uma lista", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      respostaFalsa(422, {
        detail: [
          { msg: "alternativas: precisa de ao menos 2" },
          { msg: "criterios: precisa de ao menos 2" },
        ],
      }),
    ));
    await expect(
      api.criar({ nome: "x", alternativas: [], criterios: [], consequencias: [] }),
    ).rejects.toThrow("alternativas: precisa de ao menos 2; criterios: precisa de ao menos 2");
  });

  it("nao quebra quando o corpo do erro nao e JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("nao e json");
      },
    }) as unknown as Response));
    await expect(api.estado("x")).rejects.toThrow("Falha 500");
  });

  it("carrega o status no erro, para a tela decidir o que fazer", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respostaFalsa(409, { detail: "fora de ordem" })));
    await api.estado("x").catch((e) => {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(409);
    });
  });
});

describe("chamadas", () => {
  it("envia a ordenacao como POST com o corpo certo", async () => {
    const espiao = vi.fn(async () => respostaFalsa(200, { id: "d1" }));
    vi.stubGlobal("fetch", espiao);

    await api.ordenar("d1", ["a", "b", "c"]);

    const [caminho, init] = espiao.mock.calls[0] as unknown as [string, RequestInit];
    expect(caminho).toBe("/api/decisoes/d1/ordenacao");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ ordem: ["a", "b", "c"] });
  });

  it("passa a preferencia verbatim, sem interpretar", async () => {
    const espiao = vi.fn(async () => respostaFalsa(200, {}));
    vi.stubGlobal("fetch", espiao);
    await api.responder("d1", "indiferente");
    const [, init] = espiao.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ preferencia: "indiferente" });
  });
});
