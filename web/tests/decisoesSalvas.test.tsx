import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DecisoesSalvas } from "@/components/DecisoesSalvas";
import { api } from "@/lib/api";

const RESUMOS = [
  {
    id: "aaa",
    nome: "Seleção de fornecedor",
    problematica: "escolha" as const,
    alternativas: 4,
    criterios: 3,
    declaracoes: 2,
  },
  {
    id: "bbb",
    nome: "Carteira de projetos",
    problematica: "portfolio" as const,
    alternativas: 1,
    criterios: 1,
    declaracoes: 0,
  },
];

beforeEach(() => vi.restoreAllMocks());

describe("DecisoesSalvas", () => {
  it("lista o que o servidor guarda, não o que este navegador visitou", async () => {
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: RESUMOS });
    render(<DecisoesSalvas onAbrir={() => {}} ocupado={false} />);

    expect(await screen.findByText("Seleção de fornecedor")).toBeInTheDocument();
    expect(screen.getByText(/Escolha · 4 alternativas/)).toBeInTheDocument();
  });

  it("não erra o plural quando há só uma de cada", async () => {
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: RESUMOS });
    render(<DecisoesSalvas onAbrir={() => {}} ocupado={false} />);

    // 1 alternativa, 1 critério, e nenhuma resposta -- que nao deve aparecer
    const linha = await screen.findByText(/Portfólio \(Combinatorial\)/);
    expect(linha.textContent).toContain("1 alternativa · 1 critério");
    expect(linha.textContent).not.toContain("alternativas");
    expect(linha.textContent).not.toContain("resposta");
  });

  it("abre a decisão escolhida com o problema completo", async () => {
    const problema = { id: "aaa", nome: "Seleção de fornecedor" };
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: RESUMOS });
    const ver = vi.spyOn(api, "ver").mockResolvedValue(problema as never);
    const onAbrir = vi.fn();

    render(<DecisoesSalvas onAbrir={onAbrir} ocupado={false} />);
    await userEvent.click(await screen.findByText("Seleção de fornecedor"));

    await waitFor(() => expect(onAbrir).toHaveBeenCalledWith(problema));
    expect(ver).toHaveBeenCalledWith("aaa");
  });

  it("diz que não há nada em vez de mostrar uma lista vazia", async () => {
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: [] });
    render(<DecisoesSalvas onAbrir={() => {}} ocupado={false} />);

    expect(await screen.findByText(/Nenhuma decisão salva ainda/)).toBeInTheDocument();
  });

  it("sobrevive ao servidor fora do ar, sem quebrar a tela", async () => {
    vi.spyOn(api, "listar").mockRejectedValue(new Error("sem rede"));
    render(<DecisoesSalvas onAbrir={() => {}} ocupado={false} />);

    // cai no estado vazio, com o motivo visivel -- e nao numa tela em branco
    expect(await screen.findByText(/Nenhuma decisão salva ainda/)).toBeInTheDocument();
    expect(screen.getByText(/servidor/i)).toBeInTheDocument();
  });
});
