"use client";

/**
 * As peças que a visão geral e as cinco telas de módulo dividem.
 *
 * Moram aqui, e não em `components/`, porque só a área de paridade as usa: a
 * tabela conhece o formato de `CasoParidade`, e a moldura de captura conhece o
 * par oficial/nosso. Promovê-las a componente geral daria a entender que servem
 * a outra tela, e a primeira pessoa que tentasse reusá-las descobriria que não.
 */

import { Pause, Play } from "@phosphor-icons/react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { Selo } from "@/components/ui";

import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/paridade";
import { useMovimentoReduzido } from "@/lib/movimento";
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
 *
 * A regra é: a última seção cujo topo já passou de uma linha a 30% da altura da
 * janela. Não é a mais visível, nem a primeira visível -- e a diferença
 * importa. A primeira versão disto usava `IntersectionObserver` e escolhia a
 * primeira seção visível, e com isso o **último item nunca acendia**: no fim da
 * página as duas últimas seções estão na tela ao mesmo tempo, e a de cima
 * sempre ganhava. Rolar até o fim deixava o sumário marcando a penúltima.
 *
 * O fim da página é caso à parte, e por isso tem regra própria: uma seção curta
 * no rodapé pode nunca alcançar a linha de leitura, porque a rolagem acaba
 * antes. Chegando ao fim, a última vence por definição -- é o que a pessoa está
 * vendo.
 */
function useSecaoAtiva(ids: readonly string[]): string | null {
  const [ativa, setAtiva] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    if (!ids.length) return;

    let pendente = false;
    const medir = () => {
      pendente = false;
      const linha = window.innerHeight * 0.3;

      /* Encostou no fim: a última manda, tenha ela alcançado a linha ou não. */
      const fim =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 24;
      if (fim) {
        setAtiva(ids[ids.length - 1]);
        return;
      }

      let escolhida = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= linha) escolhida = id;
      }
      setAtiva(escolhida);
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

/**
 * Um bloco com título e corpo, do jeito que as listas de achados usam.
 *
 * O subtítulo ganhou peso e um traço de entrada. Antes era meio ponto maior que
 * o corpo e colado nele: numa sequência de quatro ou cinco blocos seguidos a
 * página lia como um texto corrido comprido, e não como quatro assuntos. O
 * traço à esquerda é o que separa sem gastar uma linha em branco grande — e é o
 * mesmo gesto da sobrelinha dos cabeçalhos, que já é o vocabulário daqui.
 */
export function Ponto({ titulo, corpo }: { titulo: string; corpo: string }) {
  return (
    <div className="ponto-artigo">
      <h3 className="text-[17px] font-semibold tracking-tight" style={{ color: "var(--tinta)" }}>
        {titulo}
      </h3>
      <p className="prosa-editorial mt-2 text-[15px]" style={{ color: "var(--tinta-2)" }}>
        {corpo}
      </p>
    </div>
  );
}

/** Um par de capturas, a nossa ao lado da dele. */
const INTERVALO = 5200;

/**
 * Duas capturas da mesma tela, uma de cada sistema, no mesmo lugar.
 *
 * Passaram por duas formas antes desta, e ambas falhavam pelo mesmo motivo de
 * fundo: comparar é olhar uma, depois a outra, **no mesmo ponto da tela**.
 *
 * Lado a lado, o olho pula entre as duas sem fixar em nenhuma, e cada uma fica
 * com metade da largura -- a letra da captura some, que é a única coisa que
 * interessa ali. Empilhadas, a largura se resolve e aparece outro problema:
 * para confrontar um detalhe é preciso rolar de uma para a outra e guardar de
 * memória o que estava na primeira.
 *
 * Aqui as duas ocupam a mesma célula da grade e uma troca pela outra, com abas
 * numeradas por cima. O detalhe fica na mesma coordenada nas duas, então a
 * diferença aparece sozinha -- é o gesto de pôr uma folha sobre a outra contra
 * a luz.
 *
 * A alternância corre sozinha porque a maioria só passa o olho e não clicaria
 * em nada. Mas movimento que começa sem ser pedido precisa ter parada à mão:
 * há botão de pausa, ela para sozinha com o ponteiro ou o teclado dentro do
 * quadro, e não começa quando o sistema pede menos movimento.
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
  const reduzido = useMovimentoReduzido();
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [dentro, setDentro] = useState(false);

  const telas = useMemo(
    () => [
      { rotulo: t("paridade.telas.oficialLegenda"), src: oficial },
      { rotulo: t("paridade.telas.nossoLegenda"), src: nosso },
    ],
    [t, oficial, nosso],
  );

  const correndo = !pausado && !dentro && !reduzido;

  useEffect(() => {
    if (!correndo) return;
    const relogio = setInterval(
      () => setAtual((i) => (i + 1) % telas.length),
      INTERVALO,
    );
    return () => clearInterval(relogio);
  }, [correndo, telas.length]);

  return (
    <div className="mt-10">
      <h3 className="text-base font-semibold" style={{ color: "var(--tinta)" }}>
        {titulo}
      </h3>
      <p className="prosa-editorial mt-1.5 text-sm" style={{ color: "var(--tinta-3)" }}>
        {nota}
      </p>

      <div
        className="comparador mt-4 overflow-hidden rounded-[var(--raio-painel)] border"
        onMouseEnter={() => setDentro(true)}
        onMouseLeave={() => setDentro(false)}
        onFocusCapture={() => setDentro(true)}
        onBlurCapture={() => setDentro(false)}
      >
        <div className="comparador-barra flex items-center gap-1 border-b px-2 py-2">
          <div
            role="tablist"
            aria-label={t("paridade.telas.alternar")}
            className="flex gap-1"
          >
            {telas.map((tela, i) => (
              <button
                key={tela.src}
                role="tab"
                aria-selected={i === atual}
                onClick={() => setAtual(i)}
                data-ativa={i === atual}
                className="aba-comparador tatil flex items-center gap-2 rounded-[var(--raio-controle)] px-3 py-1.5 text-[12px] font-medium"
              >
                <span aria-hidden className="num text-[11px] opacity-70">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {tela.rotulo}
              </button>
            ))}
          </div>

          {/* A parada fica à mão, e não escondida: movimento que ninguém pediu
              precisa poder ser interrompido por quem não consegue ler junto com
              ele. Some quando o sistema já pede menos movimento, porque aí não
              há nada correndo para parar. */}
          {!reduzido && (
            <button
              onClick={() => setPausado((x) => !x)}
              aria-label={t(
                pausado ? "paridade.telas.retomar" : "paridade.telas.pausar",
              )}
              className="botao-pausa tatil ml-auto inline-flex h-7 w-7 items-center justify-center rounded-[var(--raio-controle)]"
            >
              {pausado ? (
                <Play size={12} weight="fill" aria-hidden />
              ) : (
                <Pause size={12} weight="fill" aria-hidden />
              )}
            </button>
          )}
        </div>

        {/* Grade de uma célula só: as duas capturas ocupam o mesmo espaço e a
            altura do quadro é a da maior. Posicionamento absoluto daria o mesmo
            empilhamento e obrigaria a fixar a altura na mão. */}
        <div className="grid">
          {telas.map((tela, i) => {
            const ativa = i === atual;
            return (
              <figure
                key={tela.src}
                role="tabpanel"
                aria-hidden={!ativa}
                style={{
                  gridArea: "1 / 1",
                  opacity: ativa ? 1 : 0,
                  transform: reduzido
                    ? "none"
                    : `translateX(${ativa ? 0 : i < atual ? -2.5 : 2.5}%)`,
                  visibility: ativa ? "visible" : "hidden",
                  transition: reduzido
                    ? "none"
                    : "opacity 420ms ease, transform 420ms ease, visibility 420ms",
                }}
              >
                {/* `unoptimized`: são capturas estáticas versionadas, não
                    conteúdo variável — o otimizador só adicionaria uma peça. */}
                <Image
                  src={tela.src}
                  alt={`${titulo} — ${tela.rotulo}`}
                  width={1280}
                  height={800}
                  unoptimized
                  className="h-auto w-full"
                />
              </figure>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Uma contagem. A nossa sai em cor de aviso quando difere da do oficial —
 *  a diferença tem de saltar aos olhos, e não depender de comparar de cabeça. */
function Contagem({ valor, difere }: { valor: number | null; difere?: boolean }) {
  const { t } = useIdioma();
  if (valor === null) {
    return (
      <span className="text-[12px]" style={{ color: "var(--aviso)" }}>
        {t("paridade.tabela.trava")}
      </span>
    );
  }
  return (
    <span
      className="num text-[13px]"
      style={{
        color: difere ? "var(--aviso)" : "var(--tinta-2)",
        fontWeight: difere ? 600 : 400,
      }}
    >
      {valor}
      {difere && <span className="sr-only"> ({t("paridade.tabela.difere")})</span>}
    </span>
  );
}

function Linha({ caso }: { caso: CasoParidade }) {
  const { t } = useIdioma();
  const naoCompleta = caso.oficial === null;
  const o = caso.oficial;
  const celula = "py-3 pr-4 align-top";
  return (
    <tr style={{ borderTop: "1px solid var(--borda)" }}>
      <td className={`${celula} min-w-[16rem]`}>
        <span className="num block text-[12px]" style={{ color: "var(--tinta)" }}>
          {caso.chave}
        </span>
        <span className="mt-0.5 block text-[12px] leading-snug" style={{ color: "var(--tinta-fraca)" }}>
          {caso.descricao}
        </span>
      </td>
      <td className={celula}>
        <Contagem valor={o ? o.ordenacao : null} />
      </td>
      <td className={celula}>
        <Contagem valor={caso.nosso.ordenacao} difere={!!o && o.ordenacao !== caso.nosso.ordenacao} />
      </td>
      <td className={celula} style={{ borderLeft: "1px solid var(--borda)", paddingLeft: "1rem" }}>
        {o ? <Contagem valor={o.tradeoff} /> : <span aria-hidden>—</span>}
      </td>
      <td className={celula}>
        <Contagem valor={caso.nosso.tradeoff} difere={!!o && o.tradeoff !== caso.nosso.tradeoff} />
      </td>
      <td className={`${celula} text-right`}>
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

function Fase({ titulo, oficial, nosso }: { titulo: string; oficial: number | null; nosso: number }) {
  const { t } = useIdioma();
  return (
    <div>
      <p className="text-[11px] leading-tight" style={{ color: "var(--tinta-3)" }}>
        {titulo}
      </p>
      <p className="mt-1 text-[12px]" style={{ color: "var(--tinta-fraca)" }}>
        {t("paridade.tabela.oficial")} <Contagem valor={oficial} /> · {t("paridade.tabela.nosso")}{" "}
        <Contagem valor={nosso} difere={oficial !== null && oficial !== nosso} />
      </p>
    </div>
  );
}

function CartaoCaso({ caso }: { caso: CasoParidade }) {
  const { t } = useIdioma();
  const naoCompleta = caso.oficial === null;
  return (
    <li
      className="rounded-[var(--raio-painel)] border px-4 py-3"
      style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="num text-[12px]" style={{ color: "var(--tinta)" }}>
          {caso.chave}
        </span>
        <Selo tom={naoCompleta ? "neutro" : caso.bate ? "accent" : "aviso"}>
          {naoCompleta
            ? t("paridade.tabela.naoComparavel")
            : caso.bate
              ? t("paridade.tabela.bate")
              : t("paridade.tabela.difere")}
        </Selo>
      </div>
      <p className="mt-0.5 text-[12px] leading-snug" style={{ color: "var(--tinta-fraca)" }}>
        {caso.descricao}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Fase
          titulo={t("paridade.tabela.ordenar")}
          oficial={caso.oficial ? caso.oficial.ordenacao : null}
          nosso={caso.nosso.ordenacao}
        />
        <Fase
          titulo={t("paridade.tabela.tradeoff")}
          oficial={caso.oficial ? caso.oficial.tradeoff : null}
          nosso={caso.nosso.tradeoff}
        />
      </div>
    </li>
  );
}

export function TabelaCasos({ casos }: { casos: CasoParidade[] }) {
  const { t } = useIdioma();
  const cabeca = "pb-2 pr-4 text-left text-[11px] font-medium uppercase tracking-wide";
  return (
    <>
      <p className="prosa-editorial mb-3 text-[13px]" style={{ color: "var(--tinta-2)" }}>
        {t("paridade.tabela.explica")}
      </p>
      {/* Na tela estreita a tabela de seis colunas escondia os numeros atras
          de uma rolagem lateral: cada caso vira um cartao, com as duas fases
          lado a lado. */}
      <ul className="space-y-2 sm:hidden">
        {casos.map((caso) => (
          <CartaoCaso key={caso.chave} caso={caso} />
        ))}
      </ul>
      <div
        className="hidden overflow-x-auto rounded-[var(--raio-painel)] border px-5 sm:block"
        style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
      >
        <table className="w-full">
          <thead>
            <tr>
              <th rowSpan={2} className={`${cabeca} pt-3 align-bottom`} style={{ color: "var(--tinta-3)" }}>
                {t("paridade.tabela.caso")}
              </th>
              <th colSpan={2} className={`${cabeca} pt-3`} style={{ color: "var(--tinta-3)" }}>
                {t("paridade.tabela.ordenar")}
              </th>
              <th
                colSpan={2}
                className={`${cabeca} pt-3`}
                style={{ color: "var(--tinta-3)", borderLeft: "1px solid var(--borda)", paddingLeft: "1rem" }}
              >
                {t("paridade.tabela.tradeoff")}
              </th>
              <th rowSpan={2} className={`${cabeca} pt-3 text-right align-bottom`} style={{ color: "var(--tinta-3)" }}>
                {t("paridade.tabela.resultado")}
              </th>
            </tr>
            <tr>
              {(["oficial", "nosso", "oficial", "nosso"] as const).map((lado, i) => (
                <th
                  key={i}
                  className="pb-3 pr-4 text-left text-[11px] font-normal"
                  style={{
                    color: "var(--tinta-fraca)",
                    ...(i === 2 ? { borderLeft: "1px solid var(--borda)", paddingLeft: "1rem" } : {}),
                  }}
                >
                  {t(`paridade.tabela.${lado}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {casos.map((caso) => (
              <Linha key={caso.chave} caso={caso} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12px]" style={{ color: "var(--tinta-fraca)" }}>
        {t("paridade.tabela.legenda")}
      </p>
    </>
  );
}

/** O que cada lado concluiu, caso a caso: a contagem diz se os dois fizeram o
 *  mesmo caminho; isto diz se chegaram ao mesmo lugar. */
export function Desfechos({ casos }: { casos: CasoParidade[] }) {
  const { t } = useIdioma();
  return (
    <ol className="space-y-3">
      {casos.map((caso) => {
        const d = caso.desfecho;
        const tom = d.bate === null ? "neutro" : d.bate ? "accent" : "aviso";
        const veredito =
          d.bate === null
            ? t("paridade.desfecho.semOficial")
            : d.bate
              ? t("paridade.desfecho.bate")
              : t("paridade.desfecho.difere");
        return (
          <li
            key={caso.chave}
            className="rounded-[var(--raio-painel)] border px-4 py-3"
            style={{ borderColor: "var(--borda)", background: "var(--painel)" }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="num text-[12px] font-medium" style={{ color: "var(--tinta)" }}>
                {caso.chave}
              </span>
              <Selo tom={tom}>{veredito}</Selo>
            </div>
            <p className="mt-0.5 text-[12px] leading-snug" style={{ color: "var(--tinta-fraca)" }}>
              {caso.descricao}
            </p>
            <dl className="mt-2 grid gap-1.5 text-[13px] sm:grid-cols-[9rem_1fr]">
              <dt style={{ color: "var(--tinta-3)" }}>{t("paridade.desfecho.oficial")}</dt>
              <dd className="prosa-editorial" style={{ color: "var(--tinta-2)" }}>
                {d.oficial ?? (
                  <span style={{ color: "var(--tinta-fraca)" }}>{t("paridade.desfecho.naoCapturado")}</span>
                )}
              </dd>
              <dt style={{ color: "var(--tinta-3)" }}>{t("paridade.desfecho.nosso")}</dt>
              <dd className="prosa-editorial" style={{ color: "var(--tinta-2)" }}>
                {d.nosso}
              </dd>
              {caso.porque && (
                <>
                  <dt style={{ color: "var(--aviso)" }}>{t("paridade.desfecho.porque")}</dt>
                  <dd className="prosa-editorial" style={{ color: "var(--tinta-2)" }}>
                    {caso.porque}
                  </dd>
                </>
              )}
            </dl>
          </li>
        );
      })}
    </ol>
  );
}
