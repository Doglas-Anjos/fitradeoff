import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GraficoGantt } from "@/components/GraficoGantt";

const ALOCACAO = {
  "Forn A": { faixa_de_valor: [0.72, 0.9] as [number, number], classes_possiveis: ["Alta"], definida: true },
  "Forn B": { faixa_de_valor: [0.3, 0.42] as [number, number], classes_possiveis: ["Baixa", "Média"], definida: false },
  "Forn C": { faixa_de_valor: [0.1, 0.2] as [number, number], classes_possiveis: ["Baixa"], definida: true },
};

describe("GraficoGantt", () => {
  it("mostra a classe de quem ja esta definida", () => {
    render(<GraficoGantt alocacao={ALOCACAO} perfis={[0.35, 0.7]} classes={["Baixa", "Média", "Alta"]} />);
    expect(screen.getByTitle("Alta")).toBeInTheDocument();
  });

  it("sinaliza quantas classes restam para a indefinida", () => {
    render(<GraficoGantt alocacao={ALOCACAO} perfis={[0.35, 0.7]} classes={["Baixa", "Média", "Alta"]} />);
    expect(screen.getByText("2 classes")).toBeInTheDocument();
  });

  it("desenha uma linha por perfil", () => {
    const { container } = render(
      <GraficoGantt alocacao={ALOCACAO} perfis={[0.35, 0.7]} classes={["Baixa", "Média", "Alta"]} />,
    );
    // 2 perfis por alternativa, 3 alternativas
    const linhas = [...container.querySelectorAll("span")].filter(
      (s) => s.className.includes("absolute") && s.className.includes("w-px"),
    );
    expect(linhas).toHaveLength(6);
  });

  it("ordena da maior faixa para a menor", () => {
    render(<GraficoGantt alocacao={ALOCACAO} perfis={[0.35]} classes={["Baixa", "Alta"]} />);
    const nomes = screen.getAllByTitle(/^Forn/).map((n) => n.textContent);
    expect(nomes).toEqual(["Forn A", "Forn B", "Forn C"]);
  });
});
