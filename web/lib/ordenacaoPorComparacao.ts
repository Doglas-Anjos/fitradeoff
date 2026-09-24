/**
 * Ordenação dos critérios por comparação par a par.
 *
 * O decisor não ordena a lista inteira de uma vez: responde comparações entre
 * dois critérios, e a ordem sai daí. Isso é mais fácil de responder — comparar
 * dois é sempre mais fácil que ordenar sete — mas só vale se o número de
 * perguntas for razoável.
 *
 * Daí a inserção com busca binária: cada critério novo entra na posição certa
 * com log₂(n) comparações, dando O(n log n) no total. Comparar todos contra
 * todos daria O(n²) — com sete critérios, 21 perguntas em vez de 13.
 *
 * O estado é puro e serializável: a tela só guarda o histórico de respostas, e
 * o próximo passo é sempre derivado dele. Voltar atrás é cortar o histórico.
 */

export type RespostaComparacao = "A" | "B" | "indiferente";

export interface Comparacao {
  a: string;
  b: string;
}

export interface EstadoOrdenacao {
  /** Critérios já posicionados, do maior peso para o menor. */
  ordenados: string[];
  /** Ainda sem posição, na ordem em que serão inseridos. */
  pendentes: string[];
  /** Faixa em que o próximo critério pode cair, na busca binária. */
  inicio: number;
  fim: number;
  /** Pares que o decisor declarou equivalentes. */
  empates: [string, string][];
}

export function iniciar(criterios: string[]): EstadoOrdenacao {
  if (criterios.length === 0) {
    return { ordenados: [], pendentes: [], inicio: 0, fim: 0, empates: [] };
  }
  // o primeiro não precisa de comparação: sozinho, já está ordenado
  return {
    ordenados: [criterios[0]],
    pendentes: criterios.slice(1),
    inicio: 0,
    fim: 1,
    empates: [],
  };
}

export function terminou(estado: EstadoOrdenacao): boolean {
  return estado.pendentes.length === 0;
}

/** A comparação a fazer agora, ou `null` se a ordem já está completa. */
export function proxima(estado: EstadoOrdenacao): Comparacao | null {
  if (terminou(estado)) return null;
  const meio = Math.floor((estado.inicio + estado.fim) / 2);
  return { a: estado.pendentes[0], b: estado.ordenados[meio] };
}

export function responder(
  estado: EstadoOrdenacao,
  resposta: RespostaComparacao,
): EstadoOrdenacao {
  const comparacao = proxima(estado);
  if (!comparacao) return estado;

  const meio = Math.floor((estado.inicio + estado.fim) / 2);
  const novo = { ...estado, empates: [...estado.empates] };

  if (resposta === "indiferente") {
    // Empate não ordena nada: o critério entra logo abaixo do comparado, e o
    // par fica registrado para que a tela possa avisar que a posição relativa
    // entre os dois foi arbitrada, não declarada.
    novo.empates.push([comparacao.a, comparacao.b]);
    return posicionar(novo, meio + 1);
  }

  // "A" = o pendente pesa mais: vai para a metade de cima
  const [inicio, fim] =
    resposta === "A" ? [estado.inicio, meio] : [meio + 1, estado.fim];

  if (inicio >= fim) return posicionar(novo, inicio);
  return { ...novo, inicio, fim };
}

function posicionar(estado: EstadoOrdenacao, indice: number): EstadoOrdenacao {
  const criterio = estado.pendentes[0];
  const ordenados = [...estado.ordenados];
  ordenados.splice(indice, 0, criterio);
  const pendentes = estado.pendentes.slice(1);
  return {
    ordenados,
    pendentes,
    inicio: 0,
    fim: ordenados.length,
    empates: estado.empates,
  };
}

/**
 * Quantas comparações ainda faltam, no pior caso.
 *
 * Serve para a tela dizer quanto falta — responder perguntas sem saber quantas
 * restam é o que faz o processo parecer interminável.
 */
export function restantes(estado: EstadoOrdenacao): number {
  let total = Math.ceil(Math.log2(Math.max(estado.fim - estado.inicio, 1)));
  let tamanho = estado.ordenados.length + 1;
  for (let i = 1; i < estado.pendentes.length; i++) {
    total += Math.ceil(Math.log2(tamanho + 1));
    tamanho += 1;
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
