/**
 * Claro, escuro, ou o que o sistema disser.
 *
 * A regra existe duas vezes, e é por isso que este arquivo existe. Uma vez em
 * `resolver`, que o React usa, e outra dentro de `SCRIPT_TEMA`, que roda como
 * texto no `<head>` antes de qualquer JavaScript nosso ser carregado — é a
 * única forma de evitar o lampejo branco de quem escolheu escuro.
 *
 * Duas cópias da mesma regra divergem na primeira vez que alguém ajusta só
 * uma, e a divergência aqui é silenciosa: a página abre num tema e troca para
 * o outro assim que o React monta. Ninguém reporta isso como defeito, só acha
 * a interface esquisita. Então os dois caminhos são comparados caso a caso.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CHAVE_TEMA,
  SCRIPT_TEMA,
  TEMAS,
  aplicar,
  eTema,
  gravarTema,
  lerTema,
  resolver,
  type Tema,
} from "@/lib/tema";

/** Finge a preferência do sistema operacional. */
function sistema(escuro: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((consulta: string) => ({
      matches: consulta.includes("dark") ? escuro : false,
      media: consulta,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.colorScheme = "";
});

afterEach(() => vi.unstubAllGlobals());

describe("resolver", () => {
  it("escolha explícita ignora o sistema", () => {
    expect(resolver("claro", true)).toBe("light");
    expect(resolver("claro", false)).toBe("light");
    expect(resolver("escuro", false)).toBe("dark");
    expect(resolver("escuro", true)).toBe("dark");
  });

  it("em sistema, segue o sistema", () => {
    expect(resolver("sistema", true)).toBe("dark");
    expect(resolver("sistema", false)).toBe("light");
  });
});

describe("o script de antes da pintura concorda com resolver", () => {
  /* O script é texto; aqui ele é executado de verdade, contra o mesmo
     armazenamento e a mesma preferência que `resolver` receberia. */
  const rodarScript = () => new Function(SCRIPT_TEMA)();

  const casos: [Tema | "lixo" | null, boolean][] = [];
  for (const tema of [...TEMAS, "lixo" as const, null]) {
    for (const escuro of [true, false]) casos.push([tema, escuro]);
  }

  it.each(casos)("guardado=%s sistemaEscuro=%s", (guardado, escuro) => {
    if (guardado === null) window.localStorage.removeItem(CHAVE_TEMA);
    else window.localStorage.setItem(CHAVE_TEMA, guardado);
    sistema(escuro);

    rodarScript();
    const doScript = document.documentElement.dataset.theme;

    const escolhido = eTema(guardado) ? guardado : "sistema";
    expect(doScript).toBe(resolver(escolhido, escuro));
    expect(document.documentElement.style.colorScheme).toBe(doScript);
  });

  it("armazenamento que estoura não impede a página de abrir", () => {
    /* Janela privada com dados bloqueados: ler localStorage lança. O script
       roda antes de tudo -- se ele estourar, a página inteira fica sem estilo
       nenhum, o que é bem pior do que abrir no tema errado. */
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("bloqueado");
      },
    });
    sistema(false);

    expect(() => rodarScript()).not.toThrow();

    if (original) Object.defineProperty(window, "localStorage", original);
  });
});

describe("armazenamento", () => {
  it("sem nada guardado, o padrão é seguir o sistema", () => {
    expect(lerTema()).toBe("sistema");
  });

  it("valor inválido cai no padrão em vez de ser aplicado", () => {
    /* O valor vem do navegador de quem usa, então pode ser qualquer coisa --
       inclusive de uma versão anterior que usasse outros nomes. */
    window.localStorage.setItem(CHAVE_TEMA, "dark");
    expect(lerTema()).toBe("sistema");
  });

  it("guarda e lê de volta cada um dos três", () => {
    for (const tema of TEMAS) {
      gravarTema(tema);
      expect(lerTema()).toBe(tema);
    }
  });

  it("gravar com armazenamento indisponível não derruba a troca", () => {
    const escrever = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("cota");
      });
    expect(() => gravarTema("escuro")).not.toThrow();
    escrever.mockRestore();
  });
});

describe("aplicar", () => {
  it("escreve os dois atributos, e não só o data-theme", () => {
    /* Sem `color-scheme` a página fica escura e a barra de rolagem, os campos
       nativos e o seletor de data do navegador continuam brancos. */
    sistema(true);
    expect(aplicar("sistema")).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");

    expect(aplicar("claro")).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });
});
