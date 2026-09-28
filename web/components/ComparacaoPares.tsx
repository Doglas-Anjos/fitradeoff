"use client";

/**
 * Ordenação dos pesos por comparação par a par.
 *
 * Em vez de pedir a lista ordenada de uma vez, confronta dois critérios: qual
 * você prefere levar do pior ao melhor desempenho? Ordenar sete critérios de
 * cabeça é difícil; comparar dois é sempre fácil.
 *
 * As barras mostram a faixa real de cada critério, porque é ela que está em
 * jogo — "qualidade é mais importante que prazo" não quer dizer nada sem saber
 * que o prazo varia de 45 para 12 dias.
 *
 * Há uma segunda vista, a tabela, que é a vista padrão do sistema de
 * referência ("Consequences"): as opções A e B como duas alternativas
 * hipotéticas, uma linha por critério, a consequência melhor em azul e a pior
 * em vermelho. Mesma pergunta, outra leitura -- há quem compare melhor números
 * lado a lado do que barras.
 */

import { ArrowCounterClockwise, Check } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { CaboDeGuerra } from "@/components/Animacoes";
import { FaixaCriterio } from "@/components/FaixaCriterio";
import {
  Botao,
  BotaoEntreCartoes,
  Dica,
  ESPERA_CONFIRMACAO,
  Segmentado,
} from "@/components/ui";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/visualizacoes";
import {
  proxima,
  reconstruir,
  restantes,
  terminou,
  type RespostaComparacao,
} from "@/lib/ordenacaoPorComparacao";
import type { CriterioOut } from "@/lib/types";

function Cartao({
  criterio,
  cor,
  rotulo,
  onEscolher,
  desabilitado,
  estado,
}: {
  criterio: CriterioOut;
  cor: string;
  rotulo: string;
  onEscolher: () => void;
  desabilitado: boolean;
  /** Depois do clique, um cartão é o escolhido e o outro é o preterido. */
  estado: "neutro" | "escolhido" | "preterido";
}) {
  const { t } = useIdioma();
  const escolhido = estado === "escolhido";
  const preterido = estado === "preterido";
  return (
    <div
      /* Conjunto de informação sobre um critério, não um botão: ver a seção
         "cartões de escolha" no globals.css. */
      role="group"
      aria-label={criterio.nome}
      data-estado={estado}
      data-ativo={!desabilitado}
      className="cartao-escolha group flex flex-1 flex-col rounded-[var(--raio-painel)] border p-5 text-left"
      style={{ "--cor-lado": cor } as React.CSSProperties}
    >
      <div className="mb-4 flex items-baseline gap-2">
        <span aria-hidden className="h-2.5 w-2.5 rounded-[2px]" style={{ background: cor }} />
        <span className="text-[11px]" style={{ color: "var(--tinta-3)" }}>
          {rotulo}
        </span>
      </div>

      <p className="text-[15px] font-medium" style={{ color: "var(--tinta)" }}>
        {criterio.nome}
      </p>

      {/* a faixa que está em jogo, desenhada — o mesmo desenho que os outros
          modos de ordenação usam, para que a pergunta seja a mesma em todos */}
      <div className="mt-4">
        <FaixaCriterio criterio={criterio} cor={cor} />
      </div>

      {/* O único alvo de clique do cartão. O rótulo visível é igual nos dois
          lados, então o nome acessível carrega o critério -- sem isso um leitor
          de tela anuncia dois botões idênticos e a escolha vira sorteio. */}
      <button
        type="button"
        onClick={onEscolher}
        disabled={desabilitado}
        aria-label={`${t("elicitacao.par.prefiro")}: ${criterio.nome}`}
        data-escolhido={escolhido}
        className="botao-escolha tatil mt-auto flex items-center justify-center gap-1.5 rounded-[var(--raio-controle)] border px-3 py-2 text-center text-[13px] font-medium"
        style={{ marginTop: "1.25rem" }}
      >
        {escolhido && <Check size={14} weight="bold" />}
        {escolhido ? t("elicitacao.par.escolhida") : t("elicitacao.par.prefiro")}
      </button>
    </div>
  );
}

function formatar(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toPrecision(4).replace(/\.?0+$/, "");
}

/**
 * A pergunta como tabela de consequências, na vista padrão do oficial.
 *
 * A opção A é o critério da esquerda no melhor desempenho e o da direita no
 * pior; a B, o contrário. Escolher A é dizer que levar o primeiro do pior ao
 * melhor vale mais -- a mesma resposta do cartão da esquerda.
 */
/* O azul das séries dá 4,42:1 sobre o painel claro, abaixo dos 4,5:1 que texto
   deste tamanho pede. Misturado à tinta ele escurece no tema claro e clareia no
   escuro -- o contraste sobe nos dois, e continua sendo o mesmo azul. */
const AZUL_TEXTO = "color-mix(in srgb, var(--serie-1) 78%, var(--tinta))";

function TabelaConsequencias({
  a,
  b,
  desabilitado,
  escolhida,
  onEscolher,
}: {
  a: CriterioOut;
  b: CriterioOut;
  desabilitado: boolean;
  escolhida: RespostaComparacao | null;
  onEscolher: (r: RespostaComparacao) => void;
}) {
  const { t } = useIdioma();
  const valor = (c: CriterioOut, melhor: boolean) => {
    const v = melhor ? c.melhor : c.pior;
    return `${formatar(v)}${c.unidade ? ` ${c.unidade}` : ""}`;
  };
  const celula = (c: CriterioOut, melhor: boolean) => (
    <td
      className="px-4 py-2 text-center text-[15px] font-semibold tabular-nums"
      style={{ color: melhor ? AZUL_TEXTO : "var(--erro)" }}
      data-consequencia={melhor ? "melhor" : "pior"}
    >
      {valor(c, melhor)}
    </td>
  );
  return (
    <div
      className="rounded-[var(--raio-painel)] border p-4"
      style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
    >
      <table className="mx-auto">
        <caption
          className="pb-3 text-[12px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: "var(--tinta-fraca)" }}
        >
          {t("elicitacao.par.tabela.consequencias")}
        </caption>
        <thead>
          <tr>
            <th />
            {(["A", "B"] as const).map((lado) => (
              <th key={lado} className="px-4 pb-3">
                <Botao
                  variante={escolhida === lado ? "principal" : "contorno"}
                  disabled={desabilitado}
                  onClick={() => onEscolher(lado)}
                  aria-label={t("elicitacao.par.tabela.prefiro", { lado })}
                  className="min-w-20 text-lg"
                >
                  {lado}
                </Botao>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderTop: "1px solid var(--borda)" }}>
            <th scope="row" className="pr-4 text-left text-[13px] font-medium" style={{ color: "var(--tinta)" }}>
              {a.nome}
            </th>
            {celula(a, true)}
            {celula(a, false)}
          </tr>
          <tr style={{ borderTop: "1px solid var(--borda)" }}>
            <th scope="row" className="pr-4 text-left text-[13px] font-medium" style={{ color: "var(--tinta)" }}>
              {b.nome}
            </th>
            {celula(b, false)}
            {celula(b, true)}
          </tr>
        </tbody>
      </table>
      <p className="mt-3 text-center text-[11px]" style={{ color: "var(--tinta-3)" }}>
        <span style={{ color: AZUL_TEXTO }}>{t("elicitacao.par.tabela.nota.melhor")}</span>
        {" · "}
        <span style={{ color: "var(--erro)" }}>{t("elicitacao.par.tabela.nota.pior")}</span>
      </p>
    </div>
  );
}

export function ComparacaoPares({
  criterios,
  ocupado,
  onConfirmar,
  onTrocarModo,
}: {
  criterios: CriterioOut[];
  ocupado: boolean;
  onConfirmar: (ordem: string[]) => void;
  /** Leva a pessoa ao modo de arrastar, que é a saída desta fase. */
  onTrocarModo?: () => void;
}) {
  const { t } = useIdioma();
  const [respostas, setRespostas] = useState<RespostaComparacao[]>([]);
  const chaves = useMemo(() => criterios.map((c) => c.chave), [criterios]);
  const estado = useMemo(() => reconstruir(chaves, respostas), [chaves, respostas]);

  const porChave = (chave: string) => criterios.find((c) => c.chave === chave)!;
  const comparacao = proxima(estado);
  const pronto = terminou(estado);
  const faltam = restantes(estado);

  /* A mesma pausa da pergunta de tradeoff, pelo mesmo motivo: aqui o par
     seguinte aparecia no mesmo quadro do clique, sem nem sequer uma ida ao
     servidor para marcar a passagem, e a pessoa não via qual critério tinha
     escolhido. */
  const [escolhida, setEscolhida] = useState<RespostaComparacao | null>(null);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [vista, setVista] = useState<"cartoes" | "tabela">("cartoes");

  useEffect(
    () => () => {
      if (relogio.current) clearTimeout(relogio.current);
    },
    [],
  );

  const responder = (r: RespostaComparacao) => {
    if (escolhida || ocupado) return;
    setEscolhida(r);
    relogio.current = setTimeout(() => {
      setRespostas((atuais) => [...atuais, r]);
      setEscolhida(null);
    }, ESPERA_CONFIRMACAO);
  };

  const estadoDe = (lado: RespostaComparacao) =>
    escolhida === null || escolhida === "indiferente"
      ? "neutro"
      : escolhida === lado
        ? "escolhido"
        : "preterido";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <span className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium" style={{ color: "var(--tinta)" }}>
            {pronto
              ? t("elicitacao.par.ordemDefinida")
              : t("elicitacao.par.pergunta")}
          </span>
          <Dica titulo={t("elicitacao.par.dica.titulo")}>
            <p>{t("elicitacao.par.dica.corpo1")}</p>
            <p>
              {t("elicitacao.par.dica.corpo2.antes")}
              <strong>{t("elicitacao.par.dica.corpo2.termo")}</strong>
              {t("elicitacao.par.dica.corpo2.depois")}
            </p>
          </Dica>
        </span>
        {!pronto && (
          <span className="num text-[12px]" style={{ color: "var(--tinta-3)" }}>
            {t(
              respostas.length === 1
                ? "elicitacao.par.respondidas.um"
                : "elicitacao.par.respondidas.varios",
              { n: respostas.length },
            )}{" "}
            ·{" "}
            {t(
              faltam === 1
                ? "elicitacao.par.restantes.um"
                : "elicitacao.par.restantes.varios",
              { n: faltam },
            )}
          </span>
        )}
      </div>

      {comparacao && (
        <>
          {/* As "View options" do oficial: a mesma pergunta em outra leitura. */}
          <Segmentado
            etiqueta={t("elicitacao.par.vista")}
            valor={vista}
            onEscolher={setVista}
            className="mb-3"
            opcoes={[
              { valor: "cartoes", rotulo: t("elicitacao.par.vista.cartoes") },
              { valor: "tabela", rotulo: t("elicitacao.par.vista.tabela") },
            ]}
          />
          {vista === "tabela" ? (
            <div className="flex flex-col items-center gap-3">
              <TabelaConsequencias
                a={porChave(comparacao.a)}
                b={porChave(comparacao.b)}
                desabilitado={ocupado || escolhida !== null}
                escolhida={escolhida}
                onEscolher={responder}
              />
              <Botao
                variante="texto"
                disabled={ocupado || escolhida !== null}
                onClick={() => responder("indiferente")}
              >
                {t("elicitacao.par.indiferente")}
              </Botao>
            </div>
          ) : (
          <div className="flex flex-col items-stretch gap-4 md:flex-row">
            <Cartao
              criterio={porChave(comparacao.a)}
              cor="var(--dado-a)"
              rotulo={t("elicitacao.par.melhorarIsto")}
              desabilitado={ocupado || escolhida !== null}
              estado={estadoDe("A")}
              onEscolher={() => responder("A")}
            />

            {/* No caminho entre as duas: é ali que o olho está enquanto se
                compara, e não abaixo dos cartões. */}
            <BotaoEntreCartoes
              rotulo={t("elicitacao.par.indiferente")}
              icone={<CaboDeGuerra />}
              desabilitado={ocupado || escolhida !== null}
              confirmado={escolhida === "indiferente"}
              onClick={() => responder("indiferente")}
              dica={
                <Dica titulo={t("elicitacao.par.indiferente.dica.titulo")}>
                  <p>{t("elicitacao.par.indiferente.dica.corpo1")}</p>
                  <p>{t("elicitacao.par.indiferente.dica.corpo2")}</p>
                </Dica>
              }
            />

            <Cartao
              criterio={porChave(comparacao.b)}
              cor="var(--dado-b)"
              rotulo={t("elicitacao.par.ouMelhorarIsto")}
              desabilitado={ocupado || escolhida !== null}
              estado={estadoDe("B")}
              onEscolher={() => responder("B")}
            />
          </div>
          )}

          {/* O empate tinha dois botões: o do meio e um de texto aqui embaixo.
              A redundância era intencional — nem todo mundo lê um ícone redondo
              como "responder" — mas cobrava caro: duas formas de dar a mesma
              resposta na mesma tela fazem procurar a diferença entre elas. Ficou
              o do meio, que é onde o olho está, agora com dica ao lado. */}
          {/* A saída, na mesma posição em que a tela de tradeoff põe a dela:
              logo abaixo do botão do meio, que é onde o olho está quando a
              pessoa trava. Faltava aqui -- e travar numa comparação sem ver
              nenhuma alternativa é pior do que nas perguntas de tradeoff,
              porque ali dá para pular e aqui não. */}
          {onTrocarModo && escolhida === null && (
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-[12px]" style={{ color: "var(--tinta-fraca)" }}>
                {t("elicitacao.par.travou")}
              </span>
              <button
                onClick={onTrocarModo}
                disabled={ocupado}
                className="tatil rounded-[var(--raio-controle)] px-1.5 py-1 text-sm underline underline-offset-2 disabled:opacity-40"
                style={{ color: "var(--accent)" }}
              >
                {t("elicitacao.par.travou.acao")}
              </button>
              <Dica titulo={t("elicitacao.par.travou.dica.titulo")}>
                <p>{t("elicitacao.par.travou.dica.corpo1")}</p>
                <p>{t("elicitacao.par.travou.dica.corpo2")}</p>
              </Dica>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4">
            {respostas.length > 0 && (
              <button
                onClick={() => setRespostas(respostas.slice(0, -1))}
                disabled={ocupado || escolhida !== null}
                className="tatil flex items-center gap-1.5 text-sm disabled:opacity-40"
                style={{ color: "var(--tinta-fraca)" }}
              >
                <ArrowCounterClockwise size={13} weight="bold" />
                {t("elicitacao.par.voltarUma")}
              </button>
            )}
          </div>
        </>
      )}

      {/* a ordem construída até agora */}
      {estado.ordenados.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[11px]" style={{ color: "var(--tinta-fraca)" }}>
            {pronto
              ? t("elicitacao.par.ordemFinal")
              : t("elicitacao.par.ordemParcial")}
          </p>
          <ol className="space-y-1">
            {estado.ordenados.map((chave, i) => (
              <li key={chave} className="flex items-center gap-2.5 text-[13px]">
                <span className="num w-4" style={{ color: "var(--tinta-fraca)" }}>
                  {i + 1}
                </span>
                <span style={{ color: "var(--tinta-2)" }}>{porChave(chave).nome}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {estado.empates.length > 0 && (
        <p className="prosa mt-4 text-[12px]" style={{ color: "var(--tinta-3)" }}>
          {t(
            estado.empates.length === 1
              ? "elicitacao.par.empates.um"
              : "elicitacao.par.empates.varios",
            { n: estado.empates.length },
          )}
        </p>
      )}

      {pronto && (
        <Botao
          onClick={() => onConfirmar(estado.ordenados)}
          disabled={ocupado}
          className="mt-5"
        >
          {t("elicitacao.confirmarOrdem")}
        </Botao>
      )}
    </div>
  );
}
