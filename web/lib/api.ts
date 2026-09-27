/** Cliente da API.
 *
 * As chamadas passam pelo rewrite do Next (`/api/...` -> FastAPI), entao o
 * navegador ve uma origem so e nao ha CORS em desenvolvimento.
 */

import type {
  Auditoria,
  Direcao,
  Estado,
  Pergunta,
  Problema,
  Problematica,
  Resumo,
  SensibilidadeDeConsequencias,
  VariacaoDeConsequencia,
} from "./types";

/** O que a planilha disse, antes de virar decisão. */
export interface PlanilhaLida {
  nome: string;
  alternativas: string[];
  criterios: { chave: string; nome: string; direcao: Direcao; unidade?: string }[];
  consequencias: number[][];
  custos: number[] | null;
  origem: string;
}

/** Uma chave do MCP remoto, como a API a devolve: sem o texto, que não volta. */
export interface Chave {
  id: string;
  rotulo: string;
  /** Começo e fim do texto, o que permite reconhecer qual revogar. */
  prefixo: string;
  criada_em: string;
  ultimo_uso: string | null;
}

export interface Conexao {
  chaves: Chave[];
  /** Endereço do endpoint MCP, que entra na configuração do cliente. */
  url: string;
  publicado: boolean;
  /** Incoerência de configuração que custaria caro descobrir sozinho. */
  aviso: string | null;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** O texto de uma falha: o do servidor quando ele explicou, a reserva quando nao.
 *
 * A API responde com a frase pronta, e nesse caso e ela que deve aparecer -- diz
 * o que aconteceu naquela decisao, nao no geral. Fora disso a tela precisa de uma
 * frase sua, porque `String(e)` de um erro de rede nao serve para ninguem ler; e
 * por isso a reserva e por operacao, e nao uma so para tudo.
 *
 * Sem reserva, cai em `String(e)`, que serve para onde o texto vai para um canal
 * que ja tem a sua propria moldura de erro. */
export function mensagemDeErro(e: unknown, reserva?: string): string {
  if (e instanceof ApiError) return e.message;
  return reserva ?? String(e);
}

async function request<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(caminho, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  if (!resposta.ok) {
    // a API devolve {detail: "..."}; o 422 do Pydantic traz uma lista
    const corpo = await resposta.json().catch(() => null);
    const detalhe = corpo?.detail;
    const texto =
      typeof detalhe === "string"
        ? detalhe
        : Array.isArray(detalhe)
          ? detalhe.map((d: { msg: string }) => d.msg).join("; ")
          : `Falha ${resposta.status}`;
    throw new ApiError(resposta.status, texto);
  }
  return resposta.json() as Promise<T>;
}

const post = <T>(caminho: string, corpo: unknown) =>
  request<T>(caminho, { method: "POST", body: JSON.stringify(corpo) });

/** Multipart: o navegador precisa definir o boundary, entao nao usa `request`. */
async function enviarFormulario<T>(caminho: string, corpo: FormData): Promise<T> {
  const resposta = await fetch(caminho, { method: "POST", body: corpo });
  if (!resposta.ok) {
    const json = await resposta.json().catch(() => null);
    const detalhe = json?.detail;
    throw new ApiError(
      resposta.status,
      typeof detalhe === "string" ? detalhe : `Falha ${resposta.status}`,
    );
  }
  return resposta.json() as Promise<T>;
}

export const api = {
  saude: () =>
    request<{
      ok: boolean;
      chat_disponivel: boolean;
      autenticado_por_terceiros: boolean;
    }>("/api/saude"),

  listar: () => request<{ decisoes: Resumo[] }>("/api/decisoes"),

  criar: (dados: {
    nome: string;
    alternativas: string[];
    criterios: unknown[];
    consequencias: number[][];
    problematica?: Problematica;
    configuracao?: Record<string, unknown>;
    custos?: number[];
  }) => post<Problema>("/api/decisoes", dados),

  /** Le a planilha sem criar nada, para o decisor conferir antes. */
  previaPlanilha: (entrada: File | string) => {
    const corpo = new FormData();
    if (typeof entrada === "string") corpo.append("texto", entrada);
    else corpo.append("arquivo", entrada);
    return enviarFormulario<PlanilhaLida>("/api/planilhas/previa", corpo);
  },

  ver: (id: string) => request<Problema>(`/api/decisoes/${id}`),
  estado: (id: string) => request<Estado>(`/api/decisoes/${id}/estado`),

  ordenar: (id: string, ordem: string[]) =>
    post<Estado>(`/api/decisoes/${id}/ordenacao`, { ordem }),

  pergunta: (id: string) =>
    request<Pergunta & Partial<Estado>>(`/api/decisoes/${id}/pergunta`),

  responder: (id: string, preferencia: string) =>
    post<Estado>(`/api/decisoes/${id}/resposta`, { preferencia }),

  julgar: (id: string, preferida: string, sobre: string) =>
    post<Estado>(`/api/decisoes/${id}/julgamento`, { preferida, sobre }),

  desfazer: (id: string) => post<Estado>(`/api/decisoes/${id}/desfazer`, {}),

  auditoria: (id: string) => request<Auditoria>(`/api/decisoes/${id}/auditoria`),

  trocarProblematica: (
    id: string,
    problematica: Problematica,
    configuracao?: Record<string, unknown>,
  ) =>
    post<Estado>(`/api/decisoes/${id}/problematica`, {
      problematica,
      configuracao,
    }),

  /* Define o estado, em vez de alternar: duas abas na mesma lista alternariam
     uma contra a outra e o resultado dependeria de quem chegasse primeiro.
     Devolve o resumo, que e a linha da listagem que acabou de mudar. */
  favoritar: (id: string, favorita: boolean) =>
    post<Resumo>(`/api/decisoes/${id}/favorita`, { favorita }),

  sensibilidade: (id: string, limiares: number[]) =>
    post<{ id: string; cenarios: unknown[] }>(
      `/api/decisoes/${id}/sensibilidade`,
      { limiares },
    ),

  curvaDeValor: (id: string, criterio: string, pontos: [number, number][] | null) =>
    post<Problema>(`/api/decisoes/${id}/curva-de-valor`, { criterio, pontos }),

  diagnostico: (id: string) =>
    request<import("@/components/Inconsistencia").Diagnostico>(
      `/api/decisoes/${id}/diagnostico`,
    ),

  resolver: (id: string, acao: string, sequencia?: number) =>
    post<Estado>(`/api/decisoes/${id}/resolver`, { acao, sequencia }),

  sensibilidadeConsequencias: (
    id: string,
    variacoes: VariacaoDeConsequencia[],
    cenarios = 200,
  ) =>
    post<SensibilidadeDeConsequencias>(
      `/api/decisoes/${id}/sensibilidade-consequencias`,
      { variacoes, cenarios },
    ),

  /* O problema que ainda está sendo montado. Opaco para a API de propósito: a
     forma do formulário é assunto da interface, e muda com ela. */
  lerRascunho: () =>
    request<{ rascunho: unknown | null; gravado_em: string | null }>(
      "/api/rascunho",
    ),

  gravarRascunho: (rascunho: unknown) =>
    post<{ guardado: boolean; gravado_em: string }>("/api/rascunho", { rascunho }),

  descartarRascunho: () =>
    post<{ descartado: boolean }>("/api/rascunho/descartar", {}),

  chat: (
    mensagens: { papel: "user" | "assistant"; texto: string }[],
    decisao_id?: string | null,
  ) =>
    post<{ resposta: string; decisao_id: string | null; ferramentas: string[] }>(
      "/api/chat",
      { mensagens, decisao_id },
    ),

  chaves: () => request<Conexao>("/api/chaves"),

  /** A única resposta da API que traz o texto de uma chave. */
  emitirChave: (rotulo: string) =>
    post<{ chave: Chave; texto: string; url: string }>("/api/chaves", { rotulo }),

  revogarChave: (id: string) =>
    request<{ revogada: boolean }>(`/api/chaves/${id}`, { method: "DELETE" }),
};
