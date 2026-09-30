"use client";

import { AvaliacaoIntraCriterio } from "@/components/AvaliacaoIntraCriterio";
import { Voltar } from "@/components/Etapas";
import { OrdenacaoPesos } from "@/components/OrdenacaoPesos";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/telas";

import { useDecisao } from "./contexto";

/* A etapa "Ordem": a escala de cada critério e a ordem de importância. */
export function EtapaOrdem() {
  const { t } = useIdioma();
  const {
    state: { problema, estado, ocupado },
    actions: { setRevisando, salvarCurva, ordenar },
  } = useDecisao();
  if (!problema) return null;

  return (
    <div>
      {/* A avaliação intra-critério vem antes da ordem de importância, e
          é o último momento em que a escala ainda pode mudar: depois que
          a elicitação começa, as respostas já dadas se referem a ela.
          Estava só dentro da etapa "Problema", atrás de um clique que
          ninguém dava. */}
      {!estado?.elicitacao_iniciada && (
        <div
          className="mb-6 rounded-[var(--raio-painel)] border p-4"
          style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
        >
          <AvaliacaoIntraCriterio
            criterios={problema.criterios}
            ocupado={ocupado}
            onSalvar={salvarCurva}
          />
        </div>
      )}

      {estado?.elicitacao_iniciada && (
        <div className="mb-4">
          <Voltar
            rotulo={t("tela.decisao.voltarSemMudarOrdem")}
            onClick={() => setRevisando(null)}
          />
        </div>
      )}
      <OrdenacaoPesos
        key={problema.id}
        criterios={problema.criterios}
        ocupado={ocupado}
        onConfirmar={(nova) => {
          setRevisando(null);
          ordenar(nova);
        }}
      />
    </div>
  );
}
