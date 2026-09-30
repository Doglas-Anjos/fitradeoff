/**
 * A CSP de cada página, com um nonce novo por requisição (ver `lib/csp.ts`).
 *
 * O nonce vai em dois lugares: no cabeçalho da resposta, que é o que o
 * navegador aplica, e no cabeçalho da requisição, que é de onde o Next o lê
 * para marcar os scripts dele e de onde o layout o lê para o script do tema.
 */

import { NextResponse, type NextRequest } from "next/server";

import { gerarNonce, montarCsp } from "@/lib/csp";

export function middleware(request: NextRequest) {
  const nonce = gerarNonce();
  const csp = montarCsp({
    nonce,
    fasorx: process.env.NEXT_PUBLIC_FASORX_URL || "https://fasorx.com.br",
    desenvolvimento: process.env.NODE_ENV === "development",
  });

  const cabecalhos = new Headers(request.headers);
  cabecalhos.set("x-nonce", nonce);
  cabecalhos.set("Content-Security-Policy", csp);

  const resposta = NextResponse.next({ request: { headers: cabecalhos } });
  resposta.headers.set("Content-Security-Policy", csp);
  return resposta;
}

export const config = {
  // Só páginas: arquivos estáticos, a API encaminhada ao FastAPI e as
  // pré-buscas do roteador não carregam HTML e não precisam de nonce.
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
