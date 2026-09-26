/**
 * A tela de pergunta: o que o decisor precisa responder tem de estar visivel.
 *
 * Os tres defeitos que este arquivo existe para impedir, todos observados na
 * tela rodando:
 *
 * 1. Os dois lados vinham do servidor em ordens diferentes -- cada um com o seu
 *    criterio em destaque na frente -- entao "Prazo de entrega" era a primeira
 *    linha de um cartao e a terceira do outro. Comparar exigia procurar cada
 *    criterio no outro lado em vez de varrer na horizontal.
 * 2. O unico sinal de que os cartoes eram clicaveis era um texto que so
 *    aparecia no hover: em tela de toque nao existia. As unicas acoes visiveis
 *    eram "sao indiferentes" e "nao sei", ou seja, as saidas de emergencia
 *    apareciam e a resposta nao.
 * 3. A pergunta so existia como duas tabelas de quatro linhas. Descobrir o que
 *    estava sendo comparado era trabalho do leitor.
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TradeoffChart, alinhar, parseLinha } from "@/components/TradeoffChart";
import type { Pergunta } from "@/lib/types";

/* Como o servidor manda: cada lado abre pelo criterio que nao esta no pior. */
const PERGUNTA: Pergunta = {
  id: "d1",
  enunciado: "...",
  criterio_em_foco: "prazo",
  criterio_rival: "qualidade",
  opcao_a: [
    "Prazo de entrega: 28.5 dias",
    "Indice de qualidade: 0.6 (o pior possivel)",
    "Custo unitario: 18.4 R$/un (o pior possivel)",
    "Capacidade mensal: 3000 un (o pior possivel)",
  ],
  opcao_b: [
    "Indice de qualidade: 0.95 (o melhor possivel)",
    "Custo unitario: 18.4 R$/un (o pior possivel)",
    "Prazo de entrega: 45 dias (o pior possivel)",
    "Capacidade mensal: 3000 un (o pior possivel)",
  ],
  posicao_na_escala: 0.5,
  como_responder: "...",
};

describe("alinhar", () => {
  const a = PERGUNTA.opcao_a.map((l) => parseLinha(l, 0.5));
  const b = PERGUNTA.opcao_b.map((l) => parseLinha(l, 1));

  it("os dois lados chegam do servidor em ordens diferentes", () => {
    /* Guarda o motivo de `alinhar` existir. Se alguem "arrumar" o fixture para
       ja vir alinhado, os testes abaixo passam sem provar nada. */
    expect(a.map((l) => l.criterio)).not.toEqual(b.map((l) => l.criterio));
  });

  it("devolve uma ordem unica, valida para os dois lados", () => {
    const pares = alinhar(a, b);
    expect(pares.map((p) => p.criterio)).toEqual([
      // primeiro o que difere, na ordem em que aparece do lado A
      "Prazo de entrega",
      "Indice de qualidade",
      // depois o que e identico nos dois
      "Custo unitario",
      "Capacidade mensal",
    ]);
  });

  it("marca como identico so o que tem o mesmo desempenho dos dois lados", () => {
    const pares = alinhar(a, b);
    const identicos = pares.filter((p) => p.identico).map((p) => p.criterio);
    expect(identicos).toEqual(["Custo unitario", "Capacidade mensal"]);
  });

  it("cada par traz os dois lados, e nenhum criterio se perde", () => {
    const pares = alinhar(a, b);
    expect(pares).toHaveLength(4);
    for (const par of pares) {
      expect(par.a, `${par.criterio} sem o lado A`).toBeDefined();
      expect(par.b, `${par.criterio} sem o lado B`).toBeDefined();
    }
  });

  it("um criterio presente so de um lado entra mesmo assim", () => {
    /* Nao deveria acontecer, mas sumir com a linha calada seria pior do que
       mostrar um buraco: some justamente a informacao que estaria errada. */
    const pares = alinhar(a, b.slice(0, 2));
    const so = pares.find((p) => p.criterio === "Capacidade mensal");
    expect(so?.a).toBeDefined();
    expect(so?.b).toBeUndefined();
    expect(so?.identico).toBe(false);
  });
});

describe("a tela da pergunta", () => {
  it("diz em uma frase o que esta sendo comparado", () => {
    render(<TradeoffChart pergunta={PERGUNTA} onSelect={() => {}} />);
    const frase = screen.getByText(/O que você prefere ter/).textContent ?? "";
    expect(frase).toContain("Prazo de entrega");
    expect(frase).toContain("28.5 dias");
    expect(frase).toContain("Indice de qualidade");
    expect(frase).toContain("0.95");
  });

  it("mostra os dois cartoes com as linhas na mesma ordem", () => {
    render(<TradeoffChart pergunta={PERGUNTA} onSelect={() => {}} />);
    const cartaoA = screen.getByRole("group", { name: /Situação A/ });
    const cartaoB = screen.getByRole("group", { name: /Situação B/ });

    const criteriosDe = (cartao: HTMLElement) =>
      within(cartao)
        .getAllByRole("term")
        .map((dt) => dt.textContent);

    expect(criteriosDe(cartaoA)).toEqual(criteriosDe(cartaoB));
  });

  it("as linhas correspondentes tem a mesma estrutura nos dois cartoes", () => {
    /* Alinhar a ordem nao basta: se um lado ganha uma nota ("no pior nivel
       possivel") e o outro nao, tudo o que vem depois desliza e os dois cartoes
       deixam de casar na horizontal. O jsdom nao mede altura, entao o que se
       verifica aqui e a estrutura: linha a linha, os dois lados tem o mesmo
       numero de elementos. */
    render(<TradeoffChart pergunta={PERGUNTA} onSelect={() => {}} />);
    const linhasDe = (nome: RegExp) =>
      within(screen.getByRole("group", { name: nome }))
        .getAllByRole("term")
        .map((dt) => dt.parentElement!.parentElement!.childElementCount);

    expect(linhasDe(/Situação A/)).toEqual(linhasDe(/Situação B/));
  });

  it("cada cartao tem um botao de escolha visivel, sem depender do hover", () => {
    render(<TradeoffChart pergunta={PERGUNTA} onSelect={() => {}} />);
    // o texto existe no documento, e nao escondido atras de :hover
    expect(screen.getByText("Prefiro a Situação A")).toBeVisible();
    expect(screen.getByText("Prefiro a Situação B")).toBeVisible();
  });

  it("clicar no corpo do cartao nao responde: so o botao responde", async () => {
    /* O cartao inteiro era clicavel, e isso transformava em resposta qualquer
       toque dado para outra coisa -- selecionar um numero para conferir, tocar
       na barra. Agora o cartao so agrupa; quem decide e o botao. */
    const usuario = userEvent.setup();
    const aoEscolher = vi.fn();
    render(<TradeoffChart pergunta={PERGUNTA} onSelect={aoEscolher} />);

    await usuario.click(screen.getByRole("group", { name: /Situação A/ }));
    expect(aoEscolher).not.toHaveBeenCalled();

    await usuario.click(screen.getByText("Prefiro a Situação A"));
    await waitFor(() => expect(aoEscolher).toHaveBeenCalledWith("A"));
  });

  it("a escolha aparece confirmada antes de a tela trocar", async () => {
    /* Antes, clicar numa situação trocava a pergunta no mesmo quadro: a
       resposta era registrada e a pessoa não via qual tinha dado. Numa
       sequência de perguntas parecidas entre si, isso basta para perder a conta
       de onde se está. */
    const usuario = userEvent.setup();
    const aoEscolher = vi.fn();
    render(<TradeoffChart pergunta={PERGUNTA} onSelect={aoEscolher} />);

    await usuario.click(screen.getByText("Prefiro a Situação B"));

    // primeiro a tela confirma, e só então a resposta sai
    expect(aoEscolher).not.toHaveBeenCalled();
    expect(screen.getByRole("group", { name: /Situação B/ })).toHaveAttribute(
      "data-estado",
      "escolhido",
    );
    expect(screen.getByRole("group", { name: /Situação A/ })).toHaveAttribute(
      "data-estado",
      "preterido",
    );
    expect(screen.getByText("Escolhida")).toBeInTheDocument();

    await waitFor(() => expect(aoEscolher).toHaveBeenCalledWith("B"));
  });

  it("o segundo clique não vira uma segunda resposta", async () => {
    /* A pausa abre uma janela em que os dois cartões ainda estão na tela. Sem
       trava, dois cliques rápidos registrariam duas declarações para uma
       pergunta só. */
    const usuario = userEvent.setup();
    const aoEscolher = vi.fn();
    render(<TradeoffChart pergunta={PERGUNTA} onSelect={aoEscolher} />);

    await usuario.click(screen.getByText("Prefiro a Situação A"));
    await usuario.click(screen.getByRole("group", { name: /Situação B/ }));

    await waitFor(() => expect(aoEscolher).toHaveBeenCalledTimes(1));
    expect(aoEscolher).toHaveBeenCalledWith("A");
  });

  it("sair da tela no meio da pausa não registra resposta nenhuma", async () => {
    const usuario = userEvent.setup();
    const aoEscolher = vi.fn();
    const { unmount } = render(
      <TradeoffChart pergunta={PERGUNTA} onSelect={aoEscolher} />,
    );

    await usuario.click(screen.getByText("Prefiro a Situação A"));
    unmount();

    await new Promise((r) => setTimeout(r, 500));
    expect(aoEscolher).not.toHaveBeenCalled();
  });

  it("separa o que e igual nos dois lados sem esconder nada", () => {
    render(<TradeoffChart pergunta={PERGUNTA} onSelect={() => {}} />);
    // a marca do bloco identico aparece uma vez em cada cartao
    expect(screen.getAllByText("igual nas duas")).toHaveLength(2);
    // e os quatro criterios continuam nos dois lados: 4 x 2 = 8 termos
    expect(screen.getAllByRole("term")).toHaveLength(8);
  });

  it("diz por escrito quando um desempenho esta no extremo da escala", () => {
    /* Uma barra vazia sozinha le como dado faltante, nao como "este e o pior
       nivel possivel". */
    render(<TradeoffChart pergunta={PERGUNTA} onSelect={() => {}} />);
    expect(screen.getAllByText("no pior nível possível").length).toBeGreaterThan(0);
    expect(screen.getByText("no melhor nível possível")).toBeInTheDocument();
  });

  it("as saidas ficam abaixo dos cartoes, e nao no lugar da resposta", () => {
    render(
      <TradeoffChart
        pergunta={PERGUNTA}
        onSelect={() => {}}
        rodape={<button>são indiferentes</button>}
      />,
    );
    expect(screen.getByText("Nenhuma das duas:")).toBeInTheDocument();
  });
});
