/** Resultados da suíte de paridade — GERADO, não editar à mão.
 *
 * Sai de `paridade/gerar_web.py`, a partir de `paridade/resultados/`. Para
 * atualizar: rode `comparar.py nosso`, `comparar.py oficial` e o gerador.
 *
 * É uma medição datada, não estado vivo: o lado oficial leva minutos por caso e
 * depende de servidor de terceiros e de conta. Por isso fica no repositório —
 * quem duvidar refaz e confere.
 */

export interface CasoParidade {
  chave: string;
  problematica: string;
  alternativas: number;
  criterios: number;
  /** `null` quando o sistema oficial não completa o caso. */
  oficial: { ordenacao: number; tradeoff: number } | null;
  nosso: { ordenacao: number; tradeoff: number };
  resumo: string;
  /** O que o caso e e o que ele testa, numa linha. */
  descricao: string;
  /** O que cada lado concluiu. `oficial` e `bate` sao `null` quando a tela
   *  final dele nao foi guardada ou nao pode ser lida. */
  desfecho: { nosso: string; oficial: string | null; bate: boolean | null };
  /** Por que nao bate, quando a diferenca e conhecida. */
  porque: string | null;
  /** Mesmo caminho (as duas contagens e, se capturada, a sequencia de pares)
   *  e nenhuma conclusao divergente. */
  bate: boolean;
  /** De onde vem o caso: os 16 lineares originais, ou os medidos depois. */
  tipo: "linear" | "curva" | "discreto" | "estresse";
}

export const MEDIDO_EM = "2026-09-30";

export const PARIDADE: CasoParidade[] = [
  {
    "chave": "escolha-dominante",
    "problematica": "escolha",
    "alternativas": 3,
    "criterios": 3,
    "oficial": {
      "ordenacao": 3,
      "tradeoff": 0
    },
    "nosso": {
      "ordenacao": 3,
      "tradeoff": 0
    },
    "resumo": "Recomendação: Fornecedor A.",
    "descricao": "3 alternativas e 3 critérios; respostas sempre A. Uma alternativa domina as outras: a ordenação dos critérios já basta.",
    "desfecho": {
      "nosso": "Recomenda Fornecedor A.",
      "oficial": "Recomenda Fornecedor A.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "linear"
  },
  {
    "chave": "escolha-minima",
    "problematica": "escolha",
    "alternativas": 2,
    "criterios": 2,
    "oficial": {
      "ordenacao": 1,
      "tradeoff": 1
    },
    "nosso": {
      "ordenacao": 1,
      "tradeoff": 1
    },
    "resumo": "Recomendação: Alfa.",
    "descricao": "2 alternativas e 2 critérios; respostas sempre A. 2 × 2 em conflito puro: o menor problema que ainda exige tradeoff.",
    "desfecho": {
      "nosso": "Recomenda Alfa.",
      "oficial": "Recomenda Alfa.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "linear"
  },
  {
    "chave": "ranking-cruzado",
    "problematica": "ranking",
    "alternativas": 3,
    "criterios": 3,
    "oficial": {
      "ordenacao": 3,
      "tradeoff": 8
    },
    "nosso": {
      "ordenacao": 3,
      "tradeoff": 8
    },
    "resumo": "Ranking completo: Plano A > Plano C > Plano B.",
    "descricao": "3 alternativas e 3 critérios; respostas sempre A. Cada alternativa lidera um critério: a ordem só sai das perguntas.",
    "desfecho": {
      "nosso": "Ordem completa: Plano A > Plano C > Plano B.",
      "oficial": "Ordem completa. O oficial desenha a ordem num diagrama e não a escreve na tela; o que dá para comparar é o tipo de ordem.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "linear"
  },
  {
    "chave": "escolha-06",
    "problematica": "escolha",
    "alternativas": 6,
    "criterios": 5,
    "oficial": {
      "ordenacao": 8,
      "tradeoff": 10
    },
    "nosso": {
      "ordenacao": 8,
      "tradeoff": 10
    },
    "resumo": "Recomendação: Alt 02.",
    "descricao": "6 alternativas e 5 critérios; respostas sempre A.",
    "desfecho": {
      "nosso": "Recomenda Alt 02.",
      "oficial": "Recomenda Alt 02.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "linear"
  },
  {
    "chave": "ranking-06",
    "problematica": "ranking",
    "alternativas": 6,
    "criterios": 5,
    "oficial": {
      "ordenacao": 8,
      "tradeoff": 14
    },
    "nosso": {
      "ordenacao": 8,
      "tradeoff": 14
    },
    "resumo": "Ranking completo: Alt 02 > Alt 03 > Alt 01 > Alt 06 > Alt 04 > Alt 05.",
    "descricao": "6 alternativas e 5 critérios; respostas sempre A. Até a ordem completa.",
    "desfecho": {
      "nosso": "Ordem completa: Alt 02 > Alt 03 > Alt 01 > Alt 06 > Alt 04 > Alt 05.",
      "oficial": "Ordem completa. O oficial desenha a ordem num diagrama e não a escreve na tela; o que dá para comparar é o tipo de ordem.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "linear"
  },
  {
    "chave": "sorting-04",
    "problematica": "sorting",
    "alternativas": 4,
    "criterios": 3,
    "oficial": {
      "ordenacao": 3,
      "tradeoff": 6
    },
    "nosso": {
      "ordenacao": 3,
      "tradeoff": 6
    },
    "resumo": "Todas as alternativas foram classificadas.",
    "descricao": "4 alternativas e 3 critérios; 3 classes; respostas sempre A. Classes com fronteira folgada.",
    "desfecho": {
      "nosso": "Alta: Alt 02 · Media: Alt 01 · Baixa: Alt 03, Alt 04",
      "oficial": "Alta: Alt 02 · Media: Alt 01 · Baixa: Alt 03, Alt 04",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "linear"
  },
  {
    "chave": "escolha-12",
    "problematica": "escolha",
    "alternativas": 12,
    "criterios": 5,
    "oficial": {
      "ordenacao": 8,
      "tradeoff": 6
    },
    "nosso": {
      "ordenacao": 8,
      "tradeoff": 6
    },
    "resumo": "Recomendação: Alt 04.",
    "descricao": "12 alternativas e 5 critérios; respostas sempre A.",
    "desfecho": {
      "nosso": "Recomenda Alt 04.",
      "oficial": "Recomenda Alt 04.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "linear"
  },
  {
    "chave": "ranking-12",
    "problematica": "ranking",
    "alternativas": 12,
    "criterios": 5,
    "oficial": {
      "ordenacao": 8,
      "tradeoff": 14
    },
    "nosso": {
      "ordenacao": 8,
      "tradeoff": 14
    },
    "resumo": "Ranking completo: Alt 04 > Alt 03 > Alt 05 > Alt 02 > Alt 06 > Alt 01 > Alt 07 > Alt 12 > Alt 08 > Alt 11 > Alt 09 > Alt 10.",
    "descricao": "12 alternativas e 5 critérios; respostas sempre A.",
    "desfecho": {
      "nosso": "Ordem completa: Alt 04 > Alt 03 > Alt 05 > Alt 02 > Alt 06 > Alt 01 > Alt 07 > Alt 12 > Alt 08 > Alt 11 > Alt 09 > Alt 10.",
      "oficial": "Ordem completa. O oficial desenha a ordem num diagrama e não a escreve na tela; o que dá para comparar é o tipo de ordem.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "linear"
  },
  {
    "chave": "escolha-15",
    "problematica": "escolha",
    "alternativas": 15,
    "criterios": 3,
    "oficial": {
      "ordenacao": 3,
      "tradeoff": 6
    },
    "nosso": {
      "ordenacao": 3,
      "tradeoff": 6
    },
    "resumo": "Recomendação: Alt 04.",
    "descricao": "15 alternativas e 3 critérios; respostas sempre A.",
    "desfecho": {
      "nosso": "Recomenda Alt 04.",
      "oficial": "Recomenda Alt 04.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "linear"
  },
  {
    "chave": "ranking-15",
    "problematica": "ranking",
    "alternativas": 15,
    "criterios": 3,
    "oficial": {
      "ordenacao": 3,
      "tradeoff": 12
    },
    "nosso": {
      "ordenacao": 3,
      "tradeoff": 12
    },
    "resumo": "Pré-ordem completa: Alt 04 > Alt 06 > Alt 05 > Alt 03 > Alt 07 > Alt 02 > Alt 08 > Alt 01 > Alt 15 > Alt 09 > Alt 10 > Alt 14 > Alt 13 > Alt 11 > Alt 12. 1 par(es) empatam dentro d",
    "descricao": "15 alternativas e 3 critérios; respostas sempre A.",
    "desfecho": {
      "nosso": "Pré-ordem completa: Alt 04 > Alt 06 > Alt 05 > Alt 03 > Alt 07 > Alt 02 > Alt 08 > Alt 01 > Alt 15 > Alt 09 > {Alt 10, Alt 14} > Alt 13 > Alt 11 > Alt 12. Entre chaves, alternativas equivalentes dentro do limiar.",
      "oficial": "Pré-ordem completa. O oficial desenha a ordem num diagrama e não a escreve na tela; o que dá para comparar é o tipo de ordem.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "linear"
  },
  {
    "chave": "sorting-06",
    "problematica": "sorting",
    "alternativas": 6,
    "criterios": 5,
    "oficial": {
      "ordenacao": 8,
      "tradeoff": 18
    },
    "nosso": {
      "ordenacao": 8,
      "tradeoff": 18
    },
    "resumo": "Todas as alternativas foram classificadas.",
    "descricao": "6 alternativas e 5 critérios; 3 classes; respostas sempre A.",
    "desfecho": {
      "nosso": "Alta: Alt 02, Alt 03 · Media: Alt 01, Alt 06 · Baixa: Alt 04, Alt 05",
      "oficial": "Alta: Alt 02, Alt 03 · Media: Alt 01, Alt 06 · Baixa: Alt 04, Alt 05",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "linear"
  },
  {
    "chave": "bc-08",
    "problematica": "beneficio_custo",
    "alternativas": 8,
    "criterios": 4,
    "oficial": {
      "ordenacao": 5,
      "tradeoff": 17
    },
    "nosso": {
      "ordenacao": 5,
      "tradeoff": 17
    },
    "resumo": "Carteira única pela razão benefício-custo: Alt 02, Alt 03, Alt 04, Alt 08 (custo 108.00 de 110.00).",
    "descricao": "8 alternativas e 4 critérios; orçamento de 110 para custos que somam 241; respostas sempre A.",
    "desfecho": {
      "nosso": "Carteira: Alt 02, Alt 03, Alt 04, Alt 08 (custo 108).",
      "oficial": "Carteira: Alt 02, Alt 03, Alt 04, Alt 08 (custo 108).",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "linear"
  },
  {
    "chave": "escolha-20",
    "problematica": "escolha",
    "alternativas": 20,
    "criterios": 5,
    "oficial": {
      "ordenacao": 8,
      "tradeoff": 12
    },
    "nosso": {
      "ordenacao": 8,
      "tradeoff": 12
    },
    "resumo": "Recomendação: Alt 05.",
    "descricao": "20 alternativas e 5 critérios; respostas sempre A.",
    "desfecho": {
      "nosso": "Recomenda Alt 05.",
      "oficial": "Recomenda Alt 05.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "linear"
  },
  {
    "chave": "ranking-20",
    "problematica": "ranking",
    "alternativas": 20,
    "criterios": 5,
    "oficial": {
      "ordenacao": 8,
      "tradeoff": 21
    },
    "nosso": {
      "ordenacao": 8,
      "tradeoff": 21
    },
    "resumo": "Pré-ordem completa: Alt 05 > Alt 07 > Alt 06 > Alt 04 > Alt 08 > Alt 09 > Alt 03 > Alt 10 > Alt 02 > Alt 11 > Alt 01 > Alt 20 > Alt 12 > Alt 13 > Alt 19 > Alt 14 > Alt 18 > Alt 17 ",
    "descricao": "20 alternativas e 5 critérios; respostas sempre A.",
    "desfecho": {
      "nosso": "Pré-ordem completa: Alt 05 > Alt 07 > Alt 06 > {Alt 04, Alt 08} > Alt 09 > Alt 03 > Alt 10 > Alt 02 > Alt 11 > Alt 01 > Alt 20 > Alt 12 > Alt 13 > Alt 19 > Alt 14 > Alt 18 > Alt 17 > Alt 15 > Alt 16. Entre chaves, alternativas equivalentes dentro do limiar.",
      "oficial": "Pré-ordem completa. O oficial desenha a ordem num diagrama e não a escreve na tela; o que dá para comparar é o tipo de ordem.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "linear"
  },
  {
    "chave": "sorting-20",
    "problematica": "sorting",
    "alternativas": 20,
    "criterios": 4,
    "oficial": {
      "ordenacao": 5,
      "tradeoff": 17
    },
    "nosso": {
      "ordenacao": 5,
      "tradeoff": 17
    },
    "resumo": "Todas as alternativas foram classificadas.",
    "descricao": "20 alternativas e 4 critérios; 3 classes; respostas sempre A.",
    "desfecho": {
      "nosso": "Alta: Alt 03, Alt 04, Alt 05, Alt 06, Alt 07, Alt 08, Alt 09 · Media: Alt 01, Alt 02, Alt 10, Alt 11, Alt 20 · Baixa: Alt 12, Alt 13, Alt 14, Alt 15, Alt 16, Alt 17, Alt 18, Alt 19",
      "oficial": "Alta: Alt 03, Alt 04, Alt 05, Alt 06, Alt 07, Alt 08, Alt 09 · Media: Alt 01, Alt 02, Alt 10, Alt 11, Alt 20 · Baixa: Alt 12, Alt 13, Alt 14, Alt 15, Alt 16, Alt 17, Alt 18, Alt 19",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "linear"
  },
  {
    "chave": "bc-20",
    "problematica": "beneficio_custo",
    "alternativas": 20,
    "criterios": 4,
    "oficial": {
      "ordenacao": 5,
      "tradeoff": 17
    },
    "nosso": {
      "ordenacao": 5,
      "tradeoff": 17
    },
    "resumo": "Carteira única pela razão benefício-custo: Alt 02, Alt 04, Alt 05, Alt 07, Alt 08, Alt 10 (custo 143.00 de 160.00).",
    "descricao": "20 alternativas e 4 critérios; orçamento de 160 para custos que somam 606; respostas sempre A.",
    "desfecho": {
      "nosso": "Carteira: Alt 02, Alt 04, Alt 05, Alt 07, Alt 08, Alt 10 (custo 143).",
      "oficial": "Carteira: Alt 02, Alt 04, Alt 05, Alt 07, Alt 08, Alt 10 (custo 143).",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "linear"
  },
  {
    "chave": "escolha-empate",
    "problematica": "escolha",
    "alternativas": 3,
    "criterios": 3,
    "oficial": null,
    "nosso": {
      "ordenacao": 3,
      "tradeoff": 0
    },
    "resumo": "3 alternativas ficaram equivalentes dentro do limiar de 0.01: Igual 1, Igual 2, Igual 3. Qualquer uma delas serve; mais perguntas não separariam.",
    "descricao": "3 alternativas e 3 critérios; respostas sempre A. Três alternativas idênticas: todo critério tem faixa zero.",
    "desfecho": {
      "nosso": "3 alternativas equivalentes dentro do limiar: Igual 1, Igual 2, Igual 3.",
      "oficial": null,
      "bate": null
    },
    "porque": "o oficial nao completa o caso",
    "bate": false,
    "tipo": "linear"
  },
  {
    "chave": "ranking-cruzado-curva",
    "problematica": "ranking",
    "alternativas": 3,
    "criterios": 3,
    "oficial": {
      "ordenacao": 3,
      "tradeoff": 3
    },
    "nosso": {
      "ordenacao": 3,
      "tradeoff": 3
    },
    "resumo": "Ranking completo: Plano A > Plano C > Plano B.",
    "descricao": "3 alternativas e 3 critérios; curva de valor não linear; respostas sempre A.",
    "desfecho": {
      "nosso": "Ordem completa: Plano A > Plano C > Plano B.",
      "oficial": null,
      "bate": null
    },
    "porque": null,
    "bate": true,
    "tipo": "curva"
  },
  {
    "chave": "escolha-cruzado-curva",
    "problematica": "escolha",
    "alternativas": 3,
    "criterios": 3,
    "oficial": {
      "ordenacao": 3,
      "tradeoff": 3
    },
    "nosso": {
      "ordenacao": 3,
      "tradeoff": 3
    },
    "resumo": "Recomendação: Plano A.",
    "descricao": "3 alternativas e 3 critérios; curva de valor não linear; respostas sempre A.",
    "desfecho": {
      "nosso": "Recomenda Plano A.",
      "oficial": "Recomenda Plano A.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "curva"
  },
  {
    "chave": "sorting-04-curva",
    "problematica": "sorting",
    "alternativas": 4,
    "criterios": 3,
    "oficial": {
      "ordenacao": 3,
      "tradeoff": 4
    },
    "nosso": {
      "ordenacao": 3,
      "tradeoff": 4
    },
    "resumo": "Todas as alternativas foram classificadas.",
    "descricao": "4 alternativas e 3 critérios; 3 classes; curva de valor não linear; respostas sempre A.",
    "desfecho": {
      "nosso": "Alta: Alt 02 · Media: Alt 01, Alt 04 · Baixa: Alt 03",
      "oficial": "Alta: Alt 02 · Media: Alt 01, Alt 04 · Baixa: Alt 03",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "curva"
  },
  {
    "chave": "bc-08-curva",
    "problematica": "beneficio_custo",
    "alternativas": 8,
    "criterios": 4,
    "oficial": {
      "ordenacao": 5,
      "tradeoff": 21
    },
    "nosso": {
      "ordenacao": 5,
      "tradeoff": 21
    },
    "resumo": "2 carteiras distintas saíram da ordenação por razão nas 4 amostras de pesos; 2 projetos ainda oscilam. A mais frequente aparece em 3 delas.",
    "descricao": "8 alternativas e 4 critérios; orçamento de 110 para custos que somam 241; curva de valor não linear; respostas sempre A.",
    "desfecho": {
      "nosso": "Carteira: Alt 02, Alt 03, Alt 04, Alt 05 (custo 110). É a mais frequente nas amostras de pesos; outra carteira ainda é possível.",
      "oficial": "Carteira: Alt 02, Alt 03, Alt 04, Alt 05 (custo 110).",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "curva"
  },
  {
    "chave": "nota-rival",
    "problematica": "ranking",
    "alternativas": 4,
    "criterios": 3,
    "oficial": {
      "ordenacao": 3,
      "tradeoff": 6
    },
    "nosso": {
      "ordenacao": 3,
      "tradeoff": 6
    },
    "resumo": "Ranking completo: Alt 1 > Alt 4 > Alt 3 > Alt 2.",
    "descricao": "4 alternativas e 3 critérios; critério discreto de 5 níveis; curva de valor não linear; respostas sempre A.",
    "desfecho": {
      "nosso": "Ordem completa: Alt 1 > Alt 4 > Alt 3 > Alt 2.",
      "oficial": "Ordem completa. O oficial desenha a ordem num diagrama e não a escreve na tela; o que dá para comparar é o tipo de ordem.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "discreto"
  },
  {
    "chave": "nota-em-foco",
    "problematica": "ranking",
    "alternativas": 4,
    "criterios": 3,
    "oficial": {
      "ordenacao": 3,
      "tradeoff": 6
    },
    "nosso": {
      "ordenacao": 3,
      "tradeoff": 6
    },
    "resumo": "Ranking parcial: 2 alternativas ainda sem posição definida.",
    "descricao": "4 alternativas e 3 critérios; critério discreto de 5 níveis; curva de valor não linear; respostas sempre A.",
    "desfecho": {
      "nosso": "Perguntas esgotadas sem ordem completa: Alt 1 > {Alt 3, Alt 4} > Alt 2. Entre chaves, alternativas que ainda não foram ordenadas.",
      "oficial": "Perguntas esgotadas sem ordem completa: o resultado dele é parcial.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "discreto"
  },
  {
    "chave": "nota-em-foco-AAAAAB",
    "problematica": "ranking",
    "alternativas": 4,
    "criterios": 3,
    "oficial": {
      "ordenacao": 3,
      "tradeoff": 6
    },
    "nosso": {
      "ordenacao": 3,
      "tradeoff": 6
    },
    "resumo": "Ranking parcial: 2 alternativas ainda sem posição definida.",
    "descricao": "4 alternativas e 3 critérios; critério discreto de 5 níveis; curva de valor não linear; respostas AAAAAB e depois A.",
    "desfecho": {
      "nosso": "Perguntas esgotadas sem ordem completa: Alt 1 > {Alt 3, Alt 4} > Alt 2. Entre chaves, alternativas que ainda não foram ordenadas.",
      "oficial": "Perguntas esgotadas sem ordem completa: o resultado dele é parcial.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "discreto"
  },
  {
    "chave": "nota-em-foco-AAAAB",
    "problematica": "ranking",
    "alternativas": 4,
    "criterios": 3,
    "oficial": {
      "ordenacao": 3,
      "tradeoff": 6
    },
    "nosso": {
      "ordenacao": 3,
      "tradeoff": 6
    },
    "resumo": "Ranking parcial: 2 alternativas ainda sem posição definida.",
    "descricao": "4 alternativas e 3 critérios; critério discreto de 5 níveis; curva de valor não linear; respostas AAAAB e depois A.",
    "desfecho": {
      "nosso": "Perguntas esgotadas sem ordem completa: Alt 1 > {Alt 3, Alt 4} > Alt 2. Entre chaves, alternativas que ainda não foram ordenadas.",
      "oficial": "Perguntas esgotadas sem ordem completa: o resultado dele é parcial.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "discreto"
  },
  {
    "chave": "nota-em-foco-AABAAA",
    "problematica": "ranking",
    "alternativas": 4,
    "criterios": 3,
    "oficial": {
      "ordenacao": 3,
      "tradeoff": 7
    },
    "nosso": {
      "ordenacao": 3,
      "tradeoff": 7
    },
    "resumo": "Ranking parcial: 2 alternativas ainda sem posição definida.",
    "descricao": "4 alternativas e 3 critérios; critério discreto de 5 níveis; curva de valor não linear; respostas AABAAA e depois A.",
    "desfecho": {
      "nosso": "Perguntas esgotadas sem ordem completa: Alt 1 > {Alt 3, Alt 4} > Alt 2. Entre chaves, alternativas que ainda não foram ordenadas.",
      "oficial": "Perguntas esgotadas sem ordem completa: o resultado dele é parcial.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "discreto"
  },
  {
    "chave": "nota-em-foco-AABAAB",
    "problematica": "ranking",
    "alternativas": 4,
    "criterios": 3,
    "oficial": {
      "ordenacao": 3,
      "tradeoff": 7
    },
    "nosso": {
      "ordenacao": 3,
      "tradeoff": 7
    },
    "resumo": "Ranking parcial: 2 alternativas ainda sem posição definida.",
    "descricao": "4 alternativas e 3 critérios; critério discreto de 5 níveis; curva de valor não linear; respostas AABAAB e depois A.",
    "desfecho": {
      "nosso": "Perguntas esgotadas sem ordem completa: Alt 1 > {Alt 3, Alt 4} > Alt 2. Entre chaves, alternativas que ainda não foram ordenadas.",
      "oficial": "Perguntas esgotadas sem ordem completa: o resultado dele é parcial.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "discreto"
  },
  {
    "chave": "nota-em-foco-linear",
    "problematica": "ranking",
    "alternativas": 4,
    "criterios": 3,
    "oficial": {
      "ordenacao": 3,
      "tradeoff": 6
    },
    "nosso": {
      "ordenacao": 3,
      "tradeoff": 6
    },
    "resumo": "Ranking completo: Alt 1 > Alt 4 > Alt 3 > Alt 2.",
    "descricao": "4 alternativas e 3 critérios; critério discreto de 5 níveis; respostas sempre A.",
    "desfecho": {
      "nosso": "Ordem completa: Alt 1 > Alt 4 > Alt 3 > Alt 2.",
      "oficial": "Ordem completa. O oficial desenha a ordem num diagrama e não a escreve na tela; o que dá para comparar é o tipo de ordem.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "discreto"
  },
  {
    "chave": "nota-em-foco-linear-AAB",
    "problematica": "ranking",
    "alternativas": 4,
    "criterios": 3,
    "oficial": {
      "ordenacao": 3,
      "tradeoff": 6
    },
    "nosso": {
      "ordenacao": 3,
      "tradeoff": 6
    },
    "resumo": "Ranking completo: Alt 1 > Alt 4 > Alt 3 > Alt 2.",
    "descricao": "4 alternativas e 3 critérios; critério discreto de 5 níveis; respostas AAB e depois A.",
    "desfecho": {
      "nosso": "Ordem completa: Alt 1 > Alt 4 > Alt 3 > Alt 2.",
      "oficial": "Ordem completa. O oficial desenha a ordem num diagrama e não a escreve na tela; o que dá para comparar é o tipo de ordem.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "discreto"
  },
  {
    "chave": "nota-em-foco-escolha",
    "problematica": "escolha",
    "alternativas": 4,
    "criterios": 3,
    "oficial": {
      "ordenacao": 3,
      "tradeoff": 3
    },
    "nosso": {
      "ordenacao": 3,
      "tradeoff": 3
    },
    "resumo": "Recomendação: Alt 1.",
    "descricao": "4 alternativas e 3 critérios; critério discreto de 5 níveis; curva de valor não linear; respostas sempre A.",
    "desfecho": {
      "nosso": "Recomenda Alt 1.",
      "oficial": "Recomenda Alt 1.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "discreto"
  },
  {
    "chave": "nota-em-foco-sorting",
    "problematica": "sorting",
    "alternativas": 4,
    "criterios": 3,
    "oficial": {
      "ordenacao": 3,
      "tradeoff": 4
    },
    "nosso": {
      "ordenacao": 3,
      "tradeoff": 4
    },
    "resumo": "Todas as alternativas foram classificadas.",
    "descricao": "4 alternativas e 3 critérios; 3 classes; critério discreto de 5 níveis; curva de valor não linear; respostas sempre A.",
    "desfecho": {
      "nosso": "Alta: Alt 1 · Media: Alt 3, Alt 4 · Baixa: Alt 2",
      "oficial": "Alta: Alt 1 · Media: Alt 3, Alt 4 · Baixa: Alt 2",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "discreto"
  },
  {
    "chave": "nota-em-foco-bc",
    "problematica": "beneficio_custo",
    "alternativas": 4,
    "criterios": 3,
    "oficial": {
      "ordenacao": 3,
      "tradeoff": 4
    },
    "nosso": {
      "ordenacao": 3,
      "tradeoff": 4
    },
    "resumo": "Carteira única pela razão benefício-custo: Alt 1, Alt 4 (custo 60.00 de 60.00).",
    "descricao": "4 alternativas e 3 critérios; orçamento de 60 para custos que somam 120; critério discreto de 5 níveis; curva de valor não linear; respostas sempre A.",
    "desfecho": {
      "nosso": "Carteira: Alt 1, Alt 4 (custo 60).",
      "oficial": "Carteira: Alt 1, Alt 4 (custo 60).",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "discreto"
  },
  {
    "chave": "sorting-20-qualidade-0.60",
    "problematica": "sorting",
    "alternativas": 20,
    "criterios": 4,
    "oficial": {
      "ordenacao": 5,
      "tradeoff": 22
    },
    "nosso": {
      "ordenacao": 5,
      "tradeoff": 22
    },
    "resumo": "1 alternativa ainda atravessa mais de uma classe.",
    "descricao": "20 alternativas e 4 critérios; 3 classes; respostas sempre A. Qualidade reescalada para 0,60 a 0,80.",
    "desfecho": {
      "nosso": "Alta: Alt 03, Alt 04, Alt 05, Alt 06, Alt 07, Alt 08, Alt 09 · Media: Alt 01, Alt 02, Alt 10, Alt 11 · Baixa: Alt 13, Alt 14, Alt 15, Alt 16, Alt 17, Alt 18, Alt 19, Alt 20 · ainda entre duas classes: Alt 12 (Baixa ou Media)",
      "oficial": null,
      "bate": null
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "sorting-20-custo-em-milhares",
    "problematica": "sorting",
    "alternativas": 20,
    "criterios": 4,
    "oficial": {
      "ordenacao": 5,
      "tradeoff": 25
    },
    "nosso": {
      "ordenacao": 5,
      "tradeoff": 25
    },
    "resumo": "1 alternativa ainda atravessa mais de uma classe.",
    "descricao": "20 alternativas e 4 critérios; 3 classes; respostas sempre A. Qualidade reescalada e custo em milhares.",
    "desfecho": {
      "nosso": "Alta: Alt 03, Alt 04, Alt 05, Alt 06, Alt 07, Alt 08, Alt 09 · Media: Alt 01, Alt 02, Alt 10, Alt 11 · Baixa: Alt 13, Alt 14, Alt 15, Alt 16, Alt 17, Alt 18, Alt 19, Alt 20 · ainda entre duas classes: Alt 12 (Baixa ou Media)",
      "oficial": null,
      "bate": null
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "escolha-06-nota",
    "problematica": "escolha",
    "alternativas": 6,
    "criterios": 5,
    "oficial": {
      "ordenacao": 8,
      "tradeoff": 24
    },
    "nosso": {
      "ordenacao": 8,
      "tradeoff": 24
    },
    "resumo": "2 alternativas seguem potencialmente ótimas: Alt 02, Alt 03.",
    "descricao": "6 alternativas e 5 critérios; critério discreto de 5 níveis; curva de valor não linear; respostas sempre A.",
    "desfecho": {
      "nosso": "Sem recomendação única: Alt 02, Alt 03 seguem em disputa.",
      "oficial": "Perguntas esgotadas sem recomendação única: o resultado dele é parcial.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "discreto"
  },
  {
    "chave": "bc-08-nota",
    "problematica": "beneficio_custo",
    "alternativas": 8,
    "criterios": 4,
    "oficial": {
      "ordenacao": 5,
      "tradeoff": 17
    },
    "nosso": {
      "ordenacao": 5,
      "tradeoff": 17
    },
    "resumo": "2 carteiras distintas saíram da ordenação por razão nas 4 amostras de pesos; 2 projetos ainda oscilam. A mais frequente aparece em 3 delas.",
    "descricao": "8 alternativas e 4 critérios; orçamento de 110 para custos que somam 241; critério discreto de 5 níveis; curva de valor não linear; respostas sempre A.",
    "desfecho": {
      "nosso": "Carteira: Alt 02, Alt 03, Alt 04, Alt 05 (custo 110). É a mais frequente nas amostras de pesos; outra carteira ainda é possível.",
      "oficial": "Carteira: Alt 02, Alt 03, Alt 04, Alt 05 (custo 110).",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "discreto"
  },
  {
    "chave": "sorting-06-nota",
    "problematica": "sorting",
    "alternativas": 6,
    "criterios": 5,
    "oficial": {
      "ordenacao": 8,
      "tradeoff": 9
    },
    "nosso": {
      "ordenacao": 8,
      "tradeoff": 9
    },
    "resumo": "Todas as alternativas foram classificadas.",
    "descricao": "6 alternativas e 5 critérios; 3 classes; critério discreto de 5 níveis; curva de valor não linear; respostas sempre A.",
    "desfecho": {
      "nosso": "Alta: Alt 02, Alt 03 · Media: Alt 01, Alt 04, Alt 06 · Baixa: Alt 05",
      "oficial": null,
      "bate": null
    },
    "porque": null,
    "bate": true,
    "tipo": "discreto"
  },
  {
    "chave": "est-quase-empate",
    "problematica": "ranking",
    "alternativas": 8,
    "criterios": 4,
    "oficial": {
      "ordenacao": 5,
      "tradeoff": 8
    },
    "nosso": {
      "ordenacao": 5,
      "tradeoff": 8
    },
    "resumo": "Ranking completo: Alt 04 > Alt 03 > Alt 02 > Alt 01 > Alt 05 > Alt 08 > Alt 06 > Alt 07.",
    "descricao": "8 alternativas e 4 critérios; respostas sempre A. Alternativas a 0,1% umas das outras.",
    "desfecho": {
      "nosso": "Ordem completa: Alt 04 > Alt 03 > Alt 02 > Alt 01 > Alt 05 > Alt 08 > Alt 06 > Alt 07.",
      "oficial": "Ordem completa. O oficial desenha a ordem num diagrama e não a escreve na tela; o que dá para comparar é o tipo de ordem.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "est-binario-unidades",
    "problematica": "ranking",
    "alternativas": 10,
    "criterios": 5,
    "oficial": {
      "ordenacao": 8,
      "tradeoff": 14
    },
    "nosso": {
      "ordenacao": 8,
      "tradeoff": 14
    },
    "resumo": "Ranking completo: Alt 04 > Alt 03 > Alt 02 > Alt 05 > Alt 01 > Alt 06 > Alt 10 > Alt 07 > Alt 09 > Alt 08.",
    "descricao": "10 alternativas e 5 critérios; respostas sempre A. Um critério de só dois valores, custo em milhares, prazo em frações.",
    "desfecho": {
      "nosso": "Ordem completa: Alt 04 > Alt 03 > Alt 02 > Alt 05 > Alt 01 > Alt 06 > Alt 10 > Alt 07 > Alt 09 > Alt 08.",
      "oficial": "Ordem completa. O oficial desenha a ordem num diagrama e não a escreve na tela; o que dá para comparar é o tipo de ordem.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "est-discreto7",
    "problematica": "ranking",
    "alternativas": 12,
    "criterios": 4,
    "oficial": {
      "ordenacao": 5,
      "tradeoff": 12
    },
    "nosso": {
      "ordenacao": 5,
      "tradeoff": 12
    },
    "resumo": "Ranking completo: Alt 04 > Alt 05 > Alt 03 > Alt 02 > Alt 06 > Alt 01 > Alt 07 > Alt 12 > Alt 08 > Alt 11 > Alt 10 > Alt 09.",
    "descricao": "12 alternativas e 4 critérios; critério discreto de 7 níveis; respostas sempre A. Nota de 7 níveis sem curva.",
    "desfecho": {
      "nosso": "Ordem completa: Alt 04 > Alt 05 > Alt 03 > Alt 02 > Alt 06 > Alt 01 > Alt 07 > Alt 12 > Alt 08 > Alt 11 > Alt 10 > Alt 09.",
      "oficial": "Ordem completa. O oficial desenha a ordem num diagrama e não a escreve na tela; o que dá para comparar é o tipo de ordem.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "est-respostas-ab",
    "problematica": "ranking",
    "alternativas": 12,
    "criterios": 5,
    "oficial": {
      "ordenacao": 8,
      "tradeoff": 14
    },
    "nosso": {
      "ordenacao": 8,
      "tradeoff": 14
    },
    "resumo": "Ranking completo: Alt 05 > Alt 06 > Alt 04 > Alt 07 > Alt 03 > Alt 08 > Alt 02 > Alt 09 > Alt 01 > Alt 12 > Alt 10 > Alt 11.",
    "descricao": "12 alternativas e 5 critérios; respostas ABBABAABBBAABABBAABA e depois A. Respostas alternando A e B.",
    "desfecho": {
      "nosso": "Ordem completa: Alt 05 > Alt 06 > Alt 04 > Alt 07 > Alt 03 > Alt 08 > Alt 02 > Alt 09 > Alt 01 > Alt 12 > Alt 10 > Alt 11.",
      "oficial": "Ordem completa. O oficial desenha a ordem num diagrama e não a escreve na tela; o que dá para comparar é o tipo de ordem.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "est-bc-6x25",
    "problematica": "beneficio_custo",
    "alternativas": 25,
    "criterios": 6,
    "oficial": {
      "ordenacao": 11,
      "tradeoff": 24
    },
    "nosso": {
      "ordenacao": 11,
      "tradeoff": 24
    },
    "resumo": "Carteira única pela razão benefício-custo: Alt 01, Alt 06, Alt 08, Alt 09, Alt 11, Alt 12, Alt 14 (custo 158.00 de 160.00).",
    "descricao": "25 alternativas e 6 critérios; orçamento de 160 para custos que somam 775; respostas sempre A.",
    "desfecho": {
      "nosso": "Carteira: Alt 01, Alt 06, Alt 08, Alt 09, Alt 11, Alt 12, Alt 14 (custo 158).",
      "oficial": "Carteira: Alt 01, Alt 06, Alt 08, Alt 09, Alt 11, Alt 12, Alt 14 (custo 158).",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "est-escolha-7x30",
    "problematica": "escolha",
    "alternativas": 30,
    "criterios": 7,
    "oficial": {
      "ordenacao": 15,
      "tradeoff": 14
    },
    "nosso": {
      "ordenacao": 15,
      "tradeoff": 14
    },
    "resumo": "Recomendação: Alt 08.",
    "descricao": "30 alternativas e 7 critérios; respostas sempre A.",
    "desfecho": {
      "nosso": "Recomenda Alt 08.",
      "oficial": "Recomenda Alt 08.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "est-ranking-7x25",
    "problematica": "ranking",
    "alternativas": 25,
    "criterios": 7,
    "oficial": {
      "ordenacao": 15,
      "tradeoff": 24
    },
    "nosso": {
      "ordenacao": 15,
      "tradeoff": 24
    },
    "resumo": "Pré-ordem completa: Alt 08 > Alt 07 > Alt 06 > Alt 10 > Alt 05 > Alt 09 > Alt 11 > Alt 04 > Alt 03 > Alt 12 > Alt 02 > Alt 13 > Alt 01 > Alt 14 > Alt 25 > Alt 15 > Alt 24 > Alt 16 ",
    "descricao": "25 alternativas e 7 critérios; respostas sempre A.",
    "desfecho": {
      "nosso": "Pré-ordem completa: Alt 08 > Alt 07 > Alt 06 > Alt 10 > {Alt 05, Alt 09} > Alt 11 > Alt 04 > Alt 03 > Alt 12 > Alt 02 > Alt 13 > Alt 01 > Alt 14 > Alt 25 > Alt 15 > Alt 24 > Alt 16 > Alt 17 > Alt 23 > Alt 22 > Alt 18 > Alt 20 > Alt 19 > Alt 21. Entre chaves, alternativas equivalentes dentro do limiar.",
      "oficial": "Pré-ordem completa. O oficial desenha a ordem num diagrama e não a escreve na tela; o que dá para comparar é o tipo de ordem.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "est-sorting-6x30",
    "problematica": "sorting",
    "alternativas": 30,
    "criterios": 6,
    "oficial": {
      "ordenacao": 11,
      "tradeoff": 24
    },
    "nosso": {
      "ordenacao": 11,
      "tradeoff": 24
    },
    "resumo": "Todas as alternativas foram classificadas.",
    "descricao": "30 alternativas e 6 critérios; 4 classes; respostas sempre A.",
    "desfecho": {
      "nosso": "C4: Alt 05, Alt 06, Alt 07, Alt 08, Alt 09, Alt 10, Alt 11, Alt 12, Alt 13 · C3: Alt 02, Alt 03, Alt 04, Alt 14, Alt 15 · C2: Alt 01, Alt 16, Alt 17, Alt 30 · C1: Alt 18, Alt 19, Alt 20, Alt 21, Alt 22, Alt 23, Alt 24, Alt 25, Alt 26, Alt 27, Alt 28, Alt 29",
      "oficial": "C4: Alt 05, Alt 06, Alt 07, Alt 08, Alt 09, Alt 10, Alt 11, Alt 12, Alt 13 · C3: Alt 02, Alt 03, Alt 04, Alt 14, Alt 15 · C2: Alt 01, Alt 16, Alt 17, Alt 30 · C1: Alt 18, Alt 19, Alt 20, Alt 21, Alt 22, Alt 23, Alt 24, Alt 25, Alt 26, Alt 27, Alt 28, Alt 29",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "fin-B1-bc-orcamento-apertado",
    "problematica": "beneficio_custo",
    "alternativas": 12,
    "criterios": 4,
    "oficial": {
      "ordenacao": 5,
      "tradeoff": 17
    },
    "nosso": {
      "ordenacao": 5,
      "tradeoff": 17
    },
    "resumo": "Carteira única pela razão benefício-custo: Alt 01 (custo 11.00 de 12.00).",
    "descricao": "12 alternativas e 4 critérios; orçamento de 12 para custos que somam 338; respostas sempre A. Orçamento apertado: só um projeto cabe.",
    "desfecho": {
      "nosso": "Carteira: Alt 01 (custo 11).",
      "oficial": "Carteira: Alt 01 (custo 11).",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "fin-B2-bc-orcamento-folgado",
    "problematica": "beneficio_custo",
    "alternativas": 10,
    "criterios": 4,
    "oficial": {
      "ordenacao": 5,
      "tradeoff": 14
    },
    "nosso": {
      "ordenacao": 5,
      "tradeoff": 14
    },
    "resumo": "Carteira única pela razão benefício-custo: Alt 01, Alt 02, Alt 03, Alt 04, Alt 05, Alt 06, Alt 07, Alt 08, Alt 09, Alt 10 (custo 227.00 de 237.00).",
    "descricao": "10 alternativas e 4 critérios; orçamento de 237 para custos que somam 227; respostas sempre A. Orçamento folgado: todos os projetos cabem.",
    "desfecho": {
      "nosso": "Carteira: Alt 01, Alt 02, Alt 03, Alt 04, Alt 05, Alt 06, Alt 07, Alt 08, Alt 09, Alt 10 (custo 227). É a mais frequente nas amostras de pesos; outra carteira ainda é possível.",
      "oficial": "Carteira: Alt 01, Alt 02, Alt 03, Alt 04, Alt 05, Alt 06, Alt 07, Alt 08, Alt 09, Alt 10 (custo 227).",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "fin-B3-bc-curva-nota",
    "problematica": "beneficio_custo",
    "alternativas": 10,
    "criterios": 5,
    "oficial": {
      "ordenacao": 8,
      "tradeoff": 33
    },
    "nosso": {
      "ordenacao": 8,
      "tradeoff": 33
    },
    "resumo": "2 carteiras distintas saíram da ordenação por razão nas 8 amostras de pesos; 2 projetos ainda oscilam. A mais frequente aparece em 6 delas.",
    "descricao": "10 alternativas e 5 critérios; orçamento de 92.67 para custos que somam 278; critério discreto de 5 níveis; curva de valor não linear; respostas ABAB e depois A. Curva não linear e nota discreta.",
    "desfecho": {
      "nosso": "Carteira: Alt 01, Alt 03, Alt 06, Alt 07 (custo 83). É a mais frequente nas amostras de pesos; outra carteira ainda é possível.",
      "oficial": "Carteira: Alt 01, Alt 03, Alt 06, Alt 07 (custo 83).",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "fin-B4-bc-7x30-misto",
    "problematica": "beneficio_custo",
    "alternativas": 30,
    "criterios": 7,
    "oficial": {
      "ordenacao": 15,
      "tradeoff": 50
    },
    "nosso": {
      "ordenacao": 15,
      "tradeoff": 50
    },
    "resumo": "A carteira já está definida pela razão benefício-custo: Alt 03, Alt 07, Alt 08, Alt 09, Alt 10, Alt 12, Alt 13, Alt 16, Alt 21, Alt 24 (custo 207.00 de 210.25). 1 par de projetos a",
    "descricao": "30 alternativas e 7 critérios; orçamento de 210.25 para custos que somam 841; respostas ABBAABBABA e depois A. O maior caso de benefício-custo.",
    "desfecho": {
      "nosso": "Carteira: Alt 03, Alt 07, Alt 08, Alt 09, Alt 10, Alt 12, Alt 13, Alt 16, Alt 21, Alt 24 (custo 207).",
      "oficial": "Carteira: Alt 03, Alt 07, Alt 08, Alt 09, Alt 10, Alt 12, Alt 13, Alt 16, Alt 21, Alt 24 (custo 207).",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "fin-B5-bc-razoes-iguais",
    "problematica": "beneficio_custo",
    "alternativas": 12,
    "criterios": 4,
    "oficial": {
      "ordenacao": 5,
      "tradeoff": 11
    },
    "nosso": {
      "ordenacao": 5,
      "tradeoff": 11
    },
    "resumo": "Carteira única pela razão benefício-custo: Alt 01, Alt 03, Alt 04, Alt 05 (custo 110.00 de 120.00).",
    "descricao": "12 alternativas e 4 critérios; orçamento de 120 para custos que somam 360; respostas sempre A. Projetos com a mesma razão benefício/custo.",
    "desfecho": {
      "nosso": "Carteira: Alt 01, Alt 03, Alt 04, Alt 05 (custo 110).",
      "oficial": "Carteira: Alt 01, Alt 03, Alt 04, Alt 05 (custo 110).",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "fin-E1-escolha-curva-nota",
    "problematica": "escolha",
    "alternativas": 12,
    "criterios": 5,
    "oficial": {
      "ordenacao": 8,
      "tradeoff": 3
    },
    "nosso": {
      "ordenacao": 8,
      "tradeoff": 3
    },
    "resumo": "Recomendação: Alt 04.",
    "descricao": "12 alternativas e 5 critérios; critério discreto de 5 níveis; curva de valor não linear; respostas ABABBAABAB e depois A. Curva não linear em todos os critérios e nota de 1 a 5.",
    "desfecho": {
      "nosso": "Recomenda Alt 04.",
      "oficial": "Recomenda Alt 04.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "fin-E2-escolha-min-milhoes",
    "problematica": "escolha",
    "alternativas": 15,
    "criterios": 7,
    "oficial": {
      "ordenacao": 15,
      "tradeoff": 23
    },
    "nosso": {
      "ordenacao": 15,
      "tradeoff": 23
    },
    "resumo": "3 alternativas ficaram equivalentes dentro do limiar de 0.01: Alt 05, Alt 06, Alt 07. Qualquer uma delas serve; mais perguntas não separariam.",
    "descricao": "15 alternativas e 7 critérios; todas as respostas B. Custo em milhões.",
    "desfecho": {
      "nosso": "3 alternativas equivalentes dentro do limiar: Alt 05, Alt 06, Alt 07.",
      "oficial": "3 alternativas equivalentes dentro do limiar: Alt 05, Alt 06, Alt 07.",
      "bate": true
    },
    "porque": "A primeira resposta é B: as mesmas 23 perguntas, com os mesmos valores, em outra ordem da 3ª à 14ª.",
    "bate": false,
    "tipo": "estresse"
  },
  {
    "chave": "fin-E3-escolha-quase-empate",
    "problematica": "escolha",
    "alternativas": 12,
    "criterios": 4,
    "oficial": {
      "ordenacao": 5,
      "tradeoff": 2
    },
    "nosso": {
      "ordenacao": 5,
      "tradeoff": 2
    },
    "resumo": "Recomendação: Alt 04.",
    "descricao": "12 alternativas e 4 critérios; respostas sempre A. Doze alternativas quase empatadas, com a qualidade quase constante.",
    "desfecho": {
      "nosso": "Recomenda Alt 04.",
      "oficial": "Recomenda Alt 04.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "fin-R2-ranking-curva-nota4",
    "problematica": "ranking",
    "alternativas": 10,
    "criterios": 5,
    "oficial": {
      "ordenacao": 8,
      "tradeoff": 31
    },
    "nosso": {
      "ordenacao": 8,
      "tradeoff": 31
    },
    "resumo": "Ranking completo: Alt 05 > Alt 03 > Alt 02 > Alt 06 > Alt 01 > Alt 04 > Alt 09 > Alt 10 > Alt 07 > Alt 08.",
    "descricao": "10 alternativas e 5 critérios; critério discreto de 4 níveis; curva de valor não linear; respostas ABBAABAB e depois A. Curva não linear e nota de 4 níveis.",
    "desfecho": {
      "nosso": "Ordem completa: Alt 05 > Alt 03 > Alt 02 > Alt 06 > Alt 01 > Alt 04 > Alt 09 > Alt 10 > Alt 07 > Alt 08.",
      "oficial": "Ordem completa. O oficial desenha a ordem num diagrama e não a escreve na tela; o que dá para comparar é o tipo de ordem.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "fin-S1-sorting-7x25-4c",
    "problematica": "sorting",
    "alternativas": 25,
    "criterios": 7,
    "oficial": {
      "ordenacao": 15,
      "tradeoff": 22
    },
    "nosso": {
      "ordenacao": 15,
      "tradeoff": 22
    },
    "resumo": "Todas as alternativas foram classificadas.",
    "descricao": "25 alternativas e 7 critérios; 4 classes; respostas ABBABAAB e depois A. Quatro classes.",
    "desfecho": {
      "nosso": "C4: Alt 07, Alt 08, Alt 09, Alt 10, Alt 11, Alt 12, Alt 13 · C3: Alt 04, Alt 05, Alt 06, Alt 14, Alt 15, Alt 16 · C2: Alt 02, Alt 03, Alt 17, Alt 18 · C1: Alt 01, Alt 19, Alt 20, Alt 21, Alt 22, Alt 23, Alt 24, Alt 25",
      "oficial": "C4: Alt 07, Alt 08, Alt 09, Alt 10, Alt 11, Alt 12, Alt 13 · C3: Alt 04, Alt 05, Alt 06, Alt 14, Alt 15, Alt 16 · C2: Alt 02, Alt 03, Alt 17, Alt 18 · C1: Alt 01, Alt 19, Alt 20, Alt 21, Alt 22, Alt 23, Alt 24, Alt 25",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "fin-S2-sorting-perfis-pontas",
    "problematica": "sorting",
    "alternativas": 15,
    "criterios": 5,
    "oficial": {
      "ordenacao": 8,
      "tradeoff": 18
    },
    "nosso": {
      "ordenacao": 8,
      "tradeoff": 18
    },
    "resumo": "Todas as alternativas foram classificadas.",
    "descricao": "15 alternativas e 5 critérios; 3 classes; respostas sempre A. Limites entre as classes perto das pontas.",
    "desfecho": {
      "nosso": "C3: Alt 04, Alt 05, Alt 06 · C2: Alt 01, Alt 02, Alt 03, Alt 07, Alt 08, Alt 09, Alt 10, Alt 14, Alt 15 · C1: Alt 11, Alt 12, Alt 13",
      "oficial": "C3: Alt 04, Alt 05, Alt 06 · C2: Alt 01, Alt 02, Alt 03, Alt 07, Alt 08, Alt 09, Alt 10, Alt 14, Alt 15 · C1: Alt 11, Alt 12, Alt 13",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "fin-S3-sorting-curva-nota",
    "problematica": "sorting",
    "alternativas": 10,
    "criterios": 5,
    "oficial": {
      "ordenacao": 8,
      "tradeoff": 10
    },
    "nosso": {
      "ordenacao": 8,
      "tradeoff": 10
    },
    "resumo": "Todas as alternativas foram classificadas.",
    "descricao": "10 alternativas e 5 critérios; 3 classes; critério discreto de 5 níveis; curva de valor não linear; respostas AABAB e depois A. Curva não linear e nota discreta.",
    "desfecho": {
      "nosso": "C3: Alt 02, Alt 03, Alt 04, Alt 05 · C2: Alt 01, Alt 06, Alt 07, Alt 09, Alt 10 · C1: Alt 08",
      "oficial": "C3: Alt 02, Alt 03, Alt 04, Alt 05 · C2: Alt 01, Alt 06, Alt 07, Alt 09, Alt 10 · C1: Alt 08",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "fin-S4-sorting-2c-milhares",
    "problematica": "sorting",
    "alternativas": 14,
    "criterios": 4,
    "oficial": {
      "ordenacao": 5,
      "tradeoff": 15
    },
    "nosso": {
      "ordenacao": 5,
      "tradeoff": 15
    },
    "resumo": "Todas as alternativas foram classificadas.",
    "descricao": "14 alternativas e 4 critérios; 2 classes; respostas ABAB e depois A. Duas classes, custo em milhares.",
    "desfecho": {
      "nosso": "C2: Alt 03, Alt 04, Alt 05, Alt 06, Alt 07, Alt 08 · C1: Alt 01, Alt 02, Alt 09, Alt 10, Alt 11, Alt 12, Alt 13, Alt 14",
      "oficial": "C2: Alt 03, Alt 04, Alt 05, Alt 06, Alt 07, Alt 08 · C1: Alt 01, Alt 02, Alt 09, Alt 10, Alt 11, Alt 12, Alt 13, Alt 14",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "vol-bc-3x8",
    "problematica": "beneficio_custo",
    "alternativas": 8,
    "criterios": 3,
    "oficial": {
      "ordenacao": 3,
      "tradeoff": 0
    },
    "nosso": {
      "ordenacao": 3,
      "tradeoff": 0
    },
    "resumo": "Considerando o orçamento, a carteira está definida: Alt 02, Alt 03 (custo 34.00 de 50.00). A ordem entre os projetos que ficam de fora ainda está aberta, mas nenhuma delas muda a c",
    "descricao": "8 alternativas e 3 critérios; orçamento de 50 para custos que somam 219; respostas sempre A. O orçamento decide a carteira antes de qualquer pergunta.",
    "desfecho": {
      "nosso": "Carteira: Alt 02, Alt 03 (custo 34).",
      "oficial": "Carteira: Alt 02, Alt 03 (custo 34).",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "vol-bc-4x10",
    "problematica": "beneficio_custo",
    "alternativas": 10,
    "criterios": 4,
    "oficial": {
      "ordenacao": 5,
      "tradeoff": 11
    },
    "nosso": {
      "ordenacao": 5,
      "tradeoff": 11
    },
    "resumo": "Carteira única pela razão benefício-custo: Alt 01, Alt 02, Alt 03, Alt 05 (custo 78.00 de 80.00).",
    "descricao": "10 alternativas e 4 critérios; orçamento de 80 para custos que somam 263; respostas sempre A.",
    "desfecho": {
      "nosso": "Carteira: Alt 01, Alt 02, Alt 03, Alt 05 (custo 78).",
      "oficial": "Carteira: Alt 01, Alt 02, Alt 03, Alt 05 (custo 78).",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "vol-bc-4x20",
    "problematica": "beneficio_custo",
    "alternativas": 20,
    "criterios": 4,
    "oficial": {
      "ordenacao": 5,
      "tradeoff": 23
    },
    "nosso": {
      "ordenacao": 5,
      "tradeoff": 23
    },
    "resumo": "A carteira já está definida pela razão benefício-custo: Alt 03, Alt 06, Alt 07, Alt 11 (custo 54.00 de 60.00). 1 par de projetos ainda não tem a ordem de razão fechada.",
    "descricao": "20 alternativas e 4 critérios; orçamento de 60 para custos que somam 444; respostas sempre A.",
    "desfecho": {
      "nosso": "Carteira: Alt 03, Alt 06, Alt 07, Alt 11 (custo 54).",
      "oficial": "Carteira: Alt 03, Alt 06, Alt 07, Alt 11 (custo 54).",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "vol-bc-5x15-ab",
    "problematica": "beneficio_custo",
    "alternativas": 15,
    "criterios": 5,
    "oficial": {
      "ordenacao": 8,
      "tradeoff": 23
    },
    "nosso": {
      "ordenacao": 8,
      "tradeoff": 23
    },
    "resumo": "Carteira única pela razão benefício-custo: Alt 02, Alt 05, Alt 06, Alt 08, Alt 10 (custo 107.00 de 120.00).",
    "descricao": "15 alternativas e 5 critérios; orçamento de 120 para custos que somam 413; respostas ABABABABABAB e depois A.",
    "desfecho": {
      "nosso": "Carteira: Alt 02, Alt 05, Alt 06, Alt 08, Alt 10 (custo 107).",
      "oficial": "Carteira: Alt 02, Alt 05, Alt 06, Alt 08, Alt 10 (custo 107).",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "vol-bc-6x12-b",
    "problematica": "beneficio_custo",
    "alternativas": 12,
    "criterios": 6,
    "oficial": {
      "ordenacao": 11,
      "tradeoff": 11
    },
    "nosso": {
      "ordenacao": 11,
      "tradeoff": 11
    },
    "resumo": "Carteira única pela razão benefício-custo: Alt 02, Alt 04, Alt 05, Alt 08, Alt 09, Alt 10 (custo 95.00 de 100.00).",
    "descricao": "12 alternativas e 6 critérios; orçamento de 100 para custos que somam 298; respostas BBABBABBAB e depois A.",
    "desfecho": {
      "nosso": "Carteira: Alt 02, Alt 04, Alt 05, Alt 08, Alt 09, Alt 10 (custo 95).",
      "oficial": "Carteira: Alt 02, Alt 04, Alt 05, Alt 08, Alt 09, Alt 10 (custo 95).",
      "bate": true
    },
    "porque": "A primeira resposta é B: mesma contagem de perguntas, mas os pares vêm em outra ordem a partir da 3ª pergunta.",
    "bate": false,
    "tipo": "estresse"
  },
  {
    "chave": "vol-escolha-4x10",
    "problematica": "escolha",
    "alternativas": 10,
    "criterios": 4,
    "oficial": {
      "ordenacao": 5,
      "tradeoff": 8
    },
    "nosso": {
      "ordenacao": 5,
      "tradeoff": 8
    },
    "resumo": "Recomendação: Alt 03.",
    "descricao": "10 alternativas e 4 critérios; respostas sempre A.",
    "desfecho": {
      "nosso": "Recomenda Alt 03.",
      "oficial": "Recomenda Alt 03.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "vol-escolha-4x8-nota3",
    "problematica": "escolha",
    "alternativas": 8,
    "criterios": 4,
    "oficial": {
      "ordenacao": 5,
      "tradeoff": 0
    },
    "nosso": {
      "ordenacao": 5,
      "tradeoff": 0
    },
    "resumo": "Recomendação: Alt 03.",
    "descricao": "8 alternativas e 4 critérios; critério discreto de 3 níveis; respostas sempre A.",
    "desfecho": {
      "nosso": "Recomenda Alt 03.",
      "oficial": "Recomenda Alt 03.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "vol-escolha-5x25-b",
    "problematica": "escolha",
    "alternativas": 25,
    "criterios": 5,
    "oficial": {
      "ordenacao": 8,
      "tradeoff": 6
    },
    "nosso": {
      "ordenacao": 8,
      "tradeoff": 3
    },
    "resumo": "2 alternativas ficaram equivalentes dentro do limiar de 0.01: Alt 11, Alt 12. Qualquer uma delas serve; mais perguntas não separariam.",
    "descricao": "25 alternativas e 5 critérios; respostas BBABBABBABBABB e depois A.",
    "desfecho": {
      "nosso": "2 alternativas equivalentes dentro do limiar: Alt 11, Alt 12.",
      "oficial": "Recomenda Alt 11.",
      "bate": false
    },
    "porque": "A primeira resposta é B. Nesse caso o oficial escolhe os pares numa ordem diferente da nossa a partir da 3ª pergunta; os valores de cada pergunta são os mesmos, o caminho não.",
    "bate": false,
    "tipo": "estresse"
  },
  {
    "chave": "vol-escolha-6x12-ab",
    "problematica": "escolha",
    "alternativas": 12,
    "criterios": 6,
    "oficial": {
      "ordenacao": 11,
      "tradeoff": 20
    },
    "nosso": {
      "ordenacao": 11,
      "tradeoff": 20
    },
    "resumo": "Recomendação: Alt 05.",
    "descricao": "12 alternativas e 6 critérios; respostas ABABABABABABABAB e depois A.",
    "desfecho": {
      "nosso": "Recomenda Alt 05.",
      "oficial": "Recomenda Alt 05.",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "vol-ranking-4x10-ab",
    "problematica": "ranking",
    "alternativas": 10,
    "criterios": 4,
    "oficial": {
      "ordenacao": 5,
      "tradeoff": 15
    },
    "nosso": {
      "ordenacao": 5,
      "tradeoff": 16
    },
    "resumo": "Ranking completo: Alt 04 > Alt 05 > Alt 03 > Alt 06 > Alt 07 > Alt 02 > Alt 08 > Alt 01 > Alt 10 > Alt 09.",
    "descricao": "10 alternativas e 4 critérios; respostas ABABABABABAB e depois A.",
    "desfecho": {
      "nosso": "Ordem completa: Alt 04 > Alt 05 > Alt 03 > Alt 06 > Alt 07 > Alt 02 > Alt 08 > Alt 01 > Alt 10 > Alt 09.",
      "oficial": "Ordem completa. O oficial desenha a ordem num diagrama e não a escreve na tela; o que dá para comparar é o tipo de ordem.",
      "bate": true
    },
    "porque": "Na última pergunta, um par fica a 0,010041 do limiar de equivalência de 0,01. O oficial o dá por ordenado; nós não, e fazemos uma pergunta a mais. Diferença na quarta casa decimal.",
    "bate": false,
    "tipo": "estresse"
  },
  {
    "chave": "vol-ranking-5x12-b",
    "problematica": "ranking",
    "alternativas": 12,
    "criterios": 5,
    "oficial": {
      "ordenacao": 8,
      "tradeoff": 17
    },
    "nosso": {
      "ordenacao": 8,
      "tradeoff": 15
    },
    "resumo": "Pré-ordem completa: Alt 06 > Alt 05 > Alt 07 > Alt 04 > Alt 08 > Alt 03 > Alt 09 > Alt 02 > Alt 10 > Alt 01 > Alt 11 > Alt 12. 2 par(es) empatam dentro do limiar de 0.01.",
    "descricao": "12 alternativas e 5 critérios; todas as respostas B.",
    "desfecho": {
      "nosso": "Pré-ordem completa: Alt 06 > {Alt 05, Alt 07} > Alt 04 > Alt 08 > Alt 03 > Alt 09 > Alt 02 > Alt 10 > {Alt 01, Alt 11} > Alt 12. Entre chaves, alternativas equivalentes dentro do limiar.",
      "oficial": "Pré-ordem completa. O oficial desenha a ordem num diagrama e não a escreve na tela; o que dá para comparar é o tipo de ordem.",
      "bate": true
    },
    "porque": "A primeira resposta é B: os pares vêm em outra ordem da 3ª à 10ª pergunta, e o oficial termina com 2 perguntas a mais.",
    "bate": false,
    "tipo": "estresse"
  },
  {
    "chave": "vol-ranking-6x15",
    "problematica": "ranking",
    "alternativas": 15,
    "criterios": 6,
    "oficial": {
      "ordenacao": 11,
      "tradeoff": 22
    },
    "nosso": {
      "ordenacao": 11,
      "tradeoff": 21
    },
    "resumo": "Pré-ordem completa: Alt 05 > Alt 04 > Alt 06 > Alt 03 > Alt 02 > Alt 07 > Alt 08 > Alt 01 > Alt 09 > Alt 15 > Alt 10 > Alt 14 > Alt 11 > Alt 13 > Alt 12. 1 par(es) empatam dentro d",
    "descricao": "15 alternativas e 6 critérios; respostas sempre A.",
    "desfecho": {
      "nosso": "Pré-ordem completa: Alt 05 > Alt 04 > Alt 06 > Alt 03 > Alt 02 > Alt 07 > Alt 08 > Alt 01 > Alt 09 > Alt 15 > Alt 10 > Alt 14 > {Alt 11, Alt 13} > Alt 12. Entre chaves, alternativas equivalentes dentro do limiar.",
      "oficial": "Pré-ordem completa. O oficial desenha a ordem num diagrama e não a escreve na tela; o que dá para comparar é o tipo de ordem.",
      "bate": true
    },
    "porque": "Na última pergunta, um par fica a 0,009962 do limiar de equivalência de 0,01. Nós o damos por ordenado; o oficial não, e faz uma pergunta a mais. Diferença na quarta casa decimal.",
    "bate": false,
    "tipo": "estresse"
  },
  {
    "chave": "vol-sorting-3x10-b",
    "problematica": "sorting",
    "alternativas": 10,
    "criterios": 3,
    "oficial": {
      "ordenacao": 3,
      "tradeoff": 2
    },
    "nosso": {
      "ordenacao": 3,
      "tradeoff": 2
    },
    "resumo": "Todas as alternativas foram classificadas.",
    "descricao": "10 alternativas e 3 critérios; 2 classes; todas as respostas B.",
    "desfecho": {
      "nosso": "C2: Alt 03, Alt 04, Alt 05, Alt 06 · C1: Alt 01, Alt 02, Alt 07, Alt 08, Alt 09, Alt 10",
      "oficial": "C2: Alt 03, Alt 04, Alt 05, Alt 06 · C1: Alt 01, Alt 02, Alt 07, Alt 08, Alt 09, Alt 10",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "vol-sorting-4x12",
    "problematica": "sorting",
    "alternativas": 12,
    "criterios": 4,
    "oficial": {
      "ordenacao": 5,
      "tradeoff": 11
    },
    "nosso": {
      "ordenacao": 5,
      "tradeoff": 11
    },
    "resumo": "Todas as alternativas foram classificadas.",
    "descricao": "12 alternativas e 4 critérios; 3 classes; respostas sempre A.",
    "desfecho": {
      "nosso": "C3: Alt 02, Alt 03, Alt 04, Alt 05, Alt 06 · C2: Alt 01, Alt 07 · C1: Alt 08, Alt 09, Alt 10, Alt 11, Alt 12",
      "oficial": "C3: Alt 02, Alt 03, Alt 04, Alt 05, Alt 06 · C2: Alt 01, Alt 07 · C1: Alt 08, Alt 09, Alt 10, Alt 11, Alt 12",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "vol-sorting-5x20-4c",
    "problematica": "sorting",
    "alternativas": 20,
    "criterios": 5,
    "oficial": {
      "ordenacao": 8,
      "tradeoff": 20
    },
    "nosso": {
      "ordenacao": 8,
      "tradeoff": 20
    },
    "resumo": "Todas as alternativas foram classificadas.",
    "descricao": "20 alternativas e 5 critérios; 4 classes; respostas ABBAABBAABBA e depois A.",
    "desfecho": {
      "nosso": "C4: Alt 06, Alt 07, Alt 08, Alt 09, Alt 10 · C3: Alt 04, Alt 05, Alt 11, Alt 12, Alt 13 · C2: Alt 02, Alt 03, Alt 14 · C1: Alt 01, Alt 15, Alt 16, Alt 17, Alt 18, Alt 19, Alt 20",
      "oficial": "C4: Alt 06, Alt 07, Alt 08, Alt 09, Alt 10 · C3: Alt 04, Alt 05, Alt 11, Alt 12, Alt 13 · C2: Alt 02, Alt 03, Alt 14 · C1: Alt 01, Alt 15, Alt 16, Alt 17, Alt 18, Alt 19, Alt 20",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  },
  {
    "chave": "vol-sorting-6x15",
    "problematica": "sorting",
    "alternativas": 15,
    "criterios": 6,
    "oficial": {
      "ordenacao": 11,
      "tradeoff": 21
    },
    "nosso": {
      "ordenacao": 11,
      "tradeoff": 21
    },
    "resumo": "Todas as alternativas foram classificadas.",
    "descricao": "15 alternativas e 6 critérios; 3 classes; respostas sempre A.",
    "desfecho": {
      "nosso": "C3: Alt 02, Alt 03, Alt 04, Alt 05, Alt 06, Alt 07 · C2: Alt 01, Alt 08, Alt 15 · C1: Alt 09, Alt 10, Alt 11, Alt 12, Alt 13, Alt 14",
      "oficial": "C3: Alt 02, Alt 03, Alt 04, Alt 05, Alt 06, Alt 07 · C2: Alt 01, Alt 08, Alt 15 · C1: Alt 09, Alt 10, Alt 11, Alt 12, Alt 13, Alt 14",
      "bate": true
    },
    "porque": null,
    "bate": true,
    "tipo": "estresse"
  }
];

export const RESUMO = {
  bate: 67,
  comparaveis: 73,
  travados: 1,
  maiorProblema: 30,
};
