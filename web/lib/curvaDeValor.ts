/**
 * A regra da elicitação da curva de valor, igual à do sistema de referência.
 *
 * Tudo aqui foi medido no FITradeoff oficial (27/09/2026), respondendo as oito
 * sequências possíveis de três respostas num critério de maximizar e duas num
 * de minimizar, e repetindo duas delas para descartar acaso. A regra está
 * separada da tela para que cada decisão tenha um teste, e para que ninguém a
 * "conserte" sem ver que ela é, de propósito, a do original.
 *
 * Tudo corre num parâmetro `s` de 0 (pior desempenho) a 1 (melhor). É como o
 * oficial conta também: num critério de minimizar ele pergunta "Decrease from
 * 100 to 55 or from 55 to 10?", sempre do pior para o melhor.
 *
 * **Os pontos.** No máximo três, nesta ordem: o de valor 0,5, depois o de 0,25
 * (buscado entre o pior e o 0,5), depois o de 0,75 (entre o 0,5 e o melhor). Aí
 * o oficial encerra com "The required points were elicited". Um ponto de
 * quarto é pulado quando o intervalo dele tem menos de um quarto da faixa --
 * medido dos dois lados: com o 0,5 a 12,5% ou 18,75% do pior, o 0,25 foi
 * pulado; a 12,5% ou 18,75% do melhor, o 0,75; com 25% ou mais, perguntados.
 *
 * Armadilha para quem for medir de novo: ao encerrar, o oficial esconde as
 * opções mas deixa na tela o texto de uma pergunta que não chega a fazer. Só
 * vale como pergunta o passo sem a mensagem de conclusão.
 *
 * **A pergunta.** Dentro do intervalo externo `[a, b]` do ponto buscado, o ponto
 * testado `t` é o meio da faixa onde ele ainda pode estar, e a pergunta é qual
 * trecho traz mais aumento de valor: de `a` a `t` (o intervalo inferior) ou de
 * `t` a `b` (o superior). Inferior quer dizer que o valor sobe depressa no
 * começo, logo o ponto procurado está antes de `t`; superior, depois.
 * Indiferente fixa `t` na hora.
 *
 * **O fim.** Não há contagem fixa de ciclos: a busca para quando a faixa onde o
 * ponto pode estar chega a 1/8 da escala. Para o ponto 0,5, que parte da escala
 * inteira, isso dá três ciclos; para um quarto com intervalo de metade da escala,
 * dois; com 62,5% dela, três. (A primeira versão desta regra dizia "três ciclos
 * por ponto" -- era coincidência do ponto 0,5, e duas rodadas com os quartos a
 * derrubaram.)
 *
 * **O valor fixado.** O meio da faixa final -- nos pontos de quarto, sempre
 * (lido no gráfico final do oficial em quatro rodadas). No ponto 0,5 há uma
 * exceção: se a terceira resposta repete a primeira, fica o último ponto
 * testado. Mas só em escalas que começam perto do zero -- quando a ponta mais
 * próxima de zero fica a menos de um terço da largura da escala. Medido em
 * catorze escalas: 0-100, 0-1, 0-0,25, 10-100, 20-100, 90->0 e 100->10 mantêm o
 * último testado; 30-100, 50-100, 100-200, 0,70-0,95, 0,70-1,70 e 16->10 ficam
 * com o meio. O corte do oficial está entre 25% (20-100) e 43% (30-100); um
 * terço fica dentro, e o número exato dele não sabemos. Parece uma tolerância
 * relativa no código dele; o comportamento é o que se reproduz aqui.
 *
 * **Na tela.** O oficial arredonda o que mostra: inteiro quando o valor e a
 * largura da escala passam de 10 (37,5 aparece como 38), duas casas nos outros
 * casos (9,375 como 9,38; 11,5 numa escala de largura 6 como 11,50).
 */

export type Resposta = "inferior" | "superior" | "indiferente";

/** Abaixo disto (distância da escala ao zero, em larguras dela), vale a exceção
 *  do ponto 0,5. Medido: entre 0,25 e 0,43. */
export const LIMIAR_PERTO_DO_ZERO = 1 / 3;

/** Se a exceção do ponto 0,5 vale nesta escala. */
export function excecaoDoMeioVale(pior: number, melhor: number): boolean {
  if (pior * melhor <= 0) return true; // toca ou atravessa o zero
  const largura = Math.abs(melhor - pior);
  if (largura === 0) return false;
  return Math.min(Math.abs(pior), Math.abs(melhor)) / largura < LIMIAR_PERTO_DO_ZERO;
}

/** A busca para quando a faixa onde o ponto pode estar chega a isto (em `s`). */
export const LARGURA_FINAL = 1 / 8;

/** Um ponto de quarto cujo intervalo é mais estreito que isto (em fração da
 *  faixa) é pulado. O oficial pulou com 0,1875 e perguntou com 0,25; nenhuma
 *  sequência de respostas leva a um intervalo entre os dois, então qualquer
 *  limiar nesse trecho reproduz exatamente o que ele faz. */
export const LIMIAR_DO_QUARTO = 0.25;

/** O que buscar agora: o valor-alvo e o intervalo externo, em `s`. */
export interface Passo {
  alvo: number;
  a: number;
  b: number;
}

/** A busca em andamento de um ponto. */
export interface Busca extends Passo {
  /** Onde o ponto ainda pode estar. */
  lo: number;
  hi: number;
  ciclos: number;
  primeira?: Resposta;
  /** Se a exceção do ponto 0,5 vale nesta escala (ver `excecaoDoMeioVale`). */
  excecaoDoMeio: boolean;
}

const perto = (x: number, y: number) => Math.abs(x - y) < 1e-9;

/** `s` de cada ponto já fixado, pelo valor. */
function emS(pontosS: [s: number, valor: number][], valor: number): number | undefined {
  return pontosS.find(([, v]) => perto(v, valor))?.[0];
}

/** O próximo ponto a buscar, ou `null` quando os pontos necessários já estão. */
export function proximoPasso(pontosS: [s: number, valor: number][]): Passo | null {
  const meio = emS(pontosS, 0.5);
  if (meio === undefined) return { alvo: 0.5, a: 0, b: 1 };
  if (emS(pontosS, 0.25) === undefined && meio >= LIMIAR_DO_QUARTO - 1e-9) {
    return { alvo: 0.25, a: 0, b: meio };
  }
  if (emS(pontosS, 0.75) === undefined && 1 - meio >= LIMIAR_DO_QUARTO - 1e-9) {
    return { alvo: 0.75, a: meio, b: 1 };
  }
  return null;
}

export function iniciar(passo: Passo, excecaoDoMeio = true): Busca {
  return { ...passo, lo: passo.a, hi: passo.b, ciclos: 0, excecaoDoMeio };
}

/** O ponto testado agora. */
export const testado = (busca: Busca) => (busca.lo + busca.hi) / 2;

/** Aplica uma resposta: ou a busca segue, ou o ponto fica fixado em `s`. */
export function responder(
  busca: Busca,
  resposta: Resposta,
): { segue: Busca } | { fixa: number } {
  const t = testado(busca);
  if (resposta === "indiferente") return { fixa: t };

  const lo = resposta === "superior" ? t : busca.lo;
  const hi = resposta === "inferior" ? t : busca.hi;
  const ciclos = busca.ciclos + 1;
  const primeira = busca.primeira ?? resposta;

  if (hi - lo <= LARGURA_FINAL + 1e-9) {
    const excecaoDoMeio =
      busca.excecaoDoMeio && perto(busca.alvo, 0.5) && resposta === primeira;
    return { fixa: excecaoDoMeio ? t : (lo + hi) / 2 };
  }
  return { segue: { ...busca, lo, hi, ciclos, primeira } };
}

/**
 * O número como o oficial o mostra. Inteiro só quando o valor e a largura da
 * escala passam de 10; senão, duas casas. Medido: numa escala de 0 a 100, 12,5
 * aparece como 13 e 9,375 como 9,38; numa de 16 a 10 (largura 6), 11,5 aparece
 * como 11,50. O corte da largura está entre 6 e 50 -- 10 fica dentro.
 */
export function arredondarComoOficial(v: number, faixa: number): number {
  return Math.abs(v) >= 10 && Math.abs(faixa) >= 10
    ? Math.round(v)
    : Math.round(v * 100) / 100;
}
