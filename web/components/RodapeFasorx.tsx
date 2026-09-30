"use client";

/** O rodape de toda tela: a marca da FasorX, que publica esta aplicacao.
 *
 * Global, no layout, e nao por pagina: um rodape que precisa ser lembrado em
 * cada tela nova e um rodape que falta na tela nova. */

import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/nucleo";
import { AvisoNaoOficial } from "@/components/AvisoNaoOficial";
import { MarcaFasorx } from "@/components/MarcaFasorx";

const FASORX = process.env.NEXT_PUBLIC_FASORX_URL || "https://fasorx.com.br";

export function RodapeFasorx() {
  const { t } = useIdioma();
  return (
    <footer
      className="mt-16 border-t"
      style={{ borderColor: "var(--borda)" }}
    >
      {/* Em toda tela, porque se chega a esta aplicacao por qualquer uma */}
      <div className="mx-auto max-w-7xl px-5 pt-6">
        <AvisoNaoOficial forma="rodape" />
      </div>
      <div
        className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs"
        style={{ color: "var(--tinta-fraca)" }}
      >
        <a
          href={FASORX}
          target="_blank"
          rel="noopener noreferrer"
          className="tatil inline-flex items-center gap-2 rounded-[var(--raio-controle)] px-1 py-0.5"
          style={{ color: "var(--tinta-2)" }}
        >
          <span>{t("rodape.fasorx")}</span>
          <MarcaFasorx tamanho={16} />
          <span className="font-semibold tracking-tight" style={{ color: "var(--tinta)" }}>FasorX</span>
          <span className="sr-only">{t("nav.abreEmOutraAba")}</span>
        </a>
        <span>© {new Date().getFullYear()} FasorX</span>
      </div>
    </footer>
  );
}
