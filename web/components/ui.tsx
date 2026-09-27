"use client";

/**
 * Pecas de interface compartilhadas.
 *
 * O metodo tem tres pontos em que a pessoa trava, sempre os mesmos: a direcao
 * do criterio, o que "importancia" significa aqui (a faixa do pior ao melhor,
 * nao o criterio no abstrato) e por que as duas situacoes da pergunta sao
 * pessimas. Por isso a dica e um componente de primeira classe, e nao um
 * paragrafo solto: ela precisa estar ao lado do controle que confunde, no
 * momento em que confunde.
 */

import { Check, Info, Warning, X } from "@phosphor-icons/react";

import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/nucleo";
import { useEffect, useId, useRef, useState } from "react";

export const PESO_ICONE = 1.5;

/* --- dica contextual -------------------------------------------------------- */

export function Dica({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  const [aberta, setAberta] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const id = useId();
  const { t } = useIdioma();

  useEffect(() => {
    if (!aberta) return;
    const fechar = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberta(false);
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setAberta(false);
    document.addEventListener("mousedown", fechar);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fechar);
      document.removeEventListener("keydown", escape);
    };
  }, [aberta]);

  return (
    <span ref={caixa} className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={() => setAberta(!aberta)}
        aria-expanded={aberta}
        aria-controls={id}
        aria-label={t("ui.dica.abrir", { assunto: titulo })}
        className="tatil inline-flex h-5 w-5 items-center justify-center rounded-full"
        style={{ color: aberta ? "var(--accent)" : "var(--tinta-fraca)" }}
      >
        <Info size={15} weight={aberta ? "fill" : "regular"} />
      </button>

      {aberta && (
        <div
          id={id}
          role="dialog"
          aria-label={titulo}
          /* Largura presa ao que a janela tem, e alinhada à esquerda em tela
             estreita: 288px centrados num gatilho perto da borda transbordavam
             para fora da tela, e a ajuda ficava cortada justamente onde ela é
             mais necessária.

             Continua cobrindo o conteúdo atrás, o que não é o ideal: a
             recomendação é que a ajuda fique ao lado, não por cima. Trocar para
             um bloco que empurra o conteúdo muda todas as telas, então fica
             como proposta separada. */
          className="entra-subindo absolute top-7 z-30 w-[min(18rem,calc(100vw-2rem))] rounded-[var(--raio-painel)] border p-4 max-sm:left-0 sm:left-1/2 sm:-translate-x-1/2"
          style={{
            borderColor: "var(--borda)",
            background: "var(--painel)",
            boxShadow: "var(--sombra-alta)",
          }}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <strong className="text-[13px]" style={{ color: "var(--tinta)" }}>
              {titulo}
            </strong>
            <button
              type="button"
              onClick={() => setAberta(false)}
              aria-label={t("acao.fechar")}
              style={{ color: "var(--tinta-fraca)" }}
            >
              <X size={14} weight="bold" />
            </button>
          </div>
          <div
            className="space-y-2 text-[13px] leading-relaxed"
            style={{ color: "var(--tinta-2)" }}
          >
            {children}
          </div>
        </div>
      )}
    </span>
  );
}

/* --- campo de formulario ---------------------------------------------------- */

/**
 * Rotulo acima, ajuda abaixo do rotulo, erro abaixo do controle.
 *
 * O placeholder nunca faz as vezes de rotulo: ele some quando a pessoa digita,
 * e ai o campo fica sem identificacao -- justamente quando ela volta para
 * conferir o que preencheu.
 */
export function Campo({
  rotulo,
  ajuda,
  erro,
  dica,
  obrigatorio,
  children,
}: {
  rotulo: string;
  ajuda?: string;
  erro?: string | null;
  dica?: React.ReactNode;
  obrigatorio?: boolean;
  children: (props: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": boolean | undefined;
  }) => React.ReactNode;
}) {
  const id = useId();
  const idAjuda = `${id}-ajuda`;
  const idErro = `${id}-erro`;
  const descrito =
    [ajuda ? idAjuda : null, erro ? idErro : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <label
          htmlFor={id}
          className="text-[13px] font-medium"
          style={{ color: "var(--tinta)" }}
        >
          {rotulo}
          {obrigatorio && (
            <span style={{ color: "var(--tinta-fraca)" }} aria-hidden>
              {" "}
              *
            </span>
          )}
        </label>
        {dica}
      </div>

      {ajuda && (
        <p id={idAjuda} className="text-[12px]" style={{ color: "var(--tinta-3)" }}>
          {ajuda}
        </p>
      )}

      {children({
        id,
        "aria-describedby": descrito,
        "aria-invalid": erro ? true : undefined,
      })}

      {erro && (
        <p
          id={idErro}
          className="flex items-center gap-1.5 text-[12px]"
          style={{ color: "var(--erro)" }}
        >
          <Warning size={13} weight="fill" />
          {erro}
        </p>
      )}
    </div>
  );
}

/* --- controles -------------------------------------------------------------- */

export const estiloControle = {
  borderColor: "var(--borda-forte)",
  background: "var(--painel)",
  color: "var(--tinta)",
} as const;

export function Entrada({
  invalido,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalido?: boolean }) {
  return (
    <input
      {...props}
      className={`tatil min-h-11 w-full rounded-[var(--raio-controle)] border px-3.5 py-2.5 text-sm outline-none placeholder:text-[var(--tinta-fraca)] hover:border-[var(--accent)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(36,107,178,0.12)] disabled:cursor-not-allowed disabled:bg-[var(--painel-fundo)] ${props.className ?? ""}`}
      style={{
        ...estiloControle,
        borderColor: invalido ? "var(--erro)" : "var(--borda-forte)",
        ...props.style,
      }}
    />
  );
}

export function Botao({
  variante = "principal",
  icone,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "principal" | "contorno" | "texto";
  icone?: React.ReactNode;
}) {
  /* As cores moram em `globals.css`, sob `.botao[data-variante]`, e nao aqui.
     Antes vinham de um objeto de estilo inline, e isso impedia justamente o que
     um botao mais precisa: estilo inline vence regra de classe, entao nenhum
     `:hover` de fundo pegava. O botao mexia (subia meio pixel, ganhava sombra)
     mas nao mudava de cor, e em tela de toque -- onde nao ha hover -- nao
     acontecia nada. */
  return (
    <button
      {...props}
      data-variante={variante}
      className={`botao tatil min-h-11 inline-flex items-center justify-center gap-2 rounded-[var(--raio-controle)] px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${props.className ?? ""}`}
      style={props.style}
    >
      {icone}
      {children}
    </button>
  );
}

/* --- controle segmentado ------------------------------------------------------

   Escolher entre duas ou tres opcoes mutuamente exclusivas: direcao do
   criterio, tipo de escala, modo de ordenacao.

   O estado escolhido era um fundo `--accent-suave` sobre painel branco --
   1,11:1 de contraste, quando a WCAG pede 3:1 para um componente de interface.
   Na pratica, nao dava para ver o que estava selecionado. Agora o escolhido
   recebe o preenchimento cheio do accent, que da 8,98:1 no claro e 5,52:1 no
   escuro: o mesmo tratamento do botao principal, porque e a mesma ideia -- isto
   aqui esta escolhido.

   Vive aqui, e nao em cada tela, porque o padrao aparecia em quatro lugares e
   corrigir o contraste em um so deixaria os outros tres invisiveis. */

export interface OpcaoSegmentada<T extends string> {
  valor: T;
  rotulo: string;
  icone?: React.ReactNode;
  /** Texto do `title`, para a explicacao que nao cabe no rotulo. */
  descricao?: string;
}

export function Segmentado<T extends string>({
  opcoes,
  valor,
  onEscolher,
  etiqueta,
  desabilitado,
  className = "",
}: {
  opcoes: readonly OpcaoSegmentada<T>[];
  valor: T;
  onEscolher: (v: T) => void;
  /** Nome do grupo para quem navega por leitor de tela. */
  etiqueta: string;
  desabilitado?: boolean;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className={`inline-flex gap-1 rounded-[var(--raio-controle)] border p-1 ${className}`}
      style={{ borderColor: "var(--borda)", background: "var(--painel-fundo)" }}
    >
      {opcoes.map(({ valor: v, rotulo, icone, descricao }) => {
        const ativa = v === valor;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={ativa}
            disabled={desabilitado}
            onClick={() => onEscolher(v)}
            title={descricao}
            data-ativa={ativa}
            /* Cor por classe: com `style` inline as opções não escolhidas não
               reagiam ao ponteiro, e são justamente elas que a pessoa precisa
               perceber como clicáveis. */
            className="opcao-segmentada tatil flex min-h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-[7px] px-3 py-1.5 text-[12px] disabled:opacity-45"
          >
            {icone}
            {rotulo}
          </button>
        );
      })}
    </div>
  );
}


/* --- selo ---------------------------------------------------------------------

   Rotulo curto preso a um item: a unidade de um criterio, a direcao, o numero de
   niveis. Sempre legivel -- nunca cor sozinha dizendo alguma coisa, porque cor
   sozinha nao chega a quem nao a distingue. */

export function Selo({
  children,
  tom = "neutro",
  icone,
  titulo,
}: {
  children: React.ReactNode;
  tom?: "neutro" | "accent" | "aviso";
  icone?: React.ReactNode;
  titulo?: string;
}) {
  const tons = {
    neutro: { color: "var(--tinta-2)", background: "var(--painel-fundo)" },
    accent: { color: "var(--accent)", background: "var(--accent-suave)" },
    aviso: { color: "var(--aviso)", background: "transparent" },
  }[tom];

  return (
    <span
      title={titulo}
      className="inline-flex items-center gap-1 rounded-full border border-[var(--borda)] px-2 py-0.5 text-[11px] font-semibold"
      style={tons}
    >
      {icone}
      {children}
    </span>
  );
}

/* --- modal --------------------------------------------------------------------

   Usado para confirmar o que nao da para desfazer. Fecha por Esc, por clique
   fora e pelo botao de cancelar -- tres saidas, porque quem abriu sem querer
   precisa sair sem pensar.

   O foco vai para o botao de cancelar, nao para o de confirmar: um Enter
   distraido nao deve apagar nada. */

export function Modal({
  titulo,
  children,
  confirmar,
  onConfirmar,
  onFechar,
  perigo,
}: {
  titulo: string;
  children: React.ReactNode;
  confirmar: string;
  onConfirmar: () => void;
  onFechar: () => void;
  perigo?: boolean;
}) {
  const cancelar = useRef<HTMLButtonElement>(null);
  const id = useId();
  const { t } = useIdioma();

  useEffect(() => {
    cancelar.current?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  return (
    <div
      className="entra-desvanecendo fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "var(--veu)" }}
      onClick={onFechar}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onClick={(e) => e.stopPropagation()}
        className="entra-subindo w-full max-w-md rounded-[var(--raio-painel)] border p-5 shadow-lg"
        style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
      >
        <h2
          id={id}
          className="text-[15px] font-semibold"
          style={{ color: "var(--tinta)" }}
        >
          {titulo}
        </h2>
        <div
          className="prosa mt-2 space-y-2 text-[13px]"
          style={{ color: "var(--tinta-2)" }}
        >
          {children}
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            ref={cancelar}
            type="button"
            onClick={onFechar}
            className="tatil rounded-[var(--raio-controle)] border px-4 py-2 text-sm font-medium"
            style={{ borderColor: "var(--borda-forte)", color: "var(--tinta)" }}
          >
            {t("acao.cancelar")}
          </button>
          <Botao
            onClick={onConfirmar}
            style={
              perigo
                ? { background: "var(--erro)", color: "#ffffff" }
                : undefined
            }
          >
            {confirmar}
          </Botao>
        </div>
      </div>
    </div>
  );
}

/* --- cartao de opcao ----------------------------------------------------------

   Escolha unica entre poucas opcoes que merecem espaco: o objetivo da decisao.
   Quadrado e lado a lado, as quatro se comparam de relance; empilhadas em
   retangulos longos, viram uma lista que se le de cima para baixo -- e uma lista
   sugere ordem onde nao ha nenhuma.

   O escolhido tem borda accent, anel interno e um visto. Tres sinais, porque um
   fundo levemente tingido nao chegava a 3:1 e sumia. */

export function CartaoOpcao({
  ativo,
  rotulo,
  ajuda,
  icone,
  figura,
  onEscolher,
  nome,
  className = "",
}: {
  ativo: boolean;
  rotulo: string;
  ajuda: string;
  icone: React.ReactNode;
  /**
   * Diagrama que mostra do que se trata. Ocupa o meio do cartao.
   *
   * Recebe se o cartao esta em realce -- apontado pelo mouse, com o foco do
   * teclado, ou escolhido -- pelo mesmo motivo do cartao duplo: o desenho conta
   * o que o objetivo faz, e conta melhor em movimento. Cor e movimento sao
   * coisas distintas aqui: `ativo` pinta e fica; o realce anima e passa.
   */
  figura?: (emRealce: boolean) => React.ReactNode;
  onEscolher: () => void;
  /** Nome do grupo de radio, para o teclado navegar entre as opcoes. */
  nome: string;
  className?: string;
}) {
  const [apontado, setApontado] = useState(false);
  const [comFoco, setComFoco] = useState(false);
  /* O foco entra na conta para quem navega por teclado ver a mesma coisa que
     quem usa o mouse -- sem isso a figura so se move para uma metade das
     pessoas. */
  const emRealce = apontado || comFoco || ativo;

  return (
    <label
      onMouseEnter={() => setApontado(true)}
      onMouseLeave={() => setApontado(false)}
      className={`tatil group relative flex h-full cursor-pointer flex-col gap-3 rounded-[var(--raio-painel)] border p-5 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[var(--sombra-alta)] ${className}`}
      style={{
        borderColor: ativo ? "var(--accent)" : "var(--borda)",
        background: "var(--painel)",
        boxShadow: ativo ? "inset 0 0 0 2px var(--accent), var(--sombra)" : "var(--sombra)",
      }}
    >
      <input
        type="radio"
        name={nome}
        checked={ativo}
        onChange={onEscolher}
        onFocus={() => setComFoco(true)}
        onBlur={() => setComFoco(false)}
        className="sr-only"
      />

      {ativo && (
        <span
          aria-hidden
          className="absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full"
          style={{ background: "var(--accent)", color: "var(--accent-tinta)" }}
        >
          <Check size={10} weight="bold" />
        </span>
      )}

      <span
        aria-hidden
        className="transicao-cor"
        style={{ color: ativo ? "var(--accent)" : "var(--tinta-fraca)" }}
      >
        {icone}
      </span>

      {figura && (
        <span aria-hidden className="my-1 flex flex-1 items-center justify-center px-1">
          {figura(emRealce)}
        </span>
      )}

      <span className="block text-[14px] font-medium" style={{ color: "var(--tinta)" }}>
        {rotulo}
      </span>
      <span
        className="block text-[12px] leading-snug"
        style={{ color: "var(--tinta-3)" }}
      >
        {ajuda}
      </span>
    </label>
  );
}

/* Um cartao, duas opcoes.
 *
 * O sistema de referencia agrupa as duas leituras de carteira numa caixa so,
 * com o mesmo desenho e dois radios embaixo, e poe o helper ao lado da caixa.
 * A razao e boa: as duas partem dos mesmos dados e respondem a mesma pergunta
 * -- que subconjunto levar dentro do orcamento -- e o que muda e o criterio de
 * selecao. Como cartoes irmaos elas pareceriam objetivos diferentes, e o
 * decisor escolheria pelo nome sem saber que a diferenca esta no metodo.
 *
 * O visto no canto, que marca o escolhido nos cartoes de opcao unica, nao serve
 * aqui: com duas opcoes dentro e preciso dizer qual delas. Entao o radio
 * aparece de verdade, e o cartao so acende a borda. */

export function CartaoOpcaoDupla({
  nome,
  icone,
  figura,
  opcoes,
  selecionado,
  onEscolher,
  dica,
  className = "",
}: {
  nome: string;
  icone: React.ReactNode;
  /** O desenho, que recebe a opção em realce -- a apontada, ou a escolhida. */
  figura?: (emRealce: string | null) => React.ReactNode;
  opcoes: { valor: string; rotulo: string }[];
  /** O valor escolhido, se for uma destas opções. */
  selecionado: string | null;
  onEscolher: (valor: string) => void;
  /** O helper da caixa, ao lado do ícone. */
  dica?: React.ReactNode;
  className?: string;
}) {
  const base = useId();
  const [apontada, setApontada] = useState<string | null>(null);
  const ativo = opcoes.some((o) => o.valor === selecionado);
  /* O que o desenho ilustra: o mouse manda enquanto está sobre uma região, e
     fora dela volta a valer a escolha. */
  const emRealce = apontada ?? (ativo ? selecionado : null);
  const idDe = (valor: string) => `${base}-${valor}`;

  return (
    <div
      className={`relative flex h-full flex-col gap-2 rounded-[var(--raio-painel)] border p-4 ${className}`}
      style={{
        borderColor: ativo ? "var(--accent)" : "var(--borda)",
        background: "var(--painel)",
        boxShadow: ativo ? "inset 0 0 0 1px var(--accent)" : "none",
      }}
    >
      <div className="relative z-10 flex items-start justify-between gap-2">
        <span
          aria-hidden
          className="transicao-cor"
          style={{ color: ativo ? "var(--accent)" : "var(--tinta-fraca)" }}
        >
          {icone}
        </span>
        {dica}
      </div>

      {figura && (
        <div className="relative my-1 flex-1">
          {/* Metade do desenho para cada opção.

              Vêm antes do desenho no DOM de propósito: o realce de uma região é
              um fundo, e pintado por cima ele escondia os pontos do diagrama.
              Embaixo ele aparece atrás da figura, e o clique continua chegando
              porque a figura é `pointer-events-none`.
              São `label` sem texto, não divs com onClick: o rótulo é o
              elemento que a plataforma já entende como "clicar aqui aciona
              aquele controle". Não entram na ordem de tabulação, não roubam
              nome acessível de ninguém, e o teclado continua sendo servido
              pelos dois radios de baixo, que são os controles de verdade. */}
          <div className="absolute inset-0 flex">
            {opcoes.map((opcao, i) => (
              <label
                key={opcao.valor}
                htmlFor={idDe(opcao.valor)}
                onMouseEnter={() => setApontada(opcao.valor)}
                onMouseLeave={() => setApontada(null)}
                className="flex-1 cursor-pointer transition-colors duration-200"
                style={{
                  background:
                    apontada === opcao.valor ? "var(--accent-suave)" : "transparent",
                  borderLeft:
                    i > 0 && apontada !== null
                      ? "1px dashed var(--borda-forte)"
                      : "1px dashed transparent",
                  borderRadius: "var(--raio-controle)",
                }}
              />
            ))}
          </div>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center px-1"
          >
            {figura(emRealce)}
          </span>

        </div>
      )}

      <div className="relative z-10 flex flex-col gap-1.5">
        {opcoes.map((opcao) => {
          const escolhida = opcao.valor === selecionado;
          const realcada = apontada === opcao.valor;
          return (
            <label
              key={opcao.valor}
              htmlFor={idDe(opcao.valor)}
              onMouseEnter={() => setApontada(opcao.valor)}
              onMouseLeave={() => setApontada(null)}
              className="tatil flex cursor-pointer items-start gap-2 text-[13px] leading-snug transition-colors duration-200"
              style={{
                color:
                  escolhida || realcada ? "var(--tinta)" : "var(--tinta-2)",
              }}
            >
              <input
                id={idDe(opcao.valor)}
                type="radio"
                name={nome}
                checked={escolhida}
                onChange={() => onEscolher(opcao.valor)}
                className="sr-only"
              />
              <span
                aria-hidden
                className="transicao-cor mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border"
                style={{
                  borderColor: escolhida
                    ? "var(--accent)"
                    : realcada
                      ? "var(--accent)"
                      : "var(--borda-forte)",
                  background: "var(--painel)",
                }}
              >
                {escolhida && (
                  <span
                    className="surge-marca h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                )}
              </span>
              <span style={{ fontWeight: escolhida ? 500 : 400 }}>{opcao.rotulo}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

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
 */
export const ESPERA_CONFIRMACAO = 380;

/* Um atalho entre dois cartões.
 *
 * A terceira resposta -- "as duas valem o mesmo" -- é uma resposta como as
 * outras duas, e estava só como texto pequeno abaixo dos cartões: o olho de
 * quem compara está entre eles, não embaixo. Aqui ela fica no caminho, entre as
 * duas coisas que se pesam.
 *
 * É redundante de propósito. O botão de texto continua onde estava, porque nem
 * todo mundo lê um ícone redondo como "responder", e porque tirá-lo mudaria o
 * que já funciona para quem se acostumou.
 */

export function BotaoEntreCartoes({
  rotulo,
  icone,
  onClick,
  desabilitado = false,
  confirmado = false,
  dica,
}: {
  /** Vira o nome acessível e a legenda sob o ícone. */
  rotulo: string;
  icone: React.ReactNode;
  onClick: () => void;
  desabilitado?: boolean;
  /** A resposta foi dada e está no ar, aguardando a tela trocar. */
  confirmado?: boolean;
  /** Explicação do que esta resposta significa. Fica **ao lado** do botão, e
   *  não dentro: uma dica é um controle próprio, e aninhá-la aqui faria um
   *  botão dentro de outro — o clique viraria loteria e o leitor de tela
   *  anunciaria duas ações onde há uma. */
  dica?: React.ReactNode;
}) {
  const botao = (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      /* Sem `title`: o rótulo já está visível logo abaixo do ícone, e a bolha
         nativa do navegador cobria o cartão da direita justamente enquanto a
         pessoa comparava os dois. Quem quiser mais que o rótulo tem a dica. */
      data-estado={confirmado ? "escolhido" : "neutro"}
      className="botao-entre-cartoes tatil group flex shrink-0 flex-col items-center gap-1.5 disabled:opacity-40"
    >
      {/* Cor, fundo e realce vêm do CSS, não daqui: ver "a terceira resposta"
          no globals.css. Estilo inline venceria o `:hover` sem avisar. */}
      <span
        aria-hidden
        className="marca-entre-cartoes flex h-11 w-11 items-center justify-center rounded-full border"
      >
        {icone}
      </span>
      <span className="rotulo-entre-cartoes max-w-24 text-center text-[11px] leading-tight">
        {rotulo}
      </span>
    </button>
  );

  if (!dica) return <div className="flex shrink-0 self-center">{botao}</div>;

  return (
    <div className="flex shrink-0 items-start gap-1 self-center">
      {botao}
      <span className="mt-2.5">{dica}</span>
    </div>
  );
}
