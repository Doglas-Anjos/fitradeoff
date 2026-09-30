"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";

import { BotaoSalvarGrafico } from "@/components/BotaoSalvarGrafico";
import { type Etapa } from "@/components/Etapas";
import { JulgamentoHolistico } from "@/components/JulgamentoHolistico";
import { RangeChart, type Faixa } from "@/components/RangeChart";
import { SinteseResultado } from "@/components/SinteseResultado";
import { Dica } from "@/components/ui";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/telas";
import "@/lib/i18n/estrutura";

import { useDecisao } from "./contexto";
import { Secao } from "./Secao";

/* Os painéis de resultado só existem depois da primeira resposta; carregá-los
   com a página fazia quem abre para cadastrar baixar os gráficos. */
const ResultadoAnalise = dynamic(() =>
  import("@/components/ResultadoAnalise").then((m) => m.ResultadoAnalise),
);
const SensibilidadeConsequencias = dynamic(() =>
  import("@/components/SensibilidadeConsequencias").then(
    (m) => m.SensibilidadeConsequencias,
  ),
);
const Visualizacoes = dynamic(() =>
  import("@/components/Visualizacoes").then((m) => m.Visualizacoes),
);

/* A comparação e o resultado, que aparecem juntos nas etapas "Perguntas" e
   "Resultado", e a sensibilidade, que só existe depois do fim. */
export function EtapaResultado() {
  const {
    state: { encerrado },
  } = useDecisao();

  /* A coluna existe mesmo vazia, como sempre existiu: ela é irmã das etapas
     num `space-y`, e tirá-la mudaria o espaçamento das outras. */
  return (
    <>
      {/* Encerrada, a resposta vem primeiro. Ate o fim a comparacao vem
          antes porque e ferramenta de trabalho: e olhando para ela que
          se faz o julgamento holistico. Depois do fim ela vira consulta,
          e deixar o resultado abaixo de um grafico fazia a tela de
          resultado final comecar por outra coisa. Duas secoes irmas,
          entao inverter a coluna basta -- nada se move no DOM. */}
      <div className={`flex gap-10 ${encerrado ? "flex-col-reverse" : "flex-col"}`}>
        <SecaoComparacao />
        <SecaoResultado />
      </div>
      <SecaoSensibilidade />
    </>
  );
}

function SecaoComparacao() {
  const { t } = useIdioma();
  const {
    state: { problema, estado, etapa, ocupado, encerrado },
    actions: { encerrar, julgar },
  } = useDecisao();
  const areaComparacao = useRef<HTMLDivElement>(null);
  if (!problema || !naComparacao(etapa)) return null;
  if (!estado?.elicitacao_iniciada || !estado.consistente) return null;

  return (
    <Secao
      titulo={t("tela.decisao.comparar.titulo")}
      acessorio={
        <span className="flex items-center gap-4">
          <BotaoSalvarGrafico
            alvo={areaComparacao}
            nome={t("tela.decisao.comparar.arquivo", { nome: problema.nome })}
          />
          {!encerrado && (
            <button
              onClick={encerrar}
              className="tatil text-[12px] underline underline-offset-2"
              style={{ color: "var(--tinta-3)" }}
              title={t("tela.decisao.encerrar.titulo")}
            >
              {t("tela.decisao.encerrar")}
            </button>
          )}
        </span>
      }
    >
      <div ref={areaComparacao}>
        <Visualizacoes
          key={problema.id}
          problema={problema}
          destaque={estado.analise?.potencialmente_otimas}
        />
      </div>
      <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--borda)" }}>
        <JulgamentoHolistico
          alternativas={Object.keys(problema.consequencias)}
          ocupado={ocupado}
          onJulgar={julgar}
        />
      </div>
    </Secao>
  );
}

function SecaoResultado() {
  const { t } = useIdioma();
  const {
    state: { problema, estado, etapa, encerrado, encerradoPeloUsuario },
    actions: { reabrir },
  } = useDecisao();
  if (!problema || !naComparacao(etapa) || !estado?.analise) return null;

  return (
    <Secao
      /* "Resultado" é a mesma palavra da trilha de etapas, então a
         chave vem de lá em vez de nascer duplicada aqui. */
      titulo={encerrado ? t("estrutura.etapas.resultado") : t("tela.decisao.ondeEstamos")}
      acessorio={
        encerradoPeloUsuario && !estado.encerrado ? (
          <button
            onClick={reabrir}
            className="tatil text-[12px] underline underline-offset-2"
            style={{ color: "var(--tinta-3)" }}
          >
            {t("tela.decisao.voltarAResponder")}
          </button>
        ) : undefined
      }
    >
      {!estado.consistente ? (
        <p className="prosa text-sm" style={{ color: "var(--erro)" }}>
          {estado.aviso}
        </p>
      ) : (
        <>
          <SinteseResultado problema={problema} estado={estado} encerrado={encerrado} />
          <ResultadoAnalise analise={estado.analise} decisaoId={estado.id} />
        </>
      )}

      {estado.faixas_de_valor && Object.keys(estado.faixas_de_valor).length > 0 && (
        <div className="mt-8">
          <RangeChart
            titulo={t("tela.decisao.faixasValor.titulo")}
            dica={
              <Dica titulo={t("tela.decisao.faixasValor.dica.titulo")}>
                <p>{t("tela.decisao.faixasValor.dica.corpo1")}</p>
                <p>{t("tela.decisao.faixasValor.dica.corpo2")}</p>
              </Dica>
            }
            faixas={paraFaixas(estado.faixas_de_valor, estado.analise.recomendacao)}
          />
        </div>
      )}

      {estado.faixas_de_peso && (
        <div className="mt-8">
          <RangeChart
            titulo={t("tela.decisao.faixasPeso.titulo")}
            dica={
              <Dica titulo={t("tela.decisao.faixasPeso.dica.titulo")}>
                <p>{t("tela.decisao.faixasPeso.dica.corpo1")}</p>
                <p>{t("tela.decisao.faixasPeso.dica.corpo2")}</p>
              </Dica>
            }
            faixas={paraFaixas(estado.faixas_de_peso)}
          />
        </div>
      )}
    </Secao>
  );
}

function SecaoSensibilidade() {
  const { t } = useIdioma();
  const {
    state: { problema, estado, etapa, encerrado },
  } = useDecisao();
  if (!problema || etapa !== "resultado" || !encerrado || !estado?.consistente) return null;

  return (
    <Secao titulo={t("tela.decisao.sensibilidade.titulo")}>
      <SensibilidadeConsequencias decisaoId={problema.id} criterios={problema.criterios} />
    </Secao>
  );
}

/* A comparação e o resultado acompanham as perguntas e o fim; na revisão dos
   dados ou da ordem, saem da frente. */
function naComparacao(etapa: Etapa) {
  return etapa === "perguntas" || etapa === "resultado";
}

function paraFaixas(
  dados: Record<string, [number, number]>,
  destaque?: string | null,
): Faixa[] {
  return Object.entries(dados).map(([rotulo, [minimo, maximo]]) => ({
    rotulo,
    minimo,
    maximo,
    destaque: destaque ? rotulo === destaque : undefined,
  }));
}
