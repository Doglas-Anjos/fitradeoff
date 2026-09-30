"use client";

import { ConferenciaImportacao } from "@/components/ConferenciaImportacao";
import { Rodape } from "@/components/Etapas";
import { ImportacaoPlanilha } from "@/components/ImportacaoPlanilha";
import { useRascunho } from "@/components/entrada/contextoRascunho";
import { useFluxo } from "@/components/entrada/ProvedorEntrada";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/entrada";

/**
 * A planilha: enviar ou colar, e depois conferir o que foi lido.
 *
 * Ler não é criar. A conferência troca a tela de envio pela tabela lida, e só
 * ela entrega os dados à sequência.
 */
export function PassoPlanilha() {
  const { t } = useIdioma();
  const {
    acoes: { irPara },
    meta: { ocupado },
  } = useRascunho();
  const {
    estado: { lida, arquivoLido, erro },
    acoes: { analisar, confirmarImportacao, cancelarConferencia },
  } = useFluxo();

  if (lida) {
    /* A conferencia troca a tela inteira de upload pela tabela lida:
       sem a entrada, a troca parece um recarregamento. */
    return (
      <div className="entra-subindo">
        <ConferenciaImportacao
          lida={lida}
          ocupado={ocupado}
          onConfirmar={confirmarImportacao}
          onCancelar={cancelarConferencia}
        />
      </div>
    );
  }

  return (
    <>
      <ImportacaoPlanilha
        ocupado={ocupado}
        arquivoLido={arquivoLido}
        erro={erro}
        onLer={analisar}
      />
      <Rodape>
        <Rodape.Voltar
          rotulo={t("entrada.acao.voltarObjetivo")}
          onClick={() => irPara("problematica")}
        />
      </Rodape>
    </>
  );
}
