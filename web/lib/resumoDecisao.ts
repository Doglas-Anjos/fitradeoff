/**
 * O que duas telas dizem sobre a mesma decisão salva.
 *
 * `DecisoesSalvas` (tela de entrada) e `PainelSalvas` (gaveta ao lado do
 * trabalho) mostram a mesma lista com ênfases diferentes, e cada uma tinha a
 * sua cópia do mapa de rótulos e da função de resumo. Duas cópias que ninguém
 * lembrava de manter juntas: o resumo já divergia na pontuação, e o mapa, nos
 * rótulos. Com a tradução entrando, a terceira cópia seria o catálogo.
 *
 * Aqui ficam as duas peças, e só elas. O que cada tela faz com o resumo - onde
 * põe, que tamanho usa, se mostra o rótulo longo - continua na tela, porque é
 * aí que as duas realmente diferem.
 */

import { ListNumbers, Scales, SlidersHorizontal, Stack, Trophy } from "@phosphor-icons/react";

import "@/lib/i18n/paineis";
import type { Problematica, Resumo } from "@/lib/types";

/** O `t` de `useIdioma()`, sem obrigar quem importa a trazer o contexto. */
export type Traduz = (
  chave: string,
  valores?: Record<string, string | number>,
) => string;

/**
 * Como cada problemática se apresenta numa lista.
 *
 * Duas formas do mesmo nome: o curto vai no selo, que mora numa coluna estreita
 * ao lado do nome da decisão, onde "Classificar em faixas" empurraria tudo para
 * duas linhas; o longo vai na linha de resumo e no `title` do selo. As chaves
 * são as do núcleo - as problemáticas já estão nomeadas lá.
 */
export const PROBLEMATICA: Record<
  Problematica,
  { chaveCurta: string; chaveLonga: string; Icone: typeof Trophy }
> = {
  escolha: {
    chaveCurta: "problematica.curto.escolha",
    chaveLonga: "problematica.escolha",
    Icone: Trophy,
  },
  ranking: {
    chaveCurta: "problematica.curto.ranking",
    chaveLonga: "problematica.ranking",
    Icone: ListNumbers,
  },
  sorting: {
    chaveCurta: "problematica.curto.sorting",
    chaveLonga: "problematica.sorting",
    Icone: SlidersHorizontal,
  },
  portfolio: {
    chaveCurta: "problematica.curto.portfolio",
    chaveLonga: "problematica.portfolio",
    Icone: Stack,
  },
  beneficio_custo: {
    chaveCurta: "problematica.curto.beneficio_custo",
    chaveLonga: "problematica.beneficio_custo",
    Icone: Scales,
  },
};

/**
 * "3 alternativas · 2 critérios · 5 respostas".
 *
 * O plural sai de chaves separadas, não de um número colado num substantivo:
 * cada forma é uma frase inteira no catálogo e aqui só se escolhe qual. O
 * separador é pontuação, e pontuação não se traduz.
 */
export function resumir(r: Resumo, t: Traduz): string {
  const partes = [
    t(r.alternativas === 1 ? "resumo.alternativa.um" : "resumo.alternativa.varios", {
      n: r.alternativas,
    }),
    t(r.criterios === 1 ? "resumo.criterio.um" : "resumo.criterio.varios", {
      n: r.criterios,
    }),
  ];
  /* Decisão que ainda não foi respondida não ganha um "0 respostas": a ausência
     já diz isso, e a linha é curta. */
  if (r.declaracoes > 0) {
    partes.push(
      t(r.declaracoes === 1 ? "resumo.resposta.um" : "resumo.resposta.varios", {
        n: r.declaracoes,
      }),
    );
  }
  return partes.join(" · ");
}
