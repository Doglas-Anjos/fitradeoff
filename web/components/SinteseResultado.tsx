"use client";

/**
 * O cabecalho do resultado e as leituras que saem dele.
 *
 * Duas coisas faltavam na tela. A primeira: nada distinguia "acabou" de "ainda
 * estou respondendo" -- a mesma secao, com a mesma cara, servia para os dois, e
 * a unica diferenca era a palavra do titulo. A segunda: a tela parava na
 * recomendacao e em duas faixas, deixando para o decisor a leitura que os
 * numeros ja permitiam fazer.
 *
 * As frases vem de `insightsDoResultado`, que e onde mora a regra de nao
 * afirmar mais do que os dados sustentam. Aqui so se desenha.
 */

import { CheckCircle, Info, Prohibit, Warning } from "@phosphor-icons/react";

import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/paineis";
import { insightsDoResultado } from "@/lib/insights";
import type { Estado, Problema } from "@/lib/types";

const ICONE = {
  forte: CheckCircle,
  neutro: Info,
  ressalva: Warning,
} as const;

const TINTA = {
  forte: "var(--sucesso)",
  neutro: "var(--tinta-fraca)",
  ressalva: "var(--aviso)",
} as const;

export function SinteseResultado({
  problema,
  estado,
  encerrado,
}: {
  problema: Problema;
  estado: Estado;
  /** A decisão foi encerrada — pelo motor ou pelo decisor. */
  encerrado: boolean;
}) {
  const { t } = useIdioma();
  const analise = estado.analise;
  if (!analise) return null;

  const achados = insightsDoResultado(problema, estado);
  const declaracoes = estado.declaracoes ?? 0;

  return (
    <div>
      {/* Faixa de estado: o selo diz em que ponto a decisão está, e o número de
          declarações diz sobre o que o resultado se apoia. */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span
          className="inline-flex items-center gap-1.5 rounded-[var(--raio-controle)] px-2 py-1 text-[11px] font-medium uppercase tracking-wide"
          style={
            encerrado
              ? { color: "var(--accent-tinta)", background: "var(--accent)" }
              : { color: "var(--tinta-2)", background: "var(--painel-fundo)" }
          }
        >
          {encerrado && <CheckCircle size={13} weight="fill" />}
          {t(encerrado ? "resultado.final.selo" : "resultado.final.emAndamento")}
        </span>
        <span className="num text-[12px]" style={{ color: "var(--tinta-fraca)" }}>
          {t(
            declaracoes === 1
              ? "resultado.final.declaracoes.uma"
              : "resultado.final.declaracoes.varias",
            { n: declaracoes },
          )}
        </span>
      </div>

      <p
        className="prosa text-[20px] leading-snug"
        style={{
          color: analise.resolvido ? "var(--sucesso)" : "var(--tinta)",
          fontWeight: 500,
        }}
      >
        {analise.resumo}
      </p>

      {encerrado && !analise.resolvido && (
        <p className="prosa mt-1.5 text-[12px]" style={{ color: "var(--tinta-3)" }}>
          {t("resultado.final.aindaAberto")}
        </p>
      )}

      {/* Logo abaixo do resumo porque qualifica tudo o que vem depois: as
          faixas, as dominâncias e os insights foram todos apurados sob a
          penalidade. Publicar o número sem isto seria apresentar um teto
          conservador como se fosse exato.

          O corpo vem do motor, como `analise.resumo` e as demais frases da
          análise: é afirmação sobre o cálculo, e ter uma segunda cópia aqui
          seria criar duas versões do que o sistema garante. */}
      {analise.veto_ativo && analise.ressalva && (
        <div
          role="note"
          className="mt-4 flex items-start gap-2.5 rounded-[var(--raio-controle)] border px-3 py-2.5"
          style={{ borderColor: "var(--borda)", background: "var(--painel-fundo)" }}
        >
          <Prohibit
            size={15}
            weight="bold"
            style={{ color: "var(--aviso)", flexShrink: 0, marginTop: 2 }}
          />
          <div>
            <p className="text-[12px] font-medium" style={{ color: "var(--tinta-2)" }}>
              {t("resultado.veto.titulo")}
            </p>
            <p
              className="prosa mt-0.5 text-[12.5px]"
              style={{ color: "var(--tinta-3)" }}
            >
              {analise.ressalva}
            </p>
          </div>
        </div>
      )}

      {achados.length > 0 && (
        <div className="mt-6">
          <h4
            className="mb-2.5 text-[13px] font-medium"
            style={{ color: "var(--tinta-2)" }}
          >
            {t("resultado.insight.titulo")}
          </h4>
          <ul className="space-y-2.5">
            {achados.map((achado) => {
              const Icone = ICONE[achado.tom];
              return (
                <li key={achado.chave} className="flex items-start gap-2">
                  <Icone
                    size={15}
                    weight={achado.tom === "neutro" ? "regular" : "fill"}
                    style={{ color: TINTA[achado.tom], flexShrink: 0, marginTop: 2 }}
                  />
                  <p
                    className="prosa text-[13px]"
                    style={{
                      color:
                        achado.tom === "forte" ? "var(--tinta)" : "var(--tinta-2)",
                    }}
                  >
                    {t(achado.chave, achado.valores)}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
