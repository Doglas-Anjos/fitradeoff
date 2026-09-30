"use client";

/**
 * A pergunta de tradeoff, desenhada.
 *
 * Esta e a tela que decide a qualidade da elicitacao. O metodo confronta duas
 * consequencias hipoteticas, ambas propositalmente pessimas em quase tudo: sem
 * ver as duas por inteiro, o decisor responde a uma pergunta diferente da que o
 * modelo registra. Por isso os dois lados aparecem completos, com todos os
 * criterios.
 *
 * Tres decisoes de leitura, todas pelo mesmo motivo -- o que esta em jogo e a
 * diferenca entre as duas situacoes, e so ela:
 *
 * 1. As linhas sao alinhadas pelo criterio. O servidor manda cada lado com o
 *    seu criterio em destaque na frente, entao as duas listas saiam em ordens
 *    diferentes e nao dava para varrer com o olho de um lado ao outro.
 * 2. As linhas que diferem vem primeiro, nas duas; as identicas descem para um
 *    bloco marcado como identico. Nada e escondido, so ordenado.
 * 3. A pergunta aparece tambem em uma frase, com os dois ganhos nomeados. Antes
 *    era preciso comparar duas tabelas de quatro linhas para descobrir qual era
 *    a pergunta.
 *
 * A barra mede o valor intra-criterio (0 = pior possivel, 1 = melhor possivel);
 * o numero ao lado traz a consequencia na unidade real do problema.
 */

import { Check } from "@phosphor-icons/react";
import { useEffect, useId, useRef, type ReactNode } from "react";

import { CaboDeGuerra } from "@/components/Animacoes";
import { BotaoEntreCartoes, Dica, type EstadoResposta } from "@/components/ui";
import { useIdioma } from "@/lib/i18n";
import { comNos } from "@/lib/i18n/estrutura";
import "@/lib/i18n/telas";
import "@/lib/i18n/visualizacoes";
import type { Pergunta } from "@/lib/types";
import {
  recuperarFoco,
  useRespostaComConfirmacao,
} from "@/lib/useRespostaComConfirmacao";

export interface Linha {
  criterio: string;
  texto: string;
  destaque: boolean;
  fracao: number;
}

/** Quebra "Nome: 12.5 R$/un (o pior possivel)" nas partes que o grafico usa. */
export function parseLinha(linha: string, posicao: number): Linha {
  const separador = linha.indexOf(":");
  const criterio = linha.slice(0, separador).trim();
  const resto = linha.slice(separador + 1).trim();

  const pior = resto.includes("(o pior possivel)");
  const melhor = resto.includes("(o melhor possivel)");
  const texto = resto.replace(/\s*\((o (pior|melhor)) possivel\)/, "");

  return {
    criterio,
    texto,
    destaque: !pior,
    fracao: pior ? 0 : melhor ? 1 : posicao,
  };
}

export interface Par {
  criterio: string;
  a?: Linha;
  b?: Linha;
  /** As duas situacoes trazem o mesmo desempenho neste criterio. */
  identico: boolean;
}

/**
 * Cruza os dois lados por criterio e poe as diferencas na frente.
 *
 * A ordem resultante vale para as duas situacoes: e isso que permite ler na
 * horizontal. Um criterio presente so de um lado nao some -- entra com o outro
 * lado vazio, porque perder uma linha calada seria pior do que mostrar um
 * buraco.
 */
export function alinhar(a: Linha[], b: Linha[]): Par[] {
  const nomes = [
    ...a.map((l) => l.criterio),
    ...b.map((l) => l.criterio).filter((c) => !a.some((l) => l.criterio === c)),
  ];
  const pares = nomes.map((criterio) => {
    const la = a.find((l) => l.criterio === criterio);
    const lb = b.find((l) => l.criterio === criterio);
    return {
      criterio,
      a: la,
      b: lb,
      identico: !!la && !!lb && la.texto === lb.texto,
    };
  });
  return [...pares.filter((p) => !p.identico), ...pares.filter((p) => p.identico)];
}

function Celula({ linha, cor, realce }: { linha?: Linha; cor: string; realce: boolean }) {
  const { t } = useIdioma();
  if (!linha) return <span className="text-[13px]" style={{ color: "var(--tinta-fraca)" }}>—</span>;

  const tinta = realce ? "var(--tinta)" : "var(--tinta-3)";
  const extremo =
    linha.fracao === 0 ? "pior" : linha.fracao === 1 ? "melhor" : null;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-[13px]" style={{ color: tinta, fontWeight: realce ? 500 : 400 }}>
          {linha.criterio}
        </dt>
        <dd className="num text-[13px]" style={{ color: tinta, fontWeight: realce ? 500 : 400 }}>
          {linha.texto}
        </dd>
      </div>

      {/* Nas linhas identicas a barra seria o mesmo trilho vazio dos dois lados,
          entao ela some e sobra o texto. Nas que diferem a barra fica -- e o
          texto tambem, porque uma barra vazia sozinha le como dado faltante e
          nao como "este e o pior nivel possivel". */}
      {realce && (
        <div
          className="mt-1.5 h-1.5 w-full overflow-hidden rounded-[3px]"
          style={{ background: "var(--dado-trilho)" }}
        >
          <div
            className="h-full rounded-[3px] transition-[width] duration-300"
            style={{
              width: `${Math.max(linha.fracao * 100, linha.fracao > 0 ? 1.5 : 0)}%`,
              background: cor,
            }}
          />
        </div>
      )}
      {/* Nas linhas que diferem a nota reserva a sua altura mesmo vazia. Sem
          isso um lado com nota e outro sem desloca todas as linhas seguintes
          daquele cartao, e o alinhamento entre os dois -- a razao de existir do
          `alinhar` -- se perde no meio do caminho. */}
      {(realce || extremo) && (
        <p
          className="mt-0.5 min-h-[1.05rem] text-[11px]"
          style={{ color: "var(--tinta-fraca)" }}
        >
          {extremo === "pior"
            ? t("elicitacao.tradeoff.noPior")
            : extremo === "melhor"
              ? t("elicitacao.tradeoff.noMelhor")
              : ""}
        </p>
      )}
    </div>
  );
}

function Painel({
  rotulo,
  lado,
  pares,
  cor,
  desabilitado,
  estado,
  onSelect,
}: {
  rotulo: string;
  lado: "a" | "b";
  pares: Par[];
  cor: string;
  desabilitado: boolean;
  /** Depois do clique, um painel é o escolhido e o outro é o preterido. */
  estado: EstadoResposta;
  onSelect: () => void;
}) {
  const { t } = useIdioma();
  const diferentes = pares.filter((p) => !p.identico);
  const identicos = pares.filter((p) => p.identico);

  const escolhido = estado === "escolhido";

  return (
    <div
      /* O cartão deixou de ser botão e virou o que sempre foi: um conjunto de
         informação sobre uma situação. `group` com nome dá a ele identidade
         para quem navega por leitor de tela -- e para os testes -- sem
         prometer um clique que agora é só do botão lá embaixo. */
      role="group"
      aria-label={rotulo}
      data-estado={estado}
      data-ativo={!desabilitado}
      className="cartao-escolha group flex flex-1 flex-col rounded-[var(--raio-painel)] border p-5 text-left"
      style={{ "--cor-lado": cor } as React.CSSProperties}
    >
      <div className="mb-5 flex items-baseline gap-2.5">
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 rounded-[2px]"
          style={{ background: cor }}
        />
        <span className="text-[15px] font-medium" style={{ color: "var(--tinta)" }}>
          {rotulo}
        </span>
      </div>

      <dl className="space-y-3.5">
        {diferentes.map((par) => (
          <Celula key={par.criterio} linha={par[lado]} cor={cor} realce />
        ))}
      </dl>

      {identicos.length > 0 && (
        <>
          <div className="mt-5 mb-3 flex items-center gap-2">
            <span className="h-px flex-1" style={{ background: "var(--borda)" }} />
            <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--tinta-fraca)" }}>
              {t("elicitacao.tradeoff.igualNasDuas")}
            </span>
            <span className="h-px flex-1" style={{ background: "var(--borda)" }} />
          </div>
          <dl className="space-y-2">
            {identicos.map((par) => (
              <Celula key={par.criterio} linha={par[lado]} cor={cor} realce={false} />
            ))}
          </dl>
        </>
      )}

      {/* O único alvo de clique do cartão. O rótulo já nomeia a situação, então
          aqui não é preciso reforçar o nome acessível. */}
      <button
        type="button"
        onClick={onSelect}
        /* Na pausa de confirmação o botão continua focável (senão o foco caía
           no topo da página), mas já não aceita outro clique. */
        disabled={desabilitado}
        aria-disabled={estado !== "neutro" || undefined}
        data-escolhido={escolhido}
        className="botao-escolha tatil mt-6 flex items-center justify-center gap-1.5 rounded-[var(--raio-controle)] border px-3 py-2 text-center text-[13px] font-medium"
      >
        {escolhido && <Check size={14} weight="bold" />}
        {escolhido
          ? t("elicitacao.tradeoff.escolhida")
          : t("elicitacao.tradeoff.escolher", { situacao: rotulo })}
      </button>
    </div>
  );
}

/* Houve resposta nesta visita? A primeira pergunta aparece sem roubar o foco
   de ninguém; as seguintes o recebem quando o anterior se perdeu. Fica no
   módulo porque cada pergunta é uma montagem nova (`key` por declaração). */
let respondeuNestaVisita = false;

export function TradeoffChart({
  pergunta,
  desabilitado = false,
  onSelect,
  onIndiferente,
  rodape,
}: {
  pergunta: Pergunta;
  desabilitado?: boolean;
  onSelect: (escolha: "A" | "B") => void;
  /** A terceira resposta: as duas situações valem o mesmo. */
  onIndiferente?: () => void;
  /** Saidas que nao sao nem A nem B nem indiferença ("nao sei"). */
  rodape?: ReactNode;
}) {
  const { t } = useIdioma();
  /* A escolha fica visível antes de a tela trocar.
     Antes, clicar numa situação trocava a pergunta no mesmo quadro: a resposta
     era registrada e a pessoa não chegava a ver qual tinha dado -- o que, numa
     sequência de perguntas parecidas entre si, é o suficiente para perder a
     conta de onde se está. */
  const { escolhida, responder, pausado, estadoDe } = useRespostaComConfirmacao<
    "A" | "B" | "indiferente"
  >(
    (lado) => (lado === "indiferente" ? onIndiferente?.() : onSelect(lado)),
    /* A escolha fica acesa até a pergunta seguinte chegar: é ela que desmonta
       esta, e apagar antes reabriria os botões durante a ida ao servidor.
       Na indiferença nenhum dos dois é o escolhido, mas os dois recuam: quem
       acende é o botão do meio. */
    { bloqueado: desabilitado, manterEscolha: true },
  );
  const quadro = useRef<HTMLDivElement>(null);
  const idPergunta = useId();

  /* A resposta desmonta a pergunta inteira, e com ela o botão que tinha o
     foco: quem usa teclado ou leitor de tela caía no topo da página a cada
     resposta. A pergunta nova recebe o foco -- e o leitor lê o enunciado. Só
     quando o foco se perdeu, para não arrancá-lo de quem já está em outro
     lugar. */
  useEffect(() => {
    if (!respondeuNestaVisita) return;
    recuperarFoco(quadro.current);
  }, []);

  // um clique por pergunta: a guarda mora no gancho
  const escolher = (lado: "A" | "B" | "indiferente") => {
    if (responder(lado)) respondeuNestaVisita = true;
  };

  const a = pergunta.opcao_a.map((l) => parseLinha(l, pergunta.posicao_na_escala));
  const b = pergunta.opcao_b.map((l) => parseLinha(l, 1));
  const pares = alinhar(a, b);

  const ganhoA = a.find((l) => l.destaque);
  const ganhoB = b.find((l) => l.destaque);
  const rotuloA = t("elicitacao.tradeoff.situacaoA");
  const rotuloB = t("elicitacao.tradeoff.situacaoB");

  const ganho = (linha: Linha | undefined, cor: string) =>
    linha ? (
      <strong style={{ color: "var(--tinta)" }}>
        {linha.criterio}{" "}
        <span className="num" style={{ color: cor }}>
          {linha.texto}
        </span>
      </strong>
    ) : null;

  return (
    <div
      ref={quadro}
      tabIndex={-1}
      role="group"
      aria-labelledby={ganhoA && ganhoB ? idPergunta : undefined}
      className="foco-programatico"
    >
      {/* A pergunta em uma frase. Sem ela, descobrir o que esta sendo comparado
          exigia diferenciar duas tabelas de quatro linhas com o olho. */}
      {ganhoA && ganhoB && (
        <p id={idPergunta} className="prosa text-[15px]" style={{ color: "var(--tinta-2)" }}>
          {comNos(t("elicitacao.tradeoff.pergunta.direta"), {
            a: ganho(ganhoA, "var(--dado-a)"),
            b: ganho(ganhoB, "var(--dado-b)"),
          })}
        </p>
      )}

      <div className="mt-2 flex items-start gap-1.5">
        <p className="prosa text-[13px]" style={{ color: "var(--tinta-3)" }}>
          {t("elicitacao.tradeoff.resto")}
        </p>
        <Dica titulo={t("elicitacao.tradeoff.dica.titulo")}>
          <p>{t("elicitacao.tradeoff.dica.corpo1")}</p>
          <p>{t("elicitacao.tradeoff.dica.corpo2")}</p>
          <p style={{ color: "var(--tinta-3)" }}>
            {t("elicitacao.tradeoff.dica.corpo3")}
          </p>
        </Dica>
      </div>

      <div className="mt-5 flex flex-col items-stretch gap-4 md:flex-row">
        <Painel
          rotulo={rotuloA}
          lado="a"
          pares={pares}
          cor="var(--dado-a)"
          desabilitado={desabilitado}
          estado={estadoDe("A")}
          onSelect={() => escolher("A")}
        />

        {/* A terceira resposta fica no caminho entre as duas situações, que é
            onde o olho está enquanto se compara. */}
        {onIndiferente && (
          <BotaoEntreCartoes
            rotulo={t("tela.decisao.indiferentes")}
            dica={
              <Dica titulo={t("tela.decisao.indiferentes.dica.titulo")}>
                <p>{t("tela.decisao.indiferentes.dica.corpo1")}</p>
                <p>{t("tela.decisao.indiferentes.dica.corpo2")}</p>
              </Dica>
            }
            icone={<CaboDeGuerra />}
            desabilitado={desabilitado}
            pausado={pausado}
            estado={estadoDe("indiferente")}
            onClick={() => escolher("indiferente")}
          />
        )}

        <Painel
          rotulo={rotuloB}
          lado="b"
          pares={pares}
          cor="var(--dado-b)"
          desabilitado={desabilitado}
          estado={estadoDe("B")}
          onSelect={() => escolher("B")}
        />
      </div>

      {rodape && escolhida === null && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[12px]" style={{ color: "var(--tinta-fraca)" }}>
            {t("elicitacao.tradeoff.nenhuma")}
          </span>
          {rodape}
        </div>
      )}
    </div>
  );
}
