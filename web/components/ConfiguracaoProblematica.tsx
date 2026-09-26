"use client";

/**
 * O que cada problematica exige alem dos dados.
 *
 * O sistema de referencia escolhe a problematica numa tela, cadastra o problema
 * na seguinte e so entao pede o que aquele objetivo exige. E o que este painel
 * faz: ele mora na etapa "ajustes", depois da estrutura e dos desempenhos.
 *
 * Antes disto, `sorting` e `portfolio` apareciam como opcao e falhavam na
 * criacao: o motor recusa uma sem perfis e a outra sem orcamento. Oferecer uma
 * opcao que nao se consegue completar e pior do que nao oferece-la.
 */

import { Dica, Entrada, Segmentado } from "@/components/ui";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/entrada";
/* Pelo cabeçalho da coluna de custo da matriz de consequências: a frase daqui
   manda voltar àquela coluna, então tem de chamá-la pelo nome que ela tem. */
import "@/lib/i18n/estrutura";
import { ehCarteira, SORTING_PADRAO, numeroDe, validarSorting } from "@/lib/rascunho";
import type { ConfigSorting } from "@/lib/rascunho";
import type { Problematica } from "@/lib/types";

/* O formato e as regras das faixas vivem com o resto do rascunho, que e quem
   as serializa e valida. Reexportados aqui porque e deste painel que a tela
   fala -- duas definicoes do mesmo contrato divergiriam. */
export { SORTING_PADRAO, numeroDe, validarSorting };
export type { ConfigSorting };

/* --- faixas ------------------------------------------------------------------ */

/* As faixas sao ordenadas, da pior para a melhor: isso pede uma escala
   sequencial de um matiz so, clareando para o pior e escurecendo para o melhor.
   Cores categoricas diferentes sugeririam categorias sem ordem entre si. */
function tomDaFaixa(indice: number, total: number): string {
  const passo = total <= 1 ? 1 : 0.3 + (0.7 * indice) / (total - 1);
  return `color-mix(in oklab, var(--dado-a) ${Math.round(passo * 100)}%, var(--painel))`;
}

function Regua({ cortes, total }: { cortes: number[]; total: number }) {
  const validos = cortes.filter((c) => Number.isFinite(c) && c > 0 && c < 1);
  const limites = [0, ...validos, 1];

  return (
    <div
      className="flex h-2.5 w-full overflow-hidden rounded-[3px]"
      style={{ background: "var(--dado-trilho)" }}
      aria-hidden
    >
      {limites.slice(0, -1).map((inicio, i) => (
        <div
          key={i}
          style={{
            width: `${(limites[i + 1] - inicio) * 100}%`,
            background: tomDaFaixa(i, total),
          }}
        />
      ))}
    </div>
  );
}

/** O que a pessoa lê como limite inferior da faixa `i`. */
function limiteInferior(
  cortes: string[],
  i: number,
  t: (chave: string) => string,
): string {
  if (i === 0) return t("entrada.faixas.zero");
  const anterior = cortes[i - 1]?.trim();
  /* Traço enquanto o corte anterior está vazio: não é texto, é a ausência de um
     número, e se lê igual nos dois idiomas. */
  return anterior || "-";
}

function PainelSorting({
  valor,
  onChange,
}: {
  valor: ConfigSorting;
  onChange: (v: ConfigSorting) => void;
}) {
  const { t } = useIdioma();
  const { classes, cortes } = valor;

  const definirQuantidade = (quantas: number) => {
    const novasClasses = Array.from(
      { length: quantas },
      (_, i) => classes[i] ?? t("entrada.faixas.padrao", { n: i + 1 }),
    );
    // cortes igualmente espacados quando nao houver um valor anterior
    const novosCortes = Array.from(
      { length: quantas - 1 },
      (_, i) => cortes[i] ?? ((i + 1) / quantas).toFixed(2).replace(".", ","),
    );
    onChange({ classes: novasClasses, cortes: novosCortes });
  };

  return (
    <div className="space-y-4">
      {/* A escala explicada depois dos campos chegava tarde: os cortes já vêm
          preenchidos, e 0,35 se lê como "35% de alguma coisa". */}
      <p className="prosa text-[13px]" style={{ color: "var(--tinta-2)" }}>
        {t("entrada.faixas.escala.antes")}{" "}
        <strong>{t("entrada.termo.valorGlobal")}</strong>
        {t("entrada.faixas.escala.depois")}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[13px]" style={{ color: "var(--tinta-2)" }}>
          {t("entrada.faixas.quantas")}
        </span>
        <Segmentado
          etiqueta={t("entrada.faixas.quantidade")}
          valor={String(classes.length)}
          onEscolher={(n) => definirQuantidade(Number(n))}
          className="num"
          opcoes={[2, 3, 4, 5].map((n) => ({
            valor: String(n),
            rotulo: String(n),
            descricao: t("entrada.faixas.opcao", { n }),
          }))}
        />
      </div>

      <Regua cortes={cortes.map(numeroDe)} total={classes.length} />

      <div className="space-y-2">
        {classes.map((nome, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
              style={{ background: tomDaFaixa(i, classes.length) }}
            />
            <Entrada
              value={nome}
              onChange={(e) => {
                const copia = [...classes];
                copia[i] = e.target.value;
                onChange({ ...valor, classes: copia });
              }}
              aria-label={t("entrada.faixas.nome", { n: i + 1 })}
              placeholder={t("entrada.faixas.padrao", { n: i + 1 })}
              className="!w-40 !py-1.5 !text-[13px]"
            />
            <span className="flex items-center gap-2 text-[12px]"
              style={{ color: "var(--tinta-fraca)" }}>
              <span>{t("entrada.faixas.de")}</span>
              <span className="num" style={{ color: "var(--tinta-3)" }}>
                {limiteInferior(cortes, i, t)}
              </span>
              <span>{t("entrada.faixas.ate")}</span>
              {i < cortes.length ? (
                <Entrada
                  value={cortes[i]}
                  onChange={(e) => {
                    const copia = [...cortes];
                    copia[i] = e.target.value;
                    onChange({ ...valor, cortes: copia });
                  }}
                  inputMode="decimal"
                  aria-label={t("entrada.faixas.corte", {
                    a: i + 1,
                    b: i + 2,
                  })}
                  className="num !w-20 !py-1.5 text-right !text-[13px]"
                />
              ) : (
                /* o topo da escala não se digita: fechá-lo aqui é o que faz a
                   última faixa deixar de parecer inacabada */
                <span className="num" style={{ color: "var(--tinta-3)" }}>
                  {t("entrada.faixas.um")}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --- carteira ---------------------------------------------------------------- */

function PainelPortfolio({
  orcamento,
  onChange,
  totalDosCustos,
  porPlanilha,
}: {
  orcamento: string;
  onChange: (v: string) => void;
  totalDosCustos: number | null;
  porPlanilha: boolean;
}) {
  const { t, idioma } = useIdioma();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px]" style={{ color: "var(--tinta-2)" }}>
          {t("entrada.orcamento.rotulo")}
        </span>
        <Entrada
          value={orcamento}
          data-campo="orcamento"
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          placeholder="100"
          aria-label={t("entrada.orcamento.rotulo")}
          className="num !w-32 !py-1.5 text-right !text-[13px]"
        />
      </div>

      {totalDosCustos != null && totalDosCustos > 0 && (
        <p className="text-[12px]" style={{ color: "var(--tinta-3)" }}>
          {t("entrada.orcamento.total.antes")}{" "}
          <span className="num" style={{ color: "var(--tinta-2)" }}>
            {totalDosCustos.toLocaleString(idioma === "pt" ? "pt-BR" : "en-US")}
          </span>
          {t("entrada.orcamento.total.depois")}
        </p>
      )}

      <p className="prosa text-[12px]" style={{ color: "var(--tinta-3)" }}>
        {porPlanilha ? (
          <>
            {t("entrada.orcamento.custos.planilha.antes")}{" "}
            {/* O nome da linha não se traduz: é o rótulo que o leitor de
                planilha procura, em qualquer idioma da interface. */}
            <strong>custo do projeto</strong>{" "}
            {t("entrada.orcamento.custos.planilha.depois")}
          </>
        ) : (
          <>
            {t("entrada.orcamento.custos.matriz.antes")}{" "}
            {/* A mesma chave que a matriz de consequências usa no cabeçalho
                daquela coluna. Com uma chave só para a frase e outra para a
                coluna, o inglês mandava voltar a uma coluna com outro nome. */}
            <strong>{t("estrutura.matriz.coluna.custo")}</strong>{" "}
            {t("entrada.orcamento.custos.matriz.depois")}
          </>
        )}
      </p>
    </div>
  );
}

/* --- painel ------------------------------------------------------------------ */

/* As dicas moram aqui, junto do que elas explicam, mas sao renderizadas ao lado
   do titulo do passo: o painel nao repete o titulo que a tela ja deu. */

export function DicaSorting() {
  const { t } = useIdioma();
  return (
    <Dica titulo={t("entrada.faixas.dica.titulo")}>
      <p>{t("entrada.faixas.dica.diferenca")}</p>
      <p>{t("entrada.faixas.dica.suas")}</p>
    </Dica>
  );
}

export function DicaPortfolio() {
  const { t } = useIdioma();
  return (
    <Dica titulo={t("entrada.orcamento.dica.titulo")}>
      <p>
        {t("entrada.orcamento.dica.antes")}{" "}
        <strong>{t("entrada.termo.conjunto")}</strong>{" "}
        {t("entrada.orcamento.dica.depois")}
      </p>
      <p style={{ color: "var(--tinta-3)" }}>
        {t("entrada.orcamento.dica.aproximado")}
      </p>
    </Dica>
  );
}

export function ConfiguracaoProblematica({
  problematica,
  sorting,
  onSorting,
  orcamento,
  onOrcamento,
  totalDosCustos,
  porPlanilha = false,
}: {
  problematica: Problematica;
  sorting: ConfigSorting;
  onSorting: (v: ConfigSorting) => void;
  orcamento: string;
  onOrcamento: (v: string) => void;
  totalDosCustos: number | null;
  porPlanilha?: boolean;
}) {
  if (problematica !== "sorting" && !ehCarteira(problematica)) return null;

  /* Superficie neutra. A borda em accent com fundo accent-suave e a linguagem de
     "selecionado" no resto do produto -- aqui nao ha nada selecionado, e o
     painel destacava o conteudo normal do passo contra si mesmo. */
  return (
    <div
      className="rounded-[var(--raio-painel)] border p-4"
      style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
    >
      {problematica === "sorting" ? (
        <PainelSorting valor={sorting} onChange={onSorting} />
      ) : (
        <PainelPortfolio
          orcamento={orcamento}
          onChange={onOrcamento}
          totalDosCustos={totalDosCustos}
          porPlanilha={porPlanilha}
        />
      )}
    </div>
  );
}
