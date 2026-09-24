"use client";

/**
 * Ordenacao das constantes de escala, em dois modos.
 *
 * O metodo admite dois caminhos para a mesma declaracao, e eles pedem coisas
 * diferentes do decisor:
 *
 * - **lista**: reordenar tudo de uma vez. Rapido para quem ja sabe a ordem.
 * - **avaliacao global**: escolher, uma de cada vez, qual criterio mais pesa
 *   supondo que ele va do pior ao melhor desempenho possivel. Mais lento, e
 *   mais fiel ao que o metodo pergunta -- a pergunta nao e "qual criterio e
 *   mais importante" no abstrato, e sim "qual faixa de desempenho vale mais".
 *
 * Por isso o segundo modo mostra a faixa real de cada criterio: sem ver que o
 * prazo varia de 45 a 12 dias, "prazo e importante" nao quer dizer nada.
 */

import { CheckCircle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { ComparacaoPares } from "@/components/ComparacaoPares";
import { ListaArrastavel } from "@/components/ListaArrastavel";

import { Botao, Dica } from "@/components/ui";

import type { CriterioOut } from "@/lib/types";

function formatar(valor: number): string {
  return Number.isInteger(valor) ? String(valor) : valor.toPrecision(4).replace(/\.?0+$/, "");
}

function FaixaDoCriterio({ criterio }: { criterio: CriterioOut }) {
  const unidade = criterio.unidade ? ` ${criterio.unidade}` : "";
  return (
    <span className="num text-xs" style={{ color: "var(--tinta-fraca)" }}>
      de {formatar(criterio.pior)}
      {unidade} (pior) até {formatar(criterio.melhor)}
      {unidade} (melhor)
    </span>
  );
}

export function OrdenacaoPesos({
  criterios,
  ocupado,
  onConfirmar,
}: {
  criterios: CriterioOut[];
  ocupado: boolean;
  onConfirmar: (ordem: string[]) => void;
}) {
  const [modo, setModo] = useState<"pares" | "lista" | "global">("pares");
  const [ordem, setOrdem] = useState<string[]>(criterios.map((c) => c.chave));

  // trocar de decisão sem remontar o componente deixaria a ordem antiga
  useEffect(() => {
    setOrdem(criterios.map((c) => c.chave));
    setEscolhidos([]);
  }, [criterios]);
  const [escolhidos, setEscolhidos] = useState<string[]>([]);

  const porChave = (chave: string) => criterios.find((c) => c.chave === chave)!;
  const restantes = criterios.filter((c) => !escolhidos.includes(c.chave));

  const mover = (indice: number, passo: number) => {
    const destino = indice + passo;
    if (destino < 0 || destino >= ordem.length) return;
    const copia = [...ordem];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    setOrdem(copia);
  };

  const completo = escolhidos.length === criterios.length;

  return (
    <section
      className="rounded-[var(--raio-painel)] border p-5"
      style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
    >
      <div className="flex items-center gap-1.5">
        <h2
          className="text-lg font-semibold tracking-tight"
          style={{ color: "var(--tinta)" }}
        >
          Ordem de importância
        </h2>
        <Dica titulo="Importância de quê, exatamente">
          <p>
            Não é qual critério importa mais no abstrato. É qual{" "}
            <strong>faixa de desempenho</strong> vale mais.
          </p>
          <p>
            Prazo variando de 45 para 12 dias pode valer mais que custo variando
            de R$ 15,80 para R$ 10,20 — ou menos. Depende dos números do seu
            problema, não da sua opinião sobre prazo e custo.
          </p>
          <p style={{ color: "var(--tinta-3)" }}>
            Por isso cada critério mostra a faixa ao lado do nome.
          </p>
        </Dica>
      </div>
      <p className="prosa mt-2 text-sm" style={{ color: "var(--tinta-2)" }}>
        Ordene do mais para o menos importante, supondo que cada critério vá do{" "}
        <strong style={{ color: "var(--tinta)" }}>pior</strong> ao{" "}
        <strong style={{ color: "var(--tinta)" }}>melhor</strong> desempenho
        possível.
      </p>

      <div className="mt-4 flex gap-2 border-b" style={{ borderColor: "var(--borda)" }}>
        {([
          ["pares", "Comparar dois a dois"],
          ["lista", "Ordenar a lista"],
          ["global", "Escolher um a um"],
        ] as const).map(([valor, rotulo]) => (
          <button
            key={valor}
            onClick={() => setModo(valor)}
            className="-mb-px border-b-2 px-3 py-2 text-sm"
            style={{
              borderColor: modo === valor ? "var(--accent)" : "transparent",
              color: modo === valor ? "var(--tinta)" : "var(--tinta-fraca)",
              fontWeight: modo === valor ? 600 : 400,
            }}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {modo === "pares" && (
        <div className="mt-5">
          <ComparacaoPares
            criterios={criterios}
            ocupado={ocupado}
            onConfirmar={onConfirmar}
          />
        </div>
      )}

      {modo === "lista" && (
        <>
          <div className="mt-4">
            <ListaArrastavel
              itens={ordem.map((chave) => {
                const criterio = porChave(chave);
                return {
                  id: chave,
                  titulo: criterio.nome,
                  detalhe: <FaixaDoCriterio criterio={criterio} />,
                };
              })}
              onReordenar={setOrdem}
            />
          </div>
          <button
            onClick={() => onConfirmar(ordem)}
            disabled={ocupado}
            className="tatil mt-5 rounded-[var(--raio-controle)] px-4 py-2 text-sm font-medium disabled:opacity-45"
            style={{ background: "var(--accent)", color: "var(--accent-tinta)" }}
          >
            Confirmar ordem e começar
          </button>
        </>
      )}

      {modo === "global" && (
        <div className="mt-4">
          {escolhidos.length > 0 && (
            <ol className="mb-4 space-y-1">
              {escolhidos.map((chave, i) => (
                <li key={chave} className="flex items-center gap-2 text-sm">
                  <span
                    className="num w-5 text-xs"
                    style={{ color: "var(--tinta-fraca)" }}
                  >
                    {i + 1}
                  </span>
                  <CheckCircle
                    size={14}
                    weight="fill"
                    style={{ color: "var(--sucesso)" }}
                  />
                  <span style={{ color: "var(--tinta-2)" }}>
                    {porChave(chave).nome}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {!completo ? (
            <>
              <p className="mb-3 text-sm" style={{ color: "var(--tinta)" }}>
                Entre os que sobraram, qual você prefere levar do{" "}
                <strong>pior</strong> ao <strong>melhor</strong> desempenho?
              </p>
              <div className="space-y-2">
                {restantes.map((criterio) => (
                  <button
                    key={criterio.chave}
                    onClick={() => setEscolhidos([...escolhidos, criterio.chave])}
                    className="flex w-full items-center gap-3 rounded-[var(--raio-controle)] border px-3 py-3 text-left transition hover:shadow-sm"
                    style={{ borderColor: "var(--borda)" }}
                  >
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{criterio.nome}</span>
                      <FaixaDoCriterio criterio={criterio} />
                    </span>
                    {/* a barra mostra o salto completo que o criterio oferece */}
                    <svg width="120" height="20" role="presentation">
                      <rect
                        x={0}
                        y={4}
                        width={120}
                        height={12}
                        rx={4}
                        fill="var(--dado-trilho)"
                      />
                      <rect
                        x={0}
                        y={4}
                        width={120}
                        height={12}
                        rx={4}
                        fill="var(--accent)"
                        opacity={0.85}
                      />
                    </svg>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button
              onClick={() => onConfirmar(escolhidos)}
              disabled={ocupado}
              className="tatil rounded-[var(--raio-controle)] px-4 py-2 text-sm font-medium disabled:opacity-45"
              style={{ background: "var(--accent)", color: "var(--accent-tinta)" }}
            >
              Confirmar ordem e começar
            </button>
          )}

          {escolhidos.length > 0 && (
            <button
              onClick={() => setEscolhidos(escolhidos.slice(0, -1))}
              className="mt-3 block text-sm underline"
              style={{ color: "var(--tinta-fraca)" }}
            >
              Desfazer última escolha
            </button>
          )}
        </div>
      )}
    </section>
  );
}
