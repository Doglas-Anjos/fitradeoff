"use client";

/**
 * Quando as declarações se contradizem.
 *
 * "Desfaça a última" é verdadeiro e inútil: a última só é culpada por ter sido
 * a última a chegar. Esta tela mostra **o que** conflita e deixa o decisor
 * escolher qual das duas afirmações reflete o que ele pensa — que é a decisão
 * dele, não do sistema.
 *
 * Há dois casos, e eles pedem textos diferentes: duas declarações que não
 * cabem juntas, e uma declaração que a própria matriz de consequências
 * desmente (preferir quem perde em todos os critérios).
 */

import { ArrowsLeftRight, Prohibit, Warning } from "@phosphor-icons/react";

import { Botao } from "@/components/ui";

export interface Saida {
  acao: "desfazer" | "inverter" | "remover" | "reordenar";
  rotulo: string;
  explicacao: string;
  sequencia?: number;
  resultado?: string;
}

export interface Diagnostico {
  inconsistente: boolean;
  impossivel: boolean;
  conflitos: {
    sequencia_a: number;
    sequencia_b: number;
    declaracao_a: string;
    declaracao_b: string;
  }[];
  ultima: { sequencia: number; texto: string } | null;
  saidas: Saida[];
  leitura: string;
}

function Declaracao({
  numero,
  texto,
  papel,
}: {
  numero: number;
  texto: string;
  papel: string;
}) {
  return (
    <div
      className="rounded-[var(--raio-painel)] border p-4"
      style={{ borderColor: "var(--borda-forte)", background: "var(--painel)" }}
    >
      <div className="mb-2 flex items-baseline gap-2">
        <span className="num text-[11px]" style={{ color: "var(--tinta-fraca)" }}>
          declaração {String(numero).padStart(2, "0")}
        </span>
        <span className="text-[11px]" style={{ color: "var(--tinta-3)" }}>
          {papel}
        </span>
      </div>
      <p className="text-[13px] leading-relaxed" style={{ color: "var(--tinta)" }}>
        {texto}
      </p>
    </div>
  );
}

export function Inconsistencia({
  diagnostico,
  ocupado,
  onResolver,
}: {
  diagnostico: Diagnostico;
  ocupado: boolean;
  onResolver: (acao: Saida["acao"], sequencia?: number) => void;
}) {
  const conflito = diagnostico.conflitos[0];

  return (
    <div
      className="rounded-[var(--raio-painel)] border p-5"
      style={{ borderColor: "var(--erro)", background: "var(--painel)" }}
    >
      <h3
        className="flex items-center gap-2 text-[15px] font-semibold"
        style={{ color: "var(--erro)" }}
      >
        {diagnostico.impossivel ? (
          <Prohibit size={17} weight="fill" />
        ) : (
          <Warning size={17} weight="fill" />
        )}
        {diagnostico.impossivel
          ? "Essa afirmação não é possível aqui"
          : "Duas respostas se contradizem"}
      </h3>

      <p className="prosa mt-2 text-sm" style={{ color: "var(--tinta-2)" }}>
        {diagnostico.leitura}
      </p>

      {/* o conflito, lado a lado */}
      {conflito && !diagnostico.impossivel && (
        <div className="mt-5 grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <Declaracao
            numero={conflito.sequencia_a}
            texto={conflito.declaracao_a}
            papel="você disse antes"
          />
          <div className="flex items-center justify-center">
            <ArrowsLeftRight
              size={18}
              weight="bold"
              style={{ color: "var(--erro)" }}
              aria-label="conflita com"
            />
          </div>
          <Declaracao
            numero={conflito.sequencia_b}
            texto={conflito.declaracao_b}
            papel="você acabou de dizer"
          />
        </div>
      )}

      {diagnostico.impossivel && diagnostico.ultima && (
        <div className="mt-5">
          <Declaracao
            numero={diagnostico.ultima.sequencia}
            texto={diagnostico.ultima.texto}
            papel="você acabou de dizer"
          />
        </div>
      )}

      <div className="mt-5">
        <p className="mb-3 text-[13px] font-medium" style={{ color: "var(--tinta)" }}>
          O que você quer fazer?
        </p>
        <div className="space-y-2">
          {diagnostico.saidas.map((saida, i) => (
            <button
              key={`${saida.acao}-${saida.sequencia ?? i}`}
              onClick={() => onResolver(saida.acao, saida.sequencia)}
              disabled={ocupado}
              className="tatil block w-full rounded-[var(--raio-controle)] border p-3 text-left disabled:opacity-45"
              style={{ borderColor: "var(--borda-forte)", background: "var(--painel)" }}
            >
              <span className="block text-[13px] font-medium" style={{ color: "var(--tinta)" }}>
                {saida.rotulo}
              </span>
              <span className="block text-[12px]" style={{ color: "var(--tinta-3)" }}>
                {saida.explicacao}
              </span>
              {saida.resultado && (
                <span
                  className="mt-1.5 block text-[12px]"
                  style={{ color: "var(--accent)" }}
                >
                  passa a valer: {saida.resultado}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
