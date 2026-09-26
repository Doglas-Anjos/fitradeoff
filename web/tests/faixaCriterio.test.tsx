/**
 * A faixa de cada criterio, nos tres modos de ordenacao.
 *
 * O defeito que estes testes guardam nao quebrava nada: dois dos tres modos
 * simplesmente nao desenhavam a faixa, e quem ordenava a lista ou escolhia um
 * a um respondia "qual e mais importante" sem ver de quanto para quanto cada
 * criterio varia -- que e a unica coisa que torna a pergunta respondivel. Uma
 * ausencia dessas nao aparece em nenhuma tela vermelha, entao e aqui que ela
 * tem de aparecer.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FaixaCriterio } from "@/components/FaixaCriterio";
import { OrdenacaoPesos } from "@/components/OrdenacaoPesos";
import type { CriterioOut } from "@/lib/types";

const CRITERIOS: CriterioOut[] = [
  {
    chave: "prazo",
    nome: "Prazo",
    direcao: "min",
    unidade: "dias",
    melhor: 12,
    pior: 45,
    escala: "continua",
  },
  {
    chave: "custo",
    nome: "Custo",
    direcao: "min",
    unidade: "R$",
    melhor: 10.2,
    pior: 15.8,
    escala: "continua",
  },
  {
    chave: "qualidade",
    nome: "Qualidade",
    direcao: "max",
    melhor: 10,
    pior: 0,
    escala: "construida",
  },
];

const FAIXA_DO_PRAZO = "de 45 dias (pior) até 12 dias (melhor)";

/* O nome do botao sai da juncao do titulo com o rotulo da faixa, e a juncao
   depende de layout: o navegador separa dois blocos por espaco, o jsdom, que
   nao tem layout, cola os dois. Cravar um dos dois resultados so quebraria o
   teste no outro ambiente, entao o espaco fica opcional. */
const OPCAO_DO_PRAZO = new RegExp(
  `^Prazo\\s*de 45 dias \\(pior\\) até 12 dias \\(melhor\\)$`,
);

function abrir(modo: RegExp) {
  return userEvent.setup().click(screen.getByRole("button", { name: modo }));
}

describe("faixa de um criterio", () => {
  it("mostra os dois extremos com a unidade do problema", () => {
    render(<FaixaCriterio criterio={CRITERIOS[0]} />);
    expect(screen.getByText("45 dias")).toBeInTheDocument();
    expect(screen.getByText("12 dias")).toBeInTheDocument();
  });

  it("e uma figura so para o leitor de tela, e nao quatro textos soltos", () => {
    render(<FaixaCriterio criterio={CRITERIOS[0]} />);
    expect(screen.getByRole("img", { name: FAIXA_DO_PRAZO })).toBeInTheDocument();
  });

  it("na variante compacta o nivel vem colado ao valor", () => {
    render(<FaixaCriterio criterio={CRITERIOS[0]} variante="compacta" />);
    expect(screen.getByText("45 dias (pior)")).toBeInTheDocument();
    expect(screen.getByText("12 dias (melhor)")).toBeInTheDocument();
  });

  it("omite a unidade do criterio que nao tem uma", () => {
    render(<FaixaCriterio criterio={CRITERIOS[2]} />);
    expect(
      screen.getByRole("img", { name: "de 0 (pior) até 10 (melhor)" }),
    ).toBeInTheDocument();
  });

  it("nao arredonda o valor quebrado ate perde-lo", () => {
    render(<FaixaCriterio criterio={CRITERIOS[1]} />);
    expect(screen.getByText("15.8 R$")).toBeInTheDocument();
    expect(screen.getByText("10.2 R$")).toBeInTheDocument();
  });
});

describe("a faixa nos tres modos de ordenacao", () => {
  const padrao = {
    criterios: CRITERIOS,
    ocupado: false,
    onConfirmar: vi.fn(),
  };

  it("o modo par a par desenha a faixa dos dois criterios em confronto", () => {
    render(<OrdenacaoPesos {...padrao} />);
    const cartoes = screen.getAllByRole("group");
    for (const cartao of cartoes) {
      expect(within(cartao).getByRole("img")).toBeInTheDocument();
    }
    expect(cartoes).toHaveLength(2);
  });

  it("o modo de ordenar a lista desenha a faixa de cada linha", async () => {
    render(<OrdenacaoPesos {...padrao} />);
    await abrir(/Ordenar a lista/);

    const linhas = screen.getAllByRole("listitem");
    expect(linhas).toHaveLength(CRITERIOS.length);
    for (const linha of linhas) {
      expect(within(linha).getByRole("img")).toBeInTheDocument();
    }
    expect(screen.getByText("45 dias (pior)")).toBeInTheDocument();
  });

  it("o modo de escolher um a um desenha a faixa em cada opcao", async () => {
    render(<OrdenacaoPesos {...padrao} />);
    await abrir(/Escolher um a um/);

    /* A faixa entra no nome acessivel do proprio botao: quem ouve a opcao
       recebe o criterio e o salto na mesma frase, sem precisar varrer a tela
       atras dos numeros. */
    expect(screen.getByRole("button", { name: OPCAO_DO_PRAZO })).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(CRITERIOS.length);
  });

  it("o criterio ja escolhido leva a faixa dele embora da lista de restantes", async () => {
    const usuario = userEvent.setup();
    render(<OrdenacaoPesos {...padrao} />);
    await abrir(/Escolher um a um/);

    await usuario.click(screen.getByRole("button", { name: OPCAO_DO_PRAZO }));
    expect(screen.getAllByRole("img")).toHaveLength(CRITERIOS.length - 1);
    expect(screen.queryByText("45 dias")).not.toBeInTheDocument();
  });

  it("a faixa desenhada diz o mesmo que a faixa escrita, em qualquer modo", async () => {
    render(<OrdenacaoPesos {...padrao} />);
    await abrir(/Ordenar a lista/);
    const naLista = screen.getByRole("img", { name: FAIXA_DO_PRAZO });

    await abrir(/Escolher um a um/);
    const naEscolha = screen.getByRole("img", { name: FAIXA_DO_PRAZO });

    /* Sao dois desenhos do mesmo intervalo em telas diferentes; o que nao pode
       e um modo mostrar um numero e o outro mostrar outro. */
    expect(naLista).not.toBe(naEscolha);
  });
});
