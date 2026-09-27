/** Formatos devolvidos pela API. Espelham os DTOs do motor. */

export type Direcao = "max" | "min";

export type Problematica =
  | "escolha"
  | "ranking"
  | "sorting"
  | "portfolio"
  /* A carteira por razao beneficio-custo: o quinto modulo, que o motor ganhou
     depois. Esta aqui no union justamente para o compilador cobrar tratamento
     em cada lugar que decide por problematica - sem isso ela caia no ramo de
     "escolha" e a tela quebrava. */
  | "beneficio_custo";

export interface CriterioIn {
  chave: string;
  nome: string;
  direcao: Direcao;
  unidade?: string;
  /* Limites do modelo aditivo com veto (de Almeida, 2013), na unidade do
     critério. Acima do aceitável nada é penalizado; no inaceitável o critério
     deixa de contar; entre os dois a penalidade é proporcional. Só valem em
     escolha e ranking - a API recusa nas demais. */
  veto_superior?: number | null;
  veto_inferior?: number | null;
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
  /* Só quando há veto declarado. A ressalva que o acompanha vai em
     `ressalva`, a mesma chave das carteiras: é sempre uma afirmação sobre como
     o número foi obtido, e quem já trata uma trata a outra - foi assim que a
     exportação passou a incluí-la sem precisar saber do veto. */
  veto_ativo?: boolean;
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
    /* Sob veto o número deixa de ser o máximo exato e passa a ser um teto
       dele. Vem do dado, não da leitura do código. */
    limite_superior?: boolean;
  }[];
  niveis?: string[][];
  alocacao?: Record<
    string,
    { faixa_de_valor: [number, number]; classes_possiveis: string[]; definida: boolean }
  >;
  classes?: string[];
  perfis?: number[];
  /* As duas leituras de carteira publicam sob este nome. `amostras` só vem da
     leitura por razão, e diz em quantos vetores de peso aquela carteira saiu. */
  portfolios_encontrados?: { projetos: string[]; custo: number; amostras?: number }[];
  sempre_selecionados?: string[];
  nunca_selecionados?: string[];
  oscilam?: string[];
  /* Como o resultado foi obtido, quando não foi de forma exata: amostragem,
     nas carteiras; envelope conservador, sob veto. */
  ressalva?: string;
  orcamento?: number;
  /* So na carteira por razao: a faixa de razao de cada projeto e a dominancia
     entre faixas que nao se sobrepoem. */
  razoes?: Record<
    string,
    {
      custo: number;
      beneficio_minimo: number;
      beneficio_maximo: number;
      razao_minima: number;
      razao_maxima: number;
    }
  >;
  dominancia_por_razao?: { dominante: string; dominado: string }[];
  dominantes?: string[];
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
  /* ISO 8601, ausentes numa decisao gravada antes destes campos existirem. */
  criado_em?: string | null;
  atualizado_em?: string | null;
  /* Destaque na listagem, marcado pelo decisor. Vem do servidor junto da
     decisao, e nao do armazenamento local, porque é preferencia sobre a
     decisao e acompanha a decisao - ver o cabecalho de `DecisoesSalvas`.
     Opcional porque um servidor anterior a este campo nao o manda, e a tela
     precisa tratar a falta como "nao favorita" em vez de quebrar. */
  favorita?: boolean;
}

/** Variacao pedida para um criterio na analise de sensibilidade. */
export interface VariacaoDeConsequencia {
  criterio: string;
  para_baixo: number;
  para_cima: number;
}

/** Resposta de `/decisoes/{id}/sensibilidade-consequencias`.
 *
 * Declarada aqui, e nao no componente que a desenha nem inline na chamada: sao
 * dois lugares que precisam concordar sobre a mesma resposta do servidor, e
 * duas copias derivam sem o compilador reclamar. */
export interface SensibilidadeDeConsequencias {
  cenarios: number;
  solucao_original: string[];
  estabilidade: number;
  frequencia: Record<string, number>;
  entraram: Record<string, number>;
  sairam: Record<string, number>;
  criterios_variados: VariacaoDeConsequencia[];
  leitura: string;
}
