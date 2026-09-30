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
    expect(screen.getAllByText("1,000").length).toBeGreaterThan(0);
    expect(screen.queryByText("20")).not.toBeInTheDocument();

    await usuario.click(screen.getByRole("checkbox", { name: /valor normalizado/i }));
    // a unidade original reaparece, e o normalizado some
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.queryByText("1.000")).not.toBeInTheDocument();
  });
});

/**
 * O eixo e os rotulos.
 *
 * Os graficos eram SVG escalados por viewBox. Os numeros do eixo estavam
 * ancorados em x = -0.5, fora da viewBox "0 0 100 46", entao o navegador os
 * recortava: o grafico teve grade e nenhuma escala durante toda a vida daquela
 * versao, e nada avisava. Os nomes de criterio, pelo mesmo motivo de escala,
 * eram cortados na 13a letra.
 *
 * Uma ressalva sobre o que estes testes provam. O recorte era um fato de
 * layout: no jsdom os <text> existiam no DOM, entao o teste do eixo abaixo
 * teria passado com o defeito no ar -- aquele foi achado olhando a tela, nao
 * aqui. O que ele trava e a presenca dos rotulos daqui para a frente. Ja o
 * teste das reticencias pega a regressao de verdade: a versao antiga escrevia
 * "Indice de qua..." no proprio DOM.
 */

const NOMES_LONGOS: Problema = {
  ...PROBLEMA,
  criterios: [
    { chave: "q", nome: "Índice de qualidade percebida", direcao: "max", unidade: "", melhor: 1, pior: 0, escala: "continua" },
    { chave: "c", nome: "Custo unitário entregue", direcao: "min", unidade: "R$", melhor: 10, pior: 20, escala: "continua" },
  ],
  valores: { "Forn A": { q: 1, c: 0 }, "Forn B": { q: 0, c: 1 } },
};

describe("eixo e rotulos", () => {
  it("mostra os numeros da escala", () => {
    render(<Visualizacoes problema={PROBLEMA} />);
    // no separador do idioma: vírgula em pt
    for (const marca of ["0,00", "0,25", "0,50", "0,75", "1,00"]) {
      expect(screen.getByText(marca), `falta a marca ${marca}`).toBeInTheDocument();
    }
  });

  it("escreve o nome do criterio por inteiro, sem reticencias", () => {
    render(<Visualizacoes problema={NOMES_LONGOS} />);
    expect(screen.getByText("Índice de qualidade percebida")).toBeInTheDocument();
    expect(screen.queryByText(/…/)).not.toBeInTheDocument();
  });

  it("diz o que o eixo mede enquanto nada esta apontado", () => {
    render(<Visualizacoes problema={PROBLEMA} />);
    expect(screen.getByText(/0 = pior possível, 1 = melhor possível/)).toBeInTheDocument();
  });

  it("apontar um criterio troca a instrucao pelos valores daquele criterio", async () => {
    const usuario = userEvent.setup();
    render(<Visualizacoes problema={NOMES_LONGOS} />);

    await usuario.hover(screen.getByText("Custo unitário entregue"));
    expect(screen.queryByText(/0 = pior possível/)).not.toBeInTheDocument();
    // Forn A vale 0 e Forn B vale 1 nesse criterio
    expect(screen.getByText("0,000")).toBeInTheDocument();
    expect(screen.getByText("1,000")).toBeInTheDocument();
  });
});
