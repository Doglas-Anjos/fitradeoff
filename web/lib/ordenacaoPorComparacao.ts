/**
 * Ordenação dos critérios por comparação par a par.
 *
 * O decisor não ordena a lista inteira de uma vez: responde comparações entre
 * dois critérios, e a ordem sai daí. Isso é mais fácil de responder — comparar
 * dois é sempre mais fácil que ordenar sete.
 *
 * O procedimento é o do FITradeoff oficial, medido em 30/09/2026 (ver
 * `paridade/EQUIVALENCIA.md`). Cada critério novo é comparado primeiro com o do
 * meio da lista já ordenada (posição ⌊(n−1)/2⌋). Se fica abaixo dele, desce um
 * a um até achar o lugar; se fica acima, sobe um a um. Não é a inserção
 * binária, que pediria uma pergunta a menos com sete critérios (14 contra 15):
 * aqui o que se persegue é fazer as mesmas perguntas que o sistema de
 * referência, na mesma ordem, e não a menor quantidade possível.
 *
 * O estado é puro e serializável: a tela só guarda o histórico de respostas, e
 * o próximo passo é sempre derivado dele. Voltar atrás é cortar o histórico.
 */

export type RespostaComparacao = "A" | "B" | "indiferente";

export interface Comparacao {
  a: string;
  b: string;
}

/** Em que fase está a inserção do critério pendente. */
export type Sentido = "meio" | "desce" | "sobe";

export interface EstadoOrdenacao {
  /** Critérios já posicionados, do maior peso para o menor. */
  ordenados: string[];
  /** Ainda sem posição, na ordem em que serão inseridos. */
  pendentes: string[];
  /** Posição, em `ordenados`, do critério com que o pendente é comparado. */
  indice: number;
  /** Primeira comparação (o meio) ou a varredura depois dela. */
  sentido: Sentido;
  /** Pares que o decisor declarou equivalentes. */
  empates: [string, string][];
}

/** O meio, como o oficial o toma: ⌊(n−1)/2⌋, e não ⌊n/2⌋. */
function meio(tamanho: number): number {
  return Math.floor((tamanho - 1) / 2);
}

export function iniciar(criterios: string[]): EstadoOrdenacao {
  if (criterios.length === 0) {
    return { ordenados: [], pendentes: [], indice: 0, sentido: "meio", empates: [] };
  }
  // o primeiro não precisa de comparação: sozinho, já está ordenado
  return {
    ordenados: [criterios[0]],
    pendentes: criterios.slice(1),
    indice: 0,
    sentido: "meio",
    empates: [],
  };
}

export function terminou(estado: EstadoOrdenacao): boolean {
  return estado.pendentes.length === 0;
}

/** A comparação a fazer agora, ou `null` se a ordem já está completa. */
export function proxima(estado: EstadoOrdenacao): Comparacao | null {
  if (terminou(estado)) return null;
  return { a: estado.pendentes[0], b: estado.ordenados[estado.indice] };
}

export function responder(
  estado: EstadoOrdenacao,
  resposta: RespostaComparacao,
): EstadoOrdenacao {
  const comparacao = proxima(estado);
  if (!comparacao) return estado;

  const { indice, sentido } = estado;
  const novo = { ...estado, empates: [...estado.empates] };

  if (resposta === "indiferente") {
    // Empate não ordena nada: o critério entra logo abaixo do comparado, e o
    // par fica registrado para que a tela possa avisar que a posição relativa
    // entre os dois foi arbitrada, não declarada.
    novo.empates.push([comparacao.a, comparacao.b]);
    return posicionar(novo, indice + 1);
  }

  if (resposta === "A") {
    // o pendente pesa mais que o comparado: fica acima dele
    if (sentido === "desce") return posicionar(novo, indice); // veio de cima
    if (indice === 0) return posicionar(novo, 0);
    return { ...novo, indice: indice - 1, sentido: "sobe" };
  }

  // "B": o comparado pesa mais: o pendente fica abaixo dele
  if (sentido === "sobe") return posicionar(novo, indice + 1); // veio de baixo
  if (indice === estado.ordenados.length - 1) {
    return posicionar(novo, estado.ordenados.length);
  }
  return { ...novo, indice: indice + 1, sentido: "desce" };
}

function posicionar(estado: EstadoOrdenacao, posicao: number): EstadoOrdenacao {
  const criterio = estado.pendentes[0];
  const ordenados = [...estado.ordenados];
  ordenados.splice(posicao, 0, criterio);
  return {
    ordenados,
    pendentes: estado.pendentes.slice(1),
    indice: meio(ordenados.length),
    sentido: "meio",
    empates: estado.empates,
  };
}

/** Pior caso para inserir um critério numa lista de `tamanho`: o meio, e a
 *  metade de baixo inteira (que nunca é menor que a de cima). */
function piorInsercao(tamanho: number): number {
  return tamanho - meio(tamanho);
}

/**
 * Quantas comparações ainda faltam, no pior caso.
 *
 * Serve para a tela dizer quanto falta — responder perguntas sem saber quantas
 * restam é o que faz o processo parecer interminável.
 */
export function restantes(estado: EstadoOrdenacao): number {
  if (terminou(estado)) return 0;
  const tamanho = estado.ordenados.length;
  let total =
    estado.sentido === "meio"
      ? piorInsercao(tamanho)
      : estado.sentido === "desce"
        ? tamanho - estado.indice
        : estado.indice + 1;
  for (let i = 1; i < estado.pendentes.length; i++) {
    total += piorInsercao(tamanho + i);
  }
  return total;
}

/** Reconstrói o estado a partir do histórico — é assim que se volta atrás. */
export function reconstruir(
  criterios: string[],
  respostas: RespostaComparacao[],
): EstadoOrdenacao {
  let estado = iniciar(criterios);
  for (const resposta of respostas) {
    if (terminou(estado)) break;
    estado = responder(estado, resposta);
  }
  return estado;
}
