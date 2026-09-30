"use client";

import { DicaPortfolio, DicaSorting } from "@/components/ConfiguracaoProblematica";
import { Dica } from "@/components/ui";
import type { Traduz } from "@/components/entrada/trilha";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/entrada";
import type { Passo, Rascunho } from "@/lib/rascunho";

/**
 * O titulo da tela e a pergunta do passo.
 *
 * Antes, "Nova decisao" e um paragrafo de tres linhas abriam os quatro passos,
 * identicos em todos -- o maior elemento da tela era o que menos informava, e
 * num celular ele empurrava a pergunta real para fora da primeira dobra.
 */
function cabecalhoDoPasso(
  passo: Passo,
  rascunho: Rascunho,
  t: Traduz,
): { titulo: string; descricao?: string; dica?: React.ReactNode } {
  switch (passo) {
    case "estrutura":
      return {
        titulo: t("entrada.estrutura.titulo"),
        descricao: t("entrada.estrutura.descricao"),
      };
    case "matriz":
      return {
        titulo: t("entrada.matriz.titulo"),
        dica: (
          <Dica titulo={t("entrada.matriz.dica.titulo")}>
            <p>{t("entrada.matriz.dica.reais")}</p>
            <p>{t("entrada.matriz.dica.normaliza")}</p>
          </Dica>
        ),
      };
    case "fonte":
      return rascunho.modo === "salvas"
        ? {
            titulo: t("entrada.salvas.titulo"),
            descricao: t("entrada.salvas.descricao"),
          }
        : {
            titulo: t("entrada.planilha.titulo"),
            descricao: t("entrada.planilha.descricao"),
          };
    case "ajustes":
      return rascunho.problematica === "sorting"
        ? {
            titulo: t("entrada.faixas.titulo"),
            descricao: t("entrada.ajustes.descricao"),
            dica: <DicaSorting />,
          }
        : {
            titulo: t("entrada.orcamento.titulo"),
            descricao: t("entrada.ajustes.descricao"),
            dica: <DicaPortfolio />,
          };
    default:
      return {
        titulo: t("entrada.objetivo.titulo"),
        descricao: t("entrada.objetivo.descricao"),
      };
  }
}

export function CabecalhoPasso({ passo, rascunho }: { passo: Passo; rascunho: Rascunho }) {
  const { t } = useIdioma();
  const { titulo, descricao, dica } = cabecalhoDoPasso(passo, rascunho, t);
  return (
    <header>
      <div className="flex items-start gap-2">
        <h1
          className="display min-w-0 text-[26px] font-semibold sm:text-[28px]"
          style={{ color: "var(--tinta)" }}
        >
          {titulo}
        </h1>
        {dica && <span className="mt-0.5 shrink-0">{dica}</span>}
      </div>
      {descricao && (
        <p className="prosa mt-2 text-[14px]" style={{ color: "var(--tinta-2)" }}>
          {descricao}
        </p>
      )}
    </header>
  );
}
