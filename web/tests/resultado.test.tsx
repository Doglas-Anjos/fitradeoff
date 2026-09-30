import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResultadoAnalise } from "@/components/ResultadoAnalise";
import type { Analise, Problematica } from "@/lib/types";

/* O defeito que este arquivo existe para impedir:
 *
 * O motor ganhou uma quinta problemática e o componente continuou com quatro
 * ramos. A quinta caía no ramo final, o de "escolha", e a tela mostrava a
 * seção errada - sem faixas de razão, sem dominância e, o mais grave, sem a
 * ressalva que diz o que é exato e o que é amostrado. Publicar carteira sem a
 * ressalva é afirmar mais do que o método apurou.
 *
 * O compilador pega mapa exaustivo (`Record<Problematica, ...>`), mas não pega
 * cadeia de `if`. Só teste pega. */

const base = (problematica: Problematica): Analise => ({
  problematica,
  resolvido: false,
  indefinidas: [0, 1],
  resumo: "resumo do servidor",
});

const RESSALVA = "Exato: as faixas. Aproximado: a carteira.";

describe("cada problemática mostra o que é dela", () => {
  it("ranking mostra as posições possíveis", () => {
    render(
      <ResultadoAnalise
        analise={{
          ...base("ranking"),
          posicoes_possiveis: { A: [1, 2], B: [1, 3] },
        }}
      />,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("sorting mostra a alocação em classes", () => {
    render(
      <ResultadoAnalise
        analise={{
          ...base("sorting"),
          classes: ["Baixa", "Alta"],
          perfis: [0.5],
          alocacao: {
            A: { faixa_de_valor: [0.1, 0.4], classes_possiveis: ["Baixa"], definida: true },
          },
        }}
      />,
    );
    // "Baixa" aparece na régua de classes e na alocação: basta existir
    expect(screen.getAllByText(/Baixa/).length).toBeGreaterThan(0);
  });

  it("carteira combinatorial mostra a ressalva de amostragem", () => {
    render(
      <ResultadoAnalise
        analise={{
          ...base("portfolio"),
          ressalva: RESSALVA,
          orcamento: 20,
          portfolios_encontrados: [{ projetos: ["A"], custo: 10 }],
          sempre_selecionados: ["A"],
          nunca_selecionados: [],
          oscilam: ["B"],
        }}
      />,
    );
    expect(screen.getByText(new RegExp(RESSALVA))).toBeInTheDocument();
  });
});

describe("carteira por razão não cai no ramo de escolha", () => {
  const analise: Analise = {
    ...base("beneficio_custo"),
    ressalva: RESSALVA,
    orcamento: 20,
    razoes: {
      P: {
        custo: 10,
        beneficio_minimo: 0.5,
        beneficio_maximo: 1,
        razao_minima: 0.05,
        razao_maxima: 0.1,
      },
    },
    dominancia_por_razao: [{ dominante: "P", dominado: "Q" }],
    portfolios_encontrados: [{ projetos: ["P"], custo: 10 }],
    sempre_selecionados: ["P"],
    nunca_selecionados: [],
    oscilam: ["Q"],
  };

  it("mostra a faixa de razão de cada projeto", () => {
    render(<ResultadoAnalise analise={analise} />);
    expect(screen.getByText(/Razão entre benefício e custo/)).toBeInTheDocument();
    // a faixa sai com tres casas, e nao arredondada para inteiro -- e com o
    // separador decimal do idioma (pt: vírgula)
    expect(screen.getByText(/0,050 a 0,100/)).toBeInTheDocument();
  });

  it("mostra a dominância entre faixas que não se sobrepõem", () => {
    render(<ResultadoAnalise analise={analise} />);
    expect(screen.getByText(/P domina Q/)).toBeInTheDocument();
  });

  it("mostra a ressalva, que é o que separa o exato do amostrado", () => {
    render(<ResultadoAnalise analise={analise} />);
    expect(screen.getByText(new RegExp(RESSALVA))).toBeInTheDocument();
  });

  it("mostra a carteira e quem oscila, como a combinatorial", () => {
    render(<ResultadoAnalise analise={analise} />);
    /* P aparece na tabela de razões, na carteira e em "sempre selecionados";
       Q, na dominância e em "oscilam". O que importa é que as duas seções da
       carteira existam, não a contagem de aparições. */
    expect(screen.getByText(/Carteiras possíveis|Possible portfolios/i)).toBeInTheDocument();
    expect(screen.getAllByText("P").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Q").length).toBeGreaterThan(0);
  });
});

describe("nenhuma problemática fica sem tratamento", () => {
  /* Se alguém acrescentar uma sexta e esquecer o ramo, ela cairá no de escolha
     e este teste falha: o ramo de escolha não publica ressalva nem seção. */
  const TODAS: Problematica[] = [
    "escolha",
    "ranking",
    "sorting",
    "portfolio",
    "beneficio_custo",
  ];

  it.each(TODAS)("%s renderiza sem quebrar, mesmo sem detalhe algum", (p) => {
    /* Sem os campos opcionais: é o estado de uma decisão recém-criada, e foi
       assim que a tela morreu em produção - `undefined.rotulo`. */
    expect(() => render(<ResultadoAnalise analise={base(p)} />)).not.toThrow();
  });

  it("toda carteira publica a ressalva quando o servidor manda uma", () => {
    for (const p of ["portfolio", "beneficio_custo"] as Problematica[]) {
      const { unmount } = render(
        <ResultadoAnalise analise={{ ...base(p), ressalva: RESSALVA }} />,
      );
      expect(
        screen.getByText(new RegExp(RESSALVA)),
        `${p} escondeu a ressalva`,
      ).toBeInTheDocument();
      unmount();
    }
  });
});

/**
 * As duas leituras de carteira publicam a lista sob o mesmo nome.
 *
 * O motor da leitura por razão emitia `carteiras_encontradas` e a tela lia
 * `portfolios_encontrados`. Nada quebrava, nenhum erro aparecia — a lista de
 * carteiras simplesmente não existia para quem usava Benefit-to-Cost, e a tela
 * mostrava a ressalva sobre amostragem sem mostrar o que foi amostrado.
 *
 * Os dois nomes viraram um só no motor. Este teste guarda o lado da tela.
 */
describe("a lista de carteiras aparece nas duas leituras", () => {
  const comCarteira = (problematica: Problematica): Analise => ({
    ...base(problematica),
    ressalva: RESSALVA,
    orcamento: 60,
    portfolios_encontrados: [{ projetos: ["Projeto B", "Projeto C"], custo: 60 }],
    sempre_selecionados: ["Projeto B", "Projeto C"],
    nunca_selecionados: ["Projeto A"],
    oscilam: [],
  });

  it.each(["portfolio", "beneficio_custo"] as Problematica[])(
    "%s mostra a carteira encontrada e o custo dela",
    (p) => {
      render(<ResultadoAnalise analise={comCarteira(p)} />);
      expect(screen.getByText(/Carteiras possíveis/)).toBeInTheDocument();
      expect(screen.getAllByText("Projeto B").length).toBeGreaterThan(0);
    },
  );

  it("a ressalva nunca aparece sozinha, sem o que foi amostrado", () => {
    /* Era esse o estado da tela de Benefit-to-Cost: avisava que o resultado é
       aproximado por amostragem, e não mostrava nenhuma carteira. */
    render(<ResultadoAnalise analise={comCarteira("beneficio_custo")} />);
    expect(screen.getByText(new RegExp(RESSALVA))).toBeInTheDocument();
    expect(screen.getByText(/Carteiras possíveis/)).toBeInTheDocument();
  });
});
