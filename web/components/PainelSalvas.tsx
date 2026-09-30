"use client";

/**
 * Trocar de decisão sem abandonar a que está aberta.
 *
 * As decisões salvas já apareciam na tela de entrada, mas só lá: depois de
 * abrir uma, o caminho para outra era "Outra decisão" -> voltar ao começo ->
 * procurar na lista. Quem compara dois problemas parecidos (o mesmo edital com
 * dois orçamentos, a mesma compra com dois conjuntos de critérios) fazia essa
 * volta dezenas de vezes.
 *
 * O painel era coluna da grade em tela larga e gaveta abaixo disso. Dois
 * comportamentos para a mesma coisa, e o da tela larga tinha um preço alto:
 * abrir e fechar mudava a largura da coluna de trabalho, então a pergunta de
 * tradeoff - com dois cartões lado a lado e barras proporcionais - refluía e
 * mudava de forma embaixo dos olhos de quem estava respondendo. Comparar duas
 * situações enquanto elas mudam de tamanho não é comparar.
 *
 * Agora é um painel só, colado na borda direita da janela em qualquer largura,
 * que entra e sai deslizando na horizontal e **sobrepõe** o conteúdo. A página
 * por baixo não sabe que ele existe: nada nela reflui quando ele abre.
 *
 * Este arquivo só compõe. O comportamento de gaveta (foco, Esc, deslize,
 * `inert`) mora em `components/gaveta/Gaveta`; a largura arrastável e lembrada,
 * em `lib/useLarguraRedimensionavel`; a lista, o filtro, a ordem e a estrela,
 * em `lib/useDecisoesSalvas`. Estavam as três coisas no mesmo componente, e
 * mexer numa exigia ler as outras duas.
 *
 * Os rótulos por problemática, o resumo curto e a regra de ordem das favoritas
 * vêm de `lib/resumoDecisao`, os mesmos que `DecisoesSalvas` usa. Eram duas
 * cópias, e as cópias já divergiam. A estrela, pelo mesmo motivo, é
 * `components/BotaoFavorita`.
 */

import {
  CaretRight,
  Check,
  FolderOpen,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import { useState } from "react";

import { BotaoFavorita } from "@/components/BotaoFavorita";
import { Gaveta, useGaveta } from "@/components/gaveta/Gaveta";
import { Entrada, Segmentado, Selo, tecladoDeRadio } from "@/components/ui";
import { useIdioma, type Idioma } from "@/lib/i18n";
import "@/lib/i18n/paineis";
import { PROBLEMATICA, resumir, type Traduz } from "@/lib/resumoDecisao";
import type { Problema } from "@/lib/types";
import {
  instante,
  useDecisoesSalvas,
  type Filtro,
  type Ordem,
  type ResumoDatado,
} from "@/lib/useDecisoesSalvas";
import {
  useLarguraRedimensionavel,
  VARIAVEL_LARGURA,
} from "@/lib/useLarguraRedimensionavel";

/** A ordem dos chips. "todos" tem rótulo próprio; o resto usa o nome curto da
    problemática, o mesmo do selo de cada item. */
const FILTROS: { valor: Filtro; chave: string }[] = [
  { valor: "todos", chave: "paineis.salvas.filtro.todos" },
  { valor: "escolha", chave: PROBLEMATICA.escolha.chaveCurta },
  { valor: "ranking", chave: PROBLEMATICA.ranking.chaveCurta },
  { valor: "sorting", chave: PROBLEMATICA.sorting.chaveCurta },
  { valor: "portfolio", chave: PROBLEMATICA.portfolio.chaveCurta },
];

/* --- largura do painel ---------------------------------------------------------

   Abaixo de 240px o nome da decisão e o selo da problemática não caberiam na
   mesma linha; acima de 560px o painel deixa de ser painel e vira a tela. O
   teto de 90vw fica no CSS, e não no número guardado: assim ele continua valendo
   quando a janela encolhe depois, sem depender de nenhum evento de resize. */
const LARGURA = { min: 240, max: 560, padrao: 320 } as const;
const CHAVE_LARGURA = "fitradeoff:salvas:largura";

/* --- quando a decisão mudou pela última vez ------------------------------------

   O locale importa duas vezes: na ordem alfabética (acento não é letra nova em
   português) e na data completa do `title`. */
const LOCALE: Record<Idioma, string> = { pt: "pt-BR", en: "en-US", es: "es-ES" };

/**
 * "há 5 min", "ontem", "há 3 dias".
 *
 * Relativo enquanto relativo ajuda. Passado um mês, "há 47 dias" não diz nada a
 * ninguém: aí entra a data mesmo, formatada pelo locale, que é o que a pessoa
 * usaria para se localizar.
 */
function relativo(ms: number, agora: number, locale: string, t: Traduz): string {
  /* Relógio do servidor adiantado devolveria segundos negativos e um "há -2
     min"; o piso em zero transforma isso no honesto "agora mesmo". */
  const segundos = Math.max(0, Math.round((agora - ms) / 1000));
  if (segundos < 60) return t("paineis.salvas.quando.agora");
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return t("paineis.salvas.quando.min", { n: minutos });
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return t("paineis.salvas.quando.hora", { n: horas });
  const dias = Math.floor(horas / 24);
  if (dias === 1) return t("paineis.salvas.quando.ontem");
  if (dias < 30) return t("paineis.salvas.quando.dias", { n: dias });
  return new Intl.DateTimeFormat(locale, { dateStyle: "short" }).format(ms);
}

function completa(ms: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(ms);
}

export function PainelSalvas({
  onAbrir,
  idAtual,
  ocupado = false,
}: {
  onAbrir: (problema: Problema) => void;
  /** Decisão aberta agora: aparece marcada e não se reabre sozinha. */
  idAtual?: string | null;
  ocupado?: boolean;
}) {
  const { t, idioma } = useIdioma();
  const locale = LOCALE[idioma] ?? LOCALE.pt;
  const [aberta, setAberta] = useState(false);
  const decisoes = useDecisoesSalvas({ locale });
  const { arrastando, painelProps, alcaProps } =
    useLarguraRedimensionavel(CHAVE_LARGURA, LARGURA);

  const mudar = (abrir: boolean) => {
    /* A lista é pedida na primeira abertura, e não na montagem: fechado, o
       painel é só um botão no canto. */
    if (abrir) decisoes.carregar();
    setAberta(abrir);
  };

  const quantidade = decisoes.itens?.length ?? null;

  return (
    <Gaveta.Raiz aberta={aberta} onMudar={mudar}>
      <Gaveta.Gatilho
        className="botao tatil fixed z-50 inline-flex h-12 w-12 items-center justify-center rounded-[var(--raio-controle)] border shadow-lg"
        /* Fundo e borda vem da classe `.botao[data-variante]`, para que o
           hover mude a cor. As demais propriedades dependem do estado de
           abertura, que classe nenhuma conhece, e ficam com a gaveta. */
        data-variante="principal"
        style={{
          /* Longe da barra de gestos e dos cantos arredondados do celular: sem
             o recuo da área segura o botão ficava embaixo do indicador de
             início, e o toque ia para o sistema. */
          bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
          right: "calc(1.25rem + env(safe-area-inset-right, 0px))",
        }}
      >
        <FolderOpen size={20} weight="regular" aria-hidden />
        <span className="sr-only">{t("paineis.salvas.titulo")}</span>
      </Gaveta.Gatilho>

      <Gaveta.Painel
        rotulo={t("paineis.salvas.titulo")}
        /* A largura efetiva é a escolhida presa ao teto de 90vw. Ela vem da
           variável CSS, que o arrasto move sem renderizar o painel. */
        largura={`min(var(${VARIAVEL_LARGURA}), 90vw)`}
        arrastando={arrastando}
        ref={painelProps.ref}
        style={painelProps.style}
      >
        <Gaveta.Alca rotulo={t("paineis.salvas.largura.rotulo")} {...alcaProps} />

        <Cabecalho quantidade={quantidade} />
        <Filtros decisoes={decisoes} />

        {/* A lista ocupa a altura que sobra e rola por dentro: o painel vai de
            ponta a ponta da janela, então não há mais altura máxima arbitrária
            para inventar. `overscroll-contain` segura a rolagem aqui dentro --
            chegar ao fim da lista não pode começar a rolar a página por trás. */}
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pl-6 pr-5 pt-4"
          style={{
            borderColor: "var(--borda)",
            paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
          }}
        >
          <Lista
            decisoes={decisoes}
            idAtual={idAtual}
            ocupado={ocupado}
            locale={locale}
            onAbrir={onAbrir}
          />

          {decisoes.erro && (
            <p
              role="alert"
              className="mt-2.5 text-[11px]"
              style={{ color: "var(--erro)" }}
            >
              {decisoes.erro}
            </p>
          )}
        </div>
      </Gaveta.Painel>
    </Gaveta.Raiz>
  );
}

type Decisoes = ReturnType<typeof useDecisoesSalvas>;

function Cabecalho({ quantidade }: { quantidade: number | null }) {
  const { t } = useIdioma();
  const { fechar } = useGaveta();
  return (
    <div className="superficie-navy flex items-baseline justify-between gap-3 bg-[var(--navy)] pb-4 pl-6 pr-5 pt-5">
      <div className="flex items-center gap-2">
        <h2 className="text-[13px] font-semibold" style={{ color: "#ffffff" }}>
          {t("paineis.salvas.titulo")}
        </h2>
        {quantidade !== null && quantidade > 0 && <Selo>{quantidade}</Selo>}
      </div>
      <button
        type="button"
        onClick={fechar}
        aria-label={t("paineis.salvas.fechar")}
        className="tatil -mr-1 rounded-[var(--raio-controle)] p-1"
        style={{ color: "#c6d7ea" }}
      >
        <X size={16} weight="bold" aria-hidden />
      </button>
    </div>
  );
}

function Filtros({ decisoes }: { decisoes: Decisoes }) {
  const { t } = useIdioma();
  const { busca, setBusca, tipo, setTipo, ordem, setOrdem } = decisoes;
  const tecladoFiltro = tecladoDeRadio(
    FILTROS.map((f) => f.valor),
    tipo,
    setTipo,
  );

  return (
    <div className="border-b border-[var(--borda)] bg-[var(--painel-fundo)] pb-4 pl-6 pr-5 pt-4">
      <div className="relative">
        <MagnifyingGlass
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--tinta-fraca)" }}
          aria-hidden
        />
        <Entrada
          type="search"
          /* Sem `name` nem `id`, o navegador não sabe tratar o campo e o
             DevTools reclama. O rótulo acessível já existe; o nome é para
             a plataforma, e é o único campo da tela que estava sem. */
          name="busca-decisao"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={t("paineis.salvas.buscar.dica")}
          aria-label={t("paineis.salvas.buscar.rotulo")}
          className="!pl-9 !text-[13px]"
        />
      </div>

      {/* Duas opções curtas, então o Segmentado cabe e já traz o contraste
          certo: o escolhido leva o preenchimento cheio do accent. */}
      <div className="mt-2.5">
        <p className="mb-1.5 text-[11px] font-medium" style={{ color: "var(--tinta-3)" }}>
          {t("paineis.salvas.ordem.rotulo")}
        </p>
        <Segmentado<Ordem>
          etiqueta={t("paineis.salvas.ordem.rotulo")}
          valor={ordem}
          onEscolher={setOrdem}
          opcoes={[
            {
              valor: "recente",
              rotulo: t("paineis.salvas.ordem.recente"),
              descricao: t("paineis.salvas.ordem.recente.ajuda"),
            },
            {
              valor: "nome",
              rotulo: t("paineis.salvas.ordem.nome"),
              descricao: t("paineis.salvas.ordem.nome.ajuda"),
            },
          ]}
        />
      </div>

      {/* Chips que quebram em linha, em vez do Segmentado: cinco opções
          lado a lado não caberiam no painel na largura mínima. */}
      <p className="mt-3 text-[11px] font-medium" style={{ color: "var(--tinta-3)" }}>
        {t("paineis.salvas.filtro.rotulo")}
      </p>
      <div
        role="radiogroup"
        aria-label={t("paineis.salvas.filtro.rotulo")}
        {...tecladoFiltro.grupo}
        className="mt-1.5 flex flex-wrap gap-1.5"
      >
        {FILTROS.map(({ valor, chave }) => {
          const ativo = valor === tipo;
          return (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={ativo}
              {...tecladoFiltro.item(valor)}
              onClick={() => setTipo(valor)}
              className="tatil inline-flex items-center gap-1 rounded-[var(--raio-controle)] border px-2 py-1 text-[11px]"
              style={{
                /* O escolhido leva o preenchimento cheio do accent e um
                   visto: fundo levemente tingido não chega a 3:1 e
                   desaparece para quem não separa bem as cores. */
                background: ativo ? "var(--accent)" : "transparent",
                borderColor: ativo ? "var(--accent)" : "var(--borda-forte)",
                color: ativo ? "var(--accent-tinta)" : "var(--tinta-3)",
                fontWeight: ativo ? 500 : 400,
              }}
            >
              {ativo && <Check size={10} weight="bold" aria-hidden />}
              {t(chave)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Lista({
  decisoes,
  idAtual,
  ocupado,
  locale,
  onAbrir,
}: {
  decisoes: Decisoes;
  idAtual?: string | null;
  ocupado: boolean;
  locale: string;
  onAbrir: (problema: Problema) => void;
}) {
  const { t } = useIdioma();
  const { fechar } = useGaveta();
  const { itens, filtradas, busca, abrindo } = decisoes;

  const abrir = async (id: string) => {
    /* O painel cobre a decisão que o decisor acabou de pedir, então sai de
       cena depois de abrir - em qualquer largura de tela, agora que ele
       sempre sobrepõe. */
    if (await decisoes.abrir(id, onAbrir)) fechar();
  };

  if (itens === null) {
    return (
      <p className="text-[12px]" style={{ color: "var(--tinta-3)" }}>
        {t("paineis.salvas.carregando")}
      </p>
    );
  }
  if (itens.length === 0) {
    return (
      <>
        <p className="text-[12px]" style={{ color: "var(--tinta-2)" }}>
          {t("paineis.salvas.vazio")}
        </p>
        <p className="mt-1 text-[11px]" style={{ color: "var(--tinta-3)" }}>
          {t("paineis.salvas.vazio.ajuda")}
        </p>
      </>
    );
  }
  if (!filtradas || filtradas.length === 0) {
    return (
      <p className="text-[12px]" style={{ color: "var(--tinta-3)" }}>
        {busca.trim() ? t("paineis.salvas.semNome") : t("paineis.salvas.semTipo")}
      </p>
    );
  }

  const agora = Date.now();
  return (
    <ul className="space-y-1.5">
      {filtradas.map((r, i) => (
        <Item
          key={r.id}
          resumo={r}
          ordem={i}
          agora={agora}
          locale={locale}
          estaAberta={r.id === idAtual}
          estaAbrindo={abrindo === r.id}
          outraAbrindo={abrindo !== null}
          ocupado={ocupado}
          onAbrir={() => abrir(r.id)}
          onFavoritar={(valor) => decisoes.alternarFavorita(r.id, valor)}
        />
      ))}
    </ul>
  );
}

function Item({
  resumo: r,
  ordem,
  agora,
  locale,
  estaAberta,
  estaAbrindo,
  outraAbrindo,
  ocupado,
  onAbrir,
  onFavoritar,
}: {
  resumo: ResumoDatado;
  ordem: number;
  agora: number;
  locale: string;
  estaAberta: boolean;
  estaAbrindo: boolean;
  /** Alguma decisão (esta ou outra) está sendo aberta. */
  outraAbrindo: boolean;
  ocupado: boolean;
  onAbrir: () => void;
  onFavoritar: (valor: boolean) => void;
}) {
  const { t } = useIdioma();
  const { chaveCurta, chaveLonga, Icone } =
    PROBLEMATICA[r.problematica] ?? PROBLEMATICA.escolha;
  const mudou = instante(r.atualizado_em);

  return (
    <li
      className="entra-em-lista"
      /* A cascata para de crescer no nono item: com quarenta decisões salvas
         o atraso acumulado passaria de um segundo e a lista pareceria
         travada. */
      style={{ "--ordem": Math.min(ordem, 8) } as React.CSSProperties}
    >
      {/* O realce do item saiu do botão para esta caixa: a estrela é um
          segundo controle e não pode morar dentro do primeiro -- botão dentro
          de botão não é HTML válido, e todo clique nela viraria "abrir a
          decisão". Com o realce aqui, ele continua cobrindo a linha inteira. */}
      <div
        className="flex items-start rounded-[var(--raio-controle)] border"
        style={{
          /* A aberta agora não é um item clicável a menos: é o lugar onde o
             decisor está. Borda accent e rótulo, não só um tom de fundo. */
          borderColor: estaAberta ? "var(--accent)" : "transparent",
          background: estaAberta ? "var(--accent-suave)" : "transparent",
        }}
      >
        <button
          type="button"
          onClick={onAbrir}
          disabled={estaAberta || ocupado || outraAbrindo}
          aria-current={estaAberta ? "true" : undefined}
          className="tatil group flex min-w-0 flex-1 items-start gap-2 rounded-[var(--raio-controle)] p-2.5 text-left disabled:cursor-default"
          style={{
            cursor: estaAberta ? "default" : undefined,
            opacity: !estaAberta && outraAbrindo ? 0.5 : 1,
          }}
        >
          <Icone
            size={15}
            className="mt-0.5 shrink-0"
            style={{ color: estaAberta ? "var(--accent)" : "var(--tinta-fraca)" }}
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span
                className="min-w-0 flex-1 truncate text-[13px] font-medium"
                style={{ color: "var(--tinta)" }}
              >
                {r.nome}
              </span>
              <Selo tom={estaAberta ? "accent" : "neutro"} titulo={t(chaveLonga)}>
                {t(chaveCurta)}
              </Selo>
            </span>
            <span className="mt-0.5 flex items-center gap-1.5">
              <span
                className="min-w-0 flex-1 text-[11px]"
                style={{ color: "var(--tinta-3)" }}
              >
                {resumir(r, t)}
              </span>
              {/* Sem `atualizado_em` o selo simplesmente não aparece: "data
                  desconhecida" ocuparia espaço para dizer que não sabe. O
                  `title` traz a data inteira no formato do idioma, porque "há 3
                  dias" não serve para anotar nem para comparar. */}
              {mudou !== null && (
                <Selo titulo={completa(mudou, locale)}>
                  {relativo(mudou, agora, locale, t)}
                </Selo>
              )}
            </span>
            {estaAberta && (
              <span
                className="mt-0.5 block text-[11px] font-medium"
                style={{ color: "var(--accent)" }}
              >
                {t("paineis.salvas.abertaAgora")}
              </span>
            )}
          </span>
          {!estaAberta && (
            <span
              className="mt-0.5 shrink-0 text-[11px]"
              style={{ color: "var(--tinta-fraca)" }}
            >
              {estaAbrindo ? (
                t("paineis.salvas.abrindo")
              ) : (
                <CaretRight
                  size={12}
                  weight="bold"
                  className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                  aria-hidden
                />
              )}
            </span>
          )}
        </button>
        {/* Fora do botão de abrir, e viva mesmo na decisão que já está na
            tela: marcar não depende de poder abrir. */}
        <BotaoFavorita
          nome={r.nome}
          favorita={r.favorita ?? false}
          onAlternar={onFavoritar}
          tamanho={14}
          className="mr-1 mt-1.5"
        />
      </div>
    </li>
  );
}
