"use client";

/** Vigia a sessao do FasorX enquanto a aplicacao esta aberta.
 *
 * Nao desenha nada. Existe porque a vigilancia precisa de um lugar que viva
 * tanto quanto a aba: montado numa pagina, o ping morreria na primeira
 * navegacao interna.
 *
 * Quando a sessao cai -- venceu, ou a pessoa saiu do FasorX -- a aplicacao vai
 * para a tela de entrada de la. Sem aviso e sem caixa de confirmacao: nao ha o
 * que decidir, e uma caixa perguntando "sua sessao expirou, ok?" so atrasa o
 * unico caminho que existe.
 */

import { useEffect } from "react";

import { irParaLogin, vigiar } from "@/lib/identidade";

export function Sessao() {
  useEffect(() => vigiar(irParaLogin), []);
  return null;
}
