/**
 * O que mais se pode afirmar sobre um resultado sem perguntar nada ao motor.
 *
 * A tela de resultado mostrava a recomendacao e duas faixas. Tudo o que esta
 * aqui sai desses mesmos numeros -- nao ha calculo novo, so leitura -- mas era
 * leitura que sobrava para o decisor fazer de cabeca.
 *
 * Regra que governa este arquivo: **nenhuma afirmacao que os dados nao
 * sustentem**. Duas armadilhas em particular:
 *
 * 1. As faixas de valor sao calculadas alternativa a alternativa, cada uma no
 *    seu proprio vertice do politopo de pesos. Faixas que se sobrepoem NAO
 *    significam ordem incerta -- os maximos acontecem em pesos diferentes. Por
 *    isso so se afirma a direcao segura: se o minimo do vencedor supera o
 *    maximo de todos os outros, ele vence em todo peso admissivel. O contrario
 *    nao se afirma.
 * 2. "Pesa pouco" so e dito contra uma referencia objetiva: 1/n, a fatia de
 *    peso igual. Um criterio cujo teto fica abaixo disso pesa menos que a media
 *    em qualquer cenario compativel, e isso e verificavel.
 */

import type { Estado, Problema } from "./types";

export interface Insight {
  /** Chave do catalogo; os valores entram por interpolacao. */
  chave: string;
  valores: Record<string, string | number>;
  tom: "forte" | "neutro" | "ressalva";
}

const tres = (v: number) => v.toFixed(3);

/** Lista com virgulas, sem depender de Intl para casar com o resto da tela. */
const lista = (itens: string[]) => itens.join(", ");

export function insightsDoResultado(problema: Problema, estado: Estado): Insight[] {
  const analise = estado.analise;
  if (!analise || !estado.consistente) return [];

  const achados: Insight[] = [];
  const alternativas = Object.keys(problema.valores ?? problema.consequencias);
  const recomendada = analise.recomendacao ?? undefined;
  const faixasValor = estado.faixas_de_valor;
  const faixasPeso = estado.faixas_de_peso;

  // --- 1. a recomendacao vence em qualquer peso admissivel? -------------------
  if (recomendada && faixasValor?.[recomendada] && alternativas.length > 1) {
    const [piorDoVencedor] = faixasValor[recomendada];
    const tetosRivais = alternativas
      .filter((a) => a !== recomendada && faixasValor[a])
      .map((a) => faixasValor[a][1]);

    if (tetosRivais.length && piorDoVencedor > Math.max(...tetosRivais)) {
      achados.push({
        chave: "resultado.insight.margem",
        valores: {
          vencedor: recomendada,
          pior: tres(piorDoVencedor),
          teto: tres(Math.max(...tetosRivais)),
        },
        tom: "forte",
      });
    }
  }

  // --- 2. o resultado esta fechado, o numero nao ------------------------------
  if (recomendada && faixasValor?.[recomendada]) {
    const [lo, hi] = faixasValor[recomendada];
    if (hi - lo > 0.05) {
      achados.push({
        chave: "resultado.insight.faixaAberta",
        valores: { vencedor: recomendada, de: tres(lo), ate: tres(hi) },
        tom: "neutro",
      });
    }
  }

  // --- 3. qual criterio decide, e qual nao muda nada --------------------------
  if (faixasPeso) {
    const pesos = Object.entries(faixasPeso);
    const n = pesos.length;

    if (n > 1) {
      const porPiso = [...pesos].sort((a, b) => b[1][0] - a[1][0]);
      const [nome, [piso, teto]] = porPiso[0];
      // so afirma se houver um primeiro colocado claro e um piso que diga algo
      if (piso > 0.001 && piso > porPiso[1][1][0]) {
        achados.push({
          chave: "resultado.insight.decisivo",
          valores: { criterio: nome, piso: tres(piso), teto: tres(teto) },
          tom: "neutro",
        });
      }

      const fatiaIgual = 1 / n;
      const irrelevantes = pesos
        .filter(([, [, t]]) => t < fatiaIgual)
        .sort((a, b) => a[1][1] - b[1][1])
        .map(([chave]) => chave);
      if (irrelevantes.length) {
        achados.push({
          chave:
            irrelevantes.length === 1
              ? "resultado.insight.poucoPeso.um"
              : "resultado.insight.poucoPeso.varios",
          valores: { criterios: lista(irrelevantes), fatia: tres(fatiaIgual) },
          tom: "neutro",
        });
      }
    }
  }

  // --- 4. o que a recomendacao ganha, e o que ela custa -----------------------
  if (recomendada && problema.valores?.[recomendada] && alternativas.length > 1) {
    const melhorEm: string[] = [];
    const piorEm: string[] = [];

    for (const criterio of problema.criterios) {
      const meus = problema.valores[recomendada]?.[criterio.chave];
      if (meus === undefined) continue;
      const outros = alternativas
        .filter((a) => a !== recomendada)
        .map((a) => problema.valores[a]?.[criterio.chave])
        .filter((v): v is number => v !== undefined);
      if (!outros.length) continue;
      // estrito dos dois lados: empate nao e vantagem nem sacrificio
      if (meus > Math.max(...outros)) melhorEm.push(criterio.nome);
      if (meus < Math.min(...outros)) piorEm.push(criterio.nome);
    }

    if (melhorEm.length && piorEm.length) {
      achados.push({
        chave: "resultado.insight.trocaFeita",
        valores: {
          vencedor: recomendada,
          ganha: lista(melhorEm),
          perde: lista(piorEm),
        },
        tom: "ressalva",
      });
    } else if (melhorEm.length) {
      achados.push({
        chave: "resultado.insight.ganha",
        valores: { vencedor: recomendada, ganha: lista(melhorEm) },
        tom: "neutro",
      });
    } else if (piorEm.length) {
      achados.push({
        chave: "resultado.insight.perde",
        valores: { vencedor: recomendada, perde: lista(piorEm) },
        tom: "ressalva",
      });
    }
  }

  // --- 5. o ponto do metodo: quanto se decidiu com quao pouco ----------------
  const sobraram = analise.potencialmente_otimas?.length;
  if (sobraram !== undefined && alternativas.length > sobraram) {
    /* `declaracoes` conta a ordenacao dos criterios como a primeira; o resto
       sao respostas de tradeoff, que e como o painel lateral ja conta. */
    const respostas = Math.max((estado.declaracoes ?? 1) - 1, 0);
    achados.push({
      chave:
        respostas === 0
          ? "resultado.insight.descarte.semPergunta"
          : respostas === 1
            ? "resultado.insight.descarte.uma"
            : "resultado.insight.descarte.varias",
      valores: {
        descartadas: alternativas.length - sobraram,
        total: alternativas.length,
        respostas,
      },
      tom: "neutro",
    });
  }

  return achados;
}
