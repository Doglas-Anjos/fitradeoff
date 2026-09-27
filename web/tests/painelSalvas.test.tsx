import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PainelSalvas } from "@/components/PainelSalvas";
import { api } from "@/lib/api";

const RESUMOS = [
  {
    id: "aaa",
    nome: "Seleção de fornecedor",
    problematica: "escolha" as const,
    alternativas: 4,
    criterios: 3,
    declaracoes: 2,
  },
  {
    id: "bbb",
    nome: "Carteira de projetos",
    problematica: "portfolio" as const,
    alternativas: 6,
    criterios: 2,
    declaracoes: 0,
  },
];

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/* As datas nascem no momento do teste, não num instante fixo do módulo: o que
   está sob teste é a distância até agora, e congelar `Date.now` só para isso
   atrapalharia o `userEvent`. */
function datados() {
  const agora = Date.now();
  const atras = (ms: number) => new Date(agora - ms).toISOString();
  return {
    agora,
    /* Nomes escolhidos para a ordem alfabética ser o contrário da ordem por
       data: qualquer troca entre as duas aparece no teste. */
    decisoes: [
      {
        id: "a",
        nome: "Aquisição de frota",
        problematica: "escolha" as const,
        alternativas: 3,
        criterios: 2,
        declaracoes: 1,
        criado_em: atras(9 * DIA),
        atualizado_em: atras(3 * DIA + HORA),
      },
      {
        id: "m",
        nome: "Merenda escolar",
        problematica: "ranking" as const,
        alternativas: 4,
        criterios: 3,
        declaracoes: 0,
        criado_em: atras(4 * DIA),
        atualizado_em: atras(30 * HORA),
      },
      {
        id: "z",
        nome: "Zoneamento urbano",
        problematica: "sorting" as const,
        alternativas: 5,
        criterios: 2,
        declaracoes: 2,
        criado_em: atras(2 * DIA),
        atualizado_em: atras(5 * MINUTO),
      },
    ],
  };
}

const CHAVE_LARGURA = "fitradeoff:salvas:largura";

beforeEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

/* O painel nasce fechado em qualquer largura de tela: ele sobrepõe o conteúdo,
   então quem manda abrir é o decisor. */
async function abrirPainel() {
  await userEvent.click(screen.getByRole("button", { name: /decisões salvas/i }));
}

/** Os itens na ordem em que estão no DOM, cada um com o texto inteiro. */
function itensDaLista(): string[] {
  return screen.getAllByRole("listitem").map((li) => li.textContent ?? "");
}

describe("PainelSalvas", () => {
  it("mostra as decisões que o servidor guarda, com tipo e resumo", async () => {
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: RESUMOS });
    render(<PainelSalvas onAbrir={() => {}} />);

    await abrirPainel();

    expect(await screen.findByText("Seleção de fornecedor")).toBeInTheDocument();
    // "Escolha" e "Combinatorial" também nomeiam os filtros, então olha só a lista
    const lista = within(screen.getByRole("list"));
    expect(lista.getByText("Carteira de projetos")).toBeInTheDocument();
    expect(lista.getByText("Escolha")).toBeInTheDocument();
    expect(lista.getByText("Combinatorial")).toBeInTheDocument();
    expect(
      lista.getByText("4 alternativas · 3 critérios · 2 respostas"),
    ).toBeInTheDocument();
    expect(lista.getByText("6 alternativas · 2 critérios")).toBeInTheDocument();
  });

  /* Antes este teste pedia um `dialog`: a gaveta era modal porque cobria a tela
     inteira no celular. O painel agora fica na borda direita em qualquer
     largura e a página atrás continua utilizável, então ele é uma região
     complementar, não um diálogo - prender o foco obrigaria a fechar o painel
     para voltar ao trabalho, que é justamente o que ele veio evitar. */
  it("o botão diz se o painel está aberto e qual painel ele controla", async () => {
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: RESUMOS });
    render(<PainelSalvas onAbrir={() => {}} />);

    const botao = screen.getByRole("button", { name: /decisões salvas/i });
    expect(botao).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(botao);
    expect(botao).toHaveAttribute("aria-expanded", "true");

    const painel = await screen.findByRole("complementary", {
      name: /decisões salvas/i,
    });
    expect(botao.getAttribute("aria-controls")).toBe(painel.getAttribute("id"));

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(botao).toHaveAttribute("aria-expanded", "false"));
  });

  it("fechado, sai da tela pela direita e não rouba clique da página", async () => {
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: RESUMOS });
    render(<PainelSalvas onAbrir={() => {}} />);

    const painel = screen.getByLabelText("Decisões salvas");
    /* Preso à janela, nunca a um pai do layout: é o que garante que abrir o
       painel não muda a dimensão de nada na página. */
    expect(painel.className).toContain("fixed");
    /* Só `transform` anda. Se algum dia alguém animar `width` ou `left`, a
       página volta a refluir a cada quadro e este teste cai. */
    expect(painel.style.transform).toBe("translateX(100%)");
    expect(painel.style.transition).toContain("transform");
    expect(painel.style.transition).not.toContain("width");
    expect(painel.style.pointerEvents).toBe("none");
    expect(painel).toHaveAttribute("aria-hidden", "true");
    expect(painel).toHaveAttribute("inert");

    await abrirPainel();

    expect(painel.style.transform).toBe("translateX(0)");
    expect(painel.style.pointerEvents).toBe("auto");
    expect(painel).not.toHaveAttribute("inert");
  });

  it("filtra pelo nome digitado", async () => {
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: RESUMOS });
    render(<PainelSalvas onAbrir={() => {}} />);
    await abrirPainel();
    await screen.findByText("Seleção de fornecedor");

    await userEvent.type(
      screen.getByLabelText("Buscar decisão pelo nome"),
      "carteira",
    );

    expect(screen.getByText("Carteira de projetos")).toBeInTheDocument();
    expect(screen.queryByText("Seleção de fornecedor")).not.toBeInTheDocument();
  });

  it("avisa quando nenhum nome casa com a busca", async () => {
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: RESUMOS });
    render(<PainelSalvas onAbrir={() => {}} />);
    await abrirPainel();
    await screen.findByText("Seleção de fornecedor");

    await userEvent.type(
      screen.getByLabelText("Buscar decisão pelo nome"),
      "obra do metrô",
    );

    expect(
      await screen.findByText("Nenhuma decisão com esse nome."),
    ).toBeInTheDocument();
  });

  it("filtra por tipo de decisão", async () => {
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: RESUMOS });
    render(<PainelSalvas onAbrir={() => {}} />);
    await abrirPainel();
    await screen.findByText("Seleção de fornecedor");

    const grupo = screen.getByRole("radiogroup", {
      name: "Filtrar por tipo de decisão",
    });
    await userEvent.click(
      screen.getByRole("radio", { name: "Combinatorial" }),
    );

    expect(screen.getByRole("radio", { name: "Combinatorial" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Todos" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(grupo).toBeInTheDocument();
    expect(screen.getByText("Carteira de projetos")).toBeInTheDocument();
    expect(screen.queryByText("Seleção de fornecedor")).not.toBeInTheDocument();
  });

  it("abre a decisão escolhida com o problema completo", async () => {
    const problema = { id: "bbb", nome: "Carteira de projetos" };
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: RESUMOS });
    const ver = vi.spyOn(api, "ver").mockResolvedValue(problema as never);
    const onAbrir = vi.fn();

    render(<PainelSalvas onAbrir={onAbrir} idAtual="aaa" />);
    await abrirPainel();
    await userEvent.click(await screen.findByText("Carteira de projetos"));

    await waitFor(() => expect(onAbrir).toHaveBeenCalledWith(problema));
    expect(ver).toHaveBeenCalledWith("bbb");
  });

  it("não oferece reabrir a decisão que já está na tela", async () => {
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: RESUMOS });
    render(<PainelSalvas onAbrir={() => {}} idAtual="aaa" />);
    await abrirPainel();

    expect(await screen.findByText("aberta agora")).toBeInTheDocument();
    const item = screen.getByText("Seleção de fornecedor").closest("button")!;
    expect(item).toBeDisabled();
  });

  it("diz que não há nada em vez de mostrar uma lista vazia", async () => {
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: [] });
    render(<PainelSalvas onAbrir={() => {}} />);
    await abrirPainel();

    expect(
      await screen.findByText("Nenhuma decisão salva ainda."),
    ).toBeInTheDocument();
  });

  it("sobrevive ao servidor fora do ar, sem quebrar a tela", async () => {
    vi.spyOn(api, "listar").mockRejectedValue(new Error("sem rede"));
    render(<PainelSalvas onAbrir={() => {}} />);
    await abrirPainel();

    expect(
      await screen.findByText("Nenhuma decisão salva ainda."),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/servidor/i);
  });
});

describe("PainelSalvas: ordem e última modificação", () => {
  it("começa pela modificação mais recente, e não pela ordem do servidor", async () => {
    const { decisoes } = datados();
    /* O servidor manda em ordem alfabética; o painel reordena. */
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes });
    render(<PainelSalvas onAbrir={() => {}} />);
    await abrirPainel();
    await screen.findByText("Zoneamento urbano");

    const nomes = itensDaLista();
    expect(nomes[0]).toContain("Zoneamento urbano");
    expect(nomes[1]).toContain("Merenda escolar");
    expect(nomes[2]).toContain("Aquisição de frota");

    expect(
      screen.getByRole("radio", { name: "Recentes" }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("ordena por nome quando o decisor pede", async () => {
    const { decisoes } = datados();
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes });
    render(<PainelSalvas onAbrir={() => {}} />);
    await abrirPainel();
    await screen.findByText("Zoneamento urbano");

    await userEvent.click(screen.getByRole("radio", { name: "Nome" }));

    const nomes = itensDaLista();
    expect(nomes[0]).toContain("Aquisição de frota");
    expect(nomes[1]).toContain("Merenda escolar");
    expect(nomes[2]).toContain("Zoneamento urbano");
    expect(screen.getByRole("radio", { name: "Nome" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Recentes" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("diz há quanto tempo cada decisão mudou, e a data inteira no title", async () => {
    const { agora, decisoes } = datados();
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes });
    render(<PainelSalvas onAbrir={() => {}} />);
    await abrirPainel();

    const recente = await screen.findByText("há 5 min");
    expect(screen.getByText("ontem")).toBeInTheDocument();
    expect(screen.getByText("há 3 dias")).toBeInTheDocument();

    /* O relativo é para reconhecer de relance; a data inteira, para anotar e
       comparar. Formatada pelo locale do idioma atual, não à mão. */
    const esperado = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(agora - 5 * MINUTO));
    expect(recente).toHaveAttribute("title", esperado);
  });

  it("sem data de modificação não inventa selo, e o item cai para o fim", async () => {
    const { decisoes } = datados();
    const antiga = {
      id: "sem",
      nome: "Obra antiga",
      problematica: "escolha" as const,
      alternativas: 2,
      criterios: 2,
      declaracoes: 0,
    };
    /* Decisão salva antes de o motor gravar datas: chega sem os campos. Ela
       aparece na lista como qualquer outra, só não afirma uma data. */
    vi.spyOn(api, "listar").mockResolvedValue({
      decisoes: [antiga, ...decisoes],
    });
    render(<PainelSalvas onAbrir={() => {}} />);
    await abrirPainel();
    await screen.findByText("Obra antiga");

    const nomes = itensDaLista();
    expect(nomes[0]).toContain("Zoneamento urbano");
    expect(nomes[3]).toContain("Obra antiga");

    const semData = screen.getByText("Obra antiga").closest("li")!;
    expect(semData.textContent).not.toMatch(/há |ontem|agora mesmo/);

    /* Por nome ela volta a competir de igual para igual: a falta da data só
       pesa na ordenação que depende dela. */
    await userEvent.click(screen.getByRole("radio", { name: "Nome" }));
    expect(itensDaLista()[2]).toContain("Obra antiga");
  });
});

describe("PainelSalvas: largura", () => {
  it("a alça redimensiona pelo teclado e guarda a largura escolhida", async () => {
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: RESUMOS });
    render(<PainelSalvas onAbrir={() => {}} />);
    await abrirPainel();

    const alca = screen.getByRole("separator", { name: /largura/i });
    expect(alca).toHaveAttribute("aria-orientation", "vertical");
    expect(alca).toHaveAttribute("aria-valuenow", "320");

    /* Arrastar é atalho: a alça é focável e as setas fazem o mesmo trabalho. */
    alca.focus();
    expect(alca).toHaveFocus();

    await userEvent.keyboard("{ArrowLeft}");
    expect(alca).toHaveAttribute("aria-valuenow", "336");

    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    expect(alca).toHaveAttribute("aria-valuenow", "304");
    expect(window.localStorage.getItem(CHAVE_LARGURA)).toBe("304");

    /* O mínimo é limite, não sugestão: abaixo dele o nome da decisão e o selo
       não caberiam na mesma linha. */
    for (let i = 0; i < 6; i += 1) await userEvent.keyboard("{ArrowRight}");
    expect(alca).toHaveAttribute("aria-valuenow", "240");
    expect(alca).toHaveAttribute("aria-valuemin", "240");
    expect(alca).toHaveAttribute("aria-valuemax", "560");
  });

  it("volta com a largura guardada, e não aceita um valor fora da faixa", async () => {
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: RESUMOS });

    window.localStorage.setItem(CHAVE_LARGURA, "420");
    const primeira = render(<PainelSalvas onAbrir={() => {}} />);
    await abrirPainel();
    expect(screen.getByRole("separator", { name: /largura/i })).toHaveAttribute(
      "aria-valuenow",
      "420",
    );
    primeira.unmount();

    /* Armazenamento é entrada de fora: o valor pode ter vindo de outra versão
       da tela, de outra janela, ou de um dedo curioso no console. */
    window.localStorage.setItem(CHAVE_LARGURA, "9999");
    render(<PainelSalvas onAbrir={() => {}} />);
    await abrirPainel();
    expect(screen.getByRole("separator", { name: /largura/i })).toHaveAttribute(
      "aria-valuenow",
      "560",
    );
  });
});

describe("PainelSalvas: favoritas", () => {
  it("sobe as favoritas acima do critério escolhido, inclusive do alfabeto", async () => {
    const { decisoes } = datados();
    /* "Zoneamento" é a última no alfabeto e a mais recente; marcar "Aquisição",
       que é a primeira no alfabeto e a mais antiga, faz cada ordenação provar
       uma coisa diferente. */
    const comFavorita = decisoes.map((d) =>
      d.id === "a" ? { ...d, favorita: true } : d,
    );
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: comFavorita });
    render(<PainelSalvas onAbrir={() => {}} />);
    await abrirPainel();
    await screen.findByText("Aquisição de frota");

    expect(itensDaLista()[0]).toContain("Aquisição de frota");

    await userEvent.click(screen.getByRole("radio", { name: "Nome" }));
    expect(itensDaLista()[0]).toContain("Aquisição de frota");

    /* Entre as não favoritas o critério de sempre continua mandando: o
       destaque é um desempate por cima, não uma ordenação nova. */
    const porNome = itensDaLista();
    expect(porNome[1]).toContain("Merenda escolar");
    expect(porNome[2]).toContain("Zoneamento urbano");
  });

  it("alterna pelo teclado, e a lista se reorganiza na hora", async () => {
    const { decisoes } = datados();
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes });
    const favoritar = vi
      .spyOn(api, "favoritar")
      .mockImplementation(async (id, favorita) => ({ id, favorita }) as never);
    render(<PainelSalvas onAbrir={() => {}} />);
    await abrirPainel();
    await screen.findByText("Aquisição de frota");

    // por data, a mais antiga está no fim
    expect(itensDaLista()[2]).toContain("Aquisição de frota");

    const estrela = screen.getByRole("button", {
      name: "Favorita: Aquisição de frota",
    });
    expect(estrela).toHaveAttribute("aria-pressed", "false");

    /* Botão de verdade: chega pelo Tab e responde ao Espaço. Um ícone com
       `onClick` passaria no teste do mouse e deixaria o teclado de fora. */
    estrela.focus();
    await userEvent.keyboard(" ");

    expect(favoritar).toHaveBeenCalledWith("a", true);
    await waitFor(() => expect(estrela).toHaveAttribute("aria-pressed", "true"));
    expect(itensDaLista()[0]).toContain("Aquisição de frota");
  });

  it("a decisão aberta não pode ser reaberta, mas pode ser favoritada", async () => {
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: RESUMOS });
    vi.spyOn(api, "favoritar").mockImplementation(
      async (id, favorita) => ({ id, favorita }) as never,
    );
    render(<PainelSalvas onAbrir={() => {}} idAtual="aaa" />);
    await abrirPainel();
    await screen.findByText("aberta agora");

    expect(
      screen.getByText("Seleção de fornecedor").closest("button"),
    ).toBeDisabled();

    const estrela = screen.getByRole("button", {
      name: "Favorita: Seleção de fornecedor",
    });
    expect(estrela).toBeEnabled();
    await userEvent.click(estrela);
    await waitFor(() => expect(estrela).toHaveAttribute("aria-pressed", "true"));
  });

  it("desfaz a marcação quando o servidor recusa, em vez de mentir", async () => {
    vi.spyOn(api, "listar").mockResolvedValue({ decisoes: RESUMOS });
    vi.spyOn(api, "favoritar").mockRejectedValue(new Error("sem rede"));
    render(<PainelSalvas onAbrir={() => {}} />);
    await abrirPainel();
    await screen.findByText("Seleção de fornecedor");

    const estrela = screen.getByRole("button", {
      name: "Favorita: Seleção de fornecedor",
    });
    await userEvent.click(estrela);

    await waitFor(() => expect(estrela).toHaveAttribute("aria-pressed", "false"));
    expect(screen.getByRole("alert")).toHaveTextContent(/favorita/i);
  });
});
