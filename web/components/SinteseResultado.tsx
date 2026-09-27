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
      {/* Tratamento editorial, e não de painel de controle.
          Antes a recomendação — que é a resposta do produto inteiro — saía em
          20px, menor que vários rótulos ao redor, e as leituras vinham em 13px
          coladas umas nas outras. A hierarquia dizia que tudo ali tinha o mesmo
          peso, e nada tinha peso nenhum.

          Agora é a estrutura de uma página impressa: sobrelinha, manchete,
          linha de apoio, e o corpo numa medida de leitura. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span
          className="inline-flex items-center gap-1.5 rounded-[var(--raio-controle)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]"
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

      {/* A manchete. `display` traz o tracking negativo e a entrelinha curta
          que a família já usa nos títulos grandes -- a mesma voz do resto do
          produto, e não um tamanho avulso inventado aqui. */}
      <p
        className="display mt-3 max-w-[22ch] text-[30px] font-semibold sm:text-[38px]"
        style={{ color: analise.resolvido ? "var(--sucesso)" : "var(--tinta)" }}
      >
        {analise.resumo}
      </p>

      {encerrado && !analise.resolvido && (
        <p className="prosa mt-3 text-[15px]" style={{ color: "var(--tinta-3)" }}>
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
          className="mt-6 flex items-start gap-3 rounded-[var(--raio-controle)] border px-4 py-3.5"
          style={{ borderColor: "var(--borda)", background: "var(--painel-fundo)" }}
        >
          <Prohibit
            size={15}
            weight="bold"
            style={{ color: "var(--aviso)", flexShrink: 0, marginTop: 2 }}
          />
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: "var(--tinta-3)" }}
            >
              {t("resultado.veto.titulo")}
            </p>
            <p className="prosa mt-1 text-[14px]" style={{ color: "var(--tinta-2)" }}>
              {analise.ressalva}
            </p>
          </div>
        </div>
      )}

      {achados.length > 0 && (
        <div className="mt-9">
          {/* Sobrelinha com fio, como divisão de seção em página impressa: diz
              "começa outra coisa aqui" sem gastar um título grande. */}
          <h4
            className="mb-4 border-t pt-4 text-[11px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "var(--tinta-3)", borderColor: "var(--borda)" }}
          >
            {t("resultado.insight.titulo")}
          </h4>
          {/* O ícone fica fora da coluna de texto, e não no meio dela: assim
              todas as linhas alinham no mesmo eixo, que era o desalinho mais
              visível da versão anterior. */}
          <ul className="space-y-4">
            {achados.map((achado) => {
              const Icone = ICONE[achado.tom];
              return (
                <li key={achado.chave} className="grid grid-cols-[1.25rem_1fr] gap-x-3">
                  <Icone
                    size={17}
                    weight={achado.tom === "neutro" ? "regular" : "fill"}
                    style={{ color: TINTA[achado.tom], marginTop: 3 }}
                  />
                  <p
                    className="prosa text-[15px]"
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
