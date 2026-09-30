"use client";

/**
 * As peças comuns aos dois blocos do cadastro -- alternativas e critérios.
 *
 * Cada bloco é uma lista com adicionar, editar e excluir, porque é assim que se
 * trata um cadastro: o item já registrado tem de poder ser corrigido sem
 * refazer o resto. Os dois repetiam a mesma moldura -- a região nomeada, o
 * cabeçalho com a contagem, o vazio, as ações de cada item -- e a mesma conta
 * do item em edição depois de reordenar ou excluir.
 */

import { PencilSimple, Trash } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";

import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/estrutura";

/**
 * A região do bloco, nomeada para leitores de tela pelo título do bloco.
 *
 * O nome vem de um texto só para eles, e não do `h3` do cabeçalho, porque o
 * cabeçalho carrega junto a contagem e a dica.
 */
function Raiz({
  id,
  titulo,
  ref,
  children,
}: {
  id: string;
  titulo: string;
  ref?: React.Ref<HTMLElement>;
  children: React.ReactNode;
}) {
  return (
    <section ref={ref} aria-labelledby={id}>
      <span id={id} className="sr-only">
        {titulo}
      </span>
      {children}
    </section>
  );
}

function Cabecalho({
  titulo,
  quantos,
  contagem,
  dica,
}: {
  titulo: string;
  quantos: number;
  /**
   * As três formas da contagem: faltando dois, faltando um, e o total. Cada
   * uma é uma chave sua, porque a regra de plural não é a mesma em todo
   * idioma e montar a frase por pedaços só funciona em português.
   */
  contagem: { faltamDois: string; faltaUm: string; total: string };
  dica?: React.ReactNode;
}) {
  const { t } = useIdioma();

  /* "Faltam 2 alternativas" diz o proximo passo; "0 alternativas - minimo 2"
     cobrava um requisito e deixava a conta para quem le. */
  const quantidade =
    quantos === 0
      ? t(contagem.faltamDois)
      : quantos === 1
        ? t(contagem.faltaUm)
        : t(contagem.total, { n: quantos });

  return (
    <div
      className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b pb-2"
      style={{ borderColor: "var(--borda)" }}
    >
      <h3 className="text-[14px] font-semibold" style={{ color: "var(--tinta)" }}>
        {titulo}
      </h3>
      {dica}
      <span
        className="text-[12px]"
        style={{ color: quantos >= 2 ? "var(--tinta-3)" : "var(--tinta-fraca)" }}
      >
        {quantidade}
      </span>
    </div>
  );
}

/**
 * O vazio diz o que preencher, nao como operar o formulario que esta logo
 * acima. Quem nunca usou o metodo nao trava no botao: trava em "o que conta
 * como criterio aqui".
 */
function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <p className="prosa px-0.5 py-1 text-[12.5px]" style={{ color: "var(--tinta-3)" }}>
      {children}
    </p>
  );
}

/**
 * Editar e excluir, discretos ate o cartao receber o ponteiro ou o foco.
 *
 * Nao somem de todo: num toque nao existe hover, e uma acao invisivel ali
 * seria uma acao inexistente. Ficam a 70% de opacidade e sobem para 100% no
 * hover do cartao ou quando o foco de teclado entra neles -- quem navega por
 * Tab enxerga exatamente o que quem usa mouse enxerga.
 */
function Acoes({
  nome,
  onEditar,
  onExcluir,
}: {
  nome: string;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  const { t } = useIdioma();

  return (
    <span className="flex shrink-0 items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
      <button
        type="button"
        onClick={onEditar}
        data-acao="editar"
        aria-label={t("estrutura.item.editar", { nome })}
        className="tatil rounded-[var(--raio-controle)] p-1.5"
        style={{ color: "var(--tinta-2)" }}
      >
        <PencilSimple size={14} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onExcluir}
        aria-label={t("estrutura.item.excluir", { nome })}
        className="tatil rounded-[var(--raio-controle)] p-1.5"
        style={{ color: "var(--tinta-2)" }}
      >
        <Trash size={14} aria-hidden />
      </button>
    </span>
  );
}

export const BlocoLista = { Raiz, Cabecalho, Vazio, Acoes };

/**
 * A nova posicao de um indice antigo depois de reordenar, ou `null` se ele
 * saiu da lista. Serve para o item que estava em edicao continuar em edicao.
 */
export function reposicionar(indices: number[], antigo: number | null): number | null {
  if (antigo === null) return null;
  const novo = indices.indexOf(antigo);
  return novo < 0 ? null : novo;
}

/** O índice em edição depois de excluir `removido`: quem vinha depois sobe um. */
export function aposExcluir(editando: number | null, removido: number): number | null {
  if (editando === null || editando === removido) return null;
  return editando > removido ? editando - 1 : editando;
}

/** Devolve o foco ao lápis do item cuja edição acabou de fechar. Sem isso,
 *  o campo sumia com o foco dentro, e o teclado recomeçava do topo. */
export function useFocoAoFecharEdicao(editando: number | null) {
  const secao = useRef<HTMLElement>(null);
  const anterior = useRef<number | null>(null);
  useEffect(() => {
    const fechou = anterior.current;
    anterior.current = editando;
    if (editando !== null || fechou === null) return;
    const ativo = document.activeElement;
    if (ativo && ativo !== document.body && ativo.isConnected) return;
    secao.current
      ?.querySelectorAll("ol > li")
      [fechou]?.querySelector<HTMLButtonElement>('[data-acao="editar"]')
      ?.focus();
  }, [editando]);
  return secao;
}
