"use client";

/**
 * "Calculando…" enquanto a tela espera o servidor.
 *
 * A tela de decisão já desabilitava os botões durante um cálculo, e só isso:
 * nada dizia que alguma coisa estava acontecendo. Com a fila de cálculo do
 * servidor, uma resposta pode demorar mais do que o cálculo em si -- o pedido
 * espera a vez de quem o fez --, e botão desabilitado sem explicação lê como
 * tela travada.
 *
 * Duas esperas, de propósito:
 *
 * * **300 ms antes de aparecer.** Quase todo cálculo termina antes disso, e um
 *   aviso que pisca a cada clique ensina a ignorá-lo.
 * * **3 s para explicar.** Aí a demora já é perceptível, e a frase diz o motivo
 *   sem culpar ninguém: decisão grande, ou servidor ocupado.
 *
 * A região `role="status"` existe sempre, vazia quando não há nada a dizer: um
 * leitor de tela só anuncia mudança numa região que já estava na página.
 */

import { useEffect, useState } from "react";

import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/telas";

const ATRASO_PARA_APARECER = 300;
const ATRASO_PARA_EXPLICAR = 3000;

type Fase = "oculto" | "calculando" | "demorando";

export function IndicadorCalculando({ ativo }: { ativo: boolean }) {
  const { t } = useIdioma();
  const [fase, setFase] = useState<Fase>("oculto");

  useEffect(() => {
    if (!ativo) {
      setFase("oculto");
      return;
    }
    const aparecer = setTimeout(() => setFase("calculando"), ATRASO_PARA_APARECER);
    const explicar = setTimeout(() => setFase("demorando"), ATRASO_PARA_EXPLICAR);
    return () => {
      clearTimeout(aparecer);
      clearTimeout(explicar);
    };
  }, [ativo]);

  const visivel = fase !== "oculto";
  return (
    <div
      role="status"
      aria-live="polite"
      className="indicador-calculando"
      data-visivel={visivel ? "true" : "false"}
    >
      {visivel && (
        <>
          <span className="indicador-calculando-ponto" aria-hidden="true" />
          <span>{t(fase === "demorando" ? "calculando.demora" : "calculando.agora")}</span>
        </>
      )}
    </div>
  );
}
