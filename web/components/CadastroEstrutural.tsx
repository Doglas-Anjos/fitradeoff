"use client";

/**
 * Cadastro do problema: nome, alternativas e criterios -- e so isso.
 *
 * E a tela que faltava. O sistema de referencia registra a *estrutura* do
 * problema antes de pedir qualquer numero: quem sao as alternativas, quais sao
 * os criterios, em que escala cada um e medido. Os desempenhos vem depois, numa
 * matriz cujas linhas e colunas ja estao decididas.
 *
 * A ordem nao e capricho de navegacao. Preencher a matriz enquanto se inventa
 * os criterios mistura duas perguntas diferentes -- "o que importa aqui?" e
 * "quanto cada opcao entrega?" -- e a primeira e a que define o modelo. Quando
 * as duas cabem na mesma tela, a estrutura acaba saindo do formato da tabela,
 * e nao do problema.
 *
 * Cada bloco e uma lista com adicionar, editar e excluir (ver
 * `cadastro/BlocoLista`). Os blocos e esta tela leem o rascunho do provedor
 * acima deles -- a sequencia de cadastro, ou `RascunhoEmMemoria` quando a tela
 * e montada sozinha.
 */

import {
  ArrowRight,
  ListNumbers,
  Scales,
  SlidersHorizontal,
  Stack,
  Trophy,
} from "@phosphor-icons/react";
import { useEffect } from "react";

import { BlocoAlternativas } from "@/components/cadastro/BlocoAlternativas";
import { BlocoCriterios } from "@/components/cadastro/BlocoCriterios";
import { useRascunho } from "@/components/entrada/contextoRascunho";
import { Rodape } from "@/components/Etapas";
import { Botao, Campo, Dica, Entrada } from "@/components/ui";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/estrutura";
import "@/lib/i18n/nucleo";
/* Pelo nome da tela de decisões salvas, citado na dica do nome do problema: a
   dica manda a pessoa para lá, e o nome tem de ser o mesmo que ela vai ler. */
import "@/lib/i18n/paineis";
import { rolagem } from "@/lib/movimento";
import type { Problematica } from "@/lib/types";

/* O rótulo vem do catálogo do núcleo, que é quem guarda os nomes das
   problemáticas nos termos da literatura. */
const ROTULO_PROBLEMATICA: Record<
  Problematica,
  { chave: string; Icone: typeof Trophy }
> = {
  escolha: { chave: "problematica.escolha", Icone: Trophy },
  ranking: { chave: "problematica.ranking", Icone: ListNumbers },
  sorting: { chave: "problematica.sorting", Icone: SlidersHorizontal },
  beneficio_custo: { chave: "problematica.beneficio_custo", Icone: Scales },
  portfolio: { chave: "problematica.portfolio", Icone: Stack },
};

/* --- a tela -------------------------------------------------------------------- */

export function CadastroEstrutural({ onSalvar }: { onSalvar: () => void }) {
  const { t } = useIdioma();
  const {
    estado: rascunho,
    acoes: { atualizar },
    meta: { campoComErro },
  } = useRascunho();
  const { chave, Icone } = ROTULO_PROBLEMATICA[rascunho.problematica];

  /* A validação sabe a que campo o erro se refere; sem isto a mensagem saía no
     fim de uma página longa, possivelmente fora da tela, e a pessoa tinha de
     procurar sozinha onde ela se aplica. Mesmo recurso da matriz. */
  useEffect(() => {
    if (!campoComErro) return;
    const alvo = document.querySelector<HTMLElement>(`[data-campo="${campoComErro}"]`);
    alvo?.scrollIntoView?.({ behavior: rolagem(), block: "center" });
    alvo?.focus({ preventScroll: true });
    /* Só `campoComErro`: o texto do erro saiu daqui e virou toast, então a
       dependência antiga não existe mais. */
  }, [campoComErro]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-64 flex-1">
          <Campo
            rotulo={t("estrutura.problema.nome")}
            ajuda={t("estrutura.problema.nome.ajuda")}
            dica={
              <Dica titulo={t("estrutura.problema.nome.dica.titulo")}>
                {/* O nome da tela para onde a dica manda vem do catálogo dos
                    painéis, que é quem batiza aquela tela. Repetir o nome aqui
                    deixaria a dica citando uma tela que não existe com esse
                    nome no outro idioma. */}
                <p>
                  {t("estrutura.problema.nome.dica.corpo", {
                    tela: t("paineis.salvas.titulo"),
                  })}
                </p>
              </Dica>
            }
          >
            {(props) => (
              <Entrada
                {...props}
                value={rascunho.nome}
                onChange={(e) => {
                  const nome = e.target.value;
                  atualizar((r) => ({ ...r, nome }));
                }}
                placeholder={t("estrutura.problema.nome.exemplo")}
              />
            )}
          </Campo>
        </div>

        {/* O objetivo escolhido fica visível o tempo todo: ele muda o que será
            perguntado no fim, e é fácil esquecer qual foi marcado.

            Vinha em cinza-claro, do tamanho de uma legenda, ao lado de um link
            sublinhado que se confundia com texto. Agora o nome do objetivo é a
            palavra mais forte do bloco, com o rótulo pequeno acima dizendo do
            que se trata, e trocar é um botão com contorno -- um alvo, não uma
            frase. */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="flex items-center gap-2.5 rounded-[var(--raio-controle)] border px-3 py-1.5"
            style={{ borderColor: "var(--borda-forte)", background: "var(--painel)" }}
          >
            <Icone size={18} weight="fill" style={{ color: "var(--accent)" }} />
            <span className="flex flex-col leading-tight">
              <span
                className="text-[10.5px] uppercase tracking-wide"
                style={{ color: "var(--tinta-3)" }}
              >
                {t("estrutura.objetivo.rotulo")}
              </span>
              <strong
                className="text-[13.5px] font-semibold"
                style={{ color: "var(--tinta)" }}
              >
                {t(chave)}
              </strong>
            </span>
          </span>
        </div>
      </div>

      {/* Digitar quatro nomes é trivial; definir um critério, com escala e
          direção, é a decisão que define o resultado. Colunas iguais diziam que
          o esforço era o mesmo. */}
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,19rem)_1fr]">
        <BlocoAlternativas />
        <BlocoCriterios />
      </div>

      <Rodape>
        <Rodape.Acoes>
          <Botao onClick={onSalvar} icone={<ArrowRight size={14} weight="bold" />}>
            {t("estrutura.continuar")}
          </Botao>
        </Rodape.Acoes>
      </Rodape>
    </div>
  );
}
