"use client";

/**
 * Diagrama de Hasse: como o método lê um ranking parcial.
 *
 * Uma seta de X para Y significa "X domina Y para qualquer conjunto de pesos
 * ainda viável". Só as arestas de cobertura aparecem: se X domina Y e Y domina
 * Z, a seta de X para Z é verdadeira mas redundante.
 *
 * O desenho segue a legenda do sistema de referência, lida na tela dele:
 *
 * - seta escura: dominância vinda da elicitação por decomposição;
 * - seta vermelha: dominância declarada numa avaliação holística;
 * - linha cinza, sem seta: indiferença (empate dentro do limiar);
 * - linha tracejada: separa as posições do ranking.
 *
 * Uma posição termina onde há corte limpo -- tudo acima supera tudo abaixo.
 * Dentro dela pode haver setas; o que falta é ordem entre todos. No começo da
 * elicitação é comum haver uma posição só, como no oficial.
 *
 * Duas coisas em que este desenho se afasta do dele, de propósito: os nós de
 * cada nível são ordenados pela média da posição dos pais, o que tira boa parte
 * dos cruzamentos; e a seta que pula níveis faz curva, em vez de atravessar os
 * nós do meio -- no oficial ela passa por cima deles, e parece ligar a quem não
 * liga.
 *
 * As diferenças máximas ficam num painel ao lado, também como no oficial: por
 * posição, uma matriz com o quanto cada alternativa pode, no máximo, superar a
 * outra, com a maior destacada -- é onde ainda há mais em jogo.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { BotaoSalvarGrafico } from "@/components/BotaoSalvarGrafico";
import { Dica } from "@/components/ui";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/visualizacoes";

interface Aresta {
  de: string;
  para: string;
  origem?: "decomposicao" | "holistica";
}

export interface Diferenca {
  a: string;
  b: string;
  a_supera_b_em_ate: number;
  b_supera_a_em_ate: number;
  limite_superior?: boolean;
}

const LARGURA_NO = 112;
const ALTURA_NO = 32;
const ESPACO_X = 26;
const ESPACO_Y = 58;
const MARGEM = 14;
/** Faixa à esquerda para os rótulos de posição. */
const CALHA = 78;

const COR = {
  decomposicao: "var(--tinta-2)",
  holistica: "var(--erro)",
  indiferenca: "var(--tinta-3)",
};

/** Cada nível ordenado pela média da posição dos pais: menos cruzamentos. */
function ordenar(niveis: string[][], arestas: Aresta[]): string[][] {
  const pais = new Map<string, string[]>();
  for (const { de, para } of arestas) pais.set(para, [...(pais.get(para) ?? []), de]);
  if (!niveis.length) return [];
  const ordem = niveis.map((n) => [...n]);
  const coluna = new Map<string, number>();
  const marcar = (nivel: string[]) =>
    nivel.forEach((nome, i) => coluna.set(nome, i - (nivel.length - 1) / 2));
  marcar(ordem[0]);
  for (let k = 1; k < ordem.length; k++) {
    const peso = (nome: string) => {
      const ps = (pais.get(nome) ?? []).filter((p) => coluna.has(p));
      return ps.length ? ps.reduce((s, p) => s + coluna.get(p)!, 0) / ps.length : null;
    };
    const atual = ordem[k].map((nome, i) => ({ nome, i, p: peso(nome) }));
    // sem pais desenhados, mantém o lugar relativo
    atual.sort((x, y) => (x.p ?? x.i) - (y.p ?? y.i) || x.i - y.i);
    ordem[k] = atual.map((x) => x.nome);
    marcar(ordem[k]);
  }
  return ordem;
}

export function DiagramaHasse({
  niveis,
  arestas,
  indiferencas = [],
  posicoes,
  diferencas: diferencasDadas = [],
  carregarDiferencas,
  destaque,
}: {
  niveis: string[][];
  arestas: Aresta[];
  indiferencas?: { a: string; b: string }[];
  posicoes?: string[][];
  diferencas?: Diferenca[];
  /* As diferenças máximas custam dois LPs por par incomparável, então não vêm
     com a análise: o painel as pede quando é aberto. */
  carregarDiferencas?: () => Promise<Diferenca[]>;
  destaque?: string | null;
}) {
  const { t } = useIdioma();
  const id = useId().replace(/:/g, "");
  const figura = useRef<HTMLDivElement>(null);
  const [comDiferencas, setComDiferencas] = useState(false);
  const [carregadas, setCarregadas] = useState<Diferenca[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const diferencas = diferencasDadas.length > 0 ? diferencasDadas : (carregadas ?? []);

  /* Só a última pergunta vale: se o diagrama mudar com um pedido a caminho, a
     resposta velha chegaria depois do reset e mostraria as diferenças do
     diagrama anterior. */
  const pedido = useRef(0);
  const carregar = () => {
    if (!carregarDiferencas) return;
    const este = ++pedido.current;
    setCarregando(true);
    setFalhou(false);
    carregarDiferencas()
      .then((d) => {
        if (este === pedido.current) setCarregadas(d);
      })
      .catch(() => {
        if (este === pedido.current) setFalhou(true);
      })
      .finally(() => {
        if (este === pedido.current) setCarregando(false);
      });
  };

  /* Uma resposta nova muda o diagrama e as diferenças: o que foi carregado
     deixa de valer, e o painel aberto pede de novo. */
  const assinatura = JSON.stringify([niveis, arestas]);
  useEffect(() => {
    pedido.current++; // o que estiver a caminho já não é deste diagrama
    setCarregadas(null);
    setCarregando(false);
    if (comDiferencas && carregarDiferencas) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinatura]);

  const alternar = () => {
    const abrir = !comDiferencas;
    setComDiferencas(abrir);
    if (abrir && diferencasDadas.length === 0 && carregadas === null && !carregando) carregar();
  };
  /* Com carregamento, o botão aparece quando alguma posição tem mais de uma
     alternativa -- só ali pode haver par incomparável. */
  const podeHaverDiferencas =
    diferencasDadas.length > 0 ||
    (carregarDiferencas !== undefined && (posicoes ?? [niveis.flat()]).some((p) => p.length > 1));
  const ordem = useMemo(() => ordenar(niveis, arestas), [niveis, arestas]);
  if (!ordem.length) return null;

  const blocoDe = new Map<string, number>();
  (posicoes ?? [ordem.flat()]).forEach((bloco, i) =>
    bloco.forEach((nome) => blocoDe.set(nome, i)),
  );
  const variasPosicoes = (posicoes?.length ?? 1) > 1;

  const maiorNivel = Math.max(...ordem.map((n) => n.length));
  const larguraNos = maiorNivel * LARGURA_NO + (maiorNivel - 1) * ESPACO_X;
  const largura = CALHA + larguraNos + MARGEM * 2;
  const altura = ordem.length * ALTURA_NO + (ordem.length - 1) * ESPACO_Y + MARGEM * 2;
  const yDe = (linha: number) => MARGEM + linha * (ALTURA_NO + ESPACO_Y);

  const posicao = new Map<string, { x: number; y: number; linha: number }>();
  ordem.forEach((nivel, linha) => {
    const larguraLinha = nivel.length * LARGURA_NO + (nivel.length - 1) * ESPACO_X;
    const inicio = CALHA + MARGEM + (larguraNos - larguraLinha) / 2;
    nivel.forEach((nome, coluna) =>
      posicao.set(nome, { x: inicio + coluna * (LARGURA_NO + ESPACO_X), y: yDe(linha), linha }),
    );
  });

  const usoDoCorredor = new Map<number, number>();
  /** Um x por onde descer dos níveis `de` a `ate` sem atravessar nó nenhum. */
  const corredorLivre = (x1: number, x2: number, de: number, ate: number) => {
    const meio = [...posicao.values()].filter((p) => p.linha > de && p.linha < ate);
    const livre = (x: number) => meio.every((p) => x < p.x - 6 || x > p.x + LARGURA_NO + 6);
    const alvo = (x1 + x2) / 2;
    const candidatos = [
      alvo,
      ...meio.flatMap((p) => [p.x - ESPACO_X / 2, p.x + LARGURA_NO + ESPACO_X / 2]),
    ].filter(livre);
    return candidatos.sort((u, v) => Math.abs(u - alvo) - Math.abs(v - alvo))[0] ?? alvo;
  };

  /* Onde começa cada posição: o primeiro nível dela. Níveis não atravessam
     posições -- quem está numa posição abaixo é dominado por todos acima, e
     portanto fica num nível mais fundo que qualquer um deles. */
  const inicioDePosicao = ordem
    .map((nivel, linha) => ({ linha, bloco: blocoDe.get(nivel[0]) ?? 0 }))
    .filter((x, i, todos) => i === 0 || x.bloco !== todos[i - 1].bloco);

  const valor = new Map<string, number>();
  for (const d of diferencas) {
    valor.set(`${d.a}|${d.b}`, d.a_supera_b_em_ate);
    valor.set(`${d.b}|${d.a}`, d.b_supera_a_em_ate);
  }

  return (
    <figure className="m-0">
      <figcaption className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium" style={{ color: "var(--tinta-2)" }}>
            {t("resultado.escolha.dominancia")}
          </span>
          <Dica titulo={t("viz.hasse.dica.titulo")}>
            <p>
              {t("viz.hasse.dica.corpo1.antes")}
              <strong>{t("viz.hasse.dica.corpo1.termo")}</strong>
              {t("viz.hasse.dica.corpo1.depois")}
            </p>
            <p>
              {t("viz.hasse.dica.corpo2.antes")}
              <strong>{t("viz.hasse.dica.corpo2.termo")}</strong>
              {t("viz.hasse.dica.corpo2.depois")}
            </p>
            <p style={{ color: "var(--tinta-3)" }}>{t("viz.hasse.dica.corpo3")}</p>
          </Dica>
        </span>
        <span className="ml-auto flex items-center gap-2">
          {podeHaverDiferencas && (
            <button
              type="button"
              onClick={alternar}
              aria-expanded={comDiferencas}
              className="text-[12px] underline underline-offset-2"
              style={{ color: "var(--accent)" }}
            >
              {t(comDiferencas ? "viz.hasse.diferencas.ocultar" : "viz.hasse.diferencas.mostrar")}
            </button>
          )}
          <BotaoSalvarGrafico alvo={figura} nome="diagrama-de-hasse" />
        </span>
      </figcaption>

      <div className="flex flex-col gap-4">
        <div ref={figura} className="min-w-0 overflow-x-auto">
          <svg
            width={largura}
            height={altura}
            viewBox={`0 0 ${largura} ${altura}`}
            role="img"
            aria-label={t("viz.hasse.rotulo")}
            className="max-w-full"
          >
            <defs>
              {(["decomposicao", "holistica"] as const).map((origem) => (
                <marker
                  key={origem}
                  id={`${id}-${origem}`}
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="2.8"
                  orient="auto"
                >
                  <path d="M0,0 L7,2.8 L0,5.6 Z" fill={COR[origem]} />
                </marker>
              ))}
            </defs>

            {/* As posições: rótulo na calha e tracejado entre elas. */}
            {inicioDePosicao.map(({ linha, bloco }, i) => (
              <g key={`posicao-${bloco}`}>
                <text
                  data-posicao={bloco + 1}
                  x={MARGEM}
                  y={yDe(linha) + ALTURA_NO / 2 + 4}
                  fontSize={11}
                  fontWeight={600}
                  fill="var(--tinta-3)"
                >
                  {t("viz.hasse.posicao", { n: bloco + 1 })}
                </text>
                {i > 0 && (
                  <line
                    x1={MARGEM}
                    x2={largura - MARGEM}
                    y1={yDe(linha) - ESPACO_Y / 2}
                    y2={yDe(linha) - ESPACO_Y / 2}
                    stroke="var(--borda-forte)"
                    strokeDasharray="4 4"
                  />
                )}
              </g>
            ))}

            {indiferencas.map(({ a, b }) => {
              const p = posicao.get(a);
              const q = posicao.get(b);
              if (!p || !q) return null;
              const [esq, dir] = p.x <= q.x ? [p, q] : [q, p];
              const mesmoNivel = p.linha === q.linha;
              return (
                <line
                  key={`${a}~${b}`}
                  x1={mesmoNivel ? esq.x + LARGURA_NO : p.x + LARGURA_NO / 2}
                  y1={mesmoNivel ? esq.y + ALTURA_NO / 2 : p.y + ALTURA_NO / 2}
                  x2={mesmoNivel ? dir.x : q.x + LARGURA_NO / 2}
                  y2={mesmoNivel ? dir.y + ALTURA_NO / 2 : q.y + ALTURA_NO / 2}
                  stroke={COR.indiferenca}
                  strokeWidth={2}
                >
                  <title>{t("viz.hasse.indiferentes", { a, b })}</title>
                </line>
              );
            })}

            {arestas.map(({ de, para, origem = "decomposicao" }) => {
              const a = posicao.get(de);
              const b = posicao.get(para);
              if (!a || !b) return null;
              const x1 = a.x + LARGURA_NO / 2;
              const y1 = a.y + ALTURA_NO;
              const x2 = b.x + LARGURA_NO / 2;
              const y2 = b.y - 3;
              /* Pula níveis? Então desce por um corredor livre, em vez de cruzar
                 os nós do meio -- uma curva rasa ainda passava por trás deles e
                 parecia ligar a quem não liga. O corredor é o vão entre nós mais
                 perto da reta que a seta faria, e livre em todos os níveis que
                 ela atravessa. */
              const salto = b.linha - a.linha > 1;
              const livre = salto ? corredorLivre(x1, x2, a.linha, b.linha) : 0;
              // setas que dividem o corredor, lado a lado, e não uma sobre a outra
              const vez = usoDoCorredor.get(Math.round(livre)) ?? 0;
              usoDoCorredor.set(Math.round(livre), vez + 1);
              const corredor = livre + (vez % 2 ? -1 : 1) * Math.ceil(vez / 2) * 5;
              const q = ESPACO_Y * 0.3;
              const topo = y1 + ESPACO_Y / 2;
              const fundo = y2 - ESPACO_Y / 2;
              const d = salto
                ? `M${x1},${y1} C${x1},${y1 + q} ${corredor},${topo - q} ${corredor},${topo}` +
                  ` L${corredor},${fundo} C${corredor},${fundo + q} ${x2},${y2 - q} ${x2},${y2}`
                : `M${x1},${y1} L${x2},${y2}`;
              return (
                <path
                  key={`${de}->${para}`}
                  d={d}
                  fill="none"
                  stroke={COR[origem]}
                  strokeWidth={origem === "holistica" ? 1.6 : 1.3}
                  markerEnd={`url(#${id}-${origem})`}
                  data-origem={origem}
                >
                  <title>{t("viz.hasse.vence", { de, para })}</title>
                </path>
              );
            })}

            {ordem.flatMap((nivel) =>
              nivel.map((nome) => {
                const p = posicao.get(nome)!;
                const realcado = nome === destaque;
                return (
                  <g key={nome}>
                    <rect
                      x={p.x}
                      y={p.y}
                      width={LARGURA_NO}
                      height={ALTURA_NO}
                      rx={ALTURA_NO / 2}
                      fill={realcado ? "var(--accent-suave)" : "var(--painel)"}
                      stroke={realcado ? "var(--accent)" : "var(--tinta-3)"}
                      strokeWidth={realcado ? 1.6 : 1}
                    />
                    <text
                      x={p.x + LARGURA_NO / 2}
                      y={p.y + ALTURA_NO / 2 + 4}
                      fontSize={11.5}
                      textAnchor="middle"
                      fill={realcado ? "var(--accent)" : "var(--tinta)"}
                      fontWeight={realcado ? 600 : 500}
                    >
                      {nome.length > 15 ? `${nome.slice(0, 14)}…` : nome}
                    </text>
                    <title>
                      {t("viz.hasse.no", { nome, n: (blocoDe.get(nome) ?? 0) + 1 })}
                    </title>
                  </g>
                );
              }),
            )}
          </svg>

          {/* A legenda do oficial, item por item. */}
          <ul
            className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px]"
            style={{ color: "var(--tinta-3)" }}
          >
            {(
              [
                ["decomposicao", <line key="l" x1="1" y1="6" x2="21" y2="6" stroke={COR.decomposicao} strokeWidth="1.4" markerEnd={`url(#${id}-decomposicao)`} />],
                ["holistica", <line key="l" x1="1" y1="6" x2="21" y2="6" stroke={COR.holistica} strokeWidth="1.6" markerEnd={`url(#${id}-holistica)`} />],
                ["indiferenca", <line key="l" x1="1" y1="6" x2="24" y2="6" stroke={COR.indiferenca} strokeWidth="2" />],
                ["posicoes", <line key="l" x1="1" y1="6" x2="24" y2="6" stroke="var(--borda-forte)" strokeDasharray="4 4" />],
              ] as const
            ).map(([chave, glifo]) => (
              <li key={chave} className="flex items-center gap-1.5">
                <svg width="28" height="12" aria-hidden>
                  {glifo}
                </svg>
                {t(`viz.hasse.legenda.${chave}`)}
              </li>
            ))}
          </ul>
        </div>

        {comDiferencas && carregando && diferencas.length === 0 && (
          <p className="text-[12px]" style={{ color: "var(--tinta-3)" }} role="status">
            {t("viz.hasse.diferencas.carregando")}
          </p>
        )}
        {comDiferencas && falhou && (
          <p className="text-[12px]" style={{ color: "var(--erro)" }} role="alert">
            {t("viz.hasse.diferencas.erro")}
          </p>
        )}
        {comDiferencas && !carregando && !falhou && diferencas.length === 0 && carregadas !== null && (
          <p className="text-[12px]" style={{ color: "var(--tinta-3)" }}>
            {t("viz.hasse.diferencas.vazio")}
          </p>
        )}
        {comDiferencas && diferencas.length > 0 && (
          <PainelDiferencas
            ordem={ordem.flat()}
            posicoes={posicoes ?? [ordem.flat()]}
            valor={valor}
            teto={diferencas.some((d) => d.limite_superior)}
            variasPosicoes={variasPosicoes}
          />
        )}
      </div>

      {/* a leitura não pode depender de enxergar o grafo */}
      <details className="mt-3">
        <summary className="cursor-pointer text-[11px]" style={{ color: "var(--tinta-fraca)" }}>
          {t("viz.hasse.verLista")}
        </summary>
        <ol className="mt-2 space-y-1 text-[12px]" style={{ color: "var(--tinta-2)" }}>
          {(posicoes ?? [ordem.flat()]).map((bloco, i) => (
            <li key={i}>
              <span className="num" style={{ color: "var(--tinta-fraca)" }}>
                {t("viz.hasse.posicao", { n: i + 1 })}:
              </span>{" "}
              {bloco.join(", ")}
            </li>
          ))}
        </ol>
      </details>
    </figure>
  );
}

/**
 * Por posição, o quanto cada alternativa pode, no máximo, superar a outra.
 * Só pares ainda incomparáveis; a maior diferença de cada posição fica
 * destacada, como no oficial.
 */
function PainelDiferencas({
  ordem,
  posicoes,
  valor,
  teto,
  variasPosicoes,
}: {
  ordem: string[];
  posicoes: string[][];
  valor: Map<string, number>;
  teto: boolean;
  variasPosicoes: boolean;
}) {
  const { t, n: numero } = useIdioma();
  const blocos = posicoes
    .map((bloco, i) => ({
      n: i + 1,
      nomes: ordem.filter((nome) => bloco.includes(nome)),
    }))
    .filter(({ nomes }) =>
      nomes.some((a) => nomes.some((b) => valor.has(`${a}|${b}`))),
    );

  return (
    <aside
      className="min-w-0 rounded-[var(--raio-controle)] border p-3"
      style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
      aria-label={t("viz.hasse.diferencas.titulo")}
    >
      <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: "var(--tinta)" }}>
        {t("viz.hasse.diferencas.titulo")}
        <Dica titulo={t("viz.hasse.diferencas.titulo")}>
          <p>{t("viz.hasse.diferencas.ajuda")}</p>
          {teto && <p>{t("resultado.ranking.pendentes.tetoVeto")}</p>}
        </Dica>
      </p>
      {blocos.map(({ n, nomes }) => {
        const maior = Math.max(
          ...nomes.flatMap((a) => nomes.map((b) => valor.get(`${a}|${b}`) ?? -1)),
        );
        return (
          <div key={n} className="mt-2 overflow-x-auto">
            {variasPosicoes && (
              <p className="mb-1 text-[11px]" style={{ color: "var(--tinta-3)" }}>
                {t("viz.hasse.posicao", { n })}
              </p>
            )}
            <table className="text-[11px]">
              <thead>
                <tr>
                  <th />
                  {nomes.map((b) => (
                    <th key={b} className="whitespace-nowrap px-1.5 py-0.5 text-left font-semibold" style={{ color: "var(--tinta-2)" }}>
                      {b}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nomes.map((a) => (
                  <tr key={a} style={{ borderTop: "1px solid var(--borda)" }}>
                    <th className="whitespace-nowrap pr-1.5 text-left font-semibold" style={{ color: "var(--tinta-2)" }}>
                      {a}
                    </th>
                    {nomes.map((b) => {
                      const v = valor.get(`${a}|${b}`);
                      const eMaior = v != null && v === maior;
                      return (
                        <td
                          key={b}
                          className="num whitespace-nowrap px-1.5 py-0.5"
                          data-maior={eMaior || undefined}
                          title={v != null ? t("viz.hasse.diferencas.celula", { a, b, v: numero(v, 3) }) : undefined}
                          style={{
                            color: v == null ? "var(--tinta-fraca)" : "var(--tinta)",
                            background: eMaior
                              ? "color-mix(in srgb, var(--sucesso) 22%, transparent)"
                              : undefined,
                            fontWeight: eMaior ? 600 : 400,
                          }}
                        >
                          {v == null ? "–" : numero(v, 3)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </aside>
  );
}
