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
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/telas";

interface Bolha {
  papel: "user" | "assistant";
  texto: string;
  ferramentas?: string[];
}

/* Só as chaves: a sugestão que vai para o agente é a frase no idioma em que a
   pessoa está lendo, então ela é resolvida na renderização, não no módulo. */
const SUGESTOES = [
  "tela.chat.sugestao1",
  "tela.chat.sugestao2",
  "tela.chat.sugestao3",
];

export default function ChatPage() {
  const { t } = useIdioma();
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
        <h1 className="text-2xl font-semibold">{t("tela.chat.titulo")}</h1>
        <div
          className="mt-4 rounded-[var(--raio-painel)] border p-5 text-sm"
          style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
        >
          <p style={{ color: "var(--tinta)" }}>
            {t("tela.chat.semChave.aviso")}
          </p>
          <p className="mt-2" style={{ color: "var(--tinta-2)" }}>
            {t("tela.chat.semChave.antes")} <code>ANTHROPIC_API_KEY</code>{" "}
            {t("tela.chat.semChave.meio")}{" "}
            <a href="/decisao" style={{ color: "var(--accent)" }}>
              {t("tela.chat.semChave.link")}
            </a>{" "}
            {t("tela.chat.semChave.depois")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-3xl flex-col px-5 pb-6 pt-8">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">{t("tela.chat.titulo")}</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--tinta-2)" }}>
          {t("tela.chat.descricao")}
        </p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {bolhas.length === 0 && (
          <div className="space-y-2">
            {SUGESTOES.map((chave) => (
              <button
                key={chave}
                onClick={() => enviar(t(chave))}
                className="block w-full rounded-[var(--raio-controle)] border px-4 py-3 text-left text-sm transition hover:shadow-sm"
                style={{
                  borderColor: "var(--borda)",
                  background: "var(--painel)",
                  color: "var(--tinta-2)",
                }}
              >
                {t(chave)}
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
                  {t("tela.chat.metodoAplicado")} {b.ferramentas.join(" → ")}
                </div>
              )}
            </div>
          </div>
        ))}

        {ocupado && (
          <div className="text-sm" style={{ color: "var(--tinta-fraca)" }}>
            {t("tela.chat.pensando")}
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
          placeholder={t("tela.chat.entrada")}
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
          {t("tela.chat.enviar")}
        </button>
      </form>

      {decisaoId && (
        <p className="mt-2 text-xs" style={{ color: "var(--tinta-fraca)" }}>
          {t("tela.chat.emAndamento")}{" "}
          <span className="num">{decisaoId}</span>
        </p>
      )}
    </main>
  );
}
