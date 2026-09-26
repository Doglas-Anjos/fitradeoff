"use client";

/**
 * Os quatro objetivos, desenhados.
 *
 * O sistema de referência põe um diagrama ao lado de cada módulo, e por um bom
 * motivo: "classificar em faixas" e "ordenar todas" soam parecidos em texto e
 * são coisas completamente diferentes no resultado. A figura resolve em um
 * relance o que o parágrafo leva três linhas para explicar.
 *
 * São geométricos de propósito - círculos, linhas e uma elipse. Não são
 * ilustração: cada forma corresponde a uma parte do método, e um desenho bonito
 * que não corresponde a nada seria pior que nenhum.
 *
 * O texto do cartão continua dizendo tudo. Estes SVGs são `aria-hidden`, porque
 * repeti-los em palavras só faria o leitor de tela ouvir a mesma coisa duas
 * vezes.
 *
 * Cada um se move quando o cartão está em realce -- apontado pelo mouse ou
 * escolhido -- e o movimento carrega o que distingue aquele objetivo dos
 * outros, não um efeito de entrada qualquer:
 *
 *   escolha       as ligações se desenham e só então a vencedora aparece: a
 *                 recomendação vem das comparações, não antes delas
 *   ordenação     as alternativas entram de cima para baixo, em cascata: a
 *                 sequência é o resultado
 *   classificação as faixas surgem primeiro e as alternativas caem dentro: as
 *                 classes já existiam, quem as definiu foi o decisor
 *   carteira      elipse que se fecha (combinatorial) ou pontos que acendem em
 *                 ordem (por razão) -- as duas leituras, lado a lado
 *
 * Ordenar e classificar soam parecidos escritos e produzem coisas diferentes;
 * é exatamente aí que o movimento paga o seu custo. Isto só existe na tela de
 * criar decisão, e é visto uma vez por decisão. Numa ação repetida dezenas de
 * vezes por dia a resposta seria não animar nada.
 */

const TRACO = 1.6;

/**
 * O que todo diagrama recebe.
 *
 * `ativo` é a cor (este é o objetivo escolhido); `emRealce` é o movimento (o
 * cartão está apontado ou escolhido agora). São coisas diferentes: um cartão
 * escolhido continua colorido para sempre, mas só se move quando vira o foco.
 */
export interface Figura {
  ativo: boolean;
  emRealce?: boolean;
}

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 132 76"
      aria-hidden
      className="h-auto w-full"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** Uma alternativa se destaca das demais. */
export function DiagramaEscolha({ ativo, emRealce = false }: Figura) {
  const forte = ativo ? "var(--accent)" : "var(--tinta-3)";
  const fraco = ativo ? "var(--accent)" : "var(--tinta-fraca)";
  /* As comparadas ficam paradas: elas já estavam lá. O que se move é a
     comparação, e depois dela o resultado. */
  const comparadas = [26, 66, 106];
  return (
    <Moldura>
      {comparadas.map((x) => (
        <circle key={x} cx={x} cy="60" r="9" stroke={fraco} strokeWidth={TRACO} opacity={0.55} />
      ))}

      {/* As ligações vão da comparada para cima, e não o contrário: é nessa
          direção que o traço se desenha, e é a direção do argumento. */}
      {comparadas.map((x, i) => (
        <path
          key={`${emRealce}-${x}`}
          d={`M${x} 49 L66 30`}
          stroke={fraco}
          strokeWidth={TRACO}
          opacity={0.35}
          className={emRealce ? "traca" : undefined}
          style={
            {
              "--comprimento": Math.hypot(66 - x, 19),
              "--duracao": "340ms",
              "--ordem": i,
            } as React.CSSProperties
          }
        />
      ))}

      {/* a escolhida, cheia e acima -- por último, porque é o que se conclui */}
      <circle
        key={`vencedora-${emRealce}`}
        cx="66"
        cy="18"
        r="11"
        fill={forte}
        className={emRealce ? "surge-vencedora" : undefined}
      />
    </Moldura>
  );
}

/** Todas ficam em posições, da primeira à última. */
export function DiagramaRanking({ ativo, emRealce = false }: Figura) {
  const forte = ativo ? "var(--accent)" : "var(--tinta-3)";
  const fraco = ativo ? "var(--accent)" : "var(--tinta-fraca)";
  /* A posição vem escrita, não insinuada pelo tamanho da barra: "1, 2, 3" é o
     que distingue ordenar de classificar, e barra decrescente sozinha podia ser
     qualquer gráfico. */
  const linhas = [1, 2, 3, 4];
  return (
    <Moldura>
      {linhas.map((posicao, i) => {
        const y = 10 + i * 18;
        const primeira = i === 0;
        return (
          <g
            key={`${emRealce}-${posicao}`}
            className={emRealce ? "entra-da-esquerda" : undefined}
            style={{ "--ordem": i } as React.CSSProperties}
          >
            {/* o número da posição */}
            <text
              x="12"
              y={y + 9}
              fontSize="11"
              fontWeight={primeira ? 600 : 500}
              fill={primeira ? forte : fraco}
              opacity={primeira ? 1 : 0.7}
              fontFamily="var(--fonte-mono, monospace)"
            >
              {posicao}
            </text>
            {/* a alternativa naquela posição */}
            <rect
              x="26"
              y={y}
              width={92 - i * 18}
              height="13"
              rx="3"
              fill={primeira ? forte : fraco}
              opacity={primeira ? 0.9 : 0.35}
            />
          </g>
        );
      })}
    </Moldura>
  );
}

/** Cada alternativa cai numa faixa que você definiu. */
export function DiagramaSorting({ ativo, emRealce = false }: Figura) {
  const forte = ativo ? "var(--accent)" : "var(--tinta-3)";
  const fraco = ativo ? "var(--accent)" : "var(--tinta-fraca)";
  /* As faixas aparecem com nome e em tom decrescente: sem isso o desenho ficava
     igual a "três listas", e o que importa aqui é que existe uma ordem entre as
     faixas, e que quem a define é o decisor. */
  const faixas = [
    { rotulo: "A", itens: [58, 76], tom: 1 },
    { rotulo: "B", itens: [58, 76, 94], tom: 0.6 },
    { rotulo: "C", itens: [58], tom: 0.3 },
  ];
  return (
    <Moldura>
      {faixas.map(({ rotulo, itens, tom }, i) => {
        const y = 8 + i * 22;
        /* Quantas alternativas já caíram nas faixas de cima: a cascata dos
           pontos é contínua entre as faixas, e não recomeça em cada uma. */
        const jaCairam = faixas
          .slice(0, i)
          .reduce((soma, f) => soma + f.itens.length, 0);
        return (
          <g
            key={`${emRealce}-${rotulo}`}
            className={emRealce ? "surge-faixa" : undefined}
            style={{ "--ordem": i } as React.CSSProperties}
          >
            <text
              x="10"
              y={y + 13}
              fontSize="10"
              fontWeight="600"
              fill={i === 0 ? forte : fraco}
              opacity={i === 0 ? 1 : 0.7}
            >
              {rotulo}
            </text>
            <rect
              x="26"
              y={y}
              width="96"
              height="18"
              rx="4"
              stroke={fraco}
              strokeWidth={TRACO}
              opacity={0.3}
            />
            {itens.map((x, j) => (
              <circle
                key={x}
                cx={x}
                cy={y + 9}
                r="5"
                fill={i === 0 ? forte : fraco}
                opacity={tom}
                className={emRealce ? "cai-na-faixa" : undefined}
                style={{ "--ordem": jaCairam + j } as React.CSSProperties}
              />
            ))}
          </g>
        );
      })}
    </Moldura>
  );
}

/**
 * Um subconjunto é escolhido; o resto fica de fora.
 *
 * `modo` diz qual das duas leituras está em foco -- a apontada pelo mouse, ou a
 * escolhida. As duas chegam ao mesmo lugar (um conjunto dentro de um teto), e o
 * que as separa é como se chega lá: a combinatorial avalia conjuntos inteiros,
 * a por razão desce uma lista ordenada. A figura é a mesma; o movimento é que
 * conta a diferença, e é por isso que ele existe.
 */
export function DiagramaCarteira({
  ativo,
  modo = null,
}: {
  ativo: boolean;
  modo?: "portfolio" | "beneficio_custo" | null;
}) {
  const forte = ativo || modo ? "var(--accent)" : "var(--tinta-3)";
  const fraco = ativo || modo ? "var(--accent)" : "var(--tinta-fraca)";

  /* Dentro da elipse: o conjunto levado. Na leitura por razão eles acendem
     nesta ordem, que é a da melhor razão para a pior. */
  const dentro = [
    [48, 30],
    [66, 26],
    [82, 33],
    [55, 45],
    [74, 45],
  ];
  const fora = [
    [16, 16],
    [38, 12],
    [70, 10],
    [104, 15],
    [14, 38],
    [118, 30],
    [20, 60],
    [44, 66],
    [92, 64],
    [116, 54],
  ];

  /* Perímetro da elipse pela aproximação de Ramanujan, para o traço cobrir a
     volta exata: rx=36, ry=20 dão ~179,5. */
  const PERIMETRO = 180;

  const classeDoPonto =
    modo === "beneficio_custo"
      ? "surge-ponto"
      : modo === "portfolio"
        ? "surge-conjunto"
        : undefined;

  return (
    <Moldura>
      {fora.map(([cx, cy]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r="4"
          stroke={fraco}
          strokeWidth={TRACO}
          opacity={0.45}
        />
      ))}

      {/* A chave carrega o modo: trocar de região remonta o elemento, e é o que
          faz a animação recomeçar em vez de ficar parada no estado final. */}
      <ellipse
        key={`elipse-${modo}`}
        cx="66"
        cy="37"
        rx="36"
        ry="20"
        stroke={forte}
        strokeWidth={TRACO}
        className={modo === "portfolio" ? "traca" : undefined}
        style={{ "--comprimento": PERIMETRO } as React.CSSProperties}
      />

      {dentro.map(([cx, cy], i) => (
        <circle
          key={`${modo}-${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r="4"
          fill={forte}
          className={classeDoPonto}
          style={{ "--ordem": i } as React.CSSProperties}
        />
      ))}
    </Moldura>
  );
}

export const DIAGRAMAS = {
  escolha: DiagramaEscolha,
  ranking: DiagramaRanking,
  sorting: DiagramaSorting,
  portfolio: DiagramaCarteira,
  /* Mesmo desenho da carteira: as duas leituras terminam num conjunto sob um
     teto de orcamento, e inventar uma figura diferente sugeriria uma diferenca
     que nao esta ali - a diferenca e o criterio de ordenacao. */
  beneficio_custo: DiagramaCarteira,
} as const;
