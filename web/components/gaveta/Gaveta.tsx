"use client";

/**
 * Uma gaveta presa à borda direita da janela, que desliza por cima do conteúdo.
 *
 * O comportamento de gaveta -- foco que entra e volta, Esc, esconder de quem
 * navega enquanto está fechada, deslize que respeita o movimento reduzido --
 * morava dentro de `PainelSalvas`, misturado com a lista de decisões e com a
 * largura arrastável. Aqui ele fica sozinho, em peças: `Raiz` guarda o estado
 * compartilhado, `Gatilho` é o botão que abre, `Painel` é a gaveta e `Alca` a
 * borda que redimensiona. Quem usa compõe as peças e cuida só do conteúdo.
 *
 * Não é modal de propósito. Um `dialog` com foco preso obrigaria a fechar a
 * gaveta para voltar ao trabalho, e o ponto dela é justamente ficar aberta ao
 * lado do trabalho. É um `aside` nomeado: fecha por Esc e pelo X, e o fundo
 * continua clicável.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react";

import { useMovimentoReduzido } from "@/lib/movimento";

interface ContextoGaveta {
  aberta: boolean;
  abrir: () => void;
  fechar: () => void;
  idPainel: string;
  gatilho: React.RefObject<HTMLButtonElement | null>;
  painel: React.RefObject<HTMLElement | null>;
  semMovimento: boolean;
}

const Contexto = createContext<ContextoGaveta | null>(null);

/** O estado da gaveta, para peças de conteúdo que precisem fechá-la. */
export function useGaveta(): ContextoGaveta {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("peça de Gaveta fora de <Gaveta.Raiz>");
  return ctx;
}

/**
 * Controlada: quem compõe guarda `aberta`, porque costuma precisar dela --
 * para carregar o conteúdo só na primeira abertura, ou para fechar depois de
 * uma ação.
 */
function Raiz({
  aberta,
  onMudar,
  children,
}: {
  aberta: boolean;
  onMudar: (aberta: boolean) => void;
  children: React.ReactNode;
}) {
  const idPainel = useId();
  const gatilho = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLElement>(null);
  const abertaAnterior = useRef(false);
  /* Quem pediu menos movimento não recebe deslize nenhum - a gaveta aparece e
     some. A consulta é estado porque a decisão é de estilo inline, e media
     query não alcança estilo inline. */
  const semMovimento = useMovimentoReduzido();

  const mudar = useRef(onMudar);
  useEffect(() => {
    mudar.current = onMudar;
  });
  const abrir = useCallback(() => mudar.current(true), []);
  const fechar = useCallback(() => mudar.current(false), []);

  useEffect(() => {
    if (!aberta) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberta, fechar]);

  /* O foco entra na gaveta ao abrir e volta para o gatilho ao fechar: sem
     isso, quem navega por teclado abriria a gaveta e continuaria tabulando na
     página atrás dela. */
  useEffect(() => {
    const estavaAberta = abertaAnterior.current;
    abertaAnterior.current = aberta;
    if (aberta) painel.current?.focus();
    else if (estavaAberta) gatilho.current?.focus();
  }, [aberta]);

  const ctx = useMemo(
    () => ({ aberta, abrir, fechar, idPainel, gatilho, painel, semMovimento }),
    [aberta, abrir, fechar, idPainel, semMovimento],
  );

  return <Contexto.Provider value={ctx}>{children}</Contexto.Provider>;
}

/**
 * O botão que abre. Fechada a gaveta, é só ele que fica na tela; aberta, ele
 * some -- a gaveta cobre o canto onde ele estava.
 */
function Gatilho({
  children,
  className = "",
  style,
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type">) {
  const { aberta, abrir, idPainel, gatilho, semMovimento } = useGaveta();
  return (
    <button
      {...props}
      ref={gatilho}
      type="button"
      onClick={abrir}
      aria-expanded={aberta}
      aria-controls={idPainel}
      inert={aberta}
      className={className}
      style={{
        opacity: aberta ? 0 : 1,
        transform: aberta ? "translateY(6px) scale(0.9)" : "translateY(0) scale(1)",
        pointerEvents: aberta ? "none" : "auto",
        transition: semMovimento
          ? "none"
          : "opacity 140ms ease, transform 180ms var(--saida)",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Painel({
  children,
  rotulo,
  largura,
  arrastando = false,
  ref: refExterno,
  style,
  className = "",
}: {
  children: React.ReactNode;
  /** Nome acessível da região. */
  rotulo: string;
  /** Valor CSS da largura. O teto fica aqui, e não no número guardado. */
  largura: string;
  /** No meio de um arrasto de largura o deslize sai de cena. */
  arrastando?: boolean;
  ref?: React.Ref<HTMLElement>;
  style?: React.CSSProperties;
  className?: string;
}) {
  const { aberta, idPainel, painel, semMovimento } = useGaveta();

  /* Duas referências para o mesmo elemento: a da gaveta (foco) e a de quem
     compõe (a largura arrastável escreve direto na variável CSS). */
  const juntar = useCallback(
    (el: HTMLElement | null) => {
      painel.current = el;
      if (typeof refExterno === "function") refExterno(el);
      else if (refExterno) refExterno.current = el;
    },
    [painel, refExterno],
  );

  /* Uma propriedade só, e é `transform`: animar `width` ou `left` mandaria o
     navegador refazer layout a cada quadro, e é justamente o reflow que não
     pode acontecer. 240ms com a curva de saída do projeto.

     Durante o arrasto a transição sai de cena: com 240ms de suavização a borda
     ficaria arrastada atrás do dedo. */
  const deslizar =
    semMovimento || arrastando ? "none" : "transform 240ms var(--saida)";

  return (
    <aside
      id={idPainel}
      ref={juntar}
      tabIndex={-1}
      aria-label={rotulo}
      /* Fechada ela continua montada - é o que permite deslizar - mas fora da
         tela. `inert` tira o conteúdo do caminho do teclado e do clique;
         `aria-hidden` repete a mesma informação para quem ainda não implementa
         `inert`. Sem isso a gaveta invisível receberia Tab e cliques que são
         da página. */
      aria-hidden={!aberta}
      inert={!aberta}
      className={`fixed inset-y-0 right-0 z-40 flex flex-col border-l outline-none ${className}`}
      style={{
        ...style,
        width: largura,
        borderColor: "var(--borda)",
        background: "var(--painel)",
        boxShadow: "var(--sombra-alta)",
        transform: aberta ? "translateX(0)" : "translateX(100%)",
        transition: semMovimento ? "opacity 120ms linear" : deslizar,
        /* Sem deslize a gaveta aparece e some; a opacidade evita que ela
           pisque de um canto ao outro da tela. */
        opacity: semMovimento && !aberta ? 0 : 1,
        pointerEvents: aberta ? "auto" : "none",
      }}
    >
      {children}
    </aside>
  );
}

/**
 * Alça de redimensionamento. Faixa estreita colada na borda esquerda, que se
 * tinge de accent no foco e no hover - a única pista visual de que dá para
 * arrastar precisa aparecer também para quem chegou pelo teclado.
 *
 * Os valores e os manipuladores vêm de `useLarguraRedimensionavel`; a alça só
 * dá a forma.
 */
function Alca({
  rotulo,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { rotulo: string }) {
  return (
    <div
      {...props}
      aria-label={rotulo}
      title={rotulo}
      className="absolute inset-y-0 left-0 z-10 w-2 cursor-col-resize outline-none hover:bg-[var(--accent)] focus-visible:bg-[var(--accent)]"
    />
  );
}

export const Gaveta = { Raiz, Gatilho, Painel, Alca };
