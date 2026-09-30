/**
 * O caminho de um cadastro: que passos ele tem e como o último se chama.
 *
 * Funções puras, fora dos componentes, porque a sequência (para derivar o
 * passo), a trilha (para desenhá-lo) e o primeiro passo (para contar quantos
 * faltam) precisam da mesma resposta.
 */

import type { Passo as PassoTrilha } from "@/components/Etapas";
import { ehCarteira, exigeAjustes, type Modo } from "@/lib/rascunho";
import type { Problematica } from "@/lib/types";

/** A tradução, para o que precisa dela fora do corpo de um componente. */
export type Traduz = (
  chave: string,
  valores?: Record<string, string | number>,
) => string;

/** O botao da matriz diz o que vem depois dela, que depende do objetivo. */
export function acaoDaMatriz(problematica: Problematica, t: Traduz): string {
  if (problematica === "sorting") return t("entrada.acao.continuarFaixas");
  if (ehCarteira(problematica)) return t("entrada.acao.continuarOrcamento");
  return t("entrada.acao.criar");
}

const CHAVE_AJUSTES: Partial<Record<Problematica, string>> = {
  sorting: "entrada.trilha.faixas",
  portfolio: "entrada.trilha.orcamento",
};

/** Os passos daquele caminho, que dependem da forma de entrada e do objetivo. */
export function trilhaDe(
  modo: Modo,
  problematica: Problematica,
  t: Traduz,
): PassoTrilha[] {
  const inicio: PassoTrilha[] = [
    { id: "problematica", rotulo: t("entrada.trilha.objetivo") },
  ];
  const ajustes: PassoTrilha[] = exigeAjustes(problematica)
    ? [
        {
          id: "ajustes",
          rotulo: t(CHAVE_AJUSTES[problematica] ?? "entrada.trilha.ajustes"),
        },
      ]
    : [];

  if (modo === "manual") {
    return [
      ...inicio,
      { id: "estrutura", rotulo: t("entrada.trilha.estrutura") },
      { id: "matriz", rotulo: t("entrada.trilha.desempenhos") },
      ...ajustes,
    ];
  }
  if (modo === "planilha") {
    return [
      ...inicio,
      { id: "fonte", rotulo: t("entrada.trilha.planilha") },
      ...ajustes,
    ];
  }
  return inicio;
}
