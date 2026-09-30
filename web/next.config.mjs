/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sem "X-Powered-By: Next.js": anunciar o framework e a porta de entrada
  // ajuda quem procura uma falha conhecida dele (ZAP 10037, CWE-497), e nao
  // serve a ninguem mais.
  poweredByHeader: false,
  async rewrites() {
    // o front chama /api/... e o Next encaminha para o FastAPI, o que evita
    // CORS no desenvolvimento e mantem uma origem so no navegador
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_URL ?? "http://127.0.0.1:8000"}/api/:path*`,
      },
    ];
  },
};
export default nextConfig;
