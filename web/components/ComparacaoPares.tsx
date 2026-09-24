"use client";

/**
 * Ordenação dos pesos por comparação par a par.
 *
 * Em vez de pedir a lista ordenada de uma vez, confronta dois critérios: qual
 * você prefere levar do pior ao melhor desempenho? Ordenar sete critérios de
 * cabeça é difícil; comparar dois é sempre fácil.
 *
 * As barras mostram a faixa real de cada critério, porque é ela que está em
 * jogo — "qualidade é mais importante que prazo" não quer dizer nada sem saber
 * que o prazo varia de 45 para 12 dias.
 */

import { ArrowCounterClockwise, Equals } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { Botao, Dica } from "@/components/ui";
import {
  proxima,
  reconstruir,
  restantes,
  terminou,
  type RespostaComparacao,
} from "@/lib/ordenacaoPorComparacao";
import type { CriterioOut } from "@/lib/types";

function formatar(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toPrecision(4).replace(/\.?0+$/, "");
}

function Cartao({
  criterio,
  cor,
  rotulo,
  onEscolher,
  desabilitado,
}: {
  criterio: CriterioOut;
  cor: string;
  rotulo: string;
  onEscolher: () => void;
  desabilitado: boolean;
}) {
  const unidade = criterio.unidade ? ` ${criterio.unidade}` : "";
  return (
    <button
      type="button"
      onClick={onEscolher}
      disabled={desabilitado}
      className="tatil group flex-1 rounded-[var(--raio-painel)] border p-5 text-left disabled:opacity-50"
      style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
      onMouseEnter={(e) => {
        if (!desabilitado) e.currentTarget.style.borderColor = cor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--borda)";
      }}
    >
      <div className="mb-4 flex items-baseline gap-2">
        <span aria-hidden className="h-2.5 w-2.5 rounded-[2px]" style={{ background: cor }} />
        <span className="text-[11px]" style={{ color: "var(--tinta-3)" }}>
          {rotulo}
        </span>
      </div>

      <p className="text-[15px] font-medium" style={{ color: "var(--tinta)" }}>
        {criterio.nome}
      </p>

      {/* a faixa que está em jogo, desenhada */}
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-[11px]">
          <span className="num" style={{ color: "var(--tinta-fraca)" }}>
            {formatar(criterio.pior)}
            {unidade}
          </span>
          <span className="num" style={{ color: cor }}>
            {formatar(criterio.melhor)}
            {unidade}
          </span>
        </div>
        <div
          className="h-2.5 w-full overflow-hidden rounded-[3px]"
          style={{ background: "var(--dado-trilho)" }}
        >
          <div className="h-full w-full rounded-[3px]" style={{ background: cor }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px]" style={{ color: "var(--tinta-fraca)" }}>
          <span>pior</span>
          <span>melhor</span>
        </div>
      </div>

      <span
        className="mt-4 block text-xs opacity-0 transition-opacity group-hover:opacity-100"
        style={{ color: cor }}
      >
        prefiro esta melhora →
      </span>
    </button>
  );
}

export function ComparacaoPares({
  criterios,
  ocupado,
  onConfirmar,
}: {
  criterios: CriterioOut[];
  ocupado: boolean;
  onConfirmar: (ordem: string[]) => void;
}) {
  const [respostas, setRespostas] = useState<RespostaComparacao[]>([]);
  const chaves = useMemo(() => criterios.map((c) => c.chave), [criterios]);
  const estado = useMemo(() => reconstruir(chaves, respostas), [chaves, respostas]);

  const porChave = (chave: string) => criterios.find((c) => c.chave === chave)!;
  const comparacao = proxima(estado);
  const pronto = terminou(estado);
  const faltam = restantes(estado);

  const responder = (r: RespostaComparacao) => setRespostas([...respostas, r]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <span className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium" style={{ color: "var(--tinta)" }}>
            {pronto ? "Ordem definida" : "Qual melhora você prefere?"}
          </span>
          <Dica titulo="Por que comparar assim">
            <p>
              Cada critério vai do seu pior ao seu melhor desempenho possível. A
              pergunta é qual dessas duas melhoras vale mais para você.
            </p>
            <p>
              Não é qual critério é mais importante no abstrato — é qual{" "}
              <strong>faixa</strong> pesa mais, e a faixa está desenhada nos
              dois cartões.
            </p>
          </Dica>
        </span>
        {!pronto && (
          <span className="num text-[12px]" style={{ color: "var(--tinta-3)" }}>
            {respostas.length} respondidas · ~{faltam} restantes
          </span>
        )}
      </div>

      {comparacao && (
        <>
          <div className="flex flex-col gap-4 md:flex-row">
            <Cartao
              criterio={porChave(comparacao.a)}
              cor="var(--dado-a)"
              rotulo="melhorar isto"
              desabilitado={ocupado}
              onEscolher={() => responder("A")}
            />
            <Cartao
              criterio={porChave(comparacao.b)}
              cor="var(--dado-b)"
              rotulo="ou melhorar isto"
              desabilitado={ocupado}
              onEscolher={() => responder("B")}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              onClick={() => responder("indiferente")}
              disabled={ocupado}
              className="tatil flex items-center gap-1.5 text-sm disabled:opacity-40"
              style={{ color: "var(--tinta-3)" }}
            >
              <Equals size={14} weight="bold" />
              as duas valem o mesmo
            </button>
            {respostas.length > 0 && (
              <button
                onClick={() => setRespostas(respostas.slice(0, -1))}
                disabled={ocupado}
                className="tatil flex items-center gap-1.5 text-sm disabled:opacity-40"
                style={{ color: "var(--tinta-fraca)" }}
              >
                <ArrowCounterClockwise size={13} weight="bold" />
                voltar uma
              </button>
            )}
          </div>
        </>
      )}

      {/* a ordem construída até agora */}
      {estado.ordenados.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[11px]" style={{ color: "var(--tinta-fraca)" }}>
            {pronto ? "Ordem final" : "Ordem parcial"}
          </p>
          <ol className="space-y-1">
            {estado.ordenados.map((chave, i) => (
              <li key={chave} className="flex items-center gap-2.5 text-[13px]">
                <span className="num w-4" style={{ color: "var(--tinta-fraca)" }}>
                  {i + 1}
                </span>
                <span style={{ color: "var(--tinta-2)" }}>{porChave(chave).nome}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {estado.empates.length > 0 && (
        <p className="prosa mt-4 text-[12px]" style={{ color: "var(--tinta-3)" }}>
          Você declarou {estado.empates.length}{" "}
          {estado.empates.length === 1 ? "empate" : "empates"}. Como o método
          precisa de uma sequência, a posição relativa nesses pares foi
          arbitrada — não muda o resultado, porque nada foi afirmado sobre eles.
        </p>
      )}

      {pronto && (
        <Botao
          onClick={() => onConfirmar(estado.ordenados)}
          disabled={ocupado}
          className="mt-5"
        >
          Confirmar ordem e começar
        </Botao>
      )}
    </div>
  );
}
