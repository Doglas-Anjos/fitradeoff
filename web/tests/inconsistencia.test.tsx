/**
 * A tela de conflito precisa distinguir dois casos que pedem textos diferentes,
 * e nunca decidir pelo decisor qual afirmacao vale.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Inconsistencia, type Diagnostico } from "@/components/Inconsistencia";

const PAR: Diagnostico = {
  inconsistente: true,
  impossivel: false,
  conflitos: [
    {
      sequencia_a: 2,
      sequencia_b: 3,
      declaracao_a: "Preferiu ter 'Custo' no melhor nível",
      declaracao_b: "Julgou 'A' melhor que 'B'",
    },
  ],
  ultima: { sequencia: 3, texto: "Julgou 'A' melhor que 'B'" },
  saidas: [
    { acao: "desfazer", rotulo: "Manter o que eu disse antes", explicacao: "Remove a última." },
    { acao: "remover", sequencia: 2, rotulo: "Descartar a declaração 2", explicacao: "..." },
  ],
  leitura: "Duas declarações suas não cabem no mesmo conjunto de pesos.",
};

const IMPOSSIVEL: Diagnostico = {
  inconsistente: true,
  impossivel: true,
  conflitos: [],
  ultima: { sequencia: 2, texto: "Julgou 'C' melhor que 'B'" },
  saidas: [{ acao: "desfazer", rotulo: "Manter o que eu disse antes", explicacao: "..." }],
  leitura: "Esta declaração não é possível neste problema",
};

describe("conflito entre duas declaracoes", () => {
  it("mostra as duas lado a lado", () => {
    render(<Inconsistencia diagnostico={PAR} ocupado={false} onResolver={vi.fn()} />);
    expect(screen.getByText(/Duas respostas se contradizem/)).toBeInTheDocument();
    expect(screen.getByText(/declaração 02/)).toBeInTheDocument();
    expect(screen.getByText(/declaração 03/)).toBeInTheDocument();
    expect(screen.getByText("você disse antes")).toBeInTheDocument();
    expect(screen.getByText("você acabou de dizer")).toBeInTheDocument();
  });

  it("oferece as saidas sem escolher por quem decide", () => {
    render(<Inconsistencia diagnostico={PAR} ocupado={false} onResolver={vi.fn()} />);
    expect(screen.getByText("Manter o que eu disse antes")).toBeInTheDocument();
    expect(screen.getByText("Descartar a declaração 2")).toBeInTheDocument();
  });

  it("repassa a acao e a sequencia escolhidas", async () => {
    const usuario = userEvent.setup();
    const resolver = vi.fn();
    render(<Inconsistencia diagnostico={PAR} ocupado={false} onResolver={resolver} />);

    await usuario.click(screen.getByText("Descartar a declaração 2"));
    expect(resolver).toHaveBeenCalledWith("remover", 2);
  });

  it("desabilita as saidas enquanto processa", () => {
    render(<Inconsistencia diagnostico={PAR} ocupado onResolver={vi.fn()} />);
    expect(screen.getByText("Manter o que eu disse antes").closest("button")).toBeDisabled();
  });
});

describe("declaracao impossivel", () => {
  it("usa outro titulo e nao desenha par", () => {
    render(<Inconsistencia diagnostico={IMPOSSIVEL} ocupado={false} onResolver={vi.fn()} />);
    expect(screen.getByText(/não é possível aqui/)).toBeInTheDocument();
    expect(screen.queryByText("você disse antes")).not.toBeInTheDocument();
    expect(screen.getByText(/Julgou 'C' melhor que 'B'/)).toBeInTheDocument();
  });
});

describe("inversao", () => {
  it("mostra o que passaria a valer", () => {
    const comInversao: Diagnostico = {
      ...PAR,
      saidas: [
        {
          acao: "inverter",
          rotulo: "Eu quis dizer o contrário",
          explicacao: "Troca pela opção oposta.",
          resultado: "Preferiu ter 'Prazo' no melhor nível",
        },
      ],
    };
    render(<Inconsistencia diagnostico={comInversao} ocupado={false} onResolver={vi.fn()} />);
    expect(screen.getByText(/passa a valer/)).toBeInTheDocument();
  });
});
