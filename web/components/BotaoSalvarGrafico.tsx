"use client";

/**
 * Salvar o gráfico como imagem, para colar num relatório ou numa apresentação.
 *
 * O decisor raramente decide sozinho: o resultado vira slide, e ter que tirar
 * print da tela é o tipo de atrito que faz a ferramenta parecer inacabada.
 */

import { DownloadSimple } from "@phosphor-icons/react";
import { useRef, useState } from "react";

import { salvarComoPng } from "@/lib/salvarSvg";

export function BotaoSalvarGrafico({
  alvo,
  nome,
}: {
  /** Container que envolve o <svg> a exportar. */
  alvo: React.RefObject<HTMLElement | null>;
  nome: string;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const ocupado = useRef(false);

  const salvar = async () => {
    if (ocupado.current) return;
    ocupado.current = true;
    setErro(null);
    try {
      const svg = alvo.current?.querySelector("svg");
      if (!svg) throw new Error("não encontrei o gráfico nesta seção");
      await salvarComoPng(svg as SVGSVGElement, nome);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      ocupado.current = false;
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={salvar}
        className="tatil flex items-center gap-1.5 text-[12px]"
        style={{ color: "var(--tinta-3)" }}
      >
        <DownloadSimple size={13} />
        salvar imagem
      </button>
      {erro && (
        <span role="alert" className="text-[11px]" style={{ color: "var(--erro)" }}>
          {erro}
        </span>
      )}
    </span>
  );
}
