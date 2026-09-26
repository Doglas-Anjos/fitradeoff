"use client";

/**
 * A avaliação intra-critério, como etapa do fluxo.
 *
 * O método não supõe que valor cresça linearmente com desempenho: ir de 30 para
 * 25 dias pode valer muito mais do que ir de 15 para 10. Quem quiser dizer isso
 * declara a curva de valor do critério; quem não disser nada fica com a reta,
 * que é o padrão e é uma escolha legítima.
 *
 * O bloco existia, mas só dentro da etapa "Problema" de uma decisão já criada —
 * ou seja, atrás de um clique que ninguém dá. No sistema de referência isto é um
 * passo do caminho, com um atalho para declarar tudo linear e seguir. Aqui ele
 * aparece antes da ordenação, que é o último momento em que ainda pode mudar:
 * depois que a elicitação começa, as respostas já dadas se referem a uma escala,
 * e trocá-la invalidaria o que foi declarado.
 */

import { CheckCircle, PencilSimple } from "@phosphor-icons/react";
import { useState } from "react";

import { CurvaDeValor, type Ponto } from "@/components/CurvaDeValor";
import { Dica, Selo } from "@/components/ui";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/telas";
import type { CriterioOut } from "@/lib/types";

export function AvaliacaoIntraCriterio({
  criterios,
  ocupado,
  onSalvar,
  /** Fechada, a seção vira uma linha resumindo o que está declarado. */
  comoResumo = false,
}: {
  criterios: CriterioOut[];
  ocupado: boolean;
  onSalvar: (criterio: string, pontos: Ponto[] | null) => void;
  comoResumo?: boolean;
}) {
  const { t } = useIdioma();
  const [emEdicao, setEmEdicao] = useState<string | null>(null);
  /* Aberta por padrão no fluxo, para a etapa não passar despercebida; fechada
     quando só serve de consulta. */
  const [aberta, setAberta] = useState(!comoResumo);

  const ajustados = criterios.filter((c) => c.curva_de_valor).length;
  const todosLineares = ajustados === 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <span className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium" style={{ color: "var(--tinta)" }}>
            {t("tela.decisao.curvas.titulo")}
          </span>
          <Dica titulo={t("tela.decisao.curvas.dica.titulo")}>
            <p>{t("tela.decisao.curvas.dica.corpo1")}</p>
            <p>{t("tela.decisao.curvas.dica.corpo2")}</p>
          </Dica>
        </span>

        <span className="flex items-center gap-2.5">
          <Selo tom={todosLineares ? "neutro" : "accent"}>
            {todosLineares
              ? t("tela.decisao.curvas.todasLineares")
              : t(
                  ajustados === 1
                    ? "tela.decisao.curvas.ajustada.uma"
                    : "tela.decisao.curvas.ajustada.varias",
                  { n: ajustados },
                )}
          </Selo>
          <button
            type="button"
            onClick={() => setAberta(!aberta)}
            className="tatil text-[12px] underline underline-offset-2"
            style={{ color: "var(--tinta-3)" }}
          >
            {t(aberta ? "tela.decisao.curvas.fechar" : "tela.decisao.curvas.abrir")}
          </button>
        </span>
      </div>

      {aberta && (
        <div className="mt-3">
          <p className="prosa mb-3 text-[12px]" style={{ color: "var(--tinta-3)" }}>
            {t("tela.decisao.curvas.ajuda")}
          </p>

          <ul className="space-y-1.5">
            {criterios.map((c) => {
              const ajustado = Boolean(c.curva_de_valor);
              return (
                <li key={c.chave} className="flex items-center gap-3 text-[13px]">
                  <span
                    aria-hidden
                    style={{ color: ajustado ? "var(--accent)" : "var(--tinta-fraca)" }}
                  >
                    <CheckCircle size={14} weight={ajustado ? "fill" : "regular"} />
                  </span>
                  <span
                    className="min-w-0 flex-1 truncate"
                    style={{ color: "var(--tinta-2)" }}
                  >
                    {c.nome}
                  </span>
                  <span style={{ color: "var(--tinta-fraca)" }}>
                    {ajustado
                      ? t("tela.decisao.curva.pontos", { n: c.curva_de_valor!.length })
                      : t("tela.decisao.curva.linear")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEmEdicao(emEdicao === c.chave ? null : c.chave)}
                    disabled={ocupado}
                    className="tatil flex items-center gap-1 underline underline-offset-2 disabled:opacity-40"
                    style={{ color: "var(--accent)" }}
                  >
                    <PencilSimple size={12} weight="bold" />
                    {t("tela.decisao.curva.ajustar")}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* O atalho do sistema de referência: quem não quer mexer diz isso e
              segue. Não chama o servidor — a reta já é o que está valendo; o
              botão existe para a pessoa saber que passar direto é uma escolha, e
              não um esquecimento. */}
          {todosLineares && (
            <p className="mt-3 text-[12px]" style={{ color: "var(--tinta-fraca)" }}>
              {t("tela.decisao.curvas.seguirLinear")}
            </p>
          )}

          {emEdicao && (
            <div className="mt-4">
              <CurvaDeValor
                criterio={criterios.find((c) => c.chave === emEdicao)!}
                inicial={
                  criterios.find((c) => c.chave === emEdicao)?.curva_de_valor ?? undefined
                }
                onSalvar={(pontos) => {
                  onSalvar(emEdicao, pontos);
                  setEmEdicao(null);
                }}
                onCancelar={() => setEmEdicao(null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
