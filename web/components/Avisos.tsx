"use client";

/**
 * Os avisos que aparecem e sozinhos vão embora.
 *
 * Erro de campo continua embaixo do campo — ele precisa ficar ali enquanto o
 * campo estiver errado, e sumir depois de três segundos seria esconder o que
 * ainda bloqueia. O que vira aviso flutuante é outra coisa: a resposta a uma
 * ação que a pessoa acabou de fazer. Clicou em "Adicionar" com o nome vazio,
 * tentou repetir um critério que já existe. Ela está olhando, o recado é curto,
 * e deixá-lo fixo na tela só acumula sujeira.
 *
 * A biblioteca é a Sonner, mas nenhuma tela a importa direto: todas passam por
 * `avisar`, logo abaixo. Assim o estilo é decidido num lugar só, e trocar de
 * biblioteca depois não significa mexer em dez arquivos.
 */

import { Toaster, toast } from "sonner";

export function Avisos() {
  return (
    <Toaster
      /* a Sonner assume claro e não acompanha o sistema sozinha */
      theme="system"
      position="bottom-center"
      /* Estilo por `style`, não por classe: as classes dela vencem a cascata e
         obrigariam a marcar tudo como !important. */
      toastOptions={{
        style: {
          background: "var(--painel)",
          border: "1px solid var(--borda-forte)",
          color: "var(--tinta)",
          borderRadius: "var(--raio-painel)",
          fontFamily: "var(--fonte-sans)",
          fontSize: "13px",
        },
      }}
    />
  );
}

/** A resposta a uma ação, curta e passageira. */
export const avisar = {
  /* Sem ícone colorido: a cor sozinha não chega a quem não a distingue, e o
     texto já diz o que houve. A borda vermelha faz o trabalho de destaque. */
  erro: (mensagem: string) =>
    toast.error(mensagem, {
      style: {
        background: "var(--painel)",
        border: "1px solid var(--erro)",
        color: "var(--tinta)",
        borderRadius: "var(--raio-painel)",
        fontFamily: "var(--fonte-sans)",
        fontSize: "13px",
      },
    }),

  feito: (mensagem: string) => toast.success(mensagem),

  /** Para o que dá para voltar atrás: some, mas deixa a saída à mão. */
  desfazivel: (mensagem: string, desfazer: () => void) =>
    toast(mensagem, {
      action: { label: "desfazer", onClick: desfazer },
      duration: 6000,
    }),
};
