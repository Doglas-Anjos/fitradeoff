"use client";

/**
 * Faixas de valor e de peso.
 *
 * Com informacao parcial nenhuma dessas grandezas e um numero: o que existe e
 * um intervalo dentro do qual ela pode cair. Desenhar a barra do minimo ao
 * maximo -- e nao do zero a uma media -- e o que mantem a leitura honesta.
 *
 * Feito em HTML e nao em SVG de proposito: num SVG escalado por viewBox o texto
 * cresce junto com o desenho, e os rotulos ficam desproporcionais ao resto da
 * pagina. Em HTML a tipografia obedece a mesma escala do documento.
 *
 * Serie unica, entao nao ha legenda: o titulo nomeia o que esta sendo medido.
 */

import { useState } from "react";

import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/visualizacoes";

export interface Faixa {
  rotulo: string;
  minimo: number;
  maximo: number;
  destaque?: boolean;
}

const MARCAS = [0, 0.25, 0.5, 0.75, 1];

export function RangeChart({
  titulo,
  dica,
  faixas,
  maximoEixo = 1,
  formatar: formatarDado,
}: {
  titulo: string;
  dica?: React.ReactNode;
  faixas: Faixa[];
  maximoEixo?: number;
  formatar?: (valor: number) => string;
}) {
  const { t, n } = useIdioma();
  const formatar = formatarDado ?? ((v: number) => n(v, 3));
  const [ativo, setAtivo] = useState<string | null>(null);

  return (
    <figure className="m-0">
      <figcaption className="mb-4 flex items-center gap-1.5">
        <span className="text-[13px] font-medium" style={{ color: "var(--tinta-2)" }}>
          {titulo}
        </span>
        {dica}
      </figcaption>

      <div className="space-y-1">
        {faixas.map((faixa) => {
          const esquerda = (faixa.minimo / maximoEixo) * 100;
          const largura = Math.max(
            ((faixa.maximo - faixa.minimo) / maximoEixo) * 100,
            0.8,
          );
          const realcado = ativo === faixa.rotulo;

          return (
            <div
              key={faixa.rotulo}
              onMouseEnter={() => setAtivo(faixa.rotulo)}
              onMouseLeave={() => setAtivo(null)}
              className="grid items-center gap-3 rounded-[var(--raio-controle)] py-1.5 transition-colors"
              style={{
                gridTemplateColumns: "minmax(0,11rem) 1fr auto",
                background: realcado ? "var(--painel-fundo)" : "transparent",
              }}
            >
              <span
                className="truncate text-[13px]"
                style={{
                  color: faixa.destaque
                    ? "var(--tinta)"
                    : faixa.destaque === false
                      ? "var(--tinta-fraca)"
                      : "var(--tinta-2)",
                  fontWeight: faixa.destaque ? 500 : 400,
                }}
                title={faixa.rotulo}
              >
                {faixa.rotulo}
              </span>

              {/* trilho com marcas de grade recessivas */}
              <div className="relative h-5">
                <div className="absolute inset-0 flex justify-between">
                  {MARCAS.map((t) => (
                    <span
                      key={t}
                      className="w-px"
                      style={{ background: "var(--borda)" }}
                    />
                  ))}
                </div>
                <div
                  className="absolute top-1/2 h-2 -translate-y-1/2 rounded-[3px] transition-[left,width] duration-300"
                  style={{
                    left: `${esquerda}%`,
                    width: `${largura}%`,
                    background: "var(--dado-a)",
                    opacity: faixa.destaque === false ? 0.4 : 1,
                  }}
                />
              </div>

              <span
                className="num w-28 text-right text-[11px] tabular-nums"
                style={{
                  color: realcado ? "var(--tinta-2)" : "var(--tinta-fraca)",
                }}
              >
                {formatar(faixa.minimo)}–{formatar(faixa.maximo)}
              </span>
            </div>
          );
        })}
      </div>

      {/* escala do eixo, alinhada ao trilho */}
      <div
        className="grid gap-3 pt-1.5"
        style={{ gridTemplateColumns: "minmax(0,11rem) 1fr 7rem" }}
      >
        <span />
        <div className="flex justify-between">
          {MARCAS.map((t) => (
            <span
              key={t}
              className="num text-[10px]"
              style={{ color: "var(--tinta-fraca)" }}
            >
              {formatar(t * maximoEixo)}
            </span>
          ))}
        </div>
        <span />
      </div>

      {/* a leitura nao depende de enxergar a barra */}
      <details className="mt-3">
        <summary
          className="cursor-pointer text-[11px]"
          style={{ color: "var(--tinta-fraca)" }}
        >
          {t("faixa.verTabela")}
        </summary>
        <table className="mt-2 w-full text-[12px]">
          <thead>
            <tr style={{ color: "var(--tinta-fraca)" }}>
              <th className="py-1 text-left font-normal">{t("faixa.item")}</th>
              <th className="py-1 text-right font-normal">{t("faixa.minimo")}</th>
              <th className="py-1 text-right font-normal">{t("faixa.maximo")}</th>
            </tr>
          </thead>
          <tbody>
            {faixas.map((f) => (
              <tr key={f.rotulo} style={{ color: "var(--tinta-2)" }}>
                <td className="py-1">{f.rotulo}</td>
                <td className="num py-1 text-right">{formatar(f.minimo)}</td>
                <td className="num py-1 text-right">{formatar(f.maximo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
