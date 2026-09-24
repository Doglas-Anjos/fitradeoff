"use client";

/**
 * Avaliação intra-critério: a curva de valor de um critério.
 *
 * O método não supõe que valor cresce linearmente com desempenho. Ir de 45 para
 * 30 dias pode valer muito mais do que ir de 30 para 15 — e é essa curva, não a
 * reta, que entra no modelo aditivo.
 *
 * A elicitação é por bisseção: dado um intervalo, qual desempenho fica no meio
 * do caminho *em valor*? Cada resposta fixa um ponto. Quem não quiser responder
 * fica com a reta, que é o padrão e continua sendo uma escolha legítima.
 */

import { ArrowCounterClockwise, Check, TrendUp } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { Botao, Dica, Entrada } from "@/components/ui";
import type { CriterioOut } from "@/lib/types";

export type Ponto = [consequencia: number, valor: number];

const LARGURA = 260;
const ALTURA = 170;
const MARGEM = { topo: 12, dir: 12, baixo: 28, esq: 36 };

function formatar(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toPrecision(4).replace(/\.?0+$/, "");
}

function Grafico({
  pontos,
  criterio,
  proposta,
}: {
  pontos: Ponto[];
  criterio: CriterioOut;
  proposta?: number | null;
}) {
  const largura = LARGURA - MARGEM.esq - MARGEM.dir;
  const altura = ALTURA - MARGEM.topo - MARGEM.baixo;
  const [pior, melhor] = [criterio.pior, criterio.melhor];

  const x = (consequencia: number) =>
    MARGEM.esq + ((consequencia - pior) / (melhor - pior)) * largura;
  const y = (valor: number) => MARGEM.topo + (1 - valor) * altura;

  const ordenados = [...pontos].sort((a, b) => a[1] - b[1]);
  const caminho = ordenados.map(([c, v]) => `${x(c)},${y(v)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      className="w-full max-w-sm"
      role="img"
      aria-label={`Curva de valor de ${criterio.nome}`}
    >
      {[0, 0.5, 1].map((v) => (
        <g key={v}>
          <line x1={MARGEM.esq} y1={y(v)} x2={LARGURA - MARGEM.dir} y2={y(v)}
            stroke="var(--borda)" strokeWidth={0.5} />
          <text x={MARGEM.esq - 5} y={y(v) + 3} fontSize={7} textAnchor="end"
            fill="var(--tinta-fraca)">{v}</text>
        </g>
      ))}

      {/* a reta que se assumiria sem elicitar nada */}
      <line
        x1={x(pior)} y1={y(0)} x2={x(melhor)} y2={y(1)}
        stroke="var(--tinta-fraca)" strokeWidth={0.8} strokeDasharray="3 3"
      />

      {proposta != null && (
        <line x1={x(proposta)} y1={MARGEM.topo} x2={x(proposta)} y2={ALTURA - MARGEM.baixo}
          stroke="var(--accent)" strokeWidth={0.8} strokeDasharray="2 2" />
      )}

      <polyline points={caminho} fill="none" stroke="var(--dado-a)" strokeWidth={1.8} />
      {ordenados.map(([c, v]) => (
        <circle key={`${c}-${v}`} cx={x(c)} cy={y(v)} r={2.6}
          fill="var(--dado-a)" stroke="var(--painel)" strokeWidth={1}>
          <title>{`${formatar(c)} ${criterio.unidade} vale ${v.toFixed(2)}`}</title>
        </circle>
      ))}

      <text x={MARGEM.esq} y={ALTURA - 8} fontSize={7} fill="var(--tinta-fraca)">
        {formatar(pior)} (pior)
      </text>
      <text x={LARGURA - MARGEM.dir} y={ALTURA - 8} fontSize={7} textAnchor="end"
        fill="var(--tinta-fraca)">
        {formatar(melhor)} (melhor)
      </text>
    </svg>
  );
}

export function CurvaDeValor({
  criterio,
  inicial,
  onSalvar,
  onCancelar,
}: {
  criterio: CriterioOut;
  inicial?: Ponto[];
  onSalvar: (pontos: Ponto[] | null) => void;
  onCancelar: () => void;
}) {
  const [pontos, setPontos] = useState<Ponto[]>(
    inicial ?? [
      [criterio.pior, 0],
      [criterio.melhor, 1],
    ],
  );
  const [resposta, setResposta] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  /* A próxima pergunta cai no maior vão de valor ainda sem ponto: é onde a
     reta pode estar mais longe da verdade. */
  const vao = useMemo(() => {
    const ordenados = [...pontos].sort((a, b) => a[1] - b[1]);
    let maior: [Ponto, Ponto] | null = null;
    for (let i = 0; i < ordenados.length - 1; i++) {
      const largura = ordenados[i + 1][1] - ordenados[i][1];
      if (largura > 0.2 && (!maior || largura > maior[1][1] - maior[0][1])) {
        maior = [ordenados[i], ordenados[i + 1]];
      }
    }
    return maior;
  }, [pontos]);

  const alvo = vao ? (vao[0][1] + vao[1][1]) / 2 : null;
  const entreOnde = vao
    ? { de: vao[0][0], ate: vao[1][0], deValor: vao[0][1], ateValor: vao[1][1] }
    : null;

  const registrar = () => {
    if (!entreOnde || alvo == null) return;
    const numero = Number(resposta.replace(",", "."));
    if (!Number.isFinite(numero)) {
      return setErro("Informe um número na unidade do critério.");
    }
    const [menor, maior] = [
      Math.min(entreOnde.de, entreOnde.ate),
      Math.max(entreOnde.de, entreOnde.ate),
    ];
    if (numero <= menor || numero >= maior) {
      return setErro(
        `O desempenho precisa ficar entre ${formatar(menor)} e ${formatar(maior)}.`,
      );
    }
    setErro(null);
    setResposta("");
    setPontos([...pontos, [numero, alvo]]);
  };

  const elicitados = pontos.length - 2;

  return (
    <div
      className="rounded-[var(--raio-painel)] border p-5"
      style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <TrendUp size={16} style={{ color: "var(--tinta-3)" }} />
        <h3 className="text-[15px] font-semibold" style={{ color: "var(--tinta)" }}>
          Curva de valor — {criterio.nome}
        </h3>
        <Dica titulo="Por que isto importa">
          <p>
            Sem elicitar, o método assume que valor cresce em linha reta com o
            desempenho — a linha pontilhada no gráfico.
          </p>
          <p>
            Mas ir de 45 para 30 dias pode valer muito mais que ir de 30 para
            15. Cada resposta aqui corrige essa suposição.
          </p>
          <p style={{ color: "var(--tinta-3)" }}>
            Pular é legítimo: a reta continua sendo uma escolha razoável.
          </p>
        </Dica>
      </div>

      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
        <Grafico
          pontos={pontos}
          criterio={criterio}
          proposta={entreOnde ? (entreOnde.de + entreOnde.ate) / 2 : null}
        />

        <div className="min-w-0 flex-1">
          {entreOnde ? (
            <>
              <p className="prosa text-[13px]" style={{ color: "var(--tinta-2)" }}>
                Entre{" "}
                <strong style={{ color: "var(--tinta)" }}>
                  {formatar(entreOnde.de)} {criterio.unidade}
                </strong>{" "}
                e{" "}
                <strong style={{ color: "var(--tinta)" }}>
                  {formatar(entreOnde.ate)} {criterio.unidade}
                </strong>
                , qual desempenho fica <strong>no meio do caminho em valor</strong>?
              </p>
              <p className="mt-1.5 text-[12px]" style={{ color: "var(--tinta-3)" }}>
                Ou seja: sair de {formatar(entreOnde.de)} até ali vale tanto
                quanto sair dali até {formatar(entreOnde.ate)}.
              </p>

              <div className="mt-3 flex items-center gap-2">
                <Entrada
                  value={resposta}
                  onChange={(e) => setResposta(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && registrar()}
                  inputMode="decimal"
                  placeholder={formatar((entreOnde.de + entreOnde.ate) / 2)}
                  aria-label={`Desempenho intermediário em ${criterio.nome}`}
                  className="num !w-28 text-right"
                  invalido={!!erro}
                />
                <span className="text-[13px]" style={{ color: "var(--tinta-3)" }}>
                  {criterio.unidade}
                </span>
                <Botao onClick={registrar} variante="contorno">
                  Registrar
                </Botao>
              </div>
              {erro && (
                <p className="mt-2 text-[12px]" style={{ color: "var(--erro)" }}>
                  {erro}
                </p>
              )}
            </>
          ) : (
            <p className="text-[13px]" style={{ color: "var(--tinta-2)" }}>
              A curva já está detalhada o bastante. Salve para usá-la na decisão.
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Botao
              onClick={() => onSalvar(elicitados > 0 ? pontos : null)}
              icone={<Check size={14} weight="bold" />}
            >
              {elicitados > 0 ? `Usar esta curva (${elicitados} pontos)` : "Usar a reta"}
            </Botao>
            {elicitados > 0 && (
              <button
                onClick={() =>
                  setPontos([[criterio.pior, 0], [criterio.melhor, 1]])
                }
                className="tatil flex items-center gap-1.5 text-[13px]"
                style={{ color: "var(--tinta-3)" }}
              >
                <ArrowCounterClockwise size={13} weight="bold" />
                recomeçar
              </button>
            )}
            <button
              onClick={onCancelar}
              className="text-[13px] underline underline-offset-2"
              style={{ color: "var(--tinta-fraca)" }}
            >
              cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
