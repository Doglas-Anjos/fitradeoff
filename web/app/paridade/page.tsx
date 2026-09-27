"use client";

/**
 * A visão geral da paridade: a prova de que o método aqui é o mesmo de lá.
 *
 * Existe porque a afirmação "é equivalente ao FITradeoff oficial" não se
 * sustenta sozinha. Quem vai defender uma decisão tomada aqui — numa banca, num
 * comitê — precisa poder mostrar **o que foi comparado, o que deu, e onde a
 * comparação acaba**. Uma página que só exibe acertos não serve de argumento;
 * serve de propaganda.
 *
 * Três seções carregam esse peso e nenhuma delas é opcional: o que
 * "equivalente" quer dizer, o que **não** foi testado, e o que permanece
 * diferente. A primeira existe porque sem ela o leitor inventa a própria
 * definição — em geral "as telas são parecidas", que é a única que não
 * interessa. As outras duas são a borda do argumento, e ficam no corpo da
 * página, não em nota de rodapé.
 *
 * Os números vêm de `@/lib/paridade`, gerado a partir de medições gravadas no
 * repositório. Não é estado vivo de propósito: rodar o lado oficial leva
 * minutos por caso, contra servidor de terceiros e com conta. Datado e
 * versionado, o dado é auditável — quem duvidar refaz e confere.
 */

import { ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";

import { ParDeTelas, Ponto, Secao, Sumario, TabelaCasos } from "@/app/paridade/pecas";
import { MODULOS, placarDe, type Modulo } from "@/app/paridade/modulos";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/paridade";
import { MEDIDO_EM, PARIDADE, RESUMO } from "@/lib/paridade";

/** Um dos cinco, com o placar do próprio módulo em vez do agregado. */
function CartaoModulo({ modulo }: { modulo: Modulo }) {
  const { t } = useIdioma();
  const placar = placarDe(modulo);
  const semCaso = placar.comparaveis === 0;

  return (
    <Link
      href={`/paridade/${modulo.rota}`}
      className="cartao-modulo tatil group flex flex-col rounded-[var(--raio-painel)] border p-5"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="text-[15px] font-medium" style={{ color: "var(--tinta)" }}>
          {t(`paridade.mod.${modulo.rota}.nome`)}
        </span>
        <ArrowRight
          size={15}
          aria-hidden
          className="seta-modulo mt-0.5 shrink-0"
        />
      </span>
      <span className="prosa mt-1 text-[13px]" style={{ color: "var(--tinta-3)" }}>
        {t(`paridade.mod.${modulo.rota}.resumo`)}
      </span>
      <span className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          className="text-[12px] font-medium"
          style={{
            color: semCaso
              ? "var(--aviso)"
              : placar.bate === placar.comparaveis
                ? "var(--sucesso)"
                : "var(--aviso)",
          }}
        >
          {semCaso
            ? t("paridade.modulos.semCaso")
            : t("paridade.modulos.placar", {
                bate: placar.bate,
                total: placar.comparaveis,
              })}
        </span>
        <span className="text-[11px]" style={{ color: "var(--tinta-fraca)" }}>
          {t(
            modulo.exatidao === "exato"
              ? "paridade.modulos.exato"
              : "paridade.modulos.aproximado",
          )}
        </span>
      </span>
    </Link>
  );
}

/* A ordem aqui e a ordem das seções, e as duas precisam bater: o sumário é
   escrito à mão porque os títulos vêm do catálogo e não do DOM. */
const SECOES = [
  ["significa", "paridade.significa.titulo"],
  ["metodo", "paridade.metodo.titulo"],
  ["modulos", "paridade.modulos.titulo"],
  ["casos", "paridade.tabela.titulo"],
  ["telas", "paridade.telas.titulo"],
  ["achados", "paridade.achados.titulo"],
  ["nao-testado", "paridade.naoTestamos.titulo"],
  ["diferencas", "paridade.restam.titulo"],
  ["reproduzir", "paridade.reproduzir.titulo"],
] as const;

export default function ParidadePage() {
  const { t } = useIdioma();

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 sm:py-16">
      <header className="cabecalho-escuro max-w-5xl p-6 sm:p-9">
        <p
          className="text-[12px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "#8fc5ff" }}
        >
          {t("paridade.editorial")}
        </p>
        <h1
          className="display mt-3 text-3xl font-semibold sm:text-4xl"
          style={{ color: "#ffffff" }}
        >
          {t("paridade.titulo")}
        </h1>
        <p className="prosa mt-3 text-base" style={{ color: "#c6d7ea" }}>
          {t("paridade.subtitulo")}
        </p>
        <p className="mt-2 text-[12px]" style={{ color: "#9db5ce" }}>
          {t("paridade.versaoOficial")} ·{" "}
          {t("paridade.medidoEm", { data: MEDIDO_EM })}
        </p>
      </header>

      {/* O placar primeiro: é a única coisa que alguém de fora precisa ler para
          saber se vale continuar lendo. */}
      <div
        className="mt-7 grid gap-5 rounded-[var(--raio-painel)] border p-6 shadow-[var(--sombra)] sm:grid-cols-[auto_1fr] sm:items-center sm:p-7"
        style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
      >
        <p
          className="display text-3xl font-semibold sm:border-r sm:pr-7"
          style={{ color: "var(--accent)", borderColor: "var(--borda)" }}
        >
          {t("paridade.placar", { bate: RESUMO.bate, total: RESUMO.comparaveis })}
        </p>
        <div>
          <p className="prosa text-sm" style={{ color: "var(--tinta-2)" }}>
            {t("paridade.placar.detalhe", { total: RESUMO.comparaveis })}
          </p>
          <p className="prosa mt-1 text-[13px]" style={{ color: "var(--tinta-3)" }}>
            {t("paridade.maior", { n: RESUMO.maiorProblema })}{" "}
            {RESUMO.travados > 0 &&
              t(
                RESUMO.travados === 1
                  ? "paridade.placar.travados"
                  : "paridade.placar.travadosVarios",
                { n: RESUMO.travados },
              )}
          </p>
        </div>
      </div>

      <Sumario secoes={SECOES} variante="compacto" />

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-14">
        <Sumario secoes={SECOES} variante="lateral" />

        <article className="min-w-0 space-y-12">

      <Secao id="significa" titulo={t("paridade.significa.titulo")}>
        <div className="prosa space-y-3 text-[15px]" style={{ color: "var(--tinta-2)" }}>
          <p>{t("paridade.significa.corpo1")}</p>
          <p>{t("paridade.significa.corpo2")}</p>
          <p>{t("paridade.significa.corpo3")}</p>
        </div>
      </Secao>

      <Secao id="metodo" titulo={t("paridade.metodo.titulo")}>
        <div className="prosa space-y-3 text-[15px]" style={{ color: "var(--tinta-2)" }}>
          <p>{t("paridade.metodo.corpo1")}</p>
          <p>{t("paridade.metodo.corpo2")}</p>
          <p>{t("paridade.metodo.corpo3")}</p>
        </div>
      </Secao>

      <Secao id="modulos" titulo={t("paridade.modulos.titulo")}>
        <p className="prosa text-[15px]" style={{ color: "var(--tinta-2)" }}>
          {t("paridade.modulos.corpo")}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {MODULOS.map((m) => (
            <CartaoModulo key={m.rota} modulo={m} />
          ))}
        </div>
      </Secao>

      <Secao id="casos" titulo={t("paridade.tabela.titulo")}>
        <TabelaCasos casos={PARIDADE} />
      </Secao>

      <Secao id="telas" titulo={t("paridade.telas.titulo")}>
        <p className="prosa text-[15px]" style={{ color: "var(--tinta-2)" }}>
          {t("paridade.telas.corpo")}
        </p>
        <ParDeTelas
          titulo={t("paridade.telas.matriz")}
          nota={t("paridade.telas.matriz.nota")}
          oficial="/paridade/oficial-matriz.png"
          nosso="/paridade/nosso-matriz.png"
        />
        <ParDeTelas
          titulo={t("paridade.telas.ordenacao")}
          nota={t("paridade.telas.ordenacao.nota")}
          oficial="/paridade/oficial-ordenacao.png"
          nosso="/paridade/nosso-ordenacao.png"
        />
        <ParDeTelas
          titulo={t("paridade.telas.tradeoff")}
          nota={t("paridade.telas.tradeoff.nota")}
          oficial="/paridade/oficial-tradeoff.png"
          nosso="/paridade/nosso-tradeoff.png"
        />
      </Secao>

      <Secao id="achados" titulo={t("paridade.achados.titulo")}>
        <p className="prosa text-[15px]" style={{ color: "var(--tinta-2)" }}>
          {t("paridade.achados.intro")}
        </p>
        <div className="mt-5 space-y-5">
          {["abertura", "limiar", "sorting"].map((chave) => (
            <Ponto
              key={chave}
              titulo={t(`paridade.achados.${chave}.titulo`)}
              corpo={t(`paridade.achados.${chave}.corpo`)}
            />
          ))}
        </div>
      </Secao>

      {/* O que ficou de fora vem antes do que ficou diferente, e os dois vêm na
          mesma página que o placar. Um leitor que só aceite a conclusão depois
          de saber onde ela não vale precisa achar isso sem procurar. */}
      <Secao id="nao-testado" titulo={t("paridade.naoTestamos.titulo")}>
        <p className="prosa text-[15px]" style={{ color: "var(--tinta-2)" }}>
          {t("paridade.naoTestamos.intro")}
        </p>
        <div className="mt-5 space-y-5">
          {[
            "carteira",
            "veto",
            "curva",
            "discretos",
            "tamanho",
            "qualidade",
            "grupo",
          ].map((chave) => (
            <Ponto
              key={chave}
              titulo={t(`paridade.naoTestamos.${chave}.titulo`)}
              corpo={t(`paridade.naoTestamos.${chave}.corpo`)}
            />
          ))}
        </div>
      </Secao>

      <Secao id="diferencas" titulo={t("paridade.restam.titulo")}>
        <div className="space-y-5">
          {["instancias", "bc", "carteira", "degenerado"].map((chave) => (
            <Ponto
              key={chave}
              titulo={t(`paridade.restam.${chave}.titulo`)}
              corpo={t(`paridade.restam.${chave}.corpo`)}
            />
          ))}
        </div>
      </Secao>

      <Secao id="reproduzir" titulo={t("paridade.reproduzir.titulo")}>
            <p className="prosa text-sm" style={{ color: "var(--tinta-2)" }}>
              {t("paridade.reproduzir.corpo")}
            </p>
          </Secao>
        </article>
      </div>
    </main>
  );
}
