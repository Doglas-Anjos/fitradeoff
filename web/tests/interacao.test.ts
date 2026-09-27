/**
 * Todo controle reage ao ponteiro — e a cor dele mora em CSS, não em `style`.
 *
 * Este é o defeito que mais se repetiu neste projeto: estilo inline vence
 * regra de classe, então definir `background` num `style={{...}}` anula
 * silenciosamente qualquer `:hover`. Não dá erro, não aparece em teste de
 * componente, e o controle simplesmente não responde ao mouse. Uma varredura
 * do navegador achou 60 controles assim de uma vez.
 *
 * O que se verifica aqui é o lado CSS: cada família de controle que ganhou
 * classe própria precisa ter regra de hover, e a base `.tatil` precisa ter a
 * dela. O outro lado — que nenhum componente voltou a pintar por inline — só se
 * verifica renderizando, e está em `web/scripts/verificar_hover.py`, que mede o
 * fundo calculado antes e depois de passar o mouse.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/* Sem os comentários. A leitura de seletor pega tudo o que vem antes da chave,
   e os comentários deste arquivo são longos: sem tirá-los, o "seletor" de cada
   regra começa com a explicação dela e nenhuma comparação por prefixo funciona.
   Foi o que fez a primeira versão deste teste falhar. */
const CSS = readFileSync(join(__dirname, "..", "app", "globals.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

/** Os seletores do arquivo, com o corpo de cada um. */
function regras(css: string): { seletor: string; corpo: string }[] {
  const achadas: { seletor: string; corpo: string }[] = [];
  for (const [, seletor, corpo] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    achadas.push({ seletor: seletor.trim(), corpo });
  }
  return achadas;
}

/** A classe tem alguma regra de `:hover` que mexa em fundo, cor ou borda? */
function reageAoPonteiro(classe: string): boolean {
  return regras(CSS).some(
    ({ seletor, corpo }) =>
      seletor.includes(`.${classe}`) &&
      seletor.includes(":hover") &&
      /(background|color|border-color|box-shadow)\s*:/.test(corpo),
  );
}

describe("controles reagem ao ponteiro", () => {
  /* Cada uma destas nasceu de um controle que não respondia. Tirar o hover de
     qualquer uma volta a produzir o defeito exato que a varredura encontrou. */
  const FAMILIAS = [
    "tatil",
    "botao",
    "botao-tema",
    "item-tema",
    "link-nav",
    "opcao-segmentada",
    "cartao-exemplo",
    "passo-etapa",
    "passo-trilha",
    "cartao-modulo",
  ];

  it.each(FAMILIAS)("%s tem regra de hover", (classe) => {
    expect(reageAoPonteiro(classe)).toBe(true);
  });

  it("a leitura acha hover de verdade, e não qualquer coisa", () => {
    /* Sem isto, um erro na expressão deixaria todos os testes acima verdes para
       sempre — foi o que já aconteceu com a verificação de `prefers-reduced-
       motion` deste mesmo arquivo CSS. */
    expect(reageAoPonteiro("classe-que-nao-existe-em-lugar-nenhum")).toBe(false);
  });

  it("o estado escolhido vence o hover, onde há estado escolhido", () => {
    /* Depois do clique o que importa é a confirmação. Se o hover ganhasse, o
       ponteiro parado sobre a opção já escolhida apagaria o sinal de que ela
       está escolhida. A regra do escolhido precisa citar `:hover` também, senão
       ela empata em especificidade e perde por vir antes. */
    for (const alvo of [
      '.opcao-segmentada[data-ativa="true"]:hover',
      '.passo-etapa[data-etapa="atual"]:hover',
      '.botao-tema[data-ativo="true"]:hover',
      '.link-nav[data-ativo="true"]:hover',
    ]) {
      expect(CSS, `faltou ${alvo}`).toContain(alvo);
    }
  });
});

describe("a base tátil", () => {
  it("usa currentColor, para servir a fundo claro e escuro", () => {
    /* Estes controles vivem em fundos opostos: sobre a barra navy o texto é
       claro, sobre painel branco é escuro. Um token fixo acertaria um caso e
       sumiria no outro. */
    const base = regras(CSS).find(
      ({ seletor }) => seletor.startsWith(".tatil:hover"),
    );
    expect(base).toBeDefined();
    expect(base!.corpo).toContain("currentColor");
  });

  it("não vale para controle desabilitado", () => {
    const base = regras(CSS).find(
      ({ seletor }) => seletor.startsWith(".tatil:hover"),
    );
    expect(base!.seletor).toContain(":not(:disabled)");
    expect(base!.seletor).toContain('[aria-disabled="true"]');
  });
});
