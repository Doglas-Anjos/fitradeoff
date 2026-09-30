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
      "ordenacao": 14,
      "tradeoff": 14
    },
    "resumo": "Recomendação: Alt 08.",
    "bate": false,
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
      "ordenacao": 14,
      "tradeoff": 24
    },
    "resumo": "Pré-ordem completa: Alt 08 > Alt 07 > Alt 06 > Alt 10 > Alt 05 > Alt 09 > Alt 11 > Alt 04 > Alt 03 > Alt 12 > Alt 02 > Alt 13 > Alt 01 > Alt 14 > Alt 25 > Alt 15 > Alt 24 > Alt 16 ",
    "bate": false,
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
      "ordenacao": 14,
      "tradeoff": 50
    },
    "resumo": "A carteira já está definida pela razão benefício-custo: Alt 03, Alt 07, Alt 08, Alt 09, Alt 10, Alt 12, Alt 13, Alt 16, Alt 21, Alt 24 (custo 207.00 de 210.25). 1 par de projetos a",
    "bate": false,
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
      "ordenacao": 14,
      "tradeoff": 23
    },
    "resumo": "3 alternativas ficaram equivalentes dentro do limiar de 0.01: Alt 05, Alt 06, Alt 07. Qualquer uma delas serve; mais perguntas não separariam.",
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
      "ordenacao": 14,
      "tradeoff": 22
    },
    "resumo": "Todas as alternativas foram classificadas.",
    "bate": false,
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
    "resumo": "Pré-ordem completa: Alt 05 > Alt 04 > Alt 06 > Alt 03 > Alt 02 > Alt 07 > Alt 08 > Alt 01 > Alt 09 > Alt 15 > Alt 10 > Alt 14 > Alt 11 > Alt 12 > Alt 13. 3 par(es) empatam dentro d",
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
    "bate": true,
    "tipo": "estresse"
  }
];

export const RESUMO = {
  bate: 62,
  comparaveis: 72,
  travados: 1,
  maiorProblema: 30,
};
