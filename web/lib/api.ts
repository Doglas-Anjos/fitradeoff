/** Cliente da API.
 *
 * As chamadas passam pelo rewrite do Next (`/api/...` -> FastAPI), entao o
 * navegador ve uma origem so e nao ha CORS em desenvolvimento.
 *
 * Toda chamada leva a identidade do FasorX quando ela existe -- ver
 * `lib/identidade.ts`. Quando nao existe, o cabecalho simplesmente nao vai, e
 * a API responde como sempre respondeu: instalacao local, sem portao, acervo
 * unico. E o que mantem `npm run dev` funcionando sozinho.
 */

import * as identidade from "./identidade";

import type {
  Analise,
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
  /** Quando deixa de abrir o acervo. `null`: chave do dono que nao vence. */
  expira_em: string | null;
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
/** Sessao acabou: manda entrar de novo, e nao devolve.
 *
 * `never` e o tipo certo aqui, e nao `T`: esta funcao nao produz valor nenhum
 * -- ela troca a pagina. Tipada como `T` ela mentiria para quem chama, que
 * seguiria escrevendo codigo apos a chamada acreditando ter um resultado.
 *
 * O `throw` no fim existe porque `location.href` NAO interrompe a execucao: a
 * navegacao e agendada e o resto da funcao continua rodando. Sem ele, quem
 * chamou receberia `undefined` onde espera um objeto e a tela quebraria com um
 * erro sem sentido nos instantes antes de sair. */
/** O cabecalho de identidade, com a falha traduzida.
 *
 * `identidade.cabecalho()` LANCA quando nao consegue falar com quem autentica
 * -- de proposito: rede instavel nao e sessao encerrada, e devolver "sem
 * identidade" ali mandaria a pessoa para a tela de login por causa de uma
 * oscilacao.
 *
 * Sem esta traducao, aquele erro sobe como `Error("token: 502")` e o
 * `mensagemDeErro` cai na reserva de QUEM CHAMOU -- a tela diria "nao foi
 * possivel carregar a analise", culpando a analise por uma falha que foi do
 * login. Como `ApiError`, a mensagem certa e a que aparece.
 *
 * Status 0 porque nao houve resposta HTTP: nenhum servidor recusou nada. */
async function autorizacao(): Promise<Record<string, string>> {
  try {
    return await identidade.cabecalho();
  } catch {
    throw new ApiError(
      0,
      "Não foi possível confirmar sua sessão. Verifique a conexão e tente de novo.",
    );
  }
}

function semSessao(): never {
  // false = o disjuntor de irParaLogin segurou: a pessoa acabou de voltar do
  // FasorX e a API daqui continua recusando. Mandar de novo seria um laco;
  // dizer o que houve e o que resta.
  if (!identidade.irParaLogin()) {
    throw new ApiError(
      401,
      "Sua sessão no FasorX está ativa, mas esta aplicação não conseguiu confirmá-la. Tente de novo em instantes.",
    );
  }
  throw new ApiError(401, "Sessão encerrada. Entrando de novo…");
}

/** Este 401 e "a sessao acabou", ou e outro 401 qualquer?
 *
 * So faz sentido tratar como fim de sessao quando existe uma sessao para
 * acabar. Numa instalacao local nao ha FasorX: `irParaLogin` nao tem para onde
 * ir, e trocar a mensagem do servidor por "entrando de novo…" deixaria a pessoa
 * diante de um aviso que promete um redirecionamento que nunca acontece --
 * pior do que o erro original, que ao menos dizia a verdade. */
function ehFimDeSessao(): boolean {
  return identidade.identidadeLigada();
}

export function mensagemDeErro(e: unknown, reserva?: string): string {
  if (e instanceof ApiError) return e.message;
  return reserva ?? String(e);
}

async function request<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(caminho, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(await autorizacao()),
      ...(init?.headers ?? {}),
    },
  });

  if (resposta.status === 401 && ehFimDeSessao()) return semSessao();

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
  // Sem Content-Type: o navegador precisa definir o boundary. So a autorizacao.
  const resposta = await fetch(caminho, {
    method: "POST",
    body: corpo,
    headers: await autorizacao(),
  });
  if (resposta.status === 401 && ehFimDeSessao()) return semSessao();
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

/** O nome do arquivo que a API mandou, ou a reserva.
 *
 * `filename*` primeiro: e a forma RFC 5987, a unica que carrega acento, e a API
 * manda as duas justamente porque o `filename` simples perde os acentos pelo
 * caminho. Qualquer falha de leitura cai na reserva -- um nome feio e melhor do
 * que um download que nao acontece. */
export function nomeDoAnexo(cabecalho: string | null, reserva: string): string {
  if (!cabecalho) return reserva;
  const estendido = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(cabecalho);
  if (estendido) {
    try {
      return decodeURIComponent(estendido[1].trim());
    } catch {
      // sequencia % malformada: tenta o nome simples abaixo
    }
  }
  const simples = /filename\s*=\s*"([^"]+)"|filename\s*=\s*([^;]+)/i.exec(cabecalho);
  const nome = (simples?.[1] ?? simples?.[2] ?? "").trim();
  return nome || reserva;
}

/** Um arquivo que a API devolveu, pronto para salvar. */
export interface Anexo {
  arquivo: Blob;
  nome: string;
}

/** Baixa um binario com a identidade junto.
 *
 * Existe porque um `<a href>` nao leva cabecalho nenhum: com o portao ligado a
 * API responde 401 a um link simples, e o navegador salva esse 401 como se fosse
 * a planilha -- ou mostra uma pagina de erro JSON no lugar do download. Aqui o
 * pedido sai por `fetch`, com o mesmo `Authorization` das outras chamadas, e o
 * 401 de sessao vencida segue o mesmo caminho de `request`. */
async function baixar(caminho: string, reserva: string): Promise<Anexo> {
  const resposta = await fetch(caminho, { headers: await autorizacao() });
  if (resposta.status === 401 && ehFimDeSessao()) return semSessao();
  if (!resposta.ok) {
    const json = await resposta.json().catch(() => null);
    const detalhe = json?.detail;
    throw new ApiError(
      resposta.status,
      typeof detalhe === "string" ? detalhe : `Falha ${resposta.status}`,
    );
  }
  return {
    arquivo: await resposta.blob(),
    nome: nomeDoAnexo(resposta.headers.get("Content-Disposition"), reserva),
  };
}

/** Entrega um arquivo ja baixado ao navegador, como um download comum.
 *
 * O link temporario e o jeito que os navegadores aceitam de salvar um Blob com
 * nome. Ele entra no documento antes do clique porque o Firefox ignora o clique
 * num link solto; e a URL do objeto e liberada logo depois, ou o Blob ficaria
 * preso na memoria enquanto a aba vivesse. */
export function salvarAnexo({ arquivo, nome }: Anexo): void {
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.style.display = "none";
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Depois do clique, e nao antes: o download precisa da URL viva quando
    // comeca. O atraso zero basta para o navegador ja ter pego o arquivo.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
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

  /** A planilha da decisao, com a identidade junto -- ver `baixar`. */
  exportar: (id: string) =>
    baixar(`/api/decisoes/${encodeURIComponent(id)}/exportar`, `decisao-${id}.xlsx`),
  estado: (id: string) => request<Estado>(`/api/decisoes/${id}/estado`),

  ordenar: (id: string, ordem: string[]) =>
    post<Estado>(`/api/decisoes/${id}/ordenacao`, { ordem }),

  pergunta: (id: string) =>
    request<Pergunta & Partial<Estado>>(`/api/decisoes/${id}/pergunta`),

  /** Responde a pergunta pendente. Com `perguntaId`, a resposta so vale se a
   *  pendente ainda for a que foi exibida; sem ele, vale para a pendente. */
  responder: (id: string, preferencia: string, perguntaId?: string) =>
    post<Estado>(`/api/decisoes/${id}/resposta`, {
      preferencia,
      ...(perguntaId ? { pergunta_id: perguntaId } : {}),
    }),

  julgar: (id: string, preferida: string, sobre: string) =>
    post<Estado>(`/api/decisoes/${id}/julgamento`, { preferida, sobre }),

  desfazer: (id: string) => post<Estado>(`/api/decisoes/${id}/desfazer`, {}),

  auditoria: (id: string) => request<Auditoria>(`/api/decisoes/${id}/auditoria`),
  /* Sob demanda: fora do /estado, porque custam dois LPs por par incomparável. */
  diferencasMaximas: (id: string) =>
    request<{ diferencas_maximas: NonNullable<Analise["diferencas_maximas"]> }>(
      `/api/decisoes/${id}/diferencas-maximas`,
    ),

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

  /* Para a aba que está fechando. `sendBeacon` não leva cabeçalho, e com o
     FasorX ligado a API recusa quem chega sem `Authorization`; `keepalive`
     sobrevive à saída da página como o beacon, mas leva o token. Síncrono de
     propósito: não dá para esperar uma promessa num `visibilitychange`. */
  gravarRascunhoNaSaida: (rascunho: unknown): void => {
    const token = identidade.tokenEmMaos();
    void fetch("/api/rascunho", {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ rascunho }),
    }).catch(() => {});
  },

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
  // Token recem-buscado antes de emitir: a API so aceita emissao com token de
  // ate dois minutos, para que um token vazado nos seus 5 minutos de vida nao
  // vire credencial de 90 dias. A falha de rede daqui e ignorada de proposito --
  // o `post` pede o token de novo e traduz o erro do jeito de sempre.
  emitirChave: async (rotulo: string) => {
    await identidade.obter({ novo: true }).catch(() => null);
    return post<{ chave: Chave; texto: string; url: string }>("/api/chaves", {
      rotulo,
    });
  },

  revogarChave: (id: string) =>
    request<{ revogada: boolean }>(`/api/chaves/${id}`, { method: "DELETE" }),
};
