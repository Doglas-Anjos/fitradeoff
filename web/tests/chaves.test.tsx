import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ChavesPage from "@/app/chaves/page";
import { api, type Conexao } from "@/lib/api";

/**
 * A tela de chaves.
 *
 * O que merece teste aqui não é o layout: é o que a tela promete a quem vai
 * colar um trecho num cliente. Se a chave nova não entrar no trecho, a pessoa
 * cola um comando com `SUA_CHAVE` dentro e não descobre por que não conecta.
 */

const VAZIA: Conexao = {
  chaves: [],
  url: "http://127.0.0.1:8000/mcp",
  publicado: false,
  aviso: null,
};

const CHAVE = {
  id: "abc123",
  rotulo: "Claude na web",
  prefixo: "fit_9xKw...2Qla",
  criada_em: "2026-09-26T03:36:08+00:00",
  ultimo_uso: null,
};

/** A área de transferência não existe no jsdom; sem isto, copiar estoura. */
function comAreaDeTransferencia() {
  const escrever = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: escrever },
    configurable: true,
  });
  return escrever;
}

beforeEach(() => vi.restoreAllMocks());

describe("Tela de chaves", () => {
  it("mostra o endereço do MCP no trecho, mesmo sem chave nenhuma", async () => {
    vi.spyOn(api, "chaves").mockResolvedValue(VAZIA);
    render(<ChavesPage />);

    // Sem chave emitida, o trecho sai com o lugar da chave à vista -- e a tela
    // avisa que é isso que está acontecendo.
    expect(await screen.findByText(/SUA_CHAVE/)).toBeInTheDocument();
    expect(screen.getByText(/mostram SUA_CHAVE no lugar/)).toBeInTheDocument();
  });

  it("põe a chave recém-gerada dentro do trecho de cada cliente", async () => {
    vi.spyOn(api, "chaves")
      .mockResolvedValueOnce(VAZIA)
      .mockResolvedValue({ ...VAZIA, chaves: [CHAVE] });
    vi.spyOn(api, "emitirChave").mockResolvedValue({
      chave: CHAVE,
      texto: "fit_9xKwSEGREDOaqui2Qla",
      url: VAZIA.url,
    });
    render(<ChavesPage />);

    await userEvent.type(
      await screen.findByLabelText(/Onde esta chave vai ser usada/),
      "Claude na web",
    );
    await userEvent.click(screen.getByRole("button", { name: /Gerar chave/ }));

    // O painel do Claude aceita só a URL, então a chave tem de estar dentro dela.
    expect(
      await screen.findByText("http://127.0.0.1:8000/mcp/fit_9xKwSEGREDOaqui2Qla"),
    ).toBeInTheDocument();

    // E no Claude Code, que aceita cabeçalho, a chave vai no cabeçalho.
    await userEvent.click(screen.getByRole("radio", { name: "Claude Code" }));
    expect(
      screen.getByText(/--header "Authorization: Bearer fit_9xKwSEGREDOaqui2Qla"/),
    ).toBeInTheDocument();
  });

  it("copia o texto da chave para a área de transferência", async () => {
    const escrever = comAreaDeTransferencia();
    vi.spyOn(api, "chaves").mockResolvedValue(VAZIA);
    vi.spyOn(api, "emitirChave").mockResolvedValue({
      chave: CHAVE,
      texto: "fit_paraCopiar",
      url: VAZIA.url,
    });
    render(<ChavesPage />);

    await userEvent.type(
      await screen.findByLabelText(/Onde esta chave vai ser usada/),
      "Cursor",
    );
    await userEvent.click(screen.getByRole("button", { name: /Gerar chave/ }));

    const copiar = await screen.findByRole("button", {
      name: /Copiar: Claude na web/,
    });
    await userEvent.click(copiar);

    expect(escrever).toHaveBeenCalledWith("fit_paraCopiar");
    expect(await screen.findByText("Copiado")).toBeInTheDocument();
  });

  it("lista as chaves pelo prefixo, e nunca por inteiro", async () => {
    vi.spyOn(api, "chaves").mockResolvedValue({
      ...VAZIA,
      chaves: [{ ...CHAVE, ultimo_uso: "2026-09-27T01:10:00+00:00" }],
    });
    render(<ChavesPage />);

    expect(await screen.findByText("fit_9xKw...2Qla")).toBeInTheDocument();
    expect(screen.getByText(/Usada por último em/)).toBeInTheDocument();
  });

  it("revoga só depois de confirmar, e some com o bloco da chave revogada", async () => {
    comAreaDeTransferencia();
    vi.spyOn(api, "chaves")
      .mockResolvedValueOnce(VAZIA)
      .mockResolvedValueOnce({ ...VAZIA, chaves: [CHAVE] })
      .mockResolvedValue(VAZIA);
    vi.spyOn(api, "emitirChave").mockResolvedValue({
      chave: CHAVE,
      texto: "fit_vaiSerRevogada",
      url: VAZIA.url,
    });
    const revogar = vi.spyOn(api, "revogarChave").mockResolvedValue({ revogada: true });
    render(<ChavesPage />);

    await userEvent.type(
      await screen.findByLabelText(/Onde esta chave vai ser usada/),
      "Temporária",
    );
    await userEvent.click(screen.getByRole("button", { name: /Gerar chave/ }));
    expect(await screen.findByText("fit_vaiSerRevogada")).toBeInTheDocument();

    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    await userEvent.click(await screen.findByRole("button", { name: /Revogar/ }));
    expect(revogar).not.toHaveBeenCalled();

    confirmar.mockReturnValue(true);
    await userEvent.click(screen.getByRole("button", { name: /Revogar/ }));
    expect(revogar).toHaveBeenCalledWith("abc123");

    // Oferecer para copiar uma chave que já não abre nada seria pior que nada.
    await waitFor(() =>
      expect(screen.queryByText("fit_vaiSerRevogada")).not.toBeInTheDocument(),
    );
  });

  it("avisa que o endereço local não é alcançável de fora", async () => {
    vi.spyOn(api, "chaves").mockResolvedValue(VAZIA);
    render(<ChavesPage />);

    expect(
      await screen.findByText(/Este endereço só vale nesta máquina/),
    ).toBeInTheDocument();
  });

  it("não avisa sobre alcance quando o MCP está publicado", async () => {
    vi.spyOn(api, "chaves").mockResolvedValue({
      ...VAZIA,
      url: "https://fit.exemplo.org/mcp",
      publicado: true,
    });
    render(<ChavesPage />);

    await screen.findByText(/https:\/\/fit\.exemplo\.org\/mcp/);
    expect(
      screen.queryByText(/Este endereço só vale nesta máquina/),
    ).not.toBeInTheDocument();
  });

  it("repassa o aviso de configuração que o servidor manda", async () => {
    vi.spyOn(api, "chaves").mockResolvedValue({
      ...VAZIA,
      url: "https://fit.exemplo.org/mcp",
      aviso: "O dominio 'fit.exemplo.org' nao esta em FITRADEOFF_MCP_HOSTS.",
    });
    render(<ChavesPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /FITRADEOFF_MCP_HOSTS/,
    );
  });
});
