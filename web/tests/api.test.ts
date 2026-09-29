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

  it("manda o estado desejado da favorita, e nao um 'inverta'", async () => {
    const espiao = vi.fn(async () => respostaFalsa(200, { id: "d1", favorita: true }));
    vi.stubGlobal("fetch", espiao);

    await api.favoritar("d1", true);

    const [caminho, init] = espiao.mock.calls[0] as unknown as [string, RequestInit];
    expect(caminho).toBe("/api/decisoes/d1/favorita");
    expect(init.method).toBe("POST");
    /* Reenviar o mesmo pedido nao pode mudar o resultado: duas abas na mesma
       lista alternariam uma contra a outra. */
    expect(JSON.parse(init.body as string)).toEqual({ favorita: true });
  });
});

/** A identidade entra em toda chamada, e a falha dela nao pode culpar a tela.
 *
 * Estes testes existem por causa de um defeito encontrado em revisao: sem a
 * traducao, uma oscilacao no endpoint de token subia como `Error("token: 502")`,
 * que nao e `ApiError` -- e o `mensagemDeErro` caia na reserva de quem chamou.
 * A tela dizia "nao foi possivel carregar a analise" quando o que falhou foi o
 * login.
 */
describe("identidade nas chamadas", () => {
  const URL_FASORX = "https://fasorx.com.br";

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_FASORX_URL;
    vi.resetModules();
  });

  async function comIdentidade() {
    vi.resetModules();
    process.env.NEXT_PUBLIC_FASORX_URL = URL_FASORX;
    return import("@/lib/api");
  }

  it("manda o Bearer em toda chamada", async () => {
    const chamadas: [string, RequestInit][] = [];
    vi.stubGlobal("fetch", vi.fn(async (u: string, init: RequestInit) => {
      chamadas.push([String(u), init]);
      if (String(u).includes("/api/token/")) {
        return respostaFalsa(200, { token: "t1", validade: 300 });
      }
      return respostaFalsa(200, { ok: true });
    }));

    const { api: cliente } = await comIdentidade();
    await cliente.chaves();

    const pedido = chamadas.find(([u]) => u === "/api/chaves");
    expect(pedido).toBeDefined();
    expect((pedido![1].headers as Record<string, string>).Authorization).toBe("Bearer t1");
  });

  it("falha de rede no token vira ApiError com mensagem propria", async () => {
    vi.stubGlobal("fetch", vi.fn(async (u: string) => {
      if (String(u).includes("/api/token/")) return respostaFalsa(502, {});
      return respostaFalsa(200, { ok: true });
    }));

    const { api: cliente, ApiError: Erro, mensagemDeErro } = await comIdentidade();

    await expect(cliente.chaves()).rejects.toBeInstanceOf(Erro);
    try {
      await cliente.chaves();
    } catch (e) {
      // A reserva de quem chama NAO pode vencer: a mensagem do login e que e
      // verdadeira aqui.
      expect(mensagemDeErro(e, "Não foi possível carregar as chaves."))
        .toMatch(/confirmar sua sessão/i);
    }
  });

  it("sem FasorX configurado, nao manda Authorization nenhum", async () => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_FASORX_URL;
    const chamadas: [string, RequestInit][] = [];
    vi.stubGlobal("fetch", vi.fn(async (u: string, init: RequestInit) => {
      chamadas.push([String(u), init]);
      return respostaFalsa(200, { ok: true });
    }));

    const { api: cliente } = await import("@/lib/api");
    await cliente.chaves();

    expect(chamadas.every(([u]) => !u.includes("/api/token/"))).toBe(true);
    const cab = chamadas[0][1].headers as Record<string, string>;
    expect(cab.Authorization).toBeUndefined();
  });
});
