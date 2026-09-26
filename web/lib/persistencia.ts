"use client";

/**
 * Estado que sobrevive ao recarregar.
 *
 * Duas coisas distintas, guardadas em lugares distintos:
 *
 * - **Qual decisão está aberta** vai na URL. Assim o botão voltar do navegador
 *   funciona, o link pode ser salvo, e recarregar a página não perde o
 *   trabalho. É o que o servidor já sabe — a URL só aponta para lá.
 * - **Quais decisões este navegador já abriu** vai no armazenamento local. É
 *   conveniência por navegador, não dado da decisão: outra máquina tem a sua
 *   própria lista, e perdê-la não perde nada.
 *
 * O rascunho do formulário saiu daqui: ele é dado, e mora nos dois lados
 * (`rascunhoSincronizado`).
 *
 * O armazenamento pode falhar — janela privada, dados bloqueados, cota cheia —
 * e nesse caso a tela precisa seguir funcionando. Por isso toda leitura e toda
 * escrita são protegidas, e a ausência de valor é sempre um caso previsto.
 */

const PREFIXO = "fitradeoff:";

function ler<T>(chave: string): T | null {
  try {
    const bruto = window.localStorage.getItem(PREFIXO + chave);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    return null;
  }
}

function escrever(chave: string, valor: unknown): void {
  try {
    window.localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
  } catch {
    /* sem armazenamento a tela funciona igual, só não lembra */
  }
}

function apagar(chave: string): void {
  try {
    window.localStorage.removeItem(PREFIXO + chave);
  } catch {
    /* idem */
  }
}

/** As decisões que este navegador já abriu, da mais recente para a mais antiga. */
const RECENTES = "recentes";
const MAX_RECENTES = 8;

export interface Recente {
  id: string;
  nome: string;
  em: number;
}

export function registrarRecente(id: string, nome: string): void {
  const atuais = ler<Recente[]>(RECENTES) ?? [];
  const sem = atuais.filter((r) => r.id !== id);
  escrever(RECENTES, [{ id, nome, em: Date.now() }, ...sem].slice(0, MAX_RECENTES));
}

export function lerRecentes(): Recente[] {
  return ler<Recente[]>(RECENTES) ?? [];
}

export function esquecerRecente(id: string): void {
  escrever(RECENTES, (ler<Recente[]>(RECENTES) ?? []).filter((r) => r.id !== id));
}
