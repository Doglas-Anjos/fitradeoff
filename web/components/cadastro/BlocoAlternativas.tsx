"use client";

import { Check, Plus, X } from "@phosphor-icons/react";
import { useState } from "react";

import { avisar } from "@/components/Avisos";
import {
  BlocoLista,
  aposExcluir,
  reposicionar,
  useFocoAoFecharEdicao,
} from "@/components/cadastro/BlocoLista";
import { useRascunho } from "@/components/entrada/contextoRascunho";
import { ListaArrastavel } from "@/components/ListaArrastavel";
import { Botao, Dica, Entrada } from "@/components/ui";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/estrutura";
import "@/lib/i18n/nucleo";
import {
  adicionarAlternativa,
  removerAlternativa,
  renomearAlternativa,
  restaurarAlternativa,
} from "@/lib/rascunho";

/** As alternativas: só nomes, numa lista que se reordena e se corrige. */
export function BlocoAlternativas() {
  const { t } = useIdioma();
  const {
    estado: rascunho,
    acoes: { atualizar },
  } = useRascunho();
  const [novo, setNovo] = useState("");
  const [editando, setEditando] = useState<number | null>(null);
  const [texto, setTexto] = useState("");

  const jaExiste = (nome: string, exceto?: number) =>
    rascunho.linhas.some(
      (l, i) => i !== exceto && l.nome.trim().toLowerCase() === nome.toLowerCase(),
    );

  const adicionar = () => {
    const nome = novo.trim();
    if (!nome) return avisar.erro(t("estrutura.alternativa.erro.semNome"));
    if (jaExiste(nome))
      return avisar.erro(t("estrutura.alternativa.erro.repetida", { nome }));
    setNovo("");
    atualizar((r) => adicionarAlternativa(r, nome));
  };

  const salvarEdicao = () => {
    if (editando === null) return;
    const nome = texto.trim();
    if (!nome) return avisar.erro(t("estrutura.alternativa.erro.nomeVazio"));
    if (jaExiste(nome, editando))
      return avisar.erro(t("estrutura.alternativa.erro.repetida", { nome }));
    const i = editando;
    atualizar((r) => renomearAlternativa(r, i, nome));
    setEditando(null);
  };

  const secao = useFocoAoFecharEdicao(editando);

  const excluir = (i: number) => {
    const linha = rascunho.linhas[i];
    setEditando(aposExcluir(editando, i));
    atualizar((r) => removerAlternativa(r, i));
    /* A linha leva junto os desempenhos da matriz: um clique errado apagava
       uma linha inteira preenchida, sem volta. O desfazer chega segundos
       depois, e grava sobre o rascunho de então -- não o desta exclusão --
       para não apagar o que foi digitado nesse meio-tempo. */
    avisar.desfazivel(
      t("estrutura.alternativa.excluida", { nome: linha.nome }),
      () => atualizar((r) => restaurarAlternativa(r, i, linha)),
      t("acao.desfazer"),
    );
  };

  /* A ordem das alternativas e a ordem das linhas da matriz de desempenhos:
     mover um cartao aqui tem de mover a linha inteira, senao os numeros do
     passo seguinte passariam a pertencer a outra alternativa. */
  const reordenar = (ordem: string[]) => {
    const indices = ordem.map(Number);
    setEditando(reposicionar(indices, editando));
    atualizar((r) => ({ ...r, linhas: indices.map((i) => r.linhas[i]) }));
  };

  return (
    <BlocoLista.Raiz
      ref={secao}
      id="bloco-alternativas"
      titulo={t("estrutura.alternativas.titulo")}
    >
      <BlocoLista.Cabecalho
        titulo={t("estrutura.alternativas.titulo")}
        quantos={rascunho.linhas.length}
        contagem={{
          faltamDois: "estrutura.alternativas.faltamDuas",
          faltaUm: "estrutura.alternativas.faltaUma",
          total: "estrutura.alternativas.contagem",
        }}
        dica={
          <Dica titulo={t("estrutura.alternativas.dica.titulo")}>
            <p>{t("estrutura.alternativas.dica.corpo1")}</p>
            <p>{t("estrutura.alternativas.dica.corpo2")}</p>
          </Dica>
        }
      />

      {/* Superfície rebaixada: é onde se digita, não mais um item da lista.
          Antes este bloco não tinha moldura nenhuma e encostava direto nos
          cartões brancos de baixo. */}
      <div className="area-entrada mb-3 p-3">
        <p className="rotulo-area mb-2">{t("estrutura.alternativas.regiao")}</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-32 flex-1">
            <Entrada
              value={novo}
              data-campo="nova-alternativa"
              onChange={(e) => setNovo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  adicionar();
                }
              }}
              placeholder={t("estrutura.alternativa.exemplo", {
                n: rascunho.linhas.length + 1,
              })}
              aria-label={t("estrutura.alternativa.nova")}
              className="!text-[13px]"
            />
          </div>
          <Botao
            variante="contorno"
            onClick={adicionar}
            icone={<Plus size={13} weight="bold" />}
          >
            {t("acao.adicionar")}
          </Botao>
        </div>
      </div>

      {rascunho.linhas.length === 0 ? (
        <BlocoLista.Vazio>{t("estrutura.alternativas.vazio")}</BlocoLista.Vazio>
      ) : (
        <ListaArrastavel
          onReordenar={reordenar}
          itens={rascunho.linhas.map((linha, i) => ({
            id: String(i),
            titulo: linha.nome,
            arrastavel: editando !== i,
            corpo:
              editando === i ? (
                <Entrada
                  value={texto}
                  autoFocus
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      salvarEdicao();
                    }
                    if (e.key === "Escape") setEditando(null);
                  }}
                  aria-label={t("estrutura.alternativa.novoNome", {
                    nome: linha.nome,
                  })}
                  className="!py-1 !text-[13px]"
                />
              ) : undefined,
          }))}
          acoes={(id) => {
            const i = Number(id);
            const linha = rascunho.linhas[i];
            if (editando !== i) {
              return (
                <BlocoLista.Acoes
                  nome={linha.nome}
                  onEditar={() => {
                    setEditando(i);
                    setTexto(linha.nome);
                  }}
                  onExcluir={() => excluir(i)}
                />
              );
            }
            /* Confirmar e desistir ficam sempre visiveis: sao a saida de um
               estado do qual nao da para sair de outro jeito. */
            return (
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={salvarEdicao}
                  aria-label={t("estrutura.alternativa.salvarNome")}
                  className="tatil rounded-[var(--raio-controle)] p-1.5"
                  style={{ color: "var(--accent)" }}
                >
                  <Check size={14} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditando(null)}
                  aria-label={t("estrutura.item.cancelarEdicao")}
                  className="tatil rounded-[var(--raio-controle)] p-1.5"
                  style={{ color: "var(--tinta-2)" }}
                >
                  <X size={14} weight="bold" />
                </button>
              </span>
            );
          }}
        />
      )}
    </BlocoLista.Raiz>
  );
}
