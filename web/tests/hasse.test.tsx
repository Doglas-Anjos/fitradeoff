/**
 * O diagrama de Hasse precisa desenhar so o que foi dado e continuar legivel
 * quando nada foi decidido ainda.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DiagramaHasse } from "@/components/DiagramaHasse";

describe("DiagramaHasse", () => {
  it("desenha uma aresta por relacao de cobertura", () => {
    const { container } = render(
      <DiagramaHasse
        niveis={[["X"], ["Y"], ["Z"]]}
        arestas={[{ de: "X", para: "Y" }, { de: "Y", para: "Z" }]}
      />,
    );
    expect(container.querySelectorAll("line")).toHaveLength(2);
  });

  it("ignora aresta que aponta para alternativa fora do diagrama", () => {
    const { container } = render(
      <DiagramaHasse
        niveis={[["X"], ["Y"]]}
        arestas={[{ de: "X", para: "Y" }, { de: "X", para: "Fantasma" }]}
      />,
    );
    expect(container.querySelectorAll("line")).toHaveLength(1);
  });

  it("marca o nivel com mais de uma alternativa como incomparavel", () => {
    render(<DiagramaHasse niveis={[["X", "Y"], ["Z"]]} arestas={[]} />);
    expect(screen.getByText(/incomparáveis entre si/)).toBeInTheDocument();
  });

  it("nao renderiza nada sem niveis", () => {
    const { container } = render(<DiagramaHasse niveis={[]} arestas={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("realca a alternativa recomendada", () => {
    // o <title> do SVG repete o nome, entao mira-se o <text> do no
    const { container } = render(
      <DiagramaHasse niveis={[["X"], ["Y"]]} arestas={[]} destaque="X" />,
    );
    const nos = [...container.querySelectorAll("svg text")];
    const x = nos.find((n) => n.textContent === "X");
    const y = nos.find((n) => n.textContent === "Y");
    expect(x).toHaveAttribute("font-weight", "600");
    expect(y).toHaveAttribute("font-weight", "400");
  });

  it("trunca nome longo sem quebrar o desenho", () => {
    const longo = "Fornecedor com nome muito comprido";
    const { container } = render(
      <DiagramaHasse niveis={[[longo]]} arestas={[]} />,
    );
    const no = container.querySelector("svg text")!;
    expect(no.textContent).toHaveLength(16);
    expect(no.textContent).toMatch(/…$/);
    // o nome inteiro segue disponivel no tooltip e na lista
    expect(container.querySelector("svg title")!.textContent).toContain(longo);
  });

  it("oferece a leitura em lista, sem depender do grafico", () => {
    render(<DiagramaHasse niveis={[["X"], ["Y"]]} arestas={[]} />);
    expect(screen.getByText("Ver como lista")).toBeInTheDocument();
  });
});
