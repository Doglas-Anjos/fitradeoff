"use client";

/**
 * Idioma da interface.
 *
 * Algumas escolhas de projeto, e todas têm motivo:
 *
 * **Catálogos separados por área, não um arquivo só.** Um `textos.ts` gigante
 * vira ponto de conflito assim que duas pessoas mexem na tela ao mesmo tempo, e
 * ninguém consegue dizer se uma chave ainda é usada. Cada área tem o seu, e o
 * provedor junta.
 *
 * **Sem rota por idioma.** O `/pt/decisao` do Next resolve SEO, que aqui não
 * existe: a ferramenta é de uso, não de busca. Trocar de idioma no meio de uma
 * decisão não pode custar uma navegação.
 *
 * O termo técnico manda sobre a tradução literal. Em inglês, `sorting` não é
 * "classification" e `scaling constants` não é "weights": são os termos da
 * literatura do método, e quem é da área lê o errado como amadorismo.
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export const IDIOMAS = [
  { chave: "pt", rotulo: "Português", bandeira: "PT" },
  { chave: "en", rotulo: "English", bandeira: "EN" },
  { chave: "es", rotulo: "Español", bandeira: "ES" },
] as const;

export type Idioma = (typeof IDIOMAS)[number]["chave"];

export const IDIOMA_PADRAO: Idioma = "pt";

/** Um catálogo é chave -> texto, para cada idioma. */
export type Catalogo = Record<string, Record<Idioma, string>>;

const catalogos: Catalogo[] = [];

/**
 * Registra um catálogo de área. Chamado no topo do módulo de cada catálogo,
 * então basta importá-lo uma vez para as chaves existirem.
 */
export function registrar(catalogo: Catalogo): Catalogo {
  /* Duas áreas com a mesma chave é o defeito mais traiçoeiro deste desenho: a
     busca para no primeiro catálogo que responde, então a segunda tradução
     simplesmente não aparece, sem erro nenhum. Em desenvolvimento isso estoura
     na cara de quem causou; em produção não custa nada, porque o `if` some. */
  if (process.env.NODE_ENV !== "production") {
    for (const chave of Object.keys(catalogo)) {
      const jaExiste = catalogos.some((c) => chave in c);
      if (jaExiste) {
        throw new Error(
          `Chave de tradução repetida em dois catálogos: "${chave}". ` +
            `A busca para na primeira e a outra nunca apareceria.`,
        );
      }
    }
  }
  catalogos.push(catalogo);
  return catalogo;
}

const CHAVE_LOCAL = "fitradeoff:idioma";

interface Contexto {
  idioma: Idioma;
  definir: (i: Idioma) => void;
  /** Texto pela chave. Sem tradução no idioma atual, cai no português. */
  t: (chave: string, valores?: Record<string, string | number>) => string;
}

const Ctx = createContext<Contexto | null>(null);

function buscar(chave: string, idioma: Idioma): string {
  for (const catalogo of catalogos) {
    const entrada = catalogo[chave];
    if (entrada) return entrada[idioma] ?? entrada[IDIOMA_PADRAO] ?? chave;
  }
  /* A chave crua aparecendo na tela é feio, mas é honesto: esconder a falta
     atrás de um texto vazio faria a tradução incompleta passar despercebida. */
  return chave;
}

export function ProvedorIdioma({ children }: { children: React.ReactNode }) {
  const [idioma, setIdioma] = useState<Idioma>(IDIOMA_PADRAO);

  /* Só depois da montagem: ler o armazenamento durante a renderização faria o
     HTML do servidor divergir do cliente. */
  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(CHAVE_LOCAL);
      if (salvo && IDIOMAS.some((i) => i.chave === salvo)) {
        setIdioma(salvo as Idioma);
      }
    } catch {
      /* sem armazenamento a tela funciona igual, só não lembra */
    }
  }, []);

  /* O atributo lang tem efeito real: guia a pronúncia do leitor de tela e a
     hifenização do navegador. */
  useEffect(() => {
    document.documentElement.lang =
      idioma === "pt" ? "pt-BR" : idioma === "es" ? "es" : "en";
  }, [idioma]);

  const definir = useCallback((novo: Idioma) => {
    setIdioma(novo);
    try {
      window.localStorage.setItem(CHAVE_LOCAL, novo);
    } catch {
      /* idem */
    }
  }, []);

  const t = useCallback(
    (chave: string, valores?: Record<string, string | number>) => {
      let texto = buscar(chave, idioma);
      if (valores) {
        for (const [nome, valor] of Object.entries(valores)) {
          texto = texto.replaceAll(`{${nome}}`, String(valor));
        }
      }
      return texto;
    },
    [idioma],
  );

  return <Ctx.Provider value={{ idioma, definir, t }}>{children}</Ctx.Provider>;
}

/**
 * Fora do provedor devolve o português, em vez de explodir: assim um componente
 * isolado num teste continua renderizando sem precisar do provedor inteiro.
 */
export function useIdioma(): Contexto {
  const ctx = useContext(Ctx);
  if (ctx) return ctx;
  return {
    idioma: IDIOMA_PADRAO,
    definir: () => {},
    t: (chave, valores) => {
      let texto = buscar(chave, IDIOMA_PADRAO);
      if (valores) {
        for (const [nome, valor] of Object.entries(valores)) {
          texto = texto.replaceAll(`{${nome}}`, String(valor));
        }
      }
      return texto;
    },
  };
}
