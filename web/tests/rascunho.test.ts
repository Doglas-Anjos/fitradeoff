import { describe, expect, it } from "vitest";

import {
  RASCUNHO_VAZIO,
  adicionarAlternativa,
  adicionarCriterio,
  atualizarCriterio,
  chavesDe,
  criterioVazio,
  definirValor,
  ehFalha,
  normalizar,
  paraCriacao,
  removerAlternativa,
  removerCriterio,
  validarEstrutura,
  validarMatriz,
  type CriterioRascunho,
  type Rascunho,
} from "@/lib/rascunho";

const criterio = (parcial: Partial<CriterioRascunho> = {}): CriterioRascunho => ({
  ...criterioVazio(),
  nome: "Custo",
  ...parcial,
});

/** Dois critérios contínuos, duas alternativas, matriz preenchida. */
function completo(): Rascunho {
  let r: Rascunho = { ...RASCUNHO_VAZIO };
  r = adicionarCriterio(r, criterio({ nome: "Custo", direcao: "min", unidade: "R$" }));
  r = adicionarCriterio(r, criterio({ nome: "Prazo", direcao: "min", unidade: "dias" }));
  r = adicionarAlternativa(r, "Fornecedor A");
  r = adicionarAlternativa(r, "Fornecedor B");
  r = definirValor(r, 0, 0, "120");
  r = definirValor(r, 0, 1, "30");
  r = definirValor(r, 1, 0, "95");
  r = definirValor(r, 1, 1, "45");
  return r;
}

describe("estrutura e matriz andam juntas", () => {
  it("um critério novo abre uma célula vazia em cada alternativa", () => {
    const r = adicionarCriterio(completo(), criterio({ nome: "Qualidade" }));

    expect(r.colunas).toHaveLength(3);
    expect(r.linhas.map((l) => l.valores)).toEqual([
      ["120", "30", ""],
      ["95", "45", ""],
    ]);
  });

  it("excluir um critério leva junto a coluna dele, e não a do vizinho", () => {
    const r = removerCriterio(completo(), 0);

    expect(r.colunas.map((c) => c.nome)).toEqual(["Prazo"]);
    expect(r.linhas.map((l) => l.valores)).toEqual([["30"], ["45"]]);
  });

  it("excluir uma alternativa não mexe nas outras linhas", () => {
    const r = removerAlternativa(completo(), 0);

    expect(r.linhas.map((l) => l.nome)).toEqual(["Fornecedor B"]);
    expect(r.linhas[0].valores).toEqual(["95", "45"]);
  });

  it("renomear um critério preserva os desempenhos já digitados", () => {
    const r = atualizarCriterio(completo(), 0, criterio({ nome: "Custo unitário", direcao: "min" }));

    expect(r.linhas.map((l) => l.valores[0])).toEqual(["120", "95"]);
  });

  it("virar escala discreta limpa a coluna, porque os valores antigos deixaram de valer", () => {
    const r = atualizarCriterio(
      completo(),
      0,
      criterio({ nome: "Custo", escala: "discreta", niveis: ["1", "2", "3"] }),
    );

    // a coluna trocada esvazia; a outra fica intacta
    expect(r.linhas.map((l) => l.valores)).toEqual([
      ["", "30"],
      ["", "45"],
    ]);
  });
});

describe("chavesDe", () => {
  it("tira acento e espaço, que a chave do motor não aceita", () => {
    expect(chavesDe([{ nome: "Índice de qualidade" }])).toEqual(["indice_de_qualidade"]);
  });

  it("não deixa dois critérios caírem na mesma chave", () => {
    // "Custo" e "custo!" normalizam para o mesmo texto: um sobrescreveria o outro
    expect(chavesDe([{ nome: "Custo" }, { nome: "custo!" }])).toEqual(["custo", "custo_2"]);
  });

  it("dá uma chave a um critério sem nome utilizável", () => {
    expect(chavesDe([{ nome: "???" }])).toEqual(["criterio_1"]);
  });
});

describe("normalizar", () => {
  it("completa um rascunho gravado antes destes campos existirem", () => {
    const antigo = {
      nome: "Velho",
      colunas: [{ nome: "Custo", direcao: "min" }],
      linhas: [{ nome: "A", valores: ["1"] }],
    } as unknown as Partial<Rascunho>;

    const r = normalizar(antigo);

    expect(r.colunas[0].escala).toBe("continua");
    expect(r.colunas[0].inteiro).toBe(false);
    expect(r.linhas[0].custo).toBe("");
    expect(r.passo).toBe("problematica");
  });

  it("descarta o critério sem nome e realinha a matriz ao que sobrou", () => {
    const antigo = {
      colunas: [{ nome: "" }, { nome: "Prazo" }],
      linhas: [{ nome: "A", valores: ["lixo", "30"] }],
    } as unknown as Partial<Rascunho>;

    const r = normalizar(antigo);

    expect(r.colunas.map((c) => c.nome)).toEqual(["Prazo"]);
    expect(r.linhas[0].valores).toEqual(["30"]);
  });
});

/* A validacao e modulo puro: ela devolve a chave da recusa, e a frase nasce na
   tela. Por isso o teste cobra a chave, e nao o texto -- o texto passou a ser
   assunto do catalogo, e cobra-lo aqui amarraria a regra a um idioma. */
describe("validarEstrutura", () => {
  it("recusa uma alternativa só — não há o que comparar", () => {
    const r = adicionarAlternativa({ ...completo(), linhas: [] }, "Única");
    expect(validarEstrutura(r)?.chave).toBe("dominio.estrutura.minimoAlternativas");
  });

  it("recusa um critério só — sem tradeoff o método não tem o que perguntar", () => {
    expect(validarEstrutura(removerCriterio(completo(), 0))?.chave).toBe(
      "dominio.estrutura.minimoCriterios",
    );
  });

  it("recusa alternativas com o mesmo nome", () => {
    const r = adicionarAlternativa(completo(), "Fornecedor A");
    expect(validarEstrutura(r)?.chave).toBe("dominio.estrutura.alternativaRepetida");
  });

  it("recusa escala discreta com níveis fora de ordem", () => {
    const r = atualizarCriterio(
      completo(),
      0,
      criterio({ escala: "discreta", niveis: ["3", "1"] }),
    );
    /* O problema do criterio entra como valor da frase de fora, e e ele que diz
       qual regra recusou. */
    expect(validarEstrutura(r)?.chave).toBe("dominio.estrutura.criterioInvalido");
    expect(validarEstrutura(r)?.valores?.problema).toEqual({
      chave: "dominio.criterio.niveisCrescentes",
    });
  });

  it("aprova a estrutura completa", () => {
    expect(validarEstrutura(completo())).toBeNull();
  });
});

describe("validarMatriz", () => {
  it("aponta a célula vazia, e não só o fato de faltar algo", () => {
    const r = definirValor(completo(), 1, 0, "");
    expect(validarMatriz(r)?.campo).toBe("celula-1-0");
  });

  it("recusa em critério discreto o desempenho que não é um dos níveis", () => {
    let r = atualizarCriterio(
      completo(),
      0,
      criterio({ escala: "discreta", niveis: ["1", "2", "3"] }),
    );
    r = definirValor(r, 0, 0, "2,5");
    r = definirValor(r, 1, 0, "3");

    expect(validarMatriz(r)?.chave).toBe("dominio.matriz.nivelInvalido");
  });

  it("aceita o nível declarado escrito com vírgula", () => {
    let r = atualizarCriterio(
      completo(),
      0,
      criterio({ escala: "discreta", niveis: ["0,5", "1,5"] }),
    );
    r = definirValor(r, 0, 0, "0,5");
    r = definirValor(r, 1, 0, "1,5");

    expect(validarMatriz(r)).toBeNull();
  });

  it("recusa fração num critério marcado como só inteiros", () => {
    let r = atualizarCriterio(completo(), 1, criterio({ nome: "Prazo", inteiro: true }));
    r = definirValor(r, 0, 1, "30,5");

    expect(validarMatriz(r)?.chave).toBe("dominio.matriz.soInteiros");
  });
});

describe("paraCriacao", () => {
  it("monta o corpo da criação com chave, direção e unidade de cada critério", () => {
    const corpo = paraCriacao({ ...completo(), nome: "Compras" });
    if (ehFalha(corpo)) throw new Error(corpo.chave);

    expect(corpo.nome).toBe("Compras");
    expect(corpo.alternativas).toEqual(["Fornecedor A", "Fornecedor B"]);
    expect(corpo.criterios[0]).toEqual({
      chave: "custo",
      nome: "Custo",
      direcao: "min",
      unidade: "R$",
    });
    expect(corpo.consequencias).toEqual([
      [120, 30],
      [95, 45],
    ]);
  });

  it("manda os níveis do critério discreto, que é o que o motor entende", () => {
    let r = atualizarCriterio(
      completo(),
      0,
      criterio({ escala: "discreta", niveis: ["1", "2", "3"] }),
    );
    r = definirValor(r, 0, 0, "1");
    r = definirValor(r, 1, 0, "3");

    const corpo = paraCriacao(r);
    if (ehFalha(corpo)) throw new Error(corpo.chave);

    expect(corpo.criterios[0].niveis).toEqual([1, 2, 3]);
  });

  it("não inventa campo no contrato: 'só inteiros' fica no rascunho", () => {
    const r = atualizarCriterio(completo(), 1, criterio({ nome: "Prazo", inteiro: true }));
    const corpo = paraCriacao(r);
    if (ehFalha(corpo)) throw new Error(corpo.chave);

    expect(corpo.criterios[1]).not.toHaveProperty("inteiro");
    expect(corpo.criterios[1]).not.toHaveProperty("escala");
    // e o critério contínuo não leva níveis nenhum
    expect(corpo.criterios[1]).not.toHaveProperty("niveis");
  });

  it("no sorting, traduz as faixas em perfis e classes", () => {
    const corpo = paraCriacao({ ...completo(), problematica: "sorting" });
    if (ehFalha(corpo)) throw new Error(corpo.chave);

    expect(corpo.configuracao).toEqual({
      perfis: [0.35, 0.7],
      classes: ["Baixa", "Média", "Alta"],
    });
  });

  it("na carteira, cobra o orçamento antes de deixar criar", () => {
    const corpo = paraCriacao({ ...completo(), problematica: "portfolio" });
    expect(ehFalha(corpo) && corpo.chave).toBe("dominio.custo.obrigatorio");
  });

  it("na carteira, recusa orçamento menor que a alternativa mais barata", () => {
    const base = completo();
    const r: Rascunho = {
      ...base,
      problematica: "portfolio",
      orcamento: "5",
      linhas: base.linhas.map((l, i) => ({ ...l, custo: ["12", "16"][i] })),
    };

    expect(ehFalha(paraCriacao(r)) && (paraCriacao(r) as { chave: string }).chave).toBe(
      "dominio.portfolio.orcamentoCurto",
    );
  });
});

/* --- modelo de veto -------------------------------------------------------- */

describe("os limites de veto", () => {
  const comVeto = (parcial: Partial<CriterioRascunho>) => {
    const r = completo();
    return atualizarCriterio(r, 0, { ...r.colunas[0], ...parcial });
  };

  /* `validarEstrutura` embrulha a recusa do critério numa frase que diz de qual
     critério se trata; o motivo fica aninhado. */
  const motivo = (r: Rascunho) => {
    const erro = validarEstrutura(r);
    expect(erro?.chave).toBe("dominio.estrutura.criterioInvalido");
    return (erro?.valores?.problema as { chave: string } | undefined)?.chave;
  };

  it("sobem para a API só quando declarados", () => {
    const pedido = paraCriacao(completo(), "Sem nome");
    if (ehFalha(pedido)) throw new Error("o rascunho base devia ser válido");

    /* Mandar `null` faria a API gravar o campo, e a tela reabriria mostrando
       um veto que ninguém pediu. */
    expect(pedido.criterios[0]).not.toHaveProperty("veto_superior");
    expect(pedido.criterios[0]).not.toHaveProperty("veto_inferior");
  });

  it("vão na unidade do critério, como foram digitados", () => {
    const pedido = paraCriacao(
      comVeto({ vetoAceitavel: "100", vetoInaceitavel: "150" }),
      "Sem nome",
    );
    if (ehFalha(pedido)) throw new Error(`recusou: ${pedido.chave}`);

    expect(pedido.criterios[0]).toMatchObject({
      veto_superior: 100,
      veto_inferior: 150,
    });
  });

  it("aceitam um limite só, que é o corte seco", () => {
    const pedido = paraCriacao(comVeto({ vetoInaceitavel: "150" }), "Sem nome");
    if (ehFalha(pedido)) throw new Error(`recusou: ${pedido.chave}`);

    expect(pedido.criterios[0]).toMatchObject({ veto_inferior: 150 });
    expect(pedido.criterios[0]).not.toHaveProperty("veto_superior");
  });

  it("aceitam vírgula decimal, como todo número da tela", () => {
    const pedido = paraCriacao(comVeto({ vetoInaceitavel: "150,5" }), "Sem nome");
    if (ehFalha(pedido)) throw new Error(`recusou: ${pedido.chave}`);

    expect(pedido.criterios[0]).toMatchObject({ veto_inferior: 150.5 });
  });

  /* O caso que motiva validar na tela: invertido o motor não quebra -- ele
     reordena os limites e segue aplicando o oposto do que foi declarado. */
  it("recusam o par invertido, em vez de deixar o motor reordenar", () => {
    // 'Custo' é de minimizar: o aceitável tem de ser o menor dos dois
    expect(motivo(comVeto({ vetoAceitavel: "150", vetoInaceitavel: "100" }))).toBe(
      "dominio.criterio.vetoOrdemMin",
    );
  });

  it("recusam o par invertido também num critério de maximizar", () => {
    let r = completo();
    r = atualizarCriterio(r, 0, {
      ...r.colunas[0],
      direcao: "max",
      vetoAceitavel: "100",
      vetoInaceitavel: "150",
    });
    expect(motivo(r)).toBe("dominio.criterio.vetoOrdemMax");
  });

  it("recusam dois limites iguais e pedem que se declare um só", () => {
    expect(motivo(comVeto({ vetoAceitavel: "100", vetoInaceitavel: "100" }))).toBe(
      "dominio.criterio.vetoIgual",
    );
  });

  it("recusam texto que não é número", () => {
    expect(motivo(comVeto({ vetoInaceitavel: "caro demais" }))).toBe(
      "dominio.criterio.vetoNaoNumero",
    );
  });

  it("barram o avanço num objetivo que não usa veto, dizendo em qual critério", () => {
    const r = {
      ...comVeto({ vetoInaceitavel: "150" }),
      problematica: "sorting" as const,
    };
    const erro = validarEstrutura(r);

    expect(erro?.chave).toBe("dominio.estrutura.vetoNaoSeAplica");
    expect(erro?.valores?.criterios).toBe("Custo");
  });

  it("não atrapalham quem não declarou veto nenhum", () => {
    const r = { ...completo(), problematica: "sorting" as const };
    expect(validarEstrutura(r)).toBeNull();
  });

  /* Um rascunho gravado antes destes campos existirem não pode voltar
     quebrado: `normalizar` completa o que falta. */
  it("aparecem vazios num rascunho gravado antes deles", () => {
    const antigo = normalizar({
      colunas: [{ nome: "Custo", direcao: "min" }] as CriterioRascunho[],
    });
    expect(antigo.colunas[0].vetoAceitavel).toBe("");
    expect(antigo.colunas[0].vetoInaceitavel).toBe("");
  });
});

describe("veto numa escala construída", () => {
  const discreto = (parcial: Partial<CriterioRascunho>) => {
    const r = completo();
    return atualizarCriterio(r, 0, {
      ...r.colunas[0],
      escala: "discreta" as const,
      niveis: ["1", "2", "3"],
      ...parcial,
    });
  };
  const motivo = (r: Rascunho) =>
    (validarEstrutura(r)?.valores?.problema as { chave: string } | undefined)?.chave;

  /* A tela aceitava e o motor recusava: o limite fora dos níveis só rebentava
     ao montar a matriz de valor, num passo adiante e com outra linguagem. */
  it("recusa limite que não é um dos níveis", () => {
    expect(motivo(discreto({ vetoInaceitavel: "1,5" }))).toBe(
      "dominio.criterio.vetoForaDosNiveis",
    );
  });

  it("aceita limite que é um dos níveis", () => {
    expect(validarEstrutura(discreto({ vetoInaceitavel: "2" }))).toBeNull();
  });

  /* Aqui a direção não se aplica: a ordem dos níveis é que diz o que é melhor.
     Sem este ramo, um critério discreto com direção "min" teria a ordem
     conferida ao contrário. */
  it("confere a ordem pelos níveis, não pela direção", () => {
    expect(
      motivo(discreto({ direcao: "min", vetoAceitavel: "3", vetoInaceitavel: "1" })),
    ).toBeUndefined();
    expect(
      motivo(discreto({ direcao: "min", vetoAceitavel: "1", vetoInaceitavel: "3" })),
    ).toBe("dominio.criterio.vetoOrdemNiveis");
  });
});
