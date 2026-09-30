"use client";

import { useState } from "react";

import { Modal, Selo } from "@/components/ui";
import { EXEMPLOS, type Exemplo } from "@/lib/exemplos";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/entrada";

/**
 * Os casos de exemplo, para quem quer ver o metodo funcionando antes de digitar
 * a propria decisao.
 *
 * Eram um link solto para um unico caso de fornecedor. Um so nao mostra a
 * variedade que a tela aceita, e o link nao dizia o que ia acontecer ao ser
 * clicado: quem ja tinha meia dezena de criterios digitados perdia tudo sem
 * aviso. Agora o caso e escolhido pelo que ele e, e a substituicao e
 * confirmada.
 *
 * A confirmacao so aparece quando ha algo a perder. Perguntar "tem certeza?"
 * sobre um cadastro em branco e atrito sem motivo.
 */
export function CatalogoExemplos({
  precisaConfirmar,
  onAplicar,
}: {
  precisaConfirmar: boolean;
  onAplicar: (exemplo: Exemplo, substituindo: boolean) => void;
}) {
  const { t } = useIdioma();
  const [confirmando, setConfirmando] = useState<Exemplo | null>(null);
  /* Aberto enquanto o cadastro está em branco, que é quando serve; recolhido
     depois. Os seis cartões ocupavam a primeira dobra inteira e empurravam
     alternativas e critérios para fora da tela: quem chegava aqui não via o que
     tinha vindo fazer. `precisaConfirmar` é verdadeiro justamente quando já há
     algo digitado, então ele também responde "o catálogo ainda interessa?".

     Derivado, e não guardado na montagem: preencher o cadastro precisa recolher
     o catálogo na hora. O estado manual só existe depois de um clique, e então
     vence -- quem abriu de propósito não quer que feche sozinho. */
  const [abertoManual, setAbertoManual] = useState<boolean | null>(null);
  const aberto = abertoManual ?? !precisaConfirmar;

  const escolher = (exemplo: Exemplo) => {
    if (precisaConfirmar) return setConfirmando(exemplo);
    onAplicar(exemplo, false);
  };

  return (
    <section
      aria-labelledby="catalogo-exemplos"
      className="rounded-[var(--raio-painel)] border p-4"
      style={{ borderColor: "var(--borda)", background: "var(--painel-fundo)" }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2
          id="catalogo-exemplos"
          className="text-[13px] font-medium"
          style={{ color: "var(--tinta)" }}
        >
          {t("entrada.exemplos.titulo")}
        </h2>
        <button
          type="button"
          onClick={() => setAbertoManual(!aberto)}
          aria-expanded={aberto}
          className="tatil text-[12px] underline underline-offset-2"
          style={{ color: "var(--tinta-3)" }}
        >
          {t(aberto ? "entrada.exemplos.recolher" : "entrada.exemplos.mostrar", {
            n: EXEMPLOS.length,
          })}
        </button>
      </div>
      <p hidden={!aberto} className="mt-1 text-[12px]" style={{ color: "var(--tinta-3)" }}>
        {t("entrada.exemplos.ajuda")}
      </p>

      <div
        hidden={!aberto}
        className="mt-3 grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      >
        {EXEMPLOS.map((exemplo, i) => (
          <button
            key={exemplo.chave}
            type="button"
            onClick={() => escolher(exemplo)}
            className="cartao-exemplo tatil entra-em-lista flex flex-col items-start gap-1.5 rounded-[var(--raio-controle)] border p-3 text-left"
            style={{ "--ordem": i } as React.CSSProperties}
          >
            <span className="text-[13px] font-medium" style={{ color: "var(--tinta)" }}>
              {t(exemplo.titulo)}
            </span>
            <span className="text-[12px] leading-snug" style={{ color: "var(--tinta-3)" }}>
              {t(exemplo.resumo)}
            </span>
            {/* O objetivo aparece antes do clique: aplicar o caso troca o
                objetivo, e a pessoa tem o direito de saber disso olhando. */}
            <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
              <Selo>
                {t("entrada.exemplos.contagem", {
                  alternativas: exemplo.alternativas.length,
                  criterios: exemplo.criterios.length,
                })}
              </Selo>
              <Selo tom="accent">
                {t("entrada.exemplos.feitoPara", {
                  objetivo: t(`problematica.curto.${exemplo.sugerida}`),
                })}
              </Selo>
            </span>
          </button>
        ))}
      </div>

      {confirmando && (
        <Modal
          titulo={t("entrada.exemplos.substituir.titulo")}
          confirmar={t("entrada.exemplos.substituir.confirmar")}
          perigo
          onFechar={() => setConfirmando(null)}
          onConfirmar={() => {
            onAplicar(confirmando, true);
            setConfirmando(null);
          }}
        >
          <p>
            {t("entrada.exemplos.substituir.antes")}{" "}
            <strong>{t(confirmando.titulo)}</strong>{" "}
            {t("entrada.exemplos.substituir.depois")}
          </p>
          <p>{t("entrada.exemplos.substituir.semVolta")}</p>
        </Modal>
      )}
    </section>
  );
}
