"use client";

/**
 * As pinceladas coloridas no canto do cabeçalho.
 *
 * A primeira versão disto era CSS: `feTurbulence` para a textura e retângulos
 * deformados para os traços. Ficou ruim, e o motivo não era ajuste — era a
 * técnica. Turbulência esticada na horizontal vira borrão de movimento, e
 * retângulo deformado vira mancha chapada com contorno de mapa. Nenhum dos
 * dois tem cerda, que é o que faz tinta parecer tinta.
 *
 * Agora é o mesmo pincel do fundo, de `lib/pincel`. Uma técnica só na tela
 * inteira: dois vocabulários de tinta na mesma página leem como dois autores.
 *
 * Fica no canto inferior direito porque é o que sobra livre em toda tela — o
 * título abre à esquerda, o botão de ação fica no topo à direita, e a trilha de
 * etapas, quando existe, ocupa o rodapé à esquerda. A máscara apaga o lado
 * esquerdo para a tinta nunca encostar no texto.
 *
 * As cores são fixas, e desta vez isso está certo: a barra é navy nos dois
 * temas, então não há o que acompanhar.
 */

import { useEffect, useRef } from "react";

import { aleatorio, criarPincelada, pintarPincelada, prepararTela } from "@/lib/pincel";

/** Teal, azul e âmbar: as três da paleta que aparecem sobre navy. */
const CORES = ["#2fd39a", "#6fb0ee", "#f7bd3a", "#2fd39a", "#6fb0ee"];

export function TintaCabecalho({ semente = 4711 }: { semente?: number }) {
  const tela = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = tela.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pai = canvas.parentElement;
    if (!pai) return;

    function pintar() {
      if (!canvas || !ctx || !pai) return;
      const { width: largura, height: altura } = pai.getBoundingClientRect();
      if (largura < 2 || altura < 2) return;
      prepararTela(canvas, ctx, largura, altura);

      /* Semente por tela. Fixa dentro de cada uma -- sortear a cada
         carregamento leria como instabilidade --, mas diferente entre elas:
         cinco cabeçalhos com o quadro idêntico leem como imagem colada, e não
         como tinta. */
      const sorteia = aleatorio(semente);
      const entre = (a: number, b: number) => a + sorteia() * (b - a);

      /* O cabeçalho é largo e baixo, então o traço acompanha: comprimento
         proporcional à largura, inclinação suave, todos partindo da mesma
         diagonal. Pinceladas em ângulos díspares num espaço achatado leem
         como rabisco, não como gesto. */
      const base = largura * 0.28;
      /* Meio-tom. Na primeira medida a tinta saiu quase néon e roubava o
         título -- o canto é acento, não assunto. */
      ctx.globalAlpha = 0.62;
      for (let i = 0; i < CORES.length; i++) {
        const avanco = i / (CORES.length - 1);
        const centro = {
          x: largura - base * entre(0.34, 0.62) - avanco * largura * 0.07,
          y: altura * (0.9 - avanco * 0.42) + entre(-6, 6),
        };
        pintarPincelada(
          ctx,
          criarPincelada(
            centro,
            entre(-0.28, -0.13),
            base * entre(0.92, 1.35),
            altura * entre(0.1, 0.19),
            CORES[i],
            entre,
          ),
          entre,
          /* Mais densa que no fundo, onde a tinta passa atrás de texto; aqui
             ela ocupa espaço vazio e pode ter corpo. */
          1.5,
        );
      }
      ctx.globalAlpha = 1;

      /* Some antes de chegar ao texto. Sem isto a tinta cruzaria o título em
         cabeçalho estreito, que é justamente onde ela mais atrapalharia. */
      const vao = ctx.createLinearGradient(largura * 0.28, 0, largura * 0.72, 0);
      vao.addColorStop(0, "rgba(0, 0, 0, 1)");
      vao.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = vao;
      ctx.fillRect(0, 0, largura, altura);
      ctx.globalCompositeOperation = "source-over";
    }

    pintar();

    /* O cabeçalho muda de altura sozinho — a trilha de etapas aparece, o título
       quebra em duas linhas. `ResizeObserver` pega isso; ouvir a janela, não. */
    const observador = new ResizeObserver(() => pintar());
    observador.observe(pai);
    return () => observador.disconnect();
  }, [semente]);

  return (
    <canvas
      ref={tela}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0"
    />
  );
}
