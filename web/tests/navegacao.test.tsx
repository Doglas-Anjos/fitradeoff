/**
 * Navegar entre etapas, arrastar para reordenar, e lembrar o que foi digitado.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Etapas, Passos, Rodape } from "@/components/Etapas";
import { ListaArrastavel } from "@/components/ListaArrastavel";

describe("barra de etapas", () => {
  const padrao = {
    atual: "perguntas" as const,
    alcancadas: ["problema", "ordem", "perguntas"] as const,
    respostasEmRisco: 0,
  };

  it("permite voltar a uma etapa ja alcancada", async () => {
    const usuario = userEvent.setup();
    const ir = vi.fn();
    render(<Etapas {...padrao} alcancadas={[...padrao.alcancadas]} onIr={ir} />);

    await usuario.click(screen.getByRole("button", { name: /Problema/ }));
    expect(ir).toHaveBeenCalledWith("problema");
  });

  it("nao deixa pular para etapa ainda nao alcancada", () => {
    render(<Etapas {...padrao} alcancadas={["problema"]} onIr={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Resultado/ })).toBeDisabled();
  });

  it("a etapa atual nao e clicavel", () => {
    render(<Etapas {...padrao} alcancadas={[...padrao.alcancadas]} onIr={vi.fn()} />);
    const atual = screen.getByRole("button", { name: /Perguntas/ });
    expect(atual).toBeDisabled();
    expect(atual).toHaveAttribute("aria-current", "step");
  });

  it("avisa antes de reordenar quando ha respostas a perder", async () => {
    const usuario = userEvent.setup();
    const ir = vi.fn();
    render(
      <Etapas {...padrao} alcancadas={[...padrao.alcancadas]} respostasEmRisco={3} onIr={ir} />,
    );

    await usuario.click(screen.getByRole("button", { name: /Importância/ }));
    expect(ir).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText(/3 respostas/)).toBeInTheDocument();
  });

  it("segue apos confirmar o descarte", async () => {
    const usuario = userEvent.setup();
    const ir = vi.fn();
    render(
      <Etapas {...padrao} alcancadas={[...padrao.alcancadas]} respostasEmRisco={2} onIr={ir} />,
    );
    await usuario.click(screen.getByRole("button", { name: /Importância/ }));
    await usuario.click(screen.getByRole("button", { name: /Descartar e reordenar/ }));
    expect(ir).toHaveBeenCalledWith("ordem");
  });

  it("cancelar fecha o aviso sem navegar", async () => {
    const usuario = userEvent.setup();
    const ir = vi.fn();
    render(
      <Etapas {...padrao} alcancadas={[...padrao.alcancadas]} respostasEmRisco={2} onIr={ir} />,
    );
    await usuario.click(screen.getByRole("button", { name: /Importância/ }));
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(ir).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("nao avisa quando nao ha resposta a perder", async () => {
    const usuario = userEvent.setup();
    const ir = vi.fn();
    render(<Etapas {...padrao} alcancadas={[...padrao.alcancadas]} onIr={ir} />);
    await usuario.click(screen.getByRole("button", { name: /Importância/ }));
    expect(ir).toHaveBeenCalledWith("ordem");
  });
});

describe("lista arrastavel", () => {
  const itens = [
    { id: "a", titulo: "Qualidade" },
    { id: "b", titulo: "Custo" },
    { id: "c", titulo: "Prazo" },
  ];

  it("as setas reordenam", async () => {
    const usuario = userEvent.setup();
    const reordenar = vi.fn();
    render(<ListaArrastavel itens={itens} onReordenar={reordenar} />);

    await usuario.click(screen.getByLabelText("Mover Custo para cima"));
    expect(reordenar).toHaveBeenCalledWith(["b", "a", "c"]);
  });

  it("nao deixa subir o primeiro nem descer o ultimo", async () => {
    /* `aria-disabled`, e não `disabled`: o botão continua focável, senão o
       foco caía no topo da página ao levar um item até a ponta. */
    const usuario = userEvent.setup();
    const reordenar = vi.fn();
    render(<ListaArrastavel itens={itens} onReordenar={reordenar} />);
    const topo = screen.getByLabelText("Mover Qualidade para cima");
    const fundo = screen.getByLabelText("Mover Prazo para baixo");
    expect(topo).toHaveAttribute("aria-disabled", "true");
    expect(fundo).toHaveAttribute("aria-disabled", "true");

    await usuario.click(topo);
    await usuario.click(fundo);
    expect(reordenar).not.toHaveBeenCalled();
  });

  it("o arrasto reordena como as setas", () => {
    const reordenar = vi.fn();
    const { container } = render(
      <ListaArrastavel itens={itens} onReordenar={reordenar} />,
    );
    const linhas = container.querySelectorAll("li");
    // o React usa eventos sinteticos: fireEvent e o caminho que passa por eles
    const dataTransfer = { effectAllowed: "", dropEffect: "", setData: vi.fn(), getData: () => "c" };

    // arrasta "Prazo" (indice 2) e solta sobre "Qualidade" (indice 0)
    fireEvent.dragStart(linhas[2], { dataTransfer });
    fireEvent.dragOver(linhas[0], { dataTransfer });
    fireEvent.drop(linhas[0], { dataTransfer });

    expect(reordenar).toHaveBeenCalledWith(["c", "a", "b"]);
  });

  it("soltar no proprio lugar nao reordena", () => {
    const reordenar = vi.fn();
    const { container } = render(
      <ListaArrastavel itens={itens} onReordenar={reordenar} />,
    );
    const linhas = container.querySelectorAll("li");
    const dataTransfer = { effectAllowed: "", dropEffect: "", setData: vi.fn(), getData: () => "a" };

    fireEvent.dragStart(linhas[0], { dataTransfer });
    fireEvent.drop(linhas[0], { dataTransfer });
    expect(reordenar).not.toHaveBeenCalled();
  });

  it("anuncia o movimento para leitores de tela", async () => {
    const usuario = userEvent.setup();
    render(<ListaArrastavel itens={itens} onReordenar={vi.fn()} />);
    await usuario.click(screen.getByLabelText("Mover Custo para cima"));
    expect(screen.getByText(/Custo agora está na posição 1 de 3/)).toBeInTheDocument();
  });

  it("explica que da para arrastar ou usar as setas", () => {
    render(<ListaArrastavel itens={itens} onReordenar={vi.fn()} />);
    expect(screen.getByText(/Arraste pelos pontos/)).toBeInTheDocument();
  });
});

describe("trilha do cadastro", () => {
  const passos = [
    { id: "a", rotulo: "Objetivo" },
    { id: "b", rotulo: "Estrutura" },
    { id: "c", rotulo: "Desempenhos" },
  ];

  it("volta só para o que já foi feito, e marca o passo atual", async () => {
    const usuario = userEvent.setup();
    const ir = vi.fn();
    render(<Passos passos={passos} atual="b" onIr={ir} />);

    const atual = screen.getByRole("button", { name: /Estrutura/ });
    expect(atual).toHaveAttribute("aria-current", "step");
    expect(atual).toBeDisabled();
    // pular para frente aceitaria um passo que ainda não foi validado
    expect(screen.getByRole("button", { name: /Desempenhos/ })).toBeDisabled();

    await usuario.click(screen.getByRole("button", { name: /Objetivo/ }));
    expect(ir).toHaveBeenCalledWith("a");
  });

  it("sem onIr, nenhum passo é clicável", () => {
    render(<Passos passos={passos} atual="c" />);
    expect(screen.getByRole("button", { name: /Objetivo/ })).toBeDisabled();
  });
});

describe("rodapé de um passo", () => {
  /* Cada lado é opcional: quem só tem a saída não precisa inventar uma ação
     vazia, e quem só avança não ganha uma saída que não existe. */
  it("só a saída", async () => {
    const usuario = userEvent.setup();
    const voltar = vi.fn();
    render(
      <Rodape>
        <Rodape.Voltar rotulo="Voltar ao objetivo" onClick={voltar} />
      </Rodape>,
    );
    await usuario.click(screen.getByRole("button", { name: "Voltar ao objetivo" }));
    expect(voltar).toHaveBeenCalled();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("só as ações", () => {
    render(
      <Rodape>
        <Rodape.Acoes>
          <button type="button">Continuar</button>
        </Rodape.Acoes>
      </Rodape>,
    );
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Continuar"]);
  });
});
