/** A marca da FasorX: um fasor -- o vetor girante que representa uma senoide.
 *
 * O mesmo desenho do favicon do fasorx.com.br, inline em vez de <img> de la:
 * a cor acompanha o texto em volta (currentColor), e nao ha pedido a outro
 * dominio so para desenhar um icone. */
export function MarcaFasorx({ tamanho = 16 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <circle cx="16" cy="16" r="11.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".38" />
      <line x1="16" y1="16" x2="24.5" y2="7.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="16" cy="16" r="2.4" fill="currentColor" />
    </svg>
  );
}
