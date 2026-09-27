"use client";

/**
 * Troca do idioma da interface.
 *
 * Fica na navegação, visível em toda tela: quem precisa trocar normalmente
 * precisa na primeira, e procurar isso dentro de um menu de configurações é o
 * tipo de caça que faz a pessoa desistir antes de achar.
 *
 * São poucos idiomas, então botões lado a lado bastam. Um `select` custa um
 * clique a mais e esconde as opções que não estão selecionadas.
 */

import { Translate } from "@phosphor-icons/react";

import { IDIOMAS, useIdioma } from "@/lib/i18n";
import "@/lib/i18n/nucleo";

export function SeletorIdioma() {
  const { idioma, definir, t } = useIdioma();

  return (
    <div className="flex items-center gap-1.5">
      <Translate
        size={14}
        aria-hidden
        style={{ color: "var(--tinta-fraca)" }}
        className="max-sm:hidden"
      />
      <div
        role="radiogroup"
        aria-label={t("nav.idioma")}
        className="flex overflow-hidden rounded-[var(--raio-controle)] border"
        style={{ borderColor: "var(--borda-forte)" }}
      >
        {IDIOMAS.map(({ chave, rotulo, bandeira }) => {
          const ativo = idioma === chave;
          return (
            <button
              key={chave}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => definir(chave)}
              title={rotulo}
              className="tatil px-2 py-1 text-[11px] font-medium"
              style={{
                /* Preenchimento cheio no escolhido: fundo levemente tingido
                   não chegava a 3:1 e o estado sumia. */
                background: ativo ? "var(--accent)" : "transparent",
                color: ativo ? "var(--accent-tinta)" : "var(--tinta-3)",
              }}
            >
              {bandeira}
              <span className="sr-only"> {rotulo}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
