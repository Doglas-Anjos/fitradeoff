"use client";

/**
 * O rascunho de um cadastro, como contexto.
 *
 * Antes ele descia por props: a sequência de cadastro o segurava e passava
 * `rascunho` e `onAlterar` para cada passo, que os passava adiante para cada
 * bloco -- e cada gravação montava o rascunho inteiro de novo a partir do que
 * aquela renderização tinha capturado. Um "desfazer" que chega seis segundos
 * depois gravava por cima do que foi digitado nesse meio-tempo, e por isso
 * cada bloco guardava uma referência ao rascunho "de agora" só para isso.
 *
 * Agora a gravação é funcional -- `atualizar(r => ...)` recebe o rascunho no
 * momento em que a gravação acontece --, e o contexto é uma interface, não uma
 * implementação: a sequência de cadastro o provê a partir do rascunho
 * sincronizado com o servidor, e `RascunhoEmMemoria` o provê de um estado
 * local, que é o que basta para montar um passo sozinho.
 */

import { createContext, use, useRef, useState } from "react";

import type { Passo, Rascunho } from "@/lib/rascunho";

export interface ValorRascunho {
  /** O rascunho desta renderização, já normalizado. */
  estado: Rascunho;
  acoes: {
    /** Grava a partir do rascunho de agora, nunca de um capturado antes. */
    atualizar: (mudar: (anterior: Rascunho) => Rascunho) => void;
    /** Leva o cadastro a outro passo. */
    irPara: (passo: Passo) => void;
  };
  meta: {
    /** O `data-campo` do campo que a última validação recusou. */
    campoComErro: string | null;
    /** Há uma criação ou leitura em andamento: os botões de avançar esperam. */
    ocupado: boolean;
  };
}

export const ContextoRascunho = createContext<ValorRascunho | null>(null);

/** O rascunho do cadastro em que o componente está. */
export function useRascunho(): ValorRascunho {
  const valor = use(ContextoRascunho);
  if (!valor) {
    throw new Error("useRascunho precisa de um provedor de rascunho acima.");
  }
  return valor;
}

/**
 * Um provedor de rascunho que vive só na memória do componente.
 *
 * Serve para montar um passo do cadastro fora da sequência -- num teste, por
 * exemplo -- com o mesmo contrato que ele terá dentro dela.
 */
export function RascunhoEmMemoria({
  inicial,
  onAlterar,
  campoComErro = null,
  ocupado = false,
  children,
}: {
  inicial: Rascunho;
  /** Chamado a cada gravação, com o rascunho que acabou de ser gravado. */
  onAlterar?: (novo: Rascunho) => void;
  campoComErro?: string | null;
  ocupado?: boolean;
  children: React.ReactNode;
}) {
  const [estado, setEstado] = useState(inicial);
  /* O de agora fica fora do ciclo de renderização pelo mesmo motivo do
     rascunho sincronizado: duas gravações no mesmo evento precisam se ver. */
  const atual = useRef(inicial);

  const atualizar = (mudar: (anterior: Rascunho) => Rascunho) => {
    const novo = mudar(atual.current);
    atual.current = novo;
    setEstado(novo);
    onAlterar?.(novo);
  };

  return (
    <ContextoRascunho
      value={{
        estado,
        acoes: {
          atualizar,
          irPara: (passo) => atualizar((r) => ({ ...r, passo })),
        },
        meta: { campoComErro, ocupado },
      }}
    >
      {children}
    </ContextoRascunho>
  );
}
