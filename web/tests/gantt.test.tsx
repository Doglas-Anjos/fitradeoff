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
    /* Só os rótulos: a barra agora também tem `title`, com a faixa junto
       ("Forn A: 0.720 a 0.900"), então a busca precisa casar o nome inteiro. */
    const nomes = screen.getAllByTitle(/^Forn [A-Z]$/).map((n) => n.textContent);
    expect(nomes).toEqual(["Forn A", "Forn B", "Forn C"]);
  });
});

/**
 * O Gantt nao pode sequestrar o titulo da aba.
 *
 * As barras traziam a leitura num elemento `<title>`. Dentro de um `<div>` isso
 * nao e HTML valido, e o React 19 trata `<title>` como titulo de documento e o
 * ica para o `<head>`: a aba do navegador passava a dizer
 * "Baixa: 0.000 a 0.000" em vez do nome do produto, porque o primeiro titulo
 * icado vencia o da aplicacao.
 *
 * Num `<svg>` o elemento e correto e fica onde esta -- por isso o diagrama de
 * Hasse, que usa `<title>` dentro de svg, nunca teve o problema.
 */
describe("o titulo da aba", () => {
  it("a leitura da barra e atributo, e nao um elemento solto", () => {
    const { container } = render(
      <GraficoGantt alocacao={ALOCACAO} perfis={[0.35, 0.7]} classes={["Baixa", "Média", "Alta"]} />,
    );
    expect(container.querySelectorAll("title")).toHaveLength(0);
  });

  it("e a leitura continua disponivel ao apontar a barra", () => {
    render(
      <GraficoGantt alocacao={ALOCACAO} perfis={[0.35, 0.7]} classes={["Baixa", "Média", "Alta"]} />,
    );
    expect(screen.getByTitle(/Forn A: 0,720 a 0,900/)).toBeInTheDocument();
  });
});
