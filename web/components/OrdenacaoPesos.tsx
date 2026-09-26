"use client";

/**
 * Ordenacao das constantes de escala, em tres modos.
 *
 * O metodo admite mais de um caminho para a mesma declaracao, e eles pedem
 * coisas diferentes do decisor:
 *
 * - **pares**: confrontar dois criterios de cada vez. E o caminho do metodo, e
 *   o padrao: comparar dois e sempre mais facil que ordenar sete.
 * - **lista**: reordenar tudo de uma vez. Rapido para quem ja sabe a ordem.
 * - **avaliacao global**: escolher, uma de cada vez, qual criterio mais pesa
 *   supondo que ele va do pior ao melhor desempenho possivel. Mais lento, e
 *   mais fiel ao que o metodo pergunta -- a pergunta nao e "qual criterio e
 *   mais importante" no abstrato, e sim "qual faixa de desempenho vale mais".
 *
 * Por isso **os tres** mostram a faixa real de cada criterio, no mesmo desenho
 * (`FaixaCriterio`): sem ver que o prazo varia de 45 a 12 dias, "prazo e
 * importante" nao quer dizer nada, e a resposta muda conforme o modo escolhido
 * -- que e o unico defeito que uma tela com tres caminhos para a mesma
 * pergunta nao pode ter. Por um tempo so o modo par a par desenhava a faixa.
 */

import { CheckCircle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { ComparacaoPares } from "@/components/ComparacaoPares";
import { FaixaCriterio } from "@/components/FaixaCriterio";
import { ListaArrastavel } from "@/components/ListaArrastavel";

import { Botao, Dica } from "@/components/ui";

import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/visualizacoes";
import type { CriterioOut } from "@/lib/types";

export function OrdenacaoPesos({
  criterios,
  ocupado,
  onConfirmar,
}: {
  criterios: CriterioOut[];
  ocupado: boolean;
  onConfirmar: (ordem: string[]) => void;
}) {
  const { t } = useIdioma();
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
          {t("elicitacao.ordem.titulo")}
        </h2>
        <Dica titulo={t("elicitacao.ordem.dica.titulo")}>
          <p>
            {t("elicitacao.ordem.dica.corpo1.antes")}
            <strong>{t("elicitacao.ordem.dica.corpo1.termo")}</strong>
            {t("elicitacao.ordem.dica.corpo1.depois")}
          </p>
          <p>{t("elicitacao.ordem.dica.corpo2")}</p>
          <p style={{ color: "var(--tinta-3)" }}>
            {t("elicitacao.ordem.dica.corpo3")}
          </p>
        </Dica>
      </div>
      <p className="prosa mt-2 text-sm" style={{ color: "var(--tinta-2)" }}>
        {t("elicitacao.ordem.instrucao.antes")}
        <strong style={{ color: "var(--tinta)" }}>
          {t("estrutura.niveis.pior")}
        </strong>
        {t("elicitacao.ordem.instrucao.meio")}
        <strong style={{ color: "var(--tinta)" }}>
          {t("estrutura.niveis.melhor")}
        </strong>
        {t("elicitacao.ordem.instrucao.depois")}
      </p>

      <div className="mt-4 flex gap-2 border-b" style={{ borderColor: "var(--borda)" }}>
        {([
          ["pares", "elicitacao.modo.pares"],
          ["lista", "elicitacao.modo.lista"],
          ["global", "elicitacao.modo.global"],
        ] as const).map(([valor, chave]) => (
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
            {t(chave)}
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
                  /* Variante compacta: a linha da lista ja carrega alca,
                     numero e duas setas, e a faixa de tres alturas do cartao
                     empurraria as setas para fora da tela estreita. */
                  detalhe: (
                    <span className="mt-1 block">
                      <FaixaCriterio criterio={criterio} variante="compacta" />
                    </span>
                  ),
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
            {t("elicitacao.confirmarOrdem")}
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
                {t("elicitacao.global.pergunta.antes")}
                <strong>{t("estrutura.niveis.pior")}</strong>
                {t("elicitacao.global.pergunta.meio")}
                <strong>{t("estrutura.niveis.melhor")}</strong>
                {t("elicitacao.global.pergunta.depois")}
              </p>
              {/* A faixa ficava numa barra de 120px cravados ao lado do nome:
                  em tela estreita ela espremia o texto, e desenhava um salto
                  que nao batia com o do modo par a par. Agora e a mesma figura
                  dali, na largura que houver, embaixo do nome -- que e onde o
                  olho ja esta quando le o criterio. */}
              <div className="space-y-2">
                {restantes.map((criterio) => (
                  <button
                    key={criterio.chave}
                    type="button"
                    onClick={() => setEscolhidos([...escolhidos, criterio.chave])}
                    className="block w-full rounded-[var(--raio-controle)] border px-3 py-3 text-left transition hover:shadow-sm"
                    style={{ borderColor: "var(--borda)" }}
                  >
                    <span className="block text-sm font-medium">{criterio.nome}</span>
                    <span className="mt-2 block">
                      <FaixaCriterio criterio={criterio} />
                    </span>
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
              {t("elicitacao.confirmarOrdem")}
            </button>
          )}

          {escolhidos.length > 0 && (
            <button
              onClick={() => setEscolhidos(escolhidos.slice(0, -1))}
              className="mt-3 block text-sm underline"
              style={{ color: "var(--tinta-fraca)" }}
            >
              {t("elicitacao.global.desfazer")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
