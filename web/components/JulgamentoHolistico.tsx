"use client";

/**
 * Avaliacao holistica: o decisor olha duas alternativas reais e declara qual
 * prefere.
 *
 * E o outro caminho de elicitacao do metodo, e ate agora so existia na API e no
 * chat. Vale quando a pergunta de tradeoff fica dificil -- com muitos criterios
 * ela cansa, e comparar coisas reais e mais natural que comparar hipoteses.
 *
 * A declaracao entra no mesmo espaco de pesos das respostas por decomposicao.
 */

import { Scales } from "@phosphor-icons/react";
import { useState } from "react";

import { Botao, Dica } from "@/components/ui";

export function JulgamentoHolistico({
  alternativas,
  ocupado,
  onJulgar,
}: {
  alternativas: string[];
  ocupado: boolean;
  onJulgar: (preferida: string, sobre: string) => void;
}) {
  const [preferida, setPreferida] = useState("");
  const [sobre, setSobre] = useState("");

  const valido = preferida && sobre && preferida !== sobre;

  const seletor = (
    valor: string,
    onChange: (v: string) => void,
    rotulo: string,
  ) => (
    <select
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      aria-label={rotulo}
      className="tatil rounded-[var(--raio-controle)] border px-3 py-2 text-sm outline-none"
      style={{
        borderColor: "var(--borda-forte)",
        background: "var(--painel)",
        color: valor ? "var(--tinta)" : "var(--tinta-fraca)",
      }}
    >
      <option value="">{rotulo}</option>
      {alternativas.map((a) => (
        <option key={a} value={a}>
          {a}
        </option>
      ))}
    </select>
  );

  return (
    <div>
      <div className="mb-3 flex items-center gap-1.5">
        <Scales size={16} style={{ color: "var(--tinta-3)" }} />
        <span className="text-[13px] font-medium" style={{ color: "var(--tinta)" }}>
          Ou compare duas alternativas reais
        </span>
        <Dica titulo="Avaliação holística">
          <p>
            Em vez de responder sobre situações hipotéticas, você olha os
            gráficos acima e diz qual alternativa prefere.
          </p>
          <p>
            Vale quando a pergunta de tradeoff fica cansativa — com muitos
            critérios, comparar coisas reais é mais natural.
          </p>
          <p style={{ color: "var(--tinta-3)" }}>
            A declaração entra no mesmo modelo. Se contradisser uma resposta
            anterior, o sistema avisa.
          </p>
        </Dica>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {seletor(preferida, setPreferida, "prefiro…")}
        <span className="text-sm" style={{ color: "var(--tinta-3)" }}>
          em vez de
        </span>
        {seletor(sobre, setSobre, "…a esta")}
        <Botao
          onClick={() => onJulgar(preferida, sobre)}
          disabled={!valido || ocupado}
        >
          Registrar
        </Botao>
      </div>

      {preferida && sobre && preferida === sobre && (
        <p className="mt-2 text-[12px]" style={{ color: "var(--erro)" }}>
          Escolha duas alternativas diferentes.
        </p>
      )}
    </div>
  );
}
