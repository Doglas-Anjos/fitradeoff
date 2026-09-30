import { useSyncExternalStore } from "react";

const CONSULTA = "(prefers-reduced-motion: reduce)";

/**
 * Quem pediu menos movimento ao sistema.
 *
 * O CSS já respeita `prefers-reduced-motion` (ver `globals.css`), mas rolagem
 * pedida em JavaScript passa por fora dele: `scrollIntoView({behavior:
 * "smooth"})` desliza mesmo assim. Quem rola por código pergunta aqui.
 */
export function prefereMenosMovimento(): boolean {
  try {
    return window.matchMedia(CONSULTA).matches;
  } catch {
    return false;
  }
}

export const rolagem = (): ScrollBehavior =>
  prefereMenosMovimento() ? "auto" : "smooth";

/* --- a mesma pergunta, como estado de componente --------------------------------

   Cada componente que decidia estilo inline pelo movimento reduzido tinha a sua
   cópia do mesmo efeito: `useState(false)`, `matchMedia`, ouvir `change`,
   desligar na saída. As cópias já divergiam (uma guardava `addEventListener`
   com `?.`, a outra não). Uma assinatura externa só, lida por
   `useSyncExternalStore`, que é a forma que o React tem para isto: sem efeito,
   sem um quadro renderizado com o valor errado depois da hidratação. */

function assinar(avisar: () => void): () => void {
  /* Nem todo ambiente tem `matchMedia` -- jsdom não tem, e sem esta guarda o
     componente derruba a página inteira em teste. */
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const consulta = window.matchMedia(CONSULTA);
  consulta.addEventListener?.("change", avisar);
  return () => consulta.removeEventListener?.("change", avisar);
}

function noServidor(): boolean {
  /* O servidor não sabe o que o sistema da pessoa pede; na dúvida, o HTML sai
     como para a maioria e o cliente corrige ao hidratar. */
  return false;
}

/** A pessoa pediu para o sistema não animar? Reage se ela mudar de ideia. */
export function useMovimentoReduzido(): boolean {
  return useSyncExternalStore(assinar, prefereMenosMovimento, noServidor);
}
