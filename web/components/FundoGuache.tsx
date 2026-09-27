"use client";

/**
 * O fundo da página, pintado a guache.
 *
 * A técnica mora em `lib/pincel` e é a mesma que o canto dos cabeçalhos usa —
 * uma tela, um vocabulário de tinta. Aqui ficam só as decisões deste fundo:
 * quantas pinceladas, onde nascem, e quanto elas podem pesar atrás de texto.
 *
 * **A pintura é estática.** O exemplo que inspirou isto repinta para sempre, e
 * como demonstração é o encanto dele. Atrás de uma ferramenta de trabalho seria
 * um vizinho se mexendo no canto do olho enquanto alguém lê um resultado — e um
 * `requestAnimationFrame` que nunca para custa bateria o tempo todo.
 *
 * **As cores saem da paleta**, lidas das variáveis CSS na hora de pintar, e por
 * isso a pintura acompanha o tema em vez de clarear um quadro feito para fundo
 * claro.
 *
 * **A semente é fixa.** A mesma composição em todo carregamento: num
 * instrumento, sortear a cada visita lê como instabilidade, não como variedade.
 */

import { useEffect, useRef } from "react";

import {
  aleatorio,
  criarPincelada,
  comAlfa,
  lerVariavel,
  pintarPincelada,
  pontoQuadratico,
  prepararTela,
  type Pincelada,
} from "@/lib/pincel";

export function FundoGuache() {
  const tela = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = tela.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let largura = 0;
    let altura = 0;

    function pintar() {
      if (!canvas || !ctx) return;
      const raiz = document.documentElement;
      const estilo = getComputedStyle(raiz);
      const escuro = raiz.dataset.theme === "dark";

      largura = window.innerWidth;
      altura = window.innerHeight;
      prepararTela(canvas, ctx, largura, altura);

      /* O papel: um gradiente curto entre dois tons do próprio fundo, mais
         fibra — pontinhos e fiapos curtos. É o que impede a tinta de parecer
         flutuando sobre uma superfície plástica. */
      const papel = ctx.createLinearGradient(0, 0, largura, altura);
      papel.addColorStop(0, lerVariavel(estilo, "--plano-topo", "#edf4fb"));
      papel.addColorStop(0.55, lerVariavel(estilo, "--plano", "#f3f7fc"));
      papel.addColorStop(1, lerVariavel(estilo, "--plano-topo", "#edf4fb"));
      ctx.fillStyle = papel;
      ctx.fillRect(0, 0, largura, altura);

      const sorteia = aleatorio(20260927);
      const entre = (a: number, b: number) => a + sorteia() * (b - a);

      const tintaPapel = lerVariavel(estilo, "--tinta", "#0b1f38");
      const fibras = Math.round((largura * altura) / 2600);
      for (let i = 0; i < fibras; i++) {
        ctx.fillStyle = comAlfa(tintaPapel, entre(0.004, 0.028));
        ctx.fillRect(sorteia() * largura, sorteia() * altura, entre(0.4, 1.3), entre(0.4, 1.3));
      }
      for (let i = 0; i < Math.round(fibras / 12); i++) {
        const x = sorteia() * largura;
        const y = sorteia() * altura;
        const c = entre(2, 9);
        const ang = entre(0, Math.PI * 2);
        ctx.strokeStyle = comAlfa(tintaPapel, entre(0.006, 0.026));
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(ang) * c, y + Math.sin(ang) * c);
        ctx.stroke();
      }

      const paleta = [
        lerVariavel(estilo, "--accent", "#0b3261"),
        lerVariavel(estilo, "--dado-a", "#0d9488"),
        lerVariavel(estilo, "--azul-vivo", "#246bb2"),
        lerVariavel(estilo, "--serie-1", "#2a78d6"),
        lerVariavel(estilo, "--navy-2", "#0b2d55"),
      ];

      /* Muito mais fraco que o exemplo, que era a página inteira e podia ser
         quadro. Aqui há texto por cima: numa tentativa anterior ficou em 0,62 e
         o fundo virou o assunto da tela. No escuro cai mais ainda, porque sobre
         superfície escura o mesmo pigmento pesa o dobro. */
      ctx.globalAlpha = escuro ? 0.16 : 0.24;

      const pinceladas: Pincelada[] = [];
      for (let i = 0; i < 20; i++) {
        /* Como no exemplo: a maioria nasce perto de uma pincelada anterior, e o
           resto abre composição noutro canto. É o que faz a mancha crescer como
           um quadro em construção, em vez de virar confete espalhado. */
        let centro: { x: number; y: number };
        let angulo: number;
        if (pinceladas.length >= 3 && sorteia() < 0.55) {
          const base = pinceladas[Math.floor(sorteia() * pinceladas.length)];
          const p = pontoQuadratico(base.p0, base.p1, base.p2, entre(0.15, 0.95));
          centro = { x: p.x + entre(-70, 70), y: p.y + entre(-70, 70) };
          angulo = base.angulo + entre(-1.1, 1.1);
        } else {
          /* As bordas, não o meio: o conteúdo mora numa coluna central. */
          centro = {
            x: sorteia() < 0.5 ? entre(-0.05, 0.3) * largura : entre(0.72, 1.06) * largura,
            y: entre(-0.05, 1.05) * altura,
          };
          angulo = entre(-Math.PI, Math.PI);
        }
        const cor =
          pinceladas.length && sorteia() < 0.6
            ? pinceladas[Math.floor(sorteia() * pinceladas.length)].cor
            : paleta[Math.floor(sorteia() * paleta.length)];
        pinceladas.push(
          criarPincelada(
            centro,
            angulo,
            entre(largura * 0.09, largura * 0.24),
            entre(26, 72),
            cor,
            entre,
          ),
        );
      }

      for (const traco of pinceladas) pintarPincelada(ctx, traco, entre);

      /* Abre o meio. Pincelada atrás de texto atrapalha a leitura sem que
         ninguém aproveite a pincelada. `destination-out` apaga o que já foi
         pintado com a força do gradiente — é o mesmo gesto de quem reserva o
         branco do papel. */
      ctx.globalAlpha = 1;
      const vao = ctx.createRadialGradient(
        largura / 2,
        altura * 0.45,
        0,
        largura / 2,
        altura * 0.45,
        Math.max(largura, altura) * 0.62,
      );
      vao.addColorStop(0, "rgba(0, 0, 0, 0.95)");
      vao.addColorStop(0.42, "rgba(0, 0, 0, 0.72)");
      vao.addColorStop(0.78, "rgba(0, 0, 0, 0.12)");
      vao.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = vao;
      ctx.fillRect(0, 0, largura, altura);
      ctx.globalCompositeOperation = "source-over";
    }

    pintar();

    /* Repintar custa alguns milissegundos, então só quando muda o que a pintura
       depende: o tamanho da janela e o tema. Rolagem não mexe em nada — a tela
       é fixa. */
    let relogio: ReturnType<typeof setTimeout>;
    const aoRedimensionar = () => {
      if (window.innerWidth === largura && window.innerHeight === altura) return;
      clearTimeout(relogio);
      relogio = setTimeout(pintar, 180);
    };
    window.addEventListener("resize", aoRedimensionar);

    const observador = new MutationObserver(pintar);
    observador.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      clearTimeout(relogio);
      window.removeEventListener("resize", aoRedimensionar);
      observador.disconnect();
    };
  }, []);

  return (
    <canvas ref={tela} aria-hidden className="pointer-events-none fixed inset-0 -z-10" />
  );
}
