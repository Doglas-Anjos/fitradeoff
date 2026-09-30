/**
 * O rascunho guardado nos dois lados.
 *
 * O que este arquivo protege é a regra de desempate. Na abertura, navegador e
 * servidor podem discordar: o servidor pode estar atrás pela janela do
 * debounce, ou à frente porque o trabalho veio de outra máquina. Escolher um
 * lado fixo jogaria fora trabalho de verdade em metade dos casos, e jogaria
 * fora em silêncio -- que é a pior forma de perder dado.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";
import {
  ESPERA_SINCRONIA,
  useRascunhoSincronizado,
} from "@/lib/rascunhoSincronizado";

const CHAVE = "fitradeoff:teste";

function Tela() {
  const [valor, guardar, limpar] = useRascunhoSincronizado<{ nome: string }>(
    "teste",
    { nome: "vazio" },
  );
  return (
    <div>
      <output>{valor.nome}</output>
      <button onClick={() => guardar({ nome: "digitado" })}>digitar</button>
      <button onClick={() => limpar()}>limpar</button>
    </div>
  );
}

const noLocal = (nome: string, quando: string) =>
  window.localStorage.setItem(
    CHAVE,
    JSON.stringify({ valor: { nome }, gravado_em: quando }),
  );

const mostrado = () => screen.getByRole("status").textContent;

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
  vi.spyOn(api, "gravarRascunho").mockResolvedValue({
    guardado: true,
    gravado_em: "2026-01-01T00:00:00+00:00",
  });
  vi.spyOn(api, "descartarRascunho").mockResolvedValue({ descartado: true });
});

afterEach(() => {
  window.localStorage.clear();
});

describe("qual versão abre", () => {
  it("sem nada guardado, abre no padrão", async () => {
    vi.spyOn(api, "lerRascunho").mockResolvedValue({
      rascunho: null,
      gravado_em: null,
    });
    render(<Tela />);
    await waitFor(() => expect(mostrado()).toBe("vazio"));
  });

  it("só o servidor tem: abre com o do servidor", async () => {
    vi.spyOn(api, "lerRascunho").mockResolvedValue({
      rascunho: { nome: "do servidor" },
      gravado_em: "2026-01-02T00:00:00+00:00",
    });
    render(<Tela />);
    await waitFor(() => expect(mostrado()).toBe("do servidor"));
  });

  it("só o navegador tem: abre com ele e o manda para o servidor", async () => {
    /* Veio de antes desta versão, ou foi digitado com o servidor fora do ar.
       Abrir com ele e não subir deixaria o trabalho preso num navegador. */
    vi.spyOn(api, "lerRascunho").mockResolvedValue({
      rascunho: null,
      gravado_em: null,
    });
    noLocal("do navegador", "2026-01-02T00:00:00+00:00");
    render(<Tela />);

    await waitFor(() => expect(mostrado()).toBe("do navegador"));
    await waitFor(() =>
      expect(api.gravarRascunho).toHaveBeenCalledWith({ nome: "do navegador" }),
    );
  });

  it("os dois têm: vence o carimbo mais novo, e ele pode ser o do navegador", async () => {
    /* O caso da janela do debounce: digitou e recarregou antes de a rajada
       sair. O servidor está atrás, e adotá-lo apagaria as últimas teclas. */
    vi.spyOn(api, "lerRascunho").mockResolvedValue({
      rascunho: { nome: "servidor velho" },
      gravado_em: "2026-01-01T00:00:00+00:00",
    });
    noLocal("navegador novo", "2026-01-05T00:00:00+00:00");
    render(<Tela />);

    await waitFor(() => expect(mostrado()).toBe("navegador novo"));
    // e sobe: sem isso o servidor ficava atrás até a próxima tecla
    await waitFor(() =>
      expect(api.gravarRascunho).toHaveBeenCalledWith({ nome: "navegador novo" }),
    );
  });

  it("os dois têm: o do servidor vence quando é o mais novo", async () => {
    /* O caso de trocar de máquina: o trabalho recente está do outro lado. */
    vi.spyOn(api, "lerRascunho").mockResolvedValue({
      rascunho: { nome: "servidor novo" },
      gravado_em: "2026-01-05T00:00:00+00:00",
    });
    noLocal("navegador velho", "2026-01-01T00:00:00+00:00");
    render(<Tela />);

    await waitFor(() => expect(mostrado()).toBe("servidor novo"));
  });

  it("guardado sem carimbo conta como o mais velho possível", async () => {
    /* Formato de antes desta versão: não dá para saber quando foi, e supor que
       é recente faria um rascunho antigo sobrepor o do servidor. */
    window.localStorage.setItem(CHAVE, JSON.stringify({ nome: "sem carimbo" }));
    vi.spyOn(api, "lerRascunho").mockResolvedValue({
      rascunho: { nome: "do servidor" },
      gravado_em: "2020-01-01T00:00:00+00:00",
    });
    render(<Tela />);

    await waitFor(() => expect(mostrado()).toBe("do servidor"));
  });

  it("servidor fora do ar não trava o formulário", async () => {
    vi.spyOn(api, "lerRascunho").mockRejectedValue(new Error("sem rede"));
    noLocal("do navegador", "2026-01-02T00:00:00+00:00");
    render(<Tela />);

    await waitFor(() => expect(mostrado()).toBe("do navegador"));
  });
});

describe("o que a digitação dispara", () => {
  beforeEach(() => {
    vi.spyOn(api, "lerRascunho").mockResolvedValue({
      rascunho: null,
      gravado_em: null,
    });
  });

  it("grava no navegador na hora e no servidor depois da pausa", async () => {
    const usuario = userEvent.setup();
    render(<Tela />);
    await waitFor(() => expect(api.lerRascunho).toHaveBeenCalled());

    await usuario.click(screen.getByRole("button", { name: "digitar" }));

    // no navegador, imediatamente
    expect(JSON.parse(window.localStorage.getItem(CHAVE)!).valor).toEqual({
      nome: "digitado",
    });
    // no servidor, só depois de parar de digitar
    expect(api.gravarRascunho).not.toHaveBeenCalled();
    await waitFor(
      () => expect(api.gravarRascunho).toHaveBeenCalledWith({ nome: "digitado" }),
      { timeout: ESPERA_SINCRONIA * 3 },
    );
  });

  it("digitar várias vezes seguidas manda uma requisição só", async () => {
    const usuario = userEvent.setup();
    render(<Tela />);
    await waitFor(() => expect(api.lerRascunho).toHaveBeenCalled());

    const botao = screen.getByRole("button", { name: "digitar" });
    for (let i = 0; i < 5; i++) await usuario.click(botao);

    await waitFor(() => expect(api.gravarRascunho).toHaveBeenCalled(), {
      timeout: ESPERA_SINCRONIA * 3,
    });
    expect(api.gravarRascunho).toHaveBeenCalledTimes(1);
  });

  it("limpar esquece dos dois lados", async () => {
    const usuario = userEvent.setup();
    render(<Tela />);
    await waitFor(() => expect(api.lerRascunho).toHaveBeenCalled());

    await usuario.click(screen.getByRole("button", { name: "digitar" }));
    await usuario.click(screen.getByRole("button", { name: "limpar" }));

    expect(window.localStorage.getItem(CHAVE)).toBeNull();
    expect(api.descartarRascunho).toHaveBeenCalled();
    expect(mostrado()).toBe("vazio");
  });

  it("limpar cancela a rajada que estava a caminho", async () => {
    /* Sem isso, o debounce disparado antes do limpar regravaria no servidor o
       rascunho que a decisão recém-criada acabou de tornar obsoleto. */
    const usuario = userEvent.setup();
    render(<Tela />);
    await waitFor(() => expect(api.lerRascunho).toHaveBeenCalled());

    await usuario.click(screen.getByRole("button", { name: "digitar" }));
    await usuario.click(screen.getByRole("button", { name: "limpar" }));

    await new Promise((r) => setTimeout(r, ESPERA_SINCRONIA * 2));
    expect(api.gravarRascunho).not.toHaveBeenCalled();
  });

  it("sair da tela antes da pausa manda o que faltava", async () => {
    /* Navegar para outra tela desmonta sem esconder a aba: o relógio do
       debounce era só cancelado, e as últimas teclas sumiam do servidor. */
    const usuario = userEvent.setup();
    const { unmount } = render(<Tela />);
    await waitFor(() => expect(api.lerRascunho).toHaveBeenCalled());

    await usuario.click(screen.getByRole("button", { name: "digitar" }));
    unmount();

    expect(api.gravarRascunho).toHaveBeenCalledWith({ nome: "digitado" });
  });

  it("esconder a aba manda com keepalive, e não por beacon sem cabeçalho", async () => {
    /* Com o FasorX ligado a API recusa quem chega sem Authorization, e
       `sendBeacon` não leva cabeçalho nenhum. */
    const saida = vi.spyOn(api, "gravarRascunhoNaSaida").mockImplementation(() => {});
    const usuario = userEvent.setup();
    render(<Tela />);
    await waitFor(() => expect(api.lerRascunho).toHaveBeenCalled());

    await usuario.click(screen.getByRole("button", { name: "digitar" }));
    const visibilidade = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    visibilidade.mockRestore();

    expect(saida).toHaveBeenCalledWith({ nome: "digitado" });
  });
});

describe("digitar antes de a leitura voltar", () => {
  it("a leitura que chega depois não apaga o que foi digitado", async () => {
    let entregar!: (r: { rascunho: unknown; gravado_em: string | null }) => void;
    vi.spyOn(api, "lerRascunho").mockReturnValue(
      new Promise((r) => {
        entregar = r;
      }),
    );
    const usuario = userEvent.setup();
    render(<Tela />);

    await usuario.click(screen.getByRole("button", { name: "digitar" }));
    entregar({ rascunho: { nome: "do servidor" }, gravado_em: "2026-01-02T00:00:00+00:00" });

    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem(CHAVE)!).valor).toEqual({
        nome: "digitado",
      }),
    );
    expect(mostrado()).toBe("digitado");
  });
});

describe("a gravação que parte do valor de agora", () => {
  /* A forma funcional existe para o "desfazer" de um aviso, que chega segundos
     depois de outras gravações: ela tem de partir do que está gravado, e não
     do que a renderização daquele momento tinha visto. */
  function Somador() {
    const [valor, guardar] = useRascunhoSincronizado<{ nome: string }>("teste", {
      nome: "vazio",
    });
    const exclamar = () => guardar((v) => ({ nome: `${v.nome}!` }));
    return (
      <div>
        <output>{valor.nome}</output>
        <button
          onClick={() => {
            exclamar();
            exclamar();
          }}
        >
          duas vezes
        </button>
      </div>
    );
  }

  it("duas gravações no mesmo evento se somam, em vez de uma apagar a outra", async () => {
    vi.spyOn(api, "lerRascunho").mockResolvedValue({ rascunho: null, gravado_em: null });
    const usuario = userEvent.setup();
    render(<Somador />);
    await waitFor(() => expect(api.lerRascunho).toHaveBeenCalled());

    await usuario.click(screen.getByRole("button", { name: "duas vezes" }));

    expect(mostrado()).toBe("vazio!!");
  });

  it("parte do valor que a abertura adotou, não do padrão", async () => {
    vi.spyOn(api, "lerRascunho").mockResolvedValue({
      rascunho: { nome: "do servidor" },
      gravado_em: "2026-01-02T00:00:00+00:00",
    });
    const usuario = userEvent.setup();
    render(<Somador />);
    await waitFor(() => expect(mostrado()).toBe("do servidor"));

    await usuario.click(screen.getByRole("button", { name: "duas vezes" }));

    expect(mostrado()).toBe("do servidor!!");
  });
});
