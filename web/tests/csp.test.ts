/**
 * A CSP que o middleware aplica: nonce por requisicao, sem 'unsafe-inline' nos
 * scripts, e estilo inline so em atributos (ZAP 10055).
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { HASHES_DE_ESTILO, gerarNonce, montarCsp } from "@/lib/csp";

function diretiva(csp: string, nome: string): string[] {
  const parte = csp.split(";").map((d) => d.trim()).find((d) => d.split(" ")[0] === nome);
  return parte ? parte.split(" ").slice(1) : [];
}

describe("CSP com nonce", () => {
  const csp = montarCsp({ nonce: "abc123", fasorx: "https://fasorx.com.br/login" });

  it("script-src so aceita o nonce, sem unsafe-inline nem eval", () => {
    const scripts = diretiva(csp, "script-src");
    expect(scripts).toContain("'nonce-abc123'");
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
  });

  it("estilo inline so vale em atributos; <style> precisa do nonce", () => {
    expect(diretiva(csp, "style-src")).not.toContain("'unsafe-inline'");
    expect(diretiva(csp, "style-src-elem")).toEqual(["'self'", "'nonce-abc123'", ...HASHES_DE_ESTILO]);
    expect(diretiva(csp, "style-src-attr")).toEqual(["'unsafe-inline'"]);
  });

  it("mantem o que a politica do proxy liberava: Cloudflare e a sessao da FasorX", () => {
    expect(diretiva(csp, "connect-src")).toEqual([
      "'self'",
      "https://challenges.cloudflare.com",
      "https://fasorx.com.br",
    ]);
    expect(diretiva(csp, "frame-src")).toEqual(["https://challenges.cloudflare.com"]);
    expect(diretiva(csp, "frame-ancestors")).toEqual(["'none'"]);
    expect(diretiva(csp, "object-src")).toEqual(["'none'"]);
  });

  it("em desenvolvimento libera o que o Next precisa para recarregar ao vivo", () => {
    const dev = montarCsp({ nonce: "x", desenvolvimento: true });
    expect(diretiva(dev, "script-src")).toContain("'unsafe-eval'");
    expect(diretiva(dev, "style-src-elem")).toContain("'unsafe-inline'");
    expect(dev).not.toContain("upgrade-insecure-requests");
  });

  it("cada nonce e novo", () => {
    const vistos = new Set(Array.from({ length: 50 }, gerarNonce));
    expect(vistos.size).toBe(50);
  });

  it("o hash liberado e o do CSS que o sonner instalado injeta", () => {
    // o sonner cria um <style> com o CSS dele ao carregar; sem o hash certo, as
    // notificacoes ficam sem estilo em producao
    const fonte = readFileSync(join(process.cwd(), "node_modules/sonner/dist/index.mjs"), "utf8");
    const marca = '__insertCSS("';
    const ini = fonte.indexOf(marca) + marca.length - 1;
    let j = ini + 1;
    while (fonte[j] !== '"') j += fonte[j] === "\\" ? 2 : 1;
    const css: string = JSON.parse(fonte.slice(ini, j + 1));
    const hash = `'sha256-${createHash("sha256").update(css).digest("base64")}'`;
    expect(HASHES_DE_ESTILO).toContain(hash);
  });
});
