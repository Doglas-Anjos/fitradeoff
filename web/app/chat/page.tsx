"use client";

/**
 * O chat usa as mesmas operações da tela estruturada. O rastro de ferramentas
 * permanece visível para separar a condução da IA das respostas do decisor.
 */

import {
  ArrowRight,
  ChatCircleDots,
  CheckCircle,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Botao, Entrada } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/telas";

interface Bolha {
  papel: "user" | "assistant";
  texto: string;
  ferramentas?: string[];
}

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
      <main className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
        <header className="max-w-3xl">
          <p
            className="text-[12px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--accent)" }}
          >
            {t("tela.chat.editorial")}
          </p>
          <h1 className="display mt-3 text-3xl font-semibold sm:text-4xl">
            {t("tela.chat.titulo")}
          </h1>
          <p className="prosa mt-3 text-base" style={{ color: "var(--tinta-2)" }}>
            {t("tela.chat.descricao")}
          </p>
        </header>

        <section
          className="mt-9 grid overflow-hidden rounded-[var(--raio-painel)] border md:grid-cols-[1.15fr_0.85fr]"
          style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
        >
          <div className="p-6 sm:p-8">
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--raio-controle)]"
              style={{ background: "var(--accent-suave)", color: "var(--accent)" }}
            >
              <ChatCircleDots size={22} weight="duotone" aria-hidden />
            </span>
            <h2 className="mt-5 text-xl font-semibold tracking-tight">
              {t("tela.chat.semChave.titulo")}
            </h2>
            <p className="prosa mt-2 text-sm" style={{ color: "var(--tinta-2)" }}>
              {t("tela.chat.semChave.aviso")}
            </p>
            <p className="prosa mt-3 text-[13px]" style={{ color: "var(--tinta-3)" }}>
              {t("tela.chat.semChave.configuracao.antes")}{" "}
              <code
                className="rounded px-1.5 py-0.5"
                style={{ background: "var(--painel-fundo)" }}
              >
                ANTHROPIC_API_KEY
              </code>{" "}
              {t("tela.chat.semChave.configuracao.depois")}
            </p>
          </div>

          <div
            className="border-t p-6 sm:p-8 md:border-l md:border-t-0"
            style={{ borderColor: "var(--borda)", background: "var(--painel-fundo)" }}
          >
            <p className="text-sm font-semibold">{t("tela.chat.alternativa.titulo")}</p>
            <ul className="mt-4 space-y-3">
              {[
                "tela.chat.alternativa.item1",
                "tela.chat.alternativa.item2",
                "tela.chat.alternativa.item3",
              ].map((chave) => (
                <li
                  key={chave}
                  className="flex items-start gap-2.5 text-[13px]"
                  style={{ color: "var(--tinta-2)" }}
                >
                  <CheckCircle
                    size={16}
                    weight="fill"
                    className="mt-0.5 shrink-0"
                    style={{ color: "var(--accent)" }}
                    aria-hidden
                  />
                  {t(chave)}
                </li>
              ))}
            </ul>
            <Link
              href="/decisao"
              className="tatil mt-6 inline-flex items-center gap-2 rounded-[var(--raio-controle)] px-4 py-2 text-sm font-medium"
              style={{ background: "var(--accent)", color: "var(--accent-tinta)" }}
            >
              {t("tela.chat.semChave.acao")}
              <ArrowRight size={15} weight="bold" aria-hidden />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-5xl flex-col px-5 pb-5 pt-8 sm:pt-10">
      <header className="mb-6 max-w-3xl">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--accent)" }}
        >
          {t("tela.chat.editorial")}
        </p>
        <h1 className="display mt-2 text-3xl font-semibold">{t("tela.chat.titulo")}</h1>
        <p className="prosa mt-2 text-sm" style={{ color: "var(--tinta-2)" }}>
          {t("tela.chat.descricao")}
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {bolhas.length === 0 && (
          <section className="mx-auto max-w-3xl pt-4 sm:pt-8" aria-labelledby="sugestoes-chat">
            <h2 id="sugestoes-chat" className="mb-3 text-sm font-semibold">
              {t("tela.chat.sugestoes.titulo")}
            </h2>
            <div className="grid gap-2 sm:grid-cols-3">
              {SUGESTOES.map((chave) => (
                <button
                  key={chave}
                  onClick={() => enviar(t(chave))}
                  className="tatil group flex min-h-28 w-full flex-col justify-between rounded-[var(--raio-painel)] border p-4 text-left text-[13px] hover:shadow-[var(--sombra)]"
                  style={{
                    borderColor: "var(--borda)",
                    background: "var(--painel)",
                    color: "var(--tinta-2)",
                  }}
                >
                  <ChatCircleDots size={18} style={{ color: "var(--accent)" }} aria-hidden />
                  <span className="mt-4">{t(chave)}</span>
                  <ArrowRight
                    size={14}
                    className="mt-3 transition-transform group-hover:translate-x-0.5"
                    style={{ color: "var(--tinta-fraca)" }}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
          </section>
        )}

        {bolhas.map((bolha, indice) => (
          <div
            key={indice}
            className={bolha.papel === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className="max-w-[85%] whitespace-pre-wrap rounded-[var(--raio-painel)] px-4 py-3 text-sm"
              style={
                bolha.papel === "user"
                  ? { background: "var(--accent)", color: "var(--accent-tinta)" }
                  : {
                      background: "var(--painel)",
                      border: "1px solid var(--borda)",
                      color: "var(--tinta)",
                    }
              }
            >
              {bolha.texto}
              {bolha.ferramentas && bolha.ferramentas.length > 0 && (
                <div
                  className="mt-3 border-t pt-2 text-xs"
                  style={{ borderColor: "var(--borda)", color: "var(--tinta-fraca)" }}
                >
                  {t("tela.chat.metodoAplicado")} {bolha.ferramentas.join(" → ")}
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

      <div
        className="mt-4 rounded-[var(--raio-painel)] border p-2 shadow-[var(--sombra)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent)]"
        style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar(entrada);
          }}
          className="flex gap-2"
        >
          <Entrada
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            placeholder={t("tela.chat.entrada")}
            aria-label={t("tela.chat.entrada")}
            disabled={ocupado}
            className="!border-transparent !bg-transparent"
          />
          <Botao
            type="submit"
            disabled={ocupado || !entrada.trim()}
            icone={<PaperPlaneTilt size={16} weight="bold" aria-hidden />}
          >
            <span className="max-sm:sr-only">{t("tela.chat.enviar")}</span>
          </Botao>
        </form>
      </div>

      {decisaoId && (
        <p className="mt-2 text-xs" style={{ color: "var(--tinta-fraca)" }}>
          {t("tela.chat.emAndamento")} <span className="num">{decisaoId}</span>
        </p>
      )}
    </main>
  );
}
