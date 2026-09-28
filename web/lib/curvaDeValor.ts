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
 * (lido no gráfico final do oficial em quatro rodadas). No ponto 0,5 o oficial
 * às vezes descarta a terceira resposta e fica com o último ponto testado, e
 * quando isso acontece segue uma regra só, medida em 38 rodadas: compara o ponto
 * testado com a **metade da largura da escala**, sem somar o pior. Acima dela,
 * a resposta que subiria o limite de baixo da faixa é que se perde; abaixo, a
 * que desceria o limite de cima. Tem cara de defeito -- o "meio da escala"
 * calculado sem a origem --, e é por isso que a primeira leitura parecia "vale
 * só perto do zero": numa escala de 0 a 100 a metade da largura é o meio de
 * verdade; numa de 100 a 200, fica abaixo da escala inteira. As duas leituras
 * anteriores desta regra ("terceira igual à primeira" e "perto do zero")
 * descreviam casos particulares dela, e cada uma caiu com uma escala nova.
 *
 * **Escala discreta.** O oficial só aceita escala construída como Likert (2 a 7
 * níveis; 1 a n, ou 0 e 1), e a curva dela fixa valor em **nível**, nunca entre
 * dois. A pergunta é a mesma; muda o resto. O ponto testado é o nível do meio da
 * faixa, arredondado para cima (de 1 a 4, testa 3; de 2 a 5, testa 4). A busca
 * para quando não sobra nível dentro da faixa, e fica com o último testado -- sem
 * a largura de 1/8 e sem a exceção do ponto 0,5. Um ponto de quarto é pulado quando
 * não há nível dentro do intervalo dele. Medido em 28/09/2026 com 3, 4 e 5
 * níveis, as únicas escalas em que ele oferece a curva (ver NIVEIS_COM_CURVA).
 * Aqui a conta corre na posição do nível, o que numa Likert é a mesma coisa e
 * vale também para níveis que não sejam 1..n.
 *
 * **Na tela.** O oficial arredonda o que mostra: inteiro quando o valor e a
 * largura da escala passam de 10 (37,5 aparece como 38), duas casas nos outros
 * casos (9,375 como 9,38; 11,5 numa escala de largura 6 como 11,50).
 */

export type Resposta = "inferior" | "superior" | "indiferente";

/** A escala, em consequências: a regra do ponto 0,5 depende dela. */
export interface Escala {
  pior: number;
  melhor: number;
}

/**
 * Se, no ponto 0,5, esta última resposta é a que o oficial descarta (ver o
 * cabeçalho): acima da metade da largura da escala, a que sobe o limite de
 * baixo; abaixo, a que desce o de cima. Em cima da metade exata, nenhuma -- o
 * oficial não foi medido ali.
 */
export function respostaDescartada(t: number, resposta: Resposta, escala: Escala): boolean {
  const { pior, melhor } = escala;
  const x = pior + t * (melhor - pior);
  const metade = Math.abs(melhor - pior) / 2;
  // "superior" sobe `lo` em s; em consequência, sobe o limite de baixo só se a
  // escala cresce do pior para o melhor
  const sobeOLimiteDeBaixo = (resposta === "superior") === melhor > pior;
  if (x > metade) return sobeOLimiteDeBaixo;
  if (x < metade) return !sobeOLimiteDeBaixo;
  return false;
}

/** Quantos níveis uma escala discreta pode ter para a curva ser elicitada. O
 *  oficial oferece a curva com 3, 4 e 5 níveis; com 2 não há nível no meio, e com
 *  6 ou 7 o critério nem aparece na avaliação intra-critério -- fica linear.
 *  Medido em 28/09/2026. */
export const NIVEIS_COM_CURVA = { min: 3, max: 5 };

/** Se a curva deste critério pode ser elicitada. */
export function curvaElicitavel(
  escala: "continua" | "construida",
  niveis?: number[] | null,
): boolean {
  if (escala !== "construida") return true;
  const n = niveis?.length ?? 0;
  return n >= NIVEIS_COM_CURVA.min && n <= NIVEIS_COM_CURVA.max;
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
  /** Sem ela, o ponto 0,5 fica sempre no meio da faixa final. */
  escala?: Escala;
  /** Os níveis de uma escala discreta, em `s` e em ordem: com eles vale a
   *  regra discreta (ver o cabeçalho). */
  niveis?: number[];
}

const perto = (x: number, y: number) => Math.abs(x - y) < 1e-9;

/** `s` de cada ponto já fixado, pelo valor. */
function emS(pontosS: [s: number, valor: number][], valor: number): number | undefined {
  return pontosS.find(([, v]) => perto(v, valor))?.[0];
}

/** Os níveis estritamente dentro de (a, b). */
const nivelDentro = (niveis: number[], a: number, b: number) =>
  niveis.filter((n) => n > a + 1e-9 && n < b - 1e-9);

/** O próximo ponto a buscar, ou `null` quando os pontos necessários já estão.
 *  Com `niveis`, um intervalo só é buscado se houver nível dentro dele. */
export function proximoPasso(
  pontosS: [s: number, valor: number][],
  niveis?: number[],
): Passo | null {
  const cabe = (a: number, b: number) =>
    niveis ? nivelDentro(niveis, a, b).length > 0 : b - a >= LIMIAR_DO_QUARTO - 1e-9;
  const meio = emS(pontosS, 0.5);
  if (meio === undefined) return !niveis || cabe(0, 1) ? { alvo: 0.5, a: 0, b: 1 } : null;
  if (emS(pontosS, 0.25) === undefined && cabe(0, meio)) {
    return { alvo: 0.25, a: 0, b: meio };
  }
  if (emS(pontosS, 0.75) === undefined && cabe(meio, 1)) {
    return { alvo: 0.75, a: meio, b: 1 };
  }
  return null;
}

export function iniciar(passo: Passo, escala?: Escala, niveis?: number[]): Busca {
  return { ...passo, lo: passo.a, hi: passo.b, ciclos: 0, escala, niveis };
}

/** A posição do nível mais perto de `s`. Mais perto, e não igual: uma curva
 *  salva antes desta regra pode ter ponto fora de nível, e ela ainda abre. */
function posicao(niveis: number[], s: number): number {
  let melhor = 0;
  niveis.forEach((n, i) => {
    if (Math.abs(n - s) < Math.abs(niveis[melhor] - s)) melhor = i;
  });
  return melhor;
}

/** O ponto testado agora: o meio da faixa, ou, numa escala discreta, o nível do
 *  meio arredondado para cima. */
export function testado(busca: Busca): number {
  if (!busca.niveis) return (busca.lo + busca.hi) / 2;
  const [a, b] = [posicao(busca.niveis, busca.lo), posicao(busca.niveis, busca.hi)];
  return busca.niveis[Math.floor((a + b) / 2 + 0.5)];
}

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

  if (busca.niveis) {
    // sem nível dentro da faixa, fica o último testado
    return nivelDentro(busca.niveis, lo, hi).length === 0
      ? { fixa: t }
      : { segue: { ...busca, lo, hi, ciclos } };
  }

  if (hi - lo <= LARGURA_FINAL + 1e-9) {
    const descarta =
      busca.escala !== undefined &&
      perto(busca.alvo, 0.5) &&
      respostaDescartada(t, resposta, busca.escala);
    return { fixa: descarta ? t : (lo + hi) / 2 };
  }
  return { segue: { ...busca, lo, hi, ciclos } };
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
