/* O veto na tela.
 *
 * O modelo aditivo com veto (de Almeida, 2013) troca exatidão por prudência:
 * o valor global deixa de ser linear nos pesos, e as faixas publicadas passam a
 * ser um envelope conservador. Isso é invisível no número -- uma faixa larga
 * tem a mesma cara de uma faixa exata.
 *
 * Por isso os dois defeitos que este arquivo impede não são de cálculo:
 *
 *  1. o resultado sair sem a ressalva, apresentando um teto conservador como se
 *     fosse exato;
 *  2. o campo de veto aparecer num objetivo de decisão que não o usa, deixando
 *     a pessoa preencher para ser barrada na tela seguinte.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { CadastroEstrutural } from "@/components/CadastroEstrutural";
import { SinteseResultado } from "@/components/SinteseResultado";
import { RASCUNHO_VAZIO, type Rascunho } from "@/lib/rascunho";
import type { Analise, Estado, Problema, Problematica } from "@/lib/types";

const RESSALVA =
  "Este resultado foi calculado com veto declarado. As faixas publicadas são " +
  "um envelope garantido.";

const problema: Problema = {
  id: "p",
  nome: "Fornecedores",
  problematica: "escolha",
  criterios: [],
  consequencias: {},
  valores: {},
  declaracoes_registradas: 3,
};

function estado(analise: Partial<Analise>): Estado {
  return {
    id: "p",
    nome: "Fornecedores",
    problematica: "escolha",
    elicitacao_iniciada: true,
    declaracoes: 3,
    consistente: true,
    analise: {
      problematica: "escolha",
      resolvido: true,
      indefinidas: [],
      resumo: "Recomendação: Fornecedor A.",
      ...analise,
    },
  };
}

describe("a ressalva acompanha o resultado calculado sob veto", () => {
  it("aparece junto do resumo", () => {
    render(
      <SinteseResultado
        problema={problema}
        estado={estado({ veto_ativo: true, ressalva: RESSALVA })}
        encerrado
      />,
    );

    expect(screen.getByRole("note")).toHaveTextContent("envelope garantido");
  });

  it("não aparece quando não há veto declarado", () => {
    render(
      <SinteseResultado problema={problema} estado={estado({})} encerrado />,
    );

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  /* O motor manda os dois campos juntos. Se um dia mandar só a marca, sem o
     texto, a tela não pode anunciar um veto e não dizer o que ele fez. */
  it("não anuncia o veto sem ter o que explicar", () => {
    render(
      <SinteseResultado
        problema={problema}
        estado={estado({ veto_ativo: true })}
        encerrado
      />,
    );

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});

describe("o campo de veto só existe onde o método o define", () => {
  function montar(problematica: Problematica) {
    function Palco() {
      const [rascunho, setRascunho] = useState<Rascunho>({
        ...RASCUNHO_VAZIO,
        problematica,
        passo: "estrutura",
      });
      return (
        <CadastroEstrutural
          rascunho={rascunho}
          onAlterar={setRascunho}
          onVoltar={vi.fn()}
          onSalvar={vi.fn()}
        />
      );
    }
    render(<Palco />);
  }

  const abridor = () =>
    screen.queryByRole("button", {
      name: /Desempenho inaceitável neste critério/i,
    });

  it.each<Problematica>(["escolha", "ranking"])("aparece em %s", (p) => {
    montar(p);
    expect(abridor()).toBeInTheDocument();
  });

  it.each<Problematica>(["sorting", "portfolio", "beneficio_custo"])(
    "não aparece em %s",
    (p) => {
      montar(p);
      expect(abridor()).not.toBeInTheDocument();
    },
  );

  it("começa fechado, e explica que não elimina a alternativa", async () => {
    montar("escolha");
    const botao = abridor()!;
    expect(botao).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(botao);

    expect(botao).toHaveAttribute("aria-expanded", "true");
    /* A frase que impede a leitura errada: quem lê "veto" pensa em eliminar, e
       este modelo penaliza. */
    expect(screen.getByText(/não é eliminada/i)).toBeInTheDocument();
  });

  /* Os rótulos seguem a direção do critério. Fixos, obrigariam a pessoa a
     traduzir mentalmente a direção a cada critério -- que é exatamente onde o
     par de limites se inverte. */
  it("num critério de maximizar, o aceitável é 'a partir de'", async () => {
    montar("escolha");
    await userEvent.click(abridor()!);

    expect(screen.getByLabelText(/Aceitável a partir de/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Inaceitável abaixo de/i)).toBeInTheDocument();
  });

  it("num critério de minimizar, os rótulos se invertem", async () => {
    montar("escolha");
    await userEvent.click(screen.getByRole("radio", { name: "menor" }));
    await userEvent.click(abridor()!);

    expect(screen.getByLabelText(/Aceitável até/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Inaceitável acima de/i)).toBeInTheDocument();
  });
});
