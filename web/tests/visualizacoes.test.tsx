/**
 * Visualizacoes: o filtro de empates e a selecao de alternativas.
 *
 * O filtro ja renderizou o grafico vazio uma vez em producao, quando a matriz
 * normalizada nao chegou do backend e todos os criterios pareceram empatados.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Visualizacoes } from "@/components/Visualizacoes";
import type { Problema } from "@/lib/types";

const PROBLEMA: Problema = {
  id: "d1",
  nome: "Fornecedores",
  problematica: "escolha",
  criterios: [
    { chave: "q", nome: "Qualidade", direcao: "max", unidade: "", melhor: 1, pior: 0, escala: "continua" },
    { chave: "c", nome: "Custo", direcao: "min", unidade: "R$", melhor: 10, pior: 20, escala: "continua" },
    { chave: "z", nome: "Empatado", direcao: "max", unidade: "", melhor: 5, pior: 5, escala: "continua" },
  ],
  consequencias: {
    "Forn A": { q: 1, c: 20, z: 5 },
    "Forn B": { q: 0, c: 10, z: 5 },
  },
  valores: {
    "Forn A": { q: 1, c: 0, z: 1 },
    "Forn B": { q: 0, c: 1, z: 1 },
  },
  declaracoes_registradas: 0,
};

describe("filtro de criterios empatados", () => {
  it("esconde por padrao o criterio em que todas empatam", () => {
    render(<Visualizacoes problema={PROBLEMA} />);
    expect(screen.getByText(/1 escondido/)).toBeInTheDocument();
  });

  it("mostra todos quando o filtro e desligado", async () => {
    const usuario = userEvent.setup();
    render(<Visualizacoes problema={PROBLEMA} />);
    await usuario.click(screen.getByRole("checkbox", { name: /esconder critérios/i }));
    expect(screen.queryByText(/escondido/)).not.toBeInTheDocument();
  });

  it("nao esconde nada quando todos os criterios distinguem", () => {
    const semEmpate = {
      ...PROBLEMA,
      criterios: PROBLEMA.criterios.slice(0, 2),
      valores: { "Forn A": { q: 1, c: 0 }, "Forn B": { q: 0, c: 1 } },
    };
    render(<Visualizacoes problema={semEmpate} />);
    expect(screen.queryByText(/escondido/)).not.toBeInTheDocument();
  });
});

describe("selecao de alternativas", () => {
  it("comeca com as alternativas em destaque quando informadas", () => {
    render(<Visualizacoes problema={PROBLEMA} destaque={["Forn B"]} />);
    const a = screen.getByRole("checkbox", { name: /Forn A/ }) as HTMLInputElement;
    const b = screen.getByRole("checkbox", { name: /Forn B/ }) as HTMLInputElement;
    expect(a.checked).toBe(false);
    expect(b.checked).toBe(true);
  });

  it("avisa quando nenhuma alternativa esta marcada", async () => {
    const usuario = userEvent.setup();
    render(<Visualizacoes problema={PROBLEMA} destaque={["Forn A"]} />);
    await usuario.click(screen.getByRole("checkbox", { name: /Forn A/ }));
    expect(screen.getByText(/Marque ao menos uma alternativa/)).toBeInTheDocument();
  });
});

describe("abas", () => {
  it("troca de visualizacao sem perder a selecao", async () => {
    const usuario = userEvent.setup();
    render(<Visualizacoes problema={PROBLEMA} destaque={["Forn A"]} />);
    await usuario.click(screen.getByRole("button", { name: "Radar" }));
    const a = screen.getByRole("checkbox", { name: /Forn A/ }) as HTMLInputElement;
    expect(a.checked).toBe(true);
  });

  it("a tabela mostra a unidade original quando pedido", async () => {
    const usuario = userEvent.setup();
    render(<Visualizacoes problema={PROBLEMA} />);
    await usuario.click(screen.getByRole("button", { name: "Tabela" }));
    // normalizado por padrao: valores em [0,1] com tres casas
    expect(screen.getAllByText("1.000").length).toBeGreaterThan(0);
    expect(screen.queryByText("20")).not.toBeInTheDocument();

    await usuario.click(screen.getByRole("checkbox", { name: /valor normalizado/i }));
    // a unidade original reaparece, e o normalizado some
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.queryByText("1.000")).not.toBeInTheDocument();
  });
});
