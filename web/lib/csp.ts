/**
 * A Content Security Policy da aplicação, com nonce por requisição.
 *
 * Antes a política vinha do proxy da FasorX com `'unsafe-inline'` em
 * `script-src` e `style-src` — que é justamente o que a CSP existe para impedir
 * (ZAP 10055, risco médio). Um nonce só pode ser gerado por quem monta a
 * página, então a política passou a ser do próprio app (`middleware.ts`); o
 * proxy deixa de enviar a dele.
 *
 * - Scripts: da própria origem, ou inline com o nonce da requisição. O Next põe
 *   o nonce nos scripts dele sozinho; o único script inline nosso, o do tema,
 *   recebe o nonce no layout. Sem `'strict-dynamic'`: com ele o navegador
 *   ignora `'self'`, e o Next emite o `<link rel="preload">` dos pedaços de
 *   `next/dynamic` sem nonce -- a tela de decisão tinha dois bloqueados
 *   (medido num build de produção, 30/09/2026).
 * - Estilos: `<style>` e `<link>` só com nonce, da própria origem, ou com um dos
 *   hashes de `HASHES_DE_ESTILO`; o `'unsafe-inline'` fica restrito aos
 *   atributos `style="..."`, que o React usa e que não aceitam nonce. Injetar
 *   estilo não executa código.
 * - Os endereços do Cloudflare (verificação contra robôs, que ele injeta na
 *   frente) e o da FasorX (sessão) continuam liberados, como na política
 *   anterior.
 */

export interface OpcoesCsp {
  nonce: string;
  /** Origem da FasorX, com quem o app conversa para a sessão. */
  fasorx?: string;
  /** Em desenvolvimento o Next precisa de eval (recarga ao vivo) e injeta
   *  estilo sem nonce. */
  desenvolvimento?: boolean;
}

const CLOUDFLARE = "https://challenges.cloudflare.com";

/** Os `<style>` que o `sonner` (as notificações) cria ao carregar, e que não
 *  aceitam nonce: primeiro um vazio, depois o CSS dele dentro. Liberados pelo
 *  hash exato, e só eles. `tests/csp.test.ts` recalcula o hash a partir do
 *  pacote instalado: atualizar o `sonner` sem atualizar isto quebra o teste, em
 *  vez de deixar as notificações sem estilo em produção. */
export const HASHES_DE_ESTILO = [
  "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='", // <style> vazio
  "'sha256-StEaX+se6YS7pqjzrzMIA0KaX9zF/8zAhvQXZAe5epY='", // CSS do sonner 2.0.x
];

function origem(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function montarCsp({ nonce, fasorx, desenvolvimento = false }: OpcoesCsp): string {
  const n = `'nonce-${nonce}'`;
  const fasorxOrigem = origem(fasorx);
  const diretivas: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", n, CLOUDFLARE, ...(desenvolvimento ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", ...(desenvolvimento ? ["'unsafe-inline'"] : [n, ...HASHES_DE_ESTILO])],
    "style-src-elem": ["'self'", ...(desenvolvimento ? ["'unsafe-inline'"] : [n, ...HASHES_DE_ESTILO])],
    "style-src-attr": ["'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", CLOUDFLARE, ...(fasorxOrigem ? [fasorxOrigem] : [])],
    "frame-src": [CLOUDFLARE],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const texto = Object.entries(diretivas)
    .map(([nome, valores]) => `${nome} ${valores.join(" ")}`)
    .join("; ");
  return desenvolvimento ? texto : `${texto}; upgrade-insecure-requests`;
}

/** Um nonce novo: 128 bits aleatórios, em base64. */
export function gerarNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
}
