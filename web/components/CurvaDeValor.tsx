"use client";

/**
 * Avaliação intra-critério: a curva de valor de um critério.
 *
 * O método não supõe que valor cresce linearmente com desempenho. Ir de 45 para
 * 30 dias pode valer muito mais do que ir de 30 para 15 — e é essa curva, não a
 * reta, que entra no modelo aditivo.
 *
 * A elicitação é por bisseção, e a pergunta é uma escolha entre duas metades:
 * "ganhar de 42 a 65 vale mais, ou de 65 a 88?". Três respostas -- a de baixo,
 * a de cima, ou tanto faz -- e cada uma estreita onde o ponto pode estar.
 *
 * Antes se pedia o número: "qual desempenho fica no meio do caminho em valor?".
 * Está certo e é mais rápido para quem sabe responder, mas obriga o decisor a
 * produzir uma grandeza, e o método existe justamente para não fazer isso --
 * em toda outra tela ele só compara. É também como o sistema de referência
 * pergunta, com as mesmas três opções.
 *
 * Quem não quiser responder fica com a reta, que é o padrão e continua sendo
 * uma escolha legítima.
 */

import { ArrowCounterClockwise, Check, TrendUp } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { Botao, Dica } from "@/components/ui";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/visualizacoes";
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
  const { t } = useIdioma();
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
      aria-label={t("elicitacao.curva.rotulo", { nome: criterio.nome })}
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
          <title>
            {t("elicitacao.curva.ponto", {
              consequencia: formatar(c),
              unidade: criterio.unidade ?? "",
              valor: v.toFixed(2),
            })}
          </title>
        </circle>
      ))}

      <text x={MARGEM.esq} y={ALTURA - 8} fontSize={7} fill="var(--tinta-fraca)">
        {t("elicitacao.curva.eixo.pior", { valor: formatar(pior) })}
      </text>
      <text x={LARGURA - MARGEM.dir} y={ALTURA - 8} fontSize={7} textAnchor="end"
        fill="var(--tinta-fraca)">
        {t("elicitacao.curva.eixo.melhor", { valor: formatar(melhor) })}
      </text>
    </svg>
  );
}

/** Quantos ciclos antes de aceitar o meio do intervalo sem perguntar mais. */
const CICLOS_MAX = 6;

interface Ciclo {
  baixo: number;
  meio: number;
  alto: number;
  resposta: "baixo" | "alto" | "indiferente";
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
  const { t } = useIdioma();
  const [pontos, setPontos] = useState<Ponto[]>(
    inicial ?? [
      [criterio.pior, 0],
      [criterio.melhor, 1],
    ],
  );
  /* Onde o ponto procurado ainda pode estar. Vai encolhendo a cada resposta;
     `null` quer dizer "ainda não comecei este vão". */
  const [busca, setBusca] = useState<{ baixo: number; alto: number } | null>(null);
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);

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

  /* As pontas do vão em ordem de VALOR, não de número: `de` é a consequência
     que vale menos e `ate` a que vale mais. Num critério de minimizar isso
     inverte o eixo -- 90 dias vale menos que 10 --, e é assim que tem de ser.
     Ordenando por número, a pergunta saía como "ganhar de 10 a 50 dias", que é
     uma piora; perguntar qual piora traz mais ganho de valor não quer dizer
     nada. Em ordem de valor as duas metades são sempre melhoras. */
  const pontas = vao ? { de: vao[0][0], ate: vao[1][0] } : null;

  /* A busca corre num parâmetro de 0 a 1 ao longo de `de` → `ate`, e não na
     consequência: assim a mesma conta serve para maximizar e minimizar, sem
     um `if` de direção em cada linha. */
  const s0 = busca ? busca.baixo : 0;
  const s1 = busca ? busca.alto : 1;
  const emS = (v: number) =>
    pontas ? pontas.de + v * (pontas.ate - pontas.de) : 0;
  const meioS = (s0 + s1) / 2;
  const meio = pontas ? emS(meioS) : null;

  /* Quando a faixa fica menor que 1/64 do vão, outra pergunta não move o ponto
     o bastante para valer o cansaço. */
  const apertado = s1 - s0 <= 1 / 64;

  const fixar = (consequencia: number) => {
    if (alvo == null) return;
    setPontos([...pontos, [consequencia, alvo]]);
    setBusca(null);
    setCiclos([]);
  };

  /* As três respostas do método.
     "A primeira metade traz mais ganho" significa que o valor sobe rápido logo
     no começo da melhora, logo o ponto de meio-valor está ANTES do meio -- e a
     busca desce. "A segunda" é o contrário. Indiferente encerra: o meio
     testado é o ponto procurado. */
  const responder = (resposta: Ciclo["resposta"]) => {
    if (!pontas || meio == null || alvo == null) return;
    setCiclos([
      ...ciclos,
      { baixo: emS(s0), meio, alto: emS(s1), resposta },
    ]);

    if (resposta === "indiferente") return fixar(meio);

    const nova =
      resposta === "baixo" ? { baixo: s0, alto: meioS } : { baixo: meioS, alto: s1 };

    if (ciclos.length + 1 >= CICLOS_MAX || nova.alto - nova.baixo <= 1 / 64) {
      return fixar(emS((nova.baixo + nova.alto) / 2));
    }
    setBusca(nova);
  };

  const elicitados = pontos.length - 2;
  const unidade = criterio.unidade ? ` ${criterio.unidade}` : "";
  const faixaTexto = (de: number, ate: number) =>
    `${formatar(de)}${unidade} → ${formatar(ate)}${unidade}`;

  return (
    <div
      className="rounded-[var(--raio-painel)] border p-5"
      style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <TrendUp size={16} style={{ color: "var(--tinta-3)" }} />
        <h3 className="text-[15px] font-semibold" style={{ color: "var(--tinta)" }}>
          {t("elicitacao.curva.titulo", { nome: criterio.nome })}
        </h3>
        <Dica titulo={t("elicitacao.curva.dica.titulo")}>
          <p>{t("elicitacao.curva.dica.corpo1")}</p>
          <p>{t("elicitacao.curva.dica.corpo2")}</p>
          <p style={{ color: "var(--tinta-3)" }}>{t("elicitacao.curva.dica.corpo3")}</p>
        </Dica>
      </div>

      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
        <Grafico pontos={pontos} criterio={criterio} proposta={meio} />

        <div className="min-w-0 flex-1">
          {pontas && meio != null ? (
            <>
              <p className="prosa text-[13px]" style={{ color: "var(--tinta-2)" }}>
                {t("elicitacao.curva.qualMetade")}
              </p>

              {/* As duas metades desenhadas, e não só escritas: a proporção
                  entre elas é a própria pergunta, e uma barra mostra isso mais
                  rápido do que dois números. */}
              <div
                className="mt-3 flex h-2 overflow-hidden rounded-full"
                aria-hidden
                style={{ background: "var(--painel-fundo)" }}
              >
                <span
                  style={{
                    width: `${meioS * 100}%`,
                    background: "var(--dado-b)",
                  }}
                />
                <span className="flex-1" style={{ background: "var(--serie-1)" }} />
              </div>

              <div
                role="radiogroup"
                aria-label={t("elicitacao.curva.qualMetade")}
                className="mt-3 grid gap-1.5"
              >
                {(
                  [
                    ["baixo", faixaTexto(pontas.de, meio), "var(--dado-b)"],
                    ["alto", faixaTexto(meio, pontas.ate), "var(--serie-1)"],
                    ["indiferente", t("elicitacao.curva.opcao.indiferente"), null],
                  ] as const
                ).map(([chave, rotulo, cor]) => (
                  <button
                    key={chave}
                    type="button"
                    role="radio"
                    aria-checked={false}
                    onClick={() => responder(chave)}
                    className="opcao-curva tatil flex items-center gap-2.5 rounded-[var(--raio-controle)] border px-3 py-2 text-left text-[13px]"
                  >
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                      style={{ background: cor ?? "var(--borda-forte)" }}
                    />
                    {rotulo}
                  </button>
                ))}
              </div>

              {/* O que já foi respondido neste critério. Sem isto, quem chega no
                  quarto ciclo não sabe mais o que disse nos três anteriores, e
                  a resposta seguinte fica no escuro. */}
              {ciclos.length > 0 && (
                <table className="mt-4 w-full text-left">
                  <caption
                    className="pb-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.1em]"
                    style={{ color: "var(--tinta-fraca)" }}
                  >
                    {t("elicitacao.curva.tabela.titulo")}
                  </caption>
                  <thead>
                    <tr>
                      {["ciclo", "comparadas", "resposta"].map((c) => (
                        <th
                          key={c}
                          className="pb-1 pr-3 text-[11px] font-medium"
                          style={{ color: "var(--tinta-fraca)" }}
                        >
                          {t(`elicitacao.curva.tabela.${c}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ciclos.map((c, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--borda)" }}>
                        <td
                          className="num py-1 pr-3 text-[12px]"
                          style={{ color: "var(--tinta-fraca)" }}
                        >
                          {i + 1}
                        </td>
                        <td
                          className="num py-1 pr-3 text-[12px]"
                          style={{ color: "var(--tinta-2)" }}
                        >
                          {formatar(c.baixo)} · {formatar(c.meio)} · {formatar(c.alto)}
                        </td>
                        <td className="py-1 text-[12px]" style={{ color: "var(--tinta-2)" }}>
                          {t(`elicitacao.curva.opcao.${c.resposta}.curto`)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {apertado && (
                <p className="mt-2 text-[12px]" style={{ color: "var(--tinta-fraca)" }}>
                  {t("elicitacao.curva.apertado")}
                </p>
              )}
            </>
          ) : (
            <p className="text-[13px]" style={{ color: "var(--tinta-2)" }}>
              {t("elicitacao.curva.detalhada")}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Botao
              onClick={() => onSalvar(elicitados > 0 ? pontos : null)}
              icone={<Check size={14} weight="bold" />}
            >
              {elicitados > 0
                ? t(
                    elicitados === 1
                      ? "elicitacao.curva.usarCurva.um"
                      : "elicitacao.curva.usarCurva.varios",
                    { n: elicitados },
                  )
                : t("elicitacao.curva.usarReta")}
            </Botao>
            {(elicitados > 0 || ciclos.length > 0) && (
              <button
                onClick={() => {
                  setPontos([
                    [criterio.pior, 0],
                    [criterio.melhor, 1],
                  ]);
                  setBusca(null);
                  setCiclos([]);
                }}
                className="tatil flex items-center gap-1.5 text-[13px]"
                style={{ color: "var(--tinta-3)" }}
              >
                <ArrowCounterClockwise size={13} weight="bold" />
                {t("elicitacao.curva.recomecar")}
              </button>
            )}
            <button
              onClick={onCancelar}
              className="text-[13px] underline underline-offset-2"
              style={{ color: "var(--tinta-fraca)" }}
            >
              {t("elicitacao.curva.cancelar")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
