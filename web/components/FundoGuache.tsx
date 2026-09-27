"use client";

/**
 * O fundo, pintado a guache.
 *
 * A primeira tentativa foi com gradiente CSS e ruído de `feTurbulence`, e não
 * funcionou: gradiente tem borda lisa e tinta não tem. O que faz uma pincelada
 * ler como pincelada é a **cerda** — dezenas de fios paralelos, cada um com sua
 * própria espessura, opacidade e ondulação, deixando falhas por onde o papel
 * aparece. Isso não se desenha com `background-image`; precisa de canvas.
 *
 * A técnica é a do exemplo que o Doglas mandou: uma espinha em Bézier
 * quadrática, uma passada larga e diluída, um miolo mais denso por cima, e as
 * cerdas deslocadas perpendicularmente com uma senoide de fase própria. As
 * poças de ponta seca a cada poucos passos completam a impressão.
 *
 * Três coisas mudaram em relação ao exemplo, e cada uma tem motivo:
 *
 * **A pintura é estática.** O original repinta para sempre, e como demonstração
 * isso é o encanto dele. Atrás de uma ferramenta de trabalho seria um vizinho
 * se mexendo no canto do olho enquanto alguém lê um resultado — e um
 * `requestAnimationFrame` que nunca para custa bateria o tempo todo. Aqui a
 * tela é pintada uma vez e o laço encerra.
 *
 * **As cores saem da paleta do projeto**, lidas das variáveis CSS em tempo de
 * pintura. Por isso a pintura acompanha o tema: trocar para escuro repinta com
 * os tons de lá, e não clareia um quadro feito para fundo claro.
 *
 * **A semente é fixa.** A mesma composição em todo carregamento. Sorteio a cada
 * visita faria a página parecer outra a cada vez, e num instrumento isso lê
 * como instabilidade, não como variedade.
 */

import { useEffect, useRef } from "react";

/** Gerador com semente: a mesma composição em toda visita. */
function aleatorio(semente: number) {
  let estado = semente >>> 0;
  return () => {
    estado = (estado * 1664525 + 1013904223) >>> 0;
    return estado / 4294967296;
  };
}

interface Ponto {
  x: number;
  y: number;
}

function pontoQuadratico(p0: Ponto, p1: Ponto, p2: Ponto, t: number): Ponto {
  const m = 1 - t;
  return {
    x: m * m * p0.x + 2 * m * t * p1.x + t * t * p2.x,
    y: m * m * p0.y + 2 * m * t * p1.y + t * t * p2.y,
  };
}

interface Cerda {
  deslocamento: number;
  espessura: number;
  alfa: number;
  fase: number;
  balanco: number;
}

interface Pincelada {
  p0: Ponto;
  p1: Ponto;
  p2: Ponto;
  cor: string;
  largura: number;
  angulo: number;
  cerdas: Cerda[];
}

function lerVariavel(estilo: CSSStyleDeclaration, nome: string, alternativa: string) {
  const valor = estilo.getPropertyValue(nome).trim();
  return valor || alternativa;
}

/** `#rrggbb` ou `rgb(...)` para `rgba(...)` com o alfa pedido. */
function comAlfa(cor: string, alfa: number) {
  if (cor.startsWith("#")) {
    const h = cor.slice(1);
    const c =
      h.length === 3
        ? [h[0] + h[0], h[1] + h[1], h[2] + h[2]]
        : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)];
    const [r, g, b] = c.map((x) => parseInt(x, 16));
    return `rgba(${r}, ${g}, ${b}, ${alfa})`;
  }
  const n = cor.match(/[\d.]+/g);
  if (!n || n.length < 3) return cor;
  return `rgba(${n[0]}, ${n[1]}, ${n[2]}, ${alfa})`;
}

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

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      largura = window.innerWidth;
      altura = window.innerHeight;
      canvas.width = Math.round(largura * dpr);
      canvas.height = Math.round(altura * dpr);
      canvas.style.width = `${largura}px`;
      canvas.style.height = `${altura}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, largura, altura);

      /* O papel. Um gradiente muito curto entre dois tons do próprio fundo,
         mais fibra: pontinhos e fiapos curtos. É o que impede a tinta de
         parecer flutuando sobre uma superfície plástica. */
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
        ctx.fillRect(
          sorteia() * largura,
          sorteia() * altura,
          entre(0.4, 1.3),
          entre(0.4, 1.3),
        );
      }
      for (let i = 0; i < Math.round(fibras / 12); i++) {
        const x = sorteia() * largura;
        const y = sorteia() * altura;
        const comprimento = entre(2, 9);
        const angulo = entre(0, Math.PI * 2);
        ctx.strokeStyle = comAlfa(tintaPapel, entre(0.006, 0.026));
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
          x + Math.cos(angulo) * comprimento,
          y + Math.sin(angulo) * comprimento,
        );
        ctx.stroke();
      }

      /* A paleta é a do projeto, lida das variáveis: nenhuma cor nova entra no
         fundo, e trocar de tema repinta com os tons de lá. */
      const paleta = [
        lerVariavel(estilo, "--accent", "#0b3261"),
        lerVariavel(estilo, "--dado-a", "#0d9488"),
        lerVariavel(estilo, "--azul-vivo", "#246bb2"),
        lerVariavel(estilo, "--serie-1", "#2a78d6"),
        lerVariavel(estilo, "--navy-2", "#0b2d55"),
      ];

      /* Muito mais fraco que o exemplo, que era a página inteira e podia ser
         quadro. Aqui há texto por cima: na primeira tentativa em canvas ficou
         em 0,62 e o fundo virou o assunto da tela -- lia como pintura com um
         formulário por cima, e não como fundo. No escuro cai mais ainda,
         porque sobre superfície escura o mesmo pigmento pesa o dobro. */
      ctx.globalAlpha = escuro ? 0.16 : 0.24;

      const pinceladas: Pincelada[] = [];
      const quantas = 20;

      for (let i = 0; i < quantas; i++) {
        /* Como no exemplo: a maioria nasce perto de uma pincelada anterior, e o
           resto abre composição em outro canto. É o que faz a mancha crescer
           como um quadro em construção, em vez de virar confete espalhado. */
        let cx: number;
        let cy: number;
        let angulo: number;
        if (pinceladas.length >= 3 && sorteia() < 0.55) {
          const base = pinceladas[Math.floor(sorteia() * pinceladas.length)];
          const p = pontoQuadratico(base.p0, base.p1, base.p2, entre(0.15, 0.95));
          cx = p.x + entre(-70, 70);
          cy = p.y + entre(-70, 70);
          angulo = base.angulo + entre(-1.1, 1.1);
        } else {
          /* As bordas, e não o meio: o conteúdo mora numa coluna central, e
             tinta atrás de texto atrapalha a leitura sem ninguém ver a tinta. */
          cx = sorteia() < 0.5 ? entre(-0.05, 0.3) * largura : entre(0.72, 1.06) * largura;
          cy = entre(-0.05, 1.05) * altura;
          angulo = entre(-Math.PI, Math.PI);
        }

        const comprimento = entre(largura * 0.09, largura * 0.24);
        const cor =
          pinceladas.length && sorteia() < 0.6
            ? pinceladas[Math.floor(sorteia() * pinceladas.length)].cor
            : paleta[Math.floor(sorteia() * paleta.length)];

        const cerdas: Cerda[] = [];
        const quantasCerdas = 18 + Math.floor(sorteia() * 12);
        for (let c = 0; c < quantasCerdas; c++) {
          cerdas.push({
            deslocamento: entre(-0.48, 0.48),
            espessura: entre(0.03, 0.1),
            alfa: entre(0.05, 0.15),
            fase: entre(0, Math.PI * 2),
            balanco: entre(0.01, 0.05),
          });
        }

        pinceladas.push({
          p0: {
            x: cx - Math.cos(angulo) * comprimento * 0.45,
            y: cy - Math.sin(angulo) * comprimento * 0.45,
          },
          p1: {
            x: cx + entre(-comprimento * 0.28, comprimento * 0.28),
            y: cy + entre(-comprimento * 0.28, comprimento * 0.28),
          },
          p2: {
            x: cx + Math.cos(angulo) * comprimento * 0.55,
            y: cy + Math.sin(angulo) * comprimento * 0.55,
          },
          cor,
          largura: entre(26, 72),
          angulo,
          cerdas,
        });
      }

      for (const traco of pinceladas) {
        const passos = 130;
        for (let i = 1; i <= passos; i++) {
          const a = pontoQuadratico(traco.p0, traco.p1, traco.p2, (i - 1) / passos);
          const b = pontoQuadratico(traco.p0, traco.p1, traco.p2, i / passos);
          const ang = Math.atan2(b.y - a.y, b.x - a.x);
          const perpX = -Math.sin(ang);
          const perpY = Math.cos(ang);
          /* A pincelada é mais larga no meio: é onde o pincel encosta inteiro. */
          const larguraAqui =
            traco.largura * (0.7 + Math.sin(((i - 1) / passos) * Math.PI) * 0.52);

          ctx.lineCap = "round";

          ctx.strokeStyle = comAlfa(traco.cor, 0.07);
          ctx.lineWidth = larguraAqui;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();

          ctx.strokeStyle = comAlfa(traco.cor, 0.11);
          ctx.lineWidth = larguraAqui * 0.56;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();

          for (const cerda of traco.cerdas) {
            const onda =
              Math.sin(((i - 1) / passos) * 14 + cerda.fase) *
              larguraAqui *
              cerda.balanco;
            const deslocamento = cerda.deslocamento * larguraAqui + onda;
            ctx.strokeStyle = comAlfa(traco.cor, cerda.alfa);
            ctx.lineWidth = Math.max(0.7, larguraAqui * cerda.espessura);
            ctx.beginPath();
            ctx.moveTo(a.x + perpX * deslocamento, a.y + perpY * deslocamento);
            ctx.lineTo(b.x + perpX * deslocamento, b.y + perpY * deslocamento);
            ctx.stroke();
          }

          /* Poça de ponta seca: o pigmento que se acumula onde o pincel
             hesita. Sem isso o traço fica limpo demais para ser tinta. */
          if (i % 6 === 0) {
            ctx.fillStyle = comAlfa(traco.cor, 0.045);
            ctx.beginPath();
            ctx.ellipse(
              b.x + entre(-3, 3),
              b.y + entre(-3, 3),
              larguraAqui * entre(0.05, 0.12),
              larguraAqui * entre(0.02, 0.07),
              ang,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
      }

      /* Abre o meio. O conteúdo vive numa coluna central, e pincelada atrás de
         texto atrapalha a leitura sem que ninguém aproveite a pincelada.
         `destination-out` apaga o que já foi pintado, com a força do gradiente:
         limpo no centro, intacto nas bordas. É o mesmo gesto de quem reserva o
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

    /* Repintar custa alguns milissegundos, então só quando muda o que a
       pintura depende: o tamanho da janela e o tema. Rolagem não mexe em nada
       aqui -- a tela é fixa. */
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
    <canvas
      ref={tela}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
