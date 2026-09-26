"use client";

/**
 * O gráfico de classificação (Gantt) da problemática de sorting.
 *
 * Cada alternativa é uma barra que vai do seu menor ao seu maior valor global
 * possível. As linhas verticais são os perfis que separam as classes. Ler é
 * direto: barra inteira dentro de uma faixa, alternativa classificada; barra
 * atravessando um perfil, ainda indefinida — e dá para ver **por quanto**.
 *
 * É a leitura que a tabela sozinha não dá: com números, saber que 0,34–0,41
 * cruza o perfil 0,35 exige comparar de cabeça.
 */

import { Dica } from "@/components/ui";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/visualizacoes";
import { corDaSerie } from "@/lib/serie";

export interface AlocacaoItem {
  faixa_de_valor: [number, number];
  classes_possiveis: string[];
  definida: boolean;
}

/* As classes usam a mesma serie categorica do resto do produto -- duas paletas
   proximas mas diferentes leem como dois sistemas. A ordem aqui e a da serie:
   a classe 1 tem a cor 1, e trocar o numero de classes nao repinta as outras. */
const corDaClasse = (indice: number) => corDaSerie(indice);

export function GraficoGantt({
  alocacao,
  perfis,
  classes,
}: {
  alocacao: Record<string, AlocacaoItem>;
  perfis: number[];
  classes: string[];
}) {
  const { t } = useIdioma();
  const itens = Object.entries(alocacao).sort(
    (a, b) => b[1].faixa_de_valor[0] - a[1].faixa_de_valor[0],
  );
  const limites = [0, ...perfis, 1];

  return (
    <figure className="m-0">
      <figcaption className="mb-4 flex items-center gap-1.5">
        <span className="text-[13px] font-medium" style={{ color: "var(--tinta-2)" }}>
          {t("viz.gantt.titulo")}
        </span>
        <Dica titulo={t("viz.gantt.dica.titulo")}>
          <p>{t("viz.gantt.dica.corpo1")}</p>
          <p>{t("viz.gantt.dica.corpo2")}</p>
        </Dica>
      </figcaption>

      {/* faixas das classes, ao fundo */}
      <div className="relative">
        <div
          className="mb-2 grid text-[10px]"
          style={{
            gridTemplateColumns: limites
              .slice(1)
              .map((fim, i) => `${(fim - limites[i]) * 100}fr`)
              .join(" "),
          }}
        >
          {classes.map((classe, i) => (
            <div
              key={classe}
              className="truncate border-l px-1.5 py-0.5"
              style={{
                borderColor: "var(--borda-forte)",
                color: corDaClasse(i),
              }}
              title={t("viz.gantt.classeFaixa", {
                classe,
                de: limites[i].toFixed(2),
                ate: limites[i + 1].toFixed(2),
              })}
            >
              {classe}
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          {itens.map(([nome, dados]) => {
            const [lo, hi] = dados.faixa_de_valor;
            const classeIndice = classes.indexOf(dados.classes_possiveis[0]);
            const cor = dados.definida
              ? corDaClasse(Math.max(classeIndice, 0))
              : "var(--tinta-fraca)";

            return (
              <div
                key={nome}
                className="grid items-center gap-3"
                style={{ gridTemplateColumns: "minmax(0,10rem) 1fr auto" }}
              >
                <span
                  className="truncate text-[12px]"
                  style={{
                    color: dados.definida ? "var(--tinta-2)" : "var(--tinta-3)",
                  }}
                  title={nome}
                >
                  {nome}
                </span>

                <div className="relative h-5">
                  {/* perfis: as fronteiras entre classes */}
                  {perfis.map((p) => (
                    <span
                      key={p}
                      className="absolute top-0 h-full w-px"
                      style={{ left: `${p * 100}%`, background: "var(--borda-forte)" }}
                    />
                  ))}
                  {/* Atributo `title`, e nao um elemento <title>.
                      Dentro de um <div> o elemento nao e HTML valido, e o React
                      19 o trata como titulo de documento e o ica para o <head>:
                      a aba do navegador passava a dizer "Baixa: 0.000 a 0.000"
                      em vez do nome do produto. Numa barra de <svg> o elemento
                      e correto e fica onde esta -- aqui nao e svg. */}
                  <div
                    className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-[3px]"
                    title={t("viz.gantt.barra", {
                      nome,
                      de: lo.toFixed(3),
                      ate: hi.toFixed(3),
                    })}
                    style={{
                      left: `${lo * 100}%`,
                      width: `${Math.max((hi - lo) * 100, 1)}%`,
                      background: cor,
                      opacity: dados.definida ? 0.9 : 0.55,
                    }}
                  />
                </div>

                <span
                  className="w-32 truncate text-right text-[11px]"
                  style={{ color: dados.definida ? cor : "var(--tinta-fraca)" }}
                  title={dados.classes_possiveis.join(
                    ` ${t("resultado.sorting.ou")} `,
                  )}
                >
                  {dados.definida
                    ? dados.classes_possiveis[0]
                    : t("viz.gantt.classes", {
                        n: dados.classes_possiveis.length,
                      })}
                </span>
              </div>
            );
          })}
        </div>

        {/* escala */}
        <div className="mt-2 grid" style={{ gridTemplateColumns: "minmax(0,10rem) 1fr 8rem" }}>
          <span />
          <div className="relative h-4">
            {limites.map((v) => (
              <span
                key={v}
                className="num absolute text-[10px]"
                style={{
                  left: `${v * 100}%`,
                  transform: v === 0 ? "none" : v === 1 ? "translateX(-100%)" : "translateX(-50%)",
                  color: "var(--tinta-fraca)",
                }}
              >
                {v.toFixed(2)}
              </span>
            ))}
          </div>
          <span />
        </div>
      </div>
    </figure>
  );
}
