"use client";

/**
 * Conferência do que veio da planilha, antes de virar decisão.
 *
 * Importar e criar num passo só obriga a descobrir o erro depois do fato: a
 * decisão já existe, com uma direção trocada ou uma coluna a menos. E a direção
 * é o dado que inverte o resultado inteiro sem dar nenhum sinal — uma decisão
 * com "menor é melhor" lido como "maior" recomenda exatamente a pior opção, com
 * toda a aparência de estar certa.
 *
 * Por isso a leitura aparece antes de gravar, com a direção em destaque e a
 * matriz inteira visível. Corrigir aqui é trocar um botão; corrigir depois é
 * refazer a decisão.
 */

import {
  ArrowLeft,
  Check,
  Coins,
  TrendDown,
  TrendUp,
  WarningCircle,
} from "@phosphor-icons/react";
import { useState } from "react";

import { Botao, Campo, Dica, Entrada, Segmentado } from "@/components/ui";
import type { PlanilhaLida } from "@/lib/api";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/entrada";
import type { Direcao } from "@/lib/types";

function formatar(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(6)));
}

export interface Conferido {
  nome: string;
  alternativas: string[];
  criterios: { chave: string; nome: string; direcao: Direcao; unidade?: string }[];
  consequencias: number[][];
  custos: number[] | null;
}

export function ConferenciaImportacao({
  lida,
  ocupado,
  onConfirmar,
  onCancelar,
}: {
  lida: PlanilhaLida;
  ocupado: boolean;
  onConfirmar: (dados: Conferido) => void;
  onCancelar: () => void;
}) {
  const { t } = useIdioma();
  const [nome, setNome] = useState(lida.nome);
  const [criterios, setCriterios] = useState(lida.criterios);

  const trocarDirecao = (i: number, direcao: Direcao) =>
    setCriterios(criterios.map((c, j) => (j === i ? { ...c, direcao } : c)));

  /* Uma planilha em que tudo é "maior é melhor" quase sempre significa que a
     linha de direção foi preenchida no automático. Não é erro — só vale um
     aviso, porque é o engano mais caro e o mais silencioso. */
  const todosIguais =
    criterios.length > 1 && criterios.every((c) => c.direcao === criterios[0].direcao);

  const painel = { borderColor: "var(--borda)", background: "var(--painel)" };

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center gap-1.5">
        <Check size={16} weight="bold" style={{ color: "var(--sucesso)" }} />
        <h3 className="text-[15px] font-semibold" style={{ color: "var(--tinta)" }}>
          {t("entrada.conferencia.titulo")}
        </h3>
        <Dica titulo={t("entrada.conferencia.dica.titulo")}>
          <p>
            {t("entrada.conferencia.dica.antes")}{" "}
            <strong>{t("entrada.termo.direcao")}</strong>{" "}
            {t("entrada.conferencia.dica.depois")}
          </p>
          <p>{t("entrada.conferencia.dica.invertida")}</p>
        </Dica>
      </div>

      <p className="prosa mb-5 text-[13px]" style={{ color: "var(--tinta-3)" }}>
        {t("entrada.conferencia.resumo", {
          origem:
            lida.origem === "colado"
              ? t("entrada.conferencia.origemColada")
              : lida.origem,
          alternativas: lida.alternativas.length,
          criterios: criterios.length,
          custos: lida.custos ? t("entrada.conferencia.comCustos") : "",
        })}
      </p>

      <div className="mb-5 max-w-md">
        <Campo
          rotulo={t("entrada.conferencia.nome")}
          ajuda={t("entrada.conferencia.nome.ajuda")}
        >
          {(props) => (
            <Entrada
              {...props}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={t("entrada.conferencia.semNome")}
            />
          )}
        </Campo>
      </div>

      {todosIguais && (
        <p
          className="prosa mb-4 flex items-start gap-2 rounded-[var(--raio-controle)] border p-3 text-[12.5px]"
          style={{ borderColor: "var(--aviso)", color: "var(--tinta-2)" }}
        >
          <WarningCircle
            size={15}
            weight="fill"
            style={{ color: "var(--aviso)" }}
            className="mt-px shrink-0"
          />
          <span>
            {t("entrada.conferencia.aviso.antes")}{" "}
            <strong>
              {t(
                criterios[0].direcao === "max"
                  ? "termo.maiorMelhor"
                  : "termo.menorMelhor",
              )}
            </strong>
            {t("entrada.conferencia.aviso.depois")}
          </span>
        </p>
      )}

      <div
        className="overflow-x-auto rounded-[var(--raio-painel)] border p-4"
        style={painel}
      >
        <table className="w-full border-separate border-spacing-x-3 border-spacing-y-1.5">
          <thead>
            <tr>
              <th className="text-left align-bottom">
                <span className="text-[11px] font-medium" style={{ color: "var(--tinta-3)" }}>
                  {t("entrada.conferencia.coluna.alternativa")}
                </span>
              </th>
              {criterios.map((c, i) => (
                <th key={c.chave} className="align-bottom">
                  <div className="flex min-w-32 flex-col items-start gap-1">
                    <span
                      className="text-[12.5px] font-medium"
                      style={{ color: "var(--tinta)" }}
                    >
                      {c.nome}
                    </span>
                    {c.unidade && (
                      <span className="text-[11px]" style={{ color: "var(--tinta-fraca)" }}>
                        {c.unidade}
                      </span>
                    )}
                    <Segmentado
                      etiqueta={t("entrada.conferencia.direcaoDe", {
                        criterio: c.nome,
                      })}
                      valor={c.direcao}
                      onEscolher={(dir) => trocarDirecao(i, dir as Direcao)}
                      opcoes={[
                        {
                          valor: "max",
                          rotulo: t("entrada.direcao.maior"),
                          icone: <TrendUp size={11} weight="bold" />,
                          descricao: t("entrada.direcao.maior.ajuda"),
                        },
                        {
                          valor: "min",
                          rotulo: t("entrada.direcao.menor"),
                          icone: <TrendDown size={11} weight="bold" />,
                          descricao: t("entrada.direcao.menor.ajuda"),
                        },
                      ]}
                    />
                  </div>
                </th>
              ))}
              {lida.custos && (
                <th className="align-bottom">
                  <span
                    className="flex items-center gap-1 text-[12.5px] font-medium"
                    style={{ color: "var(--accent)" }}
                  >
                    <Coins size={12} weight="fill" />
                    {t("entrada.termo.custo")}
                  </span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {lida.alternativas.map((alternativa, i) => (
              <tr key={alternativa}>
                <td className="text-[13px]" style={{ color: "var(--tinta)" }}>
                  {alternativa}
                </td>
                {lida.consequencias[i].map((valor, j) => (
                  <td
                    key={j}
                    className="num text-right text-[13px]"
                    style={{ color: "var(--tinta-2)" }}
                  >
                    {formatar(valor)}
                  </td>
                ))}
                {lida.custos && (
                  <td className="num text-right text-[13px]" style={{ color: "var(--tinta-2)" }}>
                    {formatar(lida.custos[i])}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Botao
          onClick={() =>
            onConfirmar({
              nome: nome.trim() || t("entrada.conferencia.semNome"),
              alternativas: lida.alternativas,
              criterios,
              consequencias: lida.consequencias,
              custos: lida.custos,
            })
          }
          disabled={ocupado}
          icone={<Check size={14} weight="bold" />}
        >
          {t("entrada.conferencia.confirmar")}
        </Botao>
        <button
          type="button"
          onClick={onCancelar}
          disabled={ocupado}
          className="tatil flex items-center gap-1.5 text-[13px] disabled:opacity-40"
          style={{ color: "var(--tinta-3)" }}
        >
          <ArrowLeft size={13} weight="bold" />
          {t("entrada.conferencia.outraPlanilha")}
        </button>
      </div>
    </div>
  );
}
