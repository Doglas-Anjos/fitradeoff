"use client";

/**
 * As visualizacoes de resultado do FITradeoff.
 *
 * No metodo elas nao sao enfeite: a avaliacao holistica -- em que o decisor
 * compara alternativas reais e declara qual prefere -- acontece olhando estes
 * graficos. Por isso sao tres formas da mesma matriz, e o decisor escolhe a que
 * lhe for mais legivel.
 *
 * Todas mostram o **valor intra-criterio** (0 = pior possivel, 1 = melhor
 * possivel), nao a consequencia bruta: reais e dias nao se sobrepoem num eixo.
 */

import { ChartBar, ChartPolar, Circle as CircleIcon, Table } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { Dica } from "@/components/ui";
import type { CriterioOut, Problema } from "@/lib/types";

/* A ordem e fixa e nunca reciclada: a cor identifica a alternativa, e uma
   alternativa desmarcada nao pode repintar as que sobraram. Os tres primeiros
   passam os limiares de daltonismo em todos os pares; do quarto em diante a
   leitura se apoia tambem no rotulo direto e na legenda. */
const SERIE = [
  "#2a78d6", "#eb6834", "#1baf7a", "#eda100",
  "#e87ba4", "#008300", "#4a3aa7", "#e34948",
];

const corDe = (indice: number) => SERIE[indice % SERIE.length];

type Aba = "barras" | "radar" | "bolhas" | "tabela";

const ABAS: { id: Aba; rotulo: string; Icone: typeof ChartBar }[] = [
  { id: "barras", rotulo: "Barras", Icone: ChartBar },
  { id: "radar", rotulo: "Radar", Icone: ChartPolar },
  { id: "bolhas", rotulo: "Bolhas", Icone: CircleIcon },
  { id: "tabela", rotulo: "Tabela", Icone: Table },
];

interface Serie {
  nome: string;
  cor: string;
  valores: number[];
}

/* --- barras ----------------------------------------------------------------- */

function Barras({ criterios, series }: { criterios: CriterioOut[]; series: Serie[] }) {
  const larguraGrupo = 100 / criterios.length;
  const larguraBarra = larguraGrupo / (series.length + 0.6);

  return (
    <svg viewBox="0 0 100 46" className="w-full" role="img" aria-label="Desempenho por critério">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={0} y1={40 - t * 36} x2={100} y2={40 - t * 36}
            stroke="var(--borda)" strokeWidth={0.15} />
          <text x={-0.5} y={40 - t * 36 + 1} fontSize={2} textAnchor="end"
            fill="var(--tinta-fraca)">{t}</text>
        </g>
      ))}
      {criterios.map((criterio, j) => (
        <g key={criterio.chave}>
          {series.map((serie, i) => {
            const altura = Math.max(serie.valores[j] * 36, 0.4);
            return (
              <rect
                key={serie.nome}
                x={j * larguraGrupo + 0.3 + i * larguraBarra}
                y={40 - altura}
                width={larguraBarra - 0.35 /* 2px de respiro entre barras */}
                height={altura}
                rx={0.5}
                fill={serie.cor}
              >
                <title>{`${serie.nome} · ${criterio.nome}: ${serie.valores[j].toFixed(3)}`}</title>
              </rect>
            );
          })}
          <text x={j * larguraGrupo + larguraGrupo / 2} y={44} fontSize={2}
            textAnchor="middle" fill="var(--tinta-3)">
            {criterio.nome.length > 14 ? criterio.nome.slice(0, 13) + "…" : criterio.nome}
          </text>
        </g>
      ))}
      <line x1={0} y1={40} x2={100} y2={40} stroke="var(--borda-forte)" strokeWidth={0.25} />
    </svg>
  );
}

/* --- radar ------------------------------------------------------------------ */

function Radar({ criterios, series }: { criterios: CriterioOut[]; series: Serie[] }) {
  const n = criterios.length;
  const centro = 50;
  const raio = 33;
  // comeca no topo e segue em sentido horario, como no sistema de referencia
  const ponto = (indice: number, valor: number) => {
    const angulo = (indice / n) * 2 * Math.PI - Math.PI / 2;
    return [
      centro + Math.cos(angulo) * raio * valor,
      centro + Math.sin(angulo) * raio * valor,
    ] as const;
  };

  return (
    <svg viewBox="0 0 100 100" className="mx-auto w-full max-w-md" role="img"
      aria-label="Desempenho por critério, em radar">
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <polygon key={t}
          points={criterios.map((_, i) => ponto(i, t).join(",")).join(" ")}
          fill="none" stroke="var(--borda)" strokeWidth={0.3} />
      ))}
      {criterios.map((criterio, i) => {
        const [x, y] = ponto(i, 1);
        const [tx, ty] = ponto(i, 1.22);
        return (
          <g key={criterio.chave}>
            <line x1={centro} y1={centro} x2={x} y2={y} stroke="var(--borda)" strokeWidth={0.3} />
            <text x={tx} y={ty} fontSize={2.6} textAnchor="middle" fill="var(--tinta-3)">
              {criterio.nome.length > 12 ? criterio.nome.slice(0, 11) + "…" : criterio.nome}
            </text>
          </g>
        );
      })}
      {series.map((serie) => (
        <polygon key={serie.nome}
          points={serie.valores.map((v, i) => ponto(i, v).join(",")).join(" ")}
          fill={serie.cor} fillOpacity={0.12} stroke={serie.cor} strokeWidth={0.7}>
          <title>{serie.nome}</title>
        </polygon>
      ))}
    </svg>
  );
}

/* --- bolhas ----------------------------------------------------------------- */

function Bolhas({ criterios, series }: { criterios: CriterioOut[]; series: Serie[] }) {
  const passoX = 100 / criterios.length;
  return (
    <svg viewBox="0 0 100 46" className="w-full" role="img"
      aria-label="Desempenho por critério, em bolhas">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={0} y1={40 - t * 36} x2={100} y2={40 - t * 36}
            stroke="var(--borda)" strokeWidth={0.15} />
          <text x={-0.5} y={40 - t * 36 + 1} fontSize={2} textAnchor="end"
            fill="var(--tinta-fraca)">{t}</text>
        </g>
      ))}
      {criterios.map((criterio, j) => (
        <g key={criterio.chave}>
          {series.map((serie, i) => {
            const deslocamento = (i - (series.length - 1) / 2) * (passoX / (series.length + 2));
            const valor = serie.valores[j];
            return (
              <circle key={serie.nome}
                cx={j * passoX + passoX / 2 + deslocamento}
                cy={40 - valor * 36}
                // area proporcional ao valor, com piso visivel
                r={1 + Math.sqrt(valor) * 2.2}
                fill={serie.cor} fillOpacity={0.75}
                stroke="var(--painel)" strokeWidth={0.35}
              >
                <title>{`${serie.nome} · ${criterio.nome}: ${valor.toFixed(3)}`}</title>
              </circle>
            );
          })}
          <text x={j * passoX + passoX / 2} y={44} fontSize={2} textAnchor="middle"
            fill="var(--tinta-3)">
            {criterio.nome.length > 14 ? criterio.nome.slice(0, 13) + "…" : criterio.nome}
          </text>
        </g>
      ))}
      <line x1={0} y1={40} x2={100} y2={40} stroke="var(--borda-forte)" strokeWidth={0.25} />
    </svg>
  );
}

/* --- tabela ----------------------------------------------------------------- */

function Tabela({
  criterios,
  series,
  problema,
}: {
  criterios: CriterioOut[];
  series: Serie[];
  problema: Problema;
}) {
  const [normalizado, setNormalizado] = useState(true);
  return (
    <div>
      <label className="mb-3 flex items-center gap-2 text-[12px]" style={{ color: "var(--tinta-3)" }}>
        <input type="checkbox" checked={normalizado}
          onChange={(e) => setNormalizado(e.target.checked)} />
        mostrar valor normalizado (0 a 1) em vez da unidade original
      </label>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ color: "var(--tinta-fraca)" }}>
              <th className="py-1.5 text-left font-normal">Alternativa</th>
              {criterios.map((c) => (
                <th key={c.chave} className="py-1.5 text-right font-normal">
                  {c.nome}
                  {!normalizado && c.unidade && (
                    <span className="block text-[10px]">{c.unidade}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {series.map((serie) => (
              <tr key={serie.nome} className="border-t" style={{ borderColor: "var(--borda)" }}>
                <td className="py-1.5">
                  <span className="flex items-center gap-2" style={{ color: "var(--tinta-2)" }}>
                    <span aria-hidden className="h-2.5 w-2.5 rounded-[2px]"
                      style={{ background: serie.cor }} />
                    {serie.nome}
                  </span>
                </td>
                {criterios.map((c, j) => (
                  <td key={c.chave} className="num py-1.5 text-right"
                    style={{ color: "var(--tinta-2)" }}>
                    {normalizado
                      ? serie.valores[j].toFixed(3)
                      : problema.consequencias[serie.nome][c.chave]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --- painel ----------------------------------------------------------------- */

export function Visualizacoes({
  problema,
  destaque,
}: {
  problema: Problema;
  /** Alternativas a exibir por padrão — em geral as ainda em disputa. */
  destaque?: string[];
}) {
  const [aba, setAba] = useState<Aba>("barras");
  const [esconderEmpates, setEsconderEmpates] = useState(true);
  const todas = Object.keys(problema.valores ?? problema.consequencias);
  const [visiveis, setVisiveis] = useState<string[]>(
    destaque && destaque.length ? destaque : todas,
  );

  const criterios = useMemo(() => {
    if (!esconderEmpates) return problema.criterios;
    // um criterio em que todas empatam nao distingue nada e so ocupa espaco
    return problema.criterios.filter((c) => {
      const vals = todas.map((a) => problema.valores?.[a]?.[c.chave] ?? 0);
      return new Set(vals.map((v) => v.toFixed(6))).size > 1;
    });
  }, [problema, esconderEmpates, todas]);

  const series: Serie[] = useMemo(
    () =>
      todas
        .map((nome, i) => ({ nome, cor: corDe(i), indice: i }))
        .filter((s) => visiveis.includes(s.nome))
        .map((s) => ({
          nome: s.nome,
          cor: s.cor,
          valores: criterios.map((c) => problema.valores?.[s.nome]?.[c.chave] ?? 0),
        })),
    [todas, visiveis, criterios, problema],
  );

  const alternar = (nome: string) =>
    setVisiveis((atual) =>
      atual.includes(nome) ? atual.filter((n) => n !== nome) : [...atual, nome],
    );

  const escondidos = problema.criterios.length - criterios.length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {ABAS.map(({ id, rotulo, Icone }) => {
            const ativa = aba === id;
            return (
              <button key={id} onClick={() => setAba(id)}
                className="tatil flex items-center gap-1.5 rounded-[var(--raio-controle)] px-2.5 py-1.5 text-[12px]"
                style={{
                  background: ativa ? "var(--painel-fundo)" : "transparent",
                  color: ativa ? "var(--tinta)" : "var(--tinta-3)",
                  fontWeight: ativa ? 500 : 400,
                }}>
                <Icone size={14} weight={ativa ? "fill" : "regular"} />
                {rotulo}
              </button>
            );
          })}
        </div>
        <Dica titulo="Para que servem">
          <p>
            É com estes gráficos que você faz a <strong>avaliação holística</strong>:
            olha duas alternativas reais e declara qual prefere.
          </p>
          <p>
            Todas mostram o valor de 0 a 1 — pior a melhor dentro de cada
            critério. Reais e dias não caberiam no mesmo eixo.
          </p>
        </Dica>
      </div>

      {/* quais alternativas entram no grafico */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {todas.map((nome, i) => {
          const ativa = visiveis.includes(nome);
          return (
            <label key={nome} className="flex cursor-pointer items-center gap-1.5 text-[12px]">
              <input type="checkbox" checked={ativa} onChange={() => alternar(nome)}
                className="sr-only" />
              <span aria-hidden className="h-3 w-3 rounded-[2px] transition-opacity"
                style={{ background: corDe(i), opacity: ativa ? 1 : 0.25 }} />
              <span style={{
                color: ativa ? "var(--tinta-2)" : "var(--tinta-fraca)",
                textDecoration: ativa ? "none" : "line-through",
              }}>{nome}</span>
            </label>
          );
        })}
      </div>

      <div className="rounded-[var(--raio-painel)] border p-5"
        style={{ borderColor: "var(--borda)", background: "var(--painel)" }}>
        {series.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: "var(--tinta-3)" }}>
            Marque ao menos uma alternativa para ver o gráfico.
          </p>
        ) : aba === "barras" ? (
          <Barras criterios={criterios} series={series} />
        ) : aba === "radar" ? (
          <Radar criterios={criterios} series={series} />
        ) : aba === "bolhas" ? (
          <Bolhas criterios={criterios} series={series} />
        ) : (
          <Tabela criterios={criterios} series={series} problema={problema} />
        )}
      </div>

      <label className="mt-3 flex items-center gap-2 text-[12px]" style={{ color: "var(--tinta-3)" }}>
        <input type="checkbox" checked={esconderEmpates}
          onChange={(e) => setEsconderEmpates(e.target.checked)} />
        esconder critérios em que todas empatam
        {escondidos > 0 && (
          <span style={{ color: "var(--tinta-fraca)" }}>({escondidos} escondido{escondidos > 1 ? "s" : ""})</span>
        )}
      </label>
    </div>
  );
}
