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
 * É esse mesmo motivo que manda a decisão favorita para o servidor: favorito é
 * preferência do decisor *sobre a decisão*, e acompanha a decisão. Guardá-lo no
 * armazenamento local reintroduziria exatamente o problema acima — o destaque
 * sumiria na troca de máquina ou na limpeza do navegador, embora a decisão
 * continuasse lá.
 *
 * Os rótulos por problemática, o resumo de uma linha e a regra de ordem das
 * favoritas moram em `lib/resumoDecisao`, compartilhados com `PainelSalvas`; a
 * estrela é `components/BotaoFavorita`.
 */

import { ArrowRight, MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";

import { BotaoFavorita } from "@/components/BotaoFavorita";
import { Entrada } from "@/components/ui";
import { api, mensagemDeErro } from "@/lib/api";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/paineis";
import { favoritasPrimeiro, PROBLEMATICA, resumir } from "@/lib/resumoDecisao";
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
          mensagemDeErro(e, t("paineis.erro.servidor")),
        );
      });
    return () => {
      vivo = false;
    };
  }, []);

  const filtradas = useMemo(() => {
    if (!itens) return null;
    const termo = busca.trim().toLowerCase();
    const visiveis = termo
      ? itens.filter((r) => r.nome.toLowerCase().includes(termo))
      : itens;
    /* Cópia antes de ordenar: `sort` ordena no lugar, e sem a cópia a lista do
       estado seria reordenada por baixo do React. Entre iguais o `sort` estável
       preserva a ordem que o servidor mandou, que é a única que esta tela tem. */
    return [...visiveis].sort(favoritasPrimeiro);
  }, [itens, busca]);

  const alternarFavorita = async (id: string, favorita: boolean) => {
    /* A estrela troca antes da resposta do servidor. Marcar é um gesto barato e
       repetido, e esperar o ida-e-volta para a estrela acender faria a lista
       parecer travada. Falhando o pedido, ela volta ao que era e o motivo
       aparece: o que não pode acontecer é a tela afirmar um favorito que o
       servidor não tem. */
    const marcar = (valor: boolean) =>
      setItens(
        (atual) =>
          atual?.map((r) => (r.id === id ? { ...r, favorita: valor } : r)) ?? null,
      );

    setErro(null);
    marcar(favorita);
    try {
      await api.favoritar(id, favorita);
    } catch (e) {
      marcar(!favorita);
      setErro(mensagemDeErro(e, t("paineis.erro.favoritar")));
    }
  };

  const abrir = async (id: string) => {
    setAbrindo(id);
    setErro(null);
    try {
      onAbrir(await api.ver(id));
    } catch (e) {
      setErro(mensagemDeErro(e, t("paineis.erro.abrir")));
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
              /* O cartão é o `li`, e não mais o botão de abrir: a estrela é um
                 segundo controle e não cabe dentro do primeiro -- botão dentro
                 de botão não é HTML válido, e todo clique nela viraria "abrir
                 a decisão". */
              <li
                key={r.id}
                className="flex items-center rounded-[var(--raio-painel)] border pr-2"
                style={{
                  borderColor: "var(--borda)",
                  background: "var(--painel)",
                }}
              >
                <button
                  type="button"
                  onClick={() => abrir(r.id)}
                  disabled={ocupado || abrindo !== null}
                  className="tatil group flex min-w-0 flex-1 items-center gap-3 rounded-[var(--raio-painel)] p-3.5 text-left disabled:opacity-50"
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
                {/* Fora do botão de abrir, e não desabilitada junto com ele:
                    marcar uma decisão não depende de poder abri-la agora. */}
                <BotaoFavorita
                  nome={r.nome}
                  favorita={r.favorita ?? false}
                  onAlternar={(valor) => alternarFavorita(r.id, valor)}
                  tamanho={16}
                />
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
