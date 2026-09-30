"use client";

/**
 * O rascunho em dois lugares, com uma regra clara de quem manda.
 *
 * Antes ele vivia só no `localStorage`. Isso é conveniência por navegador, não
 * dado: quem começava a montar um problema num computador não o encontrava
 * noutro, e limpar os dados do site apagava o trabalho sem aviso. Agora o
 * servidor guarda também.
 *
 * Os dois continuam existindo, e cada um serve para uma coisa:
 *
 * - **O navegador** grava a cada tecla, e é o que salva quem recarrega a página
 *   um segundo depois de digitar. Ir ao servidor a cada tecla seria uma
 *   requisição por letra.
 * - **O servidor** grava em rajadas, e é o que atravessa trocar de máquina ou
 *   limpar os dados do site.
 *
 * Na abertura os dois podem discordar -- o servidor pode estar atrás pela
 * janela do debounce, ou à frente porque o trabalho veio de outra máquina.
 * Vence o carimbo mais novo. Sem essa comparação, escolher um lado fixo jogaria
 * fora trabalho de verdade em metade dos casos.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "./api";

const PREFIXO = "fitradeoff:";
/** Tempo parado antes de mandar ao servidor. Digitar não é motivo para uma
 *  requisição por tecla; parar de digitar é. */
export const ESPERA_SINCRONIA = 800;

interface Guardado<T> {
  valor: T;
  gravado_em: string;
}

function lerLocal<T>(chave: string): Guardado<T> | null {
  try {
    const bruto = window.localStorage.getItem(PREFIXO + chave);
    if (!bruto) return null;
    const lido = JSON.parse(bruto) as Guardado<T> | T;
    // formato antigo, sem carimbo: vale como o mais velho possível
    if (lido && typeof lido === "object" && "gravado_em" in lido) {
      return lido as Guardado<T>;
    }
    return { valor: lido as T, gravado_em: new Date(0).toISOString() };
  } catch {
    return null;
  }
}

function escreverLocal<T>(chave: string, guardado: Guardado<T>): void {
  try {
    window.localStorage.setItem(PREFIXO + chave, JSON.stringify(guardado));
  } catch {
    /* sem armazenamento a tela funciona igual, só não lembra localmente */
  }
}

function apagarLocal(chave: string): void {
  try {
    window.localStorage.removeItem(PREFIXO + chave);
  } catch {
    /* idem */
  }
}

/** O valor novo, ou como obtê-lo a partir do atual -- como no `useState`. */
export type NovoValor<T> = T | ((anterior: T) => T);

/**
 * Como `useState`, mas lembra entre visitas — e entre máquinas.
 *
 * O valor inicial é sempre o padrão, e o que estava guardado entra depois da
 * montagem: ler armazenamento durante a renderização faria o HTML do servidor
 * divergir do cliente.
 *
 * O `T` guardado é JSON, nunca uma função: é o que deixa a forma funcional do
 * gravador ser reconhecida sem ambiguidade.
 */
export function useRascunhoSincronizado<T>(
  chave: string,
  inicial: T,
): [T, (valor: NovoValor<T>) => void, () => void] {
  const [valor, setValor] = useState<T>(inicial);
  /* O valor de agora, fora do ciclo de renderização. A forma funcional do
     gravador parte dele: um "desfazer" que chega seis segundos depois, ou duas
     gravações no mesmo evento, precisam ver o que já foi gravado, e não o que
     a última renderização capturou. */
  const atual = useRef<T>(inicial);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendente = useRef<T | null>(null);
  const montado = useRef(false);
  /* O que foi digitado antes de a leitura voltar. A leitura chega depois, mas
     é mais velha que a tecla: adotá-la apagaria o que a pessoa acabou de
     escrever. */
  const digitadoCedo = useRef<T | null>(null);

  const mandar = useCallback((novo: T) => {
    pendente.current = null;
    void api.gravarRascunho(novo).catch(() => {
      /* Falhou: o navegador continua com a versão boa, e a próxima parada de
         digitação tenta de novo. Nada é perdido silenciosamente. */
    });
  }, []);

  /** Grava no navegador agora e agenda o servidor para depois da pausa. */
  const persistir = useCallback(
    (novo: T) => {
      escreverLocal(chave, { valor: novo, gravado_em: new Date().toISOString() });
      pendente.current = novo;
      if (relogio.current) clearTimeout(relogio.current);
      relogio.current = setTimeout(() => mandar(novo), ESPERA_SINCRONIA);
    },
    [chave, mandar],
  );

  /* --- abertura: o carimbo mais novo vence --------------------------------- */
  useEffect(() => {
    let cancelado = false;
    const local = lerLocal<T>(chave);

    /** O que a abertura decidiu, a menos que a pessoa já tenha digitado. */
    const adotar = (escolhido: T | null, subir: boolean) => {
      montado.current = true;
      if (digitadoCedo.current !== null) {
        persistir(digitadoCedo.current);
        digitadoCedo.current = null;
        return;
      }
      if (escolhido === null) return;
      atual.current = escolhido;
      setValor(escolhido);
      if (subir) void api.gravarRascunho(escolhido).catch(() => {});
    };

    api
      .lerRascunho()
      .then(({ rascunho, gravado_em }) => {
        if (cancelado) return;
        const doServidor =
          rascunho !== null && gravado_em
            ? ({ valor: rascunho as T, gravado_em } as Guardado<T>)
            : null;

        if (doServidor && local) {
          /* O navegador à frente é a janela do debounce: digitou e saiu antes
             da rajada. Sobe agora, senão o servidor fica atrás para sempre. */
          const localVence = local.gravado_em > doServidor.gravado_em;
          return adotar(localVence ? local.valor : doServidor.valor, localVence);
        }
        if (doServidor) return adotar(doServidor.valor, false);
        /* Só o navegador tem: veio de antes desta versão, ou o servidor
           estava fora quando foi digitado. Sobe agora. */
        adotar(local ? local.valor : null, local !== null);
      })
      .catch(() => {
        /* Servidor fora do ar não pode travar o formulário: segue com o que o
           navegador tem, e a próxima gravação tenta de novo. */
        if (!cancelado) adotar(local ? local.valor : null, false);
      });

    return () => {
      cancelado = true;
    };
  }, [chave, persistir]);

  /* --- a rajada pendente não pode se perder na saída ----------------------- */
  useEffect(() => {
    const aoEsconder = () => {
      if (document.visibilityState !== "hidden" || pendente.current === null) return;
      /* Fechar a aba cancela um `fetch` comum em voo; um `keepalive` é entregue
         pelo navegador depois que a página já saiu. É o que fecha a janela
         entre a última tecla e a gravação. */
      api.gravarRascunhoNaSaida(pendente.current);
      pendente.current = null;
    };
    document.addEventListener("visibilitychange", aoEsconder);
    return () => {
      document.removeEventListener("visibilitychange", aoEsconder);
      if (relogio.current) clearTimeout(relogio.current);
      /* Navegar para outra tela sem fechar a aba também desmonta: a rajada
         que ainda esperava a pausa sai agora, em vez de sumir com o relógio. */
      if (pendente.current !== null) mandar(pendente.current);
    };
  }, [mandar]);

  const guardar = useCallback(
    (entrada: NovoValor<T>) => {
      const novo =
        typeof entrada === "function"
          ? (entrada as (anterior: T) => T)(atual.current)
          : entrada;
      atual.current = novo;
      setValor(novo);
      if (!montado.current) {
        digitadoCedo.current = novo; // a abertura grava quando terminar de ler
        return;
      }
      persistir(novo);
    },
    [persistir],
  );

  const limpar = useCallback(() => {
    if (relogio.current) clearTimeout(relogio.current);
    pendente.current = null;
    digitadoCedo.current = null;
    atual.current = inicial;
    setValor(inicial);
    apagarLocal(chave);
    void api.descartarRascunho().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  return [valor, guardar, limpar];
}
