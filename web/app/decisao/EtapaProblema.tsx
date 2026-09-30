"use client";

import { AvaliacaoIntraCriterio } from "@/components/AvaliacaoIntraCriterio";
import { Voltar } from "@/components/Etapas";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/telas";

import { useDecisao } from "./contexto";
import { Secao } from "./Secao";
import { TabelaConsequencias } from "./TabelaConsequencias";

/* A etapa "Problema": os dados da decisão, só para consulta. */
export function EtapaProblema() {
  const { t } = useIdioma();
  const {
    state: { problema, estado, ocupado },
    actions: { setRevisando, salvarCurva },
  } = useDecisao();
  if (!problema) return null;

  return (
    <Secao
      titulo={t("tela.decisao.dados.titulo")}
      acessorio={
        <Voltar
          rotulo={t("tela.decisao.voltarAoQueFazia")}
          onClick={() => setRevisando(null)}
        />
      }
    >
      <TabelaConsequencias problema={problema} />
      {!estado?.elicitacao_iniciada && (
        <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--borda)" }}>
          {/* Aqui ela é consulta: o passo de verdade fica antes da
              ordenação, que é onde a decisão sobre a escala cabe. */}
          <AvaliacaoIntraCriterio
            criterios={problema.criterios}
            ocupado={ocupado}
            onSalvar={salvarCurva}
            abertaInicialmente={false}
          />
        </div>
      )}

      <p className="mt-4 text-[12px]" style={{ color: "var(--tinta-fraca)" }}>
        {t("tela.decisao.dados.imutaveis")}
      </p>
    </Secao>
  );
}
