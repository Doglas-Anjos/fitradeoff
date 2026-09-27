/**
 * A área de paridade: a visão geral e as cinco páginas de módulo.
 *
 * O defeito que este arquivo existe para impedir é silencioso. Quando falta uma
 * chave de tradução, `t()` devolve a própria chave — decisão deliberada, para
 * que a falta apareça em vez de virar texto vazio. Só que "aparecer" quer dizer
 * `paridade.mod.escolha.comoLe` escrito no meio de um parágrafo, e ninguém
 * percebe isso revisando cinco páginas parecidas. Como as chaves são montadas
 * por interpolação a partir da rota do módulo, nenhum erro de digitação é
 * pego pelo compilador.
 *
 * O segundo defeito é de conteúdo, não de código: apresentar o módulo que nunca
 * foi comparado com a mesma cara dos quatro que foram. É o que transformaria a
 * área de prova em peça de venda, então tem teste.
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ModuloPage from "@/app/paridade/[modulo]/page";
import ParidadePage from "@/app/paridade/page";
import { MODULOS, casosDe, placarDe } from "@/app/paridade/modulos";
import { PARIDADE_TEXTOS } from "@/lib/i18n/paridade";
import { PARIDADE } from "@/lib/paridade";

/* A rota chega pelo hook do Next; o resto da página é estático. */
const rotaAtual = { modulo: "escolha" };
vi.mock("next/navigation", () => ({
  useParams: () => rotaAtual,
  usePathname: () => "/paridade",
}));

function renderModulo(rota: string) {
  rotaAtual.modulo = rota;
  return render(<ModuloPage />);
}

/** Toda chave crua que vazou para a tela, com a chave inteira para o relato.
 *
 * Cada segmento precisa começar em minúscula, e não é capricho: `textContent`
 * cola os elementos sem separador nenhum, então um parágrafo terminado em
 * "não é paridade." seguido do título "Onde ainda não bate" produz a sequência
 * `paridade.Onde` — que tem forma de chave e não é uma. Nenhuma chave nossa
 * tem segmento começando em maiúscula, então exigir isso separa os dois casos.
 *
 * A varredura é por forma, e não por comparação contra o catálogo, porque o
 * caso que mais importa é justamente o que não está lá: um erro de digitação
 * em `paridade.mod.${rota}.comoLee` renderiza a chave inexistente, e comparar
 * contra as chaves conhecidas nunca o acharia. */
function chavesVazadas(raiz: HTMLElement): string[] {
  const texto = raiz.textContent ?? "";
  return [...texto.matchAll(/\bparidade(?:\.[a-z][a-zA-Z0-9-]*)+/g)].map((m) => m[0]);
}

describe("a varredura de chave vazada", () => {
  /* Contra texto controlado, porque o resto do arquivo depende dela: uma
     varredura quebrada deixaria todos os testes de vazamento verdes para
     sempre, e é o tipo de teste que ninguém revisita. */
  const varrer = (texto: string) => {
    const div = document.createElement("div");
    div.textContent = texto;
    return chavesVazadas(div);
  };

  it("acha a chave que vazou", () => {
    expect(varrer("O que responde paridade.mod.escolha.comoLe fim")).toEqual([
      "paridade.mod.escolha.comoLe",
    ]);
  });

  it("acha também a chave que nem existe no catálogo", () => {
    expect(varrer("paridade.mod.escolha.comoLee")).toEqual([
      "paridade.mod.escolha.comoLee",
    ]);
  });

  it("não confunde fim de frase com chave", () => {
    expect(varrer("isso não é paridade.Onde ainda não bate")).toEqual([]);
    expect(varrer("está no repositório, em paridade/. Onde procurar")).toEqual([]);
    expect(varrer("a área de paridade. O que ela prova")).toEqual([]);
  });
});

describe("o catálogo da paridade", () => {
  it("tem todo idioma em toda entrada", () => {
    /* Faltando um idioma, `t()` cai no português sem avisar: a tela fica
       traduzida pela metade e nada denuncia. */
    const incompletas = Object.entries(PARIDADE_TEXTOS)
      .filter(([, v]) => !v.pt?.trim() || !v.en?.trim() || !v.es?.trim())
      .map(([k]) => k);
    expect(incompletas).toEqual([]);
  });

  it("traz as chaves que as cinco páginas montam por interpolação", () => {
    /* O compilador não vê `paridade.mod.${rota}.comoLe`. Esta lista é o que
       `[modulo]/page.tsx` pede de todo módulo; se um campo novo entrar lá sem
       entrar no catálogo, a página mostra a chave crua. */
    const exigidas = ["nome", "oficial", "resumo", "responde", "comoLe", "exatidao", "testado"];
    const faltando: string[] = [];
    for (const modulo of MODULOS) {
      for (const campo of exigidas) {
        const chave = `paridade.mod.${modulo.rota}.${campo}`;
        if (!(chave in PARIDADE_TEXTOS)) faltando.push(chave);
      }
      if (modulo.divergencia) {
        for (const campo of ["titulo", "corpo"]) {
          const chave = `paridade.restam.${modulo.divergencia}.${campo}`;
          if (!(chave in PARIDADE_TEXTOS)) faltando.push(chave);
        }
      }
    }
    expect(faltando).toEqual([]);
  });
});

describe("a visão geral", () => {
  it("não deixa escapar chave de tradução", () => {
    const { container } = render(<ParidadePage />);
    expect(chavesVazadas(container)).toEqual([]);
  });

  it("leva aos cinco módulos", () => {
    render(<ParidadePage />);
    for (const modulo of MODULOS) {
      /* Busca por inclusao, e nao por expressao regular: dois dos nomes tem
         parenteses -- "Portfólio (Combinatorial)" --, que numa regex virariam
         grupo de captura em vez de texto literal. */
      const nome = PARIDADE_TEXTOS[`paridade.mod.${modulo.rota}.nome`].pt;
      const cartao = screen.getByRole("link", {
        name: (acessivel) => acessivel.includes(nome),
      });
      expect(cartao).toHaveAttribute("href", `/paridade/${modulo.rota}`);
    }
  });

  it("diz o que não foi testado, e não só o que deu certo", () => {
    /* Sem esta seção a página é propaganda. O teste cobra a existência dela
       porque é a primeira coisa que alguém cortaria para "deixar mais limpo". */
    render(<ParidadePage />);
    /* Por papel, e não por texto: o mesmo título aparece também no sumário,
       duas vezes — na lateral fixa e no recolhido do celular. */
    expect(
      screen.getByRole("heading", { name: "O que não foi testado" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/único dos cinco módulos sem um único caso medido/),
    ).toBeInTheDocument();
  });

  it("mostra todos os casos medidos, e não um recorte favorável", () => {
    const { container } = render(<ParidadePage />);
    for (const caso of PARIDADE) {
      expect(within(container).getByText(caso.chave)).toBeInTheDocument();
    }
  });
});

describe("as páginas de módulo", () => {
  it.each(MODULOS.map((m) => m.rota))("%s não deixa escapar chave", (rota) => {
    const { container } = renderModulo(rota);
    expect(chavesVazadas(container)).toEqual([]);
  });

  it.each(MODULOS.map((m) => m.rota))("%s mostra os seus casos, e só os seus", (rota) => {
    const modulo = MODULOS.find((m) => m.rota === rota)!;
    const meus = casosDe(modulo).map((c) => c.chave);
    const { container } = renderModulo(rota);

    for (const chave of meus) {
      expect(within(container).getAllByText(chave).length).toBeGreaterThan(0);
    }
    const alheios = PARIDADE.filter((c) => !meus.includes(c.chave));
    for (const caso of alheios) {
      expect(within(container).queryByText(caso.chave)).toBeNull();
    }
  });

  it("o módulo sem comparação não exibe placar, e explica por quê", () => {
    /* O combinatorial nunca rodou contra o oficial. Mostrá-lo com "0 de 0
       casos batem" ou, pior, com o placar agregado, seria afirmar uma prova
       que não existe. */
    const modulo = MODULOS.find((m) => m.rota === "combinatorial")!;
    expect(placarDe(modulo).comparaveis).toBe(0);

    const { container } = renderModulo("combinatorial");
    expect(screen.getByText("Sem caso comparado")).toBeInTheDocument();
    expect(container.textContent).toMatch(/avisa por e-mail|fila/);
    expect(container.textContent).not.toMatch(/de \d+ casos batem/);
  });

  it("o módulo que bate em tudo mostra o placar cheio", () => {
    const modulo = MODULOS.find((m) => m.rota === "classificacao")!;
    const placar = placarDe(modulo);
    expect(placar.bate).toBe(placar.comparaveis);

    renderModulo("classificacao");
    expect(
      screen.getByText(`${placar.bate} de ${placar.comparaveis} casos batem`),
    ).toBeInTheDocument();
  });

  it("quem tem divergência conhecida a traz na própria página", () => {
    /* Quem abre a página da ordenação para decidir se confia nela não deveria
       precisar voltar à visão geral para descobrir que há uma pergunta de
       diferença. */
    renderModulo("ordenacao");
    expect(screen.getByText("Onde ainda não bate")).toBeInTheDocument();
    expect(screen.getByText(/22 perguntas contra 21/)).toBeInTheDocument();
  });

  it("rota inventada não quebra a tela", () => {
    renderModulo("nao-existe");
    expect(screen.getByText("Não há módulo com esse nome.")).toBeInTheDocument();
  });
});
