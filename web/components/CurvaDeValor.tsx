"use client";

/**
 * Avaliação intra-critério: a curva de valor de um critério.
 *
 * O método não supõe que valor cresce linearmente com desempenho. Ir de 45 para
 * 30 dias pode valer muito mais do que ir de 30 para 15 — e é essa curva, não a
 * reta, que entra no modelo aditivo.
 *
 * A elicitação é por bisseção, e a pergunta é uma escolha entre dois trechos:
 * "o que traz mais aumento de valor, ir de 42 a 65 ou de 65 a 88?". Três
 * respostas -- o intervalo inferior, o superior, ou indiferente --, no máximo
 * três pontos e três ciclos por ponto. A regra, medida no sistema de
 * referência, está em `lib/curvaDeValor`; aqui fica só a tela.
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

import { avisar } from "@/components/Avisos";
import { Botao, Dica } from "@/components/ui";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/visualizacoes";
import {
  arredondarComoOficial,
  iniciar,
  proximoPasso,
  responder as aplicar,
  testado,
  type Busca,
  type Resposta,
} from "@/lib/curvaDeValor";
import type { CriterioOut } from "@/lib/types";

export type Ponto = [consequencia: number, valor: number];

const LARGURA = 260;
const ALTURA = 170;
const MARGEM = { topo: 12, dir: 12, baixo: 28, esq: 36 };

function formatar(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toPrecision(4).replace(/\.?0+$/, "");
}

/** O número como a tela o mostra: arredondado como o oficial arredonda (ver
 *  `arredondarComoOficial`). Só exibição: os pontos salvos continuam exatos. */
export function naTela(v: number, faixa: number): string {
  return formatar(arredondarComoOficial(v, faixa));
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
      {/* grade em quartos: 0,25, 0,5 e 0,75 são exatamente os pontos que a
          elicitação busca, como na grade do oficial */}
      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
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

      {/* cada ponto elicitado marcado no eixo, com a consequência -- o oficial
          também escreve o valor de cada ponto ali */}
      {ordenados.slice(1, -1).map(([c, v]) => (
        <g key={`marca-${c}-${v}`}>
          <line x1={x(c)} y1={y(v)} x2={x(c)} y2={ALTURA - MARGEM.baixo}
            stroke="var(--dado-a)" strokeWidth={0.6} strokeDasharray="1.5 2" opacity={0.7} />
          <text x={x(c)} y={ALTURA - MARGEM.baixo + 9} fontSize={6.5} textAnchor="middle"
            fill="var(--tinta-3)" className="tabular-nums">{naTela(c, melhor - pior)}</text>
        </g>
      ))}

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

interface Ciclo {
  /** O intervalo inferior e o superior desta pergunta, na consequência. */
  inferior: [number, number];
  superior: [number, number];
  resposta: Resposta;
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
  const extremos: Ponto[] = [
    [criterio.pior, 0],
    [criterio.melhor, 1],
  ];
  const [pontos, setPontos] = useState<Ponto[]>(inicial ?? extremos);
  /* A busca do ponto em andamento; `null` quer dizer "o próximo ponto ainda
     não começou". */
  const [busca, setBusca] = useState<Busca | null>(null);
  /* Todos os ciclos, de todos os pontos, numerados em sequência -- a tabela
     "Information elicited" do oficial também não recomeça a cada ponto. */
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);

  /* A regra corre em `s`, de 0 (pior) a 1 (melhor); a tela fala em
     consequência. Ver `lib/curvaDeValor`. */
  const faixa = criterio.melhor - criterio.pior;
  const emConsequencia = (s: number) => criterio.pior + s * faixa;

  /* Escala construída: a curva só fixa valor em nível (regra discreta). */
  const niveisS = useMemo(
    () =>
      criterio.escala === "construida" && criterio.niveis && faixa !== 0
        ? criterio.niveis
            .map((n) => (n - criterio.pior) / faixa)
            .sort((x, y) => x - y)
        : undefined,
    [criterio.escala, criterio.niveis, criterio.pior, faixa],
  );

  const passo = useMemo(
    () =>
      proximoPasso(
        pontos.map(
          ([c, v]) => [faixa === 0 ? 0 : (c - criterio.pior) / faixa, v] as [number, number],
        ),
        niveisS,
      ),
    [pontos, faixa, criterio.pior, niveisS],
  );
  const atual =
    busca ??
    (passo
      ? iniciar(passo, { pior: criterio.pior, melhor: criterio.melhor }, niveisS)
      : null);
  const tS = atual ? testado(atual) : null;
  const a = atual ? emConsequencia(atual.a) : null;
  const b = atual ? emConsequencia(atual.b) : null;
  const meio = tS == null ? null : emConsequencia(tS);

  const responder = (resposta: Resposta) => {
    if (!atual || tS == null) return;
    setCiclos([
      ...ciclos,
      {
        inferior: [emConsequencia(atual.lo), emConsequencia(tS)],
        superior: [emConsequencia(tS), emConsequencia(atual.hi)],
        resposta,
      },
    ]);
    const r = aplicar(atual, resposta);
    if ("fixa" in r) {
      setPontos([...pontos, [emConsequencia(r.fixa), atual.alvo]]);
      setBusca(null);
    } else {
      setBusca(r.segue);
    }
  };

  const elicitados = pontos.length - 2;
  const unidade = criterio.unidade ? ` ${criterio.unidade}` : "";
  const f = (v: number) => `${naTela(v, faixa)}${unidade}`;
  const chavePergunta =
    criterio.direcao === "min"
      ? "elicitacao.curva.pergunta.reducao"
      : "elicitacao.curva.pergunta.aumento";
  /* Onde o ponto testado cai dentro do intervalo externo, para a barra. */
  const posicao = atual && tS != null ? (tS - atual.a) / (atual.b - atual.a) : 0.5;

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
          {atual && a != null && b != null && meio != null ? (
            <>
              {/* A pergunta inteira, com os números, como o oficial a escreve:
                  "What brings you greater increase in value: Increase from 0 to
                  50 or from 50 to 100?". */}
              <p className="prosa text-[13px]" style={{ color: "var(--tinta)" }}>
                {t(chavePergunta, { de: f(a), meio: f(meio), ate: f(b) })}
              </p>

              {/* Os dois intervalos no eixo do critério, com as três marcas: a
                  proporção entre eles é a própria pergunta. */}
              <div className="mt-3" aria-hidden>
                <div
                  className="flex h-2.5 overflow-hidden rounded-full"
                  style={{ background: "var(--painel-fundo)" }}
                >
                  <span style={{ width: `${posicao * 100}%`, background: "var(--dado-b)" }} />
                  <span className="flex-1" style={{ background: "var(--serie-1)" }} />
                </div>
                <div
                  className="relative mt-1 h-4 text-[11px]"
                  style={{ color: "var(--tinta-fraca)" }}
                >
                  <span className="num absolute left-0">{naTela(a, faixa)}</span>
                  <span
                    className="num absolute -translate-x-1/2"
                    style={{ left: `${posicao * 100}%` }}
                  >
                    {naTela(meio, faixa)}
                  </span>
                  <span className="num absolute right-0">{naTela(b, faixa)}</span>
                </div>
              </div>

              {/* Cada opção responde na hora: são botões de ação, não uma
                  escolha que fica marcada. O papel de rádio prometia setas e
                  estado marcado, e o `aria-checked` ficava sempre falso. O
                  `aria-live` lê a pergunta nova de cada ciclo. */}
              <div
                role="group"
                aria-live="polite"
                aria-label={t(chavePergunta, { de: f(a), meio: f(meio), ate: f(b) })}
                className="mt-3 grid gap-1.5"
              >
                {(
                  [
                    [
                      "inferior",
                      t("elicitacao.curva.opcao.inferior", { de: f(a), ate: f(meio) }),
                      "var(--dado-b)",
                    ],
                    [
                      "superior",
                      t("elicitacao.curva.opcao.superior", { de: f(meio), ate: f(b) }),
                      "var(--serie-1)",
                    ],
                    ["indiferente", t("elicitacao.curva.opcao.indiferente"), null],
                  ] as const
                ).map(([chave, rotulo, cor]) => (
                  <button
                    key={chave}
                    type="button"
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
            </>
          ) : (
            <p className="text-[13px]" role="status" style={{ color: "var(--tinta-2)" }}>
              {t("elicitacao.curva.concluida")}
            </p>
          )}

          {/* O que já foi respondido, em todos os pontos. Sem isto, quem chega
              no quinto ciclo não sabe mais o que disse nos anteriores. */}
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
                  {["ciclo", "inferior", "superior", "resposta"].map((c) => (
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
                    {[c.inferior, c.superior].map(([de, ate], j) => (
                      <td
                        key={j}
                        className="py-1 pr-3 text-[12px] tabular-nums whitespace-nowrap"
                        style={{ color: "var(--tinta-2)" }}
                      >
                        {t("elicitacao.curva.tabela.faixa", {
                          de: naTela(de, faixa),
                          ate: naTela(ate, faixa),
                        })}
                      </td>
                    ))}
                    <td className="py-1 text-[12px]" style={{ color: "var(--tinta-2)" }}>
                      {t(`elicitacao.curva.opcao.${c.resposta}.curto`)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  // apaga todos os ciclos respondidos: sai na hora, com volta
                  const antes = { pontos, busca, ciclos };
                  setPontos(extremos);
                  setBusca(null);
                  setCiclos([]);
                  avisar.desfazivel(
                    t("elicitacao.curva.recomecada"),
                    () => {
                      setPontos(antes.pontos);
                      setBusca(antes.busca);
                      setCiclos(antes.ciclos);
                    },
                    t("acao.desfazer"),
                  );
                }}
                className="tatil flex items-center gap-1.5 text-[13px]"
                style={{ color: "var(--tinta-3)" }}
              >
                <ArrowCounterClockwise size={13} weight="bold" aria-hidden />
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
