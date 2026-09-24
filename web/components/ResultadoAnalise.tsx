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
            />
          </Secao>
        )}
        <Secao titulo="Posição de cada alternativa">
          <table className="w-full text-sm">
            <tbody>
              {linhas.map(([nome, [de, ate]]) => (
                <tr key={nome} style={{ color: "var(--tinta-2)" }}>
                  <td className="num w-16 py-1" style={{ color: "var(--tinta-fraca)" }}>
                    {de === ate ? `${de}º` : `${de}º–${ate}º`}
                  </td>
                  <td className="py-1">{nome}</td>
                  <td className="py-1 text-right text-xs">
                    {de === ate ? "definida" : "em disputa"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Secao>
        {(analise.pares_indefinidos?.length ?? 0) > 0 && (
          <Secao titulo="Ainda não decidido">
            <Lista itens={analise.pares_indefinidos!} />
          </Secao>
        )}
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
        <Secao titulo="Classificação">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: "var(--tinta-fraca)" }}>
              <th className="py-1 text-left font-normal">Alternativa</th>
              <th className="py-1 text-left font-normal">Classe</th>
              <th className="py-1 text-right font-normal">Valor global</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(analise.alocacao).map(([nome, dados]) => (
              <tr key={nome} style={{ color: "var(--tinta-2)" }}>
                <td className="py-1">{nome}</td>
                <td className="py-1">
                  {dados.classes_possiveis.join(" ou ")}
                  {!dados.definida && (
                    <span className="ml-2 text-xs" style={{ color: "var(--tinta-fraca)" }}>
                      indefinida
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

  if (analise.problematica === "portfolio") {
    return (
      <>
        {analise.ressalva && (
          <p
            className="mt-3 rounded-[var(--raio-controle)] border p-3 text-xs"
            style={{ borderColor: "var(--borda)", color: "var(--tinta-2)" }}
          >
            <strong>Atenção:</strong> {analise.ressalva}
          </p>
        )}
        {(analise.portfolios_encontrados?.length ?? 0) > 0 && (
          <Secao titulo={`Carteiras possíveis (orçamento ${analise.orcamento ?? "—"})`}>
            <ul className="space-y-2 text-sm">
              {analise.portfolios_encontrados!.map((c, i) => (
                <li
                  key={i}
                  className="rounded-[var(--raio-controle)] border p-3"
                  style={{ borderColor: "var(--borda)" }}
                >
                  <span className="num text-xs" style={{ color: "var(--tinta-fraca)" }}>
                    custo {c.custo}
                  </span>
                  <div style={{ color: "var(--tinta-2)" }}>
                    {c.projetos.join(", ")}
                  </div>
                </li>
              ))}
            </ul>
          </Secao>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            ["Sempre selecionados", analise.sempre_selecionados],
            ["Oscilam", analise.oscilam],
            ["Nunca selecionados", analise.nunca_selecionados],
          ].map(([titulo, itens]) => (
            <div key={titulo as string}>
              <h3 className="text-xs font-semibold" style={{ color: "var(--tinta-fraca)" }}>
                {titulo as string}
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
            Relações de dominância
          </summary>
          <div className="mt-2">
            <Lista itens={analise.dominancia!} />
          </div>
        </details>
      )}
    </>
  );
}
