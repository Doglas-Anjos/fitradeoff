"use client";

/**
 * Claro, escuro, ou o que o sistema disser.
 *
 * Três estados, e não dois, porque "seguir o sistema" é o único que continua
 * certo quando o ambiente muda: quem trabalha de dia e de noite tem o sistema
 * alternando sozinho, e um botão de dois estados obriga a pessoa a vir aqui
 * duas vezes por dia. É também o padrão de quem nunca tocou no controle.
 *
 * A resolução acontece em JavaScript, e não por `@media (prefers-color-scheme)`
 * no CSS. A media query exigiria repetir a paleta escura inteira num segundo
 * seletor, para conviver com a escolha explícita — e duas cópias de trinta
 * tokens divergem na primeira vez que alguém ajusta só uma. Aqui o script
 * decide e escreve `data-theme`, e o CSS tem um bloco só.
 *
 * O armazenamento pode falhar — janela privada, dados bloqueados, cota cheia.
 * Toda leitura e toda escrita são protegidas, e a ausência cai em "sistema",
 * que é o padrão. Perder a preferência não perde trabalho nenhum.
 */

export const TEMAS = ["sistema", "claro", "escuro"] as const;
export type Tema = (typeof TEMAS)[number];

export const TEMA_PADRAO: Tema = "sistema";
export const CHAVE_TEMA = "fitradeoff:tema";

/** O que o `data-theme` recebe. São os nomes do CSS, não os nossos. */
export type TemaResolvido = "light" | "dark";

export function eTema(valor: unknown): valor is Tema {
  return typeof valor === "string" && (TEMAS as readonly string[]).includes(valor);
}

/**
 * Qual tema vale, dada a escolha e o que o sistema prefere.
 *
 * Função pura de propósito: é a única regra que existe aqui, e assim ela é
 * verificável sem navegador, sem `matchMedia` e sem armazenamento.
 */
export function resolver(tema: Tema, sistemaEscuro: boolean): TemaResolvido {
  if (tema === "claro") return "light";
  if (tema === "escuro") return "dark";
  return sistemaEscuro ? "dark" : "light";
}

export function lerTema(): Tema {
  try {
    const bruto = window.localStorage.getItem(CHAVE_TEMA);
    return eTema(bruto) ? bruto : TEMA_PADRAO;
  } catch {
    return TEMA_PADRAO;
  }
}

export function gravarTema(tema: Tema): void {
  try {
    window.localStorage.setItem(CHAVE_TEMA, tema);
  } catch {
    /* sem armazenamento a troca vale para esta sessão, só não é lembrada */
  }
}

export function sistemaPrefereEscuro(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

/**
 * Escreve o tema resolvido no documento.
 *
 * `color-scheme` vai junto e não é detalhe: é o que faz a barra de rolagem, os
 * campos nativos e o seletor de data do navegador acompanharem. Sem ele, a
 * página fica escura e os controles do sistema continuam brancos.
 */
export function aplicar(tema: Tema): TemaResolvido {
  const resolvido = resolver(tema, sistemaPrefereEscuro());
  const raiz = document.documentElement;
  raiz.dataset.theme = resolvido;
  raiz.style.colorScheme = resolvido;
  return resolvido;
}

/**
 * O mesmo, como texto, para rodar antes da primeira pintura.
 *
 * Precisa ser um script embutido no HTML: qualquer coisa que dependa do React
 * só roda depois que a página já apareceu, e aí quem escolheu escuro vê um
 * lampejo branco a cada carregamento. Como é a mesma regra de `resolver`, o
 * teste compara os dois para que não se separem.
 */
export const SCRIPT_TEMA = `(function(){try{
var t=localStorage.getItem(${JSON.stringify(CHAVE_TEMA)});
if(t!=="claro"&&t!=="escuro"&&t!=="sistema"){t=${JSON.stringify(TEMA_PADRAO)};}
var d=t==="escuro"||(t==="sistema"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
var r=document.documentElement;r.dataset.theme=d?"dark":"light";r.style.colorScheme=d?"dark":"light";
}catch(e){}})();`;

/* --- uma escolha só para a página inteira ---------------------------------
   A barra e o menu do celular mostram o mesmo controle. Com um estado em cada,
   os dois discordavam: o da barra ficava em "sistema" e, na próxima troca do
   sistema operacional, desfazia o "escuro" escolhido no menu. E cada um, ao
   montar, aplicava "sistema" antes de ler o que estava guardado -- um lampejo
   do tema errado a cada carregamento. Agora há uma fonte, e montar não aplica
   nada: o script de `layout.tsx` já pintou antes de o React existir. */

/** A escolha desta sessão, para quando o armazenamento não guarda nada. */
let escolhidoAgora: Tema | null = null;
const ouvintes = new Set<() => void>();
let largarSistema: (() => void) | null = null;

export function temaEscolhido(): Tema {
  return escolhidoAgora ?? lerTema();
}

export function escolherTema(novo: Tema): void {
  escolhidoAgora = novo;
  gravarTema(novo);
  aplicar(novo);
  ouvintes.forEach((f) => f());
}

/** Para `useSyncExternalStore`. Enquanto houver alguém ouvindo, em "sistema"
 *  a troca do sistema operacional com a página aberta repinta na hora. */
export function assinarTema(aoMudar: () => void): () => void {
  ouvintes.add(aoMudar);
  if (!largarSistema) {
    try {
      const consulta = window.matchMedia("(prefers-color-scheme: dark)");
      const aoMudarSistema = () => {
        if (temaEscolhido() === "sistema") aplicar("sistema");
      };
      consulta.addEventListener("change", aoMudarSistema);
      largarSistema = () => consulta.removeEventListener("change", aoMudarSistema);
    } catch {
      /* sem matchMedia, "sistema" fica no que o script resolveu ao abrir */
    }
  }
  return () => {
    ouvintes.delete(aoMudar);
    if (ouvintes.size === 0 && largarSistema) {
      largarSistema();
      largarSistema = null;
    }
  };
}
