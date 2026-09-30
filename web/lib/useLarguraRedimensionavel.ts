import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A largura de um painel encostado na borda direita, que a pessoa arrasta ou
 * ajusta pelo teclado, e que é lembrada entre visitas.
 *
 * Durante o arrasto nada passa pelo estado do React. A versão anterior chamava
 * `setLargura` e gravava no `localStorage` a cada `pointermove`: dezenas de
 * renderizações do painel inteiro por segundo -- lista, filtros, datas
 * relativas -- e uma escrita síncrona em disco por quadro, só para mover uma
 * borda. Agora o movimento escreve numa variável CSS do próprio painel, e o
 * estado e o armazenamento só recebem o valor final, quando o dedo solta.
 */

/** A variável CSS que o painel lê para a largura. */
export const VARIAVEL_LARGURA = "--largura-painel";

export function useLarguraRedimensionavel(
  chave: string,
  {
    min,
    max,
    padrao,
    passo = 16,
  }: {
    min: number;
    max: number;
    padrao: number;
    /** Um toque de seta; com Shift anda quatro vezes mais, para atravessar a
        faixa inteira em poucas teclas. */
    passo?: number;
  },
) {
  const [largura, setLargura] = useState(padrao);
  const [arrastando, setArrastando] = useState(false);
  /** O painel cuja variável CSS o arrasto move. */
  const painel = useRef<HTMLElement | null>(null);

  const limitar = useCallback(
    (px: number) => Math.min(max, Math.max(min, Math.round(px))),
    [min, max],
  );

  const gravar = useCallback(
    (px: number) => {
      try {
        window.localStorage.setItem(chave, String(px));
      } catch {
        /* perder a preferência é aceitável, quebrar o arrasto não é */
      }
    },
    [chave],
  );

  /* A largura guardada só entra depois da montagem: ler armazenamento durante a
     renderização faria o HTML do servidor divergir do cliente. Lida uma vez; a
     partir daí quem manda é o estado. */
  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(chave);
      const numero = salvo === null ? NaN : Number(salvo);
      if (Number.isFinite(numero)) setLargura(limitar(numero));
    } catch {
      /* sem armazenamento a tela funciona igual, só não lembra a largura */
    }
  }, [chave, limitar]);

  const ajustar = useCallback(
    (px: number) => {
      const nova = limitar(px);
      setLargura(nova);
      gravar(nova);
    },
    [limitar, gravar],
  );

  /* Arrasto pela borda esquerda. O ponteiro fica capturado pela alça, então o
     gesto não se perde ao passar por cima de um botão da lista nem ao sair da
     janela, e não é preciso pendurar nada no documento. */
  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    const alca = e.currentTarget;
    e.preventDefault();
    alca.setPointerCapture?.(e.pointerId);
    setArrastando(true);
    let atual = largura;
    const mover = (m: PointerEvent) => {
      atual = limitar(window.innerWidth - m.clientX);
      painel.current?.style.setProperty(VARIAVEL_LARGURA, `${atual}px`);
      /* O leitor de tela continua lendo o número certo mesmo sem o React
         renderizar no meio do gesto. */
      alca.setAttribute("aria-valuenow", String(atual));
    };
    const soltar = () => {
      alca.removeEventListener("pointermove", mover);
      alca.removeEventListener("pointerup", soltar);
      alca.removeEventListener("pointercancel", soltar);
      setArrastando(false);
      ajustar(atual);
    };
    alca.addEventListener("pointermove", mover);
    alca.addEventListener("pointerup", soltar);
    alca.addEventListener("pointercancel", soltar);
  };

  /* Arrastar é atalho, não o único caminho: a alça é focável e as setas fazem o
     mesmo trabalho. Seta esquerda alarga porque a alça é a borda esquerda do
     painel, e levá-la para a esquerda é literalmente o gesto do arrasto. */
  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const salto = e.shiftKey ? passo * 4 : passo;
    const destino =
      e.key === "ArrowLeft"
        ? largura + salto
        : e.key === "ArrowRight"
          ? largura - salto
          : e.key === "Home"
            ? max
            : e.key === "End"
              ? min
              : null;
    if (destino === null) return;
    e.preventDefault();
    ajustar(destino);
  };

  return {
    largura,
    arrastando,
    /** Vai no painel: é nele que mora a variável que o arrasto move. */
    painelProps: {
      ref: painel,
      style: { [VARIAVEL_LARGURA]: `${largura}px` } as React.CSSProperties,
    },
    /** Vai na alça: papel, valores ARIA, ponteiro e teclado. O rótulo é de
        quem chama, porque vem do catálogo de textos. */
    alcaProps: {
      role: "separator" as const,
      "aria-orientation": "vertical" as const,
      "aria-valuenow": largura,
      "aria-valuemin": min,
      "aria-valuemax": max,
      tabIndex: 0,
      onPointerDown,
      onKeyDown,
      style: { touchAction: "none" } as React.CSSProperties,
    },
  };
}
