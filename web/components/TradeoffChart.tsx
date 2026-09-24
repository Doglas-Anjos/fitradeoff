"use client";

/**
 * A pergunta de tradeoff, desenhada.
 *
 * Esta e a tela que decide a qualidade da elicitacao. O metodo confronta duas
 * consequencias hipoteticas, ambas propositalmente pessimas em quase tudo: sem
 * ver as duas por inteiro, o decisor responde a uma pergunta diferente da que o
 * modelo registra. Por isso os dois lados aparecem completos, com todos os
 * criterios, e o unico desempenho que nao esta no pior fica em destaque.
 *
 * A barra mede o valor intra-criterio (0 = pior possivel, 1 = melhor possivel);
 * o numero ao lado traz a consequencia na unidade real do problema.
 */

import { Dica } from "@/components/ui";
import type { Pergunta } from "@/lib/types";

export interface Linha {
  criterio: string;
  texto: string;
  destaque: boolean;
  fracao: number;
}

/** Quebra "Nome: 12.5 R$/un (o pior possivel)" nas partes que o grafico usa. */
export function parseLinha(linha: string, posicao: number): Linha {
  const separador = linha.indexOf(":");
  const criterio = linha.slice(0, separador).trim();
  const resto = linha.slice(separador + 1).trim();

  const pior = resto.includes("(o pior possivel)");
  const melhor = resto.includes("(o melhor possivel)");
  const texto = resto.replace(/\s*\((o (pior|melhor)) possivel\)/, "");

  return {
    criterio,
    texto,
    destaque: !pior,
    fracao: pior ? 0 : melhor ? 1 : posicao,
  };
}

function Painel({
  rotulo,
  linhas,
  cor,
  desabilitado,
  onSelect,
}: {
  rotulo: string;
  linhas: Linha[];
  cor: string;
  desabilitado: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={desabilitado}
      className="tatil group flex-1 rounded-[var(--raio-painel)] border p-5 text-left disabled:opacity-60"
      style={{
        borderColor: "var(--borda)",
        background: "var(--painel)",
      }}
      onMouseEnter={(e) => {
        if (!desabilitado) {
          e.currentTarget.style.borderColor = cor;
          e.currentTarget.style.boxShadow = "var(--sombra-alta)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--borda)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div className="mb-5 flex items-baseline gap-2.5">
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 rounded-[2px]"
          style={{ background: cor }}
        />
        <span className="text-[15px] font-medium" style={{ color: "var(--tinta)" }}>
          {rotulo}
        </span>
      </div>

      <dl className="space-y-3.5">
        {linhas.map((linha) => (
          <div key={linha.criterio}>
            <div className="flex items-baseline justify-between gap-3">
              <dt
                className="text-[13px]"
                style={{
                  color: linha.destaque ? "var(--tinta)" : "var(--tinta-3)",
                  fontWeight: linha.destaque ? 500 : 400,
                }}
              >
                {linha.criterio}
              </dt>
              <dd
                className="num text-[13px]"
                style={{
                  color: linha.destaque ? "var(--tinta)" : "var(--tinta-3)",
                  fontWeight: linha.destaque ? 500 : 400,
                }}
              >
                {linha.texto}
              </dd>
            </div>
            {/* trilho + preenchimento: o quanto falta para o melhor possivel */}
            <div
              className="mt-1.5 h-1.5 w-full overflow-hidden rounded-[3px]"
              style={{ background: "var(--dado-trilho)" }}
            >
              <div
                className="h-full rounded-[3px] transition-[width] duration-300"
                style={{
                  width: `${Math.max(linha.fracao * 100, linha.fracao > 0 ? 1.5 : 0)}%`,
                  background: linha.destaque ? cor : "var(--tinta-fraca)",
                }}
              />
            </div>
          </div>
        ))}
      </dl>

      <span
        className="mt-5 block text-xs opacity-0 transition-opacity group-hover:opacity-100"
        style={{ color: cor }}
      >
        prefiro esta →
      </span>
    </button>
  );
}

export function TradeoffChart({
  pergunta,
  desabilitado = false,
  onSelect,
}: {
  pergunta: Pergunta;
  desabilitado?: boolean;
  onSelect: (escolha: "A" | "B") => void;
}) {
  const a = pergunta.opcao_a.map((l) => parseLinha(l, pergunta.posicao_na_escala));
  const b = pergunta.opcao_b.map((l) => parseLinha(l, 1));

  return (
    <div>
      <div className="flex items-start gap-1.5">
        <p className="prosa text-sm" style={{ color: "var(--tinta-2)" }}>
          Duas situações hipotéticas. Nas duas, tudo o que não está destacado
          está no{" "}
          <strong style={{ color: "var(--tinta)" }}>pior desempenho possível</strong>.
          Qual você prefere?
        </p>
        <Dica titulo="Por que as duas são tão ruins">
          <p>
            É de propósito. Deixando tudo no pior nível menos um ponto, a
            comparação isola exatamente o que se quer medir: o quanto vale
            melhorar aquele critério.
          </p>
          <p>
            Se as situações fossem realistas, sua resposta misturaria vários
            efeitos ao mesmo tempo e não diria nada sobre os pesos.
          </p>
          <p style={{ color: "var(--tinta-3)" }}>
            Nenhuma das duas é uma alternativa real do seu problema.
          </p>
        </Dica>
      </div>

      <div className="mt-5 flex flex-col gap-4 md:flex-row">
        <Painel
          rotulo="Situação A"
          linhas={a}
          cor="var(--dado-a)"
          desabilitado={desabilitado}
          onSelect={() => onSelect("A")}
        />
        <Painel
          rotulo="Situação B"
          linhas={b}
          cor="var(--dado-b)"
          desabilitado={desabilitado}
          onSelect={() => onSelect("B")}
        />
      </div>
    </div>
  );
}
