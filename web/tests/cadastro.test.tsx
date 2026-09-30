import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CadastroEstrutural } from "@/components/CadastroEstrutural";
import { RascunhoEmMemoria } from "@/components/entrada/contextoRascunho";
import { criterioVazio, RASCUNHO_VAZIO, type Rascunho } from "@/lib/rascunho";

/* O aviso de acao virou toast, e o Sonner nao roda no jsdom. O que o teste
   precisa saber e que a acao foi recusada e com que texto -- nao como o toast
   se desenha, que e trabalho da biblioteca. */
const avisos: string[] = [];
/* O "desfazer" de cada aviso desfazível, para o teste clicar nele depois. */
const desfazeres: (() => void)[] = [];
vi.mock("@/components/Avisos", () => ({
  avisar: {
    erro: (m: string) => avisos.push(m),
    feito: () => {},
    desfazivel: (_m: string, desfazer: () => void) => desfazeres.push(desfazer),
  },
}));
const ultimoAviso = () => avisos[avisos.length - 1] ?? "";
beforeEach(() => {
  avisos.length = 0;
  desfazeres.length = 0;
});

/** O cadastro lê o rascunho de um provedor; o teste o provê em memória, com o
    mesmo contrato que a sequência de cadastro cumpre com o rascunho
    sincronizado, e espia cada gravação. */
function Tela({
  inicial = RASCUNHO_VAZIO,
  onSalvar = () => {},
  espiar,
  campoComErro,
}: {
  inicial?: Rascunho;
  onSalvar?: () => void;
  espiar?: (r: Rascunho) => void;
  campoComErro?: string | null;
}) {
  return (
    <RascunhoEmMemoria inicial={inicial} onAlterar={espiar} campoComErro={campoComErro}>
      <CadastroEstrutural onSalvar={onSalvar} />
    </RascunhoEmMemoria>
  );
}

const blocoAlternativas = () =>
  screen.getByRole("region", { name: "Alternativas" });
const blocoCriterios = () => screen.getByRole("region", { name: "Critérios" });

async function adicionarAlternativa(nome: string) {
  const bloco = blocoAlternativas();
  await userEvent.type(
    within(bloco).getByLabelText("Nome da nova alternativa"),
    nome,
  );
  await userEvent.click(within(bloco).getByRole("button", { name: "Adicionar" }));
}

async function adicionarCriterio(nome: string) {
  const bloco = blocoCriterios();
  await userEvent.type(within(bloco).getByLabelText("Nome do critério"), nome);
  await userEvent.click(within(bloco).getByRole("button", { name: "Adicionar" }));
}

describe("lista de alternativas", () => {
  it("adiciona pelo botão e atualiza a contagem", async () => {
    render(<Tela />);
    // a contagem diz o que falta, nao o que ha
    expect(
      within(blocoAlternativas()).getByText("Faltam 2 alternativas"),
    ).toBeInTheDocument();

    await adicionarAlternativa("Fornecedor A");
    expect(
      within(blocoAlternativas()).getByText("Falta 1 alternativa"),
    ).toBeInTheDocument();

    await adicionarAlternativa("Fornecedor B");

    const bloco = blocoAlternativas();
    expect(within(bloco).getByText("Fornecedor A")).toBeInTheDocument();
    expect(within(bloco).getByText(/2 alternativas/)).toBeInTheDocument();
    // a contagem deixa de cobrar o mínimo assim que ele é alcançado
    expect(within(bloco).queryByText(/mínimo 2/)).not.toBeInTheDocument();
  });

  it("adiciona com Enter, sem obrigar a sair do campo", async () => {
    render(<Tela />);
    await userEvent.type(
      within(blocoAlternativas()).getByLabelText("Nome da nova alternativa"),
      "Fornecedor A{Enter}",
    );

    expect(within(blocoAlternativas()).getByText("Fornecedor A")).toBeInTheDocument();
  });

  it("recusa nome repetido em vez de criar duas iguais", async () => {
    render(<Tela />);
    await adicionarAlternativa("Fornecedor A");
    await adicionarAlternativa("Fornecedor A");

    expect(ultimoAviso()).toMatch(/Já existe/);
    expect(within(blocoAlternativas()).getByText(/1 alternativa/)).toBeInTheDocument();
  });

  it("edita o nome de uma já cadastrada, sem recriá-la", async () => {
    const espiar = vi.fn();
    render(<Tela espiar={espiar} />);
    await adicionarAlternativa("Fornecedor A");

    await userEvent.click(screen.getByRole("button", { name: "Editar Fornecedor A" }));
    const campo = screen.getByLabelText("Novo nome de Fornecedor A");
    await userEvent.clear(campo);
    await userEvent.type(campo, "Fornecedor Alfa{Enter}");

    const bloco = blocoAlternativas();
    expect(within(bloco).getByText("Fornecedor Alfa")).toBeInTheDocument();
    expect(within(bloco).queryByText("Fornecedor A")).not.toBeInTheDocument();
    expect(within(bloco).getByText(/1 alternativa/)).toBeInTheDocument();
  });

  it("cancelar a edição deixa o nome como estava", async () => {
    render(<Tela />);
    await adicionarAlternativa("Fornecedor A");

    await userEvent.click(screen.getByRole("button", { name: "Editar Fornecedor A" }));
    await userEvent.type(screen.getByLabelText("Novo nome de Fornecedor A"), "xxx");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar edição" }));

    expect(within(blocoAlternativas()).getByText("Fornecedor A")).toBeInTheDocument();
  });

  it("exclui a escolhida, e só ela", async () => {
    render(<Tela />);
    await adicionarAlternativa("Fornecedor A");
    await adicionarAlternativa("Fornecedor B");

    await userEvent.click(screen.getByRole("button", { name: "Excluir Fornecedor A" }));

    const bloco = blocoAlternativas();
    expect(within(bloco).queryByText("Fornecedor A")).not.toBeInTheDocument();
    expect(within(bloco).getByText("Fornecedor B")).toBeInTheDocument();
  });

  it("o item cadastrado não oferece seleção: só editar e excluir", async () => {
    render(<Tela />);
    await adicionarAlternativa("Fornecedor A");

    const bloco = blocoAlternativas();
    // destacar um item nao levava a nada, e usava a cor que significa "ativo"
    expect(
      within(bloco).queryByRole("button", { name: "Fornecedor A" }),
    ).not.toBeInTheDocument();
    expect(within(bloco).getByText("Fornecedor A")).toBeInTheDocument();
    expect(
      within(bloco).getByRole("button", { name: "Editar Fornecedor A" }),
    ).toBeInTheDocument();
    expect(
      within(bloco).getByRole("button", { name: "Excluir Fornecedor A" }),
    ).toBeInTheDocument();
  });
});

describe("lista de critérios", () => {
  it("cadastra com direção e unidade, e resume na lista", async () => {
    render(<Tela />);
    const bloco = blocoCriterios();

    await userEvent.type(within(bloco).getByLabelText("Nome do critério"), "Custo");
    await userEvent.type(within(bloco).getByLabelText("Unidade"), "R$/un");
    await userEvent.click(
      within(
        within(bloco).getByRole("radiogroup", { name: "Direção do critério" }),
      ).getByRole("radio", { name: /menor/ }),
    );
    await userEvent.click(within(bloco).getByRole("button", { name: "Adicionar" }));

    expect(within(blocoCriterios()).getByText("Custo")).toBeInTheDocument();
    /* Unidade e direção viraram selos separados: cada uma tem contorno
       próprio, em vez de se dissolverem numa linha só de texto. */
    expect(within(blocoCriterios()).getByText("R$/un")).toBeInTheDocument();
    expect(within(blocoCriterios()).getByText("menor é melhor")).toBeInTheDocument();
  });

  it("o formulário volta em branco depois de adicionar", async () => {
    render(<Tela />);
    await adicionarCriterio("Custo");

    expect(within(blocoCriterios()).getByLabelText("Nome do critério")).toHaveValue("");
  });

  it("escala discreta troca a direção pelos níveis", async () => {
    render(<Tela />);
    const bloco = blocoCriterios();

    await userEvent.type(within(bloco).getByLabelText("Nome do critério"), "Conforto");
    await userEvent.click(
      within(
        within(bloco).getByRole("radiogroup", { name: "Tipo de escala do critério" }),
      ).getByRole("radio", { name: "Discreta" }),
    );

    // a ordem dos níveis já diz o que é melhor: a direção sai de cena
    expect(
      within(blocoCriterios()).queryByRole("radiogroup", { name: "Direção do critério" }),
    ).not.toBeInTheDocument();
    expect(within(blocoCriterios()).getByLabelText("Nível 1")).toBeInTheDocument();
    expect(within(blocoCriterios()).getByLabelText("Nível 2")).toBeInTheDocument();
  });

  it("cadastra os níveis declarados e os mostra no resumo", async () => {
    render(<Tela />);
    let bloco = blocoCriterios();

    await userEvent.type(within(bloco).getByLabelText("Nome do critério"), "Conforto");
    await userEvent.click(
      within(
        within(bloco).getByRole("radiogroup", { name: "Tipo de escala do critério" }),
      ).getByRole("radio", { name: "Discreta" }),
    );
    bloco = blocoCriterios();
    await userEvent.click(within(bloco).getByRole("button", { name: "nível" }));
    await userEvent.type(within(blocoCriterios()).getByLabelText("Nível 1"), "1");
    await userEvent.type(within(blocoCriterios()).getByLabelText("Nível 2"), "2");
    await userEvent.type(within(blocoCriterios()).getByLabelText("Nível 3"), "3");
    await userEvent.click(within(blocoCriterios()).getByRole("button", { name: "Adicionar" }));

    expect(
      within(blocoCriterios()).getByText("escala construída"),
    ).toBeInTheDocument();
    expect(within(blocoCriterios()).getByText("3 níveis")).toBeInTheDocument();
  });

  it("recusa escala discreta com níveis que não sobem", async () => {
    render(<Tela />);
    let bloco = blocoCriterios();

    await userEvent.type(within(bloco).getByLabelText("Nome do critério"), "Conforto");
    await userEvent.click(
      within(
        within(bloco).getByRole("radiogroup", { name: "Tipo de escala do critério" }),
      ).getByRole("radio", { name: "Discreta" }),
    );
    bloco = blocoCriterios();
    await userEvent.type(within(bloco).getByLabelText("Nível 1"), "3");
    await userEvent.type(within(blocoCriterios()).getByLabelText("Nível 2"), "1");
    await userEvent.click(within(blocoCriterios()).getByRole("button", { name: "Adicionar" }));

    expect(ultimoAviso()).toMatch(/do pior para o melhor/);
    expect(
      within(blocoCriterios()).getByText("Faltam 2 critérios"),
    ).toBeInTheDocument();
  });

  it("marcar 'só inteiros' aparece no resumo do critério", async () => {
    render(<Tela />);
    const bloco = blocoCriterios();

    await userEvent.type(within(bloco).getByLabelText("Nome do critério"), "Prazo");
    await userEvent.click(within(bloco).getByLabelText("Só valores inteiros"));
    await userEvent.click(within(bloco).getByRole("button", { name: "Adicionar" }));

    expect(within(blocoCriterios()).getByText("maior é melhor")).toBeInTheDocument();
    expect(within(blocoCriterios()).getByText("só inteiros")).toBeInTheDocument();
  });

  it("editar carrega o critério no formulário e substitui em vez de duplicar", async () => {
    render(<Tela />);
    await adicionarCriterio("Custo");

    await userEvent.click(screen.getByRole("button", { name: "Editar Custo" }));
    const campo = within(blocoCriterios()).getByLabelText("Nome do critério");
    expect(campo).toHaveValue("Custo");

    await userEvent.clear(campo);
    await userEvent.type(campo, "Custo unitário");
    await userEvent.click(
      within(blocoCriterios()).getByRole("button", { name: "Salvar alterações" }),
    );

    expect(within(blocoCriterios()).getByText("Custo unitário")).toBeInTheDocument();
    expect(within(blocoCriterios()).getByText(/1 critério/)).toBeInTheDocument();
  });

  it("exclui o critério escolhido", async () => {
    render(<Tela />);
    await adicionarCriterio("Custo");
    await adicionarCriterio("Prazo");

    await userEvent.click(screen.getByRole("button", { name: "Excluir Custo" }));

    expect(within(blocoCriterios()).queryByText("Custo")).not.toBeInTheDocument();
    expect(within(blocoCriterios()).getByText("Prazo")).toBeInTheDocument();
  });
});

describe("reordenar", () => {
  const criterio = (nome: string) => ({
    ...criterioVazio(),
    nome,
    direcao: "min" as const,
  });
  const comDados: Rascunho = {
    ...RASCUNHO_VAZIO,
    colunas: [criterio("Custo"), criterio("Prazo")],
    linhas: [
      { nome: "Fornecedor A", valores: ["10", "20"], custo: "" },
      { nome: "Fornecedor B", valores: ["30", "40"], custo: "" },
    ],
  };

  it("mover uma alternativa move a linha inteira de desempenhos", async () => {
    const espiar = vi.fn();
    render(<Tela inicial={comDados} espiar={espiar} />);

    await userEvent.click(screen.getByLabelText("Mover Fornecedor B para cima"));

    const novo: Rascunho = espiar.mock.calls[0][0];
    expect(novo.linhas.map((l) => l.nome)).toEqual(["Fornecedor B", "Fornecedor A"]);
    // os desempenhos acompanham a alternativa, não a posição
    expect(novo.linhas.map((l) => l.valores)).toEqual([
      ["30", "40"],
      ["10", "20"],
    ]);
  });

  it("mover um critério move a coluna correspondente em toda a matriz", async () => {
    const espiar = vi.fn();
    render(<Tela inicial={comDados} espiar={espiar} />);

    await userEvent.click(screen.getByLabelText("Mover Prazo para cima"));

    const novo: Rascunho = espiar.mock.calls[0][0];
    expect(novo.colunas.map((c) => c.nome)).toEqual(["Prazo", "Custo"]);
    expect(novo.linhas.map((l) => l.valores)).toEqual([
      ["20", "10"],
      ["40", "30"],
    ]);
  });
});

describe("a tela inteira", () => {
  it("o formulário não tem saída própria: a volta é uma só, acima do passo", () => {
    /* Havia três caminhos para o mesmo destino -- um link acima do nome do
       problema, um botão "trocar objetivo" ao lado do selo e outro no rodapé.
       Três caminhos para o mesmo lugar não dão três vezes mais controle: dão a
       dúvida de se fazem coisas diferentes. A saída agora mora no fluxo, acima
       do título do passo, e este formulário não repete nenhuma. */
    render(<Tela />);
    expect(
      screen.queryByRole("button", { name: /Voltar ao objetivo/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /trocar objetivo/ }),
    ).not.toBeInTheDocument();
  });

  it("mostra o objetivo escolhido, como informação", () => {
    render(<Tela inicial={{ ...RASCUNHO_VAZIO, problematica: "sorting" }} />);
    expect(screen.getByText("Classificação")).toBeInTheDocument();
  });

  it("a ação principal diz o passo que vem depois, e o entrega", async () => {
    const onSalvar = vi.fn();
    render(<Tela onSalvar={onSalvar} />);

    // nada e gravado aqui: o botao dizia "Salvar problema" e so avancava
    expect(
      screen.queryByRole("button", { name: /Salvar problema/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Continuar para os desempenhos" }),
    );
    expect(onSalvar).toHaveBeenCalled();
  });

  it("o erro leva o foco ao campo a que se refere", async () => {
    render(<Tela campoComErro="nova-alternativa" />);

    /* O texto do erro virou aviso flutuante e saiu daqui; o que este
       componente ainda faz é a outra metade do recado, que é dizer *onde*.
       O toast diz o quê, o foco diz onde -- e sem o foco a mensagem obrigaria
       a pessoa a procurar sozinha, num formulário que pode ter oito critérios
       cadastrados. */
    expect(
      within(blocoAlternativas()).getByLabelText("Nome da nova alternativa"),
    ).toHaveFocus();
  });
});

describe("desfazer uma exclusão", () => {
  /* O aviso vive segundos, e o clique em "desfazer" chega depois de outras
     gravações. Ele tem de restaurar sobre o rascunho de então: partir do
     rascunho do momento da exclusão apagaria o que foi feito no meio. */
  it("devolve a alternativa sem apagar a que entrou depois", async () => {
    render(<Tela />);
    await adicionarAlternativa("Fornecedor A");
    await adicionarAlternativa("Fornecedor B");

    await userEvent.click(screen.getByRole("button", { name: "Excluir Fornecedor A" }));
    await adicionarAlternativa("Fornecedor C");
    act(() => desfazeres[desfazeres.length - 1]());

    const nomes = within(blocoAlternativas())
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(nomes[0]).toContain("Fornecedor A");
    expect(nomes.join(" ")).toContain("Fornecedor B");
    expect(nomes.join(" ")).toContain("Fornecedor C");
  });

  it("devolve o critério sem apagar o que entrou depois", async () => {
    render(<Tela />);
    await adicionarCriterio("Custo");
    await adicionarCriterio("Prazo");

    await userEvent.click(screen.getByRole("button", { name: "Excluir Custo" }));
    await adicionarCriterio("Qualidade");
    act(() => desfazeres[desfazeres.length - 1]());

    const bloco = blocoCriterios();
    for (const nome of ["Custo", "Prazo", "Qualidade"]) {
      expect(within(bloco).getByText(nome)).toBeInTheDocument();
    }
    expect(within(bloco).getByText(/3 critérios/)).toBeInTheDocument();
  });
});

describe("o formulário do critério em edição", () => {
  const comDois: Rascunho = {
    ...RASCUNHO_VAZIO,
    colunas: [
      { ...criterioVazio(), nome: "Custo" },
      { ...criterioVazio(), nome: "Prazo" },
    ],
  };

  it("reordenar a lista não perde o que está sendo digitado", async () => {
    render(<Tela inicial={comDois} />);
    await userEvent.click(screen.getByRole("button", { name: "Editar Custo" }));
    const campo = within(blocoCriterios()).getByLabelText("Nome do critério");
    await userEvent.type(campo, " unitário");

    await userEvent.click(screen.getByLabelText("Mover Prazo para cima"));

    expect(within(blocoCriterios()).getByLabelText("Nome do critério")).toHaveValue(
      "Custo unitário",
    );
    await userEvent.click(
      within(blocoCriterios()).getByRole("button", { name: "Salvar alterações" }),
    );
    // salvou no critério que estava em edição, na posição nova dele
    const nomes = within(blocoCriterios())
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(nomes[0]).toContain("Prazo");
    expect(nomes[1]).toContain("Custo unitário");
  });

  it("excluir o critério em edição devolve o formulário em branco", async () => {
    render(<Tela inicial={comDois} />);
    await userEvent.click(screen.getByRole("button", { name: "Editar Custo" }));

    await userEvent.click(screen.getByRole("button", { name: "Excluir Custo" }));

    const bloco = blocoCriterios();
    expect(within(bloco).getByLabelText("Nome do critério")).toHaveValue("");
    expect(within(bloco).getByRole("button", { name: "Adicionar" })).toBeInTheDocument();
  });
});
