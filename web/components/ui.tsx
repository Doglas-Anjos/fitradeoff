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

import { Info, Warning, X } from "@phosphor-icons/react";
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
        aria-label={`O que é ${titulo}`}
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
          className="absolute left-1/2 top-7 z-30 w-72 -translate-x-1/2 rounded-[var(--raio-painel)] border p-4"
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
              aria-label="Fechar"
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
      className={`tatil w-full rounded-[var(--raio-controle)] border px-3 py-2 text-sm outline-none ${props.className ?? ""}`}
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
  const estilos = {
    principal: {
      background: "var(--accent)",
      color: "var(--accent-tinta)",
      border: "1px solid transparent",
    },
    contorno: {
      background: "var(--painel)",
      color: "var(--tinta)",
      border: "1px solid var(--borda-forte)",
    },
    texto: {
      background: "transparent",
      color: "var(--tinta-2)",
      border: "1px solid transparent",
    },
  }[variante];

  return (
    <button
      {...props}
      className={`tatil inline-flex items-center justify-center gap-2 rounded-[var(--raio-controle)] px-4 py-2 text-sm font-medium disabled:opacity-45 ${props.className ?? ""}`}
      style={{ ...estilos, ...props.style }}
    >
      {icone}
      {children}
    </button>
  );
}
