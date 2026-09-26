"use client";

/**
 * Lista reordenável por arrasto.
 *
 * Arrastar é o gesto natural para ordenar, mas não é o único: quem navega por
 * teclado não arrasta, e num toque impreciso o arrasto falha. Por isso as setas
 * continuam ali, fazendo exatamente a mesma coisa — o arrasto é um atalho, não
 * o único caminho.
 *
 * Usa o arrasto nativo do HTML em vez de uma biblioteca: a lista é vertical,
 * curta e de um nível só, que é justamente o caso que o nativo resolve bem.
 */

import { ArrowDown, ArrowUp, DotsSixVertical } from "@phosphor-icons/react";
import { useRef, useState } from "react";

import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/estrutura";

export interface ItemArrastavel {
  id: string;
  titulo: string;
  detalhe?: React.ReactNode;
  /**
   * Substitui a exibição do título. O `titulo` continua sendo o texto que os
   * rótulos de acessibilidade e o anúncio do movimento usam, então quem troca
   * o corpo por um campo de edição não perde a identificação do item.
   */
  corpo?: React.ReactNode;
  /**
   * Um item em edição não se arrasta: em vários navegadores, o arrasto do pai
   * rouba o gesto e o texto do campo deixa de poder ser selecionado.
   */
  arrastavel?: boolean;
  /** Marca o item de que se está tratando agora, como o que está em edição. */
  destacado?: boolean;
}

export function ListaArrastavel({
  itens,
  onReordenar,
  rotuloPosicao = (i) => String(i + 1),
  acoes,
}: {
  itens: ItemArrastavel[];
  onReordenar: (ordem: string[]) => void;
  rotuloPosicao?: (indice: number) => string;
  /** Botões próprios do item, como editar e excluir, antes das setas. */
  acoes?: (id: string) => React.ReactNode;
}) {
  const { t } = useIdioma();
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const [anuncio, setAnuncio] = useState("");
  const referencias = useRef<Record<string, HTMLLIElement | null>>({});

  const mover = (de: number, para: number) => {
    if (para < 0 || para >= itens.length || de === para) return;
    const ordem = itens.map((i) => i.id);
    const [movido] = ordem.splice(de, 1);
    ordem.splice(para, 0, movido);
    onReordenar(ordem);
    setAnuncio(
      t("estrutura.lista.anuncioMovimento", {
        item: itens[de].titulo,
        posicao: para + 1,
        total: itens.length,
      }),
    );
  };

  const soltar = (alvo: string) => {
    if (!arrastando || arrastando === alvo) return;
    mover(
      itens.findIndex((i) => i.id === arrastando),
      itens.findIndex((i) => i.id === alvo),
    );
    setArrastando(null);
    setSobre(null);
  };

  return (
    <>
      {/* leitores de tela recebem o resultado do movimento, que o arrasto
          sozinho não comunica */}
      <p aria-live="polite" className="sr-only">
        {anuncio}
      </p>

      <ol className="space-y-2">
        {itens.map((item, i) => {
          const sendoArrastado = arrastando === item.id;
          const alvoAtual = sobre === item.id && !sendoArrastado;
          /* De que lado o item vai entrar: arrastando de cima para baixo ele
             cai depois do alvo; de baixo para cima, antes. Sem deduzir isso a
             linha ficaria sempre no mesmo lado e mentiria em metade dos casos. */
          const origem = arrastando
            ? itens.findIndex((x) => x.id === arrastando)
            : -1;
          const guiaAbaixo = alvoAtual && origem >= 0 && origem < i;
          const guiaAcima = alvoAtual && origem >= 0 && origem > i;
          const podeArrastar = item.arrastavel !== false;

          return (
            <li
              key={item.id}
              ref={(el) => {
                referencias.current[item.id] = el;
              }}
              draggable={podeArrastar}
              onDragStart={(e) => {
                setArrastando(item.id);
                e.dataTransfer.effectAllowed = "move";
                // exigido pelo Firefox para iniciar o arrasto
                e.dataTransfer.setData("text/plain", item.id);
              }}
              onDragEnd={() => {
                setArrastando(null);
                setSobre(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setSobre(item.id);
              }}
              onDragLeave={() => setSobre((s) => (s === item.id ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                soltar(item.id);
              }}
              className="tatil entra-em-lista group relative flex items-center gap-2 rounded-[var(--raio-painel)] border px-2.5 py-2.5"
              style={
                {
                  "--ordem": i,
                  borderColor: item.destacado ? "var(--accent)" : "var(--borda)",
                  background: sendoArrastado ? "var(--painel-fundo)" : "var(--painel)",
                  opacity: sendoArrastado ? 0.5 : 1,
                  cursor: podeArrastar ? "grab" : "default",
                  boxShadow: item.destacado
                    ? "inset 0 0 0 1px var(--accent)"
                    : "none",
                } as React.CSSProperties
              }
            >
              {/* A linha mostra onde o cartão vai cair. A borda do alvo dizia
                  "é aqui", mas não dizia "antes ou depois deste" - que numa
                  lista ordenada é justamente a pergunta. */}
              {(guiaAcima || guiaAbaixo) && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-2 h-0.5 rounded-full"
                  style={{
                    background: "var(--accent)",
                    top: guiaAcima ? "-5px" : undefined,
                    bottom: guiaAbaixo ? "-5px" : undefined,
                  }}
                />
              )}

              <DotsSixVertical
                size={16}
                weight="bold"
                aria-hidden
                style={{ color: "var(--tinta-fraca)" }}
                className="shrink-0"
              />
              <span
                aria-hidden
                className="num w-5 shrink-0 text-[13px]"
                style={{ color: "var(--tinta-fraca)" }}
              >
                {rotuloPosicao(i)}
              </span>

              <span className="min-w-0 flex-1">
                {item.corpo ?? (
                  <span
                    className="block truncate text-sm"
                    style={{ color: "var(--tinta)" }}
                  >
                    {item.titulo}
                  </span>
                )}
                {item.detalhe}
              </span>

              {acoes?.(item.id)}

              {/* mesmo efeito do arrasto, para teclado e toque impreciso */}
              <span className="flex shrink-0 gap-0.5">
                <button
                  type="button"
                  onClick={() => mover(i, i - 1)}
                  disabled={i === 0}
                  aria-label={t("estrutura.lista.moverAcima", { item: item.titulo })}
                  className="tatil px-1.5 disabled:opacity-25"
                  style={{ color: "var(--tinta-3)" }}
                >
                  <ArrowUp size={15} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => mover(i, i + 1)}
                  disabled={i === itens.length - 1}
                  aria-label={t("estrutura.lista.moverAbaixo", { item: item.titulo })}
                  className="tatil px-1.5 disabled:opacity-25"
                  style={{ color: "var(--tinta-3)" }}
                >
                  <ArrowDown size={15} weight="bold" />
                </button>
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-2 text-[11px]" style={{ color: "var(--tinta-fraca)" }}>
        {t("estrutura.lista.comoUsar")}
      </p>
    </>
  );
}
