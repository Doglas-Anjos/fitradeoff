/* O modal de confirmação, agora montado com as peças de `Confirmacao`.
 *
 * O que não pode mudar na troca: o foco nasce no cancelar (um Enter distraído
 * não apaga nada), o Tab não sai da caixa, Esc e o véu fecham, e ao fechar o
 * foco volta para quem abriu -- não para o topo da página. */

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Confirmacao, Modal } from "@/components/ui";

function ComAbridor({ onConfirmar = () => {} }: { onConfirmar?: () => void }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button onClick={() => setAberto(true)}>Apagar decisão</button>
      {aberto && (
        <Modal
          titulo="Apagar esta decisão?"
          confirmar="Apagar"
          perigo
          onConfirmar={onConfirmar}
          /* arrow nova a cada renderização, de propósito */
          onFechar={() => setAberto(false)}
        >
          <p>Não dá para desfazer.</p>
        </Modal>
      )}
    </>
  );
}

describe("Modal", () => {
  it("abre com o foco no cancelar e o devolve a quem abriu", async () => {
    render(<ComAbridor />);
    const abridor = screen.getByRole("button", { name: "Apagar decisão" });
    await userEvent.click(abridor);

    expect(
      screen.getByRole("dialog", { name: "Apagar esta decisão?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(abridor).toHaveFocus();
  });

  it("prende o Tab dentro da caixa", async () => {
    render(<ComAbridor />);
    await userEvent.click(screen.getByRole("button", { name: "Apagar decisão" }));
    const cancelar = screen.getByRole("button", { name: "Cancelar" });
    const apagar = screen.getByRole("button", { name: "Apagar" });

    await userEvent.tab();
    expect(apagar).toHaveFocus();
    await userEvent.tab();
    expect(cancelar).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(apagar).toHaveFocus();
  });

  it("fecha pelo véu, mas não por clique dentro da caixa", async () => {
    render(<ComAbridor />);
    await userEvent.click(screen.getByRole("button", { name: "Apagar decisão" }));

    fireEvent.click(screen.getByText("Não dá para desfazer."));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("presentation"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("confirma pela ação, e a ação de perigo leva a cor de erro", async () => {
    const onConfirmar = vi.fn();
    render(<ComAbridor onConfirmar={onConfirmar} />);
    await userEvent.click(screen.getByRole("button", { name: "Apagar decisão" }));
    const apagar = screen.getByRole("button", { name: "Apagar" });
    expect(apagar.style.background).toBe("var(--erro)");
    expect(apagar.style.color).toBe("var(--erro-tinta)");
    await userEvent.click(apagar);
    expect(onConfirmar).toHaveBeenCalledTimes(1);
  });
});

describe("Confirmacao em peças", () => {
  it("monta um diálogo com duas saídas, nomeado pelo título", async () => {
    const onFechar = vi.fn();
    const descartar = vi.fn();
    const salvar = vi.fn();
    render(
      <Confirmacao.Raiz onFechar={onFechar}>
        <Confirmacao.Titulo>Sair sem salvar?</Confirmacao.Titulo>
        <Confirmacao.Corpo>As mudanças desta tela se perdem.</Confirmacao.Corpo>
        <Confirmacao.Acoes>
          <Confirmacao.Cancelar>Voltar</Confirmacao.Cancelar>
          <Confirmacao.Destrutiva onClick={descartar}>Descartar</Confirmacao.Destrutiva>
          <Confirmacao.Confirmar onClick={salvar}>Salvar e sair</Confirmacao.Confirmar>
        </Confirmacao.Acoes>
      </Confirmacao.Raiz>,
    );

    expect(
      screen.getByRole("dialog", { name: "Sair sem salvar?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voltar" })).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: "Descartar" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar e sair" }));
    expect(descartar).toHaveBeenCalledTimes(1);
    expect(salvar).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(onFechar).toHaveBeenCalledTimes(1);
  });
});
