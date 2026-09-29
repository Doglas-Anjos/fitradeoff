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
  /** De onde vem o caso: os 16 lineares originais, ou os medidos depois. */
  tipo: "linear" | "curva" | "discreto" | "estresse";
}

export const MEDIDO_EM = "2026-09-29";

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
    "resumo": "Pré-ordem completa: Alt 03 > Alt 04 > Alt 02 > Alt 01 > Alt 05 > Alt 08 > Alt 06 > Alt 07. 1 par(es) empatam dentro do limiar de 0.01.",
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
    "resumo": "Pré-ordem completa: Alt 04 > Alt 03 > Alt 05 > Alt 02 > Alt 06 > Alt 01 > Alt 07 > Alt 12 > Alt 08 > Alt 11 > Alt 10 > Alt 09. 1 par(es) empatam dentro do limiar de 0.01.",
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
    "bate": true,
    "tipo": "estresse"
  }
];

export const RESUMO = {
  bate: 40,
  comparaveis: 40,
  travados: 1,
  maiorProblema: 20,
};
