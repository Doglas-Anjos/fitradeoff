"use client";

/**
 * Entrada do problema: por planilha, na mao, ou pelo caso de exemplo.
 *
 * A direcao de cada criterio e o unico dado que nao da para inferir dos
 * numeros, e errar nela inverte a decisao inteira -- por isso ela aparece como
 * escolha explicita em cada coluna, com o sentido escrito por extenso e nao
 * escondido atras de "max" e "min".
 */

import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  DownloadSimple,
  FileArrowUp,
  FileXls,
  ListNumbers,
  Plus,
  SlidersHorizontal,
  Stack,
  Trash,
  TrendDown,
  TrendUp,
  Trophy,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";

import { Botao, Campo, Dica, Entrada, PESO_ICONE } from "@/components/ui";
import { useEstadoPersistido } from "@/lib/persistencia";
import { api, ApiError } from "@/lib/api";
import type { Direcao, Problema, Problematica } from "@/lib/types";

const EXEMPLO = {
  nome: "Seleção de fornecedor",
  alternativas: ["Fornecedor A", "Fornecedor B", "Fornecedor C", "Fornecedor D"],
  criterios: [
    { chave: "qualidade", nome: "Índice de qualidade", direcao: "max" as Direcao, unidade: "" },
    { chave: "custo", nome: "Custo unitário", direcao: "min" as Direcao, unidade: "R$/un" },
    { chave: "prazo", nome: "Prazo de entrega", direcao: "min" as Direcao, unidade: "dias" },
    { chave: "capacidade", nome: "Capacidade mensal", direcao: "max" as Direcao, unidade: "mil un." },
  ],
  consequencias: [
    [0.82, 12.5, 30, 120],
    [0.95, 15.8, 12, 90],
    [0.71, 10.2, 45, 200],
    [0.88, 14.1, 20, 140],
  ],
};

const PROBLEMATICAS: {
  valor: Problematica;
  rotulo: string;
  ajuda: string;
  Icone: typeof Trophy;
}[] = [
  {
    valor: "escolha",
    rotulo: "Escolher a melhor",
    ajuda: "Termina com uma alternativa recomendada.",
    Icone: Trophy,
  },
  {
    valor: "ranking",
    rotulo: "Ordenar todas",
    ajuda: "Do primeiro ao último, ou faixas de posição.",
    Icone: ListNumbers,
  },
  {
    valor: "sorting",
    rotulo: "Classificar em faixas",
    ajuda: "Aloca em classes que você define.",
    Icone: SlidersHorizontal,
  },
  {
    valor: "portfolio",
    rotulo: "Montar carteira",
    ajuda: "Escolhe um conjunto dentro de um orçamento.",
    Icone: Stack,
  },
];

type Modo = "manual" | "planilha";

interface Coluna {
  nome: string;
  direcao: Direcao;
  unidade: string;
}

const colunaVazia = (): Coluna => ({ nome: "", direcao: "max", unidade: "" });

interface Rascunho {
  modo: Modo;
  problematica: Problematica;
  nome: string;
  colunas: Coluna[];
  linhas: { nome: string; valores: string[] }[];
}

const RASCUNHO_VAZIO: Rascunho = {
  modo: "manual",
  problematica: "escolha",
  nome: "",
  colunas: [colunaVazia(), colunaVazia()],
  linhas: [
    { nome: "", valores: ["", ""] },
    { nome: "", valores: ["", ""] },
  ],
};

function chaveDe(nome: string, indice: number): string {
  const base = nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || `criterio_${indice + 1}`;
}

export function EntradaProblema({
  onPronto,
}: {
  onPronto: (problema: Problema) => void;
}) {
  /* O que foi digitado e ainda não virou decisão fica no navegador: fechar a
     aba sem querer, ou ir conferir um número na planilha, não pode custar o
     preenchimento inteiro. */
  const [rascunho, setRascunho, limparRascunho] = useEstadoPersistido<Rascunho>(
    "rascunho",
    RASCUNHO_VAZIO,
  );
  const { modo, problematica, nome, colunas, linhas } = rascunho;
  const alterar = (parcial: Partial<Rascunho>) => setRascunho({ ...rascunho, ...parcial });

  const setModo = (v: Modo) => alterar({ modo: v });
  const setProblematica = (v: Problematica) => alterar({ problematica: v });
  const setNome = (v: string) => alterar({ nome: v });
  const setColunas = (v: Coluna[]) => alterar({ colunas: v });
  const setLinhas = (v: { nome: string; valores: string[] }[]) => alterar({ linhas: v });
  const [erro, setErro] = useState<string | null>(null);
  const [campoComErro, setCampoComErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [arquivoLido, setArquivoLido] = useState<string | null>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);

  const falhar = (e: unknown) =>
    setErro(e instanceof ApiError ? e.message : String(e));

  const addCriterio = () => {
    setColunas([...colunas, colunaVazia()]);
    setLinhas(linhas.map((l) => ({ ...l, valores: [...l.valores, ""] })));
  };

  const removeCriterio = (i: number) => {
    if (colunas.length <= 2) return;
    setColunas(colunas.filter((_, j) => j !== i));
    setLinhas(linhas.map((l) => ({ ...l, valores: l.valores.filter((_, j) => j !== i) })));
  };

  const addAlternativa = () =>
    setLinhas([...linhas, { nome: "", valores: colunas.map(() => "") }]);

  const removeAlternativa = (i: number) => {
    if (linhas.length <= 2) return;
    setLinhas(linhas.filter((_, j) => j !== i));
  };

  const criar = async (dados: Parameters<typeof api.criar>[0]) => {
    setOcupado(true);
    setErro(null);
    try {
      const criado = await api.criar(dados);
      limparRascunho();
      onPronto(criado);
    } catch (e) {
      falhar(e);
    } finally {
      setOcupado(false);
    }
  };

  const enviarManual = () => {
    setCampoComErro(null);

    const semNome = colunas.findIndex((c) => !c.nome.trim());
    if (semNome >= 0) {
      setCampoComErro(`criterio-${semNome}`);
      return setErro(`Dê um nome ao critério ${semNome + 1}.`);
    }

    const linhaSemNome = linhas.findIndex((l) => !l.nome.trim());
    if (linhaSemNome >= 0) {
      setCampoComErro(`alternativa-${linhaSemNome}`);
      return setErro(`Dê um nome à alternativa ${linhaSemNome + 1}.`);
    }

    const consequencias: number[][] = [];
    for (const [i, linha] of linhas.entries()) {
      const valores: number[] = [];
      for (const [j, bruto] of linha.valores.entries()) {
        const numero = Number(bruto.replace(",", "."));
        if (bruto.trim() === "" || Number.isNaN(numero)) {
          setCampoComErro(`celula-${i}-${j}`);
          return setErro(
            `O desempenho de "${linha.nome}" em "${colunas[j].nome}" precisa ser um número.`,
          );
        }
        valores.push(numero);
      }
      consequencias.push(valores);
    }

    void criar({
      nome: nome.trim() || "Decisão sem nome",
      alternativas: linhas.map((l) => l.nome.trim()),
      criterios: colunas.map((c, i) => ({
        chave: chaveDe(c.nome, i),
        nome: c.nome.trim(),
        direcao: c.direcao,
        unidade: c.unidade.trim(),
      })),
      consequencias,
      problematica,
    });
  };

  const enviarPlanilha = async (arquivo: File) => {
    setOcupado(true);
    setErro(null);
    setArquivoLido(arquivo.name);
    try {
      const corpo = new FormData();
      corpo.append("arquivo", arquivo);
      corpo.append("problematica", problematica);
      const resposta = await fetch("/api/decisoes/importar", {
        method: "POST",
        body: corpo,
      });
      const json = await resposta.json();
      if (!resposta.ok) throw new ApiError(resposta.status, json.detail ?? "Falha");
      limparRascunho();
      onPronto(json as Problema);
    } catch (e) {
      falhar(e);
      setArquivoLido(null);
    } finally {
      setOcupado(false);
      if (inputArquivo.current) inputArquivo.current.value = "";
    }
  };

  const painel = {
    borderColor: "var(--borda)",
    background: "var(--painel)",
  };

  return (
    <div className="space-y-10">
      {/* o que se quer da decisao */}
      <fieldset>
        <legend className="mb-1 flex items-center gap-1.5 text-[13px] font-medium">
          <span style={{ color: "var(--tinta)" }}>O que você quer decidir?</span>
          <Dica titulo="As quatro leituras">
            <p>
              Todas usam as mesmas perguntas. O que muda é a resposta no fim.
            </p>
            <p>
              Você pode trocar depois, sem responder nada de novo.
            </p>
          </Dica>
        </legend>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {PROBLEMATICAS.map(({ valor, rotulo, ajuda, Icone }) => {
            const ativa = problematica === valor;
            return (
              <label
                key={valor}
                className="tatil flex cursor-pointer items-start gap-3 rounded-[var(--raio-painel)] border p-3.5"
                style={{
                  ...painel,
                  borderColor: ativa ? "var(--accent)" : "var(--borda)",
                  boxShadow: ativa ? "inset 0 0 0 1px var(--accent)" : "none",
                }}
              >
                <input
                  type="radio"
                  name="problematica"
                  checked={ativa}
                  onChange={() => setProblematica(valor)}
                  className="sr-only"
                />
                <Icone
                  size={19}
                  weight={ativa ? "fill" : "regular"}
                  style={{ color: ativa ? "var(--accent)" : "var(--tinta-fraca)" }}
                  className="mt-0.5 shrink-0"
                />
                <span className="min-w-0">
                  <span
                    className="block text-sm font-medium"
                    style={{ color: "var(--tinta)" }}
                  >
                    {rotulo}
                  </span>
                  <span className="block text-[12px]" style={{ color: "var(--tinta-3)" }}>
                    {ajuda}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* como entrar com os dados */}
      <div>
        <div className="flex gap-1 border-b" style={{ borderColor: "var(--borda)" }}>
          {([
            ["manual", "Digitar", Plus],
            ["planilha", "Importar planilha", FileXls],
          ] as const).map(([valor, rotulo, Icone]) => {
            const ativo = modo === valor;
            return (
              <button
                key={valor}
                onClick={() => setModo(valor)}
                className="tatil -mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm"
                style={{
                  borderColor: ativo ? "var(--accent)" : "transparent",
                  color: ativo ? "var(--tinta)" : "var(--tinta-3)",
                  fontWeight: ativo ? 500 : 400,
                }}
              >
                <Icone size={16} weight={ativo ? "fill" : "regular"} />
                {rotulo}
              </button>
            );
          })}
        </div>

        {modo === "manual" && (
          <div className="mt-6 space-y-6">
            <Campo
              rotulo="Nome da decisão"
              ajuda="Só para você reconhecer depois."
            >
              {(props) => (
                <Entrada
                  {...props}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seleção de fornecedor"
                />
              )}
            </Campo>

            <div>
              <div className="mb-3 flex items-center gap-1.5">
                <span className="text-[13px] font-medium" style={{ color: "var(--tinta)" }}>
                  Alternativas e critérios
                </span>
                <Dica titulo="Como preencher">
                  <p>
                    <strong>Alternativas</strong> são as opções entre as quais
                    você escolhe. <strong>Critérios</strong> são os aspectos que
                    você compara.
                  </p>
                  <p>
                    Preencha o desempenho real de cada alternativa: R$ 12,50, 30
                    dias, 0,82. Nada de notas de 1 a 10 — o método trabalha com
                    os números do problema.
                  </p>
                </Dica>
              </div>

              <div
                className="overflow-x-auto rounded-[var(--raio-painel)] border p-4"
                style={painel}
              >
                <table className="w-full border-separate border-spacing-2">
                  <thead>
                    <tr>
                      <th className="w-44 text-left align-bottom">
                        <div className="flex flex-col gap-1.5">
                          <span
                            className="text-[11px] font-medium"
                            style={{ color: "var(--tinta-3)" }}
                          >
                            Alternativa
                          </span>
                          <span
                            className="text-[11px] font-normal"
                            style={{ color: "var(--tinta-fraca)" }}
                          >
                            nome · unidade · o que é melhor
                          </span>
                        </div>
                      </th>
                      {colunas.map((c, j) => (
                        <th key={j} className="align-bottom">
                          <div className="flex w-40 flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span
                                className="text-[11px] font-medium"
                                style={{ color: "var(--tinta-3)" }}
                              >
                                Critério {j + 1}
                              </span>
                              {colunas.length > 2 && (
                                <button
                                  onClick={() => removeCriterio(j)}
                                  aria-label={`Remover critério ${j + 1}`}
                                  className="tatil"
                                  style={{ color: "var(--tinta-fraca)" }}
                                >
                                  <Trash size={13} />
                                </button>
                              )}
                            </div>

                            <Entrada
                              value={c.nome}
                              invalido={campoComErro === `criterio-${j}`}
                              onChange={(e) => {
                                const copia = [...colunas];
                                copia[j] = { ...c, nome: e.target.value };
                                setColunas(copia);
                              }}
                              placeholder={
                                ["Custo unitário", "Prazo de entrega", "Qualidade"][j] ??
                                `Critério ${j + 1}`
                              }
                              aria-label={`Nome do critério ${j + 1}`}
                              className="!py-1.5 !text-[13px]"
                            />
                            <Entrada
                              value={c.unidade}
                              onChange={(e) => {
                                const copia = [...colunas];
                                copia[j] = { ...c, unidade: e.target.value };
                                setColunas(copia);
                              }}
                              placeholder={["R$/un", "dias", "índice"][j] ?? "unidade"}
                              aria-label={`Unidade do critério ${j + 1}`}
                              className="!py-1 !text-[11px]"
                            />

                            {/* a direcao e o dado que inverte a decisao se
                                estiver errado: aparece por extenso, com seta */}
                            <div
                              className="flex overflow-hidden rounded-[var(--raio-controle)] border"
                              style={{ borderColor: "var(--borda-forte)" }}
                              role="radiogroup"
                              aria-label={`Direção do critério ${j + 1}: o que é melhor`}
                            >
                              {([
                                ["max", "maior", TrendUp],
                                ["min", "menor", TrendDown],
                              ] as const).map(([dir, texto, Icone]) => {
                                const ativa = c.direcao === dir;
                                return (
                                  <button
                                    key={dir}
                                    type="button"
                                    role="radio"
                                    aria-checked={ativa}
                                    onClick={() => {
                                      const copia = [...colunas];
                                      copia[j] = { ...c, direcao: dir };
                                      setColunas(copia);
                                    }}
                                    title={`${texto} é melhor`}
                                    className="tatil flex flex-1 items-center justify-center gap-1 whitespace-nowrap py-1.5 text-[11px]"
                                    style={{
                                      background: ativa
                                        ? "var(--accent-suave)"
                                        : "transparent",
                                      color: ativa
                                        ? "var(--accent)"
                                        : "var(--tinta-3)",
                                      fontWeight: ativa ? 500 : 400,
                                    }}
                                  >
                                    <Icone size={12} weight="bold" />
                                    {texto}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </th>
                      ))}
                      <th className="align-bottom">
                        <Botao
                          variante="contorno"
                          onClick={addCriterio}
                          icone={<Plus size={13} weight="bold" />}
                          className="!px-2.5 !py-1.5 !text-[12px]"
                        >
                          critério
                        </Botao>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {linhas.map((linha, i) => (
                      <tr key={i}>
                        <td>
                          <Entrada
                            value={linha.nome}
                            invalido={campoComErro === `alternativa-${i}`}
                            onChange={(e) => {
                              const copia = [...linhas];
                              copia[i] = { ...linha, nome: e.target.value };
                              setLinhas(copia);
                            }}
                            placeholder={`Fornecedor ${String.fromCharCode(65 + i)}`}
                            aria-label={`Nome da alternativa ${i + 1}`}
                            className="!py-1.5 !text-[13px]"
                          />
                        </td>
                        {linha.valores.map((valor, j) => (
                          <td key={j}>
                            <Entrada
                              value={valor}
                              invalido={campoComErro === `celula-${i}-${j}`}
                              onChange={(e) => {
                                const copia = [...linhas];
                                const valores = [...linha.valores];
                                valores[j] = e.target.value;
                                copia[i] = { ...linha, valores };
                                setLinhas(copia);
                              }}
                              inputMode="decimal"
                              placeholder="0"
                              aria-label={`${linha.nome || `Alternativa ${i + 1}`}, ${colunas[j].nome || `critério ${j + 1}`}`}
                              className="num !py-1.5 text-right !text-[13px]"
                            />
                          </td>
                        ))}
                        <td>
                          {linhas.length > 2 && (
                            <button
                              onClick={() => removeAlternativa(i)}
                              aria-label={`Remover alternativa ${i + 1}`}
                              className="tatil px-1"
                              style={{ color: "var(--tinta-fraca)" }}
                            >
                              <Trash size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <Botao
                  variante="contorno"
                  onClick={addAlternativa}
                  icone={<Plus size={13} weight="bold" />}
                  className="mt-2 !px-2.5 !py-1.5 !text-[12px]"
                >
                  alternativa
                </Botao>
              </div>
            </div>

            {erro && (
              <p
                role="alert"
                className="flex items-center gap-2 text-sm"
                style={{ color: "var(--erro)" }}
              >
                {erro}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <Botao onClick={enviarManual} disabled={ocupado}>
                Criar decisão
              </Botao>
              <button
                onClick={() => criar({ ...EXEMPLO, problematica })}
                disabled={ocupado}
                className="text-sm underline underline-offset-2 disabled:opacity-45"
                style={{ color: "var(--tinta-3)" }}
              >
                ou preencher com um caso de exemplo
              </button>
            </div>
          </div>
        )}

        {modo === "planilha" && (
          <div className="mt-6 space-y-5">
            <a
              href="/api/modelo-planilha"
              className="tatil inline-flex items-center gap-2 rounded-[var(--raio-controle)] border px-4 py-2 text-sm font-medium"
              style={{ borderColor: "var(--borda-forte)", color: "var(--tinta)" }}
            >
              <DownloadSimple size={16} weight={PESO_ICONE > 1 ? "regular" : "bold"} />
              Baixar planilha-modelo
            </a>

            {/* area de soltar: o alvo e a area inteira, nao so o botao */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setArrastando(true);
              }}
              onDragLeave={() => setArrastando(false)}
              onDrop={(e) => {
                e.preventDefault();
                setArrastando(false);
                const arquivo = e.dataTransfer.files?.[0];
                if (arquivo) void enviarPlanilha(arquivo);
              }}
              className="rounded-[var(--raio-painel)] border-2 border-dashed p-8 text-center transition-colors"
              style={{
                borderColor: arrastando ? "var(--accent)" : "var(--borda-forte)",
                background: arrastando ? "var(--accent-suave)" : "var(--painel)",
              }}
            >
              {ocupado ? (
                <>
                  <div className="esqueleto mx-auto h-8 w-8 rounded-full" />
                  <p className="mt-3 text-sm" style={{ color: "var(--tinta-2)" }}>
                    Lendo {arquivoLido}…
                  </p>
                </>
              ) : (
                <>
                  <FileArrowUp
                    size={30}
                    weight="regular"
                    style={{ color: arrastando ? "var(--accent)" : "var(--tinta-fraca)" }}
                    className="mx-auto"
                  />
                  <p className="mt-3 text-sm" style={{ color: "var(--tinta)" }}>
                    Arraste a planilha aqui
                  </p>
                  <p className="mt-1 text-[12px]" style={{ color: "var(--tinta-3)" }}>
                    .xlsx ou .csv — até 2 MB
                  </p>
                  <Botao
                    variante="contorno"
                    onClick={() => inputArquivo.current?.click()}
                    className="mt-4"
                  >
                    Escolher arquivo
                  </Botao>
                  <input
                    ref={inputArquivo}
                    type="file"
                    accept=".xlsx,.xlsm,.csv,.txt"
                    className="sr-only"
                    onChange={(e) => {
                      const arquivo = e.target.files?.[0];
                      if (arquivo) void enviarPlanilha(arquivo);
                    }}
                  />
                </>
              )}
            </div>

            {erro && (
              <div
                role="alert"
                className="rounded-[var(--raio-controle)] border px-4 py-3 text-sm"
                style={{
                  borderColor: "var(--erro)",
                  background: "var(--erro-suave)",
                  color: "var(--erro)",
                }}
              >
                {erro}
              </div>
            )}

            <div
              className="rounded-[var(--raio-painel)] border p-4"
              style={painel}
            >
              <p
                className="mb-3 flex items-center gap-1.5 text-[13px] font-medium"
                style={{ color: "var(--tinta)" }}
              >
                <CheckCircle size={15} weight="fill" style={{ color: "var(--sucesso)" }} />
                O que a planilha precisa ter
              </p>
              <table className="num w-full text-[11px]">
                <tbody>
                  {[
                    ["Seleção de fornecedor", "Qualidade", "Custo", "Prazo"],
                    ["direcao", "max", "min", "min"],
                    ["unidade", "", "R$/un", "dias"],
                    ["Fornecedor A", "0.82", "12.5", "30"],
                  ].map((linha, i) => (
                    <tr key={i}>
                      {linha.map((celula, j) => (
                        <td
                          key={j}
                          className="border px-2 py-1"
                          style={{
                            borderColor: "var(--borda)",
                            color:
                              i < 3 && j === 0
                                ? "var(--accent)"
                                : "var(--tinta-2)",
                            background:
                              i === 0 ? "var(--painel-fundo)" : "transparent",
                          }}
                        >
                          {celula}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[12px]" style={{ color: "var(--tinta-3)" }}>
                A linha <strong>direcao</strong> é obrigatória: sem ela não dá
                para saber se um número alto é bom ou ruim. O formato .xls
                (Excel 97-2003) não é aceito — salve como .xlsx.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
