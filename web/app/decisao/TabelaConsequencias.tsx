"use client";

/* A matriz de consequências como consulta: alternativas nas linhas, critérios
   nas colunas, com unidade e direção embaixo do nome. Era escrita por extenso
   dentro da página, repetindo a tabela que Visualizacoes monta por dentro. */

import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/estrutura";
import type { Problema } from "@/lib/types";

export function TabelaConsequencias({ problema }: { problema: Problema }) {
  const { t } = useIdioma();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ color: "var(--tinta-fraca)" }}>
            {/* mesma coluna da matriz de consequências no cadastro:
                a frase já está no catálogo da estrutura */}
            <th className="py-1.5 text-left font-normal">
              {t("estrutura.matriz.coluna.alternativa")}
            </th>
            {problema.criterios.map((c) => (
              <th key={c.chave} className="py-1.5 text-right font-normal">
                {c.nome}
                <span className="block text-[10px]">
                  {c.unidade}
                  {c.unidade && " · "}
                  {c.direcao === "max" ? t("termo.maiorMelhor") : t("termo.menorMelhor")}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(problema.consequencias).map(([alt, linha]) => (
            <tr key={alt} className="border-t" style={{ borderColor: "var(--borda)" }}>
              <td className="py-1.5" style={{ color: "var(--tinta-2)" }}>
                {alt}
              </td>
              {problema.criterios.map((c) => (
                <td
                  key={c.chave}
                  className="num py-1.5 text-right"
                  style={{ color: "var(--tinta-2)" }}
                >
                  {linha[c.chave]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
