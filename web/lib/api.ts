/** Cliente da API.
 *
 * As chamadas passam pelo rewrite do Next (`/api/...` -> FastAPI), entao o
 * navegador ve uma origem so e nao ha CORS em desenvolvimento.
 */

import type {
  Auditoria,
  Estado,
  Pergunta,
  Problema,
  Problematica,
  Resumo,
} from "./types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
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

export const api = {
  saude: () =>
    request<{ ok: boolean; chat_disponivel: boolean; armazenamento: string }>(
      "/api/saude",
    ),

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
    variacoes: { criterio: string; para_baixo: number; para_cima: number }[],
    cenarios = 200,
  ) =>
    post<{
      cenarios: number;
      solucao_original: string[];
      estabilidade: number;
      frequencia: Record<string, number>;
      entraram: Record<string, number>;
      sairam: Record<string, number>;
      criterios_variados: { criterio: string; para_baixo: number; para_cima: number }[];
      leitura: string;
    }>(`/api/decisoes/${id}/sensibilidade-consequencias`, { variacoes, cenarios }),

  chat: (
    mensagens: { papel: "user" | "assistant"; texto: string }[],
    decisao_id?: string | null,
  ) =>
    post<{ resposta: string; decisao_id: string | null; ferramentas: string[] }>(
      "/api/chat",
      { mensagens, decisao_id },
    ),
};
