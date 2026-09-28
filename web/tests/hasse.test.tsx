/**
 * O diagrama de Hasse precisa desenhar só o que foi dado, continuar legível
 * quando nada foi decidido ainda, e falar a legenda do sistema de referência:
 * seta escura (decomposição), vermelha (avaliação holística), linha sem seta
 * (indiferença) e tracejado entre posições do ranking.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DiagramaHasse } from "@/components/DiagramaHasse";

const setas = (c: HTMLElement) => c.querySelectorAll("svg[role=img] path[data-origem]");
const textoDosNos = (c: HTMLElement) =>
  [...c.querySelectorAll("svg[role=img] g > text")].map((n) => n as SVGTextElement);

describe("DiagramaHasse", () => {
  it("desenha uma seta por relação de cobertura", () => {
    const { container } = render(
      <DiagramaHasse
        niveis={[["X"], ["Y"], ["Z"]]}
        arestas={[{ de: "X", para: "Y" }, { de: "Y", para: "Z" }]}
      />,
    );
    expect(setas(container)).toHaveLength(2);
  });

  it("ignora aresta que aponta para alternativa fora do diagrama", () => {
    const { container } = render(
      <DiagramaHasse
        niveis={[["X"], ["Y"]]}
        arestas={[{ de: "X", para: "Y" }, { de: "X", para: "Fantasma" }]}
      />,
    );
    expect(setas(container)).toHaveLength(1);
  });

  it("não renderiza nada sem níveis", () => {
    const { container } = render(<DiagramaHasse niveis={[]} arestas={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("realça a alternativa recomendada", () => {
    const { container } = render(
      <DiagramaHasse niveis={[["X"], ["Y"]]} arestas={[]} destaque="X" />,
    );
    const nos = textoDosNos(container);
    expect(nos.find((n) => n.textContent === "X")).toHaveAttribute("font-weight", "600");
    expect(nos.find((n) => n.textContent === "Y")).not.toHaveAttribute("font-weight", "600");
  });

  it("trunca nome longo sem quebrar o desenho", () => {
    const longo = "Fornecedor com nome muito comprido";
    const { container } = render(<DiagramaHasse niveis={[[longo]]} arestas={[]} />);
    const no = textoDosNos(container).find((n) => n.textContent?.endsWith("…"))!;
    expect(no.textContent).toHaveLength(15);
    // o nome inteiro segue no tooltip e na lista
    expect(container.querySelector("svg g title")!.textContent).toContain(longo);
    expect(screen.getByText(longo)).toBeInTheDocument();
  });

  it("oferece a leitura em lista, por posição", () => {
    render(<DiagramaHasse niveis={[["X", "Y"], ["Z"]]} arestas={[]} posicoes={[["X", "Y"], ["Z"]]} />);
    expect(screen.getByText("Ver como lista")).toBeInTheDocument();
    expect(screen.getByText("X, Y")).toBeInTheDocument();
  });

  it("rotula as posições e as separa com tracejado", () => {
    const { container } = render(
      <DiagramaHasse
        niveis={[["X", "Y"], ["Z"]]}
        arestas={[{ de: "X", para: "Z" }, { de: "Y", para: "Z" }]}
        posicoes={[["X", "Y"], ["Z"]]}
      />,
    );
    const rotulos = [...container.querySelectorAll("svg[role=img] text[data-posicao]")].map((t) => t.textContent);
    expect(rotulos).toEqual(["Posição 1", "Posição 2"]);
    expect(container.querySelectorAll("svg[role=img] line[stroke-dasharray]")).toHaveLength(1);
  });

  it("sem corte limpo, uma posição só e nenhum tracejado", () => {
    const { container } = render(
      <DiagramaHasse niveis={[["X", "Y"], ["Z"]]} arestas={[{ de: "X", para: "Z" }]} posicoes={[["X", "Y", "Z"]]} />,
    );
    expect(container.querySelectorAll("svg[role=img] line[stroke-dasharray]")).toHaveLength(0);
  });

  it("seta da avaliação holística sai vermelha; a da decomposição, escura", () => {
    const { container } = render(
      <DiagramaHasse
        niveis={[["X"], ["Y"], ["Z"]]}
        arestas={[
          { de: "X", para: "Y", origem: "holistica" },
          { de: "Y", para: "Z", origem: "decomposicao" },
        ]}
      />,
    );
    const [holistica, decomposicao] = [...setas(container)];
    expect(holistica).toHaveAttribute("stroke", "var(--erro)");
    expect(decomposicao).toHaveAttribute("stroke", "var(--tinta-2)");
  });

  it("indiferença é linha sem seta", () => {
    const { container } = render(
      <DiagramaHasse niveis={[["X", "Y"]]} arestas={[]} indiferencas={[{ a: "X", b: "Y" }]} />,
    );
    const linha = [...container.querySelectorAll("svg[role=img] line")].find(
      (l) => l.querySelector("title")?.textContent === "X e Y são indiferentes",
    );
    expect(linha).toBeDefined();
    expect(linha).not.toHaveAttribute("marker-end");
  });

  it("mostra a legenda do oficial", () => {
    render(<DiagramaHasse niveis={[["X"]]} arestas={[]} />);
    for (const item of [
      "Dominância pela decomposição",
      "Dominância por avaliação holística",
      "Indiferença",
      "Separa as posições do ranking",
    ]) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });

  it("diferenças máximas: matriz por posição, com a maior destacada", () => {
    const { container } = render(
      <DiagramaHasse
        niveis={[["A", "B", "C"]]}
        arestas={[]}
        posicoes={[["A", "B", "C"]]}
        diferencas={[
          { a: "A", b: "B", a_supera_b_em_ate: 0.163, b_supera_a_em_ate: 0.012 },
          { a: "B", b: "C", a_supera_b_em_ate: 0.603, b_supera_a_em_ate: 0.013 },
        ]}
      />,
    );
    expect(screen.queryByText("Diferenças máximas")).toBeNull();
    fireEvent.click(screen.getByText("Mostrar diferenças máximas"));

    const destacadas = [...container.querySelectorAll("td[data-maior]")].map((c) => c.textContent);
    expect(destacadas).toEqual(["0.603"]);
    // par sem relação a mostrar fica com traço
    expect(screen.getAllByText("–").length).toBeGreaterThan(0);
    expect(screen.getByText("0.012")).toBeInTheDocument();
  });

  it("sem diferenças, não oferece o painel", () => {
    render(<DiagramaHasse niveis={[["X"], ["Y"]]} arestas={[{ de: "X", para: "Y" }]} />);
    expect(screen.queryByText("Mostrar diferenças máximas")).toBeNull();
  });
});
