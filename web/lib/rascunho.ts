/**
 * O problema enquanto ainda esta sendo cadastrado.
 *
 * O sistema de referencia separa em telas o que aqui vinha junto: primeiro a
 * problematica e a forma de entrada, depois a estrutura (nome, alternativas,
 * criterios) e so entao os desempenhos. Esta camada guarda esse estado
 * intermediario -- o que ainda nao virou decisao -- e concentra as operacoes
 * que mexem nele.
 *
 * Tudo aqui e funcao pura sobre um objeto simples, por dois motivos: o rascunho
 * e serializado no navegador entre visitas, e as regras que importam (remover
 * um criterio tem de remover a coluna correspondente da matriz; trocar a escala
 * invalida os desempenhos daquela coluna) sao faceis de errar dentro de um
 * componente e faceis de testar fora dele.
 */

import type { Direcao, Problematica } from "./types";

/** Em que tela do cadastro a pessoa esta. */
export type Passo = "problematica" | "estrutura" | "matriz" | "ajustes" | "fonte";

/** Por onde os dados entram. */
export type Modo = "manual" | "planilha" | "salvas";

/** Contínua: qualquer número na faixa observada. Discreta: níveis declarados. */
export type TipoEscala = "continua" | "discreta";

export interface CriterioRascunho {
  nome: string;
  unidade: string;
  direcao: Direcao;
  escala: TipoEscala;
  /** Níveis da escala construída, do pior para o melhor, como digitados. */
  niveis: string[];
  /**
   * Só aceita valores inteiros. Não existe no contrato do motor — a escala
   * contínua lá é contínua mesmo. Fica no rascunho porque governa a validação
   * e a apresentação do campo, e seria perdido se não fosse guardado.
   */
  inteiro: boolean;
  /**
   * Limites do modelo de veto, como digitados, na unidade do critério.
   *
   * `vetoAceitavel` é o desempenho a partir do qual nada é penalizado;
   * `vetoInaceitavel` é aquele em que o critério deixa de contar. Entre os dois
   * a penalidade é proporcional — a região de hesitação. Declarando só um, o
   * corte é seco naquele ponto.
   *
   * Ficam como texto pelo mesmo motivo dos níveis: campo vazio e "0" são coisas
   * diferentes, e um `number | null` perderia o que a pessoa está digitando no
   * meio do caminho.
   */
  vetoAceitavel: string;
  vetoInaceitavel: string;
}

/**
 * As problemáticas em que o veto existe.
 *
 * De Almeida (2013) formula o veto para o modelo aditivo, e o FITradeoff o
 * oferece na escolha e na ordenação. Nas outras o motor recusa o registro, em
 * vez de calcular ignorando o veto: um número calculado sem a penalidade, lido
 * por quem declarou uma, é pior que número nenhum.
 */
export const PROBLEMATICAS_COM_VETO: Problematica[] = ["escolha", "ranking"];

export const aceitaVeto = (p: Problematica) => PROBLEMATICAS_COM_VETO.includes(p);

export interface AlternativaRascunho {
  nome: string;
  /** Um desempenho por critério, na ordem de `colunas`. Texto, como digitado. */
  valores: string[];
  /** Só usado na carteira; fica guardado para não sumir ao trocar de objetivo. */
  custo: string;
}

export interface ConfigSorting {
  /** Nomes das classes, da pior para a melhor. */
  classes: string[];
  /** Cortes em valor global (0 a 1), um a menos que as classes. */
  cortes: string[];
}

export interface Rascunho {
  passo: Passo;
  modo: Modo;
  problematica: Problematica;
  nome: string;
  colunas: CriterioRascunho[];
  linhas: AlternativaRascunho[];
  sorting: ConfigSorting;
  orcamento: string;
}

export const SORTING_PADRAO: ConfigSorting = {
  classes: ["Baixa", "Média", "Alta"],
  cortes: ["0,35", "0,70"],
};

export const criterioVazio = (): CriterioRascunho => ({
  nome: "",
  unidade: "",
  direcao: "max",
  escala: "continua",
  niveis: ["", ""],
  inteiro: false,
  vetoAceitavel: "",
  vetoInaceitavel: "",
});

export const alternativaVazia = (colunas: number): AlternativaRascunho => ({
  nome: "",
  valores: Array.from({ length: colunas }, () => ""),
  custo: "",
});

export const RASCUNHO_VAZIO: Rascunho = {
  passo: "problematica",
  modo: "manual",
  problematica: "escolha",
  nome: "",
  colunas: [],
  linhas: [],
  sorting: SORTING_PADRAO,
  orcamento: "",
};

export const numeroDe = (texto: string): number => Number(texto.replace(",", "."));

/* --- leitura do que estava guardado ------------------------------------------ */

/**
 * Completa um rascunho gravado antes destes campos existirem.
 *
 * Descartar o que a pessoa digitou porque o formato mudou seria a saída fácil.
 * Aqui o que falta é preenchido, o que não tem mais lugar é descartado, e a
 * matriz é realinhada à lista de critérios que sobrou — uma linha com mais ou
 * menos células que colunas quebraria a tela na renderização seguinte.
 */
export function normalizar(salvo: Partial<Rascunho> | null | undefined): Rascunho {
  const bruto = { ...RASCUNHO_VAZIO, ...(salvo ?? {}) };

  /* Critérios sem nome não existem no cadastro novo: o nome é o que a lista
     mostra. Os índices dos que ficam guiam o corte das células da matriz. */
  const colunasBrutas = Array.isArray(bruto.colunas) ? bruto.colunas : [];
  const mantidos: number[] = [];
  const colunas = colunasBrutas
    .map((c, i) => {
      const completo: CriterioRascunho = { ...criterioVazio(), ...c };
      if (!completo.nome?.trim()) return null;
      mantidos.push(i);
      return {
        ...completo,
        niveis: Array.isArray(completo.niveis) ? completo.niveis : ["", ""],
      };
    })
    .filter((c): c is CriterioRascunho => c !== null);

  const linhas = (Array.isArray(bruto.linhas) ? bruto.linhas : [])
    .filter((l) => l?.nome?.trim())
    .map((l) => {
      const valores = Array.isArray(l.valores) ? l.valores : [];
      return {
        nome: l.nome,
        custo: l.custo ?? "",
        valores: mantidos.map((i) => valores[i] ?? ""),
      };
    });

  return {
    ...bruto,
    colunas,
    linhas,
    sorting: bruto.sorting ?? SORTING_PADRAO,
  };
}

/* --- operacoes de lista ------------------------------------------------------- */

export function adicionarAlternativa(r: Rascunho, nome: string): Rascunho {
  return {
    ...r,
    linhas: [...r.linhas, { ...alternativaVazia(r.colunas.length), nome: nome.trim() }],
  };
}

export function renomearAlternativa(r: Rascunho, i: number, nome: string): Rascunho {
  return {
    ...r,
    linhas: r.linhas.map((l, j) => (j === i ? { ...l, nome: nome.trim() } : l)),
  };
}

export function removerAlternativa(r: Rascunho, i: number): Rascunho {
  return { ...r, linhas: r.linhas.filter((_, j) => j !== i) };
}

/** Acrescenta o critério e abre uma célula vazia para ele em cada alternativa. */
export function adicionarCriterio(r: Rascunho, criterio: CriterioRascunho): Rascunho {
  return {
    ...r,
    colunas: [...r.colunas, criterio],
    linhas: r.linhas.map((l) => ({ ...l, valores: [...l.valores, ""] })),
  };
}

/**
 * Substitui o critério de índice `i`.
 *
 * Trocar a escala ou mexer nos níveis muda o conjunto de desempenhos que o
 * critério aceita: o que estava preenchido deixa de valer, e guardá-lo só
 * adiaria a recusa para a criação. A coluna volta em branco nesse caso.
 */
export function atualizarCriterio(
  r: Rascunho,
  i: number,
  criterio: CriterioRascunho,
): Rascunho {
  const antigo = r.colunas[i];
  const mudouEscala =
    !antigo ||
    antigo.escala !== criterio.escala ||
    antigo.niveis.join("\u0000") !== criterio.niveis.join("\u0000");

  return {
    ...r,
    colunas: r.colunas.map((c, j) => (j === i ? criterio : c)),
    linhas: mudouEscala
      ? r.linhas.map((l) => ({
          ...l,
          valores: l.valores.map((v, j) => (j === i ? "" : v)),
        }))
      : r.linhas,
  };
}

/** Remove o critério e a coluna correspondente da matriz. */
export function removerCriterio(r: Rascunho, i: number): Rascunho {
  return {
    ...r,
    colunas: r.colunas.filter((_, j) => j !== i),
    linhas: r.linhas.map((l) => ({
      ...l,
      valores: l.valores.filter((_, j) => j !== i),
    })),
  };
}

export function definirValor(
  r: Rascunho,
  linha: number,
  coluna: number,
  valor: string,
): Rascunho {
  return {
    ...r,
    linhas: r.linhas.map((l, i) =>
      i === linha
        ? { ...l, valores: l.valores.map((v, j) => (j === coluna ? valor : v)) }
        : l,
    ),
  };
}

export function definirCusto(r: Rascunho, linha: number, custo: string): Rascunho {
  return {
    ...r,
    linhas: r.linhas.map((l, i) => (i === linha ? { ...l, custo } : l)),
  };
}

/* --- chaves ------------------------------------------------------------------- */

function base(nome: string, indice: number): string {
  const limpo = nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return limpo || `criterio_${indice + 1}`;
}

/**
 * Uma chave por critério, sem repetição.
 *
 * Dois critérios chamados "Custo" e "custo!" caem na mesma chave, e o motor
 * identifica critério por chave: um sobrescreveria o outro em silêncio.
 */
export function chavesDe(colunas: { nome: string }[]): string[] {
  const usadas = new Set<string>();
  return colunas.map((c, i) => {
    const candidata = base(c.nome, i);
    let chave = candidata;
    let n = 2;
    while (usadas.has(chave)) chave = `${candidata}_${n++}`;
    usadas.add(chave);
    return chave;
  });
}

/* --- validacao ---------------------------------------------------------------- */

/**
 * O que a validação devolve: a chave do catálogo e o que interpolar nela.
 *
 * Este módulo é puro - nada de React aqui, porque o rascunho é serializado no
 * navegador e as regras dele são testadas fora de qualquer tela. Sem React não
 * há hook, e sem hook não há como traduzir. Então a recusa vem descrita, não
 * escrita: quem renderiza a resolve com `traduzir`, de `lib/i18n/dominio`.
 *
 * Guardar a frase pronta aqui seria a saída fácil e deixaria a validação falando
 * português numa tela em inglês - justamente no momento em que a pessoa precisa
 * entender o que está errado.
 */
export interface Mensagem {
  chave: string;
  /** Um valor pode ser outra mensagem, para uma frase encaixar na outra. */
  valores?: Record<string, string | number | Mensagem>;
}

/** Recusa com o campo a que se refere, para a tela poder levar a pessoa até ele. */
export interface Falha extends Mensagem {
  campo?: string;
}

export function niveisDe(c: CriterioRascunho): number[] | null {
  if (c.escala !== "discreta") return null;
  return c.niveis.map(numeroDe);
}

/** Os limites de veto declarados, ou `null` se a pessoa não declarou nenhum. */
export function vetoDe(
  c: CriterioRascunho,
): { superior: number | null; inferior: number | null } | null {
  const ler = (texto: string) => (texto.trim() ? numeroDe(texto) : null);
  const superior = ler(c.vetoAceitavel);
  const inferior = ler(c.vetoInaceitavel);
  if (superior === null && inferior === null) return null;
  return { superior, inferior };
}

export const temVeto = (c: CriterioRascunho) => vetoDe(c) !== null;

/** O primeiro problema do veto do critério, ou `null`. */
function validarVeto(c: CriterioRascunho): Mensagem | null {
  const limites = vetoDe(c);
  if (!limites) return null;

  const { superior, inferior } = limites;
  if ([superior, inferior].some((v) => v !== null && !Number.isFinite(v))) {
    return { chave: "dominio.criterio.vetoNaoNumero" };
  }
  /* Numa escala construída o limite tem de ser um dos níveis declarados. Sem
     isto a tela aceita, o motor recusa, e a pessoa descobre no passo seguinte
     - com uma mensagem que fala de nível e não do campo que ela preencheu. */
  if (c.escala === "discreta") {
    const niveis = c.niveis.map(numeroDe);
    const forasteiro = [superior, inferior].some(
      (v) => v !== null && !niveis.some((n) => Math.abs(n - v) < 1e-9),
    );
    if (forasteiro) return { chave: "dominio.criterio.vetoForaDosNiveis" };
  }

  if (superior === null || inferior === null) return null;

  /* Iguais, não há região de hesitação nem corte definido: o que a pessoa quis
     dizer é um corte seco, e para isso basta um dos campos. */
  if (superior === inferior) return { chave: "dominio.criterio.vetoIgual" };

  /* Invertido o cálculo não quebra - o motor reordena e segue aplicando o
     oposto do que foi declarado. É por isso que a recusa tem de ser aqui.

     Numa escala construída a direção não se aplica: quem diz o que é melhor é
     a ordem dos níveis, sempre do pior para o melhor. */
  const maiorEhMelhor = c.escala === "discreta" || c.direcao === "max";
  if (maiorEhMelhor !== superior > inferior) {
    return {
      chave:
        c.escala === "discreta"
          ? "dominio.criterio.vetoOrdemNiveis"
          : maiorEhMelhor
            ? "dominio.criterio.vetoOrdemMax"
            : "dominio.criterio.vetoOrdemMin",
    };
  }
  return null;
}

/** O primeiro problema do critério, ou `null` se estiver aceitável. */
export function validarCriterio(c: CriterioRascunho): Mensagem | null {
  if (!c.nome.trim()) return { chave: "dominio.criterio.nomeObrigatorio" };

  const veto = validarVeto(c);
  if (veto) return veto;

  if (c.escala !== "discreta") return null;

  if (c.niveis.length < 2) {
    return { chave: "dominio.criterio.minimoNiveis" };
  }
  const valores = c.niveis.map(numeroDe);
  if (c.niveis.some((n) => !n.trim()) || valores.some((v) => !Number.isFinite(v))) {
    return { chave: "dominio.criterio.nivelNaoNumero" };
  }
  for (let i = 1; i < valores.length; i++) {
    if (valores[i] <= valores[i - 1]) {
      return { chave: "dominio.criterio.niveisCrescentes" };
    }
  }
  return null;
}

/** O que impede de sair da tela de estrutura, ou `null`. */
export function validarEstrutura(r: Rascunho): Falha | null {
  if (r.linhas.length < 2) {
    return {
      chave: "dominio.estrutura.minimoAlternativas",
      campo: "nova-alternativa",
    };
  }
  const repetida = r.linhas.find(
    (l, i) => r.linhas.findIndex((o) => o.nome.trim() === l.nome.trim()) !== i,
  );
  if (repetida) {
    return {
      chave: "dominio.estrutura.alternativaRepetida",
      valores: { nome: repetida.nome },
    };
  }
  if (r.colunas.length < 2) {
    return {
      chave: "dominio.estrutura.minimoCriterios",
      campo: "novo-criterio",
    };
  }
  /* O veto sobrevive a uma troca de objetivo, e é bom que sobreviva: quem
     experimenta objetivos não deve perder o que declarou. Mas seguir com ele
     para um objetivo que não o define seria pedir ao motor um cálculo que ele
     recusa - melhor dizer aqui, com o nome do critério, do que traduzir um 400
     depois. */
  const comVeto = r.colunas.filter(temVeto);
  if (comVeto.length && !aceitaVeto(r.problematica)) {
    return {
      chave: "dominio.estrutura.vetoNaoSeAplica",
      campo: "novo-criterio",
      valores: { criterios: comVeto.map((c) => c.nome.trim()).join(", ") },
    };
  }

  for (const c of r.colunas) {
    const erro = validarCriterio(c);
    /* O nome do critério vira valor da frase de fora; sem nome, entra a palavra
       genérica, que também é texto de catálogo e por isso vai como mensagem. */
    if (erro) {
      return {
        chave: "dominio.estrutura.criterioInvalido",
        valores: {
          nome: c.nome || { chave: "dominio.criterio.semNome" },
          problema: erro,
        },
      };
    }
  }
  return null;
}

/** O que impede de sair da tela de desempenhos, ou `null`. */
export function validarMatriz(r: Rascunho): Falha | null {
  for (const [i, linha] of r.linhas.entries()) {
    for (const [j, bruto] of linha.valores.entries()) {
      const criterio = r.colunas[j];
      const numero = numeroDe(bruto);
      if (bruto.trim() === "" || !Number.isFinite(numero)) {
        return {
          chave: "dominio.matriz.naoNumero",
          valores: { alternativa: linha.nome, criterio: criterio.nome },
          campo: `celula-${i}-${j}`,
        };
      }
      if (criterio.escala === "discreta") {
        const niveis = niveisDe(criterio) ?? [];
        if (!niveis.some((n) => Math.abs(n - numero) < 1e-9)) {
          return {
            chave: "dominio.matriz.nivelInvalido",
            valores: { alternativa: linha.nome, criterio: criterio.nome },
            campo: `celula-${i}-${j}`,
          };
        }
      } else if (criterio.inteiro && !Number.isInteger(numero)) {
        return {
          chave: "dominio.matriz.soInteiros",
          valores: { criterio: criterio.nome },
          campo: `celula-${i}-${j}`,
        };
      }
    }
  }
  return null;
}

/** O primeiro problema da configuração de sorting, ou `null`. */
export function validarSorting(cfg: ConfigSorting): Mensagem | null {
  if (cfg.classes.some((c) => !c.trim())) {
    return { chave: "dominio.sorting.faixaSemNome" };
  }
  const valores = cfg.cortes.map(numeroDe);
  if (valores.some((v) => !Number.isFinite(v))) {
    return { chave: "dominio.sorting.corteNaoNumero" };
  }
  if (valores.some((v) => v <= 0 || v >= 1)) {
    return { chave: "dominio.sorting.corteForaDaEscala" };
  }
  for (let i = 1; i < valores.length; i++) {
    if (valores[i] <= valores[i - 1]) {
      return { chave: "dominio.sorting.cortesCrescentes" };
    }
  }
  return null;
}

/**
 * As duas leituras de carteira.
 *
 * Existe porque a pergunta "isto e uma carteira?" era feita comparando com o
 * literal `"portfolio"` em sete lugares do front. Quando o motor ganhou a
 * carteira por razao, cada um desses lugares precisou ser encontrado a mao --
 * e um deles nao foi, o que derrubou a tela de decisao inteira. Com o predicado
 * aqui, a proxima variante mexe num sitio so.
 *
 * As duas pedem as mesmas coisas ao decisor: custo por alternativa e um teto de
 * orcamento. O que muda e o criterio de selecao, que e assunto do motor.
 */
export function ehCarteira(problematica: Problematica): boolean {
  return problematica === "portfolio" || problematica === "beneficio_custo";
}

/** Só sorting e carteira exigem algo além dos dados; as outras duas seguem direto. */
export function exigeAjustes(problematica: Problematica): boolean {
  return problematica === "sorting" || ehCarteira(problematica);
}

/**
 * A configuração que o objetivo escolhido exige, ou a falha que falta
 * resolver. `custos` só é lido na carteira, e vem das alternativas.
 */
export function configuracaoDe(
  r: Rascunho,
  custos: number[] | null,
): { configuracao?: Record<string, unknown>; custos?: number[] } | Falha {
  if (r.problematica === "sorting") {
    const erro = validarSorting(r.sorting);
    if (erro) return erro;
    return {
      configuracao: {
        perfis: r.sorting.cortes.map(numeroDe),
        classes: r.sorting.classes.map((c) => c.trim()),
      },
    };
  }

  if (ehCarteira(r.problematica)) {
    const orcamento = numeroDe(r.orcamento);
    if (!r.orcamento.trim() || !Number.isFinite(orcamento) || orcamento <= 0) {
      return { chave: "dominio.portfolio.semOrcamento", campo: "orcamento" };
    }
    if (custos && custos.length > 0 && Math.min(...custos) > orcamento) {
      return { chave: "dominio.portfolio.orcamentoCurto", campo: "orcamento" };
    }
    return { configuracao: { orcamento }, custos: custos ?? undefined };
  }

  return {};
}

/** Os custos digitados na matriz, ou a falha do primeiro que não serve. */
export function custosDe(r: Rascunho): number[] | Falha {
  const lidos: number[] = [];
  for (const [i, linha] of r.linhas.entries()) {
    const custo = numeroDe(linha.custo);
    /* Estritamente positivo, como o motor exige. Aceitar 0 aqui fazia a
       recusa voltar do servidor como erro solto, sem campo para destacar - a
       pessoa via a mensagem e nao sabia qual linha corrigir. */
    if (linha.custo.trim() === "" || !Number.isFinite(custo) || custo <= 0) {
      return {
        chave: "dominio.custo.obrigatorio",
        valores: {
          alternativa:
            linha.nome ||
            /* Sem nome, só a posição identifica a linha - e "alternativa" é
               palavra, não número, então também vem do catálogo. */
            { chave: "dominio.custo.alternativaSemNome", valores: { n: i + 1 } },
        },
        campo: `custo-${i}`,
      };
    }
    lidos.push(custo);
  }
  return lidos;
}

export function ehFalha(x: unknown): x is Falha {
  return typeof x === "object" && x !== null && "chave" in x;
}

/**
 * O corpo da criação, ou a primeira falha encontrada pelo caminho.
 *
 * `nomePadrao` é o nome da decisão sem nome. Ele não é uma chave porque não é
 * recusa nenhuma: vai gravado no motor e volta na lista de decisões salvas, e a
 * tela é quem sabe em que idioma a pessoa está lendo. O padrão em português
 * existe para quem chamar sem ele não mandar nome vazio.
 */
export function paraCriacao(
  r: Rascunho,
  nomePadrao = "Decisão sem nome",
):
  | {
      nome: string;
      alternativas: string[];
      criterios: {
        chave: string;
        nome: string;
        direcao: Direcao;
        unidade: string;
        niveis?: number[];
      }[];
      consequencias: number[][];
      problematica: Problematica;
      configuracao?: Record<string, unknown>;
      custos?: number[];
    }
  | Falha {
  const estrutura = validarEstrutura(r);
  if (estrutura) return estrutura;

  const matriz = validarMatriz(r);
  if (matriz) return matriz;

  let custos: number[] | null = null;
  if (ehCarteira(r.problematica)) {
    const lidos = custosDe(r);
    if (ehFalha(lidos)) return lidos;
    custos = lidos;
  }

  const extra = configuracaoDe(r, custos);
  if (ehFalha(extra)) return extra;

  const chaves = chavesDe(r.colunas);
  return {
    nome: r.nome.trim() || nomePadrao,
    alternativas: r.linhas.map((l) => l.nome.trim()),
    criterios: r.colunas.map((c, i) => {
      const niveis = niveisDe(c);
      const veto = vetoDe(c);
      return {
        chave: chaves[i],
        nome: c.nome.trim(),
        direcao: c.direcao,
        unidade: c.unidade.trim(),
        ...(niveis ? { niveis } : {}),
        /* Só o que foi declarado: mandar `null` faria a API gravar o campo e a
           tela reabrir mostrando um veto que ninguém pediu. */
        ...(veto?.superior !== null && veto?.superior !== undefined
          ? { veto_superior: veto.superior }
          : {}),
        ...(veto?.inferior !== null && veto?.inferior !== undefined
          ? { veto_inferior: veto.inferior }
          : {}),
      };
    }),
    consequencias: r.linhas.map((l) => l.valores.map(numeroDe)),
    problematica: r.problematica,
    ...extra,
  };
}
