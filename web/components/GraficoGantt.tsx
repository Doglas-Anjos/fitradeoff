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

export interface AlocacaoItem {
  faixa_de_valor: [number, number];
  classes_possiveis: string[];
  definida: boolean;
}

const CORES_CLASSE = ["#2a78d6", "#1baf7a", "#eda100", "#eb6834", "#4a3aa7"];

export function GraficoGantt({
  alocacao,
  perfis,
  classes,
}: {
  alocacao: Record<string, AlocacaoItem>;
  perfis: number[];
  classes: string[];
}) {
  const itens = Object.entries(alocacao).sort(
    (a, b) => b[1].faixa_de_valor[0] - a[1].faixa_de_valor[0],
  );
  const limites = [0, ...perfis, 1];

  return (
    <figure className="m-0">
      <figcaption className="mb-4 flex items-center gap-1.5">
        <span className="text-[13px] font-medium" style={{ color: "var(--tinta-2)" }}>
          Faixa de valor e classe de cada alternativa
        </span>
        <Dica titulo="Como ler">
          <p>
            A barra vai do menor ao maior valor global que a alternativa pode
            ter, dado o que você já respondeu.
          </p>
          <p>
            Barra inteira dentro de uma faixa: alternativa classificada. Barra
            atravessando um perfil: ainda indefinida — e você vê por quanto.
          </p>
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
                color: CORES_CLASSE[i % CORES_CLASSE.length],
              }}
              title={`${classe}: de ${limites[i].toFixed(2)} a ${limites[i + 1].toFixed(2)}`}
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
              ? CORES_CLASSE[Math.max(classeIndice, 0) % CORES_CLASSE.length]
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
                  <div
                    className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-[3px]"
                    style={{
                      left: `${lo * 100}%`,
                      width: `${Math.max((hi - lo) * 100, 1)}%`,
                      background: cor,
                      opacity: dados.definida ? 0.9 : 0.55,
                    }}
                  >
                    <title>{`${nome}: ${lo.toFixed(3)} a ${hi.toFixed(3)}`}</title>
                  </div>
                </div>

                <span
                  className="w-32 truncate text-right text-[11px]"
                  style={{ color: dados.definida ? cor : "var(--tinta-fraca)" }}
                  title={dados.classes_possiveis.join(" ou ")}
                >
                  {dados.definida
                    ? dados.classes_possiveis[0]
                    : `${dados.classes_possiveis.length} classes`}
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
