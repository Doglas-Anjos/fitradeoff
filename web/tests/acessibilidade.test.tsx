/**
 * O que a revisão de acessibilidade e de idioma acertou, para não voltar.
 *
 * - números na tela seguem o separador do idioma;
 * - grupos de rádio respondem às setas e são uma parada só do Tab;
 * - o seletor de tema tem uma fonte só: a barra e o menu não discordam.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { SeletorTema } from "@/components/SeletorTema";
import { tecladoDeRadio } from "@/components/ui";
import { ProvedorIdioma, useIdioma } from "@/lib/i18n";

afterEach(() => {
  window.localStorage.clear();
});

describe("números no idioma de quem lê", () => {
  function Numero({ valor }: { valor: number }) {
    const { n, definir } = useIdioma();
    return (
      <>
        <output>{n(valor, 3)}</output>
        <button onClick={() => definir("en")}>en</button>
      </>
    );
  }

  it("vírgula em português, ponto em inglês, sem separador de milhar", () => {
    render(
      <ProvedorIdioma>
        <Numero valor={1234.5} />
      </ProvedorIdioma>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("1234,500");
    fireEvent.click(screen.getByText("en"));
    expect(screen.getByRole("status")).toHaveTextContent("1234.500");
  });

  it("fora do provedor, cai no português", () => {
    render(<Numero valor={0.05} />);
    expect(screen.getByRole("status")).toHaveTextContent("0,050");
  });
});

describe("grupo de rádio pelo teclado", () => {
  const OPCOES = ["a", "b", "c"] as const;

  function Grupo() {
    const [valor, setValor] = useState<(typeof OPCOES)[number]>("a");
    const teclado = tecladoDeRadio(OPCOES, valor, setValor);
    return (
      <div role="radiogroup" aria-label="grupo" {...teclado.grupo}>
        {OPCOES.map((v) => (
          <button
            key={v}
            role="radio"
            aria-checked={v === valor}
            {...teclado.item(v)}
            onClick={() => setValor(v)}
          >
            {v}
          </button>
        ))}
      </div>
    );
  }

  it("só a marcada entra na ordem do Tab", () => {
    render(<Grupo />);
    const [a, b, c] = screen.getAllByRole("radio");
    expect(a).toHaveAttribute("tabindex", "0");
    expect(b).toHaveAttribute("tabindex", "-1");
    expect(c).toHaveAttribute("tabindex", "-1");
  });

  it("as setas escolhem e levam o foco, dando a volta nas pontas", () => {
    render(<Grupo />);
    const [a, , c] = screen.getAllByRole("radio");
    a.focus();
    fireEvent.keyDown(a, { key: "ArrowLeft" });
    expect(c).toHaveAttribute("aria-checked", "true");
    expect(c).toHaveFocus();
    fireEvent.keyDown(c, { key: "ArrowRight" });
    expect(a).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(a, { key: "End" });
    expect(c).toHaveFocus();
  });
});

describe("seletor de tema", () => {
  it("as duas formas mostram a mesma escolha", () => {
    render(
      <>
        <SeletorTema />
        <SeletorTema variante="menu" />
      </>,
    );
    const escuros = screen.getAllByRole("radio", { name: /Escuro/ });
    act(() => fireEvent.click(escuros[1]));
    for (const r of screen.getAllByRole("radio", { name: /Escuro/ })) {
      expect(r).toHaveAttribute("aria-checked", "true");
    }
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("fitradeoff:tema")).toBe("escuro");
  });
});
