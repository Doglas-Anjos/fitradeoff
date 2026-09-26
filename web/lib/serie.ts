/**
 * A serie categorica, num lugar so.
 *
 * A cor identifica a alternativa, nunca a posicao dela num ranking: desmarcar
 * uma alternativa nao pode repintar as que sobraram. Por isso a ordem e fixa e
 * o indice vem de `todas`, a lista completa, e nao da lista filtrada.
 *
 * Os valores moram no CSS (`--serie-1`..`--serie-8`) porque o modo escuro tem
 * passos proprios, escolhidos e validados contra o painel escuro. Repetir os
 * hexadecimais aqui em TypeScript significaria manter duas verdades e perder a
 * troca de tema de graca.
 */

export const TOTAL_SERIE = 8;

/** A cor da n-esima alternativa, como referencia de token -- nunca hexadecimal. */
export function corDaSerie(indice: number): string {
  return `var(--serie-${(indice % TOTAL_SERIE) + 1})`;
}
