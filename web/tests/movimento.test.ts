/* Toda animação precisa ter um desligamento.
 *
 * `prefers-reduced-motion` não é preferência estética: para quem tem distúrbio
 * vestibular, movimento não pedido causa náusea e vertigem. O bloco que desliga
 * as animações é uma lista de classes escrita à mão, e acrescentar uma animação
 * sem lembrar dela é o esquecimento mais fácil deste arquivo CSS -- não quebra
 * nada, não aparece em nenhuma tela, e só é sentido por quem depende dele.
 *
 * Este teste lê o CSS e cobra a correspondência. É o único jeito: jsdom não
 * avalia media queries, então nenhum teste de componente pegaria isto.
 *
 * A leitura é por varredura de chaves, e não por regex de bloco. A primeira
 * versão deste arquivo usava regex, passava sempre, e não pegou o defeito que
 * foi plantado para conferi-la: há mais de um `@media (prefers-reduced-motion)`
 * no CSS, o `indexOf` achava o primeiro, e a fatia até o fim do arquivo
 * engolia a definição de todas as classes -- inclusive as que faltavam na
 * lista. Um teste de correspondência que não delimita os dois lados não
 * compara nada.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const CSS = readFileSync(join(__dirname, "..", "app", "globals.css"), "utf8");

/** O corpo de cada bloco cujo cabeçalho casa com `marca`, delimitado de verdade. */
function blocos(css: string, marca: RegExp): string[] {
  const achados: string[] = [];
  for (let i = 0; i < css.length; i++) {
    if (css[i] !== "{") continue;
    const cabecalho = css.slice(css.lastIndexOf("}", i) + 1, i);
    if (!marca.test(cabecalho)) continue;
    let profundidade = 1;
    let j = i + 1;
    for (; j < css.length && profundidade > 0; j++) {
      if (css[j] === "{") profundidade++;
      else if (css[j] === "}") profundidade--;
    }
    achados.push(css.slice(i + 1, j - 1));
    i = j - 1;
  }
  return achados;
}

/** Classes que declaram movimento, fora de qualquer media query. */
function classesQueAnimam(css: string): string[] {
  let fora = css;
  for (const corpo of blocos(css, /@media/)) fora = fora.replace(corpo, "");

  const achadas = new Set<string>();
  for (const [, seletor, corpo] of fora.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/\banimation\s*:/.test(corpo) || /animation\s*:\s*none/.test(corpo)) continue;
    /* Um seletor pode listar várias classes separadas por vírgula, e todas
       recebem a animação. Capturar só a primeira deixaria as demais passar sem
       desligamento -- foi o que o teste das vírgulas pegou. */
    for (const [, nome] of seletor.matchAll(/\.([a-z-]+)/g)) achadas.add(nome);
  }
  return [...achadas].sort();
}

/** Classes citadas em algum bloco de `prefers-reduced-motion`. */
function classesDesligadas(css: string): Set<string> {
  const corpos = blocos(css, /prefers-reduced-motion/);
  expect(corpos.length, "nenhum bloco de prefers-reduced-motion").toBeGreaterThan(0);
  const nomes = new Set<string>();
  for (const corpo of corpos) {
    for (const [, nome] of corpo.matchAll(/\.([a-z-]+)/g)) nomes.add(nome);
  }
  return nomes;
}

describe("prefers-reduced-motion", () => {
  it("cobre toda classe que anima", () => {
    const desligadas = classesDesligadas(CSS);
    /* O esqueleto de carregamento fica: é o único movimento que comunica
       "ainda carregando", e desligá-lo deixaria a tela parecendo travada. */
    const isentas = new Set(["esqueleto"]);

    const esquecidas = classesQueAnimam(CSS).filter(
      (c) => !desligadas.has(c) && !isentas.has(c),
    );
    expect(esquecidas, "classes que animam sem desligamento").toEqual([]);
  });

  it("os dois lados da comparação não estão vazios", () => {
    /* Sem isto, um seletor quebrado deixaria o teste acima verde para sempre --
       foi exatamente o que aconteceu com a primeira versão dele. */
    const animam = classesQueAnimam(CSS);
    expect(animam).toContain("traca");
    expect(animam).toContain("surge-vencedora");
    expect(animam).toContain("entra-da-esquerda");
    expect(animam).toContain("surge-faixa");
    expect(animam).toContain("cai-na-faixa");

    const desligadas = classesDesligadas(CSS);
    expect(desligadas.size).toBeGreaterThanOrEqual(animam.length);
  });

  /* As duas leituras, contra CSS controlado. O CSS real não exercita todos os
     casos, e a primeira versão deste arquivo passava justamente porque as
     leituras estavam quebradas de formas que o arquivo real não revelava. */
  it("ignora o que anima só dentro de uma media query", () => {
    /* As classes dentro do bloco de reduced-motion também dizem `animation:`.
       Se entrassem na lista de "animam", a comparação se satisfaria sozinha:
       toda classe desligada estaria, por construção, desligada. */
    const css = `
      .real { animation: x 1s; }
      @media (prefers-reduced-motion: reduce) {
        .real { animation: none; }
        .so-dentro { animation: y 1ms both; }
      }
    `;
    expect(classesQueAnimam(css)).toEqual(["real"]);
    expect([...classesDesligadas(css)].sort()).toEqual(["real", "so-dentro"]);
  });

  it("pega todas as classes de um seletor com vírgulas", () => {
    const css = ".uma, .outra, .terceira { animation: x 1s; }";
    expect(classesQueAnimam(css)).toEqual(["outra", "terceira", "uma"]);
  });

  it("delimita o bloco pela chave de fecho, e não pelo fim do arquivo", () => {
    /* O defeito da primeira versão: a fatia ia do primeiro `@media` até o fim
       do arquivo, então tudo que vinha depois contava como desligado -- e
       nenhuma omissão podia ser detectada. */
    const css = `
      @media (prefers-reduced-motion: reduce) { .dentro { animation: none; } }
      .depois { animation: x 1s; }
    `;
    expect([...classesDesligadas(css)]).toEqual(["dentro"]);
    expect(classesQueAnimam(css)).toEqual(["depois"]);
  });
});
