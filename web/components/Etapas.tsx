"use client";

/**
 * A barra de etapas, com volta.
 *
 * O método é sequencial, mas isso não quer dizer que a tela deva ser de mão
 * única: quem está decidindo precisa reler os dados que informou, conferir a
 * ordem que declarou, e voltar sem perder o que já respondeu.
 *
 * A distinção que a barra precisa deixar clara é entre **rever** e **refazer**.
 * Olhar o problema ou a ordem não custa nada. Reordenar os critérios, sim:
 * as respostas anteriores se referiam a outra sequência de pares e são
 * descartadas — por isso essa etapa avisa antes.
 */

import { ArrowLeft, Check, Warning } from "@phosphor-icons/react";
import { useState } from "react";

export type Etapa = "problema" | "ordem" | "perguntas" | "resultado";

const SEQUENCIA: { id: Etapa; rotulo: string }[] = [
  { id: "problema", rotulo: "Problema" },
  { id: "ordem", rotulo: "Importância" },
  { id: "perguntas", rotulo: "Perguntas" },
  { id: "resultado", rotulo: "Resultado" },
];

export function Etapas({
  atual,
  alcancadas,
  respostasEmRisco,
  onIr,
}: {
  atual: Etapa;
  /** Etapas que já foram concluídas e podem ser revisitadas. */
  alcancadas: Etapa[];
  /** Quantas respostas seriam descartadas ao reordenar os critérios. */
  respostasEmRisco: number;
  onIr: (etapa: Etapa) => void;
}) {
  const [confirmando, setConfirmando] = useState<Etapa | null>(null);
  const indiceAtual = SEQUENCIA.findIndex((e) => e.id === atual);

  const tentar = (etapa: Etapa) => {
    // reordenar invalida as respostas: avisa antes, não depois
    if (etapa === "ordem" && respostasEmRisco > 0) {
      setConfirmando(etapa);
      return;
    }
    onIr(etapa);
  };

  return (
    <div>
      <nav aria-label="Etapas da decisão">
        <ol className="flex flex-wrap items-center gap-1">
          {SEQUENCIA.map((etapa, i) => {
            const alcancada = alcancadas.includes(etapa.id);
            const ativa = etapa.id === atual;
            const concluida = alcancada && i < indiceAtual;
            const clicavel = alcancada && !ativa;

            return (
              <li key={etapa.id} className="flex items-center">
                {i > 0 && (
                  <span
                    aria-hidden
                    className="mx-1 h-px w-5"
                    style={{ background: "var(--borda-forte)" }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => clicavel && tentar(etapa.id)}
                  disabled={!clicavel}
                  aria-current={ativa ? "step" : undefined}
                  className="tatil flex items-center gap-1.5 rounded-[var(--raio-controle)] px-2.5 py-1.5 text-[13px] disabled:cursor-default"
                  style={{
                    background: ativa ? "var(--accent-suave)" : "transparent",
                    color: ativa
                      ? "var(--accent)"
                      : alcancada
                        ? "var(--tinta-2)"
                        : "var(--tinta-fraca)",
                    fontWeight: ativa ? 600 : 400,
                  }}
                >
                  {concluida ? (
                    <Check size={13} weight="bold" />
                  ) : (
                    <span
                      aria-hidden
                      className="num inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px]"
                      style={{
                        background: ativa ? "var(--accent)" : "transparent",
                        color: ativa ? "var(--accent-tinta)" : "inherit",
                        border: ativa ? "none" : "1px solid currentColor",
                      }}
                    >
                      {i + 1}
                    </span>
                  )}
                  {etapa.rotulo}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {confirmando && (
        <div
          role="alertdialog"
          aria-label="Confirmar mudança de ordem"
          className="mt-3 rounded-[var(--raio-painel)] border p-4"
          style={{ borderColor: "var(--borda-forte)", background: "var(--painel)" }}
        >
          <p className="flex items-start gap-2 text-sm" style={{ color: "var(--tinta)" }}>
            <Warning size={16} weight="fill" style={{ color: "var(--erro)" }} className="mt-0.5 shrink-0" />
            <span>
              Mudar a ordem descarta suas{" "}
              <strong>
                {respostasEmRisco} {respostasEmRisco === 1 ? "resposta" : "respostas"}
              </strong>
              . Elas comparavam outra sequência de critérios e não valem para a
              nova ordem.
            </span>
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                const destino = confirmando;
                setConfirmando(null);
                onIr(destino);
              }}
              className="tatil rounded-[var(--raio-controle)] px-3 py-1.5 text-[13px] font-medium"
              style={{ background: "var(--erro)", color: "#fff" }}
            >
              Descartar e reordenar
            </button>
            <button
              onClick={() => setConfirmando(null)}
              className="tatil rounded-[var(--raio-controle)] border px-3 py-1.5 text-[13px]"
              style={{ borderColor: "var(--borda-forte)", color: "var(--tinta)" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Botão de voltar para a etapa anterior, sem sair do fluxo. */
export function Voltar({ rotulo, onClick }: { rotulo: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="tatil flex items-center gap-1.5 text-[13px]"
      style={{ color: "var(--tinta-3)" }}
    >
      <ArrowLeft size={14} weight="bold" />
      {rotulo}
    </button>
  );
}
