/** `2026-09-26T03:36:08+00:00` -> `26/09/2026 03:36` no fuso de quem le.
 *
 * O nome diz o fuso de proposito: ha um `instante` local em
 * `PainelSalvas` que devolve numero, para ordenar. Dois nomes iguais com
 * contratos diferentes seria pedir confusao.
 *
 * O servidor grava em UTC e quem le esta em algum fuso; converter na tela e o
 * que faz a hora significar o que a pessoa espera. Devolve o ISO cru quando a
 * data nao presta, porque mostrar o dado torto e melhor que mostrar
 * "Invalid Date" -- quem ve o ISO sabe que veio assim do servidor.
 */
export function dataHoraLocal(iso: string, idioma: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(idioma === "en" ? "en-US" : "pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
