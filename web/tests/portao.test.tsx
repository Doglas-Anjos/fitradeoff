/** O Portao: sem sessao no FasorX, a aplicacao nao aparece.
 *
 * O que estes testes guardam: a tela da aplicacao so e montada DEPOIS de o
 * FasorX confirmar a sessao, e uma falha de rede nao manda ninguem ao login.
 */

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const URL_FASORX = "https://fasorx.com.br";

function resposta(corpo: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo } as Response;
}

async function carregarPortao() {
  vi.resetModules();
  process.env.NEXT_PUBLIC_FASORX_URL = URL_FASORX;
  return (await import("@/components/Portao")).Portao;
}

function prenderNavegacao() {
  const alvo = { href: "https://fitradeoff.fasorx.com.br/" };
  Object.defineProperty(window, "location", { value: alvo, configurable: true });
  return alvo;
}

afterEach(() => {
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  delete process.env.NEXT_PUBLIC_FASORX_URL;
});

describe("Portao", () => {
  it("sem sessao: nao mostra a aplicacao e manda ao login do FasorX", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resposta({ erro: "sem sessao" }, 401)));
    const nav = prenderNavegacao();
    const Portao = await carregarPortao();

    render(<Portao><p>tela da aplicacao</p></Portao>);

    expect(screen.getByRole("status")).toHaveTextContent(/Verificando/);
    await waitFor(() => expect(nav.href).toBe(`${URL_FASORX}/entrar/?volta=fitradeoff`));
    expect(screen.queryByText("tela da aplicacao")).not.toBeInTheDocument();
  });

  it("acabou de voltar do FasorX e ainda sem sessao: vai ao login de novo, sem tela de falha", async () => {
    // O caso relatado: a pessoa foi ao /entrar/, entrou, e reabriu o
    // FITradeoff na mesma aba em menos de um minuto. O disjuntor tratava isso
    // como laco e mostrava "nao foi possivel confirmar seu acesso". Sem sessao
    // e resposta do proprio FasorX: mandar ao login e sempre o certo.
    vi.stubGlobal("fetch", vi.fn(async () => resposta({ erro: "sem sessao" }, 401)));
    window.sessionStorage.setItem("fitradeoff:foi-ao-login", String(Date.now()));
    const nav = prenderNavegacao();
    const Portao = await carregarPortao();

    render(<Portao><p>tela da aplicacao</p></Portao>);

    await waitFor(() => expect(nav.href).toBe(`${URL_FASORX}/entrar/?volta=fitradeoff`));
    expect(screen.queryByText(/Não foi possível/)).not.toBeInTheDocument();
  });

  it("com sessao: mostra a aplicacao", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resposta({ token: "t1", validade: 300 })));
    const Portao = await carregarPortao();

    render(<Portao><p>tela da aplicacao</p></Portao>);

    expect(await screen.findByText("tela da aplicacao")).toBeInTheDocument();
  });

  it("rede fora: nao redireciona sozinho; 'Tentar de novo' leva ao /entrar/ do FasorX", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resposta({}, 502)));
    const nav = prenderNavegacao();
    const Portao = await carregarPortao();

    render(<Portao><p>tela da aplicacao</p></Portao>);

    const tentar = await screen.findByRole("link", { name: /Tentar de novo/ });
    expect(tentar).toHaveAttribute("href", `${URL_FASORX}/entrar/?volta=fitradeoff`);
    expect(nav.href).toBe("https://fitradeoff.fasorx.com.br/");
    expect(screen.queryByText("tela da aplicacao")).not.toBeInTheDocument();
  });

  it("sem FasorX configurado (instalacao local): abre direto", async () => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_FASORX_URL;
    const buscar = vi.fn();
    vi.stubGlobal("fetch", buscar);
    const { Portao } = await import("@/components/Portao");

    render(<Portao><p>tela da aplicacao</p></Portao>);

    expect(screen.getByText("tela da aplicacao")).toBeInTheDocument();
    expect(buscar).not.toHaveBeenCalled();
  });
});
