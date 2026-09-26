"use client";

/**
 * A trilha de auditoria, aberta a partir do resultado.
 *
 * O resultado diz *o quê*. Esta trilha diz *por quê* — e é o que distingue uma
 * recomendação defensável de um número que apareceu na tela. Quem audita
 * precisa reconstituir o caminho: qual declaração o decisor fez, em que ordem,
 * e qual restrição cada uma impôs ao espaço de pesos.
 *
 * Duas decisões de desenho:
 *
 * **Abre embutida, não em modal.** Auditoria se lê devagar, ao lado do
 * resultado que ela explica, e às vezes se imprime. Um modal esconde o
 * resultado justamente na hora de conferir se a explicação bate com ele.
 *
 * **Busca só quando abre.** A trilha é derivada do log a cada chamada; puxá-la
 * junto com o resultado custaria uma requisição em toda resposta do decisor
 * para um painel que quase nunca é aberto durante a elicitação.
 *
 * O conteúdo é o mesmo que a API serve em `/decisoes/{id}/auditoria` e que a
 * planilha exporta — de propósito: três apresentações da mesma narrativa.
 */

import { CaretDown, CaretRight, Scales } from "@phosphor-icons/react";
import { useState } from "react";

import { Botao, Dica } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/auditoria";
import type { Auditoria } from "@/lib/types";

/** `2026-09-26T03:36:08+00:00` -> `26/09/2026 03:36` no fuso de quem lê. */
function instante(iso: string, idioma: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(idioma === "en" ? "en-US" : "pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/** Restrições distintas, com quantas vezes cada origem aparece.
 *
 * Uma declaração vira mais de uma restrição — ordenar três critérios produz
 * duas desigualdades, ambas descritas pela mesma frase. Listadas cruas, viram
 * linhas idênticas repetidas, e quem audita perde tempo procurando a diferença
 * que não existe. O que informa é a frase uma vez, com a contagem ao lado.
 */
function agrupar(fontes: string[]): { texto: string; vezes: number }[] {
  const contagem = new Map<string, number>();
  for (const fonte of fontes) contagem.set(fonte, (contagem.get(fonte) ?? 0) + 1);
  return [...contagem].map(([texto, vezes]) => ({ texto, vezes }));
}

export function TrilhaAuditoria({ decisaoId }: { decisaoId: string }) {
  const { t, idioma } = useIdioma();
  const [aberta, setAberta] = useState(false);
  const [trilha, setTrilha] = useState<Auditoria | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function buscar() {
    setCarregando(true);
    setErro(null);
    try {
      setTrilha(await api.auditoria(decisaoId));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : t("auditoria.erro"));
    } finally {
      setCarregando(false);
    }
  }

  function alternar() {
    const abrindo = !aberta;
    setAberta(abrindo);
    /* Busca a cada abertura, e não só na primeira. A trilha é derivada do log,
       e o log muda a cada resposta e a cada "voltar um passo": guardá-la em
       cache mostraria declarações antigas ao lado de uma recomendação que elas
       já não explicam — que é exatamente o contrário do que uma auditoria é. */
    if (abrindo && !carregando) void buscar();
  }

  const declaracoes = trilha?.declaracoes ?? [];
  /* A contagem é de restrições, a lista é de origens: uma origem pode ter
     imposto várias. Misturar os dois números faria a soma não fechar. */
  const totalRestricoes = trilha?.restricoes_ativas.length ?? 0;
  const restricoes = agrupar(trilha?.restricoes_ativas ?? []);

  return (
    <div className="mt-8">
      <Botao
        variante="contorno"
        onClick={alternar}
        aria-expanded={aberta}
        icone={
          aberta ? (
            <CaretDown size={16} weight="regular" />
          ) : (
            <CaretRight size={16} weight="regular" />
          )
        }
      >
        {aberta ? t("auditoria.fechar") : t("auditoria.abrir")}
      </Botao>

      {aberta && (
        <div
          className="mt-4 rounded-[var(--raio-controle)] p-5"
          style={{
            background: "var(--painel)",
            border: "1px solid var(--borda)",
          }}
        >
          <h3
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: "var(--tinta)" }}
          >
            <Scales size={18} weight="regular" />
            {t("auditoria.titulo")}
          </h3>

          {carregando && (
            <p className="prosa mt-3 text-sm" style={{ color: "var(--tinta-3)" }}>
              {t("auditoria.carregando")}
            </p>
          )}

          {erro && (
            <div className="mt-3">
              <p className="prosa text-sm" style={{ color: "var(--erro)" }}>
                {erro}
              </p>
              <button
                onClick={() => void buscar()}
                className="tatil mt-2 text-[12px] underline underline-offset-2"
                style={{ color: "var(--tinta-3)" }}
              >
                {t("auditoria.tentarDeNovo")}
              </button>
            </div>
          )}

          {trilha && !carregando && (
            <>
              <section className="mt-5">
                <h4
                  className="text-[12px] font-medium uppercase tracking-wide"
                  style={{ color: "var(--tinta-3)" }}
                >
                  {t("auditoria.declaracoes.titulo")}
                  {declaracoes.length > 0 && (
                    <span className="ml-2 font-normal normal-case tracking-normal">
                      {declaracoes.length === 1
                        ? t("auditoria.declaracoes.uma")
                        : t("auditoria.declaracoes.varias", {
                            n: declaracoes.length,
                          })}
                    </span>
                  )}
                </h4>

                {declaracoes.length === 0 ? (
                  <p
                    className="prosa mt-2 text-sm"
                    style={{ color: "var(--tinta-3)" }}
                  >
                    {t("auditoria.declaracoes.vazio")}
                  </p>
                ) : (
                  <ol className="mt-3 space-y-3">
                    {declaracoes.map((d) => (
                      <li
                        key={d.sequencia}
                        className="flex gap-3 text-sm"
                        style={{ color: "var(--tinta-2)" }}
                      >
                        <span
                          className="shrink-0 tabular-nums"
                          style={{ color: "var(--tinta-3)" }}
                        >
                          {d.sequencia}.
                        </span>
                        <span className="prosa">
                          {d.declaracao}
                          <span
                            className="ml-2 text-[12px]"
                            style={{ color: "var(--tinta-3)" }}
                          >
                            — {d.autor} · {instante(d.registrado_em, idioma)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className="mt-6">
                <h4
                  className="text-[12px] font-medium uppercase tracking-wide"
                  style={{ color: "var(--tinta-3)" }}
                >
                  {t("auditoria.restricoes.titulo")}
                  {totalRestricoes > 0 && (
                    <span className="ml-2 font-normal normal-case tracking-normal">
                      {totalRestricoes === 1
                        ? t("auditoria.restricoes.uma")
                        : t("auditoria.restricoes.varias", {
                            n: totalRestricoes,
                          })}
                    </span>
                  )}
                </h4>

                {restricoes.length === 0 ? (
                  <p
                    className="prosa mt-2 text-sm"
                    style={{ color: "var(--tinta-3)" }}
                  >
                    {t("auditoria.restricoes.vazio")}
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {restricoes.map(({ texto, vezes }) => (
                      <li
                        key={texto}
                        className="prosa text-sm"
                        style={{ color: "var(--tinta-2)" }}
                      >
                        {texto}
                        {vezes > 1 && (
                          <span
                            className="ml-2 text-[12px] tabular-nums"
                            style={{ color: "var(--tinta-3)" }}
                          >
                            {t("auditoria.restricoes.vezes", { n: vezes })}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {trilha.leitura && (
                <div className="mt-6">
                  <Dica titulo={t("auditoria.comoLer")}>
                    <p>{trilha.leitura}</p>
                    {trilha.nota_sobre_autoria && (
                      <p>{trilha.nota_sobre_autoria}</p>
                    )}
                  </Dica>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
