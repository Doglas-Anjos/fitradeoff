"use client";

import { ArrowRight, CheckCircle, Plugs } from "@phosphor-icons/react";
import Link from "next/link";

import { AvisoNaoOficial } from "@/components/AvisoNaoOficial";

import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/telas";

const PASSOS = [
  { restantes: 4, chave: "tela.home.demo.passo1" },
  { restantes: 3, chave: "tela.home.demo.passo2" },
  { restantes: 2, chave: "tela.home.demo.passo3" },
  { restantes: 1, chave: "tela.home.demo.passo4" },
];

function Demonstracao() {
  const { t } = useIdioma();
  return (
    <figure className="superficie-alta m-0 overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--borda)] bg-[var(--painel-fundo)] px-5 py-3.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">FITradeoff</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--tinta-3)]">
          <span className="h-2 w-2 rounded-full bg-[var(--sucesso)]" />
          {t("tela.home.demo.legenda")}
        </span>
      </div>
      <div className="p-5 sm:p-7">
        <div className="flex flex-col gap-3">
          {PASSOS.map((passo, i) => (
            <div key={passo.chave} className="flex items-center gap-4 rounded-[var(--raio-controle)] border border-[var(--borda)] bg-[var(--painel)] px-4 py-3">
              <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-suave)] text-[11px] font-bold text-[var(--accent)]">{i + 1}</span>
              <div className="flex gap-1.5" aria-hidden>
                {[0, 1, 2, 3].map((j) => (
                  <span key={j} className="h-6 w-3 rounded-sm transition-colors duration-300 sm:w-5" style={{ background: j < passo.restantes ? "var(--accent)" : "var(--dado-trilho)" }} />
                ))}
              </div>
              <span className="min-w-0 text-sm font-medium text-[var(--tinta-2)]">{t(passo.chave)}</span>
              {i === PASSOS.length - 1 && <CheckCircle className="ml-auto shrink-0 text-[var(--sucesso)]" size={18} weight="fill" aria-hidden />}
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}

export default function Home() {
  const { t } = useIdioma();
  const itens = ["pesos", "registro", "objetivos", "parar"];
  return (
    <main>
      <section className="superficie-navy relative overflow-hidden bg-[var(--navy)]">
        <div className="pointer-events-none absolute -right-40 -top-44 h-[32rem] w-[32rem] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full border border-white/10" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:py-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-20 lg:py-24">
          <div>
            <p className="mb-5 text-[12px] font-bold uppercase tracking-[0.18em] text-[#8fc5ff]">Flexible and Interactive Tradeoff</p>
            <h1 className="display max-w-3xl text-[2.8rem] font-semibold text-white sm:text-[4rem]">{t("tela.home.titulo")}</h1>
            <p className="prosa mt-6 text-[17px] leading-relaxed text-[#c6d7ea]">{t("tela.home.descricao")}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/decisao" className="tatil inline-flex min-h-12 items-center gap-2 rounded-[var(--raio-controle)] bg-white px-5 py-3 text-sm font-bold text-[var(--navy)] shadow-lg hover:-translate-y-0.5">
                {t("tela.home.acao.decisao")} <ArrowRight size={16} weight="bold" aria-hidden />
              </Link>
              <Link href="/chaves" className="tatil inline-flex min-h-12 items-center gap-2 rounded-[var(--raio-controle)] border border-white/30 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:border-white/60 hover:bg-white/10">
                <Plugs size={17} weight="bold" aria-hidden /> {t("tela.home.acao.chaves")}
              </Link>
            </div>
            <p className="mt-5 text-sm text-[#9db5ce]">{t("tela.home.acao.ajuda")}</p>
          </div>
          <Demonstracao />
        </div>
      </section>

      {/* Logo abaixo da chamada, antes de qualquer outra coisa: quem chega pela
          primeira vez precisa saber que isto nao e o sistema do CDSID-UFPE. */}
      <div className="mx-auto max-w-7xl px-5 pt-10">
        <AvisoNaoOficial forma="destaque" />
      </div>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--azul-vivo)]">FITradeoff</p>
          <h2 className="display mt-3 text-3xl font-semibold text-[var(--tinta)]">{t("tela.home.pratica.titulo")}</h2>
        </div>
        <dl className="mt-9 grid gap-4 md:grid-cols-2">
          {itens.map((item, i) => (
            <div key={item} className="superficie tatil group p-6 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[var(--sombra-alta)]">
              <div className="num mb-5 flex h-9 w-9 items-center justify-center rounded-[var(--raio-controle)] bg-[var(--accent-suave)] text-xs font-bold text-[var(--accent)]">{String(i + 1).padStart(2, "0")}</div>
              <dt className="text-base font-semibold text-[var(--tinta)]">{t(`tela.home.pratica.${item}.titulo`)}</dt>
              <dd className="prosa mt-2 text-sm text-[var(--tinta-2)]">{t(`tela.home.pratica.${item}.texto`)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-14 border-t border-[var(--borda)] pt-6 text-xs text-[var(--tinta-fraca)]">{t("tela.home.rodape")}</p>
      </section>
    </main>
  );
}
