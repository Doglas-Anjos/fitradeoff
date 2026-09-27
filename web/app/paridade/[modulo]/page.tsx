"use client";

/**
 * Um módulo do método, explicado e conferido.
 *
 * Cinco páginas iguais em estrutura e diferentes em conteúdo, porque quem abre
 * isto quer conferir **o módulo que vai usar**, e o placar somado da visão
 * geral não responde a isso. A ordem das seções é a das perguntas que a pessoa
 * faz, nessa ordem: para que serve, como chega lá, o que é exato, o que foi
 * conferido, e onde ainda não bate.
 *
 * A página não esconde o módulo que não foi comparado. Ele aparece na lista
 * como os outros e diz, no lugar do placar, que não há caso medido e por quê —
 * omiti-lo faria a área inteira valer menos, porque um leitor que descobrisse
 * sozinho passaria a duvidar do resto com razão.
 */

import { ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Ponto, Secao, TabelaCasos } from "@/app/paridade/pecas";
import { casosDe, moduloPorRota, placarDe } from "@/app/paridade/modulos";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/paridade";
import { MEDIDO_EM } from "@/lib/paridade";

export default function ModuloPage() {
  const { t } = useIdioma();
  const parametros = useParams<{ modulo: string }>();
  const modulo = moduloPorRota(parametros?.modulo);

  if (!modulo) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
        <p className="text-[14px]" style={{ color: "var(--tinta-2)" }}>
          {t("paridade.modulo.naoEncontrado")}
        </p>
        <Link
          href="/paridade"
          className="tatil mt-4 inline-flex items-center gap-1.5 text-[13px] underline underline-offset-2"
          style={{ color: "var(--tinta-3)" }}
        >
          <ArrowLeft size={13} aria-hidden />
          {t("paridade.modulo.voltar")}
        </Link>
      </main>
    );
  }

  const base = `paridade.mod.${modulo.rota}`;
  const casos = casosDe(modulo);
  const placar = placarDe(modulo);
  const semCaso = placar.comparaveis === 0;
  const nome = t(`${base}.nome`);
  const nomeOficial = t(`${base}.oficial`);

  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
      <Link
        href="/paridade"
        className="tatil inline-flex items-center gap-1.5 text-[13px]"
        style={{ color: "var(--tinta-3)" }}
      >
        <ArrowLeft size={13} aria-hidden />
        {t("paridade.modulo.voltar")}
      </Link>

      <h1
        className="display mt-3 text-3xl font-semibold sm:text-4xl"
        style={{ color: "var(--tinta)" }}
      >
        {nome}
      </h1>
      <p className="prosa mt-3 text-base" style={{ color: "var(--tinta-2)" }}>
        {t(`${base}.resumo`)}
      </p>
      <p className="mt-2 text-[12px]" style={{ color: "var(--tinta-fraca)" }}>
        {/* O nome de lá só aparece quando difere do nosso: em inglês os dois
            são a mesma palavra, e repeti-la diria ao leitor que há uma
            diferença onde não há. */}
        {nomeOficial !== nome && (
          <>
            {t("paridade.modulo.nomeOficial")} “{nomeOficial}” ·{" "}
          </>
        )}
        {t("paridade.medidoEm", { data: MEDIDO_EM })}
      </p>

      <div
        className="mt-8 rounded-[var(--raio-painel)] border p-6"
        style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
      >
        <p
          className="display text-3xl font-semibold"
          style={{
            color: semCaso
              ? "var(--aviso)"
              : placar.bate === placar.comparaveis
                ? "var(--accent)"
                : "var(--aviso)",
          }}
        >
          {semCaso
            ? t("paridade.modulos.semCaso")
            : t("paridade.modulos.placar", {
                bate: placar.bate,
                total: placar.comparaveis,
              })}
        </p>
        {!semCaso && (
          <p className="prosa mt-2 text-[13px]" style={{ color: "var(--tinta-2)" }}>
            {t("paridade.placar.detalhe", { total: placar.comparaveis })}{" "}
            {t("paridade.maior", { n: placar.maiorProblema })}
          </p>
        )}
      </div>

      <div className="mt-10 space-y-12">
      <Secao id="responde" titulo={t("paridade.modulo.responde")}>
        <p className="prosa text-[15px]" style={{ color: "var(--tinta-2)" }}>
          {t(`${base}.responde`)}
        </p>
      </Secao>

      <Secao id="como" titulo={t("paridade.modulo.comoLe")}>
        <p className="prosa text-[15px]" style={{ color: "var(--tinta-2)" }}>
          {t(`${base}.comoLe`)}
        </p>
      </Secao>

      <Secao id="exatidao" titulo={t("paridade.modulo.exatidao")}>
        <p className="prosa text-[15px]" style={{ color: "var(--tinta-2)" }}>
          {t(`${base}.exatidao`)}
        </p>
      </Secao>

      <Secao
        id="testado"
        titulo={
          semCaso ? t("paridade.modulo.semCasos.titulo") : t("paridade.modulo.testado")
        }
      >
        <p className="prosa text-[15px]" style={{ color: "var(--tinta-2)" }}>
          {semCaso ? t(`${base}.semCasos`) : t(`${base}.testado`)}
        </p>
        {semCaso && (
          <p className="prosa mt-3 text-[15px]" style={{ color: "var(--tinta-2)" }}>
            {t(`${base}.testado`)}
          </p>
        )}
        {casos.length > 0 && (
          <div className="mt-5">
            <TabelaCasos casos={casos} />
          </div>
        )}
      </Secao>

      {casos.length > 0 && (
        <Secao id="resultados" titulo={t("paridade.modulo.resultados.titulo")}>
          <p className="mb-4 text-[12px]" style={{ color: "var(--tinta-fraca)" }}>
            {t("paridade.modulo.resultados.legenda")}
          </p>
          <dl className="space-y-4">
            {casos.map((caso) => (
              <div key={caso.chave}>
                <dt
                  className="text-[12px] font-medium"
                  style={{ color: "var(--tinta-3)" }}
                >
                  {caso.chave}
                </dt>
                <dd className="prosa mt-0.5 text-[13px]" style={{ color: "var(--tinta-2)" }}>
                  {caso.resumo}
                </dd>
              </div>
            ))}
          </dl>
        </Secao>
      )}

      {modulo.divergencia && (
        <Secao id="diferencas" titulo={t("paridade.modulo.divergencia")}>
          <Ponto
            titulo={t(`paridade.restam.${modulo.divergencia}.titulo`)}
            corpo={t(`paridade.restam.${modulo.divergencia}.corpo`)}
          />
        </Secao>
      )}

      <Secao id="reproduzir" titulo={t("paridade.reproduzir.titulo")}>
        <p className="prosa text-[15px]" style={{ color: "var(--tinta-2)" }}>
          {t("paridade.reproduzir.corpo")}
        </p>
      </Secao>
      </div>
    </main>
  );
}
