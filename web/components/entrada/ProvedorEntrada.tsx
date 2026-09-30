"use client";

/**
 * O estado e as regras da sequência de cadastro.
 *
 * O que atravessa todos os passos é um rascunho -- guardado no navegador,
 * porque fechar a aba no meio de um cadastro de doze alternativas não pode
 * custar o cadastro inteiro. Em volta dele ficam o passo em que se está, a
 * falha da última validação e as duas formas de criar a decisão: a partir do
 * que foi digitado e a partir de uma planilha conferida.
 *
 * Tudo isso vivia no corpo do orquestrador, e cada passo recebia por props o
 * pedaço de que precisava. Aqui vira um provedor com dois contextos: o do
 * rascunho, que é uma interface que os passos também aceitam de outro provedor
 * (ver `contextoRascunho`), e o do fluxo, que só existe dentro da sequência.
 */

import { createContext, use, useState } from "react";

import type { Conferido } from "@/components/ConferenciaImportacao";
import { avisar } from "@/components/Avisos";
import { ContextoRascunho, type ValorRascunho } from "@/components/entrada/contextoRascunho";
import { trilhaDe } from "@/components/entrada/trilha";
import { api, type PlanilhaLida, mensagemDeErro } from "@/lib/api";
import type { Exemplo } from "@/lib/exemplos";
import { useIdioma } from "@/lib/i18n";
/* O catálogo dos módulos de domínio: os casos prontos e as recusas da validação
   do rascunho guardam chaves, e é aqui que elas viram texto. */
import { traduzir } from "@/lib/i18n/dominio";
import "@/lib/i18n/entrada";
import { useRascunhoSincronizado } from "@/lib/rascunhoSincronizado";
import {
  RASCUNHO_VAZIO,
  configuracaoDe,
  criterioVazio,
  custosDe,
  ehCarteira,
  ehFalha,
  exigeAjustes,
  normalizar,
  numeroDe,
  paraCriacao,
  validarEstrutura,
  validarMatriz,
  type Falha,
  type Passo,
  type Rascunho,
} from "@/lib/rascunho";
import type { Problema } from "@/lib/types";

export interface ValorFluxo {
  estado: {
    /** O passo que os dados sustentam, que pode não ser o gravado. */
    passo: Passo;
    trilha: ReturnType<typeof trilhaDe>;
    /** A única saída do passo, e o nome do destino; nenhuma no primeiro. */
    anterior: { chave: string; ir: () => void } | null;
    /** A falha da última validação, já no idioma da tela. */
    erro: string | null;
    /** Nem alternativa nem critério com nome: nada a perder. */
    cadastroEmBranco: boolean;
    /** A planilha lida e ainda não conferida. */
    lida: PlanilhaLida | null;
    arquivoLido: string | null;
    /** A planilha já conferida, esperando o que o objetivo pede. */
    conferido: Conferido | null;
    /** A soma dos custos, que o passo do orçamento mostra como referência. */
    totalDosCustos: number | null;
  };
  acoes: {
    continuarDaEscolha: () => void;
    salvarEstrutura: () => void;
    aplicarExemplo: (exemplo: Exemplo, substituindo: boolean) => void;
    continuarDaMatriz: () => void;
    analisar: (entrada: File | string) => void;
    confirmarImportacao: (dados: Conferido) => void;
    cancelarConferencia: () => void;
    criarComAjustes: () => void;
  };
}

const ContextoFluxo = createContext<ValorFluxo | null>(null);

/** As regras do passo em que o componente está, dentro da sequência. */
export function useFluxo(): ValorFluxo {
  const valor = use(ContextoFluxo);
  if (!valor) throw new Error("useFluxo precisa de <ProvedorEntrada> acima.");
  return valor;
}

/**
 * O rascunho sincronizado e o que se faz com ele em cada passo.
 *
 * Devolve os valores dos dois contextos; quem os publica é `ProvedorEntrada`.
 */
function useFluxoEntrada(
  onPronto: (problema: Problema) => void,
): { rascunho: ValorRascunho; fluxo: ValorFluxo } {
  const { t } = useIdioma();

  /* O que foi digitado e ainda não virou decisão fica guardado nos dois lados:
     no navegador a cada tecla, para fechar a aba sem querer não custar o
     preenchimento; e no servidor em rajadas, para trocar de máquina ou limpar
     os dados do site também não custar. */
  const [salvo, gravar, limparRascunho] = useRascunhoSincronizado<Rascunho>(
    "rascunho",
    RASCUNHO_VAZIO,
  );
  const rascunho = normalizar(salvo);
  /* O gravado passa pela mesma normalização que a tela lê: quem muda o
     rascunho parte do que está vendo, nunca da forma crua do armazenamento. */
  const atualizar = (mudar: (anterior: Rascunho) => Rascunho) =>
    gravar((anterior) => mudar(normalizar(anterior)));

  const [falha, setFalha] = useState<Falha | null>(null);
  const irPara = (passo: Passo) => {
    setFalha(null);
    atualizar((r) => ({ ...r, passo }));
  };

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
  /* A mensagem do servidor já vem escrita, sem chave: entra pela chave que só
     repassa o texto, para a tela ter um caminho de erro, não dois. */
  const reportarServidor = (e: unknown) =>
    reportar({ chave: "dominio.erro.api", valores: { detalhe: mensagemDeErro(e) } });

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

  const criar = async (dados: Parameters<typeof api.criar>[0]) => {
    setOcupado(true);
    setFalha(null);
    try {
      const criado = await api.criar(dados);
      limparRascunho();
      onPronto(criado);
    } catch (e) {
      reportarServidor(e);
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

  /* O nome digitado sobrevive quando nada foi substituido -- so quem confirmou
     a troca pediu para perder o que tinha. */
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
    atualizar((r) => ({
      ...r,
      problematica: exemplo.sugerida,
      nome: substituindo ? t(exemplo.nome) : r.nome.trim() || t(exemplo.nome),
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
    }));
  };

  /* --- passo 3 (manual): desempenhos --- */

  const criarDoRascunho = () => {
    const corpo = paraCriacao(rascunho, t("entrada.conferencia.semNome"));
    if (ehFalha(corpo)) return reportar(corpo);
    void criar(corpo);
  };

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

  /* --- planilha --- */

  /* Ler não é criar: a planilha volta para conferência e só vira decisão depois
     que o decisor disser que está certa. A direção de um critério inverte o
     resultado inteiro sem dar sinal, e é o que mais chega errado. */
  const analisar = async (entrada: File | string) => {
    setOcupado(true);
    setFalha(null);
    setArquivoLido(
      typeof entrada === "string" ? t("entrada.planilha.dadosColados") : entrada.name,
    );
    try {
      setLida(await api.previaPlanilha(entrada));
    } catch (e) {
      reportarServidor(e);
      setArquivoLido(null);
    } finally {
      setOcupado(false);
    }
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

  const confirmarImportacao = (dados: Conferido) => {
    if (exigeAjustes(rascunho.problematica)) {
      setConferido(dados);
      irPara("ajustes");
      return;
    }
    criarImportada(dados);
  };

  const cancelarConferencia = () => {
    setLida(null);
    setArquivoLido(null);
    setFalha(null);
  };

  /* --- passo final: o que o objetivo exige --- */

  const criarComAjustes = () =>
    conferido ? criarImportada(conferido) : criarDoRascunho();

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

  return {
    rascunho: {
      estado: rascunho,
      acoes: { atualizar, irPara },
      meta: { campoComErro: falha?.campo ?? null, ocupado },
    },
    fluxo: {
      estado: {
        passo,
        trilha: trilhaDe(rascunho.modo, rascunho.problematica, t),
        anterior,
        /* A falha vem descrita por chave; o texto nasce aqui, e é este texto
           que os passos recebem como `erro`. */
        erro: falha ? traduzir(falha, t) : null,
        cadastroEmBranco,
        lida,
        arquivoLido,
        conferido,
        totalDosCustos,
      },
      acoes: {
        continuarDaEscolha,
        salvarEstrutura,
        aplicarExemplo,
        continuarDaMatriz,
        analisar: (entrada) => void analisar(entrada),
        confirmarImportacao,
        cancelarConferencia,
        criarComAjustes,
      },
    },
  };
}

/** Publica o rascunho e o fluxo para os passos da sequência. */
export function ProvedorEntrada({
  onPronto,
  children,
}: {
  onPronto: (problema: Problema) => void;
  children: React.ReactNode;
}) {
  const { rascunho, fluxo } = useFluxoEntrada(onPronto);
  return (
    <ContextoRascunho value={rascunho}>
      <ContextoFluxo value={fluxo}>{children}</ContextoFluxo>
    </ContextoRascunho>
  );
}
