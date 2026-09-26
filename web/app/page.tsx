"use client";

import Link from "next/link";

import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/telas";

/**
 * A home abre com o que o metodo faz, nao com o que ele e.
 *
 * O elemento memoravel e a demonstracao a direita: quatro alternativas, e o
 * conjunto encolhendo a cada resposta ate sobrar uma. E o conceito inteiro do
 * FITradeoff numa figura, e e a unica coisa nesta pagina que chama atencao --
 * o resto fica quieto de proposito.
 *
 * Componente de cliente porque o idioma é escolha de quem está lendo, guardada
 * no navegador: a home não pode vir do servidor já resolvida num idioma só.
 */

/* Cada passo guarda a chave, não a frase: assim a legenda troca de idioma sem
   o módulo ter de ser reavaliado. */
const PASSOS = [
  { restantes: 4, chave: "tela.home.demo.passo1" },
  { restantes: 3, chave: "tela.home.demo.passo2" },
  { restantes: 2, chave: "tela.home.demo.passo3" },
  { restantes: 1, chave: "tela.home.demo.passo4" },
];

function Demonstracao() {
  const { t } = useIdioma();

  return (
    <figure className="m-0">
      <div
        className="rounded-[var(--raio-painel)] border p-6"
        style={{
          borderColor: "var(--borda)",
          background: "var(--painel)",
          boxShadow: "var(--sombra)",
        }}
      >
        <div className="flex flex-col gap-5">
          {PASSOS.map((passo, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((j) => (
                  <span
                    key={j}
                    className="h-7 w-7 rounded-[3px]"
                    style={{
                      background:
                        j < passo.restantes
                          ? "var(--accent)"
                          : "var(--dado-trilho)",
                      opacity: j < passo.restantes ? 1 - i * 0.04 : 1,
                    }}
                  />
                ))}
              </div>
              <span className="text-sm" style={{ color: "var(--tinta-2)" }}>
                {t(passo.chave)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="mt-3 text-xs" style={{ color: "var(--tinta-fraca)" }}>
        {t("tela.home.demo.legenda")}
      </figcaption>
    </figure>
  );
}

export default function Home() {
  const { t } = useIdioma();

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-16">
      <div className="grid gap-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-20">
        <div>
          <h1
            className="display text-[2.75rem] font-semibold sm:text-[3.5rem]"
            style={{ color: "var(--tinta)" }}
          >
            {t("tela.home.titulo")}
          </h1>

          <p className="prosa mt-6 text-[17px]" style={{ color: "var(--tinta-2)" }}>
            {t("tela.home.descricao")}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/decisao"
              className="tatil rounded-[var(--raio-controle)] px-5 py-2.5 text-sm font-medium"
              style={{
                background: "var(--accent)",
                color: "var(--accent-tinta)",
                boxShadow: "var(--sombra)",
              }}
            >
              {t("tela.home.acao.decisao")}
            </Link>
            <Link
              href="/chat"
              className="tatil rounded-[var(--raio-controle)] border px-5 py-2.5 text-sm font-medium"
              style={{ borderColor: "var(--borda-forte)", color: "var(--tinta)" }}
            >
              {t("tela.home.acao.chat")}
            </Link>
          </div>

          <p className="mt-6 text-sm" style={{ color: "var(--tinta-3)" }}>
            {t("tela.home.acao.ajuda")}
          </p>
        </div>

        <Demonstracao />
      </div>

      <div className="mt-28 grid items-start gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
        <h2
          className="display text-2xl font-semibold lg:sticky lg:top-24"
          style={{ color: "var(--tinta)" }}
        >
          {t("tela.home.pratica.titulo")}
        </h2>

        <dl className="divide-y" style={{ borderColor: "var(--borda)" }}>
          {/* A lista guarda o nome de cada item, não o texto: a chave também
              serve de `key` estável, que o título traduzido não seria. */}
          {["pesos", "registro", "objetivos", "parar"].map((item) => (
            <div key={item} className="py-5 first:pt-0 last:pb-0">
              <dt className="text-[15px] font-medium" style={{ color: "var(--tinta)" }}>
                {t(`tela.home.pratica.${item}.titulo`)}
              </dt>
              <dd
                className="prosa mt-1.5 text-sm"
                style={{ color: "var(--tinta-2)" }}
              >
                {t(`tela.home.pratica.${item}.texto`)}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="mt-24 text-xs" style={{ color: "var(--tinta-fraca)" }}>
        {t("tela.home.rodape")}
      </p>
    </main>
  );
}
