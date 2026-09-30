"use client";

/** O aviso de que esta aplicação não é o FITradeoff original.
 *
 * O nome do método aparece na marca, e quem chega pode tomar a aplicação pelo
 * sistema do CDSID-UFPE — e os números dela pelos dele. O aviso diz o que ela é
 * (uma implementação independente, feita a partir do guia do usuário publicado
 * no site do FITradeoff), que os valores podem diferir, e onde está a comparação
 * caso a caso com o original.
 *
 * Duas formas: `rodape`, uma linha em toda tela; `destaque`, o quadro da página
 * inicial e da página de paridade, onde os números dos dois aparecem juntos. */

import { Info } from "@phosphor-icons/react";
import Link from "next/link";

import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/nucleo";

const ORIGINAL = "https://fitradeoff.org/";

export function AvisoNaoOficial({
  forma,
  comLinkParidade = true,
}: {
  forma: "rodape" | "destaque";
  /** Na própria página de paridade o link para ela sobra. */
  comLinkParidade?: boolean;
}) {
  const { t } = useIdioma();

  const links = (
    <>
      {comLinkParidade && (
        <Link href="/paridade" className="tatil underline underline-offset-2" style={{ color: "var(--accent)" }}>
          {t("aviso.naoOficial.comparacao")}
        </Link>
      )}
      <a
        href={ORIGINAL}
        target="_blank"
        rel="noopener noreferrer"
        className="tatil underline underline-offset-2"
        style={{ color: "var(--accent)" }}
      >
        {t("aviso.naoOficial.original")}
        <span className="sr-only"> ({t("nav.abreEmOutraAba")})</span>
      </a>
    </>
  );

  if (forma === "rodape") {
    return (
      <p className="max-w-3xl text-xs leading-relaxed" style={{ color: "var(--tinta-3)" }}>
        {t("aviso.naoOficial.curto")}{" "}
        <span className="inline-flex flex-wrap gap-x-3">{links}</span>
      </p>
    );
  }

  return (
    <aside
      aria-labelledby="aviso-nao-oficial"
      className="flex gap-3 rounded-[var(--raio-painel)] border p-4 sm:p-5"
      style={{
        borderColor: "var(--borda)",
        borderLeft: "3px solid var(--aviso)",
        background: "var(--painel)",
      }}
    >
      <Info size={20} weight="fill" aria-hidden className="mt-0.5 shrink-0" style={{ color: "var(--aviso)" }} />
      <div>
        <p id="aviso-nao-oficial" className="text-sm font-semibold" style={{ color: "var(--tinta)" }}>
          {t("aviso.naoOficial.titulo")}
        </p>
        <p className="prosa mt-1 text-[13px] leading-relaxed" style={{ color: "var(--tinta-2)" }}>
          {t("aviso.naoOficial.corpo")}
        </p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">{links}</p>
      </div>
    </aside>
  );
}
