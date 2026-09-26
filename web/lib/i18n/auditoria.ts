/**
 * Catálogo da trilha de auditoria.
 *
 * O vocabulário aqui é de quem audita, não de quem decide. Quem abre esse
 * painel quer saber **de onde veio** a recomendação: qual declaração entrou em
 * que momento, e qual restrição cada uma impôs ao espaço de pesos. Por isso
 * "declaração" e "restrição" aparecem com esses nomes, e não suavizados.
 *
 * A trilha é a mesma que a API devolve em `/decisoes/{id}/auditoria` e que a
 * planilha exporta: uma narrativa só, servida em lugares diferentes. Se as
 * versões divergirem, a auditoria deixa de valer.
 */

import { registrar } from "./index";
import "./nucleo";

export const AUDITORIA = registrar({
  "auditoria.abrir": { pt: "Por que este resultado?", en: "Why this result?" },
  "auditoria.fechar": { pt: "Fechar a trilha", en: "Close the trail" },
  "auditoria.titulo": { pt: "Trilha da decisão", en: "Decision trail" },
  "auditoria.carregando": { pt: "Carregando a trilha…", en: "Loading the trail…" },
  "auditoria.erro": {
    pt: "Não foi possível carregar a trilha.",
    en: "Could not load the trail.",
  },
  "auditoria.tentarDeNovo": { pt: "Tentar de novo", en: "Try again" },

  "auditoria.declaracoes.titulo": {
    pt: "O que foi declarado",
    en: "What was stated",
  },
  "auditoria.declaracoes.vazio": {
    pt: "Nada foi declarado ainda.",
    en: "Nothing has been stated yet.",
  },
  "auditoria.declaracoes.uma": { pt: "1 declaração", en: "1 statement" },
  "auditoria.declaracoes.varias": {
    pt: "{n} declarações",
    en: "{n} statements",
  },

  "auditoria.restricoes.titulo": {
    pt: "O que isso impôs ao espaço de pesos",
    en: "What this imposed on the weight space",
  },
  "auditoria.restricoes.vazio": {
    pt: "Nenhuma restrição ativa: o espaço de pesos ainda é o inteiro.",
    en: "No active constraints: the weight space is still the full one.",
  },
  "auditoria.restricoes.uma": { pt: "1 restrição ativa", en: "1 active constraint" },
  "auditoria.restricoes.varias": {
    pt: "{n} restrições ativas",
    en: "{n} active constraints",
  },
  /* Uma mesma declaração pode impor mais de uma desigualdade: ordenar três
     critérios impõe duas. A contagem evita listar a frase repetida. */
  "auditoria.restricoes.vezes": {
    pt: "impôs {n} restrições",
    en: "imposed {n} constraints",
  },

  "auditoria.comoLer": { pt: "Como ler esta trilha", en: "How to read this trail" },
  "auditoria.autor.decisor": { pt: "decisor", en: "decision maker" },
  "auditoria.autor.sistema": { pt: "sistema", en: "system" },
});
