import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Quanto tempo uma escolha fica visível antes de a tela trocar.
 *
 * Sem esta pausa, clicar numa das situações trocava a pergunta no mesmo quadro:
 * a resposta saía e a pessoa não via qual tinha dado. Não é enfeite nem atraso
 * artificial -- é o tempo de ler a confirmação, e é o mesmo em toda escolha que
 * avança de tela, para o produto ter um ritmo só.
 *
 * 380ms: abaixo de ~250ms a confirmação vira um piscar que não se lê; acima de
 * ~500ms a interface começa a parecer lenta em vez de atenciosa.
 *
 * Mora aqui, com o gancho que a usa; `components/ui` a reexporta para quem já a
 * importava de lá.
 */
export const ESPERA_CONFIRMACAO = 380;

/** Como cada lado aparece depois do clique: o escolhido acende, o outro recua. */
export type EstadoResposta = "neutro" | "escolhido" | "preterido";

/**
 * Escolher, mostrar a escolha, e só então registrar.
 *
 * A pergunta de tradeoff e a comparação par a par faziam isto cada uma à sua
 * maneira, com o mesmo relógio, o mesmo "um clique por pergunta" e a mesma
 * limpeza na desmontagem -- e a próxima tela de escolha faria uma terceira
 * cópia. O gancho guarda só a pausa; o que acontece depois dela (gravar a
 * resposta, avançar de pergunta) continua com quem chama.
 */
export function useRespostaComConfirmacao<R extends string>(
  aoConfirmar: (resposta: R) => void,
  {
    bloqueado = false,
    manterEscolha = false,
    neutrasEm = [],
  }: {
    /** A página está ocupada: nenhuma resposta é aceita. */
    bloqueado?: boolean;
    /**
     * A escolha continua acesa depois de confirmada. Serve a quem desmonta ao
     * responder (a pergunta de tradeoff): apagar a escolha antes de a pergunta
     * seguinte chegar reabriria os botões durante a ida ao servidor.
     */
    manterEscolha?: boolean;
    /** Respostas em que nenhum lado recua -- na comparação par a par, o empate. */
    neutrasEm?: readonly R[];
  } = {},
) {
  const [escolhida, setEscolhida] = useState<R | null>(null);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* O estado só muda no próximo quadro; dois cliques no mesmo quadro passariam
     os dois pela guarda de `escolhida`. A guarda de verdade é esta. */
  const emCurso = useRef(false);
  /* Quem chama costuma passar uma arrow nova a cada renderização; o relógio
     dispara com a mais recente, sem precisar recomeçar a contagem. */
  const confirmar = useRef(aoConfirmar);
  useEffect(() => {
    confirmar.current = aoConfirmar;
  });

  useEffect(
    () => () => {
      /* Sair da tela no meio da pausa não pode registrar a resposta: seria uma
         declaração que a pessoa não viu acontecer. */
      if (relogio.current) clearTimeout(relogio.current);
    },
    [],
  );

  /** Devolve se a resposta foi aceita (a pausa começou). */
  const responder = useCallback(
    (resposta: R): boolean => {
      if (emCurso.current || bloqueado) return false;
      emCurso.current = true;
      setEscolhida(resposta);
      relogio.current = setTimeout(() => {
        relogio.current = null;
        confirmar.current(resposta);
        if (!manterEscolha) {
          emCurso.current = false;
          setEscolhida(null);
        }
      }, ESPERA_CONFIRMACAO);
      return true;
    },
    [bloqueado, manterEscolha],
  );

  const estadoDe = (lado: R): EstadoResposta =>
    escolhida === null
      ? "neutro"
      : escolhida === lado
        ? "escolhido"
        : neutrasEm.includes(escolhida)
          ? "neutro"
          : "preterido";

  return {
    escolhida,
    responder,
    /** Na pausa: os botões continuam focáveis, mas não aceitam outro clique. */
    pausado: escolhida !== null,
    estadoDe,
  };
}

/**
 * Devolve o foco a `alvo` se ele caiu no vazio.
 *
 * Responder desmonta o botão que tinha o foco, e quem usa teclado ou leitor de
 * tela caía no topo da página. Só age quando o foco se perdeu, para não
 * arrancá-lo de quem já está em outro lugar.
 */
export function recuperarFoco(alvo: HTMLElement | null): void {
  const ativo = document.activeElement;
  if (ativo && ativo !== document.body && ativo.isConnected) return;
  alvo?.focus({ preventScroll: true });
}
