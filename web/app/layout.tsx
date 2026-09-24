import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

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
        <Navegacao />
        {children}
      </body>
    </html>
  );
}
