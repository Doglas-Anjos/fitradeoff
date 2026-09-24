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
  const contagem = {
    escolha: {
      rotulo: "Em disputa",
      numero: estado?.elicitacao_iniciada ? Math.max(indefinidas, 1) : total,
      sufixo: `de ${total}`,
    },
    ranking: {
      rotulo: resolvido ? "Posições definidas" : "Sem posição",
      numero: resolvido ? total : indefinidas,
      sufixo: `de ${total}`,
    },
    sorting: {
      rotulo: resolvido ? "Classificadas" : "Sem classe",
      numero: resolvido ? total : indefinidas,
      sufixo: `de ${total}`,
    },
    portfolio: {
      rotulo: resolvido ? "Carteira definida" : "Projetos oscilando",
      numero: resolvido ? (analise?.sempre_selecionados?.length ?? 0) : indefinidas,
      sufixo: resolvido ? "projetos" : `de ${total}`,
    },
  }[estado?.problematica ?? "escolha"];

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
            <Dica titulo="O que este número conta">
              {riscaDescartadas ? (
                <>
                  <p>
                    As alternativas que ainda podem ganhar, dependendo de
                    informação que você não deu.
                  </p>
                  <p>
                    As riscadas foram descartadas: não existe nenhum conjunto de
                    pesos compatível com suas respostas que as favoreça.
                  </p>
                </>
              ) : (
                <p>
                  Quantas alternativas já têm situação definida nesta leitura.
                  Nenhuma é descartada aqui — todas aparecem no resultado.
                </p>
              )}
            </Dica>
          </span>
          <span
            className="num text-[13px]"
            style={{ color: "var(--tinta-3)" }}
          >
            {estado?.declaracoes ? `${estado.declaracoes - 1} respostas` : "—"}
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
            Voltar um passo
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
          Exportar planilha
        </a>
      </div>
    </aside>
  );
}
