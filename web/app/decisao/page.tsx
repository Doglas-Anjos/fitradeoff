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
import { Suspense, useCallback, useEffect, useState } from "react";

import { Dica } from "@/components/ui";

import { EntradaProblema } from "@/components/EntradaProblema";
import { CurvaDeValor, type Ponto } from "@/components/CurvaDeValor";
import { Etapas, Voltar, type Etapa } from "@/components/Etapas";
import { Inconsistencia, type Diagnostico, type Saida } from "@/components/Inconsistencia";
import { Recentes } from "@/components/Recentes";
import { OrdenacaoPesos } from "@/components/OrdenacaoPesos";
import { PainelProgresso } from "@/components/PainelProgresso";
import { RangeChart, type Faixa } from "@/components/RangeChart";
import { JulgamentoHolistico } from "@/components/JulgamentoHolistico";
import { ResultadoAnalise } from "@/components/ResultadoAnalise";
import { SensibilidadeConsequencias } from "@/components/SensibilidadeConsequencias";
import { Visualizacoes } from "@/components/Visualizacoes";
import { TradeoffChart } from "@/components/TradeoffChart";
import { api, ApiError } from "@/lib/api";
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
  const router = useRouter();
  const parametros = useSearchParams();
  const idNaUrl = parametros.get("id");

  const [problema, setProblema] = useState<Problema | null>(null);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [pergunta, setPergunta] = useState<Pergunta | null>(null);
  const [auditoria, setAuditoria] = useState<Auditoria | null>(null);
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);
  const [curvaDe, setCurvaDe] = useState<string | null>(null);
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
              ? "Essa decisão não existe mais. Comece uma nova."
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
      setCurvaDe(null);
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
  const etapaNatural: Etapa = !estado?.elicitacao_iniciada
    ? "ordem"
    : estado.encerrado
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
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-12">
        <h1 className="display text-3xl font-semibold" style={{ color: "var(--tinta)" }}>
          Nova decisão
        </h1>
        <p className="prosa mt-3 text-[15px]" style={{ color: "var(--tinta-2)" }}>
          Comece pelas alternativas e pelos critérios. Você pode digitar, subir
          uma planilha ou partir de um caso pronto.
        </p>
        <div className="mt-8">
          <EntradaProblema onPronto={receber} />
        </div>
        <Recentes />
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
          Outra decisão
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
              titulo="Dados do problema"
              acessorio={
                <Voltar
                  rotulo="voltar ao que eu estava fazendo"
                  onClick={() => setRevisando(null)}
                />
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ color: "var(--tinta-fraca)" }}>
                      <th className="py-1.5 text-left font-normal">Alternativa</th>
                      {problema.criterios.map((c) => (
                        <th key={c.chave} className="py-1.5 text-right font-normal">
                          {c.nome}
                          <span className="block text-[10px]">
                            {c.unidade}
                            {c.unidade && " · "}
                            {c.direcao === "max" ? "maior é melhor" : "menor é melhor"}
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
                  <p className="mb-3 text-[13px] font-medium" style={{ color: "var(--tinta)" }}>
                    Como o valor cresce em cada critério
                  </p>
                  <p className="prosa mb-3 text-[12px]" style={{ color: "var(--tinta-3)" }}>
                    Por padrão o método assume crescimento linear. Se num critério
                    os primeiros ganhos valem mais que os últimos, vale ajustar.
                  </p>
                  <ul className="space-y-1.5">
                    {problema.criterios.map((c) => (
                      <li key={c.chave} className="flex items-center gap-3 text-[13px]">
                        <span className="min-w-0 flex-1 truncate" style={{ color: "var(--tinta-2)" }}>
                          {c.nome}
                        </span>
                        <span style={{ color: "var(--tinta-fraca)" }}>
                          {c.curva_de_valor ? `curva com ${c.curva_de_valor.length} pontos` : "linear"}
                        </span>
                        <button
                          onClick={() => setCurvaDe(c.chave)}
                          className="tatil underline underline-offset-2"
                          style={{ color: "var(--accent)" }}
                        >
                          ajustar
                        </button>
                      </li>
                    ))}
                  </ul>

                  {curvaDe && (
                    <div className="mt-4">
                      <CurvaDeValor
                        criterio={problema.criterios.find((c) => c.chave === curvaDe)!}
                        inicial={
                          problema.criterios.find((c) => c.chave === curvaDe)
                            ?.curva_de_valor ?? undefined
                        }
                        onSalvar={(pontos) => salvarCurva(curvaDe, pontos)}
                        onCancelar={() => setCurvaDe(null)}
                      />
                    </div>
                  )}
                </div>
              )}

              <p className="mt-4 text-[12px]" style={{ color: "var(--tinta-fraca)" }}>
                Para mudar os dados, comece outra decisão — alterar os números
                agora invalidaria as respostas que você já deu.
              </p>
            </Secao>
          )}

          {etapa === "ordem" && (
            <div>
              {estado?.elicitacao_iniciada && (
                <div className="mb-4">
                  <Voltar
                    rotulo="voltar sem mudar a ordem"
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

          {etapa === "perguntas" && estado?.elicitacao_iniciada && !estado.encerrado && (
            <Secao
              titulo={`Pergunta ${Math.max((estado.declaracoes ?? 1) - 1, 0) + 1}`}
              acessorio={
                <span className="flex items-center gap-4">
                  <button
                    onClick={() => responder("indiferente")}
                    disabled={ocupado || !pergunta}
                    className="tatil flex items-center gap-1.5 text-sm disabled:opacity-40"
                    style={{ color: "var(--tinta-3)" }}
                  >
                    <Equals size={14} weight="bold" />
                    são indiferentes
                  </button>
                  <button
                    onClick={() => responder("não sei")}
                    disabled={ocupado || !pergunta}
                    className="tatil flex items-center gap-1.5 text-sm disabled:opacity-40"
                    style={{ color: "var(--tinta-fraca)" }}
                    title="Encerra este par sem assumir nada sobre os pesos"
                  >
                    <Question size={14} weight="bold" />
                    não sei
                  </button>
                </span>
              }
            >
              {pergunta && !ocupado ? (
                <TradeoffChart
                  pergunta={pergunta}
                  desabilitado={ocupado}
                  onSelect={responder}
                />
              ) : (
                <EsqueletoPergunta />
              )}
            </Secao>
          )}

          {estado?.elicitacao_iniciada && !estado.consistente && diagnostico && (
            <Secao titulo="Precisa da sua decisão">
              <Inconsistencia
                diagnostico={diagnostico}
                ocupado={ocupado}
                onResolver={resolverConflito}
              />
            </Secao>
          )}

          {(etapa === "perguntas" || etapa === "resultado") &&
            estado?.elicitacao_iniciada && estado.consistente && (
            <Secao titulo="Comparar as alternativas">
              <Visualizacoes
                problema={problema}
                destaque={estado.analise?.potencialmente_otimas}
              />
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
            <Secao titulo={estado.encerrado ? "Resultado" : "Onde estamos"}>
              {!estado.consistente ? (
                <p className="prosa text-sm" style={{ color: "var(--erro)" }}>
                  {estado.aviso}
                </p>
              ) : (
                <>
                  <p
                    className="text-[17px]"
                    style={{
                      color: estado.analise.resolvido
                        ? "var(--sucesso)"
                        : "var(--tinta)",
                    }}
                  >
                    {estado.analise.resumo}
                  </p>
                  <ResultadoAnalise analise={estado.analise} />
                </>
              )}

              {estado.faixas_de_valor &&
                Object.keys(estado.faixas_de_valor).length > 0 && (
                  <div className="mt-8">
                    <RangeChart
                      titulo="Valor global possível de cada alternativa"
                      dica={
                        <Dica titulo="Por que um intervalo">
                          <p>
                            Como você ainda não fixou os pesos, o valor de cada
                            alternativa não é um número: é uma faixa.
                          </p>
                          <p>
                            Faixas que não se sobrepõem já decidem. Quando se
                            cruzam, ainda falta informação.
                          </p>
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
                    titulo="Peso ainda possível de cada critério"
                    dica={
                      <Dica titulo="Os pesos que você nunca informou">
                        <p>
                          O método deduz estas faixas das suas respostas. Você
                          não precisou arbitrar nenhum número.
                        </p>
                        <p>
                          Quanto mais você responde, mais elas estreitam.
                        </p>
                      </Dica>
                    }
                    faixas={paraFaixas(estado.faixas_de_peso)}
                  />
                </div>
              )}
            </Secao>
          )}

          {etapa === "resultado" && estado?.encerrado && estado.consistente && (
            <Secao titulo="Quanto isso depende dos dados">
              <SensibilidadeConsequencias
                decisaoId={problema.id}
                criterios={problema.criterios}
              />
            </Secao>
          )}

          {etapa !== "problema" && auditoria && auditoria.declaracoes.length > 0 && (
            <Secao titulo="Por que este resultado">
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

        <PainelProgresso
          problema={problema}
          estado={estado}
          onDesfazer={desfazer}
          podeDesfazer={!ocupado && (estado?.declaracoes ?? 0) > 0}
        />
      </div>
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
