/**
 * O painel conta uma coisa diferente em cada problematica.
 *
 * Reaproveitar "em disputa" num ranking resolvido dava um "1 de 4" enganoso
 * justamente na tela de resultado.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PainelProgresso } from "@/components/PainelProgresso";
import type { Estado, Problema } from "@/lib/types";

const PROBLEMA = {
  id: "d1",
  nome: "Fornecedores",
  problematica: "escolha",
  criterios: [],
  consequencias: { A: {}, B: {}, C: {}, D: {} },
  valores: {},
  declaracoes_registradas: 0,
} as unknown as Problema;

function estado(extra: Partial<Estado>): Estado {
  return {
    id: "d1", nome: "Fornecedores", problematica: "escolha",
    elicitacao_iniciada: true, declaracoes: 3, consistente: true,
    ...extra,
  } as Estado;
}

const nada = () => {};

describe("contagem por problematica", () => {
  it("escolha: conta as que seguem em disputa", () => {
    render(
      <PainelProgresso
        problema={PROBLEMA}
        estado={estado({
          analise: {
            problematica: "escolha", resolvido: false,
            indefinidas: [0, 1], resumo: "",
            potencialmente_otimas: ["A", "B"],
          },
        })}
        onDesfazer={nada}
        podeDesfazer={false}
      />,
    );
    expect(screen.getByText("Em disputa")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("ranking resolvido: conta as posicoes definidas, nao uma disputa", () => {
    render(
      <PainelProgresso
        problema={PROBLEMA}
        estado={estado({
          problematica: "ranking",
          analise: { problematica: "ranking", resolvido: true, indefinidas: [], resumo: "" },
        })}
        onDesfazer={nada}
        podeDesfazer={false}
      />,
    );
    expect(screen.getByText("Posições definidas")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.queryByText("Em disputa")).not.toBeInTheDocument();
  });

  it("sorting resolvido: fala em classificadas", () => {
    render(
      <PainelProgresso
        problema={PROBLEMA}
        estado={estado({
          problematica: "sorting",
          analise: { problematica: "sorting", resolvido: true, indefinidas: [], resumo: "" },
        })}
        onDesfazer={nada}
        podeDesfazer={false}
      />,
    );
    expect(screen.getByText("Classificadas")).toBeInTheDocument();
  });

  it("nao risca alternativas fora da problematica de escolha", () => {
    const { container } = render(
      <PainelProgresso
        problema={PROBLEMA}
        estado={estado({
          problematica: "ranking",
          analise: { problematica: "ranking", resolvido: true, indefinidas: [], resumo: "" },
        })}
        onDesfazer={nada}
        podeDesfazer={false}
      />,
    );
    const riscados = [...container.querySelectorAll("span")].filter(
      (s) => s.style.textDecoration === "line-through",
    );
    expect(riscados).toHaveLength(0);
  });

  it("escolha risca as descartadas", () => {
    const { container } = render(
      <PainelProgresso
        problema={PROBLEMA}
        estado={estado({
          analise: {
            problematica: "escolha", resolvido: true, indefinidas: [],
            resumo: "", recomendacao: "A", potencialmente_otimas: ["A"],
          },
        })}
        onDesfazer={nada}
        podeDesfazer={false}
      />,
    );
    const riscados = [...container.querySelectorAll("span")].filter(
      (s) => s.style.textDecoration === "line-through",
    );
    expect(riscados).toHaveLength(3); // B, C, D
  });
});

describe("controles", () => {
  it("esconde o desfazer quando nao ha o que desfazer", () => {
    render(
      <PainelProgresso problema={PROBLEMA} estado={estado({})} onDesfazer={nada} podeDesfazer={false} />,
    );
    expect(screen.queryByText("Voltar um passo")).not.toBeInTheDocument();
  });

  it("oferece o export sempre", () => {
    render(
      <PainelProgresso problema={PROBLEMA} estado={null} onDesfazer={nada} podeDesfazer={false} />,
    );
    // Botao, e nao link: um `<a href>` nao leva o cabecalho de identidade, e
    // com o portao ligado a API recusava o download. Ver exportar.test.tsx.
    expect(screen.getByRole("button", { name: "Exportar planilha" })).toBeEnabled();
  });
});
