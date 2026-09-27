"use client";

/**
 * Onde as chaves do MCP são geradas.
 *
 * Esta tela substituiu o chat. O chat punha uma conversa dentro do produto, com
 * a chave da plataforma pagando por ela; aqui o decisor conecta o assistente que
 * já usa, e o método continua sendo calculado deste lado. O que a tela precisa
 * entregar, nessa ordem: o que a conexão dá, a chave, e o trecho pronto para
 * colar no cliente certo.
 *
 * Duas decisões de interface:
 *
 * **O texto da chave fica num bloco à parte, não na lista.** A lista mostra
 * prefixo, e só: uma chave inteira parada na tela é uma chave exposta a quem
 * passar atrás da cadeira. O bloco aparece uma vez, logo depois de gerar, e
 * some quando a pessoa gera outra ou recarrega.
 *
 * **O trecho de cada cliente traz a chave embutida quando existe uma nova.**
 * Copiar o comando e depois lembrar de trocar `SUA_CHAVE` é o passo em que se
 * erra; com a chave dentro, colar basta.
 */

import {
  ArrowSquareOut,
  Check,
  Copy,
  Info,
  Key,
  Plugs,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";

import { avisar } from "@/components/Avisos";
import { TintaCabecalho } from "@/components/TintaCabecalho";
import { Botao, Campo, Entrada, Segmentado, Selo } from "@/components/ui";
import { api, ApiError, type Chave, type Conexao } from "@/lib/api";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/chaves";

type Cliente = "claude" | "code" | "editor";

const CLIENTES: Cliente[] = ["claude", "code", "editor"];

/** `2026-09-26T03:36:08+00:00` -> `26/09/2026 03:36` no fuso de quem lê. */
function instante(iso: string, idioma: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(idioma === "en" ? "en-US" : "pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function BotaoCopiar({ texto, rotuloAcessivel }: { texto: string; rotuloAcessivel: string }) {
  const { t } = useIdioma();
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      /* Volta ao estado normal sozinho: um botão que fica "Copiado" para sempre
         deixa de dizer se a segunda cópia funcionou. */
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Área de transferência bloqueada (contexto não seguro, permissão negada):
      // o texto está à vista, então a saída é selecionar à mão.
      avisar.erro(t("tela.chaves.copiar.falhou"));
    }
  };

  return (
    <button
      type="button"
      onClick={copiar}
      aria-label={`${copiado ? t("tela.chaves.copiado") : t("tela.chaves.copiar")}: ${rotuloAcessivel}`}
      className="tatil inline-flex shrink-0 items-center gap-1.5 rounded-[var(--raio-controle)] border px-2.5 py-1.5 text-[12px] font-medium"
      style={{
        borderColor: copiado ? "var(--accent)" : "var(--borda-forte)",
        background: copiado ? "var(--accent-suave)" : "var(--painel)",
        color: copiado ? "var(--accent)" : "var(--tinta-2)",
      }}
    >
      {copiado ? (
        <Check size={13} weight="bold" aria-hidden />
      ) : (
        <Copy size={13} weight="bold" aria-hidden />
      )}
      {copiado ? t("tela.chaves.copiado") : t("tela.chaves.copiar")}
    </button>
  );
}

/** Um trecho para copiar: texto largo quebra em vez de esticar a página. */
function Trecho({ texto, rotuloAcessivel }: { texto: string; rotuloAcessivel: string }) {
  return (
    <div
      className="mt-3 flex items-start gap-3 rounded-[var(--raio-controle)] border p-3"
      style={{ borderColor: "var(--borda)", background: "var(--painel-fundo)" }}
    >
      <pre
        className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all text-[12.5px] leading-relaxed"
        style={{ fontFamily: "var(--fonte-mono), ui-monospace, monospace" }}
      >
        {texto}
      </pre>
      <BotaoCopiar texto={texto} rotuloAcessivel={rotuloAcessivel} />
    </div>
  );
}

export default function ChavesPage() {
  const { t, idioma } = useIdioma();
  const [conexao, setConexao] = useState<Conexao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [rotulo, setRotulo] = useState("");
  const [emitindo, setEmitindo] = useState(false);
  const [nova, setNova] = useState<{ chave: Chave; texto: string } | null>(null);
  const [cliente, setCliente] = useState<Cliente>("claude");

  const carregar = useCallback(async () => {
    try {
      setConexao(await api.chaves());
      setErro(null);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const emitir = async () => {
    if (!rotulo.trim() || emitindo) return;
    setEmitindo(true);
    try {
      const resposta = await api.emitirChave(rotulo.trim());
      setNova({ chave: resposta.chave, texto: resposta.texto });
      setRotulo("");
      await carregar();
    } catch (e) {
      avisar.erro(e instanceof ApiError ? e.message : String(e));
    } finally {
      setEmitindo(false);
    }
  };

  const revogar = async (chave: Chave) => {
    if (!window.confirm(t("tela.chaves.revogar.confirma", { rotulo: chave.rotulo }))) {
      return;
    }
    try {
      await api.revogarChave(chave.id);
      /* O bloco da chave nova sai junto se foi ela a revogada: deixá-lo à vista
         ofereceria para copiar uma chave que já não abre nada. */
      setNova((atual) => (atual?.chave.id === chave.id ? null : atual));
      avisar.feito(t("tela.chaves.revogada"));
      await carregar();
    } catch (e) {
      avisar.erro(e instanceof ApiError ? e.message : String(e));
    }
  };

  const url = conexao?.url ?? "";
  const chaveNoTrecho = nova?.texto ?? t("tela.chaves.placeholder");
  const trechos: Record<Cliente, string> = {
    claude: `${url}/${chaveNoTrecho}`,
    code: `claude mcp add --transport http fitradeoff ${url} --header "Authorization: Bearer ${chaveNoTrecho}"`,
    editor: `{
  "mcpServers": {
    "fitradeoff": {
      "type": "http",
      "url": "${url}",
      "headers": { "Authorization": "Bearer ${chaveNoTrecho}" }
    }
  }
}`,
  };

  const soLocal =
    conexao !== null &&
    !conexao.publicado &&
    /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])/.test(conexao.url);

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
      <header className="cabecalho-escuro max-w-4xl p-6 sm:p-8">
        <TintaCabecalho semente={5137} />
        <p className="sobrelinha" style={{ color: "#8fc5ff" }}>
          {t("tela.chaves.editorial")}
        </p>
        <h1 className="display mt-3 text-3xl font-semibold text-white sm:text-4xl">
          {t("tela.chaves.titulo")}
        </h1>
        <p className="prosa mt-3 text-base" style={{ color: "#c6d7ea" }}>
          {t("tela.chaves.descricao")}
        </p>
      </header>

      {/* --- o que a chave abre ------------------------------------------- */}
      <section className="superficie-alta mt-7 p-6 sm:p-8">
        <span
          className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--raio-controle)]"
          style={{ background: "var(--accent-suave)", color: "var(--accent)" }}
        >
          <Plugs size={22} weight="duotone" aria-hidden />
        </span>
        <h2 className="mt-5 text-xl font-semibold tracking-tight">
          {t("tela.chaves.oque.titulo")}
        </h2>
        <div className="prosa mt-3 space-y-3 text-sm" style={{ color: "var(--tinta-2)" }}>
          <p>{t("tela.chaves.oque.p1")}</p>
          <p>{t("tela.chaves.oque.p2")}</p>
          <p>{t("tela.chaves.oque.p3")}</p>
        </div>
      </section>

      {erro && (
        <div
          role="alert"
          className="mt-6 rounded-[var(--raio-painel)] border p-4 text-sm"
          style={{ borderColor: "var(--erro)", color: "var(--erro)" }}
        >
          {erro}
        </div>
      )}

      {conexao?.aviso && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-2.5 rounded-[var(--raio-painel)] border p-4 text-[13px]"
          style={{ borderColor: "var(--aviso)", color: "var(--tinta)" }}
        >
          <Warning
            size={16}
            weight="fill"
            className="mt-0.5 shrink-0"
            style={{ color: "var(--aviso)" }}
            aria-hidden
          />
          {conexao.aviso}
        </div>
      )}

      {/* --- gerar --------------------------------------------------------- */}
      <section className="superficie-alta mt-6 p-6 sm:p-8">
        <h2 className="text-xl font-semibold tracking-tight">
          {t("tela.chaves.emitir.titulo")}
        </h2>
        <form
          className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            emitir();
          }}
        >
          <div className="flex-1">
            <Campo
              rotulo={t("tela.chaves.emitir.rotulo")}
              ajuda={t("tela.chaves.emitir.ajuda")}
              obrigatorio
            >
              {(props) => (
                <Entrada
                  {...props}
                  value={rotulo}
                  onChange={(e) => setRotulo(e.target.value)}
                  placeholder={t("tela.chaves.emitir.exemplo")}
                  maxLength={60}
                  disabled={emitindo}
                />
              )}
            </Campo>
          </div>
          <Botao
            type="submit"
            disabled={emitindo || !rotulo.trim()}
            icone={<Key size={16} weight="bold" aria-hidden />}
          >
            {emitindo ? t("tela.chaves.emitir.gerando") : t("tela.chaves.emitir.acao")}
          </Botao>
        </form>

        {nova && (
          <div
            className="mt-6 rounded-[var(--raio-painel)] border p-4"
            style={{ borderColor: "var(--accent)", background: "var(--accent-suave)" }}
          >
            <p className="text-sm font-semibold">{t("tela.chaves.nova.titulo")}</p>
            <p className="prosa mt-1.5 text-[13px]" style={{ color: "var(--tinta-2)" }}>
              {t("tela.chaves.nova.aviso")}
            </p>
            <Trecho texto={nova.texto} rotuloAcessivel={nova.chave.rotulo} />
          </div>
        )}
      </section>

      {/* --- conectar ------------------------------------------------------ */}
      <section className="superficie-alta mt-6 p-6 sm:p-8">
        <h2 className="text-xl font-semibold tracking-tight">
          {t("tela.chaves.conectar.titulo")}
        </h2>

        {!nova && (
          <p className="prosa mt-2 text-[13px]" style={{ color: "var(--tinta-3)" }}>
            {t("tela.chaves.conectar.semChave")}
          </p>
        )}

        <Segmentado
          className="mt-4"
          etiqueta={t("tela.chaves.conectar.titulo")}
          valor={cliente}
          onEscolher={setCliente}
          opcoes={CLIENTES.map((c) => ({
            valor: c,
            rotulo: t(`tela.chaves.cliente.${c}`),
          }))}
        />

        <p className="prosa mt-5 text-sm" style={{ color: "var(--tinta-2)" }}>
          {t(`tela.chaves.${cliente}.passos`)}
        </p>
        {carregando ? (
          <p className="mt-3 text-sm" style={{ color: "var(--tinta-fraca)" }}>
            {t("tela.chaves.carregando")}
          </p>
        ) : (
          <Trecho
            texto={trechos[cliente]}
            rotuloAcessivel={t(`tela.chaves.cliente.${cliente}`)}
          />
        )}

        {cliente === "claude" && (
          <p
            className="prosa mt-3 flex items-start gap-2 text-[12.5px]"
            style={{ color: "var(--tinta-3)" }}
          >
            <Info size={15} className="mt-0.5 shrink-0" aria-hidden />
            {t("tela.chaves.claude.nota")}
          </p>
        )}

        <p className="prosa mt-4 text-[13px]" style={{ color: "var(--tinta-3)" }}>
          {t("tela.chaves.conectar.conferir")}
        </p>

        {soLocal && (
          <div
            className="mt-5 rounded-[var(--raio-controle)] border p-4"
            style={{ borderColor: "var(--borda-forte)", background: "var(--painel-fundo)" }}
          >
            <p className="flex items-center gap-2 text-[13px] font-semibold">
              <ArrowSquareOut size={15} weight="bold" aria-hidden />
              {t("tela.chaves.local.titulo")}
            </p>
            <p className="prosa mt-1.5 text-[12.5px]" style={{ color: "var(--tinta-2)" }}>
              {t("tela.chaves.local.texto")}
            </p>
          </div>
        )}
      </section>

      {/* --- emitidas ------------------------------------------------------ */}
      <section className="superficie-alta mt-6 p-6 sm:p-8">
        <h2 className="text-xl font-semibold tracking-tight">
          {t("tela.chaves.emitidas.titulo")}
        </h2>

        {carregando ? (
          <p className="mt-4 text-sm" style={{ color: "var(--tinta-fraca)" }}>
            {t("tela.chaves.carregando")}
          </p>
        ) : conexao && conexao.chaves.length > 0 ? (
          <ul className="mt-4 divide-y" style={{ borderColor: "var(--borda)" }}>
            {conexao.chaves.map((chave) => (
              <li
                key={chave.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                style={{ borderColor: "var(--borda)" }}
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {chave.rotulo}
                    <Selo>
                      <span className="num">{chave.prefixo}</span>
                    </Selo>
                  </p>
                  <p className="mt-1 text-[12px]" style={{ color: "var(--tinta-3)" }}>
                    {t("tela.chaves.emitidas.criada", {
                      data: instante(chave.criada_em, idioma),
                    })}
                    {" · "}
                    {chave.ultimo_uso
                      ? t("tela.chaves.emitidas.uso", {
                          data: instante(chave.ultimo_uso, idioma),
                        })
                      : t("tela.chaves.emitidas.semUso")}
                  </p>
                </div>
                <Botao
                  variante="contorno"
                  onClick={() => revogar(chave)}
                  icone={<Trash size={15} weight="bold" aria-hidden />}
                >
                  {t("tela.chaves.revogar")}
                </Botao>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm" style={{ color: "var(--tinta-fraca)" }}>
            {t("tela.chaves.emitidas.vazio")}
          </p>
        )}
      </section>
    </main>
  );
}
