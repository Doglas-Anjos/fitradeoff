"use client";

/**
 * Navegacao com indicacao de onde o visitante esta.
 *
 * A marca e desenhada, nao escrita: duas barras de comprimento diferente, que
 * sao a forma do que o metodo faz -- um intervalo que encolhe.
 */

import { ArrowSquareOut } from "@phosphor-icons/react";
import Link from "next/link";

import { SeletorIdioma } from "@/components/SeletorIdioma";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/nucleo";
import "@/lib/i18n/paridade";
import { usePathname } from "next/navigation";

const DESTINOS = [
  { href: "/decisao", chave: "nav.decisao" },
  { href: "/chat", chave: "nav.chat" },
  /* A paridade fica na navegação, não escondida num rodapé: quem precisa
     defender uma decisão tomada aqui precisa achar a prova sem procurar. */
  { href: "/paridade", chave: "nav.paridade" },
];

function Marca() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden className="shrink-0">
      <rect x="1" y="4" width="20" height="4" rx="1.5" fill="var(--dado-trilho)" />
      <rect x="1" y="4" width="14" height="4" rx="1.5" fill="var(--accent)" />
      <rect x="1" y="13" width="20" height="4" rx="1.5" fill="var(--dado-trilho)" />
      <rect x="1" y="13" width="7" height="4" rx="1.5" fill="var(--accent)" />
    </svg>
  );
}

export function Navegacao() {
  const caminho = usePathname();
  const { t } = useIdioma();

  return (
    <header
      className="sticky top-0 z-20 border-b backdrop-blur"
      style={{
        borderColor: "var(--borda)",
        background: "color-mix(in srgb, var(--plano) 88%, transparent)",
      }}
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-8 px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Marca />
          <span
            className="text-[15px] font-semibold tracking-tight"
            style={{ color: "var(--tinta)" }}
          >
            FITradeoff
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {DESTINOS.map((d) => {
            const ativo = caminho.startsWith(d.href);
            return (
              <Link
                key={d.href}
                href={d.href}
                aria-current={ativo ? "page" : undefined}
                className="tatil rounded-[var(--raio-controle)] px-3 py-1.5 text-sm"
                style={{
                  color: ativo ? "var(--tinta)" : "var(--tinta-3)",
                  background: ativo ? "var(--painel-fundo)" : "transparent",
                  fontWeight: ativo ? 500 : 400,
                }}
              >
                {t(d.chave)}
              </Link>
            );
          })}
        </div>

        {/* O método não é nosso: é do CDSID/UFPE, e quem quiser a fonte, os
            artigos ou o sistema de referência deve chegar lá em um clique. */}
        <div className="ml-auto flex items-center gap-2">
          <SeletorIdioma />
          <a
            href="https://fitradeoff.org"
          target="_blank"
          rel="noopener noreferrer"
            className="tatil flex items-center gap-1.5 rounded-[var(--raio-controle)] px-2.5 py-1.5 text-[13px]"
          style={{ color: "var(--tinta-3)" }}
            title={t("nav.sobre.titulo")}
        >
          <span className="max-sm:sr-only">{t("nav.sobre")}</span>
          <ArrowSquareOut size={13} weight="bold" aria-hidden />
            <span className="sr-only">{t("nav.abreEmOutraAba")}</span>
          </a>
        </div>
      </nav>
    </header>
  );
}
