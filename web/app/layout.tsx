import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { ProvedorIdioma } from "@/lib/i18n";
import { Avisos } from "@/components/Avisos";
import { FundoGuache } from "@/components/FundoGuache";
import { Navegacao } from "@/components/Navegacao";
import { Portao } from "@/components/Portao";
import { RodapeFasorx } from "@/components/RodapeFasorx";
import { Sessao } from "@/components/Sessao";
import { SCRIPT_TEMA } from "@/lib/tema";
import "./globals.css";

export const metadata: Metadata = {
  title: "FITradeoff",
  description:
    "Decida entre alternativas comparando situações concretas, sem atribuir pesos.",
};

/* A cor da barra do navegador no celular acompanha a navegação navy, que é o
   que fica colado nela. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#071d38" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1c2e" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      /* O script abaixo escreve `data-theme` e `color-scheme` no <html> antes
         de o React existir, entao o HTML do servidor e o do cliente divergem
         nesses dois atributos -- de proposito. Sem esta marca o React avisa a
         cada carregamento, e um aviso que sempre aparece e um aviso que
         ninguem mais le. Ela vale so para os atributos deste elemento, nao
         para a arvore abaixo. */
      suppressHydrationWarning
      style={
        {
          "--fonte-sans": GeistSans.style.fontFamily,
          "--fonte-mono": GeistMono.style.fontFamily,
        } as React.CSSProperties
      }
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <head>
        {/* Antes de qualquer pintura. O tema vive no armazenamento local, que
            só existe no navegador: se a decisão esperasse o React, quem
            escolheu escuro veria um lampejo branco a cada carregamento -- e
            num produto que se usa de madrugada isso dói de verdade.

            `dangerouslySetInnerHTML` é o único jeito de emitir script inline
            no App Router. O conteúdo é constante nossa, não entra dado de
            ninguém, então não há o que injetar. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-dvh">
        <ProvedorIdioma>
          {/* Antes da navegação e fora dela: é fundo de tudo, e fica fixo. */}
          <FundoGuache />
          {/* Nada da aplicacao -- nem a navegacao -- antes de o FasorX
              confirmar a sessao. Sem sessao, o Portao manda para o login. */}
          <Portao>
            <Navegacao />
            {/* alvo do "pular para o conteúdo" da navegação */}
            <div id="conteudo" tabIndex={-1}>
              {children}
            </div>
            <RodapeFasorx />
            {/* uma só, na raiz: duas montadas duplicam todo aviso */}
            <Avisos />
            <Sessao />
          </Portao>
        </ProvedorIdioma>
      </body>
    </html>
  );
}
