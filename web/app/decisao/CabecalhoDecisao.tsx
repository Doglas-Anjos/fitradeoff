"use client";

import { Etapas } from "@/components/Etapas";
import { TintaCabecalho } from "@/components/TintaCabecalho";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/telas";
import "@/lib/i18n/estrutura";

import { useDecisao } from "./contexto";

/* O cabeçalho da decisão aberta: nome, tamanho do problema e a trilha de
   etapas. O erro vem logo embaixo, fora do cartão escuro. */
export function CabecalhoDecisao() {
  const { t } = useIdioma();
  const {
    state: { problema, estado, etapa, alcancadas, erro },
    actions: { recomecar, irPara },
  } = useDecisao();
  if (!problema) return null;

  return (
    <>
      <header className="cabecalho-escuro mb-8 overflow-hidden p-5 sm:p-7">
        <TintaCabecalho semente={15288} />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="sobrelinha text-[#8fc5ff]">
              {t(`problematica.${problema.problematica}`)}
            </p>
            <h1 className="display mt-3 text-[34px] font-semibold text-white sm:text-[42px]">
              {problema.nome}
            </h1>
            {/* Os dois números em selos separados, e não numa frase corrida com
                ponto do meio: são duas medidas distintas, e o olho as encontra
                mais rápido separadas do que lendo a linha inteira. */}
            <p className="mt-3.5 flex flex-wrap items-center gap-2">
              {[
                t("estrutura.alternativas.contagem", {
                  n: Object.keys(problema.consequencias).length,
                }),
                t("estrutura.criterios.contagem", { n: problema.criterios.length }),
              ].map((texto) => (
                <span
                  key={texto}
                  className="rounded-[var(--raio-controle)] border px-2.5 py-1 text-[12px] font-medium"
                  style={{
                    borderColor: "var(--navy-borda)",
                    color: "var(--navy-tinta-2)",
                  }}
                >
                  {texto}
                </span>
              ))}
            </p>
          </div>
          <button
            onClick={recomecar}
            className="tatil min-h-10 rounded-[var(--raio-controle)] border border-white/25 bg-white/10 px-4 py-2 text-[13px] font-semibold text-white hover:border-white/50 hover:bg-white/15"
          >
            {t("tela.decisao.outra")}
          </button>
        </div>

        <div className="mt-6 rounded-[var(--raio-painel)] bg-[var(--painel)] p-1 text-[var(--tinta)]">
          <Etapas
            atual={etapa}
            alcancadas={alcancadas}
            respostasEmRisco={Math.max((estado?.declaracoes ?? 0) - 1, 0)}
            onIr={irPara}
          />
        </div>
      </header>

      {erro && (
        <div
          role="alert"
          className="mb-8 rounded-[var(--raio-controle)] border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--erro)",
            background: "var(--erro-suave)",
            color: "var(--erro)",
          }}
        >
          {erro}
        </div>
      )}
    </>
  );
}
