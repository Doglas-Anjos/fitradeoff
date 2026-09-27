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
 * Ele não é modal de propósito. Um `dialog` com foco preso obrigaria a fechar o
 * painel para voltar ao trabalho, e o ponto dele é justamente ficar aberto ao
 * lado do trabalho. É um `aside` nomeado: fecha por Esc e pelo X, e o fundo
 * continua clicável. Fechado, só uma pasta discreta permanece na tela.
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
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { BotaoFavorita } from "@/components/BotaoFavorita";
import { Entrada, Segmentado, Selo } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useIdioma, type Idioma } from "@/lib/i18n";
import "@/lib/i18n/paineis";
import {
  favoritasPrimeiro,
  PROBLEMATICA,
  resumir,
  type Traduz,
} from "@/lib/resumoDecisao";
import type { Problema, Problematica, Resumo } from "@/lib/types";

type Filtro = Problematica | "todos";
type Ordem = "recente" | "nome";

/**
 * O `Resumo` da API com as duas datas que o motor passou a devolver.
 *
 * `lib/types.ts` está fora do escopo desta mudança, então o tipo mora aqui até
 * o `Resumo` oficial ganhar os campos. As duas são opcionais porque decisão
 * salva antes da mudança volta do servidor sem elas - e sem data o painel não
 * pode inventar uma.
 */
type ResumoDatado = Resumo & {
  criado_em?: string | null;
  atualizado_em?: string | null;
};

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
const MINIMO = 240;
const MAXIMO = 560;
const PADRAO = 320;
/** Um toque de seta; com Shift anda quatro vezes mais, para atravessar a faixa
    inteira em poucas teclas. */
const PASSO = 16;
const CHAVE_LARGURA = "fitradeoff:salvas:largura";

function limitar(px: number): number {
  return Math.min(MAXIMO, Math.max(MINIMO, Math.round(px)));
}

function lerLargura(): number {
  try {
    const salvo = window.localStorage.getItem(CHAVE_LARGURA);
    const numero = salvo === null ? NaN : Number(salvo);
    if (Number.isFinite(numero)) return limitar(numero);
  } catch {
    /* sem armazenamento a tela funciona igual, só não lembra a largura */
  }
  return PADRAO;
}

function gravarLargura(px: number): void {
  try {
    window.localStorage.setItem(CHAVE_LARGURA, String(px));
  } catch {
    /* idem: perder a preferência é aceitável, quebrar o arrasto não é */
  }
}

/* --- quando a decisão mudou pela última vez ------------------------------------

   O locale importa duas vezes: na ordem alfabética (acento não é letra nova em
   português) e na data completa do `title`. */
const LOCALE: Record<Idioma, string> = { pt: "pt-BR", en: "en-US", es: "es-ES" };

/** Milissegundos, ou `null` quando a data falta ou não é uma data. */
function instante(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

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
  const [itens, setItens] = useState<ResumoDatado[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<Filtro>("todos");
  const [ordem, setOrdem] = useState<Ordem>("recente");
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [aberta, setAberta] = useState(false);
  const [largura, setLargura] = useState(PADRAO);
  const [arrastando, setArrastando] = useState(false);
  const [semMovimento, setSemMovimento] = useState(false);

  const botao = useRef<HTMLButtonElement>(null);
  const caixa = useRef<HTMLElement>(null);
  const abertaAnterior = useRef(false);
  const idPainel = useId();
  const locale = LOCALE[idioma] ?? LOCALE.pt;

  /* A largura guardada só entra depois da montagem: ler armazenamento durante a
     renderização faria o HTML do servidor divergir do cliente. */
  useEffect(() => {
    setLargura(lerLargura());
  }, []);

  /* Quem pediu menos movimento não recebe deslize nenhum - o painel aparece e
     some. A consulta fica no estado porque a decisão é de estilo inline, e
     media query não alcança estilo inline. */
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const aplicar = () => setSemMovimento(consulta.matches);
    aplicar();
    consulta.addEventListener?.("change", aplicar);
    return () => consulta.removeEventListener?.("change", aplicar);
  }, []);

  useEffect(() => {
    let vivo = true;
    api
      .listar()
      .then((r) => vivo && setItens(r.decisoes))
      .catch((e) => {
        if (!vivo) return;
        /* Lista vazia com o motivo à vista, nunca uma coluna em branco: a falha
           é da rede, e o resto da tela continua utilizável. */
        setItens([]);
        setErro(
          e instanceof ApiError ? e.message : t("paineis.erro.servidor"),
        );
      });
    return () => {
      vivo = false;
    };
  }, []);

  const fechar = useCallback(() => {
    setAberta(false);
  }, []);

  useEffect(() => {
    if (!aberta) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberta, fechar]);

  /* O foco entra no painel ao abrir e volta para o botão ao fechar: sem isso,
     quem navega por teclado abriria o painel e continuaria tabulando na página
     atrás dele. */
  useEffect(() => {
    const estavaAberta = abertaAnterior.current;
    abertaAnterior.current = aberta;
    if (aberta) caixa.current?.focus();
    else if (estavaAberta) botao.current?.focus();
  }, [aberta]);

  const ajustar = useCallback((px: number) => {
    const nova = limitar(px);
    setLargura(nova);
    gravarLargura(nova);
  }, []);

  /* Arrasto pela borda esquerda. O ponteiro fica capturado pela alça, então o
     gesto não se perde ao passar por cima de um botão da lista nem ao sair da
     janela, e não é preciso pendurar nada no documento. */
  const aoArrastar = (e: React.PointerEvent<HTMLDivElement>) => {
    const alca = e.currentTarget;
    e.preventDefault();
    alca.setPointerCapture?.(e.pointerId);
    setArrastando(true);
    const mover = (m: PointerEvent) => ajustar(window.innerWidth - m.clientX);
    const soltar = () => {
      setArrastando(false);
      alca.removeEventListener("pointermove", mover);
      alca.removeEventListener("pointerup", soltar);
      alca.removeEventListener("pointercancel", soltar);
    };
    alca.addEventListener("pointermove", mover);
    alca.addEventListener("pointerup", soltar);
    alca.addEventListener("pointercancel", soltar);
  };

  /* Arrastar é atalho, não o único caminho: a alça é focável e as setas fazem o
     mesmo trabalho. Seta esquerda alarga porque a alça é a borda esquerda do
     painel, e levá-la para a esquerda é literalmente o gesto do arrasto. */
  const aoTeclarAlca = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const passo = e.shiftKey ? PASSO * 4 : PASSO;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      ajustar(largura + passo);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      ajustar(largura - passo);
    } else if (e.key === "Home") {
      e.preventDefault();
      ajustar(MAXIMO);
    } else if (e.key === "End") {
      e.preventDefault();
      ajustar(MINIMO);
    }
  };

  const filtradas = useMemo(() => {
    if (!itens) return null;
    const termo = busca.trim().toLowerCase();
    const visiveis = itens.filter(
      (r) =>
        (tipo === "todos" || r.problematica === tipo) &&
        (termo === "" || r.nome.toLowerCase().includes(termo)),
    );
    const alfabetica = new Intl.Collator(locale, { sensitivity: "base" });
    return visiveis.sort((a, b) => {
      /* As favoritas sobem acima do critério escolhido, inclusive do alfabeto:
         quem marcou quer aquelas decisões no topo, não espalhadas pela lista
         conforme a inicial do nome. Empatadas, decide o critério de sempre. */
      const destaque = favoritasPrimeiro(a, b);
      if (destaque !== 0) return destaque;
      if (ordem === "nome") return alfabetica.compare(a.nome, b.nome);
      const ia = instante(a.atualizado_em);
      const ib = instante(b.atualizado_em);
      /* Sem data não se inventa posição: o item cai para o fim da lista, e
         entre os sem data vale a ordem que o servidor mandou. */
      if (ia === null && ib === null) return 0;
      if (ia === null) return 1;
      if (ib === null) return -1;
      return ib - ia;
    });
  }, [itens, busca, tipo, ordem, locale]);

  const alternarFavorita = async (id: string, favorita: boolean) => {
    /* A estrela troca antes da resposta do servidor: marcar é um gesto barato e
       repetido, e esperar o ida-e-volta para ela acender faria a lista parecer
       travada. Falhando o pedido, ela volta ao que era e o motivo aparece -- o
       que não pode acontecer é o painel afirmar um favorito que o servidor não
       tem. */
    const marcar = (valor: boolean) =>
      setItens(
        (atual) =>
          atual?.map((r) => (r.id === id ? { ...r, favorita: valor } : r)) ?? null,
      );

    setErro(null);
    marcar(favorita);
    try {
      await api.favoritar(id, favorita);
    } catch (e) {
      marcar(!favorita);
      setErro(e instanceof ApiError ? e.message : t("paineis.erro.favoritar"));
    }
  };

  const abrir = async (id: string) => {
    setAbrindo(id);
    setErro(null);
    try {
      const problema = await api.ver(id);
      onAbrir(problema);
      /* O painel cobre a decisão que o decisor acabou de pedir, então sai de
         cena depois de abrir - em qualquer largura de tela, agora que ele
         sempre sobrepõe. */
      fechar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : t("paineis.erro.abrir"));
    } finally {
      setAbrindo(null);
    }
  };

  const quantidade = itens?.length ?? null;
  const agora = Date.now();
  /* A largura efetiva é a escolhida presa ao teto de 90vw. */
  const larguraCss = `min(${largura}px, 90vw)`;
  /* Uma propriedade só, e é `transform`: animar `width` ou `left` mandaria o
     navegador refazer layout a cada quadro, e é justamente o reflow que não
     pode acontecer. 240ms com a curva de saída do projeto.

     Durante o arrasto a transição sai de cena: o botão acompanha a borda do
     painel, e com 240ms de suavização ele ficaria arrastado atrás do dedo. */
  const deslizar =
    semMovimento || arrastando ? "none" : "transform 240ms var(--saida)";

  return (
    <>
      <button
        ref={botao}
        type="button"
        onClick={() => setAberta(true)}
        aria-expanded={aberta}
        aria-controls={idPainel}
        inert={aberta}
        className="tatil fixed bottom-5 right-5 z-50 inline-flex h-12 w-12 items-center justify-center rounded-[var(--raio-controle)] border shadow-lg hover:-translate-y-1 hover:shadow-[var(--sombra-alta)]"
        style={{
          borderColor: "var(--accent)",
          background: "var(--accent)",
          color: "var(--accent-tinta)",
          opacity: aberta ? 0 : 1,
          transform: aberta
            ? "translateY(6px) scale(0.9)"
            : "translateY(0) scale(1)",
          pointerEvents: aberta ? "none" : "auto",
          transition: semMovimento
            ? "none"
            : "opacity 140ms ease, transform 180ms var(--saida)",
        }}
      >
        <FolderOpen size={20} weight="regular" aria-hidden />
        <span className="sr-only">{t("paineis.salvas.titulo")}</span>
      </button>

      <aside
        id={idPainel}
        ref={caixa}
        tabIndex={-1}
        aria-label={t("paineis.salvas.titulo")}
        /* Fechado ele continua montado - é o que permite deslizar - mas fora da
           tela. `inert` tira o conteúdo do caminho do teclado e do clique;
           `aria-hidden` repete a mesma informação para quem ainda não implementa
           `inert`. Sem isso o painel invisível receberia Tab e cliques que são
           da página. */
        aria-hidden={!aberta}
        inert={!aberta}
        className="fixed inset-y-0 right-0 z-40 flex flex-col border-l outline-none"
        style={{
          width: larguraCss,
          borderColor: "var(--borda)",
          background: "var(--painel)",
          boxShadow: "var(--sombra-alta)",
          transform: aberta ? "translateX(0)" : "translateX(100%)",
          transition: semMovimento ? "opacity 120ms linear" : deslizar,
          /* Sem deslize o painel aparece e some; a opacidade evita que ele
             pisque de um canto ao outro da tela. */
          opacity: semMovimento && !aberta ? 0 : 1,
          pointerEvents: aberta ? "auto" : "none",
        }}
      >
        {/* Alça de redimensionamento. Faixa estreita colada na borda esquerda,
            que se tinge de accent no foco e no hover - a única pista visual de
            que dá para arrastar precisa aparecer também para quem chegou pelo
            teclado. */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={t("paineis.salvas.largura.rotulo")}
          aria-valuenow={largura}
          aria-valuemin={MINIMO}
          aria-valuemax={MAXIMO}
          tabIndex={0}
          title={t("paineis.salvas.largura.rotulo")}
          onPointerDown={aoArrastar}
          onKeyDown={aoTeclarAlca}
          className="absolute inset-y-0 left-0 z-10 w-2 cursor-col-resize outline-none hover:bg-[var(--accent)] focus-visible:bg-[var(--accent)]"
          style={{ touchAction: "none" }}
        />

        <div className="flex items-baseline justify-between gap-3 bg-[var(--navy)] pb-4 pl-6 pr-5 pt-5">
          <div className="flex items-center gap-2">
            <h2
              className="text-[13px] font-semibold"
              style={{ color: "#ffffff" }}
            >
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

        {/* A lista ocupa a altura que sobra e rola por dentro: o painel vai de
            ponta a ponta da janela, então não há mais altura máxima arbitrária
            para inventar. */}
        <div
          className="min-h-0 flex-1 overflow-y-auto py-4 pl-6 pr-5"
          style={{ borderColor: "var(--borda)" }}
        >
          {itens === null ? (
            <p className="text-[12px]" style={{ color: "var(--tinta-3)" }}>
              {t("paineis.salvas.carregando")}
            </p>
          ) : itens.length === 0 ? (
            <>
              <p className="text-[12px]" style={{ color: "var(--tinta-2)" }}>
                {t("paineis.salvas.vazio")}
              </p>
              <p className="mt-1 text-[11px]" style={{ color: "var(--tinta-3)" }}>
                {t("paineis.salvas.vazio.ajuda")}
              </p>
            </>
          ) : filtradas!.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--tinta-3)" }}>
              {busca.trim()
                ? t("paineis.salvas.semNome")
                : t("paineis.salvas.semTipo")}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {filtradas!.map((r, i) => {
                const { chaveCurta, chaveLonga, Icone } =
                  PROBLEMATICA[r.problematica] ?? PROBLEMATICA.escolha;
                const estaAberta = r.id === idAtual;
                const estaAbrindo = abrindo === r.id;
                const mudou = instante(r.atualizado_em);
                return (
                  <li
                    key={r.id}
                    className="entra-em-lista"
                    /* A cascata para de crescer no nono item: com quarenta
                       decisões salvas o atraso acumulado passaria de um
                       segundo e a lista pareceria travada. */
                    style={{ "--ordem": Math.min(i, 8) } as React.CSSProperties}
                  >
                    {/* O realce do item saiu do botão para esta caixa: a
                        estrela é um segundo controle e não pode morar dentro do
                        primeiro -- botão dentro de botão não é HTML válido, e
                        todo clique nela viraria "abrir a decisão". Com o realce
                        aqui, ele continua cobrindo a linha inteira. */}
                    <div
                      className="flex items-start rounded-[var(--raio-controle)] border"
                      style={{
                        /* A aberta agora não é um item clicável a menos: é o
                           lugar onde o decisor está. Borda accent e rótulo,
                           não só um tom de fundo. */
                        borderColor: estaAberta
                          ? "var(--accent)"
                          : "transparent",
                        background: estaAberta
                          ? "var(--accent-suave)"
                          : "transparent",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => abrir(r.id)}
                        disabled={estaAberta || ocupado || abrindo !== null}
                        aria-current={estaAberta ? "true" : undefined}
                        className="tatil group flex min-w-0 flex-1 items-start gap-2 rounded-[var(--raio-controle)] p-2.5 text-left disabled:cursor-default"
                        style={{
                          cursor: estaAberta ? "default" : undefined,
                          opacity: !estaAberta && abrindo !== null ? 0.5 : 1,
                        }}
                      >
                        <Icone
                          size={15}
                          className="mt-0.5 shrink-0"
                          style={{
                            color: estaAberta
                              ? "var(--accent)"
                              : "var(--tinta-fraca)",
                          }}
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
                            <Selo
                              tom={estaAberta ? "accent" : "neutro"}
                              titulo={t(chaveLonga)}
                            >
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
                            {/* Sem `atualizado_em` o selo simplesmente não
                                aparece: "data desconhecida" ocuparia espaço para
                                dizer que não sabe. O `title` traz a data inteira
                                no formato do idioma, porque "há 3 dias" não serve
                                para anotar nem para comparar. */}
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
                      {/* Fora do botão de abrir, e viva mesmo na decisão que já
                          está na tela: marcar não depende de poder abrir. */}
                      <BotaoFavorita
                        nome={r.nome}
                        favorita={r.favorita ?? false}
                        onAlternar={(valor) => alternarFavorita(r.id, valor)}
                        tamanho={14}
                        className="mr-1 mt-1.5"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {erro && (
            <p
              role="alert"
              className="mt-2.5 text-[11px]"
              style={{ color: "var(--erro)" }}
            >
              {erro}
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
