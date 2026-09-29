"use client";

/** Quem esta logado, e o "Sair".
 *
 * O nome e o e-mail chegam do FasorX junto com o token (lib/identidade.ts); o
 * componente so os mostra. Sem FasorX configurado (instalacao local) nao ha
 * conta, e nada e desenhado.
 */

import { SignOut, UserCircle } from "@phosphor-icons/react";
import { useSyncExternalStore } from "react";

import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/nucleo";
import { assinar, pessoaAtual, sair } from "@/lib/identidade";

function usePessoa() {
  return useSyncExternalStore(assinar, pessoaAtual, () => null);
}

/** Na barra, em telas largas: primeiro nome e o botao de sair. */
export function ContaFasorx() {
  const { t } = useIdioma();
  const pessoa = usePessoa();
  if (!pessoa) return null;

  return (
    <div className="hidden items-center gap-1 sm:flex">
      <span
        className="flex max-w-[12rem] items-center gap-1.5 truncate px-2 text-[13px]"
        style={{ color: "var(--navy-tinta)" }}
        title={pessoa.email ? `${pessoa.nome} — ${pessoa.email}` : pessoa.nome}
      >
        <UserCircle size={17} weight="bold" aria-hidden />
        <span className="truncate">{pessoa.nome.split(" ")[0]}</span>
      </span>
      <button
        type="button"
        onClick={sair}
        title={t("conta.sair.titulo")}
        className="tatil inline-flex items-center gap-1.5 rounded-[var(--raio-controle)] px-2.5 py-1.5 text-[13px]"
        style={{ color: "var(--navy-tinta-2)" }}
      >
        <SignOut size={14} weight="bold" aria-hidden />
        <span>{t("conta.sair")}</span>
      </button>
    </div>
  );
}

/** No menu do celular: nome, e-mail e o sair. */
export function ContaFasorxMenu() {
  const { t } = useIdioma();
  const pessoa = usePessoa();
  if (!pessoa) return null;

  return (
    <>
      <p
        className="px-3 pb-1 pt-0.5 text-[11px] font-medium uppercase tracking-[0.12em]"
        style={{ color: "var(--tinta-fraca)" }}
      >
        {t("conta.rotulo")}
      </p>
      <div className="px-3 pb-1 text-sm">
        <p className="truncate font-semibold" style={{ color: "var(--tinta)" }}>{pessoa.nome}</p>
        {pessoa.email && (
          <p className="truncate text-xs" style={{ color: "var(--tinta-2)" }}>{pessoa.email}</p>
        )}
      </div>
      <button
        type="button"
        onClick={sair}
        className="tatil flex w-full items-center justify-between rounded-[var(--raio-controle)] px-3 py-2.5 text-sm"
        style={{ color: "var(--tinta-2)" }}
      >
        {t("conta.sair")}
        <SignOut size={15} weight="bold" aria-hidden />
      </button>
      <div className="my-2 border-t" style={{ borderColor: "var(--borda)" }} />
    </>
  );
}
