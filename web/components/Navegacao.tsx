"use client";

/**
 * Navegacao com indicacao de onde o visitante esta.
 *
 * A marca e desenhada, nao escrita: duas barras de comprimento diferente, que
 * sao a forma do que o metodo faz -- um intervalo que encolhe.
 */

import { ArrowSquareOut, List, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { SeletorIdioma } from "@/components/SeletorIdioma";
import { SeletorTema } from "@/components/SeletorTema";
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
      <rect x="1" y="4" width="20" height="4" rx="1.5" fill="#4e7196" />
      <rect x="1" y="4" width="14" height="4" rx="1.5" fill="#ffffff" />
      <rect x="1" y="13" width="20" height="4" rx="1.5" fill="#4e7196" />
      <rect x="1" y="13" width="7" height="4" rx="1.5" fill="#8fc5ff" />
    </svg>
  );
}

export function Navegacao() {
  const caminho = usePathname();
  const { t } = useIdioma();
  const [menuAberto, setMenuAberto] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const botaoMenu = useRef<HTMLButtonElement>(null);

  useEffect(() => setMenuAberto(false), [caminho]);

  useEffect(() => {
    if (!menuAberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        setMenuAberto(false);
        botaoMenu.current?.focus();
      }
    };
    const aoClicar = (evento: MouseEvent) => {
      if (!menu.current?.contains(evento.target as Node)) setMenuAberto(false);
    };
    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("mousedown", aoClicar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("mousedown", aoClicar);
    };
  }, [menuAberto]);

  return (
    <header
      className="sticky top-0 z-20 border-b backdrop-blur"
      style={{
        borderColor: "rgba(255,255,255,.12)",
        background: "color-mix(in srgb, var(--navy) 96%, transparent)",
        boxShadow: "0 4px 18px rgba(7,29,56,.18)",
      }}
    >
      <nav className="relative mx-auto flex h-16 max-w-7xl items-center gap-8 px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Marca />
          <span
            className="text-[15px] font-semibold tracking-tight"
            style={{ color: "#ffffff" }}
          >
            FITradeoff
          </span>
        </Link>

        <div className="hidden items-center gap-1 sm:flex">
          {DESTINOS.map((d) => {
            const ativo = caminho.startsWith(d.href);
            return (
              <Link
                key={d.href}
                href={d.href}
                aria-current={ativo ? "page" : undefined}
                className="tatil rounded-[var(--raio-controle)] px-3.5 py-2 text-sm"
                style={{
                  color: ativo ? "var(--navy)" : "#c6d7ea",
                  background: ativo ? "#ffffff" : "transparent",
                  fontWeight: ativo ? 650 : 450,
                  boxShadow: ativo ? "0 4px 12px rgba(0,0,0,.15)" : "none",
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
          {/* Só onde há largura. Numa tela de 390px a barra já estava no
              limite, e três botões a mais empurrariam o conteúdo para fora;
              no celular o controle mora no menu, junto das outras
              preferências. */}
          <div className="hidden sm:block">
            <SeletorTema />
          </div>
          <SeletorIdioma />
          <a
            href="https://fitradeoff.org"
            target="_blank"
            rel="noopener noreferrer"
            className="tatil hidden items-center gap-1.5 rounded-[var(--raio-controle)] px-2.5 py-1.5 text-[13px] sm:flex"
            style={{ color: "#c6d7ea" }}
            title={t("nav.sobre.titulo")}
          >
            <span>{t("nav.sobre")}</span>
            <ArrowSquareOut size={13} weight="bold" aria-hidden />
            <span className="sr-only">{t("nav.abreEmOutraAba")}</span>
          </a>

          <div ref={menu} className="relative sm:hidden">
            <button
              ref={botaoMenu}
              type="button"
              aria-expanded={menuAberto}
              aria-controls="menu-principal-movel"
              aria-label={t(menuAberto ? "nav.menu.fechar" : "nav.menu.abrir")}
              onClick={() => setMenuAberto((aberto) => !aberto)}
              className="tatil inline-flex h-9 w-9 items-center justify-center rounded-[var(--raio-controle)] border"
              style={{
                borderColor: "rgba(255,255,255,.3)",
                background: menuAberto ? "#ffffff" : "rgba(255,255,255,.08)",
                color: menuAberto ? "var(--navy)" : "#ffffff",
              }}
            >
              {menuAberto ? (
                <X size={18} weight="bold" aria-hidden />
              ) : (
                <List size={19} weight="bold" aria-hidden />
              )}
            </button>

            {menuAberto && (
              <nav
                id="menu-principal-movel"
                aria-label={t("nav.menu.rotulo")}
                className="entra-subindo absolute right-0 top-11 w-[min(19rem,calc(100vw-2.5rem))] overflow-hidden rounded-[var(--raio-painel)] border p-2 shadow-[var(--sombra-alta)]"
                style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
              >
                <p className="px-3 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: "var(--tinta-fraca)" }}>
                  {t("nav.menu.rotulo")}
                </p>
                {DESTINOS.map((destino) => {
                  const ativo = caminho.startsWith(destino.href);
                  return (
                    <Link
                      key={destino.href}
                      href={destino.href}
                      aria-label={`${t(destino.chave)} — ${t("nav.menu.rotulo")}`}
                      aria-current={ativo ? "page" : undefined}
                      className="tatil flex items-center justify-between rounded-[var(--raio-controle)] px-3 py-2.5 text-sm"
                      style={{
                        color: ativo ? "var(--accent)" : "var(--tinta-2)",
                        background: ativo ? "var(--accent-suave)" : "transparent",
                        fontWeight: ativo ? 600 : 400,
                      }}
                    >
                      {t(destino.chave)}
                      {ativo && <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />}
                    </Link>
                  );
                })}
                <div className="my-2 border-t" style={{ borderColor: "var(--borda)" }} />
                <p
                  className="px-3 pb-1 pt-0.5 text-[11px] font-medium uppercase tracking-[0.12em]"
                  style={{ color: "var(--tinta-fraca)" }}
                >
                  {t("nav.tema")}
                </p>
                <SeletorTema variante="menu" />
                <div className="my-2 border-t" style={{ borderColor: "var(--borda)" }} />
                <a
                  href="https://fitradeoff.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tatil flex items-center justify-between rounded-[var(--raio-controle)] px-3 py-2.5 text-sm"
                  style={{ color: "var(--tinta-2)" }}
                >
                  {t("nav.sobre")}
                  <ArrowSquareOut size={15} weight="bold" aria-hidden />
                  <span className="sr-only">{t("nav.abreEmOutraAba")}</span>
                </a>
              </nav>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
