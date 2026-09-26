import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { ProvedorIdioma } from "@/lib/i18n";
import { Avisos } from "@/components/Avisos";
import { Navegacao } from "@/components/Navegacao";
import "./globals.css";

export const metadata: Metadata = {
  title: "FITradeoff",
  description:
    "Decida entre alternativas comparando situações concretas, sem atribuir pesos.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      style={
        {
          "--fonte-sans": GeistSans.style.fontFamily,
          "--fonte-mono": GeistMono.style.fontFamily,
        } as React.CSSProperties
      }
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="min-h-dvh">
        <ProvedorIdioma>
          <Navegacao />
          {children}
          {/* uma só, na raiz: duas montadas duplicam todo aviso */}
          <Avisos />
        </ProvedorIdioma>
      </body>
    </html>
  );
}
