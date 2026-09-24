"use client";

/**
 * Estado que sobrevive ao recarregar.
 *
 * Duas coisas distintas, guardadas em lugares distintos:
 *
 * - **Qual decisão está aberta** vai na URL. Assim o botão voltar do navegador
 *   funciona, o link pode ser salvo, e recarregar a página não perde o
 *   trabalho. É o que o servidor já sabe — a URL só aponta para lá.
 * - **O que ainda não foi enviado** (rascunho do formulário, aba escolhida) vai
 *   no armazenamento local. É conveniência por navegador, não dado da decisão.
 *
 * O armazenamento pode falhar — janela privada, dados bloqueados, cota cheia —
 * e nesse caso a tela precisa seguir funcionando. Por isso toda leitura e toda
 * escrita são protegidas, e a ausência de valor é sempre um caso previsto.
 */

import { useCallback, useEffect, useRef, useState } from "react";

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

/**
 * Como `useState`, mas lembra entre visitas.
 *
 * O valor inicial é sempre o padrão, e o que estava salvo entra depois da
 * montagem: ler `localStorage` durante a renderização faria o HTML do servidor
 * divergir do cliente e o React reclamaria de hidratação.
 */
export function useEstadoPersistido<T>(
  chave: string,
  inicial: T,
): [T, (valor: T) => void, () => void] {
  const [valor, setValor] = useState<T>(inicial);
  const montado = useRef(false);

  useEffect(() => {
    const salvo = ler<T>(chave);
    if (salvo !== null) setValor(salvo);
    montado.current = true;
  }, [chave]);

  const definir = useCallback(
    (novo: T) => {
      setValor(novo);
      if (montado.current) escrever(chave, novo);
    },
    [chave],
  );

  const limpar = useCallback(() => {
    setValor(inicial);
    apagar(chave);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  return [valor, definir, limpar];
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
