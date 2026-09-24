/**
 * Salva um SVG da página como PNG.
 *
 * Os gráficos usam variáveis CSS para cor, que não sobrevivem ao serializar: o
 * SVG solto não conhece `var(--dado-a)`. Por isso cada atributo de cor é
 * resolvido para o valor computado antes de exportar — senão a imagem sai preta
 * ou vazia, que é o modo silencioso de falhar desta função.
 */

const ATRIBUTOS_DE_COR = ["fill", "stroke"] as const;

function resolverCores(origem: SVGSVGElement, copia: SVGSVGElement): void {
  const originais = [origem, ...origem.querySelectorAll("*")];
  const copiados = [copia, ...copia.querySelectorAll("*")];

  originais.forEach((elemento, i) => {
    const computado = window.getComputedStyle(elemento);
    const alvo = copiados[i] as SVGElement | undefined;
    if (!alvo) return;
    for (const atributo of ATRIBUTOS_DE_COR) {
      const valor = computado.getPropertyValue(atributo);
      if (valor && valor !== "none") alvo.setAttribute(atributo, valor);
    }
    const opacidade = computado.getPropertyValue("opacity");
    if (opacidade && opacidade !== "1") alvo.setAttribute("opacity", opacidade);
  });
}

export async function salvarComoPng(
  svg: SVGSVGElement,
  nomeArquivo: string,
  escala = 2,
): Promise<void> {
  const caixa = svg.getBoundingClientRect();
  const largura = Math.ceil(caixa.width) || 800;
  const altura = Math.ceil(caixa.height) || 400;

  const copia = svg.cloneNode(true) as SVGSVGElement;
  copia.setAttribute("width", String(largura));
  copia.setAttribute("height", String(altura));
  copia.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  resolverCores(svg, copia);

  // fundo opaco: um PNG transparente colado num documento fica ilegível
  const fundo = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  fundo.setAttribute("width", "100%");
  fundo.setAttribute("height", "100%");
  fundo.setAttribute(
    "fill",
    window.getComputedStyle(document.body).backgroundColor || "#ffffff",
  );
  copia.insertBefore(fundo, copia.firstChild);

  const texto = new XMLSerializer().serializeToString(copia);
  const url = URL.createObjectURL(new Blob([texto], { type: "image/svg+xml" }));

  try {
    const imagem = new Image();
    await new Promise<void>((resolve, reject) => {
      imagem.onload = () => resolve();
      imagem.onerror = () => reject(new Error("não consegui renderizar o gráfico"));
      imagem.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = largura * escala;
    canvas.height = altura * escala;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas indisponível neste navegador");
    ctx.scale(escala, escala);
    ctx.drawImage(imagem, 0, 0, largura, altura);

    const png = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (!png) throw new Error("não consegui gerar o arquivo");

    const link = document.createElement("a");
    link.href = URL.createObjectURL(png);
    link.download = nomeArquivo.endsWith(".png") ? nomeArquivo : `${nomeArquivo}.png`;
    link.click();
    URL.revokeObjectURL(link.href);
  } finally {
    URL.revokeObjectURL(url);
  }
}
