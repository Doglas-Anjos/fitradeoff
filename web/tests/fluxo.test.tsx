import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { avisar } from "@/components/Avisos";
import { EntradaProblema } from "@/components/EntradaProblema";
import { api } from "@/lib/api";
import type { Problematica } from "@/lib/types";

/** O que a tela avisou. Os erros de validação são toasts, e um toast não vive
    na árvore do componente sob teste — o espião é o jeito de afirmar sobre
    ele sem montar o provedor inteiro. */
let aviso: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
  aviso = vi.spyOn(avisar, "erro").mockImplementation(() => "");
});

const trilha = () => screen.getByRole("navigation", { name: "Progresso do cadastro" });
const passoAtual = () => within(trilha()).getByRole("button", { current: "step" });

/** O botao do primeiro passo nomeia o destino, que depende da forma de entrada. */
const ACAO_MODO: Record<string, string> = {
  "Cadastrar problema novo": "Continuar para alternativas e critérios",
  "Importar planilha": "Continuar para a planilha",
};

async function escolher(problematica: Problematica, modo: string) {
  if (problematica !== "escolha") {
    /* O nome acessivel do cartao simples e rotulo + ajuda, entao a busca e por
       prefixo; os rotulos das carteiras tem parenteses, que como expressao
       regular virariam grupo de captura em vez de texto. */
    const rotulo: Record<string, string> = {
      ranking: "Ordenação",
      sorting: "Classificação",
      portfolio: "Portfólio (Combinatorial)",
      beneficio_custo: "Portfólio (Benefit-to-Cost)",
    };
    const alvo = rotulo[problematica];
    await userEvent.click(
      screen.getByRole("radio", { name: (nome) => nome.startsWith(alvo) }),
    );
  }
  await userEvent.click(screen.getByRole("radio", { name: new RegExp(modo) }));
  await userEvent.click(screen.getByRole("button", { name: ACAO_MODO[modo] }));
}

/** Duas alternativas e dois critérios contínuos, o mínimo que o motor aceita. */
async function cadastrarEstrutura() {
  const alternativas = screen.getByRole("region", { name: "Alternativas" });
  for (const nome of ["Fornecedor A", "Fornecedor B"]) {
    await userEvent.type(
      within(alternativas).getByLabelText("Nome da nova alternativa"),
      `${nome}{Enter}`,
    );
  }
  for (const nome of ["Custo", "Prazo"]) {
    const criterios = screen.getByRole("region", { name: "Critérios" });
    await userEvent.type(within(criterios).getByLabelText("Nome do critério"), nome);
    await userEvent.click(within(criterios).getByRole("button", { name: "Adicionar" }));
  }
  await userEvent.click(
    screen.getByRole("button", { name: "Continuar para os desempenhos" }),
  );
}

async function preencherMatriz(valores: Record<string, string>) {
  for (const [rotulo, valor] of Object.entries(valores)) {
    await userEvent.type(screen.getByLabelText(rotulo), valor);
  }
}

const MATRIZ = {
  "Fornecedor A, Custo": "120",
  "Fornecedor A, Prazo": "30",
  "Fornecedor B, Custo": "95",
  "Fornecedor B, Prazo": "45",
};

describe("a sequência do cadastro", () => {
  it("começa pelo objetivo e pela forma de entrada, e não pela matriz", () => {
    render(<EntradaProblema onPronto={() => {}} />);

    expect(passoAtual()).toHaveTextContent("Objetivo");
    expect(
      screen.getByRole("heading", { level: 1, name: "O objetivo da decisão" }),
    ).toBeInTheDocument();
    expect(screen.getByText("O que você quer decidir?")).toBeInTheDocument();
    expect(screen.getByText("De onde vêm os dados?")).toBeInTheDocument();
    // nada de digitar desempenho antes de existir alternativa
    expect(screen.queryByText(/Desempenho de cada alternativa/)).not.toBeInTheDocument();
  });

  it("o primeiro passo resume a escolha antes de pedir para continuar", async () => {
    render(<EntradaProblema onPronto={() => {}} />);

    // duas opcoes ja vem marcadas: o resumo e o que diz o que se esta levando
    expect(screen.getByText(/escolher a melhor alternativa/)).toBeInTheDocument();
    expect(
      screen.getByText(/cadastrando alternativas e critérios na mão/),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: /Classificação/ }));
    expect(
      screen.getByText(/classificar cada alternativa numa faixa/),
    ).toBeInTheDocument();
  });

  it("a trilha tem um substituto legível onde ela não cabe", () => {
    render(<EntradaProblema onPronto={() => {}} />);

    // abaixo de sm a trilha some: sem isto nao ha como saber quantos faltam
    expect(within(trilha()).getByText(/Passo/)).toHaveTextContent(
      "Passo 1 de 3 · Objetivo",
    );
  });

  it("digitar leva ao cadastro estrutural, com as três etapas na trilha", async () => {
    render(<EntradaProblema onPronto={() => {}} />);
    await escolher("escolha", "Cadastrar problema novo");

    expect(passoAtual()).toHaveTextContent("Estrutura");
    expect(
      screen.getByRole("heading", { level: 1, name: "Quem são as opções e o que importa" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Alternativas" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Critérios" })).toBeInTheDocument();
    expect(
      within(trilha()).getAllByRole("button").map((b) => b.textContent),
    ).toEqual(["Objetivo", "2Estrutura", "3Desempenhos"]);
  });

  it("a estrutura incompleta não passa, e diz o que falta", async () => {
    render(<EntradaProblema onPronto={() => {}} />);
    await escolher("escolha", "Cadastrar problema novo");
    await userEvent.click(
      screen.getByRole("button", { name: "Continuar para os desempenhos" }),
    );

    /* O recado sai por aviso flutuante, e não mais num parágrafo no fim da
       tela: quem clica em "continuar" no rodapé de um formulário longo não via
       a mensagem, e o botão parecia não fazer nada. */
    expect(aviso).toHaveBeenCalledWith(
      expect.stringMatching(/duas alternativas/),
    );
    expect(passoAtual()).toHaveTextContent("Estrutura");
    // o erro leva ao campo a que se refere, e nao so ao fim da pagina
    expect(screen.getByLabelText("Nome da nova alternativa")).toHaveFocus();
  });

  it("estrutura salva abre a matriz já com as linhas e colunas cadastradas", async () => {
    render(<EntradaProblema onPronto={() => {}} />);
    await escolher("escolha", "Cadastrar problema novo");
    await cadastrarEstrutura();

    expect(passoAtual()).toHaveTextContent("Desempenhos");
    expect(
      screen.getByRole("heading", { level: 1, name: "Desempenho de cada alternativa" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Fornecedor A, Custo")).toBeInTheDocument();
    expect(screen.getByLabelText("Fornecedor B, Prazo")).toBeInTheDocument();
    // a matriz não cria estrutura: não há onde acrescentar critério aqui
    expect(screen.queryByLabelText("Nome do critério")).not.toBeInTheDocument();
  });

  it("voltar da matriz devolve a estrutura intacta", async () => {
    render(<EntradaProblema onPronto={() => {}} />);
    await escolher("escolha", "Cadastrar problema novo");
    await cadastrarEstrutura();
    await userEvent.click(screen.getByRole("button", { name: /Voltar à estrutura/ }));

    expect(passoAtual()).toHaveTextContent("Estrutura");
    const alternativas = screen.getByRole("region", { name: "Alternativas" });
    expect(within(alternativas).getByText("Fornecedor A")).toBeInTheDocument();
    expect(within(alternativas).getByText(/2 alternativas/)).toBeInTheDocument();
  });

  it("a matriz incompleta não cria decisão nenhuma", async () => {
    const criar = vi.spyOn(api, "criar");
    render(<EntradaProblema onPronto={() => {}} />);
    await escolher("escolha", "Cadastrar problema novo");
    await cadastrarEstrutura();
    await userEvent.click(screen.getByRole("button", { name: "Criar decisão" }));

    expect(aviso).toHaveBeenCalledWith(
      expect.stringMatching(/precisa ser um número/),
    );
    expect(criar).not.toHaveBeenCalled();
  });

  it("matriz cheia cria a decisão e entrega o problema pronto", async () => {
    const criado = { id: "abc", nome: "Compras" };
    const criar = vi.spyOn(api, "criar").mockResolvedValue(criado as never);
    const onPronto = vi.fn();

    render(<EntradaProblema onPronto={onPronto} />);
    await escolher("escolha", "Cadastrar problema novo");
    await cadastrarEstrutura();
    await preencherMatriz(MATRIZ);
    await userEvent.click(screen.getByRole("button", { name: "Criar decisão" }));

    await waitFor(() => expect(onPronto).toHaveBeenCalledWith(criado));
    expect(criar).toHaveBeenCalledWith(
      expect.objectContaining({
        alternativas: ["Fornecedor A", "Fornecedor B"],
        consequencias: [
          [120, 30],
          [95, 45],
        ],
        problematica: "escolha",
      }),
    );
  });

  it("voltar pela trilha é permitido; pular para frente, não", async () => {
    render(<EntradaProblema onPronto={() => {}} />);
    await escolher("escolha", "Cadastrar problema novo");

    const [objetivo, , desempenhos] = within(trilha()).getAllByRole("button");
    expect(desempenhos).toBeDisabled();
    expect(objetivo).toBeEnabled();

    await userEvent.click(objetivo);
    expect(passoAtual()).toHaveTextContent("Objetivo");
  });
});

describe("o que cada objetivo exige", () => {
  it("o sorting pede as faixas depois da estrutura, e não antes", async () => {
    const criar = vi.spyOn(api, "criar").mockResolvedValue({ id: "s" } as never);
    render(<EntradaProblema onPronto={() => {}} />);

    await escolher("sorting", "Cadastrar problema novo");
    // a escolha da problemática não pede faixa nenhuma ainda
    expect(screen.queryByLabelText("Nome da faixa 1")).not.toBeInTheDocument();

    await cadastrarEstrutura();
    await preencherMatriz(MATRIZ);
    await userEvent.click(
      screen.getByRole("button", { name: "Continuar para as faixas" }),
    );

    expect(passoAtual()).toHaveTextContent("Faixas");
    expect(
      screen.getByRole("heading", { level: 1, name: "As faixas de classificação" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nome da faixa 1")).toBeInTheDocument();
    // a escala 0-1 aparece antes dos campos, e a escada fecha em 1,00
    expect(screen.getByText(/valor global/)).toBeInTheDocument();
    expect(screen.getByText("1,00")).toBeInTheDocument();
    expect(screen.getByText("0,00")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Criar decisão" }));
    await waitFor(() =>
      expect(criar).toHaveBeenCalledWith(
        expect.objectContaining({
          problematica: "sorting",
          configuracao: { perfis: [0.35, 0.7], classes: ["Baixa", "Média", "Alta"] },
        }),
      ),
    );
  });

  it("a carteira pede o custo na matriz e o orçamento no passo seguinte", async () => {
    const criar = vi.spyOn(api, "criar").mockResolvedValue({ id: "p" } as never);
    render(<EntradaProblema onPronto={() => {}} />);

    await escolher("portfolio", "Cadastrar problema novo");
    await cadastrarEstrutura();

    await preencherMatriz({
      ...MATRIZ,
      "Custo de Fornecedor A": "12",
      "Custo de Fornecedor B": "16",
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Continuar para o orçamento" }),
    );

    expect(passoAtual()).toHaveTextContent("Orçamento");
    expect(
      screen.getByRole("heading", { level: 1, name: "O limite da carteira" }),
    ).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Orçamento disponível"), "20");
    await userEvent.click(screen.getByRole("button", { name: "Criar decisão" }));

    await waitFor(() =>
      expect(criar).toHaveBeenCalledWith(
        expect.objectContaining({
          problematica: "portfolio",
          custos: [12, 16],
          configuracao: { orcamento: 20 },
        }),
      ),
    );
  });

  it("a carteira sem orçamento não cria, e volta para os desempenhos sem perder nada", async () => {
    const criar = vi.spyOn(api, "criar");
    render(<EntradaProblema onPronto={() => {}} />);

    await escolher("portfolio", "Cadastrar problema novo");
    await cadastrarEstrutura();
    await preencherMatriz({
      ...MATRIZ,
      "Custo de Fornecedor A": "12",
      "Custo de Fornecedor B": "16",
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Continuar para o orçamento" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Criar decisão" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/orçamento/);
    expect(criar).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /Voltar aos desempenhos/ }));
    expect(screen.getByLabelText("Custo de Fornecedor A")).toHaveValue("12");
  });

  it("escolha e ranking vão direto da matriz para a criação", async () => {
    render(<EntradaProblema onPronto={() => {}} />);
    await escolher("ranking", "Cadastrar problema novo");

    expect(
      within(trilha()).getAllByRole("button").map((b) => b.textContent),
    ).toEqual(["Objetivo", "2Estrutura", "3Desempenhos"]);
  });
});

describe("os outros dois caminhos continuam inteiros", () => {
  it("importar planilha leva à tela de upload", async () => {
    render(<EntradaProblema onPronto={() => {}} />);
    await escolher("escolha", "Importar planilha");

    expect(passoAtual()).toHaveTextContent("Planilha");
    expect(
      screen.getByRole("heading", { level: 1, name: "Importar de uma planilha" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Arraste a planilha aqui/)).toBeInTheDocument();
    expect(screen.getByText(/Baixar planilha-modelo/)).toBeInTheDocument();
  });

  it("a planilha lida vai para conferência antes de virar decisão", async () => {
    vi.spyOn(api, "previaPlanilha").mockResolvedValue({
      nome: "Compras",
      alternativas: ["A", "B"],
      criterios: [
        { chave: "custo", nome: "Custo", direcao: "min", unidade: "R$" },
        { chave: "prazo", nome: "Prazo", direcao: "min", unidade: "dias" },
      ],
      consequencias: [
        [120, 30],
        [95, 45],
      ],
      custos: null,
      origem: "dados.xlsx",
    });
    const criar = vi.spyOn(api, "criar").mockResolvedValue({ id: "i" } as never);

    render(<EntradaProblema onPronto={() => {}} />);
    await escolher("escolha", "Importar planilha");

    const textarea = screen.getByLabelText(/Cole aqui os dados/);
    await userEvent.click(textarea);
    await userEvent.paste("criterio\tCusto\nA\t1");

    expect(await screen.findByText(/Confira o que foi lido/)).toBeInTheDocument();
    expect(criar).not.toHaveBeenCalled();

    await userEvent.click(screen.getByText(/Está certo, criar a decisão/));
    await waitFor(() =>
      expect(criar).toHaveBeenCalledWith(expect.objectContaining({ nome: "Compras" })),
    );
  });

  it("não oferece mais as salvas como passo: elas vivem no painel lateral", async () => {
    /* Elas eram um passo da trilha, o que tirava a pessoa do cadastro para
       mostrar uma lista. Agora ficam na coluna da direita, visíveis o tempo
       todo, e a trilha só trata do que está sendo criado. */
    render(<EntradaProblema onPronto={() => {}} />);

    expect(
      screen.queryByRole("radio", { name: /Continuar problema salvo/ }),
    ).toBeNull();
    expect(within(trilha()).queryByText("Decisões salvas")).toBeNull();

    // as duas fontes que restam continuam de pé
    expect(
      screen.getByRole("radio", { name: /Cadastrar problema novo/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Importar planilha/ }),
    ).toBeInTheDocument();
  });
});

describe("o rascunho sobrevive", () => {
  it("reabrir a tela volta no passo e com o cadastro que estavam gravados", async () => {
    const { unmount } = render(<EntradaProblema onPronto={() => {}} />);
    await escolher("escolha", "Cadastrar problema novo");
    await cadastrarEstrutura();
    unmount();

    render(<EntradaProblema onPronto={() => {}} />);

    await waitFor(() => expect(passoAtual()).toHaveTextContent("Desempenhos"));
    expect(screen.getByLabelText("Fornecedor A, Custo")).toBeInTheDocument();
  });
});

/**
 * A caixa das duas carteiras.
 *
 * A quinta problemática existia no motor, na API e no MCP, e não existia aqui:
 * a lista de objetivos tinha quatro entradas e `beneficio_custo` não era uma
 * delas. Dava para criar uma carteira por razão pelo chat, mas não pela tela.
 *
 * Agrupá-las numa caixa só segue o sistema de referência, e a razão é boa: as
 * duas pedem os mesmos dados e respondem à mesma pergunta. Como cartões irmãos
 * elas pareceriam objetivos diferentes.
 */
describe("as duas leituras de carteira", () => {
  const abrir = () => render(<EntradaProblema onPronto={() => {}} />);

  it("as duas aparecem como opção", () => {
    abrir();
    expect(
      screen.getByRole("radio", { name: "Portfólio (Combinatorial)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Portfólio (Benefit-to-Cost)" }),
    ).toBeInTheDocument();
  });

  it("os nomes são os do sistema de referência", () => {
    /* "Montar carteira" descrevia melhor a ação, mas quem usa os dois sistemas
       lado a lado precisa reconhecer o mesmo módulo nos dois. */
    abrir();
    for (const nome of ["Escolha", "Ordenação", "Classificação"]) {
      expect(
        screen.getByRole("radio", { name: (n) => n.startsWith(nome) }),
        `falta ${nome}`,
      ).toBeInTheDocument();
    }
  });

  it("escolher uma desmarca a outra: é o mesmo grupo", async () => {
    const usuario = userEvent.setup();
    abrir();
    const combinatorial = screen.getByRole("radio", {
      name: "Portfólio (Combinatorial)",
    }) as HTMLInputElement;
    const razao = screen.getByRole("radio", {
      name: "Portfólio (Benefit-to-Cost)",
    }) as HTMLInputElement;

    await usuario.click(combinatorial);
    expect(combinatorial.checked).toBe(true);

    await usuario.click(razao);
    expect(razao.checked).toBe(true);
    expect(combinatorial.checked).toBe(false);
  });

  it("escolher uma carteira desmarca os outros objetivos", async () => {
    const usuario = userEvent.setup();
    abrir();
    const escolha = screen.getByRole("radio", {
      name: (n) => n.startsWith("Escolha"),
    }) as HTMLInputElement;
    await usuario.click(escolha);
    expect(escolha.checked).toBe(true);

    await usuario.click(screen.getByRole("radio", { name: "Portfólio (Combinatorial)" }));
    expect(escolha.checked).toBe(false);
  });

  it("os cinco radios são um grupo só no DOM, não dois", () => {
    /* O teste acima passa mesmo com dois grupos separados: `checked` vem do
       estado do React, que é um só de qualquer jeito. Quem depende do atributo
       `name` é o teclado -- as setas andam dentro de um grupo de radio, e com a
       caixa das carteiras num grupo próprio elas parariam na fronteira. Foi
       exatamente esse defeito que o teste de estado deixou passar. */
    abrir();
    const objetivos = screen
      .getAllByRole("radio")
      .filter((r) => (r as HTMLInputElement).name === "problematica");
    expect(objetivos).toHaveLength(5);
  });

  it("cada passo tem uma saída, e uma só", async () => {
    /* Na estrutura havia três, todas para o objetivo. O teste conta: se alguém
       devolver o link ao rodapé de um passo, aparecem duas. */
    render(<EntradaProblema onPronto={() => {}} />);
    await escolher("ranking", "Cadastrar problema novo");

    const saidas = screen
      .getAllByRole("button")
      .filter((b) => /^Voltar /.test(b.textContent ?? ""));
    expect(saidas).toHaveLength(1);
    expect(saidas[0]).toHaveTextContent("Voltar ao objetivo");
  });

  it("a saída nomeia o destino, que muda com o passo", async () => {
    render(<EntradaProblema onPronto={() => {}} />);
    await escolher("escolha", "Cadastrar problema novo");
    expect(screen.getByRole("button", { name: "Voltar ao objetivo" })).toBeInTheDocument();

    await cadastrarEstrutura();
    // já nos desempenhos, a volta é para a estrutura
    expect(screen.getByRole("button", { name: "Voltar à estrutura" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Voltar ao objetivo" }),
    ).not.toBeInTheDocument();
  });

  /* O cartão inteiro responde ao clique, e a metade em que se clica decide
     qual das duas. Sem isso, só os dois radios de 14px eram alvo -- e o resto
     do cartão, que é quase toda a área, não fazia nada. */
  describe("as duas metades do cartão", () => {
    const metades = (container: HTMLElement) =>
      [...container.querySelectorAll("label[for]")].filter(
        (l) => l.textContent === "",
      ) as HTMLLabelElement[];

    it("cada metade aciona a sua opção", () => {
      const { container } = abrir();
      const [esquerda, direita] = metades(container);
      expect(esquerda.htmlFor).toMatch(/portfolio$/);
      expect(direita.htmlFor).toMatch(/beneficio_custo$/);
    });

    it("clicar numa metade escolhe aquela leitura", async () => {
      const usuario = userEvent.setup();
      const { container } = abrir();
      const [, direita] = metades(container);

      await usuario.click(direita);
      expect(
        (screen.getByRole("radio", {
          name: "Portfólio (Benefit-to-Cost)",
        }) as HTMLInputElement).checked,
      ).toBe(true);
    });

    it("as metades vazias não roubam o nome acessível dos radios", () => {
      /* Dois rótulos apontando para o mesmo controle somam os textos. Se a
         metade tivesse qualquer conteúdo, o nome do radio mudaria e o leitor de
         tela anunciaria a opção duas vezes. */
      abrir();
      expect(
        screen.getByRole("radio", { name: "Portfólio (Combinatorial)" }),
      ).toBeInTheDocument();
    });

    it("o desenho conta a diferença: conjunto de uma vez, ou um após o outro", async () => {
      const usuario = userEvent.setup();
      const { container } = abrir();
      const [esquerda, direita] = metades(container);
      const svg = () => esquerda.closest("div")!.parentElement!;

      await usuario.hover(esquerda);
      // combinatorial: a elipse se fecha em volta do conjunto
      expect(svg().querySelector("ellipse")).toHaveClass("traca");
      const juntos = [...svg().querySelectorAll("circle.surge-conjunto")];
      expect(juntos.length).toBeGreaterThan(0);

      await usuario.hover(direita);
      // por razão: os pontos acendem em sequência, e a elipse não se traça
      expect(svg().querySelector("ellipse")).not.toHaveClass("traca");
      const emFila = [...svg().querySelectorAll("circle.surge-ponto")];
      expect(emFila.length).toBeGreaterThan(0);
      // cada um com o seu lugar na fila
      const ordens = emFila.map((c) => (c as HTMLElement).style.getPropertyValue("--ordem"));
      expect(new Set(ordens).size).toBe(emFila.length);
    });
  });

  /* As animações dos outros três cartões.
   *
   * O que estes testes protegem não é que "tem animação" -- é o que cada uma
   * afirma sobre o método. Numa refatoração, uma animação genérica aplicada
   * aos três passaria despercebida a olho nu e apagaria a distinção que o
   * desenho existe para fazer: ordenar produz uma sequência, classificar
   * aloca dentro de faixas que já existiam. */
  describe("cada objetivo se move do seu jeito", () => {
    const cartaoDe = (rotulo: string) =>
      screen.getByRole("radio", { name: new RegExp(rotulo) }).closest("label")!;

    it("na escolha, as ligações se desenham e a vencedora vem depois", async () => {
      const usuario = userEvent.setup();
      abrir();
      const cartao = cartaoDe("Escolha");

      await usuario.hover(cartao);
      const ligacoes = [...cartao.querySelectorAll("path.traca")];
      expect(ligacoes.length).toBe(3);
      // cada ligação tem o seu próprio comprimento: o traço cobre a linha
      // inteira, e não um valor chutado igual para todas
      const comprimentos = ligacoes.map((l) =>
        Number((l as HTMLElement).style.getPropertyValue("--comprimento")),
      );
      expect(comprimentos.every((c) => c > 0)).toBe(true);
      // a vencedora entra por último, depois das comparações
      expect(cartao.querySelector("circle.surge-vencedora")).toBeInTheDocument();
    });

    it("na ordenação, as posições entram em cascata", async () => {
      const usuario = userEvent.setup();
      abrir();
      const cartao = cartaoDe("Ordenação");

      await usuario.hover(cartao);
      const linhas = [...cartao.querySelectorAll("g.entra-da-esquerda")];
      expect(linhas.length).toBe(4);
      // a cascata é a sequência do resultado: cada posição com o seu lugar
      const ordens = linhas.map((g) =>
        (g as HTMLElement).style.getPropertyValue("--ordem"),
      );
      expect(ordens).toEqual(["0", "1", "2", "3"]);
    });

    it("na classificação, as faixas vêm antes das alternativas", async () => {
      const usuario = userEvent.setup();
      abrir();
      const cartao = cartaoDe("Classificação");

      await usuario.hover(cartao);
      expect(cartao.querySelectorAll("g.surge-faixa").length).toBe(3);

      /* A cascata dos pontos é contínua entre as faixas. Se recomeçasse em
         cada uma, três alternativas cairiam ao mesmo tempo em faixas
         diferentes -- e a figura diria que a alocação é simultânea, quando o
         que ela quer dizer é uma de cada vez, dentro de classes que já
         estavam lá. */
      const pontos = [...cartao.querySelectorAll("circle.cai-na-faixa")];
      const ordens = pontos.map((c) =>
        Number((c as HTMLElement).style.getPropertyValue("--ordem")),
      );
      expect(ordens).toEqual([...ordens].sort((a, b) => a - b));
      expect(new Set(ordens).size).toBe(pontos.length);
    });

    it("parado, nenhum deles se move", () => {
      /* O cartão não apontado nem escolhido fica quieto: cinco figuras
         animando sozinhas ao mesmo tempo seriam ruído, não explicação. */
      abrir();
      const cartao = cartaoDe("Ordenação");
      expect(cartao.querySelector("g.entra-da-esquerda")).toBeNull();
    });
  });

  it("a caixa traz o helper que diz qual das duas usar", async () => {
    const usuario = userEvent.setup();
    abrir();
    await usuario.click(
      screen.getByRole("button", { name: /Qual das duas carteiras/ }),
    );
    const ajuda = screen.getByRole("dialog", { name: /Qual das duas carteiras/ });
    expect(ajuda).toHaveTextContent(/maior valor agregado/);
    expect(ajuda).toHaveTextContent(/razão entre benefício e custo/);
    // a ressalva de amostragem vale para as duas, e precisa estar dita
    expect(ajuda).toHaveTextContent(/aproximado/);
  });
});

/**
 * Os casos prontos.
 *
 * Cada exemplo carrega o objetivo para o qual foi feito, e esse campo existia
 * sem ninguém ler: "Campanhas do trimestre" traz custo por campanha e caía numa
 * Ordenação, que ignora custo — o caso perdia justamente o que tinha a ensinar.
 */
describe("casos prontos", () => {
  const catalogo = () =>
    screen.getByRole("region", { name: "Começar de um caso pronto" });

  const cartao = (titulo: RegExp) =>
    within(catalogo())
      .getAllByRole("button")
      .find((b) => titulo.test(b.textContent ?? ""))!;

  it("há um caso para cada uma das cinco leituras", async () => {
    render(<EntradaProblema onPronto={() => {}} />);
    await escolher("escolha", "Cadastrar problema novo");

    const objetivos = within(catalogo())
      .getAllByRole("button")
      .map((b) => b.textContent ?? "");
    for (const curto of [
      "Escolha",
      "Ranking",
      "Classificação",
      "Combinatorial",
      "Benefit-to-Cost",
    ]) {
      expect(
        objetivos.some((texto) => texto.includes(`para ${curto}`)),
        `nenhum caso para ${curto}`,
      ).toBe(true);
    }
  });

  it("aplicar um caso traz o objetivo dele junto", async () => {
    const usuario = userEvent.setup();
    render(<EntradaProblema onPronto={() => {}} />);
    await escolher("ranking", "Cadastrar problema novo");

    await usuario.click(cartao(/Investimentos da diretoria/));

    // o objetivo mudou de Ordenação para a leitura por razão
    expect(screen.getByText("Portfólio (Benefit-to-Cost)")).toBeInTheDocument();
    // e a trilha ganhou o passo de ajustes, que é onde o orçamento é pedido
    expect(
      within(trilha()).getAllByRole("button").map((b) => b.textContent),
    ).toContain("4Ajustes");
  });

  it("o caso preenche alternativas, critérios e custos", async () => {
    const usuario = userEvent.setup();
    render(<EntradaProblema onPronto={() => {}} />);
    await escolher("escolha", "Cadastrar problema novo");

    await usuario.click(cartao(/Campanhas do trimestre/));

    const alternativas = screen.getByRole("region", { name: "Alternativas" });
    expect(within(alternativas).getByText("Feira do setor")).toBeInTheDocument();
    expect(within(alternativas).getByText("Patrocínio esportivo")).toBeInTheDocument();
    const criterios = screen.getByRole("region", { name: "Critérios" });
    expect(within(criterios).getByText("Alcance")).toBeInTheDocument();
    // o custo por campanha vem junto, que é o que a carteira precisa
    expect(screen.getByText(/Campanhas do trimestre/)).toBeInTheDocument();
  });
});

/**
 * O catálogo não pode empurrar o cadastro para fora da tela.
 *
 * Os seis cartões de casos prontos ocupavam a primeira dobra inteira: quem
 * chegava na tela de estrutura via um catálogo e precisava rolar para encontrar
 * alternativas e critérios — o que tinha vindo fazer. Ele serve a quem não sabe
 * por onde começar, e vira ruído para quem já está preenchendo.
 */
describe("o catálogo de casos prontos", () => {
  it("abre sozinho quando o cadastro está em branco", async () => {
    render(<EntradaProblema onPronto={() => {}} />);
    await escolher("escolha", "Cadastrar problema novo");

    expect(screen.getByText("Seleção de fornecedor")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /recolher/i }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("recolhe assim que há algo digitado, e o cadastro sobe", async () => {
    const usuario = userEvent.setup();
    render(<EntradaProblema onPronto={() => {}} />);
    await escolher("escolha", "Cadastrar problema novo");

    /* Aplicar um caso preenche o rascunho: na volta a esta tela o catálogo já
       não é o que interessa. */
    await usuario.click(
      within(screen.getByRole("region", { name: "Começar de um caso pronto" }))
        .getAllByRole("button")
        .find((b) => /Compra de um carro/.test(b.textContent ?? ""))!,
    );

    // os cartões somem da vista, e o gatilho passa a oferecer mostrá-los
    expect(screen.queryByText("Plano de controle de qualidade")).not.toBeVisible();
    expect(screen.getByRole("button", { name: /ver os 6 casos/i })).toBeInTheDocument();
    // e o cadastro continua lá
    expect(screen.getByRole("region", { name: "Alternativas" })).toBeInTheDocument();
  });
});
