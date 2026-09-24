import Link from "next/link";

/**
 * A home abre com o que o metodo faz, nao com o que ele e.
 *
 * O elemento memoravel e a demonstracao a direita: quatro alternativas, e o
 * conjunto encolhendo a cada resposta ate sobrar uma. E o conceito inteiro do
 * FITradeoff numa figura, e e a unica coisa nesta pagina que chama atencao --
 * o resto fica quieto de proposito.
 */

const PASSOS = [
  { restantes: 4, legenda: "no começo, quatro candidatos" },
  { restantes: 3, legenda: "você compara duas situações" },
  { restantes: 2, legenda: "e outra vez" },
  { restantes: 1, legenda: "sobra uma. essa é a sua." },
];

function Demonstracao() {
  return (
    <figure className="m-0">
      <div
        className="rounded-[var(--raio-painel)] border p-6"
        style={{
          borderColor: "var(--borda)",
          background: "var(--painel)",
          boxShadow: "var(--sombra)",
        }}
      >
        <div className="flex flex-col gap-5">
          {PASSOS.map((passo, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((j) => (
                  <span
                    key={j}
                    className="h-7 w-7 rounded-[3px]"
                    style={{
                      background:
                        j < passo.restantes
                          ? "var(--accent)"
                          : "var(--dado-trilho)",
                      opacity: j < passo.restantes ? 1 - i * 0.04 : 1,
                    }}
                  />
                ))}
              </div>
              <span className="text-sm" style={{ color: "var(--tinta-2)" }}>
                {passo.legenda}
              </span>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="mt-3 text-xs" style={{ color: "var(--tinta-fraca)" }}>
        Em geral bastam de duas a cinco comparações.
      </figcaption>
    </figure>
  );
}

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-16">
      <div className="grid gap-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-20">
        <div>
          <h1
            className="display text-[2.75rem] font-semibold sm:text-[3.5rem]"
            style={{ color: "var(--tinta)" }}
          >
            Escolha sem precisar dizer quanto vale cada coisa.
          </h1>

          <p className="prosa mt-6 text-[17px]" style={{ color: "var(--tinta-2)" }}>
            Atribuir peso a critérios é difícil e as pessoas erram nisso. O
            método FITradeoff não pede pesos: pede que você compare duas
            situações concretas e diga qual prefere. Com poucas respostas ele
            chega a uma recomendação — e registra o caminho, para quando alguém
            perguntar por quê.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/decisao"
              className="tatil rounded-[var(--raio-controle)] px-5 py-2.5 text-sm font-medium"
              style={{
                background: "var(--accent)",
                color: "var(--accent-tinta)",
                boxShadow: "var(--sombra)",
              }}
            >
              Começar uma decisão
            </Link>
            <Link
              href="/chat"
              className="tatil rounded-[var(--raio-controle)] border px-5 py-2.5 text-sm font-medium"
              style={{ borderColor: "var(--borda-forte)", color: "var(--tinta)" }}
            >
              Descrever em conversa
            </Link>
          </div>

          <p className="mt-6 text-sm" style={{ color: "var(--tinta-3)" }}>
            As duas entradas levam ao mesmo método. A conversa ajuda quando o
            problema ainda não está organizado.
          </p>
        </div>

        <Demonstracao />
      </div>

      <div className="mt-28 grid items-start gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
        <h2
          className="display text-2xl font-semibold lg:sticky lg:top-24"
          style={{ color: "var(--tinta)" }}
        >
          O que isso muda na prática
        </h2>

        <dl className="divide-y" style={{ borderColor: "var(--borda)" }}>
          {[
            [
              "Você não atribui pesos",
              "Só diz qual de duas situações prefere. O peso de cada critério é deduzido das suas respostas.",
            ],
            [
              "A decisão fica registrada",
              "Cada resposta vira uma linha em português, com autor e horário. O resultado sai com a trilha que o sustenta.",
            ],
            [
              "Uma elicitação, quatro leituras",
              "Escolher a melhor, ordenar todas, classificar em faixas ou montar uma carteira — sem responder nada de novo.",
            ],
            [
              "Dá para parar no meio",
              "Se o conjunto já estiver pequeno, você olha as faixas de valor e decide pelos dados.",
            ],
          ].map(([titulo, texto]) => (
            <div key={titulo} className="py-5 first:pt-0 last:pb-0">
              <dt className="text-[15px] font-medium" style={{ color: "var(--tinta)" }}>
                {titulo}
              </dt>
              <dd
                className="prosa mt-1.5 text-sm"
                style={{ color: "var(--tinta-2)" }}
              >
                {texto}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="mt-24 text-xs" style={{ color: "var(--tinta-fraca)" }}>
        Método publicado por De Almeida et al. (2016). Implementação
        independente, sem vínculo com o sistema oficial do CDSID-UFPE.
      </p>
    </main>
  );
}
