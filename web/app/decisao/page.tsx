"use client";

/**
 * O fluxo classico do FITradeoff.
 *
 * Layout de duas colunas assimetricas: o trabalho a esquerda, o estado fixo a
 * direita. E uma ferramenta, nao uma pagina -- quem esta decidindo precisa ver
 * o conjunto encolher enquanto responde, ou as perguntas parecem nao levar a
 * lugar nenhum.
 *
 * Cada etapa so aparece quando a anterior fecha, porque o metodo e sequencial:
 * nao ha pergunta de tradeoff antes da ordenacao dos pesos, nem resultado antes
 * de haver resposta.
 *
 * Esta pagina so compoe: o estado e as mutacoes ficam em `contexto.tsx`, e
 * cada etapa le deles por `useDecisao()`.
 */

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { IndicadorCalculando } from "@/components/IndicadorCalculando";
import { PainelProgresso } from "@/components/PainelProgresso";
import { PainelSalvas } from "@/components/PainelSalvas";

import { CabecalhoDecisao } from "./CabecalhoDecisao";
import { DecisaoProvider, useDecisao } from "./contexto";
import { EtapaOrdem } from "./EtapaOrdem";
import { EtapaPerguntas, SecaoConflito } from "./EtapaPerguntas";
import { EtapaProblema } from "./EtapaProblema";
import { EtapaResultado } from "./EtapaResultado";
import { NovaDecisao } from "./NovaDecisao";

/* Como os painéis de resultado, a trilha só serve depois de haver decisão
   aberta; não entra no pacote de quem só vem cadastrar. */
const TrilhaAuditoria = dynamic(() =>
  import("@/components/TrilhaAuditoria").then((m) => m.TrilhaAuditoria),
);

export default function DecisaoPage() {
  return (
    <Suspense fallback={<CarregandoDecisao />}>
      <DecisaoProvider>
        <TelaDecisao />
      </DecisaoProvider>
    </Suspense>
  );
}

function CarregandoDecisao() {
  return (
    <main className="mx-auto max-w-6xl px-5 pt-10">
      <div className="esqueleto h-9 w-72" />
      <div className="esqueleto mt-6 h-64 w-full" />
    </main>
  );
}

function TelaDecisao() {
  const {
    state: { problema, estado, etapa, ocupado },
    actions: { receber, desfazer },
  } = useDecisao();

  if (!problema) return <NovaDecisao />;

  return (
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-8">
      <CabecalhoDecisao />

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
        <div className="min-w-0 space-y-7">
          {etapa === "problema" && <EtapaProblema />}
          {etapa === "ordem" && <EtapaOrdem />}
          {etapa === "perguntas" && <EtapaPerguntas />}
          <SecaoConflito />
          <EtapaResultado />

          {/* A trilha era uma seção sempre aberta, com as declarações e nada
              além. Virou botão por dois motivos: quem decide não precisa dela
              na frente o tempo todo, e quem audita precisa de mais do que ela
              mostrava — as restrições que cada declaração impôs ao espaço de
              pesos, que é onde a recomendação de fato se sustenta. */}
          {etapa !== "problema" && (
            <TrilhaAuditoria decisaoId={problema.id} versao={estado?.declaracoes} />
          )}
        </div>

        {/* A coluna da direita acompanha a rolagem e agora só carrega o
            progresso, que e o que muda a cada resposta. As decisoes salvas
            sairam daqui: elas sao um atalho, e enquanto dividiam esta coluna
            abrir e fechar a lista mudava a largura da coluna de trabalho - a
            pergunta de tradeoff refluia embaixo dos olhos de quem estava
            comparando as duas situacoes. */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <PainelProgresso
            problema={problema}
            estado={estado}
            onDesfazer={desfazer}
            podeDesfazer={!ocupado && (estado?.declaracoes ?? 0) > 0}
          />
        </div>
      </div>

      {/* Fora da grade de proposito: o painel se prende a borda direita da
          janela e sobrepoe o conteudo, entao nao pode ser filho de nada que
          participe do layout. */}
      <PainelSalvas onAbrir={receber} idAtual={problema.id} ocupado={ocupado} />
      <IndicadorCalculando ativo={ocupado} />
    </main>
  );
}
