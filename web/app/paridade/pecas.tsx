"use client";

/**
 * As peças que a visão geral e as cinco telas de módulo dividem.
 *
 * Moram aqui, e não em `components/`, porque só a área de paridade as usa: a
 * tabela conhece o formato de `CasoParidade`, e a moldura de captura conhece o
 * par oficial/nosso. Promovê-las a componente geral daria a entender que servem
 * a outra tela, e a primeira pessoa que tentasse reusá-las descobriria que não.
 */

import Image from "next/image";

import { Selo } from "@/components/ui";

import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/paridade";
import type { CasoParidade } from "@/lib/paridade";

export function Secao({
  id,
  titulo,
  children,
}: {
  /** Ancora do sumario lateral. `scroll-mt` compensa o cabecalho fixo, que
      senao cobriria o titulo de quem chega pelo link. */
  id: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="cartao-secao scroll-mt-24"
    >
      <h2
        className="mb-4 text-xl font-semibold tracking-tight"
        style={{ color: "var(--tinta)" }}
      >
        {titulo}
      </h2>
      {children}
    </section>
  );
}

/** Sumario da pagina, nas duas formas que o espaco permite.
 *
 * Fixo na lateral quando ha largura, e recolhido num `details` quando nao ha.
 * Nao e o mesmo conteudo duas vezes por descuido: um sumario lateral em tela
 * estreita empurraria o texto para uma coluna inutilizavel, e esconder o
 * sumario no celular deixaria a pagina mais longa sem nenhuma forma de pular. */
export function Sumario({
  secoes,
  variante,
}: {
  secoes: readonly (readonly [string, string])[];
  variante: "lateral" | "compacto";
}) {
  const { t } = useIdioma();
  const lateral = variante === "lateral";
  const itens = secoes.map(([id, chave]) => (
    <a
      key={id}
      href={`#${id}`}
      className={
        lateral
          ? "tatil block rounded-r-[var(--raio-controle)] px-3 py-2 text-[13px]"
          : "tatil rounded-[var(--raio-controle)] px-2 py-1.5 text-[13px]"
      }
      style={{ color: lateral ? "var(--tinta-3)" : "var(--tinta-2)" }}
    >
      {t(chave)}
    </a>
  ));

  if (!lateral) {
    return (
      <details
        className="mt-6 rounded-[var(--raio-controle)] border p-4 lg:hidden"
        style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
      >
        <summary className="cursor-pointer text-sm font-semibold">
          {t("paridade.sumario")}
        </summary>
        <nav className="mt-3 grid gap-1" aria-label={t("paridade.sumario.compacto")}>
          {itens}
        </nav>
      </details>
    );
  }

  return (
    <aside className="superficie sticky top-24 hidden p-4 lg:block">
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "var(--tinta-fraca)" }}
      >
        {t("paridade.sumario")}
      </p>
      <nav
        className="mt-3 space-y-1"
        aria-label={t("paridade.sumario.lateral")}
      >
        {itens}
      </nav>
    </aside>
  );
}

/** Um bloco com título e corpo, do jeito que as listas de achados usam. */
export function Ponto({ titulo, corpo }: { titulo: string; corpo: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold" style={{ color: "var(--tinta)" }}>
        {titulo}
      </h3>
      <p className="prosa mt-1 text-sm" style={{ color: "var(--tinta-2)" }}>
        {corpo}
      </p>
    </div>
  );
}

/** Um par de capturas, a nossa ao lado da dele. */
export function ParDeTelas({
  titulo,
  nota,
  oficial,
  nosso,
}: {
  titulo: string;
  nota: string;
  oficial: string;
  nosso: string;
}) {
  const { t } = useIdioma();
  const moldura = {
    borderColor: "var(--borda)",
    background: "var(--painel)",
  };
  return (
    <div className="mt-8">
      <h3 className="text-base font-semibold" style={{ color: "var(--tinta)" }}>
        {titulo}
      </h3>
      <p className="prosa mt-1 text-sm" style={{ color: "var(--tinta-3)" }}>
        {nota}
      </p>
      {/* Duas capturas lado a lado so a partir de `xl`: mais cedo que isso cada
          uma fica estreita demais para que se leia o que esta na tela, que e a
          unica razao de elas estarem aqui. */}
      <div className="mt-4 grid gap-5 xl:grid-cols-2">
        {[
          { rotulo: t("paridade.telas.oficialLegenda"), src: oficial },
          { rotulo: t("paridade.telas.nossoLegenda"), src: nosso },
        ].map((tela) => (
          <figure key={tela.src} className="min-w-0">
            <div
              className="overflow-hidden rounded-[var(--raio-painel)] border"
              style={moldura}
            >
              {/* `unoptimized`: são capturas estáticas versionadas, não conteúdo
                  variável — passar pelo otimizador só adiciona uma peça. */}
              <Image
                src={tela.src}
                alt={`${titulo} — ${tela.rotulo}`}
                width={1280}
                height={800}
                unoptimized
                className="h-auto w-full"
              />
            </div>
            <figcaption
              className="mt-1.5 text-[11px]"
              style={{ color: "var(--tinta-fraca)" }}
            >
              {tela.rotulo}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function Passos({ par }: { par: { ordenacao: number; tradeoff: number } | null }) {
  const { t } = useIdioma();
  if (!par) {
    return (
      <span className="text-[12px]" style={{ color: "var(--aviso)" }}>
        {t("paridade.tabela.trava")}
      </span>
    );
  }
  return (
    <span className="num text-[13px]" style={{ color: "var(--tinta-2)" }}>
      {par.ordenacao} / {par.tradeoff}
    </span>
  );
}

function Linha({ caso }: { caso: CasoParidade }) {
  const { t } = useIdioma();
  const naoCompleta = caso.oficial === null;
  return (
    <tr style={{ borderTop: "1px solid var(--borda)" }}>
      <td className="py-2.5 pr-4">
        <span className="text-[13px]" style={{ color: "var(--tinta)" }}>
          {caso.chave}
        </span>
      </td>
      <td className="py-2.5 pr-4">
        <span className="num text-[12px]" style={{ color: "var(--tinta-fraca)" }}>
          {caso.alternativas} × {caso.criterios}
        </span>
      </td>
      <td className="py-2.5 pr-4">
        <Passos par={caso.oficial} />
      </td>
      <td className="py-2.5 pr-4">
        <Passos par={caso.nosso} />
      </td>
      <td className="py-2.5 text-right">
        <Selo tom={naoCompleta ? "neutro" : caso.bate ? "accent" : "aviso"}>
          {/* Um travessao nao diz nada em leitor de tela: sai como "traco" ou
              como silencio, e a celula do veredicto fica sem veredicto. */}
          {naoCompleta ? (
            <>
              <span aria-hidden>—</span>
              <span className="sr-only">{t("paridade.tabela.naoComparavel")}</span>
            </>
          ) : caso.bate ? (
            t("paridade.tabela.bate")
          ) : (
            t("paridade.tabela.difere")
          )}
        </Selo>
      </td>
    </tr>
  );
}

export function TabelaCasos({ casos }: { casos: CasoParidade[] }) {
  const { t } = useIdioma();
  return (
    <>
      <p className="mb-3 text-[12px]" style={{ color: "var(--tinta-fraca)" }}>
        {t("paridade.tabela.legenda")}
      </p>
      <div
        className="overflow-x-auto rounded-[var(--raio-painel)] border px-5"
        style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
      >
        <table className="w-full">
          <thead>
            <tr>
              {[
                "paridade.tabela.caso",
                "paridade.tabela.tamanho",
                "paridade.tabela.oficial",
                "paridade.tabela.nosso",
              ].map((chave) => (
                <th
                  key={chave}
                  className="py-3 pr-4 text-left text-[11px] font-medium uppercase tracking-wide"
                  style={{ color: "var(--tinta-3)" }}
                >
                  {t(chave)}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {casos.map((caso) => (
              <Linha key={caso.chave} caso={caso} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
