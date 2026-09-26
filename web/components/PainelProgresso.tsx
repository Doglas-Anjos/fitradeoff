"use client";

/**
 * O painel fixo da direita: quantas alternativas ainda estao em jogo.
 *
 * E o elemento em que a interface gasta sua atencao. O metodo inteiro existe
 * para encolher esse conjunto, e ver isso acontecer e o que da ao decisor a
 * sensacao de progresso -- sem ele, responder perguntas abstratas sobre
 * situacoes ruins parece nao levar a lugar nenhum.
 */

import { ArrowCounterClockwise, CheckCircle, Circle, DownloadSimple, XCircle } from "@phosphor-icons/react";

import { Dica } from "@/components/ui";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/paineis";
import type { Estado, Problema } from "@/lib/types";

export function PainelProgresso({
  problema,
  estado,
  onDesfazer,
  podeDesfazer,
}: {
  problema: Problema;
  estado: Estado | null;
  onDesfazer: () => void;
  podeDesfazer: boolean;
}) {
  const { t } = useIdioma();
  const total = Object.keys(problema.consequencias).length;
  const nomes = Object.keys(problema.consequencias);
  const analise = estado?.analise;
  const indefinidas = analise?.indefinidas.length ?? total;
  const recomendada = analise?.recomendacao ?? null;

  /* Cada problematica conta uma coisa diferente. "Em disputa" so faz sentido
     para escolha; num ranking resolvido nao ha uma alternativa em disputa --
     ha zero, e todas tem posicao. Reaproveitar o rotulo daria um "1 de 4"
     enganoso justamente na tela de resultado. */
  const resolvido = analise?.resolvido ?? false;
  const deTotal = t("progresso.deTotal", { total });
  const selecionados = analise?.sempre_selecionados?.length ?? 0;
  const contagem = {
    escolha: {
      rotulo: t("progresso.escolha.emDisputa"),
      numero: estado?.elicitacao_iniciada ? Math.max(indefinidas, 1) : total,
      sufixo: deTotal,
      /* De `total` até 1: descartar a penúltima é chegar ao fim. */
      fracao: total > 1
        ? (total - Math.max(indefinidas, 1)) / (total - 1)
        : 1,
    },
    ranking: {
      rotulo: t(
        resolvido ? "progresso.ranking.definidas" : "progresso.ranking.indefinidas",
      ),
      numero: resolvido ? total : indefinidas,
      sufixo: deTotal,
      /* Aqui todas as alternativas seguem até o fim; o que encolhe é quantas
         ainda não têm lugar definido. */
      fracao: resolvido ? 1 : total > 0 ? (total - indefinidas) / total : 0,
    },
    sorting: {
      rotulo: t(
        resolvido ? "progresso.sorting.definidas" : "progresso.sorting.indefinidas",
      ),
      numero: resolvido ? total : indefinidas,
      sufixo: deTotal,
      /* Aqui todas as alternativas seguem até o fim; o que encolhe é quantas
         ainda não têm lugar definido. */
      fracao: resolvido ? 1 : total > 0 ? (total - indefinidas) / total : 0,
    },
    portfolio: {
      rotulo: t(
        resolvido ? "progresso.portfolio.definida" : "progresso.portfolio.indefinida",
      ),
      numero: resolvido ? selecionados : indefinidas,
      /* Resolvido, o número é de projetos na carteira, e uma carteira de um
         projeto é possível: o plural sai de chave própria. */
      sufixo: resolvido
        ? t(selecionados === 1 ? "progresso.projeto.um" : "progresso.projeto.varios")
        : deTotal,
      /* O que resolve a carteira é parar de oscilar: os que entram sempre ou
         nunca já estão decididos. */
      fracao: resolvido ? 1 : total > 0 ? (total - indefinidas) / total : 0,
    },
    /* A carteira por razao conta igual a combinatorial: as duas terminam num
       conjunto dentro do orcamento. O que as separa e o criterio de escolha, e
       isso aparece no resultado, nao aqui. */
    beneficio_custo: {
      rotulo: t(
        resolvido ? "progresso.portfolio.definida" : "progresso.portfolio.indefinida",
      ),
      numero: resolvido ? selecionados : indefinidas,
      sufixo: resolvido
        ? t(selecionados === 1 ? "progresso.projeto.um" : "progresso.projeto.varios")
        : deTotal,
      /* O que resolve a carteira é parar de oscilar: os que entram sempre ou
         nunca já estão decididos. */
      fracao: resolvido ? 1 : total > 0 ? (total - indefinidas) / total : 0,
    },
  }[estado?.problematica ?? "escolha"];

  /* A primeira declaração é a ordem dos critérios, não uma resposta a pergunta;
     sem nenhuma, não há contagem a mostrar. */
  const respostas = estado?.declaracoes ? estado.declaracoes - 1 : null;

  /* Para escolha, riscar as descartadas informa. Nas outras leituras todas as
     alternativas seguem no resultado, entao riscar seria mentira. */
  const riscaDescartadas = (estado?.problematica ?? "escolha") === "escolha";
  const sobreviventes = riscaDescartadas
    ? (analise?.potencialmente_otimas ?? (recomendada ? [recomendada] : nomes))
    : nomes;

  return (
    <aside className="lg:sticky lg:top-20">
      <div
        className="rounded-[var(--raio-painel)] border p-5"
        style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
      >
        <div className="flex items-baseline justify-between">
          <span className="flex items-center gap-1.5">
            <span className="text-[13px]" style={{ color: "var(--tinta-3)" }}>
              {contagem.rotulo}
            </span>
            <Dica titulo={t("progresso.dica.titulo")}>
              {riscaDescartadas ? (
                <>
                  <p>{t("progresso.dica.escolha.podemGanhar")}</p>
                  <p>{t("progresso.dica.escolha.riscadas")}</p>
                </>
              ) : (
                <p>{t("progresso.dica.outras")}</p>
              )}
            </Dica>
          </span>
          <span
            className="num text-[13px]"
            style={{ color: "var(--tinta-3)" }}
          >
            {respostas === null
              ? "-"
              : t(respostas === 1 ? "resumo.resposta.um" : "resumo.resposta.varios", {
                  n: respostas,
                })}
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span
            className="num text-4xl font-semibold tabular-nums"
            style={{ color: "var(--tinta)", letterSpacing: "-0.03em" }}
          >
            {contagem.numero}
          </span>
          <span className="text-sm" style={{ color: "var(--tinta-3)" }}>
            {contagem.sufixo}
          </span>
        </div>

        {/* A barra do avanço.
            Ela mede o que encerra o processo, e não perguntas respondidas sobre
            um total: no FITradeoff esse total não existe de antemão. O método
            para quando o conjunto se resolve, e isso pode acontecer na primeira
            resposta ou na décima -- decidir com menos perguntas do que a
            elicitação completa pediria é o ponto do método, e um denominador
            inventado transformaria justamente isso em "faltam 9". */}
        {estado?.elicitacao_iniciada && (
          <div className="mt-3">
            <div
              className="h-1.5 w-full overflow-hidden rounded-full"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(contagem.fracao * 100)}
              aria-label={t("progresso.barra.rotulo")}
              style={{ background: "var(--dado-trilho)" }}
            >
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${Math.max(contagem.fracao * 100, 2)}%`,
                  background: resolvido ? "var(--sucesso)" : "var(--accent)",
                }}
              />
            </div>
            <p className="mt-1.5 text-[11px]" style={{ color: "var(--tinta-fraca)" }}>
              {t(resolvido ? "progresso.barra.fim" : "progresso.barra.andamento")}
            </p>
          </div>
        )}

        {/* as alternativas como marcas: as descartadas apagam, nao somem */}
        <ul className="mt-5 space-y-2">
          {nomes.map((nome) => {
            const viva = sobreviventes.includes(nome);
            const vencedora = nome === recomendada;
            return (
              <li key={nome} className="flex items-center gap-2.5">
                {vencedora ? (
                  <CheckCircle size={14} weight="fill" style={{ color: "var(--sucesso)" }} />
                ) : viva ? (
                  <Circle size={14} weight="bold" style={{ color: "var(--accent)" }} />
                ) : (
                  <XCircle size={14} weight="regular" style={{ color: "var(--tinta-fraca)" }} />
                )}
                <span
                  className="truncate text-[13px] transition-colors duration-300"
                  style={{
                    color: viva ? "var(--tinta-2)" : "var(--tinta-fraca)",
                    textDecoration: viva ? "none" : "line-through",
                    fontWeight: vencedora ? 500 : 400,
                  }}
                  title={nome}
                >
                  {nome}
                </span>
              </li>
            );
          })}
        </ul>

        {podeDesfazer && (
          <button
            onClick={onDesfazer}
            className="tatil mt-5 flex w-full items-center justify-center gap-2 rounded-[var(--raio-controle)] border py-2 text-[13px]"
            style={{ borderColor: "var(--borda)", color: "var(--tinta-2)" }}
          >
            <ArrowCounterClockwise size={14} weight="bold" />
            {t("progresso.desfazer")}
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 px-1">
        <a
          href={`/api/decisoes/${problema.id}/exportar`}
          className="tatil flex items-center gap-1.5 text-[13px]"
          style={{ color: "var(--tinta-3)" }}
        >
          <DownloadSimple size={14} />
          {t("progresso.exportar")}
        </a>
      </div>
    </aside>
  );
}
