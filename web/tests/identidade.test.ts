/** A identidade vinda do FasorX.
 *
 * O que estes testes protegem, em uma frase: a aplicacao so pode mandar alguem
 * para a tela de login quando o FasorX DISSE que nao ha sessao -- nunca porque
 * a rede oscilou.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const URL_FASORX = "https://fasorx.com.br";

/** Modulo novo a cada teste: ele guarda o token em variaveis de modulo, e sem
 *  isto o estado de um teste vazaria para o seguinte. */
async function carregar() {
  vi.resetModules();
  process.env.NEXT_PUBLIC_FASORX_URL = URL_FASORX;
  return import("@/lib/identidade");
}

function resposta(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
  } as Response;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  window.sessionStorage.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete process.env.NEXT_PUBLIC_FASORX_URL;
});

describe("obter", () => {
  it("busca o token e o reaproveita enquanto vale", async () => {
    const buscar = vi.fn(async () => resposta({ token: "t1", validade: 300 }));
    vi.stubGlobal("fetch", buscar);
    const id = await carregar();

    expect(await id.obter()).toBe("t1");
    expect(await id.obter()).toBe("t1");
    expect(await id.obter()).toBe("t1");
    expect(buscar).toHaveBeenCalledTimes(1);

    const [url, init] = buscar.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${URL_FASORX}/api/token/fitradeoff`);
    expect(init.method).toBe("POST");
    // Sem isto o cookie de sessao do FasorX nao viaja, e nada disto funciona.
    expect(init.credentials).toBe("include");
  });

  it("renova ANTES de vencer, e nao no instante do vencimento", async () => {
    const buscar = vi
      .fn()
      .mockResolvedValueOnce(resposta({ token: "t1", validade: 300 }))
      .mockResolvedValueOnce(resposta({ token: "t2", validade: 300 }));
    vi.stubGlobal("fetch", buscar);
    const id = await carregar();

    expect(await id.obter()).toBe("t1");

    // 280s: o token ainda vale por 20s, mas a folga e de 30s. Um token
    // entregue aqui poderia chegar vencido a API.
    vi.advanceTimersByTime(280_000);
    expect(await id.obter()).toBe("t2");
    expect(buscar).toHaveBeenCalledTimes(2);
  });

  it("junta chamadas simultaneas num pedido so", async () => {
    // Ao abrir uma analise a tela dispara varias chamadas de uma vez; sem a
    // promessa compartilhada cada uma pediria o seu proprio token.
    const buscar = vi.fn(async () => resposta({ token: "t1", validade: 300 }));
    vi.stubGlobal("fetch", buscar);
    const id = await carregar();

    const todos = await Promise.all([id.obter(), id.obter(), id.obter(), id.obter()]);

    expect(todos).toEqual(["t1", "t1", "t1", "t1"]);
    expect(buscar).toHaveBeenCalledTimes(1);
  });

  it("devolve null quando o FasorX diz que nao ha sessao", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resposta({ erro: "sem sessao" }, 401)));
    const id = await carregar();
    expect(await id.obter()).toBeNull();
  });

  it("LANCA -- nao desloga -- quando a rede falha", async () => {
    // A distincao que este teste guarda: 500 e oscilacao, nao ausencia de
    // sessao. Devolver null aqui mandaria a pessoa para o login e ela perderia
    // o que estava preenchendo.
    vi.stubGlobal("fetch", vi.fn(async () => resposta({}, 502)));
    const id = await carregar();
    await expect(id.obter()).rejects.toThrow();
  });

  it("nao faz nada sem FasorX configurado (instalacao local)", async () => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_FASORX_URL;
    const buscar = vi.fn();
    vi.stubGlobal("fetch", buscar);
    const id = await import("@/lib/identidade");

    expect(id.identidadeLigada()).toBe(false);
    expect(await id.obter()).toBeNull();
    expect(await id.cabecalho()).toEqual({});
    expect(buscar).not.toHaveBeenCalled();
  });
});

describe("cabecalho", () => {
  it("monta o Bearer", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resposta({ token: "abc", validade: 300 })));
    const id = await carregar();
    expect(await id.cabecalho()).toEqual({ Authorization: "Bearer abc" });
  });

  it("vem vazio quando nao ha sessao, em vez de 'Bearer null'", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resposta({}, 401)));
    const id = await carregar();
    expect(await id.cabecalho()).toEqual({});
  });
});

describe("vigiar", () => {
  it("avisa quando a sessao cai", async () => {
    const buscar = vi
      .fn()
      .mockResolvedValueOnce(resposta({ token: "t1", validade: 300 }))
      .mockResolvedValue(resposta({}, 401));
    vi.stubGlobal("fetch", buscar);
    const id = await carregar();
    await id.obter();

    const aoSair = vi.fn();
    const parar = id.vigiar(aoSair);

    await vi.advanceTimersByTimeAsync(4 * 60 * 1000);
    expect(aoSair).toHaveBeenCalled();
    parar();
  });

  it("NAO renova com a aba escondida", async () => {
    // Uma aba esquecida aberta renovaria a sessao do FasorX a noite inteira, e
    // as 5 horas nunca aconteceriam.
    const buscar = vi.fn(async () => resposta({ token: "t1", validade: 300 }));
    vi.stubGlobal("fetch", buscar);
    const id = await carregar();
    await id.obter();
    expect(buscar).toHaveBeenCalledTimes(1);

    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");

    const parar = id.vigiar(vi.fn());
    await vi.advanceTimersByTimeAsync(20 * 60 * 1000);

    expect(buscar).toHaveBeenCalledTimes(1);
    parar();
  });

  it("para de vigiar ao desmontar", async () => {
    const buscar = vi.fn(async () => resposta({ token: "t1", validade: 300 }));
    vi.stubGlobal("fetch", buscar);
    const id = await carregar();
    await id.obter();

    const parar = id.vigiar(vi.fn());
    parar();

    await vi.advanceTimersByTimeAsync(20 * 60 * 1000);
    expect(buscar).toHaveBeenCalledTimes(1);
  });
});

describe("pessoa, sair e a volta do login", () => {
  /** window.location do jsdom nao navega; troca-se por um objeto simples para
   *  ler o endereco que a aplicacao TENTOU abrir. */
  function prenderNavegacao() {
    const alvo = { href: "https://fitradeoff.fasorx.com.br/" };
    vi.stubGlobal("location", alvo);
    Object.defineProperty(window, "location", { value: alvo, configurable: true });
    return alvo;
  }

  it("guarda nome e e-mail que vem junto com o token, e avisa quem assina", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        resposta({
          token: "t1",
          validade: 300,
          pessoa: { nome: "Maria Silva", email: "maria@ufpe.br" },
          sair: `${URL_FASORX}/sair/`,
        }),
      ),
    );
    const id = await carregar();
    const ouvinte = vi.fn();
    id.assinar(ouvinte);

    expect(id.pessoaAtual()).toBeNull();
    await id.obter();
    expect(id.pessoaAtual()).toEqual({ nome: "Maria Silva", email: "maria@ufpe.br" });
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it("sem sessao, manda ao login do FasorX pedindo para voltar", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resposta({ erro: "sem sessao" }, 401)));
    const id = await carregar();
    const nav = prenderNavegacao();
    await id.obter();
    id.irParaLogin();
    expect(nav.href).toBe(`${URL_FASORX}/entrar/?volta=fitradeoff`);
  });

  it("com termo pendente, vai para a /conta/ do FasorX -- e nao para o login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => resposta({ erro: "termo pendente", completar: `${URL_FASORX}/conta/` }, 403)),
    );
    const id = await carregar();
    const nav = prenderNavegacao();
    await id.obter();
    id.irParaLogin();
    expect(nav.href).toBe(`${URL_FASORX}/conta/?volta=fitradeoff`);
  });

  it("ignora `completar` e `sair` que apontem para fora do FasorX", async () => {
    const buscar = vi
      .fn()
      .mockResolvedValueOnce(resposta({ token: "t1", validade: 300, sair: "https://evil.example/" }))
      .mockResolvedValueOnce(resposta({ erro: "x", completar: "https://evil.example/conta/" }, 403));
    vi.stubGlobal("fetch", buscar);
    const id = await carregar();
    const nav = prenderNavegacao();

    await id.obter();
    id.sair();
    expect(nav.href).toBe(`${URL_FASORX}/sair/`);

    await id.obter();
    id.irParaLogin();
    expect(nav.href).toBe(`${URL_FASORX}/entrar/?volta=fitradeoff`);
  });

  it("disjuntor: nao gira em circulo se voltou do login ha pouco", async () => {
    // O FasorX tem sessao e devolve a pessoa, mas a API daqui recusa o token
    // (JWKS fora do ar, relogio): sem o disjuntor, o navegador pingaria entre
    // os dois ate o limitador do FasorX bloquear o IP.
    vi.stubGlobal("fetch", vi.fn(async () => resposta({ erro: "sem sessao" }, 401)));
    const id = await carregar();
    const nav = prenderNavegacao();
    await id.obter();

    expect(id.irParaLogin()).toBe(true);
    nav.href = "https://fitradeoff.fasorx.com.br/";
    expect(id.irParaLogin()).toBe(false);
    expect(nav.href).toBe("https://fitradeoff.fasorx.com.br/");

    vi.advanceTimersByTime(61_000);
    expect(id.irParaLogin()).toBe(true);
  });

  it("sair leva a pagina /sair/ do FasorX e esquece o token", async () => {
    const buscar = vi.fn(async () => resposta({ token: "t1", validade: 300, sair: `${URL_FASORX}/sair/` }));
    vi.stubGlobal("fetch", buscar);
    const id = await carregar();
    const nav = prenderNavegacao();
    await id.obter();
    id.sair();
    expect(nav.href).toBe(`${URL_FASORX}/sair/`);
    await id.obter();
    expect(buscar).toHaveBeenCalledTimes(2);
  });
});
