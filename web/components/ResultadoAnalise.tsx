"use client";

/**
 * O resultado, lido conforme a problematica.
 *
 * As quatro respondem perguntas diferentes e precisam de leituras diferentes:
 * uma recomendacao, uma ordem, uma alocacao em classes, uma carteira. O que
 * elas tem em comum -- faixas de valor e de peso -- fica na tela que chama.
 */

import { DiagramaHasse } from "@/components/DiagramaHasse";
import { GraficoGantt } from "@/components/GraficoGantt";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/paineis";
import type { Analise } from "@/lib/types";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className={titulo ? "mt-5" : "mt-2"}>
      {titulo && (
        <h3 className="text-sm font-semibold" style={{ color: "var(--tinta)" }}>
          {titulo}
        </h3>
      )}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Lista({ itens }: { itens: string[] }) {
  return (
    <ul className="space-y-1 text-sm" style={{ color: "var(--tinta-2)" }}>
      {itens.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

export function ResultadoAnalise({ analise }: { analise: Analise }) {
  const { t } = useIdioma();

  if (analise.problematica === "ranking" && analise.posicoes_possiveis) {
    const linhas = Object.entries(analise.posicoes_possiveis).sort(
      (a, b) => a[1][0] - b[1][0] || a[1][1] - b[1][1],
    );
    return (
      <>
        {analise.niveis && analise.niveis.length > 0 && (
          <Secao titulo="">
            <DiagramaHasse
              niveis={analise.niveis}
              arestas={analise.dominancia_direta ?? []}
              indiferencas={analise.indiferencas}
              posicoes={analise.posicoes}
              diferencas={analise.diferencas_maximas}
            />
          </Secao>
        )}
        <Secao titulo={t("resultado.ranking.titulo")}>
          <table className="w-full text-sm">
            <tbody>
              {linhas.map(([nome, [de, ate]]) => (
                <tr key={nome} style={{ color: "var(--tinta-2)" }}>
                  <td className="num w-16 py-1" style={{ color: "var(--tinta-fraca)" }}>
                    {de === ate
                      ? t("resultado.ranking.posicao", { n: de })
                      : t("resultado.ranking.posicao.faixa", { de, ate })}
                  </td>
                  <td className="py-1">{nome}</td>
                  <td className="py-1 text-right text-xs">
                    {de === ate
                      ? t("resultado.ranking.definida")
                      : t("resultado.ranking.emDisputa")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Secao>
      </>
    );
  }

  if (analise.problematica === "sorting" && analise.alocacao) {
    return (
      <>
        {analise.classes && analise.perfis && (
          <Secao titulo="">
            <GraficoGantt
              alocacao={analise.alocacao}
              perfis={analise.perfis}
              classes={analise.classes}
            />
          </Secao>
        )}
        <Secao titulo={t("resultado.sorting.titulo")}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: "var(--tinta-fraca)" }}>
              <th className="py-1 text-left font-normal">
                {t("resultado.sorting.alternativa")}
              </th>
              <th className="py-1 text-left font-normal">
                {t("resultado.sorting.classe")}
              </th>
              <th className="py-1 text-right font-normal">
                {t("resultado.sorting.valorGlobal")}
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(analise.alocacao).map(([nome, dados]) => (
              <tr key={nome} style={{ color: "var(--tinta-2)" }}>
                <td className="py-1">{nome}</td>
                <td className="py-1">
                  {dados.classes_possiveis.join(` ${t("resultado.sorting.ou")} `)}
                  {!dados.definida && (
                    <span className="ml-2 text-xs" style={{ color: "var(--tinta-fraca)" }}>
                      {t("resultado.sorting.indefinida")}
                    </span>
                  )}
                </td>
                <td className="num py-1 text-right text-xs">
                  {dados.faixa_de_valor[0].toFixed(3)} – {dados.faixa_de_valor[1].toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </Secao>
      </>
    );
  }

  /* As duas carteiras compartilham a apresentacao do resultado: ambas terminam
     num conjunto sob um orcamento, com sempre/nunca/oscilam e uma ressalva
     sobre amostragem. A razao acrescenta a sua tabela de faixas, logo abaixo. */
  if (
    analise.problematica === "portfolio" ||
    analise.problematica === "beneficio_custo"
  ) {
    return (
      <>
        {analise.ressalva && (
          <p
            className="mt-3 rounded-[var(--raio-controle)] border p-3 text-xs"
            style={{ borderColor: "var(--borda)", color: "var(--tinta-2)" }}
          >
            <strong>{t("resultado.portfolio.atencao")}</strong> {analise.ressalva}
          </p>
        )}
        {(analise.portfolios_encontrados?.length ?? 0) > 0 && (
          <Secao
            titulo={t("resultado.portfolio.carteiras", {
              orcamento: analise.orcamento ?? "-",
            })}
          >
            <ul className="space-y-2 text-sm">
              {analise.portfolios_encontrados!.map((c, i) => (
                <li
                  key={i}
                  className="rounded-[var(--raio-controle)] border p-3"
                  style={{ borderColor: "var(--borda)" }}
                >
                  <span className="num text-xs" style={{ color: "var(--tinta-fraca)" }}>
                    {t("resultado.portfolio.custo", { custo: c.custo })}
                  </span>
                  <div style={{ color: "var(--tinta-2)" }}>
                    {c.projetos.join(", ")}
                  </div>
                </li>
              ))}
            </ul>
          </Secao>
        )}
        {analise.razoes && (
          <Secao titulo={t("resultado.razao.titulo")}>
            <p className="prosa mb-3 text-xs" style={{ color: "var(--tinta-3)" }}>
              {t("resultado.razao.explicacao")}
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {[
                    "resultado.razao.projeto",
                    "resultado.razao.custo",
                    "resultado.razao.faixa",
                  ].map((chave) => (
                    <th
                      key={chave}
                      className="pb-1 text-left text-xs font-medium"
                      style={{ color: "var(--tinta-fraca)" }}
                    >
                      {t(chave)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(analise.razoes).map(([nome, r]) => (
                  <tr key={nome}>
                    <td style={{ color: "var(--tinta)" }}>{nome}</td>
                    <td className="num" style={{ color: "var(--tinta-2)" }}>
                      {r.custo}
                    </td>
                    <td className="num" style={{ color: "var(--tinta-2)" }}>
                      {r.razao_minima.toFixed(3)} a {r.razao_maxima.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Secao>
        )}

        {(analise.dominancia_por_razao?.length ?? 0) > 0 && (
          <Secao titulo={t("resultado.razao.dominancia")}>
            <Lista
              itens={analise.dominancia_por_razao!.map((d) =>
                t("resultado.razao.domina", {
                  dominante: d.dominante,
                  dominado: d.dominado,
                }),
              )}
            />
          </Secao>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            ["resultado.portfolio.sempre", analise.sempre_selecionados],
            ["resultado.portfolio.oscilam", analise.oscilam],
            ["resultado.portfolio.nunca", analise.nunca_selecionados],
          ].map(([chave, itens]) => (
            <div key={chave as string}>
              <h3 className="text-xs font-semibold" style={{ color: "var(--tinta-fraca)" }}>
                {t(chave as string)}
              </h3>
              <Lista itens={(itens as string[]) ?? []} />
            </div>
          ))}
        </div>
      </>
    );
  }

  // escolha
  return (
    <>
      {(analise.dominancia?.length ?? 0) > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm" style={{ color: "var(--tinta-fraca)" }}>
            {t("resultado.escolha.dominancia")}
          </summary>
          <div className="mt-2">
            <Lista itens={analise.dominancia!} />
          </div>
        </details>
      )}
    </>
  );
}
