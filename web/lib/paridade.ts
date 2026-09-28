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
  bate: boolean;
}

export const MEDIDO_EM = "2026-09-28";

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
    "bate": true
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
    "bate": true
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
    "bate": true
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
    "bate": true
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
    "bate": true
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
    "bate": true
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
    "bate": true
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
    "bate": true
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
    "bate": true
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
    "bate": true
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
    "bate": true
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
    "bate": true
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
    "bate": true
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
    "bate": true
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
    "bate": true
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
    "bate": true
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
    "bate": false
  }
];

export const RESUMO = {
  bate: 16,
  comparaveis: 16,
  travados: 1,
  maiorProblema: 20,
};
