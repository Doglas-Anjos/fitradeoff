"use client";

import { CaretRight } from "@phosphor-icons/react";
import { useState } from "react";

import { Campo, Dica, Entrada, Selo } from "@/components/ui";
import { useIdioma } from "@/lib/i18n";
import { comNos } from "@/lib/i18n/estrutura";
import "@/lib/i18n/nucleo";
import { temVeto, type CriterioRascunho } from "@/lib/rascunho";

/**
 * Os limites do modelo de veto, num bloco que começa fechado.
 *
 * Fechado porque a maioria das decisões não tem veto, e um par de campos
 * sempre aberto sugere que falta preencher. Aberto assim que há algo
 * declarado, para que reabrir o critério não esconda o que já foi dito.
 *
 * O texto explica o que a penalidade faz, e não só o que digitar: um campo
 * chamado "limite de veto" sem isso convida a pessoa a cortar uma alternativa
 * achando que a elimina - e o modelo aditivo com veto não elimina ninguém,
 * penaliza o valor global (de Almeida, 2013).
 */
export function EditorVeto({
  criterio,
  onChange,
}: {
  criterio: CriterioRascunho;
  onChange: (parcial: Partial<CriterioRascunho>) => void;
}) {
  const { t } = useIdioma();
  const declarado = temVeto(criterio);
  const [abertoManual, setAbertoManual] = useState<boolean | null>(null);
  const aberto = abertoManual ?? declarado;

  const unidade = criterio.unidade.trim();
  const maior = criterio.direcao === "max";
  /* Os rótulos falam na direção do critério: "a partir de" num critério de
     maximizar e "até" num de minimizar. Um rótulo fixo obrigaria a pessoa a
     traduzir mentalmente a direção a cada critério, que é exatamente onde o
     par se inverte. */
  const sufixo = maior ? "max" : "min";

  return (
    <div
      className="rounded-[var(--raio-controle)] border"
      style={{ borderColor: "var(--borda)" }}
    >
      <button
        type="button"
        onClick={() => setAbertoManual(!aberto)}
        aria-expanded={aberto}
        className="tatil flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-medium"
        style={{ color: "var(--tinta-2)" }}
      >
        <CaretRight
          size={12}
          weight="bold"
          style={{ transform: aberto ? "rotate(90deg)" : undefined }}
        />
        {t("estrutura.criterio.veto")}
        {declarado && <Selo tom="accent">{t("estrutura.criterio.veto.selo")}</Selo>}
        {!declarado && (
          <span className="text-[11.5px] font-normal" style={{ color: "var(--tinta-fraca)" }}>
            {t("estrutura.criterio.veto.opcional")}
          </span>
        )}
      </button>

      {aberto && (
        <div className="space-y-3 border-t px-3 py-3" style={{ borderColor: "var(--borda)" }}>
          <p className="text-[12px]" style={{ color: "var(--tinta-3)" }}>
            {comNos(t("estrutura.criterio.veto.explicacao"), {
              naoElimina: <strong>{t("estrutura.criterio.veto.naoElimina")}</strong>,
            })}
          </p>

          <div className="flex flex-wrap gap-3">
            <div className="w-44">
              <Campo
                rotulo={t(`estrutura.criterio.veto.aceitavel.${sufixo}`)}
                ajuda={t("estrutura.criterio.veto.aceitavel.ajuda")}
                dica={
                  <Dica titulo={t("estrutura.criterio.veto.dica.titulo")}>
                    <p>{t("estrutura.criterio.veto.dica.corpo1")}</p>
                    <p>{t("estrutura.criterio.veto.dica.corpo2")}</p>
                    <p style={{ color: "var(--tinta-3)" }}>
                      {t("estrutura.criterio.veto.dica.fonte")}
                    </p>
                  </Dica>
                }
              >
                {(props) => (
                  <Entrada
                    {...props}
                    value={criterio.vetoAceitavel}
                    onChange={(e) => onChange({ vetoAceitavel: e.target.value })}
                    inputMode="decimal"
                    placeholder={unidade || t("estrutura.criterio.veto.vazio")}
                    className="num !py-1 text-right !text-[13px]"
                  />
                )}
              </Campo>
            </div>
            <div className="w-44">
              <Campo
                rotulo={t(`estrutura.criterio.veto.inaceitavel.${sufixo}`)}
                ajuda={t("estrutura.criterio.veto.inaceitavel.ajuda")}
              >
                {(props) => (
                  <Entrada
                    {...props}
                    value={criterio.vetoInaceitavel}
                    onChange={(e) => onChange({ vetoInaceitavel: e.target.value })}
                    inputMode="decimal"
                    placeholder={unidade || t("estrutura.criterio.veto.vazio")}
                    className="num !py-1 text-right !text-[13px]"
                  />
                )}
              </Campo>
            </div>
          </div>

          <p className="text-[11.5px]" style={{ color: "var(--tinta-fraca)" }}>
            {t("estrutura.criterio.veto.umSo")}
          </p>
          {declarado && (
            <p className="text-[11.5px]" style={{ color: "var(--tinta-fraca)" }}>
              {t("estrutura.criterio.veto.custo")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
