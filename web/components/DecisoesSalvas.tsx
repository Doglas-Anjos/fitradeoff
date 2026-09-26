"use client";

/**
 * As decisões que o servidor guarda — a porta que faltava.
 *
 * O sistema de referência oferece três caminhos depois de escolher o módulo:
 * importar planilha, cadastrar problema novo e *continuar um já registrado*.
 * Nós tínhamos os dois primeiros. O terceiro existia no motor — as decisões
 * ficam gravadas e a API as lista — mas não tinha por onde entrar: a tela só
 * sabia das decisões que este navegador havia aberto, guardadas localmente.
 *
 * Quem trocasse de máquina, limpasse o navegador ou simplesmente voltasse
 * depois não via nada, embora o trabalho estivesse lá.
 *
 * Os rótulos por problemática e o resumo de uma linha moram em
 * `lib/resumoDecisao`, compartilhados com `PainelSalvas`.
 */

import { ArrowRight, MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";

import { Entrada } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/paineis";
import { PROBLEMATICA, resumir } from "@/lib/resumoDecisao";
import type { Problema, Resumo } from "@/lib/types";

export function DecisoesSalvas({
  onAbrir,
  ocupado,
}: {
  onAbrir: (problema: Problema) => void;
  ocupado: boolean;
}) {
  const { t } = useIdioma();
  const [itens, setItens] = useState<Resumo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [abrindo, setAbrindo] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    api
      .listar()
      .then((r) => vivo && setItens(r.decisoes))
      .catch((e) => {
        if (!vivo) return;
        setItens([]);
        setErro(
          e instanceof ApiError ? e.message : t("paineis.erro.servidor"),
        );
      });
    return () => {
      vivo = false;
    };
  }, []);

  const filtradas = useMemo(() => {
    if (!itens) return null;
    const termo = busca.trim().toLowerCase();
    if (!termo) return itens;
    return itens.filter((r) => r.nome.toLowerCase().includes(termo));
  }, [itens, busca]);

  const abrir = async (id: string) => {
    setAbrindo(id);
    setErro(null);
    try {
      onAbrir(await api.ver(id));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : t("paineis.erro.abrir"));
    } finally {
      setAbrindo(null);
    }
  };

  if (itens === null) {
    return (
      <p className="mt-6 text-[13px]" style={{ color: "var(--tinta-3)" }}>
        {t("paineis.salvas.carregando")}
      </p>
    );
  }

  if (itens.length === 0) {
    return (
      <div className="mt-6">
        <p className="text-[13px]" style={{ color: "var(--tinta-2)" }}>
          {t("paineis.salvas.vazio")}
        </p>
        <p className="mt-1 text-[12px]" style={{ color: "var(--tinta-3)" }}>
          {t("paineis.lista.vazio.ajuda")}
        </p>
        {erro && (
          <p className="mt-2 text-[12px]" style={{ color: "var(--erro)" }}>
            {erro}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* a busca só aparece quando a lista é grande o bastante para atrapalhar */}
      {itens.length > 6 && (
        <div className="relative mb-3">
          <MagnifyingGlass
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--tinta-fraca)" }}
            aria-hidden
          />
          <Entrada
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("paineis.lista.buscar.dica", { n: itens.length })}
            aria-label={t("paineis.salvas.buscar.rotulo")}
            className="!pl-9 !text-[13px]"
          />
        </div>
      )}

      {filtradas && filtradas.length === 0 ? (
        <p className="text-[13px]" style={{ color: "var(--tinta-3)" }}>
          {t("paineis.salvas.semNome")}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtradas!.map((r) => {
            const { chaveLonga, Icone } =
              PROBLEMATICA[r.problematica] ?? PROBLEMATICA.escolha;
            const estaAbrindo = abrindo === r.id;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => abrir(r.id)}
                  disabled={ocupado || abrindo !== null}
                  className="tatil group flex w-full items-center gap-3 rounded-[var(--raio-painel)] border p-3.5 text-left disabled:opacity-50"
                  style={{
                    borderColor: "var(--borda)",
                    background: "var(--painel)",
                  }}
                >
                  <Icone
                    size={18}
                    style={{ color: "var(--tinta-fraca)" }}
                    className="shrink-0"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-sm font-medium"
                      style={{ color: "var(--tinta)" }}
                    >
                      {r.nome}
                    </span>
                    <span
                      className="block text-[12px]"
                      style={{ color: "var(--tinta-3)" }}
                    >
                      {t(chaveLonga)} · {resumir(r, t)}
                    </span>
                  </span>
                  <span
                    className="shrink-0 text-[12px]"
                    style={{ color: "var(--tinta-fraca)" }}
                  >
                    {estaAbrindo ? (
                      t("paineis.salvas.abrindo")
                    ) : (
                      <ArrowRight
                        size={14}
                        weight="bold"
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden
                      />
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {erro && (
        <p className="mt-3 text-[12px]" style={{ color: "var(--erro)" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
