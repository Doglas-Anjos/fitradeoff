"use client";

/**
 * "E se os números que eu informei estiverem um pouco errados?"
 *
 * Varia o desempenho das alternativas dentro de uma faixa percentual e
 * reprocessa a decisão em cada cenário, mantendo as respostas do decisor. O que
 * sai é a fração de cenários em que a recomendação se manteve.
 *
 * É outra pergunta que a sensibilidade sobre o limiar de equivalência — aquela
 * mede o quanto a conclusão depende de um parâmetro do método; esta mede o
 * quanto ela depende da qualidade dos dados.
 */

import { Play } from "@phosphor-icons/react";
import { useState } from "react";

import { Botao, Dica, Entrada } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { CriterioOut } from "@/lib/types";

interface Resultado {
  cenarios: number;
  solucao_original: string[];
  estabilidade: number;
  frequencia: Record<string, number>;
  entraram: Record<string, number>;
  sairam: Record<string, number>;
  criterios_variados: { criterio: string; para_baixo: number; para_cima: number }[];
  leitura: string;
}

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

function Barra({ valor, cor }: { valor: number; cor: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-[3px]"
      style={{ background: "var(--dado-trilho)" }}>
      <div className="h-full rounded-[3px]"
        style={{ width: `${Math.max(valor * 100, valor > 0 ? 1.5 : 0)}%`, background: cor }} />
    </div>
  );
}

export function SensibilidadeConsequencias({
  decisaoId,
  criterios,
}: {
  decisaoId: string;
  criterios: CriterioOut[];
}) {
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>(
    Object.fromEntries(criterios.map((c) => [c.chave, true])),
  );
  const [variacao, setVariacao] = useState("10");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [rodando, setRodando] = useState(false);

  const escolhidos = criterios.filter((c) => selecionados[c.chave]);

  const rodar = async () => {
    const faixa = Number(variacao.replace(",", "."));
    if (!Number.isFinite(faixa) || faixa <= 0 || faixa > 100) {
      return setErro("A variação precisa ser um percentual entre 0 e 100.");
    }
    setRodando(true);
    setErro(null);
    try {
      setResultado(
        await api.sensibilidadeConsequencias(
          decisaoId,
          escolhidos.map((c) => ({
            criterio: c.chave,
            para_baixo: faixa,
            para_cima: faixa,
          })),
        ),
      );
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : String(e));
    } finally {
      setRodando(false);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-1.5">
        <span className="text-[13px] font-medium" style={{ color: "var(--tinta)" }}>
          E se os números estiverem errados?
        </span>
        <Dica titulo="Sensibilidade nas consequências">
          <p>
            Sorteia variações nos desempenhos que você informou e resolve o
            problema de novo em cada cenário — com as <strong>mesmas
            respostas</strong> suas.
          </p>
          <p>
            Se a recomendação se mantém na maioria dos cenários, ela não depende
            de precisão nos dados. Se muda muito, vale conferir os números antes
            de decidir.
          </p>
        </Dica>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <span className="mb-1.5 block text-[11px]" style={{ color: "var(--tinta-3)" }}>
            Variar em até
          </span>
          <div className="flex items-center gap-1.5">
            <Entrada
              value={variacao}
              onChange={(e) => setVariacao(e.target.value)}
              inputMode="decimal"
              aria-label="Percentual de variação"
              className="num !w-20 text-right"
            />
            <span className="text-sm" style={{ color: "var(--tinta-3)" }}>
              % para mais e para menos
            </span>
          </div>
        </div>
        <Botao
          onClick={rodar}
          disabled={rodando || escolhidos.length === 0}
          icone={<Play size={14} weight="fill" />}
        >
          {rodando ? "Rodando…" : "Rodar 200 cenários"}
        </Botao>
      </div>

      <fieldset className="mt-4">
        <legend className="mb-2 text-[11px]" style={{ color: "var(--tinta-3)" }}>
          Critérios a variar
        </legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {criterios.map((c) => (
            <label key={c.chave} className="flex cursor-pointer items-center gap-1.5 text-[12px]">
              <input
                type="checkbox"
                checked={!!selecionados[c.chave]}
                onChange={() =>
                  setSelecionados((s) => ({ ...s, [c.chave]: !s[c.chave] }))
                }
              />
              <span style={{ color: "var(--tinta-2)" }}>{c.nome}</span>
            </label>
          ))}
        </div>
        {escolhidos.length === 0 && (
          <p className="mt-2 text-[12px]" style={{ color: "var(--erro)" }}>
            Escolha ao menos um critério.
          </p>
        )}
      </fieldset>

      {erro && (
        <p role="alert" className="mt-3 text-sm" style={{ color: "var(--erro)" }}>
          {erro}
        </p>
      )}

      {rodando && (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="esqueleto h-5 w-full" />)}
        </div>
      )}

      {resultado && !rodando && (
        <div className="mt-6">
          <div className="flex items-baseline gap-2">
            <span className="num text-3xl font-semibold"
              style={{
                color: resultado.estabilidade >= 0.8
                  ? "var(--sucesso)"
                  : resultado.estabilidade >= 0.5
                    ? "var(--tinta)"
                    : "var(--erro)",
              }}>
              {pct(resultado.estabilidade)}
            </span>
            <span className="text-sm" style={{ color: "var(--tinta-2)" }}>
              dos {resultado.cenarios} cenários mantiveram a mesma resposta
            </span>
          </div>

          <p className="prosa mt-2 text-[13px]" style={{ color: "var(--tinta-3)" }}>
            {resultado.estabilidade >= 0.8
              ? "A recomendação não depende de precisão nos dados que você informou."
              : resultado.estabilidade >= 0.5
                ? "A recomendação é razoavelmente estável, mas confira os números dos critérios que mais oscilam."
                : "A recomendação muda com facilidade. Vale revisar os dados antes de decidir."}
          </p>

          <div className="mt-6">
            <span className="mb-3 block text-[12px] font-medium" style={{ color: "var(--tinta-2)" }}>
              Em quantos cenários cada alternativa apareceu na solução
            </span>
            <div className="space-y-2.5">
              {Object.entries(resultado.frequencia)
                .sort((a, b) => b[1] - a[1])
                .map(([nome, valor]) => {
                  const original = resultado.solucao_original.includes(nome);
                  return (
                    <div key={nome} className="grid items-center gap-3"
                      style={{ gridTemplateColumns: "minmax(0,10rem) 1fr 3rem" }}>
                      <span className="truncate text-[12px]"
                        style={{
                          color: original ? "var(--tinta)" : "var(--tinta-3)",
                          fontWeight: original ? 500 : 400,
                        }}
                        title={original ? `${nome} (na solução original)` : nome}>
                        {nome}
                      </span>
                      <Barra valor={valor}
                        cor={original ? "var(--accent)" : "var(--tinta-fraca)"} />
                      <span className="num text-right text-[11px]"
                        style={{ color: "var(--tinta-3)" }}>
                        {pct(valor)}
                      </span>
                    </div>
                  );
                })}
            </div>
            <p className="mt-3 text-[11px]" style={{ color: "var(--tinta-fraca)" }}>
              Em destaque, as que estavam na solução antes de variar nada.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
