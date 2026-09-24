/** Formatos devolvidos pela API. Espelham os DTOs do motor. */

export type Direcao = "max" | "min";

export type Problematica = "escolha" | "ranking" | "sorting" | "portfolio";

export interface CriterioIn {
  chave: string;
  nome: string;
  direcao: Direcao;
  unidade?: string;
}

export interface CriterioOut extends CriterioIn {
  curva_de_valor?: [number, number][] | null;
  melhor: number;
  pior: number;
  escala: "continua" | "construida";
}

export interface Analise {
  problematica: Problematica;
  resolvido: boolean;
  indefinidas: number[];
  resumo: string;
  potencialmente_otimas?: string[];
  recomendacao?: string | null;
  dominancia?: string[];
  posicoes_possiveis?: Record<string, [number, number]>;
  ordem_definida?: string[] | null;
  pares_indefinidos?: string[];
  dominancia_direta?: { de: string; para: string }[];
  diferencas_maximas?: {
    a: string;
    b: string;
    a_supera_b_em_ate: number;
    b_supera_a_em_ate: number;
  }[];
  niveis?: string[][];
  alocacao?: Record<
    string,
    { faixa_de_valor: [number, number]; classes_possiveis: string[]; definida: boolean }
  >;
  classes?: string[];
  perfis?: number[];
  portfolios_encontrados?: { projetos: string[]; custo: number }[];
  sempre_selecionados?: string[];
  nunca_selecionados?: string[];
  oscilam?: string[];
  ressalva?: string;
  orcamento?: number;
  inconsistente?: boolean;
}

export interface Estado {
  id: string;
  nome: string;
  problematica: Problematica;
  elicitacao_iniciada: boolean;
  declaracoes: number;
  consistente: boolean;
  encerrado?: boolean;
  analise?: Analise;
  faixas_de_peso?: Record<string, [number, number]>;
  faixas_de_valor?: Record<string, [number, number]>;
  proximo_passo?: string;
  aviso?: string;
  pergunta?: null;
  motivo?: string;
}

export interface Pergunta {
  id: string;
  enunciado: string;
  criterio_em_foco: string;
  criterio_rival: string;
  opcao_a: string[];
  opcao_b: string[];
  posicao_na_escala: number;
  como_responder: string;
}

export interface Problema {
  id: string;
  nome: string;
  problematica: Problematica;
  criterios: CriterioOut[];
  consequencias: Record<string, Record<string, number>>;
  valores: Record<string, Record<string, number>>;
  custos?: Record<string, number>;
  declaracoes_registradas: number;
  proximo_passo?: string;
}

export interface Declaracao {
  sequencia: number;
  autor: string;
  registrado_em: string;
  declaracao: string;
}

export interface Auditoria {
  id: string;
  declaracoes: Declaracao[];
  restricoes_ativas: string[];
  leitura: string;
  nota_sobre_autoria: string;
  analise?: Analise;
}

export interface Resumo {
  id: string;
  nome: string;
  problematica: Problematica;
  alternativas: number;
  criterios: number;
  declaracoes: number;
}
