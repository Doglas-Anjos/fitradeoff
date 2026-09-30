"use client";

/**
 * O estado de uma decisão aberta, e tudo o que o altera.
 *
 * A página era um componente só que guardava o estado, lia a URL, carregava a
 * decisão, executava as sete mutações, derivava a etapa e ainda desenhava tudo;
 * `ocupado`, `problema`, `estado` e os callbacks desciam por dez filhos. Aqui
 * fica só a parte que decide, e cada etapa lê o que precisa por `useDecisao()`.
 * Só este arquivo sabe como o estado é guardado: quem consome vê a interface
 * `{ state, actions }` e nada mais, então trocar useState por outra coisa não
 * toca nenhuma etapa.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { createContext, use, useEffect, useState } from "react";

import { type Ponto } from "@/components/CurvaDeValor";
import { type Etapa } from "@/components/Etapas";
import { type Diagnostico, type Saida } from "@/components/Inconsistencia";
import { api, ApiError, mensagemDeErro } from "@/lib/api";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/telas";
import { registrarRecente } from "@/lib/persistencia";
import type { Estado, Pergunta, Problema } from "@/lib/types";

export const ETAPAS_VALIDAS: Etapa[] = ["problema", "ordem", "perguntas", "resultado"];

export type Escolha = "A" | "B" | "indiferente" | "não sei";

export interface EstadoDecisao {
  problema: Problema | null;
  estado: Estado | null;
  pergunta: Pergunta | null;
  diagnostico: Diagnostico | null;
  ocupado: boolean;
  erro: string | null;
  /** A etapa exibida: a revisada, se já alcançada, ou a natural. */
  etapa: Etapa;
  etapaNatural: Etapa;
  alcancadas: Etapa[];
  /** Encerrada pelo algoritmo ou pelo decisor. */
  encerrado: boolean;
  /** Só a parte do decisor: é ela que o "voltar a responder" desfaz. */
  encerradoPeloUsuario: boolean;
  revisando: Etapa | null;
}

export interface AcoesDecisao {
  receber: (novo: Problema) => void;
  recomecar: () => void;
  ordenar: (ordem: string[]) => Promise<void>;
  responder: (escolha: Escolha) => Promise<void>;
  julgar: (preferida: string, sobre: string) => Promise<void>;
  salvarCurva: (criterio: string, pontos: Ponto[] | null) => Promise<void>;
  resolverConflito: (acao: Saida["acao"], sequencia?: number) => Promise<void>;
  desfazer: () => Promise<void>;
  irPara: (destino: Etapa) => void;
  setRevisando: (etapa: Etapa | null) => void;
  encerrar: () => void;
  reabrir: () => void;
}

export interface ContextoDecisao {
  state: EstadoDecisao;
  actions: AcoesDecisao;
}

const Contexto = createContext<ContextoDecisao | null>(null);

export function useDecisao(): ContextoDecisao {
  const valor = use(Contexto);
  if (!valor) throw new Error("useDecisao fora de um DecisaoProvider");
  return valor;
}

interface EstadoLido {
  estado: Estado;
  diagnostico: Diagnostico | null;
  pergunta: Pergunta | null;
}

/* `recebido` e o estado que a propria mutacao acabou de devolver.
   Toda rota que altera a decisao responde com o estado resultante --
   identico, campo a campo, ao que um GET /estado devolveria em seguida. Ir
   buscar de novo repetia a analise inteira do zero: sao O(n^2) programas
   lineares, e a 20 alternativas isso media 98 ms por clique gastos para
   obter o que ja estava na mao.

   Alem de mais barato, e mais coerente: o estado exibido passa a ser o que
   aquela resposta produziu, e nao o que o servidor tiver quando a segunda
   chamada chegar -- que, com duas abas abertas na mesma decisao, pode ser
   outro. */
async function lerEstado(id: string, recebido?: Estado): Promise<EstadoLido> {
  const novo = recebido ?? (await api.estado(id));
  // o diagnóstico só faz sentido quando há contradição; buscá-lo sempre
  // seria uma chamada por resposta sem nenhum uso. Os dois só dependem do
  // estado, então saem juntos.
  const [diagnostico, proxima] = await Promise.all([
    novo.consistente ? null : api.diagnostico(id),
    novo.elicitacao_iniciada && !novo.encerrado ? api.pergunta(id) : null,
  ]);
  return {
    estado: novo,
    diagnostico,
    pergunta: proxima && "enunciado" in proxima ? (proxima as Pergunta) : null,
  };
}

export function DecisaoProvider({ children }: { children: React.ReactNode }) {
  const { t } = useIdioma();
  const router = useRouter();
  const parametros = useSearchParams();
  const idNaUrl = parametros.get("id");

  const [problema, setProblema] = useState<Problema | null>(null);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [pergunta, setPergunta] = useState<Pergunta | null>(null);
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);
  /* A etapa que se está revisando e o "encerrar por aqui" também vivem na URL,
     e não só em memória: o Voltar do navegador volta uma etapa (antes saía da
     decisão), e o link de uma etapa abre nela. Cada troca é uma entrada no
     histórico. */
  const etapaNaUrl = parametros.get("etapa");
  const revisando: Etapa | null = ETAPAS_VALIDAS.includes(etapaNaUrl as Etapa)
    ? (etapaNaUrl as Etapa)
    : null;
  const encerradoPeloUsuario = parametros.get("fim") === "1";
  const navegar = (mudancas: { etapa?: Etapa | null; fim?: boolean }) => {
    const p = new URLSearchParams(parametros.toString());
    if ("etapa" in mudancas) {
      if (mudancas.etapa) p.set("etapa", mudancas.etapa);
      else p.delete("etapa");
    }
    if ("fim" in mudancas) {
      if (mudancas.fim) p.set("fim", "1");
      else p.delete("fim");
    }
    const alvo = p.toString();
    if (alvo === parametros.toString()) return;
    router.push(`/decisao${alvo ? `?${alvo}` : ""}`, { scroll: false });
  };
  const setRevisando = (etapa: Etapa | null) => navegar({ etapa });
  const setEncerradoPeloUsuario = (fim: boolean) => navegar({ fim });
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  /* O estado, o diagnóstico e a próxima pergunta chegam juntos e entram na
     tela juntos. Aplicar o estado antes da pergunta remontava o gráfico de
     trocas com a pergunta anterior durante uma volta inteira ao servidor. */
  const aplicarEstado = (lido: EstadoLido) => {
    setEstado(lido.estado);
    setDiagnostico(lido.diagnostico);
    setPergunta(lido.pergunta);
  };

  /* A decisão aberta vive na URL: recarregar a página, voltar no navegador ou
     salvar o link continuam funcionando. O estado em memória é só um cache. */
  useEffect(() => {
    if (problema?.id === idNaUrl) return;
    /* O que é da decisão anterior não pode vazar para a próxima. A etapa e o
       "encerrado" já vêm da URL, que é da decisão nova; o diagnóstico não. */
    setDiagnostico(null);
    if (!idNaUrl) {
      setProblema(null);
      setEstado(null);
      setPergunta(null);
      return;
    }

    let cancelado = false;
    setOcupado(true);
    (async () => {
      try {
        // o problema e o estado não dependem um do outro: um trajeto só
        const [carregado, lido] = await Promise.all([
          api.ver(idNaUrl),
          lerEstado(idNaUrl),
        ]);
        if (cancelado) return;
        setProblema(carregado);
        registrarRecente(carregado.id, carregado.nome);
        aplicarEstado(lido);
      } catch (e) {
        if (!cancelado) {
          setErro(
            /* O 404 tem frase propria porque o servidor nao explica o que
               significa: "nao encontrada" e o fato, e "essa decisao nao existe
               mais" e o que a pessoa precisa ler. Qualquer outra falha o
               servidor ja explicou, e e a explicacao dele que aparece. */
            e instanceof ApiError && e.status === 404
              ? t("tela.decisao.erro.naoExiste")
              : mensagemDeErro(e),
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

  const sincronizar = async (id: string, recebido?: Estado) =>
    aplicarEstado(await lerEstado(id, recebido));

  const executar = async (acao: () => Promise<void>) => {
    setOcupado(true);
    setErro(null);
    try {
      await acao();
    } catch (e) {
      setErro(mensagemDeErro(e));
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
      await sincronizar(problema.id, await api.ordenar(problema.id, ordem));
    });

  const responder = (escolha: Escolha) =>
    executar(async () => {
      if (!problema) return;
      try {
        await sincronizar(
          problema.id,
          await api.responder(problema.id, escolha, pergunta?.pergunta_id),
        );
      } catch (e) {
        /* 409 com a pergunta identificada: a pendente ja nao e a da tela --
           outra aba respondeu antes, ou isto e um reenvio. Nada foi gravado;
           a tela passa a mostrar a pergunta atual, e a mensagem do servidor diz
           por que. */
        if (e instanceof ApiError && e.status === 409 && pergunta?.pergunta_id) {
          await sincronizar(problema.id);
        }
        throw e;
      }
    });

  const julgar = (preferida: string, sobre: string) =>
    executar(async () => {
      if (!problema) return;
      await sincronizar(problema.id, await api.julgar(problema.id, preferida, sobre));
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
      await sincronizar(problema.id, await api.resolver(problema.id, acao, sequencia));
    });

  const desfazer = () =>
    executar(async () => {
      if (!problema) return;
      await sincronizar(problema.id, await api.desfazer(problema.id));
    });

  const recomecar = () => {
    setErro(null);
    router.push("/decisao");
  };

  /* Em que etapa o decisor está, e quais já pode revisitar. */
  /* O método permite parar antes de esgotar as perguntas: se o conjunto já
     está pequeno, olhar as faixas e decidir pelos dados é a avaliação holística
     prevista. Encerrar é escolha do decisor, não só do algoritmo. */
  const encerrado = (estado?.encerrado ?? false) || encerradoPeloUsuario;
  const etapaNatural: Etapa = !estado?.elicitacao_iniciada
    ? "ordem"
    : encerrado
      ? "resultado"
      : "perguntas";
  const alcancadas: Etapa[] = ["problema"];
  if (problema) alcancadas.push("ordem");
  if (estado?.elicitacao_iniciada) alcancadas.push("perguntas");
  if (estado?.analise) alcancadas.push("resultado");
  // um link com uma etapa ainda não alcançada abre na etapa natural
  const etapa =
    revisando && alcancadas.includes(revisando) ? revisando : etapaNatural;

  const irPara = (destino: Etapa) => {
    setErro(null);
    if (destino === "ordem" && estado?.elicitacao_iniciada) {
      // reordenar descarta as respostas; o aviso já foi dado na barra
      setRevisando("ordem");
      return;
    }
    setRevisando(destino === etapaNatural ? null : destino);
  };

  const valor: ContextoDecisao = {
    state: {
      problema,
      estado,
      pergunta,
      diagnostico,
      ocupado,
      erro,
      etapa,
      etapaNatural,
      alcancadas,
      encerrado,
      encerradoPeloUsuario,
      revisando,
    },
    actions: {
      receber,
      recomecar,
      ordenar,
      responder,
      julgar,
      salvarCurva,
      resolverConflito,
      desfazer,
      irPara,
      setRevisando,
      encerrar: () => setEncerradoPeloUsuario(true),
      reabrir: () => setEncerradoPeloUsuario(false),
    },
  };

  return <Contexto value={valor}>{children}</Contexto>;
}
