"use client";

/**
 * As peças que a visão geral e as cinco telas de módulo dividem.
 *
 * Moram aqui, e não em `components/`, porque só a área de paridade as usa: a
 * tabela conhece o formato de `CasoParidade`, e a moldura de captura conhece o
 * par oficial/nosso. Promovê-las a componente geral daria a entender que servem
 * a outra tela, e a primeira pessoa que tentasse reusá-las descobriria que não.
 */

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { Selo } from "@/components/ui";

import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/paridade";
import type { CasoParidade } from "@/lib/paridade";

/**
 * Destaque dentro de uma frase do catálogo.
 *
 * O texto vem por chave, numa língua de cada vez, e às vezes uma palavra
 * carrega a frase inteira -- nesta área, "quando parar de perguntar" é a ideia
 * que o resto do parágrafo existe para sustentar. Marcar isso com `**` no
 * catálogo é natural para quem escreve, e o defeito é igualmente natural:
 * `t()` devolve texto simples, e os asteriscos foram para a tela.
 *
 * A alternativa seria partir a frase em três chaves -- antes, termo, depois --
 * como outra área do projeto faz. Em três idiomas isso são nove entradas para
 * uma ênfase, e cada tradução passa a ter de acertar onde a frase se parte.
 * Aqui o tradutor move os asteriscos junto com a palavra.
 */
export function Realce({ texto }: { texto: string }) {
  return (
    <>
      {texto.split("**").map((parte, i) =>
        /* Os ímpares são o que estava entre marcas. Se alguém deixar uma marca
           sem par, o resto da frase sai sem destaque -- feio, e visível, que é
           melhor do que sumir com o texto. */
        i % 2 ? <strong key={i}>{parte}</strong> : <span key={i}>{parte}</span>,
      )}
    </>
  );
}

export function Secao({
  id,
  titulo,
  children,
}: {
  /** Ancora do sumario lateral. `scroll-mt` compensa o cabecalho fixo, que
      senao cobriria o titulo de quem chega pelo link. */
  id: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="cartao-secao scroll-mt-24"
    >
      <h2
        className="mb-4 text-xl font-semibold tracking-tight"
        style={{ color: "var(--tinta)" }}
      >
        {titulo}
      </h2>
      {children}
    </section>
  );
}

/** Sumario da pagina, nas duas formas que o espaco permite.
 *
 * Fixo na lateral quando ha largura, e recolhido num `details` quando nao ha.
 * Nao e o mesmo conteudo duas vezes por descuido: um sumario lateral em tela
 * estreita empurraria o texto para uma coluna inutilizavel, e esconder o
 * sumario no celular deixaria a pagina mais longa sem nenhuma forma de pular. */
/**
 * Qual seção está sendo lida agora.
 *
 * Um sumário que só lista não faz metade do trabalho: numa página longa, a
 * pergunta de quem olha para o lado é "onde eu estou", e não "o que existe".
 * Sem isso ele é um menu de âncoras, e a pessoa perde o lugar assim que rola.
 *
 * `IntersectionObserver` com a margem recortando os 45% de baixo: a seção ativa
 * passa a ser a que está mais alta na tela, e não a maior. Sem esse recorte,
 * uma seção comprida continuaria marcada enquanto a próxima já ocupa metade da
 * janela.
 */
function useSecaoAtiva(ids: readonly string[]): string | null {
  const [ativa, setAtiva] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    /* Nem todo ambiente tem `IntersectionObserver` -- jsdom não tem, e foi
       assim que isto derrubou a página inteira em teste. Sem ele o sumário
       continua sendo um índice de âncoras funcional; só não acompanha a
       rolagem. Degradar é melhor do que quebrar. */
    if (typeof IntersectionObserver === "undefined") return;

    const alvos = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (!alvos.length) return;

    const visiveis = new Set<string>();
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) visiveis.add(entrada.target.id);
          else visiveis.delete(entrada.target.id);
        }
        /* A primeira da ordem do documento entre as visíveis. Usar a última
           faria o destaque pular para a frente quando duas seções curtas
           coubessem juntas na tela. */
        const primeira = ids.find((id) => visiveis.has(id));
        if (primeira) setAtiva(primeira);
      },
      { rootMargin: "-88px 0px -45% 0px", threshold: 0 },
    );
    for (const alvo of alvos) observador.observe(alvo);
    return () => observador.disconnect();
  }, [ids]);

  return ativa;
}

export function Sumario({
  secoes,
  variante,
}: {
  secoes: readonly (readonly [string, string])[];
  variante: "lateral" | "compacto";
}) {
  const { t } = useIdioma();
  const lateral = variante === "lateral";
  const ids = useMemo(() => secoes.map(([id]) => id), [secoes]);
  const ativa = useSecaoAtiva(ids);

  const itens = secoes.map(([id, chave], i) => (
    <a
      key={id}
      href={`#${id}`}
      data-ativa={lateral && id === ativa}
      aria-current={lateral && id === ativa ? "true" : undefined}
      className={
        lateral
          ? "item-sumario tatil flex gap-2.5 py-1.5 pl-4 pr-2 text-[13px] leading-snug"
          : "tatil rounded-[var(--raio-controle)] px-2 py-1.5 text-[13px]"
      }
      style={lateral ? undefined : { color: "var(--tinta-2)" }}
    >
      {/* O número dá ao sumário a leitura de índice, e não de lista de links.
          Também serve de âncora visual quando dois títulos começam igual. */}
      {lateral && (
        <span aria-hidden className="num-sumario num shrink-0 text-[11px]">
          {String(i + 1).padStart(2, "0")}
        </span>
      )}
      <span>{t(chave)}</span>
    </a>
  ));

  if (!lateral) {
    return (
      <details
        className="mt-6 rounded-[var(--raio-controle)] border p-4 lg:hidden"
        style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
      >
        <summary className="cursor-pointer text-sm font-semibold">
          {t("paridade.sumario")}
        </summary>
        <nav className="mt-3 grid gap-1" aria-label={t("paridade.sumario.compacto")}>
          {itens}
        </nav>
      </details>
    );
  }

  return (
    <aside className="superficie sticky top-24 hidden p-4 lg:block">
      <p
        className="mb-3 px-4 text-[11px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "var(--tinta-fraca)" }}
      >
        {t("paridade.sumario")}
      </p>
      {/* O fio contínuo à esquerda é a régua do índice; o item ativo engrossa o
          seu pedaço dela. Sem o fio, o marcador ativo flutuaria sozinho. */}
      <nav
        className="trilho-sumario grid"
        aria-label={t("paridade.sumario.lateral")}
      >
        {itens}
      </nav>
    </aside>
  );
}

/** Um bloco com título e corpo, do jeito que as listas de achados usam. */
export function Ponto({ titulo, corpo }: { titulo: string; corpo: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold" style={{ color: "var(--tinta)" }}>
        {titulo}
      </h3>
      <p className="prosa-editorial mt-1.5 text-sm" style={{ color: "var(--tinta-2)" }}>
        {corpo}
      </p>
    </div>
  );
}

/** Um par de capturas, a nossa ao lado da dele. */
/**
 * Quão perto do centro da janela este elemento está, de 0 a 1.
 *
 * 1 quando o centro dele coincide com o centro da tela; 0 quando está a meia
 * janela de distância ou mais. É o que permite "a figura que está sendo olhada
 * ganha destaque" sem inventar qual é: a que está no meio da tela é a que a
 * pessoa está olhando.
 *
 * Amarrado à rolagem, e não ao tempo: quem controla o ritmo é quem lê, e uma
 * animação por temporizador seguiria correndo enquanto a pessoa está parada.
 * Medido dentro de `requestAnimationFrame` para não recalcular geometria a cada
 * evento de rolagem, que é o jeito clássico de travar uma página.
 */
function useProximidadeDoCentro(alvo: React.RefObject<HTMLElement | null>): number {
  const [perto, setPerto] = useState(1);

  useEffect(() => {
    const el = alvo.current;
    if (!el) return;

    let pendente = false;
    const medir = () => {
      pendente = false;
      const r = el.getBoundingClientRect();
      const janela = window.innerHeight;
      const linha = janela / 2;
      /* Foco cheio quando a linha central da tela cai dentro da figura, e não
         quando os dois centros coincidem. Estas capturas são mais altas que a
         janela: pela distância entre centros, uma imagem que ocupa a tela
         inteira ficaria marcada como "longe" só porque a metade dela está
         fora. O que importa é se a pessoa está olhando para ela. */
      const distancia =
        linha < r.top ? r.top - linha : linha > r.bottom ? linha - r.bottom : 0;
      setPerto(Math.max(0, 1 - distancia / (janela * 0.5)));
    };
    const aoRolar = () => {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(medir);
    };

    medir();
    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", aoRolar);
    return () => {
      window.removeEventListener("scroll", aoRolar);
      window.removeEventListener("resize", aoRolar);
    };
  }, [alvo]);

  return perto;
}

/** A pessoa pediu para o sistema não animar? */
function usaMovimentoReduzido(): boolean {
  const [reduzido, setReduzido] = useState(false);
  useEffect(() => {
    /* Nem todo ambiente tem `matchMedia` -- jsdom não tem, e sem esta guarda o
       componente derruba a página inteira em teste. Na dúvida assume que pode
       animar, que é o caminho em que a informação aparece igual: o recuo é
       ênfase, não conteúdo. */
    if (typeof window.matchMedia !== "function") return;
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduzido(consulta.matches);
    const aoMudar = () => setReduzido(consulta.matches);
    consulta.addEventListener("change", aoMudar);
    return () => consulta.removeEventListener("change", aoMudar);
  }, []);
  return reduzido;
}

/** Uma captura, com ênfase conforme a rolagem a traz para o meio da tela. */
function Captura({
  src,
  rotulo,
  titulo,
  reduzido,
}: {
  src: string;
  rotulo: string;
  titulo: string;
  reduzido: boolean;
}) {
  const quadro = useRef<HTMLElement>(null);
  const perto = useProximidadeDoCentro(quadro);
  const foco = reduzido ? 1 : perto;
  const emFoco = foco > 0.6;

  return (
    <figure ref={quadro} className="min-w-0">
      <figcaption
        className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: emFoco ? "var(--accent)" : "var(--tinta-fraca)" }}
      >
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: emFoco ? "var(--accent)" : "var(--borda-forte)" }}
        />
        {rotulo}
      </figcaption>
      <div
        className="overflow-hidden rounded-[var(--raio-painel)] border"
        style={{
          borderColor: emFoco ? "var(--accent)" : "var(--borda)",
          background: "var(--painel)",
          boxShadow: emFoco ? "var(--sombra-alta)" : "none",
          opacity: 0.4 + 0.6 * foco,
          filter: `saturate(${0.5 + 0.5 * foco})`,
          transform: `scale(${0.985 + 0.015 * foco})`,
          transition:
            "border-color 260ms ease, box-shadow 260ms ease, opacity 90ms linear, filter 90ms linear, transform 90ms linear",
        }}
      >
        {/* `unoptimized`: são capturas estáticas versionadas, não conteúdo
            variável — passar pelo otimizador só adiciona uma peça. */}
        <Image
          src={src}
          alt={`${titulo} — ${rotulo}`}
          width={1280}
          height={800}
          unoptimized
          className="h-auto w-full"
        />
      </div>
    </figure>
  );
}

/**
 * Duas capturas da mesma tela, uma de cada sistema, comparadas na rolagem.
 *
 * Elas ficavam lado a lado, com o mesmo peso, e isso não funcionava por dois
 * motivos. Um: comparar exige olhar uma de cada vez, e duas imagens iguais em
 * destaque fazem o olho pular entre elas sem parar em nenhuma. Dois: metade da
 * largura numa captura de tela inteira deixa a letra pequena demais para se
 * ler o que está escrito — e ler o que está escrito é a única razão de elas
 * estarem aqui.
 *
 * Agora são empilhadas, cada uma na largura toda, e a ênfase acompanha a
 * rolagem: a que está no meio da tela é a que está sendo olhada, e ganha cor,
 * borda e sombra; a outra recua. É o gesto de virar uma folha sobre a outra,
 * que é o que se faria com as duas impressas na mesa.
 *
 * Empilhar também é o que faz a troca de ênfase ter sentido. Lado a lado, "role
 * e o destaque passa para a outra" não descreve movimento nenhum: as duas estão
 * na mesma altura, e a rolagem as trata igual.
 *
 * Com `prefers-reduced-motion` as duas ficam em foco o tempo todo. O recuo é
 * ênfase, não conteúdo: quem não vê o movimento continua vendo as duas imagens
 * inteiras, com as legendas.
 */
export function ParDeTelas({
  titulo,
  nota,
  oficial,
  nosso,
}: {
  titulo: string;
  nota: string;
  oficial: string;
  nosso: string;
}) {
  const { t } = useIdioma();
  const reduzido = usaMovimentoReduzido();

  return (
    <div className="mt-10">
      <h3 className="text-base font-semibold" style={{ color: "var(--tinta)" }}>
        {titulo}
      </h3>
      <p className="prosa-editorial mt-1.5 text-sm" style={{ color: "var(--tinta-3)" }}>
        {nota}
      </p>
      <div className="mt-5 grid gap-7">
        <Captura
          src={oficial}
          rotulo={t("paridade.telas.oficialLegenda")}
          titulo={titulo}
          reduzido={reduzido}
        />
        <Captura
          src={nosso}
          rotulo={t("paridade.telas.nossoLegenda")}
          titulo={titulo}
          reduzido={reduzido}
        />
      </div>
    </div>
  );
}

function Passos({ par }: { par: { ordenacao: number; tradeoff: number } | null }) {
  const { t } = useIdioma();
  if (!par) {
    return (
      <span className="text-[12px]" style={{ color: "var(--aviso)" }}>
        {t("paridade.tabela.trava")}
      </span>
    );
  }
  return (
    <span className="num text-[13px]" style={{ color: "var(--tinta-2)" }}>
      {par.ordenacao} / {par.tradeoff}
    </span>
  );
}

function Linha({ caso }: { caso: CasoParidade }) {
  const { t } = useIdioma();
  const naoCompleta = caso.oficial === null;
  return (
    <tr style={{ borderTop: "1px solid var(--borda)" }}>
      <td className="py-2.5 pr-4">
        <span className="text-[13px]" style={{ color: "var(--tinta)" }}>
          {caso.chave}
        </span>
      </td>
      <td className="py-2.5 pr-4">
        <span className="num text-[12px]" style={{ color: "var(--tinta-fraca)" }}>
          {caso.alternativas} × {caso.criterios}
        </span>
      </td>
      <td className="py-2.5 pr-4">
        <Passos par={caso.oficial} />
      </td>
      <td className="py-2.5 pr-4">
        <Passos par={caso.nosso} />
      </td>
      <td className="py-2.5 text-right">
        <Selo tom={naoCompleta ? "neutro" : caso.bate ? "accent" : "aviso"}>
          {/* Um travessao nao diz nada em leitor de tela: sai como "traco" ou
              como silencio, e a celula do veredicto fica sem veredicto. */}
          {naoCompleta ? (
            <>
              <span aria-hidden>—</span>
              <span className="sr-only">{t("paridade.tabela.naoComparavel")}</span>
            </>
          ) : caso.bate ? (
            t("paridade.tabela.bate")
          ) : (
            t("paridade.tabela.difere")
          )}
        </Selo>
      </td>
    </tr>
  );
}

export function TabelaCasos({ casos }: { casos: CasoParidade[] }) {
  const { t } = useIdioma();
  return (
    <>
      <p className="mb-3 text-[12px]" style={{ color: "var(--tinta-fraca)" }}>
        {t("paridade.tabela.legenda")}
      </p>
      <div
        className="overflow-x-auto rounded-[var(--raio-painel)] border px-5"
        style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
      >
        <table className="w-full">
          <thead>
            <tr>
              {[
                "paridade.tabela.caso",
                "paridade.tabela.tamanho",
                "paridade.tabela.oficial",
                "paridade.tabela.nosso",
              ].map((chave) => (
                <th
                  key={chave}
                  className="py-3 pr-4 text-left text-[11px] font-medium uppercase tracking-wide"
                  style={{ color: "var(--tinta-3)" }}
                >
                  {t(chave)}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {casos.map((caso) => (
              <Linha key={caso.chave} caso={caso} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
