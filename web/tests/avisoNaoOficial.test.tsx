/**
 * O aviso de que esta aplicacao nao e o FITradeoff original precisa estar em
 * toda tela (o rodape e global) e em destaque na pagina inicial e na de
 * paridade, onde os numeros dos dois sistemas aparecem juntos.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";
import ParidadePage from "@/app/paridade/page";
import { AvisoNaoOficial } from "@/components/AvisoNaoOficial";
import { RodapeFasorx } from "@/components/RodapeFasorx";

describe("aviso de que nao e o FITradeoff original", () => {
  it("o rodape de toda tela diz que e uma implementacao independente", () => {
    render(<RodapeFasorx />);
    expect(screen.getByText(/Implementação independente do método FITradeoff/)).toBeInTheDocument();
    expect(screen.getByText(/pode apresentar valores diferentes/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /FITradeoff original/ })).toHaveAttribute(
      "href",
      "https://fitradeoff.org/",
    );
  });

  it("a pagina inicial traz o aviso em destaque, com a comparacao", () => {
    render(<Home />);
    expect(screen.getByText("Este não é o FITradeoff original")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver a comparação com o original" })).toHaveAttribute(
      "href",
      "/paridade",
    );
  });

  it("a pagina de paridade traz o aviso, sem apontar para si mesma", () => {
    render(<ParidadePage />);
    expect(screen.getByText("Este não é o FITradeoff original")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ver a comparação com o original" })).toBeNull();
  });

  it("o destaque diz de onde veio e que houve rodadas de equivalencia", () => {
    render(<AvisoNaoOficial forma="destaque" />);
    expect(screen.getByText(/guia do usuário publicado no site do FITradeoff/)).toBeInTheDocument();
    expect(screen.getByText(/várias rodadas de equivalência/)).toBeInTheDocument();
  });
});
