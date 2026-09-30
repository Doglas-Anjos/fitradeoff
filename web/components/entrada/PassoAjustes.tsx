"use client";

import { ConfiguracaoProblematica } from "@/components/ConfiguracaoProblematica";
import { Rodape } from "@/components/Etapas";
import { Botao } from "@/components/ui";
import { useRascunho } from "@/components/entrada/contextoRascunho";
import { useFluxo } from "@/components/entrada/ProvedorEntrada";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/entrada";

/**
 * O último passo, que só existe quando o objetivo pede: as faixas da
 * classificação ou o orçamento da carteira.
 */
export function PassoAjustes() {
  const { t } = useIdioma();
  const {
    estado: rascunho,
    acoes: { atualizar },
    meta: { ocupado },
  } = useRascunho();
  const {
    estado: { conferido, totalDosCustos, erro },
    acoes: { criarComAjustes },
  } = useFluxo();

  return (
    <div>
      <ConfiguracaoProblematica
        problematica={rascunho.problematica}
        sorting={rascunho.sorting}
        onSorting={(sorting) => atualizar((r) => ({ ...r, sorting }))}
        orcamento={rascunho.orcamento}
        onOrcamento={(orcamento) => atualizar((r) => ({ ...r, orcamento }))}
        porPlanilha={!!conferido}
        totalDosCustos={totalDosCustos}
      />

      {erro && (
        <p role="alert" className="mt-5 text-sm" style={{ color: "var(--erro)" }}>
          {erro}
        </p>
      )}

      <Rodape>
        <Rodape.Acoes>
          <Botao onClick={criarComAjustes} disabled={ocupado}>
            {t("entrada.acao.criar")}
          </Botao>
        </Rodape.Acoes>
      </Rodape>
    </div>
  );
}
