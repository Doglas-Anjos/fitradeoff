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
 *
 * Barras e pontos sao HTML, nao SVG escalado por viewBox. Num SVG com viewBox
 * o texto cresce junto com o desenho: os rotulos ficavam desproporcionais ao
 * resto da pagina, os nomes de criterio precisavam ser cortados em 13 letras e
 * os numeros do eixo, ancorados em x negativo, caiam fora da viewBox e nunca
 * chegaram a aparecer -- o grafico tinha grade e nenhuma escala. Em HTML a
 * tipografia obedece a escala do documento e nada e recortado. O radar
 * continua em SVG, que e a forma natural de um desenho polar, mas com os
 * rotulos em HTML por cima, pelo mesmo motivo.
 */

import { ChartBar, ChartPolar, Circle as CircleIcon, Table } from "@phosphor-icons/react";
import { createContext, useContext, useMemo, useState } from "react";

import { Dica } from "@/components/ui";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/visualizacoes";
import { corDaSerie } from "@/lib/serie";
import type { CriterioOut, Problema } from "@/lib/types";

type Aba = "barras" | "radar" | "bolhas" | "tabela";

interface Serie {
  nome: string;
  cor: string;
  valores: number[];
}

/* --- o que todos os graficos leem ----------------------------------------------

   Os quatro graficos desenham a mesma matriz filtrada. Antes cada um recebia
   `criterios`, `series`, `ativo` e `aoApontar` por propriedade, repassados de
   novo a `Moldura` -- e o radar e a tabela recebiam parte disso so para
   ignorar. Um contexto interno, montado uma vez pelo painel, deixa cada grafico
   pedir o que usa. Nao sai deste arquivo: fora do painel ele nao tem sentido. */

interface Visualizacao {
  problema: Problema;
  criterios: CriterioOut[];
  series: Serie[];
  /** Criterio sob o ponteiro ou o foco, lido na faixa de leitura. */
  ativo: string | null;
  aoApontar: (chave: string | null) => void;
}

const ContextoVisualizacao = createContext<Visualizacao | null>(null);

function useVisualizacao(): Visualizacao {
  const ctx = useContext(ContextoVisualizacao);
  if (!ctx) throw new Error("grafico fora de <Visualizacoes>");
  return ctx;
}

const MARCAS = [0, 0.25, 0.5, 0.75, 1];
const ALTURA_PLANO = 224; // px reais: a altura nao depende da largura da coluna
const CALHA = "2.4rem"; // largura reservada aos numeros do eixo

/* --- moldura compartilhada ---------------------------------------------------
   Barras e pontos sao a mesma leitura com marcas diferentes: mesmo eixo, mesma
   grade, mesmos rotulos, mesma faixa de leitura. Desenhar a moldura uma vez e o
   que faz as duas abas parecerem o mesmo produto em vez de dois graficos que
   por acaso convivem. */

function Moldura({
  children,
}: {
  children: (criterio: CriterioOut, indice: number) => React.ReactNode;
}) {
  const { t, n } = useIdioma();
  const { criterios, series, ativo, aoApontar } = useVisualizacao();
  const emFoco = criterios.find((c) => c.chave === ativo);

  return (
    <div>
      {/* Faixa de leitura: ocupa altura fixa mesmo vazia, entao apontar o mouse
          nao empurra o grafico. Vazia, ela explica o que fazer; e o unico lugar
          da tela que diz o que o eixo vertical significa. */}
      <div
        className="mb-3 flex h-5 items-center gap-3 overflow-hidden whitespace-nowrap text-[11px]"
        aria-live="polite"
      >
        {emFoco ? (
          <>
            <span className="font-medium" style={{ color: "var(--tinta)" }}>
              {emFoco.nome}
            </span>
            {series.map((serie, i) => (
              <span key={serie.nome} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-[2px]"
                  style={{ background: serie.cor }}
                />
                <span style={{ color: "var(--tinta-3)" }}>{serie.nome}</span>
                <span className="num" style={{ color: "var(--tinta)" }}>
                  {n(serie.valores[criterios.indexOf(emFoco)], 3)}
                </span>
                {i < series.length - 1 && (
                  <span style={{ color: "var(--borda-forte)" }}>·</span>
                )}
              </span>
            ))}
          </>
        ) : (
          <span style={{ color: "var(--tinta-fraca)" }}>{t("viz.eixo.legenda")}</span>
        )}
      </div>

      <div className="flex gap-2">
        {/* numeros do eixo, em tipografia do documento */}
        <div className="relative shrink-0" style={{ height: ALTURA_PLANO, width: CALHA }}>
          {MARCAS.map((m) => (
            <span
              key={m}
              className="num absolute right-0 text-[10px] leading-none"
              style={{
                bottom: `${m * 100}%`,
                transform: "translateY(50%)",
                color: "var(--tinta-fraca)",
              }}
            >
              {n(m, 2)}
            </span>
          ))}
        </div>

        <div className="relative flex-1" style={{ height: ALTURA_PLANO }}>
          {MARCAS.map((m) => (
            <span
              key={m}
              aria-hidden
              className="absolute inset-x-0 h-px"
              style={{
                bottom: `${m * 100}%`,
                background: m === 0 ? "var(--borda-forte)" : "var(--borda)",
              }}
            />
          ))}

          <div
            className="absolute inset-0 grid"
            style={{
              gridTemplateColumns: `repeat(${criterios.length},minmax(0,1fr))`,
            }}
          >
            {criterios.map((criterio, j) => (
              <div
                key={criterio.chave}
                onMouseEnter={() => aoApontar(criterio.chave)}
                onMouseLeave={() => aoApontar(null)}
                onFocus={() => aoApontar(criterio.chave)}
                onBlur={() => aoApontar(null)}
                tabIndex={0}
                /* focável para o teclado ver a leitura da coluna: precisa de
                   nome, senão o leitor anuncia um grupo vazio */
                role="group"
                aria-label={criterio.nome}
                className="relative rounded-[var(--raio-controle)] transition-colors"
                style={{
                  background:
                    ativo === criterio.chave ? "var(--painel-fundo)" : "transparent",
                }}
              >
                {children(criterio, j)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* nomes por inteiro: quebram em duas linhas em vez de virar reticencias */}
      <div className="mt-2 flex gap-2">
        <span className="shrink-0" style={{ width: CALHA }} />
        <div
          className="grid flex-1"
          style={{ gridTemplateColumns: `repeat(${criterios.length},minmax(0,1fr))` }}
        >
          {criterios.map((criterio) => (
            /* O nome tambem e alvo: apontar o rotulo e o gesto natural, e a
               coluna de marcas sozinha e um alvo estreito perto do eixo. */
            <span
              key={criterio.chave}
              onMouseEnter={() => aoApontar(criterio.chave)}
              onMouseLeave={() => aoApontar(null)}
              className="px-1 text-center text-[11px] leading-tight"
              style={{
                color: ativo === criterio.chave ? "var(--tinta)" : "var(--tinta-3)",
              }}
            >
              {criterio.nome}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* --- barras ----------------------------------------------------------------- */

function Barras() {
  const { t } = useIdioma();
  const { series } = useVisualizacao();
  return (
    <div role="figure" aria-label={t("viz.barras.rotulo")}>
      <Moldura>
        {(_criterio, j) => (
          <div className="absolute inset-x-0 bottom-0 flex h-full items-end justify-center gap-[2px] px-[8%]">
            {series.map((serie) => (
              <span
                key={serie.nome}
                className="block flex-1 transition-[height] duration-300"
                style={{
                  /* piso de 2px: um valor zero precisa aparecer como zero, e nao
                     sumir e virar dado faltante */
                  height: `max(${serie.valores[j] * 100}%, 2px)`,
                  maxWidth: 40,
                  background: serie.cor,
                  borderRadius: "4px 4px 0 0",
                }}
              />
            ))}
          </div>
        )}
      </Moldura>
    </div>
  );
}

/* --- pontos ------------------------------------------------------------------
   Era um grafico de bolhas em que o raio e a altura codificavam o mesmo numero.
   Codificacao redundante nao acrescenta leitura: acrescenta ruido, e faz um
   valor alto parecer duas vezes mais alto. Marca de tamanho constante. */

function Pontos() {
  const { t } = useIdioma();
  const { series } = useVisualizacao();
  return (
    <div role="figure" aria-label={t("viz.bolhas.rotulo")}>
      <Moldura>
        {(_criterio, j) => (
          <div className="absolute inset-0">
            {series.map((serie, i) => (
              <span
                key={serie.nome}
                className="absolute block h-2.5 w-2.5 rounded-full transition-[bottom] duration-300"
                style={{
                  left: `${((i + 0.5) / series.length) * 100}%`,
                  bottom: `${serie.valores[j] * 100}%`,
                  transform: "translate(-50%, 50%)",
                  background: serie.cor,
                  /* anel da cor do painel: pontos sobrepostos continuam
                     contaveis */
                  boxShadow: "0 0 0 2px var(--painel)",
                }}
              />
            ))}
          </div>
        )}
      </Moldura>
    </div>
  );
}

/* --- radar ------------------------------------------------------------------ */

function Radar() {
  const { t } = useIdioma();
  const { criterios, series } = useVisualizacao();
  const n = criterios.length;
  const centro = 50;
  const raio = 34;
  // comeca no topo e segue em sentido horario, como no sistema de referencia
  const angulo = (indice: number) => (indice / n) * 2 * Math.PI - Math.PI / 2;
  const ponto = (indice: number, valor: number) =>
    [
      centro + Math.cos(angulo(indice)) * raio * valor,
      centro + Math.sin(angulo(indice)) * raio * valor,
    ] as const;

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <svg viewBox="0 0 100 100" className="w-full" role="img" aria-label={t("viz.radar.rotulo")}>
        {[0.25, 0.5, 0.75, 1].map((nivel) => (
          <polygon
            key={nivel}
            points={criterios.map((_, i) => ponto(i, nivel).join(",")).join(" ")}
            fill="none"
            stroke="var(--borda)"
            strokeWidth={0.3}
          />
        ))}
        {criterios.map((criterio, i) => {
          const [x, y] = ponto(i, 1);
          return (
            <line
              key={criterio.chave}
              x1={centro}
              y1={centro}
              x2={x}
              y2={y}
              stroke="var(--borda)"
              strokeWidth={0.3}
            />
          );
        })}
        {series.map((serie) => (
          <g key={serie.nome}>
            <polygon
              points={serie.valores.map((v, i) => ponto(i, v).join(",")).join(" ")}
              fill={serie.cor}
              fillOpacity={0.1}
              stroke={serie.cor}
              strokeWidth={0.8}
              strokeLinejoin="round"
            />
            {/* vertices: quando uma alternativa vale zero em quase tudo o
                poligono degenera numa linha, e sem os pontos ela some */}
            {serie.valores.map((v, i) => {
              const [x, y] = ponto(i, v);
              return <circle key={i} cx={x} cy={y} r={1.1} fill={serie.cor} />;
            })}
          </g>
        ))}
      </svg>

      {/* rotulos em HTML: nao escalam com o desenho e cabem por inteiro */}
      {criterios.map((criterio, i) => {
        const [x, y] = ponto(i, 1.16);
        const naEsquerda = x < centro - 1;
        const naDireita = x > centro + 1;
        return (
          <span
            key={criterio.chave}
            className="absolute text-[11px] leading-tight"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: "6.5rem",
              textAlign: naEsquerda ? "right" : naDireita ? "left" : "center",
              transform: `translate(${
                naEsquerda ? "-100%" : naDireita ? "0" : "-50%"
              }, -50%)`,
              color: "var(--tinta-3)",
            }}
          >
            {criterio.nome}
          </span>
        );
      })}
    </div>
  );
}

/* --- tabela ----------------------------------------------------------------- */

function Tabela() {
  const { t, n } = useIdioma();
  const { criterios, series, problema } = useVisualizacao();
  const [normalizado, setNormalizado] = useState(true);
  return (
    <div>
      <label className="mb-3 flex items-center gap-2 text-[12px]" style={{ color: "var(--tinta-3)" }}>
        <input type="checkbox" checked={normalizado}
          onChange={(e) => setNormalizado(e.target.checked)} />
        {t("viz.tabela.normalizado")}
      </label>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ color: "var(--tinta-fraca)" }}>
              <th className="py-1.5 text-left font-normal">
                {t("resultado.sorting.alternativa")}
              </th>
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
                      ? n(serie.valores[j], 3)
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

/* --- abas ---------------------------------------------------------------------

   A aba e o grafico que ela abre moram na mesma linha. Antes eram duas listas
   -- `ABAS` para os botoes e um ternario encadeado para o grafico -- e uma aba
   nova exigia lembrar da segunda. O rotulo vem do catalogo, entao aqui fica a
   chave. */

const ABAS: {
  id: Aba;
  chave: string;
  Icone: typeof ChartBar;
  Componente: () => React.ReactNode;
}[] = [
  { id: "barras", chave: "viz.aba.barras", Icone: ChartBar, Componente: Barras },
  { id: "radar", chave: "viz.aba.radar", Icone: ChartPolar, Componente: Radar },
  { id: "bolhas", chave: "viz.aba.bolhas", Icone: CircleIcon, Componente: Pontos },
  { id: "tabela", chave: "viz.aba.tabela", Icone: Table, Componente: Tabela },
];

/* --- painel ----------------------------------------------------------------- */

export function Visualizacoes({
  problema,
  destaque,
}: {
  problema: Problema;
  /** Alternativas a exibir por padrão — em geral as ainda em disputa. */
  destaque?: string[];
}) {
  const { t } = useIdioma();
  const [aba, setAba] = useState<Aba>("barras");
  const [esconderEmpates, setEsconderEmpates] = useState(true);
  const [ativo, setAtivo] = useState<string | null>(null);
  // memorizado: é dependência dos dois `useMemo` abaixo, e um array novo a
  // cada renderização os fazia recalcular sempre
  const todas = useMemo(
    () => Object.keys(problema.valores ?? problema.consequencias),
    [problema],
  );
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
        .map((nome, i) => ({ nome, cor: corDaSerie(i), indice: i }))
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

  const contexto = useMemo<Visualizacao>(
    () => ({ problema, criterios, series, ativo, aoApontar: setAtivo }),
    [problema, criterios, series, ativo],
  );
  const Grafico = (ABAS.find((a) => a.id === aba) ?? ABAS[0]).Componente;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label={t("viz.abas.rotulo")} className="flex gap-1">
          {ABAS.map(({ id, chave, Icone }) => {
            const ativa = aba === id;
            return (
              /* `aria-pressed`: a aba escolhida era só visual */
              <button key={id} type="button" aria-pressed={ativa} onClick={() => setAba(id)}
                className="tatil flex items-center gap-1.5 rounded-[var(--raio-controle)] px-2.5 py-1.5 text-[12px]"
                style={{
                  background: ativa ? "var(--painel-fundo)" : "transparent",
                  color: ativa ? "var(--tinta)" : "var(--tinta-3)",
                  fontWeight: ativa ? 500 : 400,
                }}>
                <Icone size={14} weight={ativa ? "fill" : "regular"} aria-hidden />
                {t(chave)}
              </button>
            );
          })}
        </div>
        <Dica titulo={t("viz.dica.titulo")}>
          <p>
            {t("viz.dica.corpo1.antes")}
            <strong>{t("viz.dica.corpo1.termo")}</strong>
            {t("viz.dica.corpo1.depois")}
          </p>
          <p>{t("viz.dica.corpo2")}</p>
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
                style={{ background: corDaSerie(i), opacity: ativa ? 1 : 0.25 }} />
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
            {t("viz.semAlternativa")}
          </p>
        ) : (
          <ContextoVisualizacao.Provider value={contexto}>
            <Grafico />
          </ContextoVisualizacao.Provider>
        )}
      </div>

      <label className="mt-3 flex items-center gap-2 text-[12px]" style={{ color: "var(--tinta-3)" }}>
        <input type="checkbox" checked={esconderEmpates}
          onChange={(e) => setEsconderEmpates(e.target.checked)} />
        {t("viz.esconderEmpates")}
        {escondidos > 0 && (
          <span style={{ color: "var(--tinta-fraca)" }}>
            {t(escondidos > 1 ? "viz.escondido.varios" : "viz.escondido.um", {
              n: escondidos,
            })}
          </span>
        )}
      </label>
    </div>
  );
}
