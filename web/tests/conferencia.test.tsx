import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConferenciaImportacao } from "@/components/ConferenciaImportacao";
import type { PlanilhaLida } from "@/lib/api";

const LIDA: PlanilhaLida = {
  nome: "Compras",
  alternativas: ["Fornecedor A", "Fornecedor B"],
  criterios: [
    { chave: "custo", nome: "Custo", direcao: "min", unidade: "R$" },
    { chave: "qualidade", nome: "Qualidade", direcao: "max", unidade: "pts" },
  ],
  consequencias: [
    [120, 8.5],
    [95, 7.2],
  ],
  custos: null,
  origem: "dados.xlsx",
};

const comDirecoes = (direcoes: ("max" | "min")[]): PlanilhaLida => ({
  ...LIDA,
  criterios: LIDA.criterios.map((c, i) => ({ ...c, direcao: direcoes[i] })),
});

describe("ConferenciaImportacao", () => {
  it("mostra a matriz inteira, para conferir antes de gravar", () => {
    render(
      <ConferenciaImportacao
        lida={LIDA}
        ocupado={false}
        onConfirmar={() => {}}
        onCancelar={() => {}}
      />,
    );

    expect(screen.getByText(/Nada foi gravado ainda/)).toBeInTheDocument();
    expect(screen.getByText("Fornecedor A")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("8.5")).toBeInTheDocument();
  });

  it("deixa corrigir a direção lida, que é o erro mais caro", async () => {
    const onConfirmar = vi.fn();
    render(
      <ConferenciaImportacao
        lida={LIDA}
        ocupado={false}
        onConfirmar={onConfirmar}
        onCancelar={() => {}}
      />,
    );

    const grupo = screen.getByRole("radiogroup", { name: /Direção de Custo/ });
    await userEvent.click(within(grupo).getByRole("radio", { name: /maior/ }));
    await userEvent.click(screen.getByText(/Está certo, criar a decisão/));

    expect(onConfirmar).toHaveBeenCalledWith(
      expect.objectContaining({
        criterios: expect.arrayContaining([
          expect.objectContaining({ chave: "custo", direcao: "max" }),
        ]),
      }),
    );
  });

  it("avisa quando todas as direções vieram iguais", () => {
    render(
      <ConferenciaImportacao
        lida={comDirecoes(["max", "max"])}
        ocupado={false}
        onConfirmar={() => {}}
        onCancelar={() => {}}
      />,
    );
    expect(screen.getByText(/Todos os critérios ficaram como/)).toBeInTheDocument();
  });

  it("não avisa quando as direções diferem", () => {
    render(
      <ConferenciaImportacao
        lida={LIDA}
        ocupado={false}
        onConfirmar={() => {}}
        onCancelar={() => {}}
      />,
    );
    expect(screen.queryByText(/Todos os critérios ficaram como/)).toBeNull();
  });

  it("usa o nome editado, e um padrão quando ficar vazio", async () => {
    const onConfirmar = vi.fn();
    render(
      <ConferenciaImportacao
        lida={LIDA}
        ocupado={false}
        onConfirmar={onConfirmar}
        onCancelar={() => {}}
      />,
    );

    await userEvent.clear(screen.getByLabelText(/Nome da decisão/));
    await userEvent.click(screen.getByText(/Está certo, criar a decisão/));

    expect(onConfirmar).toHaveBeenCalledWith(
      expect.objectContaining({ nome: "Decisão sem nome" }),
    );
  });
});
