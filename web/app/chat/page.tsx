"use client";

/**
 * O chat de decisoes.
 *
 * O agente usa exatamente as mesmas operacoes da tela estruturada -- nao ha
 * caminho alternativo por dentro. Por isso o rastro de ferramentas fica
 * visivel: o decisor consegue ver que a recomendacao saiu do metodo, e nao de
 * uma opiniao do modelo.
 */

import { useEffect, useRef, useState } from "react";

import { api, ApiError } from "@/lib/api";

interface Bolha {
  papel: "user" | "assistant";
  texto: string;
  ferramentas?: string[];
}

const SUGESTOES = [
  "Preciso escolher entre quatro fornecedores olhando custo, prazo e qualidade.",
  "Tenho três propostas de software para comparar. Me ajuda a decidir?",
  "Quero ordenar seis projetos por prioridade, não só escolher um.",
];

export default function ChatPage() {
  const [bolhas, setBolhas] = useState<Bolha[]>([]);
  const [entrada, setEntrada] = useState("");
  const [decisaoId, setDecisaoId] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .saude()
      .then((s) => setDisponivel(s.chat_disponivel))
      .catch(() => setDisponivel(false));
  }, []);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth" });
  }, [bolhas, ocupado]);

  const enviar = async (texto: string) => {
    const limpo = texto.trim();
    if (!limpo || ocupado) return;

    const historico: Bolha[] = [...bolhas, { papel: "user", texto: limpo }];
    setBolhas(historico);
    setEntrada("");
    setOcupado(true);
    setErro(null);

    try {
      const resposta = await api.chat(
        historico.map((b) => ({ papel: b.papel, texto: b.texto })),
        decisaoId,
      );
      setDecisaoId(resposta.decisao_id);
      setBolhas([
        ...historico,
        {
          papel: "assistant",
          texto: resposta.resposta,
          ferramentas: resposta.ferramentas,
        },
      ]);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : String(e));
      setBolhas(historico);
    } finally {
      setOcupado(false);
    }
  };

  if (disponivel === false) {
    return (
      <main className="mx-auto max-w-3xl px-5 pt-12">
        <h1 className="text-2xl font-semibold">Chat de decisões</h1>
        <div
          className="mt-4 rounded-[var(--raio-painel)] border p-5 text-sm"
          style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
        >
          <p style={{ color: "var(--tinta)" }}>
            O chat precisa de uma chave da API da Anthropic para funcionar.
          </p>
          <p className="mt-2" style={{ color: "var(--tinta-2)" }}>
            Defina <code>ANTHROPIC_API_KEY</code> no ambiente onde a API roda e
            reinicie o servidor. A{" "}
            <a href="/decisao" style={{ color: "var(--accent)" }}>
              tela de decisão estruturada
            </a>{" "}
            funciona sem ela.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-3xl flex-col px-5 pb-6 pt-8">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Chat de decisões</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--tinta-2)" }}>
          Descreva o que precisa decidir. O agente monta o modelo e conduz a
          elicitação pelo método — as respostas continuam sendo suas.
        </p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {bolhas.length === 0 && (
          <div className="space-y-2">
            {SUGESTOES.map((s) => (
              <button
                key={s}
                onClick={() => enviar(s)}
                className="block w-full rounded-[var(--raio-controle)] border px-4 py-3 text-left text-sm transition hover:shadow-sm"
                style={{
                  borderColor: "var(--borda)",
                  background: "var(--painel)",
                  color: "var(--tinta-2)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {bolhas.map((b, i) => (
          <div
            key={i}
            className={b.papel === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className="max-w-[85%] rounded-[var(--raio-painel)] px-4 py-3 text-sm whitespace-pre-wrap"
              style={
                b.papel === "user"
                  ? { background: "var(--accent)", color: "#fff" }
                  : {
                      background: "var(--painel)",
                      border: "1px solid var(--borda)",
                      color: "var(--tinta)",
                    }
              }
            >
              {b.texto}
              {b.ferramentas && b.ferramentas.length > 0 && (
                <div
                  className="mt-3 border-t pt-2 text-xs"
                  style={{ borderColor: "var(--borda)", color: "var(--tinta-fraca)" }}
                >
                  método aplicado: {b.ferramentas.join(" → ")}
                </div>
              )}
            </div>
          </div>
        ))}

        {ocupado && (
          <div className="text-sm" style={{ color: "var(--tinta-fraca)" }}>
            pensando…
          </div>
        )}
        <div ref={fim} />
      </div>

      {erro && (
        <div
          role="alert"
          className="mt-3 rounded-[var(--raio-controle)] border p-3 text-sm"
          style={{ borderColor: "var(--erro)", color: "var(--erro)" }}
        >
          {erro}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(entrada);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          placeholder="O que você precisa decidir?"
          disabled={ocupado}
          className="flex-1 rounded-[var(--raio-controle)] border px-4 py-2 text-sm outline-none disabled:opacity-50"
          style={{
            borderColor: "var(--borda)",
            background: "var(--painel)",
            color: "var(--tinta)",
          }}
        />
        <button
          type="submit"
          disabled={ocupado || !entrada.trim()}
          className="rounded-[var(--raio-controle)] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          Enviar
        </button>
      </form>

      {decisaoId && (
        <p className="mt-2 text-xs" style={{ color: "var(--tinta-fraca)" }}>
          decisão em andamento: <span className="num">{decisaoId}</span>
        </p>
      )}
    </main>
  );
}
