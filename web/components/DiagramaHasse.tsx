"use client";

/**
 * Diagrama de Hasse: como o metodo le um ranking parcial.
 *
 * Uma seta de X para Y significa "X domina Y para qualquer conjunto de pesos
 * ainda viavel". Alternativas lado a lado no mesmo nivel sao incomparaveis:
 * trocam de posicao conforme os pesos, e decidir entre elas exige mais
 * informacao.
 *
 * So as arestas de cobertura aparecem. Se X domina Y e Y domina Z, a seta de X
 * para Z e verdadeira mas redundante -- desenha-la transformaria o diagrama num
 * emaranhado e esconderia exatamente o que ele existe para mostrar.
 */

import { Dica } from "@/components/ui";

interface Aresta {
  de: string;
  para: string;
}

const LARGURA_NO = 116;
const ALTURA_NO = 30;
const ESPACO_X = 22;
const ESPACO_Y = 58;
const MARGEM = 12;

export function DiagramaHasse({
  niveis,
  arestas,
  destaque,
}: {
  niveis: string[][];
  arestas: Aresta[];
  destaque?: string | null;
}) {
  if (!niveis.length) return null;

  const maiorNivel = Math.max(...niveis.map((n) => n.length));
  const largura = maiorNivel * LARGURA_NO + (maiorNivel - 1) * ESPACO_X + MARGEM * 2;
  const altura = niveis.length * ALTURA_NO + (niveis.length - 1) * ESPACO_Y + MARGEM * 2;

  // posicao de cada alternativa: nivel define a linha, e cada linha centraliza
  const posicao = new Map<string, { x: number; y: number }>();
  niveis.forEach((nivel, linha) => {
    const larguraLinha = nivel.length * LARGURA_NO + (nivel.length - 1) * ESPACO_X;
    const inicio = (largura - larguraLinha) / 2;
    nivel.forEach((nome, coluna) => {
      posicao.set(nome, {
        x: inicio + coluna * (LARGURA_NO + ESPACO_X),
        y: MARGEM + linha * (ALTURA_NO + ESPACO_Y),
      });
    });
  });

  return (
    <figure className="m-0">
      <figcaption className="mb-3 flex items-center gap-1.5">
        <span className="text-[13px] font-medium" style={{ color: "var(--tinta-2)" }}>
          Relações de dominância
        </span>
        <Dica titulo="Como ler o diagrama">
          <p>
            Uma seta de <strong>X para Y</strong> significa que X vence Y para
            qualquer conjunto de pesos ainda possível — não depende de mais
            nenhuma resposta sua.
          </p>
          <p>
            Alternativas <strong>lado a lado</strong> são incomparáveis: trocam
            de posição conforme os pesos. É entre elas que falta informação.
          </p>
          <p style={{ color: "var(--tinta-3)" }}>
            Setas redundantes são omitidas: se X vence Y e Y vence Z, a seta de
            X para Z fica subentendida.
          </p>
        </Dica>
      </figcaption>

      <div className="overflow-x-auto">
        <svg
          width={largura}
          height={altura}
          viewBox={`0 0 ${largura} ${altura}`}
          role="img"
          aria-label="Diagrama de dominância entre as alternativas"
          className="max-w-full"
        >
          <defs>
            <marker
              id="ponta" markerWidth="7" markerHeight="7"
              refX="6.2" refY="2.4" orient="auto"
            >
              <path d="M0,0 L6,2.4 L0,4.8 Z" fill="var(--borda-forte)" />
            </marker>
          </defs>

          {arestas.map(({ de, para }) => {
            const a = posicao.get(de);
            const b = posicao.get(para);
            if (!a || !b) return null;
            return (
              <line
                key={`${de}->${para}`}
                x1={a.x + LARGURA_NO / 2}
                y1={a.y + ALTURA_NO}
                x2={b.x + LARGURA_NO / 2}
                y2={b.y - 2}
                stroke="var(--borda-forte)"
                strokeWidth={1.2}
                markerEnd="url(#ponta)"
              >
                <title>{`${de} vence ${para}`}</title>
              </line>
            );
          })}

          {niveis.flatMap((nivel, linha) =>
            nivel.map((nome) => {
              const p = posicao.get(nome)!;
              const realcado = nome === destaque;
              return (
                <g key={nome}>
                  <rect
                    x={p.x} y={p.y}
                    width={LARGURA_NO} height={ALTURA_NO}
                    rx={6}
                    fill={realcado ? "var(--accent-suave)" : "var(--painel)"}
                    stroke={realcado ? "var(--accent)" : "var(--borda-forte)"}
                    strokeWidth={realcado ? 1.5 : 1}
                  />
                  <text
                    x={p.x + LARGURA_NO / 2}
                    y={p.y + ALTURA_NO / 2 + 4}
                    fontSize={11.5}
                    textAnchor="middle"
                    fill={realcado ? "var(--accent)" : "var(--tinta-2)"}
                    fontWeight={realcado ? 600 : 400}
                  >
                    {nome.length > 16 ? `${nome.slice(0, 15)}…` : nome}
                  </text>
                  <title>{`${nome} — nível ${linha + 1}`}</title>
                </g>
              );
            }),
          )}
        </svg>
      </div>

      {/* a leitura nao pode depender de enxergar o grafo */}
      <details className="mt-3">
        <summary className="cursor-pointer text-[11px]" style={{ color: "var(--tinta-fraca)" }}>
          Ver como lista
        </summary>
        <ol className="mt-2 space-y-1 text-[12px]" style={{ color: "var(--tinta-2)" }}>
          {niveis.map((nivel, i) => (
            <li key={i}>
              <span className="num" style={{ color: "var(--tinta-fraca)" }}>
                nível {i + 1}:
              </span>{" "}
              {nivel.join(", ")}
              {nivel.length > 1 && (
                <span style={{ color: "var(--tinta-fraca)" }}> (incomparáveis entre si)</span>
              )}
            </li>
          ))}
        </ol>
      </details>
    </figure>
  );
}
