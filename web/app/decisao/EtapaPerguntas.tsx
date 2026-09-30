"use client";

import { BonecoEmDuvida } from "@/components/Animacoes";
import { Inconsistencia } from "@/components/Inconsistencia";
import { TradeoffChart } from "@/components/TradeoffChart";
import { Dica } from "@/components/ui";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/telas";

import { useDecisao } from "./contexto";
import { Secao } from "./Secao";

/* A etapa "Perguntas": a pergunta de tradeoff da vez. */
export function EtapaPerguntas() {
  const { t } = useIdioma();
  const {
    state: { estado, pergunta, ocupado, encerrado },
    actions: { responder },
  } = useDecisao();
  if (!estado?.elicitacao_iniciada || encerrado) return null;

  return (
    <Secao
      titulo={t("tela.decisao.pergunta.numero", {
        n: Math.max((estado.declaracoes ?? 1) - 1, 0) + 1,
      })}
    >
      {/* Enquanto a resposta viaja, a pergunta fica com a escolha
          confirmada em vez de virar esqueleto: trocar por um esqueleto
          apagaria justamente a confirmação que a pausa existe para
          mostrar. A chave é a contagem de declarações, então cada
          pergunta nova chega com o estado limpo. */}
      {pergunta ? (
        <TradeoffChart
          key={estado.declaracoes}
          pergunta={pergunta}
          desabilitado={ocupado}
          onSelect={responder}
          /* A indiferença é uma resposta como as outras duas, então vai
             entre os dois cartões, onde o olho está — e só ali. O botão
             de texto que repetia essa resposta aqui embaixo saiu: duas
             formas de responder a mesma coisa na mesma tela fazem
             procurar a diferença entre elas. O que restou embaixo é o
             "não sei", que é outra coisa. */
          onIndiferente={() => responder("indiferente")}
          /* As saidas ficavam no canto do cabecalho da secao, acima e a
             direita da pergunta: eram as unicas acoes visiveis da tela,
             o que punha as escapatorias em mais destaque do que a
             resposta. Aqui embaixo elas sao o que sao. */
          rodape={
            <span className="flex items-center gap-1.5">
              <button
                onClick={() => responder("não sei")}
                disabled={ocupado || !pergunta}
                className="tatil flex items-center gap-1.5 text-sm disabled:opacity-40"
                style={{ color: "var(--tinta-fraca)" }}
                title={t("tela.decisao.naoSei.titulo")}
              >
                <BonecoEmDuvida tamanho={16} />
                {t("tela.decisao.naoSei")}
              </button>
              <Dica titulo={t("tela.decisao.naoSei.dica.titulo")}>
                <p>{t("tela.decisao.naoSei.dica.corpo1")}</p>
                <p>{t("tela.decisao.naoSei.dica.corpo2")}</p>
              </Dica>
            </span>
          }
        />
      ) : (
        <EsqueletoPergunta />
      )}
    </Secao>
  );
}

/* A contradição não é etapa: aparece em qualquer uma, assim que as respostas
   deixam de caber num mesmo vetor de pesos. */
export function SecaoConflito() {
  const { t } = useIdioma();
  const {
    state: { estado, diagnostico, ocupado },
    actions: { resolverConflito },
  } = useDecisao();
  if (!estado?.elicitacao_iniciada || estado.consistente || !diagnostico) return null;

  return (
    <Secao titulo={t("tela.decisao.conflito.titulo")}>
      <Inconsistencia
        diagnostico={diagnostico}
        ocupado={ocupado}
        onResolver={resolverConflito}
      />
    </Secao>
  );
}

function EsqueletoPergunta() {
  return (
    <div className="flex flex-col gap-4 md:flex-row">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex-1 rounded-[var(--raio-painel)] border p-5"
          style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
        >
          <div className="esqueleto mb-5 h-4 w-24" />
          {[0, 1, 2].map((j) => (
            <div key={j} className="mb-4">
              <div className="esqueleto mb-2 h-3 w-full" />
              <div className="esqueleto h-1.5 w-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
