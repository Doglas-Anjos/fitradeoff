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
 * Este componente e o orquestrador. Cada passo e um componente separado, e o
 * que atravessa todos eles e um rascunho -- guardado no navegador, porque
 * fechar a aba no meio de um cadastro de doze alternativas nao pode custar o
 * cadastro inteiro.
 */

import {
  ArrowRight,
  FileXls,
  FolderOpen,
  ListNumbers,
  NotePencil,
  SlidersHorizontal,
  Stack,
  Trophy,
} from "@phosphor-icons/react";
import { useState } from "react";

import { CadastroEstrutural } from "@/components/CadastroEstrutural";
import {
  ConfiguracaoProblematica,
  DicaPortfolio,
  DicaSorting,
} from "@/components/ConfiguracaoProblematica";
import {
  ConferenciaImportacao,
  type Conferido,
} from "@/components/ConferenciaImportacao";
import { DecisoesSalvas } from "@/components/DecisoesSalvas";
import {
  Passos,
  Rodape,
  Voltar,
  type Passo as PassoTrilha,
} from "@/components/Etapas";
import { ImportacaoPlanilha } from "@/components/ImportacaoPlanilha";
import { MatrizConsequencias } from "@/components/MatrizConsequencias";
import { DIAGRAMAS } from "@/components/DiagramasObjetivo";
import {
  Botao,
  CartaoOpcao,
  CartaoOpcaoDupla,
  Dica,
  Modal,
  Selo,
} from "@/components/ui";
import { avisar } from "@/components/Avisos";
import { api, type PlanilhaLida, mensagemDeErro } from "@/lib/api";
import { EXEMPLOS, type Exemplo } from "@/lib/exemplos";
import { useIdioma } from "@/lib/i18n";
/* O catálogo dos módulos de domínio: os casos prontos e as recusas da validação
   do rascunho guardam chaves, e é aqui que elas viram texto. */
import { traduzir } from "@/lib/i18n/dominio";
import "@/lib/i18n/entrada";
import { useRascunhoSincronizado } from "@/lib/rascunhoSincronizado";
import {
  RASCUNHO_VAZIO,
  configuracaoDe,
  custosDe,
  ehCarteira,
  criterioVazio,
  ehFalha,
  exigeAjustes,
  normalizar,
  numeroDe,
  paraCriacao,
  validarEstrutura,
  validarMatriz,
  type Falha,
  type Modo,
  type Passo,
  type Rascunho,
} from "@/lib/rascunho";
import type { Problema, Problematica } from "@/lib/types";

/* Os objetivos e as formas de entrada guardam a chave do catálogo, não o texto:
   o rótulo e a ajuda de cada objetivo já vivem no núcleo, porque o resto da
   interface também os usa. A ajuda de cada um é a chave mais `.ajuda`. */
/* A ordem e a do sistema de referencia -- escolha, ordenacao, carteira,
   classificacao -- para que as duas telas se reconhecam uma na outra. As duas
   carteiras ocupam uma caixa so, que e como la tambem: elas partem dos mesmos
   dados e respondem a mesma pergunta, e so o criterio de selecao muda. */
const PROBLEMATICAS: {
  valor: Problematica;
  chave: string;
  Icone: typeof Trophy;
}[] = [
  { valor: "escolha", chave: "problematica.escolha", Icone: Trophy },
  { valor: "ranking", chave: "problematica.ranking", Icone: ListNumbers },
  { valor: "sorting", chave: "problematica.sorting", Icone: SlidersHorizontal },
];

const CARTEIRAS: Problematica[] = ["portfolio", "beneficio_custo"];

/** Onde a caixa das carteiras entra na grade, contando a partir de zero. */
const POSICAO_CARTEIRA = 2;

const MODOS: {
  valor: Modo;
  chave: string;
  Icone: typeof Trophy;
}[] = [
  { valor: "manual", chave: "entrada.modo.manual", Icone: NotePencil },
  { valor: "planilha", chave: "entrada.modo.planilha", Icone: FileXls },
];

/** A tradução, para o que precisa dela fora do corpo de um componente. */
type Traduz = (
  chave: string,
  valores?: Record<string, string | number>,
) => string;

/** O botao da matriz diz o que vem depois dela, que depende do objetivo. */
function acaoDaMatriz(problematica: Problematica, t: Traduz): string {
  if (problematica === "sorting") return t("entrada.acao.continuarFaixas");
  if (ehCarteira(problematica)) return t("entrada.acao.continuarOrcamento");
  return t("entrada.acao.criar");
}

const CHAVE_AJUSTES: Partial<Record<Problematica, string>> = {
  sorting: "entrada.trilha.faixas",
  portfolio: "entrada.trilha.orcamento",
};

/** Os passos daquele caminho, que dependem da forma de entrada e do objetivo. */
export function trilhaDe(
  modo: Modo,
  problematica: Problematica,
  t: Traduz,
): PassoTrilha[] {
  const inicio: PassoTrilha[] = [
    { id: "problematica", rotulo: t("entrada.trilha.objetivo") },
  ];
  const ajustes: PassoTrilha[] = exigeAjustes(problematica)
    ? [
        {
          id: "ajustes",
          rotulo: t(CHAVE_AJUSTES[problematica] ?? "entrada.trilha.ajustes"),
        },
      ]
    : [];

  if (modo === "manual") {
    return [
      ...inicio,
      { id: "estrutura", rotulo: t("entrada.trilha.estrutura") },
      { id: "matriz", rotulo: t("entrada.trilha.desempenhos") },
      ...ajustes,
    ];
  }
  if (modo === "planilha") {
    return [
      ...inicio,
      { id: "fonte", rotulo: t("entrada.trilha.planilha") },
      ...ajustes,
    ];
  }
  return inicio;
}

/* --- escolha do objetivo e da forma de entrada -------------------------------- */

/**
 * A forma de entrada, em botoes compactos.
 *
 * Ela vinha com o mesmo cartao dos objetivos, e as duas perguntas pareciam ter
 * o mesmo peso -- uma e sobre o problema, a outra e sobre de onde os dados
 * saem. Sete cartoes iguais nao diziam qual das duas decidia alguma coisa.
 */
function EscolhaCompacta({
  valor,
  ativo,
  rotulo,
  Icone,
  nome,
  onEscolher,
}: {
  valor: string;
  ativo: boolean;
  rotulo: string;
  Icone: typeof Trophy;
  nome: string;
  onEscolher: () => void;
}) {
  return (
    <label
      className="tatil inline-flex cursor-pointer items-center gap-2 rounded-[var(--raio-controle)] border px-3 py-2"
      style={{
        borderColor: ativo ? "var(--accent)" : "var(--borda-forte)",
        background: ativo ? "var(--accent-suave)" : "transparent",
      }}
    >
      <input
        type="radio"
        name={nome}
        value={valor}
        checked={ativo}
        onChange={onEscolher}
        className="sr-only"
      />
      <Icone
        size={15}
        weight={ativo ? "fill" : "regular"}
        style={{ color: ativo ? "var(--accent)" : "var(--tinta-fraca)" }}
        className="shrink-0"
      />
      <span
        className="text-[13px]"
        style={{
          color: ativo ? "var(--accent)" : "var(--tinta-2)",
          fontWeight: ativo ? 500 : 400,
        }}
      >
        {rotulo}
      </span>
    </label>
  );
}

/** "escolher a melhor alternativa" -- o objetivo como quem decide o diria. */
const RESUMO_OBJETIVO: Record<Problematica, string> = {
  escolha: "entrada.resumo.escolha",
  ranking: "entrada.resumo.ranking",
  sorting: "entrada.resumo.sorting",
  portfolio: "entrada.resumo.portfolio",
  beneficio_custo: "entrada.resumo.beneficio_custo",
};

/* Sem chave para as salvas: elas nao sao um passo do cadastro, e o resumo do
   primeiro passo nao fala delas. */
const RESUMO_MODO: Record<Modo, string> = {
  manual: "entrada.resumo.modo.manual",
  planilha: "entrada.resumo.modo.planilha",
  salvas: "",
};

/** O que o botao vai realmente abrir, e nao um "Continuar" para lugar nenhum. */
const ACAO_MODO: Record<Modo, string> = {
  manual: "entrada.acao.manual",
  planilha: "entrada.acao.planilha",
  salvas: "entrada.acao.salvas",
};

function EscolhaInicial({
  rascunho,
  onAlterar,
  onContinuar,
}: {
  rascunho: Rascunho;
  onAlterar: (r: Rascunho) => void;
  onContinuar: () => void;
}) {
  const { t } = useIdioma();
  const passos = trilhaDe(rascunho.modo, rascunho.problematica, t).length;

  return (
    <div className="space-y-7">
      <fieldset>
        <legend className="mb-1 flex items-center gap-1.5 text-[13px] font-medium">
          <span style={{ color: "var(--tinta)" }}>
            {t("entrada.objetivo.pergunta")}
          </span>
          <Dica titulo={t("entrada.objetivo.dica.titulo")}>
            <p>{t("entrada.objetivo.dica.perguntas")}</p>
            <p>{t("entrada.objetivo.dica.trocar")}</p>
          </Dica>
        </legend>

        {/* Os quatro lado a lado e quase quadrados: assim se comparam de
            relance. Empilhados em faixas largas viravam uma lista, e uma lista
            sugere uma ordem que aqui nao existe. A proporcao so vale onde as
            quatro colunas cabem; num celular o quadrado viraria um bloco alto
            demais para caber na dobra. */}
        <div className="mt-3 grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {(() => {
            /* Altura mínima, não proporção fixa. `aspect-square` prendia o
               cartão em 240px e o conteúdo precisava de 256, então três dos
               quatro transbordavam por cima do texto seguinte - e o quarto,
               com uma linha de ajuda a menos, ficava visivelmente mais baixo.
               A grade já iguala as alturas da linha entre si. */
            const envelope = "entra-em-lista grid min-h-[8.5rem] lg:min-h-[12.5rem]";

            const simples = PROBLEMATICAS.map(({ valor, chave, Icone }) => {
              const ativo = rascunho.problematica === valor;
              const Diagrama = DIAGRAMAS[valor];
              return (
                <CartaoOpcao
                  key={valor}
                  nome="problematica"
                  ativo={ativo}
                  rotulo={t(chave)}
                  ajuda={t(`${chave}.ajuda`)}
                  icone={<Icone size={22} weight={ativo ? "fill" : "regular"} />}
                  /* A figura carrega o que o texto custa a explicar: "ordenação"
                     e "classificação" soam parecidos escritos, e dão resultados
                     completamente diferentes. Em realce ela se move, e o
                     movimento é o que separa uma da outra -- ver
                     `DiagramasObjetivo`. */
                  figura={(emRealce) => <Diagrama ativo={ativo} emRealce={emRealce} />}
                  onEscolher={() => onAlterar({ ...rascunho, problematica: valor })}
                />
              );
            });

            const carteiras = (
              <CartaoOpcaoDupla
                key="carteira"
                nome="problematica"
                icone={
                  <Stack
                    size={22}
                    weight={CARTEIRAS.includes(rascunho.problematica) ? "fill" : "regular"}
                  />
                }
                /* O mesmo desenho para as duas: a diferença entre elas não é o
                   que se procura -- um conjunto dentro de um teto -- e sim como
                   se procura. Um desenho diferente prometeria outra coisa; o
                   movimento, esse sim, mostra a diferença, e vem da região do
                   cartão sobre a qual o mouse está. */
                figura={(emRealce) => (
                  <DIAGRAMAS.portfolio
                    ativo={CARTEIRAS.includes(rascunho.problematica)}
                    modo={
                      (emRealce as "portfolio" | "beneficio_custo" | null) ?? null
                    }
                  />
                )}
                opcoes={CARTEIRAS.map((valor) => ({
                  valor,
                  rotulo: t(`problematica.${valor}`),
                }))}
                selecionado={
                  CARTEIRAS.includes(rascunho.problematica)
                    ? rascunho.problematica
                    : null
                }
                onEscolher={(valor) =>
                  onAlterar({ ...rascunho, problematica: valor as Problematica })
                }
                dica={
                  <Dica titulo={t("problematica.carteira.dica.titulo")}>
                    <p>{t("problematica.carteira.dica.combinatorial")}</p>
                    <p>{t("problematica.carteira.dica.razao")}</p>
                    <p style={{ color: "var(--tinta-3)" }}>
                      {t("problematica.carteira.dica.comum")}
                    </p>
                  </Dica>
                }
              />
            );

            const cartoes = [...simples];
            cartoes.splice(POSICAO_CARTEIRA, 0, carteiras);

            return cartoes.map((cartao, i) => (
              <div
                key={cartao.key}
                className={envelope}
                style={{ "--ordem": i } as React.CSSProperties}
              >
                {cartao}
              </div>
            ));
          })()}
        </div>

      </fieldset>

      <fieldset>
        <legend className="mb-1 text-[13px] font-medium" style={{ color: "var(--tinta)" }}>
          {t("entrada.fonte.pergunta")}
        </legend>

        <div className="mt-2.5 flex flex-wrap gap-2">
          {MODOS.map(({ valor, chave, Icone }) => (
            <EscolhaCompacta
              key={valor}
              nome="modo"
              valor={valor}
              ativo={rascunho.modo === valor}
              rotulo={t(chave)}
              Icone={Icone}
              onEscolher={() => onAlterar({ ...rascunho, modo: valor })}
            />
          ))}
        </div>

        {/* só a ajuda do modo marcado: três linhas de ajuda de uma vez pesavam
            tanto quanto a pergunta de cima, que é a que importa */}
        <p className="mt-2 text-[12px]" style={{ color: "var(--tinta-3)" }}>
          {(() => {
            const chave = MODOS.find((m) => m.valor === rascunho.modo)?.chave;
            return chave ? t(`${chave}.ajuda`) : null;
          })()}
        </p>
      </fieldset>

      {/* Duas opções já vêm marcadas. Sem este eco, a pessoa segue sem saber que
          escolheu, e a trilha muda de tamanho longe de onde ela está olhando. */}
      <p
        className="prosa border-t pt-5 text-[13px]"
        style={{ borderColor: "var(--borda)", color: "var(--tinta-2)" }}
      >
        {t("entrada.resumo.antes")}{" "}
        <strong style={{ color: "var(--tinta)" }}>
          {t(RESUMO_OBJETIVO[rascunho.problematica])}
        </strong>
        {t("entrada.resumo.meio", {
          modo: RESUMO_MODO[rascunho.modo] ? t(RESUMO_MODO[rascunho.modo]) : "",
        })}{" "}
        <span className="num">{passos}</span> {t("entrada.resumo.passos")}.
      </p>

      <Rodape>
        <Botao onClick={onContinuar} icone={<ArrowRight size={14} weight="bold" />}>
          {t(ACAO_MODO[rascunho.modo])}
        </Botao>
      </Rodape>
    </div>
  );
}

/* --- catalogo de casos prontos -------------------------------------------------- */

/**
 * Os casos de exemplo, para quem quer ver o metodo funcionando antes de digitar
 * a propria decisao.
 *
 * Eram um link solto para um unico caso de fornecedor. Um so nao mostra a
 * variedade que a tela aceita, e o link nao dizia o que ia acontecer ao ser
 * clicado: quem ja tinha meia dezena de criterios digitados perdia tudo sem
 * aviso. Agora o caso e escolhido pelo que ele e, e a substituicao e
 * confirmada.
 *
 * A confirmacao so aparece quando ha algo a perder. Perguntar "tem certeza?"
 * sobre um cadastro em branco e atrito sem motivo.
 */
function CatalogoExemplos({
  precisaConfirmar,
  onAplicar,
}: {
  precisaConfirmar: boolean;
  onAplicar: (exemplo: Exemplo, substituindo: boolean) => void;
}) {
  const { t } = useIdioma();
  const [confirmando, setConfirmando] = useState<Exemplo | null>(null);
  /* Aberto enquanto o cadastro está em branco, que é quando serve; recolhido
     depois. Os seis cartões ocupavam a primeira dobra inteira e empurravam
     alternativas e critérios para fora da tela: quem chegava aqui não via o que
     tinha vindo fazer. `precisaConfirmar` é verdadeiro justamente quando já há
     algo digitado, então ele também responde "o catálogo ainda interessa?".

     Derivado, e não guardado na montagem: preencher o cadastro precisa recolher
     o catálogo na hora. O estado manual só existe depois de um clique, e então
     vence -- quem abriu de propósito não quer que feche sozinho. */
  const [abertoManual, setAbertoManual] = useState<boolean | null>(null);
  const aberto = abertoManual ?? !precisaConfirmar;
  const setAberto = setAbertoManual;

  const escolher = (exemplo: Exemplo) => {
    if (precisaConfirmar) return setConfirmando(exemplo);
    onAplicar(exemplo, false);
  };

  return (
    <section
      aria-labelledby="catalogo-exemplos"
      className="rounded-[var(--raio-painel)] border p-4"
      style={{ borderColor: "var(--borda)", background: "var(--painel-fundo)" }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2
          id="catalogo-exemplos"
          className="text-[13px] font-medium"
          style={{ color: "var(--tinta)" }}
        >
          {t("entrada.exemplos.titulo")}
        </h2>
        <button
          type="button"
          onClick={() => setAberto(!aberto)}
          aria-expanded={aberto}
          className="tatil text-[12px] underline underline-offset-2"
          style={{ color: "var(--tinta-3)" }}
        >
          {t(aberto ? "entrada.exemplos.recolher" : "entrada.exemplos.mostrar", {
            n: EXEMPLOS.length,
          })}
        </button>
      </div>
      <p hidden={!aberto} className="mt-1 text-[12px]" style={{ color: "var(--tinta-3)" }}>
        {t("entrada.exemplos.ajuda")}
      </p>

      <div
        hidden={!aberto}
        className="mt-3 grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      >
        {EXEMPLOS.map((exemplo, i) => (
          <button
            key={exemplo.chave}
            type="button"
            onClick={() => escolher(exemplo)}
            className="cartao-exemplo tatil entra-em-lista flex flex-col items-start gap-1.5 rounded-[var(--raio-controle)] border p-3 text-left"
            style={{ "--ordem": i } as React.CSSProperties}
          >
            <span
              className="text-[13px] font-medium"
              style={{ color: "var(--tinta)" }}
            >
              {t(exemplo.titulo)}
            </span>
            <span
              className="text-[12px] leading-snug"
              style={{ color: "var(--tinta-3)" }}
            >
              {t(exemplo.resumo)}
            </span>
            {/* O objetivo aparece antes do clique: aplicar o caso troca o
                objetivo, e a pessoa tem o direito de saber disso olhando. */}
            <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
              <Selo>
                {t("entrada.exemplos.contagem", {
                  alternativas: exemplo.alternativas.length,
                  criterios: exemplo.criterios.length,
                })}
              </Selo>
              <Selo tom="accent">
                {t("entrada.exemplos.feitoPara", {
                  objetivo: t(`problematica.curto.${exemplo.sugerida}`),
                })}
              </Selo>
            </span>
          </button>
        ))}
      </div>

      {confirmando && (
        <Modal
          titulo={t("entrada.exemplos.substituir.titulo")}
          confirmar={t("entrada.exemplos.substituir.confirmar")}
          perigo
          onFechar={() => setConfirmando(null)}
          onConfirmar={() => {
            onAplicar(confirmando, true);
            setConfirmando(null);
          }}
        >
          <p>
            {t("entrada.exemplos.substituir.antes")}{" "}
            <strong>{t(confirmando.titulo)}</strong>{" "}
            {t("entrada.exemplos.substituir.depois")}
          </p>
          <p>{t("entrada.exemplos.substituir.semVolta")}</p>
        </Modal>
      )}
    </section>
  );
}

/* --- o cabecalho de cada passo -------------------------------------------------- */

/**
 * O titulo da tela e a pergunta do passo.
 *
 * Antes, "Nova decisao" e um paragrafo de tres linhas abriam os quatro passos,
 * identicos em todos -- o maior elemento da tela era o que menos informava, e
 * num celular ele empurrava a pergunta real para fora da primeira dobra.
 */
function cabecalhoDoPasso(
  passo: Passo,
  rascunho: Rascunho,
  t: Traduz,
): { titulo: string; descricao?: string; dica?: React.ReactNode } {
  switch (passo) {
    case "estrutura":
      return {
        titulo: t("entrada.estrutura.titulo"),
        descricao: t("entrada.estrutura.descricao"),
      };
    case "matriz":
      return {
        titulo: t("entrada.matriz.titulo"),
        dica: (
          <Dica titulo={t("entrada.matriz.dica.titulo")}>
            <p>{t("entrada.matriz.dica.reais")}</p>
            <p>{t("entrada.matriz.dica.normaliza")}</p>
          </Dica>
        ),
      };
    case "fonte":
      return rascunho.modo === "salvas"
        ? {
            titulo: t("entrada.salvas.titulo"),
            descricao: t("entrada.salvas.descricao"),
          }
        : {
            titulo: t("entrada.planilha.titulo"),
            descricao: t("entrada.planilha.descricao"),
          };
    case "ajustes":
      return rascunho.problematica === "sorting"
        ? {
            titulo: t("entrada.faixas.titulo"),
            descricao: t("entrada.ajustes.descricao"),
            dica: <DicaSorting />,
          }
        : {
            titulo: t("entrada.orcamento.titulo"),
            descricao: t("entrada.ajustes.descricao"),
            dica: <DicaPortfolio />,
          };
    default:
      return {
        titulo: t("entrada.objetivo.titulo"),
        descricao: t("entrada.objetivo.descricao"),
      };
  }
}

function CabecalhoPasso({ passo, rascunho }: { passo: Passo; rascunho: Rascunho }) {
  const { t } = useIdioma();
  const { titulo, descricao, dica } = cabecalhoDoPasso(passo, rascunho, t);
  return (
    <header>
      <div className="flex items-start gap-2">
        <h1
          className="display min-w-0 text-[26px] font-semibold sm:text-[28px]"
          style={{ color: "var(--tinta)" }}
        >
          {titulo}
        </h1>
        {dica && <span className="mt-0.5 shrink-0">{dica}</span>}
      </div>
      {descricao && (
        <p className="prosa mt-2 text-[14px]" style={{ color: "var(--tinta-2)" }}>
          {descricao}
        </p>
      )}
    </header>
  );
}

/* --- o orquestrador ------------------------------------------------------------ */

export function EntradaProblema({
  onPronto,
}: {
  onPronto: (problema: Problema) => void;
}) {
  const { t } = useIdioma();

  /* O que foi digitado e ainda não virou decisão fica guardado nos dois lados:
     no navegador a cada tecla, para fechar a aba sem querer não custar o
     preenchimento; e no servidor em rajadas, para trocar de máquina ou limpar
     os dados do site também não custar. */
  const [salvo, setRascunho, limparRascunho] = useRascunhoSincronizado<Rascunho>(
    "rascunho",
    RASCUNHO_VAZIO,
  );
  const rascunho = normalizar(salvo);
  const alterar = (novo: Rascunho) => setRascunho(novo);
  const irPara = (passo: Passo) => {
    setFalha(null);
    setRascunho({ ...rascunho, passo });
  };

  const [falha, setFalha] = useState<Falha | null>(null);

  /* A falha vira aviso flutuante, e não um parágrafo no fim da tela.
     A mensagem saía embaixo de um formulário longo, muitas vezes fora do campo
     de visão de quem tinha acabado de clicar em "continuar" lá no rodapé -- o
     botão não avançava e nada parecia ter acontecido. O restante do cadastro já
     avisava por toast; só estas ficavam de fora, e era a incoerência mais
     visível da tela.

     O estado continua: é dele que sai o realce do campo culpado, que é a outra
     metade do recado. O toast diz o quê; o realce diz onde. */
  const reportar = (nova: Falha) => {
    setFalha(nova);
    avisar.erro(traduzir(nova, t));
  };
  const [ocupado, setOcupado] = useState(false);
  const [arquivoLido, setArquivoLido] = useState<string | null>(null);
  const [lida, setLida] = useState<PlanilhaLida | null>(null);
  /* A planilha já conferida, guardada enquanto o objetivo pede o que falta.
     Sem isso, sorting e carteira teriam de pedir faixas antes de haver dados. */
  const [conferido, setConferido] = useState<Conferido | null>(null);

  /* Um rascunho gravado num passo que os dados já não sustentam volta ao último
     que eles sustentam: é melhor reabrir na estrutura do que numa matriz sem
     linhas nem colunas. */
  const passo: Passo = (() => {
    const p = rascunho.passo;
    if (rascunho.modo === "manual") {
      if ((p === "matriz" || p === "ajustes") && validarEstrutura(rascunho)) {
        return "estrutura";
      }
      if (p === "fonte") return "estrutura";
    } else {
      if (p === "estrutura" || p === "matriz") return "fonte";
      if (p === "ajustes" && !conferido) return "fonte";
    }
    if (p === "ajustes" && !exigeAjustes(rascunho.problematica)) {
      return rascunho.modo === "manual" ? "matriz" : "fonte";
    }
    return p;
  })();

  const trilha = trilhaDe(rascunho.modo, rascunho.problematica, t);

  /* Para onde volta cada passo, e como o link se chama. O rótulo nomeia o
     destino em vez de dizer só "voltar": num fluxo de quatro passos, saber para
     onde se volta é o que evita voltar demais. */

  const criar = async (dados: Parameters<typeof api.criar>[0]) => {
    setOcupado(true);
    setFalha(null);
    try {
      const criado = await api.criar(dados);
      limparRascunho();
      onPronto(criado);
    } catch (e) {
      /* A mensagem do servidor já vem escrita, sem chave: entra pela chave que
         só repassa o texto, para a tela ter um caminho de erro, não dois. */
      reportar({
        chave: "dominio.erro.api",
        valores: { detalhe: mensagemDeErro(e) },
      });
    } finally {
      setOcupado(false);
    }
  };

  /* --- passo 1: objetivo e forma de entrada --- */

  const continuarDaEscolha = () =>
    irPara(rascunho.modo === "manual" ? "estrutura" : "fonte");

  /* --- passo 2 (manual): estrutura --- */

  const salvarEstrutura = () => {
    const erro = validarEstrutura(rascunho);
    if (erro) return reportar(erro);
    irPara("matriz");
  };

  /* Cadastro em branco e o que dispensa a confirmacao: o que se perderia sao
     os nomes de alternativas e criterios, e sem eles nao ha o que perder. */
  const cadastroEmBranco =
    !rascunho.linhas.some((l) => l.nome.trim()) &&
    !rascunho.colunas.some((c) => c.nome.trim());

  /* O objetivo escolhido no primeiro passo nao e tocado: o exemplo traz os
     dados, nao a pergunta que a pessoa ja respondeu. O nome digitado tambem
     sobrevive quando nada foi substituido -- so quem confirmou a troca pediu
     para perder o que tinha. */
  /* O caso pronto guarda chaves de catálogo, e o que entra no rascunho é texto:
     o nome do critério e a unidade vão ser digitados de novo por quem quiser
     mudá-los, e ficam gravados no navegador. Resolver aqui, no momento de
     carregar, deixa o caso no idioma em que a pessoa está lendo. Os números
     passam intactos - eles não têm idioma. */
  const aplicarExemplo = (exemplo: Exemplo, substituindo: boolean) => {
    /* O caso vem com o objetivo para o qual foi feito, e ate aqui esse campo
       existia sem ninguem ler: "Campanhas do trimestre" trazia custo por
       campanha e caia numa Ordenacao, que ignora custo -- o exemplo perdia
       justamente o que tinha para ensinar.

       Trocar a escolha de alguem em silencio seria pior que o defeito, entao a
       troca e avisada. Voltar e um clique: a saida do passo esta logo acima. */
    if (exemplo.sugerida !== rascunho.problematica) {
      avisar.feito(
        t("entrada.exemplos.objetivoAjustado", {
          objetivo: t(`problematica.${exemplo.sugerida}`),
        }),
      );
    }
    alterar({
      ...rascunho,
      problematica: exemplo.sugerida,
      nome: substituindo
        ? t(exemplo.nome)
        : rascunho.nome.trim() || t(exemplo.nome),
      /* Parte do critério vazio em vez de montar o objeto inteiro: um campo
         novo no rascunho passa a valer aqui sem que ninguém precise lembrar. */
      colunas: exemplo.criterios.map((c) => ({
        ...criterioVazio(),
        nome: t(c.nome),
        unidade: t(c.unidade),
        direcao: c.direcao,
      })),
      linhas: exemplo.alternativas.map((nome, i) => ({
        nome: t(nome),
        valores: [...(exemplo.consequencias[i] ?? [])],
        custo: exemplo.custos[i] ?? "",
      })),
    });
  };

  /* --- passo 3 (manual): desempenhos --- */

  const continuarDaMatriz = () => {
    const erro = validarMatriz(rascunho);
    if (erro) return reportar(erro);
    if (ehCarteira(rascunho.problematica)) {
      const custos = custosDe(rascunho);
      if (ehFalha(custos)) return reportar(custos);
    }
    if (exigeAjustes(rascunho.problematica)) return irPara("ajustes");
    criarDoRascunho();
  };

  const criarDoRascunho = () => {
    const corpo = paraCriacao(rascunho, t("entrada.conferencia.semNome"));
    if (ehFalha(corpo)) return reportar(corpo);
    void criar(corpo);
  };

  /* --- planilha --- */

  /* Ler não é criar: a planilha volta para conferência e só vira decisão depois
     que o decisor disser que está certa. A direção de um critério inverte o
     resultado inteiro sem dar sinal, e é o que mais chega errado. */
  const analisar = async (entrada: File | string) => {
    setOcupado(true);
    setFalha(null);
    setArquivoLido(
      typeof entrada === "string"
        ? t("entrada.planilha.dadosColados")
        : entrada.name,
    );
    try {
      setLida(await api.previaPlanilha(entrada));
    } catch (e) {
      /* A mensagem do servidor já vem escrita, sem chave: entra pela chave que
         só repassa o texto, para a tela ter um caminho de erro, não dois. */
      reportar({
        chave: "dominio.erro.api",
        valores: { detalhe: mensagemDeErro(e) },
      });
      setArquivoLido(null);
    } finally {
      setOcupado(false);
    }
  };

  const confirmarImportacao = (dados: Conferido) => {
    if (exigeAjustes(rascunho.problematica)) {
      setConferido(dados);
      setFalha(null);
      setRascunho({ ...rascunho, passo: "ajustes" });
      return;
    }
    criarImportada(dados);
  };

  const criarImportada = (dados: Conferido) => {
    const extra = configuracaoDe(rascunho, dados.custos ?? null);
    if (ehFalha(extra)) return reportar(extra);
    void criar({
      nome: dados.nome,
      alternativas: dados.alternativas,
      criterios: dados.criterios,
      consequencias: dados.consequencias,
      problematica: rascunho.problematica,
      custos: dados.custos ?? undefined,
      ...extra,
    });
  };

  /* --- passo final: o que o objetivo exige --- */

  const criarComAjustes = () => (conferido ? criarImportada(conferido) : criarDoRascunho());

  const voltarDosAjustes = () => {
    if (conferido) {
      setConferido(null);
      irPara("fonte");
      return;
    }
    irPara("matriz");
  };

  /* A única saída do passo, e para onde ela vai. O rótulo nomeia o destino em
     vez de dizer só "voltar": num fluxo de quatro passos, saber para onde se
     volta é o que evita voltar demais.

     Os ajustes têm regra própria -- quem veio de planilha volta para a planilha,
     não para a matriz -- então reusa a função acima em vez de repetir a
     condição aqui. */
  const anterior: { chave: string; ir: () => void } | null = {
    problematica: null,
    fonte: {
      chave: "estrutura.voltarAoObjetivo",
      ir: () => irPara("problematica"),
    },
    estrutura: {
      chave: "estrutura.voltarAoObjetivo",
      ir: () => irPara("problematica"),
    },
    matriz: { chave: "estrutura.matriz.voltar", ir: () => irPara("estrutura") },
    ajustes: {
      chave: conferido
        ? "entrada.acao.voltarPlanilha"
        : "entrada.acao.voltarDesempenhos",
      ir: voltarDosAjustes,
    },
  }[passo];

  const totalDosCustos = (() => {
    const fonte = conferido?.custos ?? null;
    if (fonte) return fonte.reduce((s, c) => s + c, 0);
    if (!rascunho.linhas.some((l) => l.custo.trim())) return null;
    return rascunho.linhas.reduce((soma, l) => {
      const n = numeroDe(l.custo);
      return soma + (Number.isFinite(n) ? n : 0);
    }, 0);
  })();

  /* A falha vem descrita por chave; o texto nasce aqui, e é este texto que o
     passos recebem como `erro`. */
  const erro = falha ? traduzir(falha, t) : null;

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

      {passo === "problematica" && (
        <EscolhaInicial
          rascunho={rascunho}
          onAlterar={alterar}
          onContinuar={continuarDaEscolha}
        />
      )}

      {passo === "estrutura" && (
        <div className="space-y-6">
          <CatalogoExemplos
            precisaConfirmar={!cadastroEmBranco}
            onAplicar={aplicarExemplo}
          />
          <CadastroEstrutural
            rascunho={rascunho}
            onAlterar={alterar}
            onVoltar={() => irPara("problematica")}
            onSalvar={salvarEstrutura}
            campoComErro={falha?.campo ?? null}
          />
        </div>
      )}

      {passo === "matriz" && (
        <MatrizConsequencias
          rascunho={rascunho}
          onAlterar={alterar}
          onVoltar={() => irPara("estrutura")}
          onContinuar={continuarDaMatriz}
          rotuloAcao={acaoDaMatriz(rascunho.problematica, t)}
          ocupado={ocupado}
          campoComErro={falha?.campo ?? null}
        />
      )}

      {passo === "fonte" && rascunho.modo === "planilha" && (
        <div>
          {lida ? (
            /* A conferencia troca a tela inteira de upload pela tabela lida:
               sem a entrada, a troca parece um recarregamento. */
            <div className="entra-subindo">
              <ConferenciaImportacao
                lida={lida}
                ocupado={ocupado}
                onConfirmar={confirmarImportacao}
                onCancelar={() => {
                  setLida(null);
                  setArquivoLido(null);
                  setFalha(null);
                }}
              />
            </div>
          ) : (
            <>
              <ImportacaoPlanilha
                ocupado={ocupado}
                arquivoLido={arquivoLido}
                erro={erro}
                onLer={(entrada) => void analisar(entrada)}
              />
              <Rodape
                onVoltar={() => irPara("problematica")}
                rotuloVoltar={t("entrada.acao.voltarObjetivo")}
              >
                <span />
              </Rodape>
            </>
          )}
        </div>
      )}

      {passo === "ajustes" && (
        <div>
          <div>
            <ConfiguracaoProblematica
              problematica={rascunho.problematica}
              sorting={rascunho.sorting}
              onSorting={(v) => alterar({ ...rascunho, sorting: v })}
              orcamento={rascunho.orcamento}
              onOrcamento={(v) => alterar({ ...rascunho, orcamento: v })}
              porPlanilha={!!conferido}
              totalDosCustos={totalDosCustos}
            />
          </div>

          {erro && (
            <p role="alert" className="mt-5 text-sm" style={{ color: "var(--erro)" }}>
              {erro}
            </p>
          )}

          <Rodape>
            <Botao onClick={criarComAjustes} disabled={ocupado}>
              {t("entrada.acao.criar")}
            </Botao>
          </Rodape>
        </div>
      )}
    </div>
  );
}
