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

export interface ItemArrastavel {
  id: string;
  titulo: string;
  detalhe?: React.ReactNode;
}

export function ListaArrastavel({
  itens,
  onReordenar,
  rotuloPosicao = (i) => String(i + 1),
}: {
  itens: ItemArrastavel[];
  onReordenar: (ordem: string[]) => void;
  rotuloPosicao?: (indice: number) => string;
}) {
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
    setAnuncio(`${itens[de].titulo} agora está na posição ${para + 1} de ${itens.length}.`);
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

          return (
            <li
              key={item.id}
              ref={(el) => {
                referencias.current[item.id] = el;
              }}
              draggable
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
              className="tatil flex items-center gap-3 rounded-[var(--raio-painel)] border px-3 py-2.5"
              style={{
                borderColor: alvoAtual ? "var(--accent)" : "var(--borda)",
                background: sendoArrastado ? "var(--painel-fundo)" : "var(--painel)",
                opacity: sendoArrastado ? 0.5 : 1,
                cursor: "grab",
                boxShadow: alvoAtual ? "var(--sombra)" : "none",
              }}
            >
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
                <span className="block truncate text-sm" style={{ color: "var(--tinta)" }}>
                  {item.titulo}
                </span>
                {item.detalhe}
              </span>

              {/* mesmo efeito do arrasto, para teclado e toque impreciso */}
              <span className="flex shrink-0 gap-0.5">
                <button
                  type="button"
                  onClick={() => mover(i, i - 1)}
                  disabled={i === 0}
                  aria-label={`Mover ${item.titulo} para cima`}
                  className="tatil px-1.5 disabled:opacity-25"
                  style={{ color: "var(--tinta-3)" }}
                >
                  <ArrowUp size={15} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => mover(i, i + 1)}
                  disabled={i === itens.length - 1}
                  aria-label={`Mover ${item.titulo} para baixo`}
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
        Arraste pelos pontos à esquerda, ou use as setas.
      </p>
    </>
  );
}
