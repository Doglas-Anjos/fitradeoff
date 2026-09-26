"use client";

/**
 * A faixa de um critério, desenhada: do pior ao melhor desempenho possível.
 *
 * É o desenho que dá sentido a toda pergunta de ordenação. "Qualidade é mais
 * importante que prazo" não afirma nada enquanto não se sabe que o prazo varia
 * de 45 para 12 dias — o que o método pergunta não é qual critério importa
 * mais, é qual *salto* vale mais. Enquanto só o modo par a par desenhava a
 * faixa, quem ordenava a lista ou escolhia um a um decidia às cegas.
 *
 * **A barra é sempre cheia, e isso não é um descuido.** Cada critério é
 * normalizado no próprio intervalo: o salto do pior ao melhor é, por
 * definição, 100% dele. Barras de comprimentos diferentes insinuariam que um
 * critério "tem mais faixa" que outro, que é exatamente a leitura errada — o
 * que difere entre eles são os números nas pontas e o quanto esse salto vale.
 *
 * **Uma figura, não três pedaços de texto.** Sem o `role="img"`, o leitor de
 * tela anuncia "45", "12", "pior", "melhor" soltos, em quatro paradas, e cabe
 * a quem ouve remontar a frase. Com ele, a faixa inteira é lida de uma vez, na
 * mesma redação que aparece escrita nos outros lugares da tela.
 */

import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/visualizacoes";
import type { CriterioOut } from "@/lib/types";

/**
 * Número na unidade do problema. `toPrecision` em vez de `toFixed` porque a
 * grandeza é do decisor, não nossa: custo em reais e taxa de falha em partes
 * por milhão não cabem na mesma casa decimal fixa.
 */
export function formatarValor(valor: number): string {
  return Number.isInteger(valor)
    ? String(valor)
    : valor.toPrecision(4).replace(/\.?0+$/, "");
}

export function FaixaCriterio({
  criterio,
  cor = "var(--accent)",
  variante = "cartao",
}: {
  criterio: CriterioOut;
  /** A cor do lado, quando a tela distingue dois critérios lado a lado. */
  cor?: string;
  /**
   * `cartao` é a faixa do modo par a par: números em cima, barra grossa, as
   * palavras "pior" e "melhor" embaixo. `compacta` serve a linha de lista, onde
   * não há três alturas de sobra: a palavra vai colada ao número e a barra
   * afina.
   */
  variante?: "cartao" | "compacta";
}) {
  const { t } = useIdioma();
  const unidade = criterio.unidade ? ` ${criterio.unidade}` : "";
  const pior = `${formatarValor(criterio.pior)}${unidade}`;
  const melhor = `${formatarValor(criterio.melhor)}${unidade}`;
  const compacta = variante === "compacta";

  const extremo = (valor: string, nivel: string) =>
    compacta ? t("elicitacao.faixa.extremo", { valor, nivel }) : valor;

  return (
    /* Span e não div: em `ListaArrastavel` a faixa entra como detalhe dentro de
       um `<span>`, e conteúdo de fluxo ali dentro é HTML inválido. */
    <span
      role="img"
      aria-label={t("elicitacao.faixa", { pior, melhor })}
      className="block"
    >
      <span
        className={`flex flex-wrap items-baseline justify-between gap-x-3 ${
          compacta ? "text-[11px]" : "mb-1.5 text-[11px]"
        }`}
      >
        <span className="num" style={{ color: "var(--tinta-fraca)" }}>
          {extremo(pior, t("estrutura.niveis.pior"))}
        </span>
        <span className="num" style={{ color: cor }}>
          {extremo(melhor, t("estrutura.niveis.melhor"))}
        </span>
      </span>

      <span
        className={`block w-full rounded-[3px] ${compacta ? "mt-1 h-1.5" : "h-2.5"}`}
        style={{ background: cor }}
      />

      {/* No cartão sobra altura para nomear as pontas embaixo, alinhadas à
          barra; na linha de lista essa terceira altura não existe, e por isso
          ali a palavra já veio colada ao número. */}
      {!compacta && (
        <span
          className="mt-1.5 flex justify-between text-[10px]"
          style={{ color: "var(--tinta-fraca)" }}
        >
          <span>{t("estrutura.niveis.pior")}</span>
          <span>{t("estrutura.niveis.melhor")}</span>
        </span>
      )}
    </span>
  );
}
