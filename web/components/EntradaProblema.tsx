"use client";

/**
 * A sequencia de cadastro de uma decisao nova.
 *
 * O sistema de referencia nao tem uma tela de entrada: tem um caminho. Escolhe-
 * se a problematica; escolhe-se entre cadastrar, importar ou continuar algo
 * salvo; cadastra-se a estrutura do problema; e so entao se preenchem os
 * numeros. Aqui isso vinha comprimido numa tela unica em que a matriz criava
 * criterios, alternativas e desempenhos ao mesmo tempo.
 *
 * A compressao nao era so estetica. Ela obrigava a decidir o modelo -- quais
 * criterios, em que escala -- enquanto se digitava valores, e nao havia lugar
 * onde um criterio existisse antes de ter uma coluna. E por isso que escala
 * construida, nivel discreto e valor inteiro nunca couberam: eles sao
 * propriedades do criterio, e o criterio nao tinha tela propria.
 *
 * Este componente e o orquestrador, e so isso: o estado e as regras de cada
 * passo moram em `entrada/ProvedorEntrada`, e cada passo e um componente
 * separado que le de la o que precisa.
 */

import { CadastroEstrutural } from "@/components/CadastroEstrutural";
import { Passos, Voltar } from "@/components/Etapas";
import { MatrizConsequencias } from "@/components/MatrizConsequencias";
import { CabecalhoPasso } from "@/components/entrada/CabecalhoPasso";
import { CatalogoExemplos } from "@/components/entrada/CatalogoExemplos";
import { useRascunho } from "@/components/entrada/contextoRascunho";
import { EscolhaInicial } from "@/components/entrada/EscolhaInicial";
import { PassoAjustes } from "@/components/entrada/PassoAjustes";
import { PassoPlanilha } from "@/components/entrada/PassoPlanilha";
import { ProvedorEntrada, useFluxo } from "@/components/entrada/ProvedorEntrada";
import { acaoDaMatriz } from "@/components/entrada/trilha";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/entrada";
import type { Passo } from "@/lib/rascunho";
import type { Problema } from "@/lib/types";

export function EntradaProblema({
  onPronto,
}: {
  onPronto: (problema: Problema) => void;
}) {
  return (
    <ProvedorEntrada onPronto={onPronto}>
      <Sequencia />
    </ProvedorEntrada>
  );
}

function Sequencia() {
  const { t } = useIdioma();
  const {
    estado: rascunho,
    acoes: { irPara },
  } = useRascunho();
  const {
    estado: { passo, trilha, anterior, cadastroEmBranco },
    acoes: { continuarDaEscolha, salvarEstrutura, aplicarExemplo, continuarDaMatriz },
  } = useFluxo();

  return (
    <div className="space-y-8">
      <Passos
        passos={trilha}
        atual={passo}
        onIr={(id) => irPara(id as Passo)}
        rotulo={t("entrada.trilha.rotulo")}
      />

      {/* Um voltar só, no alto da tela.
          Havia três saídas para o mesmo lugar -- um link acima do nome do
          problema, um botão "trocar objetivo" ao lado do selo e outro no rodapé
          -- e três caminhos para o mesmo destino não dão três vezes mais
          controle: dão a dúvida de se fazem coisas diferentes. Aqui em cima
          porque é onde se procura a saída, e antes do título porque quem
          desistiu do passo não deveria ter de ler o passo inteiro para sair. */}
      {anterior && (
        /* Sem margem negativa: puxar o link para perto do título fazia ele
           cair dentro da caixa da linha do h1, e os dois se sobrepunham. O
           ritmo da coluna já separa os dois na medida certa. */
        <div>
          <Voltar rotulo={t(anterior.chave)} onClick={anterior.ir} />
        </div>
      )}

      <CabecalhoPasso passo={passo} rascunho={rascunho} />

      {passo === "problematica" && <EscolhaInicial onContinuar={continuarDaEscolha} />}

      {passo === "estrutura" && (
        <div className="space-y-6">
          <CatalogoExemplos
            precisaConfirmar={!cadastroEmBranco}
            onAplicar={aplicarExemplo}
          />
          <CadastroEstrutural onSalvar={salvarEstrutura} />
        </div>
      )}

      {passo === "matriz" && (
        <MatrizConsequencias
          onContinuar={continuarDaMatriz}
          rotuloAcao={acaoDaMatriz(rascunho.problematica, t)}
        />
      )}

      {passo === "fonte" && rascunho.modo === "planilha" && (
        <div>
          <PassoPlanilha />
        </div>
      )}

      {passo === "ajustes" && <PassoAjustes />}
    </div>
  );
}
