"use client";

/**
 * A barra de etapas, com volta.
 *
 * O método é sequencial, mas isso não quer dizer que a tela deva ser de mão
 * única: quem está decidindo precisa reler os dados que informou, conferir a
 * ordem que declarou, e voltar sem perder o que já respondeu.
 *
 * A distinção que a barra precisa deixar clara é entre **rever** e **refazer**.
 * Olhar o problema ou a ordem não custa nada. Reordenar os critérios, sim:
 * as respostas anteriores se referiam a outra sequência de pares e são
 * descartadas — por isso essa etapa avisa antes.
 */

import { ArrowLeft, Check, Warning } from "@phosphor-icons/react";
import { useState } from "react";

import { useIdioma } from "@/lib/i18n";
import { comNos } from "@/lib/i18n/estrutura";
import "@/lib/i18n/nucleo";

export type Etapa = "problema" | "ordem" | "perguntas" | "resultado";

/* --- a trilha, peça comum às duas barras ------------------------------------- */

/**
 * As peças de uma trilha de passos: a lista, o passo, o conector entre dois
 * passos, o botão de cada um e a marca que ele leva.
 *
 * As duas barras desta tela -- as etapas da decisão e os passos do cadastro --
 * repetiam a mesma marcação `ol > li > conector > botão`, com o mesmo
 * `aria-current` e a mesma troca entre o número e o visto. Cada uma diverge só
 * no desenho e no nome do estado que o CSS lê (`data-etapa` numa, `data-passo`
 * na outra), e é só isso que cada variante passa.
 */
const Trilha = {
  /** A lista ordenada: a ordem dos passos é a informação, não um detalhe. */
  Lista({ className, children, ...resto }: React.OlHTMLAttributes<HTMLOListElement>) {
    return (
      <ol className={className} {...resto}>
        {children}
      </ol>
    );
  },

  /** Um passo, com o conector que o liga ao anterior -- menos no primeiro. */
  Passo({
    indice,
    className,
    conector,
    children,
  }: {
    indice: number;
    className: string;
    /** As classes do traço; decorativo, porque a ordem já está na lista. */
    conector: string;
    children: React.ReactNode;
  }) {
    return (
      <li className={className}>
        {indice > 0 && (
          <span
            aria-hidden
            className={conector}
            style={{ background: "var(--borda-forte)" }}
          />
        )}
        {children}
      </li>
    );
  },

  /**
   * O botão de um passo. Só se clica no que já foi alcançado e não é o atual;
   * o resto fica desabilitado, e não escondido, para a trilha inteira continuar
   * dizendo quantos passos há.
   */
  Botao({
    ativo,
    clicavel,
    onIr,
    className,
    children,
    ...dados
  }: {
    ativo: boolean;
    clicavel: boolean;
    onIr: () => void;
    className: string;
    children: React.ReactNode;
  } & { [atributo: `data-${string}`]: string }) {
    return (
      <button
        type="button"
        onClick={() => clicavel && onIr()}
        disabled={!clicavel}
        aria-current={ativo ? "step" : undefined}
        className={className}
        {...dados}
      >
        {children}
      </button>
    );
  },

  /** O visto num passo concluído; o número nos demais. */
  Marca({
    numero,
    concluido,
    ativo,
    realce,
  }: {
    numero: number;
    concluido: boolean;
    ativo: boolean;
    /** O fundo e a tinta do número no passo atual, que cada barra desenha. */
    realce: { background: string; color: string };
  }) {
    if (concluido) return <Check size={13} weight="bold" />;
    return (
      <span
        aria-hidden
        className="num inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px]"
        style={{
          background: ativo ? realce.background : "transparent",
          color: ativo ? realce.color : "inherit",
          border: ativo ? "none" : "1px solid currentColor",
        }}
      >
        {numero}
      </span>
    );
  },
};

/* --- as etapas da decisão ----------------------------------------------------- */

/* A etapa guarda a chave do rótulo, não o rótulo: a sequência é constante do
   módulo e não tem como saber em que idioma a tela está. */
const SEQUENCIA: { id: Etapa; chave: string }[] = [
  { id: "problema", chave: "estrutura.etapas.problema" },
  { id: "ordem", chave: "estrutura.etapas.ordem" },
  { id: "perguntas", chave: "estrutura.etapas.perguntas" },
  { id: "resultado", chave: "estrutura.etapas.resultado" },
];

export function Etapas({
  atual,
  alcancadas,
  respostasEmRisco,
  onIr,
}: {
  atual: Etapa;
  /** Etapas que já foram concluídas e podem ser revisitadas. */
  alcancadas: Etapa[];
  /** Quantas respostas seriam descartadas ao reordenar os critérios. */
  respostasEmRisco: number;
  onIr: (etapa: Etapa) => void;
}) {
  const { t } = useIdioma();
  const [confirmando, setConfirmando] = useState<Etapa | null>(null);
  const indiceAtual = SEQUENCIA.findIndex((e) => e.id === atual);

  const tentar = (etapa: Etapa) => {
    // reordenar invalida as respostas: avisa antes, não depois
    if (etapa === "ordem" && respostasEmRisco > 0) {
      setConfirmando(etapa);
      return;
    }
    onIr(etapa);
  };

  return (
    <div>
      <nav
        aria-label={t("estrutura.etapas.rotulo")}
        className="rounded-[var(--raio-painel)] border border-[var(--borda)] bg-[var(--painel-fundo)] p-2"
      >
        <Trilha.Lista className="grid grid-cols-4 items-start gap-1 sm:flex sm:flex-nowrap sm:items-center">
          {SEQUENCIA.map((etapa, i) => {
            const alcancada = alcancadas.includes(etapa.id);
            const ativa = etapa.id === atual;
            const concluida = alcancada && i < indiceAtual;

            return (
              <Trilha.Passo
                key={etapa.id}
                indice={i}
                className="flex min-w-0 items-center"
                conector="mx-1 hidden h-px flex-1 sm:block"
              >
                <Trilha.Botao
                  ativo={ativa}
                  clicavel={alcancada && !ativa}
                  onIr={() => tentar(etapa.id)}
                  className="passo-etapa tatil flex min-h-10 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--raio-controle)] px-1 py-1.5 text-[11px] disabled:cursor-default sm:w-auto sm:flex-row sm:gap-2 sm:px-3.5 sm:text-[13px]"
                  data-etapa={
                    ativa
                      ? "atual"
                      : concluida
                        ? "concluida"
                        : alcancada
                          ? "alcancada"
                          : "adiante"
                  }
                >
                  <Trilha.Marca
                    numero={i + 1}
                    concluido={concluida}
                    ativo={ativa}
                    realce={{ background: "rgba(255,255,255,.18)", color: "inherit" }}
                  />
                  {t(etapa.chave)}
                </Trilha.Botao>
              </Trilha.Passo>
            );
          })}
        </Trilha.Lista>
      </nav>

      {confirmando && (
        <div
          role="alertdialog"
          aria-label={t("estrutura.etapas.confirmar")}
          className="mt-3 rounded-[var(--raio-painel)] border p-4"
          style={{ borderColor: "var(--borda-forte)", background: "var(--painel)" }}
        >
          <p className="flex items-start gap-2 text-sm" style={{ color: "var(--tinta)" }}>
            <Warning
              size={16}
              weight="fill"
              style={{ color: "var(--erro)" }}
              className="mt-0.5 shrink-0"
            />
            <span>
              {comNos(t("estrutura.etapas.descarte"), {
                respostas: (
                  <strong>
                    {t(
                      respostasEmRisco === 1
                        ? "estrutura.etapas.descarte.umaResposta"
                        : "estrutura.etapas.descarte.respostas",
                      { n: respostasEmRisco },
                    )}
                  </strong>
                ),
              })}
            </span>
          </p>
          {/* Cancelar primeiro, e com o foco: um Enter distraído não pode
              descartar respostas. Esc também cancela. */}
          <div
            className="mt-3 flex gap-2"
            onKeyDown={(e) => {
              if (e.key === "Escape") setConfirmando(null);
            }}
          >
            <button
              type="button"
              autoFocus
              onClick={() => setConfirmando(null)}
              className="tatil rounded-[var(--raio-controle)] border px-3 py-1.5 text-[13px]"
              style={{ borderColor: "var(--borda-forte)", color: "var(--tinta)" }}
            >
              {t("acao.cancelar")}
            </button>
            <button
              type="button"
              onClick={() => {
                const destino = confirmando;
                setConfirmando(null);
                onIr(destino);
              }}
              className="tatil rounded-[var(--raio-controle)] px-3 py-1.5 text-[13px] font-medium"
              style={{ background: "var(--erro)", color: "var(--erro-tinta)" }}
            >
              {t("estrutura.etapas.descartar")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- progresso de um cadastro ------------------------------------------------- */

export interface Passo {
  id: string;
  rotulo: string;
}

/**
 * A trilha de um cadastro em andamento.
 *
 * Mesma ideia da barra acima, sem o vínculo com as etapas da decisão: o
 * cadastro tem passos diferentes conforme a forma de entrada — digitar tem
 * estrutura e desempenhos, importar tem a planilha — e a trilha precisa dizer
 * quantos faltam, senão cada tela parece a última.
 *
 * Só dá para voltar. Pular para frente significaria aceitar um passo que ainda
 * não foi validado, e o seguinte dependeria de dados que não existem.
 *
 * Abaixo de `sm` a trilha some. Não por caber mal: ela quebrava em duas linhas
 * e a segunda começava com um conector pendurado, sem nada à esquerda. No lugar
 * dela vai o que a trilha existia para dizer -- em que passo se está e quantos
 * faltam -- numa linha de texto e numa barra segmentada.
 */
export function Passos({
  passos,
  atual,
  onIr,
  rotulo,
}: {
  passos: Passo[];
  atual: string;
  onIr?: (id: string) => void;
  rotulo?: string;
}) {
  const { t } = useIdioma();
  const indiceAtual = passos.findIndex((p) => p.id === atual);
  const posicao = indiceAtual < 0 ? 0 : indiceAtual;

  return (
    <nav aria-label={rotulo ?? t("estrutura.passos.rotulo")}>
      <div className="sm:hidden">
        <p className="text-[13px]" style={{ color: "var(--tinta-2)" }}>
          {comNos(t("estrutura.passos.contador"), {
            n: <span className="num">{posicao + 1}</span>,
            total: <span className="num">{passos.length}</span>,
          })}
          {" · "}
          <strong style={{ color: "var(--tinta)" }}>{passos[posicao]?.rotulo}</strong>
        </p>
        <Trilha.Lista className="mt-2 flex gap-1" aria-hidden>
          {passos.map((passo, i) => (
            <li
              key={passo.id}
              className="h-[3px] flex-1 rounded-[2px]"
              style={{
                background: i <= posicao ? "var(--accent)" : "var(--dado-trilho)",
              }}
            />
          ))}
        </Trilha.Lista>
      </div>

      <Trilha.Lista className="hidden flex-wrap items-center gap-1 sm:flex">
        {passos.map((passo, i) => {
          const ativo = i === indiceAtual;
          const concluido = i < indiceAtual;

          return (
            <Trilha.Passo
              key={passo.id}
              indice={i}
              className="flex items-center"
              conector="mx-1 h-px w-5"
            >
              <Trilha.Botao
                ativo={ativo}
                clicavel={concluido && !!onIr}
                onIr={() => onIr?.(passo.id)}
                className="passo-trilha tatil flex items-center gap-1.5 rounded-[var(--raio-controle)] px-2.5 py-1.5 text-[13px] disabled:cursor-default"
                data-passo={ativo ? "atual" : concluido ? "concluido" : "adiante"}
              >
                <Trilha.Marca
                  numero={i + 1}
                  concluido={concluido}
                  ativo={ativo}
                  realce={{ background: "var(--accent)", color: "var(--accent-tinta)" }}
                />
                {passo.rotulo}
              </Trilha.Botao>
            </Trilha.Passo>
          );
        })}
      </Trilha.Lista>
    </nav>
  );
}

/* --- o rodapé de um passo ----------------------------------------------------- */

/** Botão de voltar para a etapa anterior, sem sair do fluxo. */
export function Voltar({ rotulo, onClick }: { rotulo: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tatil flex items-center gap-1.5 text-[13px]"
      style={{ color: "var(--tinta-3)" }}
    >
      <ArrowLeft size={14} weight="bold" />
      {rotulo}
    </button>
  );
}

/**
 * O rodapé de um passo: sair pela esquerda, avançar pela direita.
 *
 * Fica no mesmo lugar em todas as telas do cadastro. Um "Continuar" que muda
 * de posição a cada passo obriga a procurá-lo de novo toda vez.
 *
 * Os dois lados são peças, e cada um é opcional: `Rodape.Voltar` à esquerda,
 * `Rodape.Acoes` à direita. Antes a saída vinha por props e as ações por um
 * `children` obrigatório, e quem só queria a saída tinha de passar um
 * `<span />` vazio para satisfazer o tipo.
 */
function RodapeRaiz({ children }: { children: React.ReactNode }) {
  return (
    <div className="barra-acoes mt-8 flex flex-wrap-reverse items-center justify-between gap-4 rounded-[var(--raio-controle)] px-4 py-4">
      {children}
    </div>
  );
}

/* `ml-auto` em vez de um espaçador vazio: sem a saída à esquerda, as ações
   continuam à direita, onde o olho já as procura. */
function RodapeAcoes({ children }: { children: React.ReactNode }) {
  return <div className="ml-auto flex flex-wrap items-center gap-4">{children}</div>;
}

export const Rodape = Object.assign(RodapeRaiz, {
  Voltar,
  Acoes: RodapeAcoes,
});
