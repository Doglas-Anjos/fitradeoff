"use client";

/**
 * Os desempenhos, depois que a estrutura ja existe.
 *
 * Aqui nada se cria: as linhas sao as alternativas cadastradas, as colunas sao
 * os criterios cadastrados, e a unica coisa a fazer e preencher. E o que
 * permite que a tabela finalmente saiba o que cada celula aceita -- num
 * criterio de escala construida ela vira uma lista dos niveis declarados, e nao
 * um campo livre que so seria recusado na criacao.
 */

import { Coins } from "@phosphor-icons/react";
import { useEffect } from "react";

import { avisar } from "@/components/Avisos";
import { Rodape } from "@/components/Etapas";
import { Botao, Entrada, estiloControle } from "@/components/ui";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/estrutura";
import "@/lib/i18n/nucleo";
import {
  colarNaMatriz,
  definirCusto,
  definirValor,
  niveisDe,
  pareceTabela,
  type Rascunho,
  ehCarteira,
} from "@/lib/rascunho";

/** "0,35" no campo, 0.35 no rótulo — o número como a pessoa o lê. */
const mostrar = (v: number): string =>
  Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(6)));

export function MatrizConsequencias({
  rascunho,
  onAlterar,
  onVoltar,
  onContinuar,
  rotuloAcao,
  ocupado = false,
  erro,
  campoComErro,
}: {
  rascunho: Rascunho;
  onAlterar: (r: Rascunho) => void;
  onVoltar: () => void;
  onContinuar: () => void;
  rotuloAcao: string;
  ocupado?: boolean;
  erro?: string | null;
  campoComErro?: string | null;
}) {
  const { t } = useIdioma();

  /* A tabela rola na horizontal quando não cabe, e num celular a coluna do erro
     pode estar fora da tela: a mensagem apareceria sem o campo a que se refere.
     Levar a pessoa até ele é mais útil do que descrevê-lo melhor. */
  useEffect(() => {
    if (!campoComErro) return;
    const alvo = document.querySelector<HTMLElement>(`[data-campo="${campoComErro}"]`);
    alvo?.scrollIntoView?.({ behavior: "smooth", block: "center", inline: "center" });
    alvo?.focus({ preventScroll: true });
  }, [campoComErro]);

  const carteira = ehCarteira(rascunho.problematica);

  /** Onde a colagem começa: a célula sob o cursor.
   *
   * O alvo do evento é o `<input>`/`<select>` que tem o `data-campo`, e é ele
   * quem diz a origem. O canto (0, 0) é só rede de segurança: o evento de
   * colar vai para o elemento com foco, e todo elemento focável aqui dentro
   * carrega `data-campo` — colar sem foco numa célula nem chega neste handler. */
  function origemDe(alvo: EventTarget | null): [number, number] {
    const campo = (alvo as HTMLElement | null)?.closest?.("[data-campo]");
    const nome = campo?.getAttribute("data-campo") ?? "";
    const celula = /^celula-(\d+)-(\d+)$/.exec(nome);
    if (celula) return [Number(celula[1]), Number(celula[2])];
    const custo = /^custo-(\d+)$/.exec(nome);
    if (custo) return [Number(custo[1]), rascunho.colunas.length];
    return [0, 0];
  }

  function aoColar(e: React.ClipboardEvent) {
    const texto = e.clipboardData.getData("text/plain");
    /* Uma célula só é digitação normal: interceptar atrapalharia o gesto de
       corrigir um número copiado de outro lugar. O critério vive no rascunho,
       junto do parse, porque os dois precisam concordar — se divergirem, ou a
       colagem é engolida sem efeito, ou `12,5` vira duas células. */
    if (!texto || !pareceTabela(texto)) return;

    e.preventDefault();
    const [linha, coluna] = origemDe(e.target);
    const r = colarNaMatriz(rascunho, linha, coluna, texto, carteira);

    if (r.preenchidas === 0 && r.recusados === 0 && r.foraDaGrade === 0) {
      return avisar.erro(t("estrutura.matriz.colar.nada"));
    }

    const anterior = rascunho;
    onAlterar(r.rascunho);

    const partes = [
      r.preenchidas === 1
        ? t("estrutura.matriz.colar.umaCelula")
        : t("estrutura.matriz.colar.feito", { n: r.preenchidas }),
    ];
    if (r.foraDaGrade > 0)
      partes.push(t("estrutura.matriz.colar.foraDaGrade", { n: r.foraDaGrade }));
    if (r.recusados > 0)
      partes.push(t("estrutura.matriz.colar.recusados", { n: r.recusados }));

    /* Desfazível porque colar acerta muitas células de uma vez: se a origem
       estava errada, refazer à mão seria pior do que nunca ter colado. */
    avisar.desfazivel(partes.join(" "), () => onAlterar(anterior));
  }

  return (
    <div>
      <p className="prosa mb-3 text-[13px]" style={{ color: "var(--tinta-3)" }}>
        {t("estrutura.matriz.resumo", {
          linhas: rascunho.linhas.length,
          colunas: rascunho.colunas.length,
        })}
      </p>

      {/* A tabela rola na horizontal, e num celular as últimas colunas ficam
          fora da tela sem nada dizendo que existem. */}
      {rascunho.colunas.length > 1 && (
        <p className="mb-3 text-[12px] sm:hidden" style={{ color: "var(--tinta-fraca)" }}>
          {t("estrutura.matriz.role")}
        </p>
      )}

      <p className="mb-3 text-[12px]" style={{ color: "var(--tinta-fraca)" }}>
        {t("estrutura.matriz.colar.dica")}
      </p>

      <div
        onPaste={aoColar}
        className="overflow-x-auto rounded-[var(--raio-painel)] border p-4"
        style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
      >
        <table className="w-full border-separate border-spacing-2">
          <thead>
            <tr>
              <th className="w-44 text-left align-bottom">
                <span
                  className="text-[11px] font-medium"
                  style={{ color: "var(--tinta-3)" }}
                >
                  {t("estrutura.matriz.coluna.alternativa")}
                </span>
              </th>
              {rascunho.colunas.map((c, j) => (
                <th key={j} className="align-bottom">
                  <div className="flex w-36 flex-col gap-0.5 text-left">
                    <span
                      className="text-[12.5px] font-medium"
                      style={{ color: "var(--tinta)" }}
                    >
                      {c.nome}
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--tinta-fraca)" }}>
                      {c.unidade && `${c.unidade} · `}
                      {c.escala === "discreta"
                        ? t(
                            c.niveis.length === 1
                              ? "estrutura.niveis.contagemUm"
                              : "estrutura.niveis.contagem",
                            { n: c.niveis.length },
                          )
                        : c.direcao === "max"
                          ? t("termo.maiorMelhor")
                          : t("termo.menorMelhor")}
                    </span>
                  </div>
                </th>
              ))}
              {carteira && (
                <th className="align-bottom">
                  <div className="flex w-28 flex-col gap-0.5 text-left">
                    <span
                      className="flex items-center gap-1 text-[12.5px] font-medium"
                      style={{ color: "var(--accent)" }}
                    >
                      <Coins size={12} weight="fill" />
                      {t("estrutura.matriz.coluna.custo")}
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--tinta-fraca)" }}>
                      {t("estrutura.matriz.coluna.custo.ajuda")}
                    </span>
                  </div>
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {rascunho.linhas.map((linha, i) => (
              <tr key={i}>
                <td className="text-[13px]" style={{ color: "var(--tinta)" }}>
                  {linha.nome}
                </td>
                {linha.valores.map((valor, j) => {
                  const criterio = rascunho.colunas[j];
                  const niveis = niveisDe(criterio);
                  const rotulo = `${linha.nome}, ${criterio.nome}`;
                  const invalido = campoComErro === `celula-${i}-${j}`;

                  return (
                    <td key={j}>
                      {niveis ? (
                        <select
                          value={valor}
                          data-campo={`celula-${i}-${j}`}
                          onChange={(e) => onAlterar(definirValor(rascunho, i, j, e.target.value))}
                          aria-label={rotulo}
                          className="tatil num w-full rounded-[var(--raio-controle)] border px-2 py-1.5 text-right text-[13px] outline-none"
                          style={{
                            ...estiloControle,
                            borderColor: invalido ? "var(--erro)" : "var(--borda-forte)",
                          }}
                        >
                          <option value="">—</option>
                          {criterio.niveis.map((bruto, k) => (
                            <option key={k} value={bruto}>
                              {Number.isFinite(niveis[k]) ? mostrar(niveis[k]) : bruto}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Entrada
                          value={valor}
                          invalido={invalido}
                          data-campo={`celula-${i}-${j}`}
                          onChange={(e) => onAlterar(definirValor(rascunho, i, j, e.target.value))}
                          inputMode={criterio.inteiro ? "numeric" : "decimal"}
                          placeholder="0"
                          aria-label={rotulo}
                          className="num !py-1.5 text-right !text-[13px]"
                        />
                      )}
                    </td>
                  );
                })}
                {carteira && (
                  <td>
                    <Entrada
                      value={linha.custo}
                      invalido={campoComErro === `custo-${i}`}
                      data-campo={`custo-${i}`}
                      onChange={(e) => onAlterar(definirCusto(rascunho, i, e.target.value))}
                      inputMode="decimal"
                      placeholder="0"
                      aria-label={t("estrutura.matriz.custoDe", { nome: linha.nome })}
                      className="num !py-1.5 text-right !text-[13px]"
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {erro && (
        <p role="alert" className="mt-5 text-sm" style={{ color: "var(--erro)" }}>
          {erro}
        </p>
      )}

      <Rodape>
        <Botao onClick={onContinuar} disabled={ocupado}>
          {rotuloAcao}
        </Botao>
      </Rodape>
    </div>
  );
}
