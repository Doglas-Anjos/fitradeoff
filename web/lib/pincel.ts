"use client";

/**
 * Como se pinta uma pincelada de guache num canvas.
 *
 * Isto mora num módulo próprio porque a tinta aparece em dois lugares — o
 * fundo da página e o canto dos cabeçalhos — e a primeira versão usava
 * técnicas diferentes em cada um: canvas com cerdas no fundo, `feTurbulence`
 * em CSS no cabeçalho. O resultado foi exatamente o que se espera de dois
 * vocabulários na mesma tela: o fundo lia como aguada e o cabeçalho lia como
 * borrão horizontal, e os dois juntos não liam como nada.
 *
 * O que faz uma pincelada parecer pincelada é a **cerda**: dezenas de fios
 * paralelos ao traço, cada um com espessura, opacidade e ondulação próprias,
 * deixando falhas por onde o papel aparece. Gradiente não produz isso —
 * gradiente tem borda lisa, e tinta não tem.
 *
 * A técnica é a do exemplo que o Doglas mandou: espinha em Bézier quadrática,
 * uma passada larga e diluída, um miolo mais denso por cima, as cerdas
 * deslocadas perpendicularmente com uma senoide de fase própria, e poças de
 * ponta seca a cada poucos passos.
 */

export interface Ponto {
  x: number;
  y: number;
}

/** Gerador com semente: a mesma composição em toda visita. */
export function aleatorio(semente: number) {
  let estado = semente >>> 0;
  return () => {
    estado = (estado * 1664525 + 1013904223) >>> 0;
    return estado / 4294967296;
  };
}

export function pontoQuadratico(p0: Ponto, p1: Ponto, p2: Ponto, t: number): Ponto {
  const m = 1 - t;
  return {
    x: m * m * p0.x + 2 * m * t * p1.x + t * t * p2.x,
    y: m * m * p0.y + 2 * m * t * p1.y + t * t * p2.y,
  };
}

/** `#rrggbb` ou `rgb(...)` para `rgba(...)` com o alfa pedido. */
export function comAlfa(cor: string, alfa: number): string {
  if (cor.startsWith("#")) {
    const h = cor.slice(1);
    const partes =
      h.length === 3
        ? [h[0] + h[0], h[1] + h[1], h[2] + h[2]]
        : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)];
    const [r, g, b] = partes.map((x) => parseInt(x, 16));
    return `rgba(${r}, ${g}, ${b}, ${alfa})`;
  }
  const n = cor.match(/[\d.]+/g);
  if (!n || n.length < 3) return cor;
  return `rgba(${n[0]}, ${n[1]}, ${n[2]}, ${alfa})`;
}

export function lerVariavel(
  estilo: CSSStyleDeclaration,
  nome: string,
  alternativa: string,
): string {
  return estilo.getPropertyValue(nome).trim() || alternativa;
}

interface Cerda {
  deslocamento: number;
  espessura: number;
  alfa: number;
  fase: number;
  balanco: number;
}

export interface Pincelada {
  p0: Ponto;
  p1: Ponto;
  p2: Ponto;
  cor: string;
  largura: number;
  angulo: number;
  cerdas: Cerda[];
}

export function criarPincelada(
  centro: Ponto,
  angulo: number,
  comprimento: number,
  largura: number,
  cor: string,
  entre: (a: number, b: number) => number,
): Pincelada {
  const cerdas: Cerda[] = [];
  const quantas = 18 + Math.floor(entre(0, 12));
  for (let c = 0; c < quantas; c++) {
    cerdas.push({
      deslocamento: entre(-0.48, 0.48),
      espessura: entre(0.03, 0.1),
      alfa: entre(0.05, 0.15),
      fase: entre(0, Math.PI * 2),
      balanco: entre(0.01, 0.05),
    });
  }
  return {
    p0: {
      x: centro.x - Math.cos(angulo) * comprimento * 0.45,
      y: centro.y - Math.sin(angulo) * comprimento * 0.45,
    },
    p1: {
      x: centro.x + entre(-comprimento * 0.28, comprimento * 0.28),
      y: centro.y + entre(-comprimento * 0.28, comprimento * 0.28),
    },
    p2: {
      x: centro.x + Math.cos(angulo) * comprimento * 0.55,
      y: centro.y + Math.sin(angulo) * comprimento * 0.55,
    },
    cor,
    largura,
    angulo,
    cerdas,
  };
}

export function pintarPincelada(
  ctx: CanvasRenderingContext2D,
  traco: Pincelada,
  entre: (a: number, b: number) => number,
  forca = 1,
): void {
  const passos = 130;
  ctx.lineCap = "round";
  for (let i = 1; i <= passos; i++) {
    const t = (i - 1) / passos;
    const a = pontoQuadratico(traco.p0, traco.p1, traco.p2, t);
    const b = pontoQuadratico(traco.p0, traco.p1, traco.p2, i / passos);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const perpX = -Math.sin(ang);
    const perpY = Math.cos(ang);
    /* Mais larga no meio: é onde o pincel encosta inteiro no papel. */
    const larguraAqui = traco.largura * (0.7 + Math.sin(t * Math.PI) * 0.52);

    ctx.strokeStyle = comAlfa(traco.cor, 0.07 * forca);
    ctx.lineWidth = larguraAqui;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    ctx.strokeStyle = comAlfa(traco.cor, 0.11 * forca);
    ctx.lineWidth = larguraAqui * 0.56;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    for (const cerda of traco.cerdas) {
      const onda = Math.sin(t * 14 + cerda.fase) * larguraAqui * cerda.balanco;
      const desloc = cerda.deslocamento * larguraAqui + onda;
      ctx.strokeStyle = comAlfa(traco.cor, cerda.alfa * forca);
      ctx.lineWidth = Math.max(0.7, larguraAqui * cerda.espessura);
      ctx.beginPath();
      ctx.moveTo(a.x + perpX * desloc, a.y + perpY * desloc);
      ctx.lineTo(b.x + perpX * desloc, b.y + perpY * desloc);
      ctx.stroke();
    }

    /* Poça de ponta seca: o pigmento que se acumula onde o pincel hesita. Sem
       isso o traço fica limpo demais para ser tinta. */
    if (i % 6 === 0) {
      ctx.fillStyle = comAlfa(traco.cor, 0.045 * forca);
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

/** Prepara o canvas para a densidade da tela e devolve a medida em CSS px. */
export function prepararTela(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  largura: number,
  altura: number,
): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(largura * dpr));
  canvas.height = Math.max(1, Math.round(altura * dpr));
  canvas.style.width = `${largura}px`;
  canvas.style.height = `${altura}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, largura, altura);
}
