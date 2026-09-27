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

describe("DecisoesSalvas: favoritas", () => {
  /* Nomes escolhidos para a ordem do servidor ser o contrário da desejada: se
     a favorita não subisse, o teste não teria como perceber. */
  const COM_FAVORITA = [
    { ...RESUMOS[0], favorita: false },
    { ...RESUMOS[1], favorita: true },
  ];

  it("põe as favoritas antes das outras, e não na ordem do servidor", async () => {
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: COM_FAVORITA });
    render(<DecisoesSalvas onAbrir={() => {}} ocupado={false} />);
    await screen.findByText("Carteira de projetos");

    const nomes = screen.getAllByRole("listitem").map((li) => li.textContent ?? "");
    expect(nomes[0]).toContain("Carteira de projetos");
    expect(nomes[1]).toContain("Seleção de fornecedor");
  });

  it("o controle é um botão de alternância, e anuncia o estado", async () => {
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: COM_FAVORITA });
    render(<DecisoesSalvas onAbrir={() => {}} ocupado={false} />);

    /* O rótulo traz o nome: numa lista, vinte botões "Favorita" não distinguem
       nada para quem ouve a tela. */
    const marcada = await screen.findByRole("button", {
      name: "Favorita: Carteira de projetos",
    });
    expect(marcada).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Favorita: Seleção de fornecedor" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("deixa a cor para o CSS, dirigida por atributo", async () => {
    /* A armadilha que já custou caro três vezes neste projeto: `style` inline
       vence regra de classe, e um `:hover` anulado assim não dá erro nenhum --
       simplesmente não acontece. Se alguém trocar o `data-favorita` por um
       `style={{ color }}`, o realce some em silêncio e este teste cai. */
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: COM_FAVORITA });
    render(<DecisoesSalvas onAbrir={() => {}} ocupado={false} />);

    const estrela = await screen.findByRole("button", {
      name: "Favorita: Carteira de projetos",
    });
    expect(estrela).toHaveClass("botao-favorita");
    expect(estrela).toHaveAttribute("data-favorita", "true");
    expect(estrela.style.color).toBe("");
    expect(estrela.style.background).toBe("");
  });

  it("alterna o estado e conta ao servidor qual estado quer", async () => {
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: COM_FAVORITA });
    const favoritar = vi
      .spyOn(api, "favoritar")
      .mockImplementation(async (id, favorita) => ({ id, favorita }) as never);
    render(<DecisoesSalvas onAbrir={() => {}} ocupado={false} />);

    const estrela = await screen.findByRole("button", {
      name: "Favorita: Seleção de fornecedor",
    });
    await userEvent.click(estrela);

    expect(favoritar).toHaveBeenCalledWith("aaa", true);
    await waitFor(() => expect(estrela).toHaveAttribute("aria-pressed", "true"));
    // e sobe na lista, que é para onde a marcação serve
    expect(screen.getAllByRole("listitem")[0].textContent).toContain(
      "Seleção de fornecedor",
    );

    await userEvent.click(estrela);
    expect(favoritar).toHaveBeenLastCalledWith("aaa", false);
    await waitFor(() => expect(estrela).toHaveAttribute("aria-pressed", "false"));
  });

  it("desfaz a marcação quando o servidor recusa, em vez de mentir", async () => {
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: COM_FAVORITA });
    vi.spyOn(api, "favoritar").mockRejectedValue(new Error("sem rede"));
    render(<DecisoesSalvas onAbrir={() => {}} ocupado={false} />);

    const estrela = await screen.findByRole("button", {
      name: "Favorita: Seleção de fornecedor",
    });
    await userEvent.click(estrela);

    await waitFor(() => expect(estrela).toHaveAttribute("aria-pressed", "false"));
    expect(screen.getByText(/Não foi possível mudar a favorita/)).toBeInTheDocument();
  });

  it("decisão vinda de um servidor antigo, sem o campo, não é favorita", async () => {
    /* `favorita` ausente é "não favorita", nunca `undefined` chegando ao
       `aria-pressed` -- o botão perderia o estado e viraria botão comum. */
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: RESUMOS });
    render(<DecisoesSalvas onAbrir={() => {}} ocupado={false} />);

    const estrela = await screen.findByRole("button", {
      name: "Favorita: Seleção de fornecedor",
    });
    expect(estrela).toHaveAttribute("aria-pressed", "false");
  });
});
