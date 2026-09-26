"use client";

/**
 * O fluxo classico do FITradeoff.
 *
 * Layout de duas colunas assimetricas: o trabalho a esquerda, o estado fixo a
 * direita. E uma ferramenta, nao uma pagina -- quem esta decidindo precisa ver
 * o conjunto encolher enquanto responde, ou as perguntas parecem nao levar a
 * lugar nenhum.
 *
 * Cada etapa so aparece quando a anterior fecha, porque o metodo e sequencial:
 * nao ha pergunta de tradeoff antes da ordenacao dos pesos, nem resultado antes
 * de haver resposta.
 */

import { Equals, Question } from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { Dica } from "@/components/ui";

import { EntradaProblema } from "@/components/EntradaProblema";
import { BotaoSalvarGrafico } from "@/components/BotaoSalvarGrafico";
import { AvaliacaoIntraCriterio } from "@/components/AvaliacaoIntraCriterio";
import { type Ponto } from "@/components/CurvaDeValor";
import { Etapas, Voltar, type Etapa } from "@/components/Etapas";
import { Inconsistencia, type Diagnostico, type Saida } from "@/components/Inconsistencia";
import { PainelSalvas } from "@/components/PainelSalvas";
import { Recentes } from "@/components/Recentes";
import { OrdenacaoPesos } from "@/components/OrdenacaoPesos";
import { PainelProgresso } from "@/components/PainelProgresso";
import { RangeChart, type Faixa } from "@/components/RangeChart";
import { JulgamentoHolistico } from "@/components/JulgamentoHolistico";
import { ResultadoAnalise } from "@/components/ResultadoAnalise";
import { SinteseResultado } from "@/components/SinteseResultado";
import { SensibilidadeConsequencias } from "@/components/SensibilidadeConsequencias";
import { Visualizacoes } from "@/components/Visualizacoes";
import { TradeoffChart } from "@/components/TradeoffChart";
import { api, ApiError } from "@/lib/api";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/telas";
import "@/lib/i18n/estrutura";
import { registrarRecente } from "@/lib/persistencia";
import type { Auditoria, Estado, Pergunta, Problema } from "@/lib/types";

function Secao({
  titulo,
  acessorio,
  children,
}: {
  titulo: string;
  acessorio?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t pt-8" style={{ borderColor: "var(--borda)" }}>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <h2
          className="text-lg font-semibold tracking-tight"
          style={{ color: "var(--tinta)" }}
        >
          {titulo}
        </h2>
        {acessorio}
      </div>
      {children}
    </section>
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

export default function DecisaoPage() {
  return (
    <Suspense fallback={<CarregandoDecisao />}>
      <Decisao />
    </Suspense>
  );
}

function CarregandoDecisao() {
  return (
    <main className="mx-auto max-w-6xl px-5 pt-10">
      <div className="esqueleto h-9 w-72" />
      <div className="esqueleto mt-6 h-64 w-full" />
    </main>
  );
}

function Decisao() {
  const { t } = useIdioma();
  const router = useRouter();
  const parametros = useSearchParams();
  const idNaUrl = parametros.get("id");

  const [problema, setProblema] = useState<Problema | null>(null);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [pergunta, setPergunta] = useState<Pergunta | null>(null);
  const [auditoria, setAuditoria] = useState<Auditoria | null>(null);
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);
  const [encerradoPeloUsuario, setEncerradoPeloUsuario] = useState(false);
  const areaComparacao = useRef<HTMLDivElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  /* A decisão aberta vive na URL: recarregar a página, voltar no navegador ou
     salvar o link continuam funcionando. O estado em memória é só um cache. */
  useEffect(() => {
    if (!idNaUrl) {
      setProblema(null);
      setEstado(null);
      setPergunta(null);
      setAuditoria(null);
      return;
    }
    if (problema?.id === idNaUrl) return;

    let cancelado = false;
    setOcupado(true);
    (async () => {
      try {
        const carregado = await api.ver(idNaUrl);
        if (cancelado) return;
        setProblema(carregado);
        registrarRecente(carregado.id, carregado.nome);
        await sincronizar(idNaUrl);
      } catch (e) {
        if (!cancelado) {
          setErro(
            e instanceof ApiError && e.status === 404
              ? t("tela.decisao.erro.naoExiste")
              : String(e),
          );
          router.replace("/decisao");
        }
      } finally {
        if (!cancelado) setOcupado(false);
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idNaUrl]);

  const sincronizar = useCallback(async (id: string) => {
    const novo = await api.estado(id);
    setEstado(novo);
    setAuditoria(await api.auditoria(id));

    // o diagnóstico só faz sentido quando há contradição; buscá-lo sempre
    // seria uma chamada por resposta sem nenhum uso
    setDiagnostico(novo.consistente ? null : await api.diagnostico(id));

    if (!novo.elicitacao_iniciada || novo.encerrado) {
      setPergunta(null);
      return;
    }
    const proxima = await api.pergunta(id);
    setPergunta("enunciado" in proxima ? (proxima as Pergunta) : null);
  }, []);

  const executar = async (acao: () => Promise<void>) => {
    setOcupado(true);
    setErro(null);
    try {
      await acao();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : String(e));
    } finally {
      setOcupado(false);
    }
  };

  const receber = (novo: Problema) => {
    registrarRecente(novo.id, novo.nome);
    // a navegação carrega a decisão pelo efeito acima, num caminho só
    router.push(`/decisao?id=${novo.id}`);
  };

  const ordenar = (ordem: string[]) =>
    executar(async () => {
      if (!problema) return;
      await api.ordenar(problema.id, ordem);
      await sincronizar(problema.id);
    });

  const responder = (escolha: "A" | "B" | "indiferente" | "não sei") =>
    executar(async () => {
      if (!problema) return;
      await api.responder(problema.id, escolha);
      await sincronizar(problema.id);
    });

  const julgar = (preferida: string, sobre: string) =>
    executar(async () => {
      if (!problema) return;
      await api.julgar(problema.id, preferida, sobre);
      await sincronizar(problema.id);
    });

  const salvarCurva = (criterio: string, pontos: Ponto[] | null) =>
    executar(async () => {
      if (!problema) return;
      setProblema(await api.curvaDeValor(problema.id, criterio, pontos));
    });

  const resolverConflito = (acao: Saida["acao"], sequencia?: number) =>
    executar(async () => {
      if (!problema) return;
      if (acao === "reordenar") {
        setRevisando("ordem");
        return;
      }
      await api.resolver(problema.id, acao, sequencia);
      await sincronizar(problema.id);
    });

  const desfazer = () =>
    executar(async () => {
      if (!problema) return;
      await api.desfazer(problema.id);
      await sincronizar(problema.id);
    });

  const recomecar = () => {
    setErro(null);
    router.push("/decisao");
  };

  /* Em que etapa o decisor está, e quais já pode revisitar. */
  const [revisando, setRevisando] = useState<Etapa | null>(null);
  /* O método permite parar antes de esgotar as perguntas: se o conjunto já
     está pequeno, olhar as faixas e decidir pelos dados é a avaliação holística
     prevista. Encerrar é escolha do decisor, não só do algoritmo. */
  const encerrado = (estado?.encerrado ?? false) || encerradoPeloUsuario;
  const etapaNatural: Etapa = !estado?.elicitacao_iniciada
    ? "ordem"
    : encerrado
      ? "resultado"
      : "perguntas";
  const etapa = revisando ?? etapaNatural;
  const alcancadas: Etapa[] = ["problema"];
  if (problema) alcancadas.push("ordem");
  if (estado?.elicitacao_iniciada) alcancadas.push("perguntas");
  if (estado?.analise) alcancadas.push("resultado");

  const irPara = (destino: Etapa) => {
    setErro(null);
    if (destino === "ordem" && estado?.elicitacao_iniciada) {
      // reordenar descarta as respostas; o aviso já foi dado na barra
      setRevisando("ordem");
      return;
    }
    setRevisando(destino === etapaNatural ? null : destino);
  };

  /* --- antes de existir um problema: so a entrada de dados --- */
  if (!problema) {
    return (
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-12">
        {/* As salvas continuam a um toque desde a primeira tela - antes elas
            eram um passo da trilha, o que obrigava a sair do cadastro para ver o
            que já existia -, mas não ocupam mais uma coluna da grade: o painel
            se ancora na borda da janela e sobrepõe. Sem coluna reservada, o
            cadastro usa a largura inteira e não muda de tamanho quando alguém
            abre ou fecha a lista. */}
        {/* "Nova decisão" é contexto, não o assunto da tela: o título de cada
            passo é a pergunta daquele passo, e vem de EntradaProblema. */}
        <p
          className="text-[13px] font-medium tracking-wide"
          style={{ color: "var(--tinta-3)" }}
        >
          {t("tela.decisao.nova")}
        </p>
        <div className="mt-5">
          <EntradaProblema onPronto={receber} />
        </div>
        <PainelSalvas onAbrir={receber} ocupado={ocupado} />
        {erro && (
          <p role="alert" className="mt-5 text-sm" style={{ color: "var(--erro)" }}>
            {erro}
          </p>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-10">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="display text-3xl font-semibold" style={{ color: "var(--tinta)" }}>
          {problema.nome}
        </h1>
        <button
          onClick={recomecar}
          className="text-sm underline underline-offset-2"
          style={{ color: "var(--tinta-3)" }}
        >
          {t("tela.decisao.outra")}
        </button>
      </div>

      <div className="mb-8">
        <Etapas
          atual={etapa}
          alcancadas={alcancadas}
          respostasEmRisco={Math.max((estado?.declaracoes ?? 0) - 1, 0)}
          onIr={irPara}
        />
      </div>

      {erro && (
        <div
          role="alert"
          className="mb-8 rounded-[var(--raio-controle)] border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--erro)",
            background: "var(--erro-suave)",
            color: "var(--erro)",
          }}
        >
          {erro}
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_260px] lg:gap-12">
        <div className="min-w-0 space-y-10">
          {etapa === "problema" && (
            <Secao
              titulo={t("tela.decisao.dados.titulo")}
              acessorio={
                <Voltar
                  rotulo={t("tela.decisao.voltarAoQueFazia")}
                  onClick={() => setRevisando(null)}
                />
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ color: "var(--tinta-fraca)" }}>
                      {/* mesma coluna da matriz de consequências no cadastro:
                          a frase já está no catálogo da estrutura */}
                      <th className="py-1.5 text-left font-normal">
                        {t("estrutura.matriz.coluna.alternativa")}
                      </th>
                      {problema.criterios.map((c) => (
                        <th key={c.chave} className="py-1.5 text-right font-normal">
                          {c.nome}
                          <span className="block text-[10px]">
                            {c.unidade}
                            {c.unidade && " · "}
                            {c.direcao === "max"
                              ? t("termo.maiorMelhor")
                              : t("termo.menorMelhor")}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(problema.consequencias).map(([alt, linha]) => (
                      <tr key={alt} className="border-t" style={{ borderColor: "var(--borda)" }}>
                        <td className="py-1.5" style={{ color: "var(--tinta-2)" }}>{alt}</td>
                        {problema.criterios.map((c) => (
                          <td key={c.chave} className="num py-1.5 text-right"
                            style={{ color: "var(--tinta-2)" }}>
                            {linha[c.chave]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!estado?.elicitacao_iniciada && (
                <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--borda)" }}>
                  {/* Aqui ela é consulta: o passo de verdade fica antes da
                      ordenação, que é onde a decisão sobre a escala cabe. */}
                  <AvaliacaoIntraCriterio
                    criterios={problema.criterios}
                    ocupado={ocupado}
                    onSalvar={salvarCurva}
                    comoResumo
                  />
                </div>
              )}

              <p className="mt-4 text-[12px]" style={{ color: "var(--tinta-fraca)" }}>
                {t("tela.decisao.dados.imutaveis")}
              </p>
            </Secao>
          )}

          {etapa === "ordem" && (
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
                criterios={problema.criterios}
                ocupado={ocupado}
                onConfirmar={(nova) => {
                  setRevisando(null);
                  ordenar(nova);
                }}
              />
            </div>
          )}

          {etapa === "perguntas" && estado?.elicitacao_iniciada && !encerrado && (
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
                     entre os dois cartões, onde o olho está. O botão de texto
                     continua embaixo: é redundante de propósito, porque nem
                     todo mundo lê um ícone redondo como "responder". */
                  onIndiferente={() => responder("indiferente")}
                  /* As saidas ficavam no canto do cabecalho da secao, acima e a
                     direita da pergunta: eram as unicas acoes visiveis da tela,
                     o que punha as escapatorias em mais destaque do que a
                     resposta. Aqui embaixo elas sao o que sao. */
                  rodape={
                    <>
                      <button
                        onClick={() => responder("indiferente")}
                        disabled={ocupado || !pergunta}
                        className="tatil flex items-center gap-1.5 text-sm disabled:opacity-40"
                        style={{ color: "var(--tinta-3)" }}
                      >
                        <Equals size={14} weight="bold" />
                        {t("tela.decisao.indiferentes")}
                      </button>
                      <button
                        onClick={() => responder("não sei")}
                        disabled={ocupado || !pergunta}
                        className="tatil flex items-center gap-1.5 text-sm disabled:opacity-40"
                        style={{ color: "var(--tinta-fraca)" }}
                        title={t("tela.decisao.naoSei.titulo")}
                      >
                        <Question size={14} weight="bold" />
                        {t("tela.decisao.naoSei")}
                      </button>
                    </>
                  }
                />
              ) : (
                <EsqueletoPergunta />
              )}
            </Secao>
          )}

          {estado?.elicitacao_iniciada && !estado.consistente && diagnostico && (
            <Secao titulo={t("tela.decisao.conflito.titulo")}>
              <Inconsistencia
                diagnostico={diagnostico}
                ocupado={ocupado}
                onResolver={resolverConflito}
              />
            </Secao>
          )}

          {/* Encerrada, a resposta vem primeiro. Ate o fim a comparacao vem
              antes porque e ferramenta de trabalho: e olhando para ela que
              se faz o julgamento holistico. Depois do fim ela vira consulta,
              e deixar o resultado abaixo de um grafico fazia a tela de
              resultado final comecar por outra coisa. Duas secoes irmas,
              entao inverter a coluna basta -- nada se move no DOM. */}
          <div
            className={`flex gap-10 ${
              encerrado ? "flex-col-reverse" : "flex-col"
            }`}
          >
          {(etapa === "perguntas" || etapa === "resultado") &&
            estado?.elicitacao_iniciada && estado.consistente && (
            <Secao
              titulo={t("tela.decisao.comparar.titulo")}
              acessorio={
                <span className="flex items-center gap-4">
                  <BotaoSalvarGrafico
                    alvo={areaComparacao}
                    nome={t("tela.decisao.comparar.arquivo", {
                      nome: problema.nome,
                    })}
                  />
                  {!encerrado && (
                    <button
                      onClick={() => setEncerradoPeloUsuario(true)}
                      className="tatil text-[12px] underline underline-offset-2"
                      style={{ color: "var(--tinta-3)" }}
                      title={t("tela.decisao.encerrar.titulo")}
                    >
                      {t("tela.decisao.encerrar")}
                    </button>
                  )}
                </span>
              }
            >
              <div ref={areaComparacao}>
              <Visualizacoes
                problema={problema}
                destaque={estado.analise?.potencialmente_otimas}
              />
              </div>
              <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--borda)" }}>
                <JulgamentoHolistico
                  alternativas={Object.keys(problema.consequencias)}
                  ocupado={ocupado}
                  onJulgar={julgar}
                />
              </div>
            </Secao>
          )}

          {(etapa === "perguntas" || etapa === "resultado") && estado?.analise && (
            <Secao
              /* "Resultado" é a mesma palavra da trilha de etapas, então a
                 chave vem de lá em vez de nascer duplicada aqui. */
              titulo={
                encerrado
                  ? t("estrutura.etapas.resultado")
                  : t("tela.decisao.ondeEstamos")
              }
              acessorio={
                encerradoPeloUsuario && !estado.encerrado ? (
                  <button
                    onClick={() => setEncerradoPeloUsuario(false)}
                    className="tatil text-[12px] underline underline-offset-2"
                    style={{ color: "var(--tinta-3)" }}
                  >
                    {t("tela.decisao.voltarAResponder")}
                  </button>
                ) : undefined
              }
            >
              {!estado.consistente ? (
                <p className="prosa text-sm" style={{ color: "var(--erro)" }}>
                  {estado.aviso}
                </p>
              ) : (
                <>
                  <SinteseResultado
                    problema={problema}
                    estado={estado}
                    encerrado={encerrado}
                  />
                  <ResultadoAnalise analise={estado.analise} />
                </>
              )}

              {estado.faixas_de_valor &&
                Object.keys(estado.faixas_de_valor).length > 0 && (
                  <div className="mt-8">
                    <RangeChart
                      titulo={t("tela.decisao.faixasValor.titulo")}
                      dica={
                        <Dica titulo={t("tela.decisao.faixasValor.dica.titulo")}>
                          <p>{t("tela.decisao.faixasValor.dica.corpo1")}</p>
                          <p>{t("tela.decisao.faixasValor.dica.corpo2")}</p>
                        </Dica>
                      }
                      faixas={paraFaixas(
                        estado.faixas_de_valor,
                        estado.analise.recomendacao,
                      )}
                    />
                  </div>
                )}

              {estado.faixas_de_peso && (
                <div className="mt-8">
                  <RangeChart
                    titulo={t("tela.decisao.faixasPeso.titulo")}
                    dica={
                      <Dica titulo={t("tela.decisao.faixasPeso.dica.titulo")}>
                        <p>{t("tela.decisao.faixasPeso.dica.corpo1")}</p>
                        <p>{t("tela.decisao.faixasPeso.dica.corpo2")}</p>
                      </Dica>
                    }
                    faixas={paraFaixas(estado.faixas_de_peso)}
                  />
                </div>
              )}
            </Secao>
          )}
          </div>

          {etapa === "resultado" && encerrado && estado?.consistente && (
            <Secao titulo={t("tela.decisao.sensibilidade.titulo")}>
              <SensibilidadeConsequencias
                decisaoId={problema.id}
                criterios={problema.criterios}
              />
            </Secao>
          )}

          {etapa !== "problema" && auditoria && auditoria.declaracoes.length > 0 && (
            <Secao titulo={t("tela.decisao.auditoria.titulo")}>
              <ol className="space-y-3">
                {auditoria.declaracoes.map((d) => (
                  <li key={d.sequencia} className="flex gap-3">
                    <span
                      className="num shrink-0 text-xs"
                      style={{ color: "var(--tinta-fraca)" }}
                    >
                      {String(d.sequencia).padStart(2, "0")}
                    </span>
                    <span className="prosa text-sm" style={{ color: "var(--tinta-2)" }}>
                      {d.declaracao}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="prosa mt-5 text-xs" style={{ color: "var(--tinta-fraca)" }}>
                {auditoria.leitura}
              </p>
            </Secao>
          )}
        </div>

        {/* A coluna da direita acompanha a rolagem e agora só carrega o
            progresso, que e o que muda a cada resposta. As decisoes salvas
            sairam daqui: elas sao um atalho, e enquanto dividiam esta coluna
            abrir e fechar a lista mudava a largura da coluna de trabalho - a
            pergunta de tradeoff refluia embaixo dos olhos de quem estava
            comparando as duas situacoes. */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <PainelProgresso
            problema={problema}
            estado={estado}
            onDesfazer={desfazer}
            podeDesfazer={!ocupado && (estado?.declaracoes ?? 0) > 0}
          />
        </div>
      </div>

      {/* Fora da grade de proposito: o painel se prende a borda direita da
          janela e sobrepoe o conteudo, entao nao pode ser filho de nada que
          participe do layout. */}
      <PainelSalvas onAbrir={receber} idAtual={problema.id} ocupado={ocupado} />
    </main>
  );
}

function paraFaixas(
  dados: Record<string, [number, number]>,
  destaque?: string | null,
): Faixa[] {
  return Object.entries(dados).map(([rotulo, [minimo, maximo]]) => ({
    rotulo,
    minimo,
    maximo,
    destaque: destaque ? rotulo === destaque : undefined,
  }));
}
