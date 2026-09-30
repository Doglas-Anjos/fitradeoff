"use client";

import { Plus, Trash } from "@phosphor-icons/react";

import { Botao, Entrada } from "@/components/ui";
import { useIdioma } from "@/lib/i18n";
import { comNos } from "@/lib/i18n/estrutura";
import "@/lib/i18n/nucleo";

/** Os níveis de uma escala construída, do pior para o melhor. */
export function EditorNiveis({
  niveis,
  onChange,
}: {
  niveis: string[];
  onChange: (v: string[]) => void;
}) {
  const { t } = useIdioma();

  return (
    <div className="space-y-2">
      <p className="text-[12px]" style={{ color: "var(--tinta-3)" }}>
        {comNos(t("estrutura.niveis.ordem"), {
          termo: <strong>{t("estrutura.niveis.ordem.termo")}</strong>,
        })}
      </p>
      <ul className="space-y-1.5">
        {niveis.map((nivel, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              className="w-16 shrink-0 text-[11px]"
              style={{ color: "var(--tinta-fraca)" }}
            >
              {i === 0
                ? t("estrutura.niveis.pior")
                : i === niveis.length - 1
                  ? t("estrutura.niveis.melhor")
                  : t("estrutura.niveis.intermediario", { n: i + 1 })}
            </span>
            <Entrada
              value={nivel}
              onChange={(e) => onChange(niveis.map((n, j) => (j === i ? e.target.value : n)))}
              inputMode="decimal"
              placeholder={String(i + 1)}
              aria-label={t("estrutura.niveis.campo", { n: i + 1 })}
              className="num !w-28 !py-1 text-right !text-[13px]"
            />
            {niveis.length > 2 && (
              <button
                type="button"
                onClick={() => onChange(niveis.filter((_, j) => j !== i))}
                aria-label={t("estrutura.niveis.remover", { n: i + 1 })}
                className="tatil p-1"
                style={{ color: "var(--tinta-fraca)" }}
              >
                <Trash size={13} />
              </button>
            )}
          </li>
        ))}
      </ul>
      <Botao
        variante="contorno"
        onClick={() => onChange([...niveis, ""])}
        icone={<Plus size={12} weight="bold" />}
        className="!px-2.5 !py-1 !text-[12px]"
      >
        {t("estrutura.niveis.adicionar")}
      </Botao>
    </div>
  );
}
