"use client";

/**
 * A tela de paridade: a prova de que o método aqui é o mesmo método de lá.
 *
 * Existe porque a afirmação "é equivalente ao FITradeoff oficial" não se
 * sustenta sozinha. Quem vai defender uma decisão tomada aqui — numa banca, num
 * comitê — precisa poder mostrar **o que foi comparado e o que deu**, incluindo
 * o que ainda não bate. Uma comparação que só exibe acertos não serve de
 * argumento; serve de propaganda.
 *
 * Os números vêm de `@/lib/paridade`, gerado a partir de medições gravadas no
 * repositório. Não é estado vivo de propósito: rodar o lado oficial leva
 * minutos por caso, contra servidor de terceiros e com conta. Datado e
 * versionado, o dado é auditável — quem duvidar refaz e confere.
 */

import Image from "next/image";

import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/paridade";
import { MEDIDO_EM, PARIDADE, RESUMO, type CasoParidade } from "@/lib/paridade";

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14">
      <h2
        className="mb-4 text-[17px] font-semibold tracking-tight"
        style={{ color: "var(--tinta)" }}
      >
        {titulo}
      </h2>
      {children}
    </section>
  );
}

/** Um par de capturas, a nossa ao lado da dele. */
function ParDeTelas({
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
      <h3 className="text-[14px] font-medium" style={{ color: "var(--tinta)" }}>
        {titulo}
      </h3>
      <p className="prosa mt-1 text-[13px]" style={{ color: "var(--tinta-3)" }}>
        {nota}
      </p>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
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
  const cor = naoCompleta
    ? "var(--tinta-fraca)"
    : caso.bate
      ? "var(--sucesso)"
      : "var(--aviso)";
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
        <span className="text-[12px] font-medium" style={{ color: cor }}>
          {naoCompleta
            ? "—"
            : caso.bate
              ? t("paridade.tabela.bate")
              : t("paridade.tabela.difere")}
        </span>
      </td>
    </tr>
  );
}

export default function ParidadePage() {
  const { t } = useIdioma();

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <h1
        className="text-[26px] font-semibold tracking-tight"
        style={{ color: "var(--tinta)" }}
      >
        {t("paridade.titulo")}
      </h1>
      <p className="prosa mt-2 text-[15px]" style={{ color: "var(--tinta-2)" }}>
        {t("paridade.subtitulo")}
      </p>
      <p className="mt-2 text-[12px]" style={{ color: "var(--tinta-fraca)" }}>
        {t("paridade.versaoOficial")} · {t("paridade.medidoEm", { data: MEDIDO_EM })}
      </p>

      {/* O placar primeiro: é a única coisa que alguém de fora precisa ler para
          saber se vale continuar lendo. */}
      <div
        className="mt-8 rounded-[var(--raio-painel)] border p-6"
        style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
      >
        <p
          className="text-[24px] font-semibold tracking-tight"
          style={{ color: "var(--accent)" }}
        >
          {t("paridade.placar", { bate: RESUMO.bate, total: RESUMO.comparaveis })}
        </p>
        <p className="prosa mt-2 text-[13px]" style={{ color: "var(--tinta-2)" }}>
          {t("paridade.placar.detalhe")}
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

      <Secao titulo={t("paridade.metodo.titulo")}>
        <div className="prosa space-y-3 text-[14px]" style={{ color: "var(--tinta-2)" }}>
          <p>{t("paridade.metodo.corpo1")}</p>
          <p>{t("paridade.metodo.corpo2")}</p>
          <p>{t("paridade.metodo.corpo3")}</p>
        </div>
      </Secao>

      <Secao titulo={t("paridade.tabela.titulo")}>
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
              {PARIDADE.map((caso) => (
                <Linha key={caso.chave} caso={caso} />
              ))}
            </tbody>
          </table>
        </div>
      </Secao>

      <Secao titulo={t("paridade.telas.titulo")}>
        <p className="prosa text-[14px]" style={{ color: "var(--tinta-2)" }}>
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

      <Secao titulo={t("paridade.achados.titulo")}>
        <p className="prosa text-[14px]" style={{ color: "var(--tinta-2)" }}>
          {t("paridade.achados.intro")}
        </p>
        <div className="mt-5 space-y-5">
          {[
            ["paridade.achados.abertura.titulo", "paridade.achados.abertura.corpo"],
            ["paridade.achados.limiar.titulo", "paridade.achados.limiar.corpo"],
            ["paridade.achados.sorting.titulo", "paridade.achados.sorting.corpo"],
          ].map(([titulo, corpo]) => (
            <div key={titulo}>
              <h3 className="text-[14px] font-medium" style={{ color: "var(--tinta)" }}>
                {t(titulo)}
              </h3>
              <p className="prosa mt-1 text-[13px]" style={{ color: "var(--tinta-2)" }}>
                {t(corpo)}
              </p>
            </div>
          ))}
        </div>
      </Secao>

      {/* As divergências que restam ficam na mesma página, e não numa nota de
          rodapé: é o que distingue uma comparação de uma peça de venda. */}
      <Secao titulo={t("paridade.restam.titulo")}>
        <div className="space-y-5">
          {[
            ["paridade.restam.instancias.titulo", "paridade.restam.instancias.corpo"],
            ["paridade.restam.bc.titulo", "paridade.restam.bc.corpo"],
            ["paridade.restam.carteira.titulo", "paridade.restam.carteira.corpo"],
            ["paridade.restam.degenerado.titulo", "paridade.restam.degenerado.corpo"],
          ].map(([titulo, corpo]) => (
            <div key={titulo}>
              <h3 className="text-[14px] font-medium" style={{ color: "var(--tinta)" }}>
                {t(titulo)}
              </h3>
              <p className="prosa mt-1 text-[13px]" style={{ color: "var(--tinta-2)" }}>
                {t(corpo)}
              </p>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo={t("paridade.reproduzir.titulo")}>
        <p className="prosa text-[14px]" style={{ color: "var(--tinta-2)" }}>
          {t("paridade.reproduzir.corpo")}
        </p>
      </Secao>
    </main>
  );
}
