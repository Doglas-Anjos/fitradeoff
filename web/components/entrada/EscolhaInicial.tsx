"use client";

/**
 * O primeiro passo: o objetivo da decisão e de onde vêm os dados.
 */

import {
  ArrowRight,
  FileXls,
  ListNumbers,
  NotePencil,
  SlidersHorizontal,
  Stack,
  Trophy,
} from "@phosphor-icons/react";

import { DIAGRAMAS } from "@/components/DiagramasObjetivo";
import { Rodape } from "@/components/Etapas";
import { Botao, CartaoOpcao, CartaoOpcaoDupla, Dica } from "@/components/ui";
import { useRascunho } from "@/components/entrada/contextoRascunho";
import { trilhaDe } from "@/components/entrada/trilha";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/entrada";
import type { Modo } from "@/lib/rascunho";
import type { Problematica } from "@/lib/types";

/* Os objetivos e as formas de entrada guardam a chave do catálogo, não o texto:
   o rótulo e a ajuda de cada objetivo já vivem no núcleo, porque o resto da
   interface também os usa. A ajuda de cada um é a chave mais `.ajuda`. */
/* A ordem e a do sistema de referencia -- escolha, ordenacao, carteira,
   classificacao -- para que as duas telas se reconhecam uma na outra. As duas
   carteiras ocupam uma caixa so, que e como la tambem: elas partem dos mesmos
   dados e respondem a mesma pergunta, e so o criterio de selecao muda. */
const PROBLEMATICAS: {
  valor: Problematica;
  chave: string;
  Icone: typeof Trophy;
}[] = [
  { valor: "escolha", chave: "problematica.escolha", Icone: Trophy },
  { valor: "ranking", chave: "problematica.ranking", Icone: ListNumbers },
  { valor: "sorting", chave: "problematica.sorting", Icone: SlidersHorizontal },
];

const CARTEIRAS: Problematica[] = ["portfolio", "beneficio_custo"];

/** Onde a caixa das carteiras entra na grade, contando a partir de zero. */
const POSICAO_CARTEIRA = 2;

const MODOS: {
  valor: Modo;
  chave: string;
  Icone: typeof Trophy;
}[] = [
  { valor: "manual", chave: "entrada.modo.manual", Icone: NotePencil },
  { valor: "planilha", chave: "entrada.modo.planilha", Icone: FileXls },
];

/** "escolher a melhor alternativa" -- o objetivo como quem decide o diria. */
const RESUMO_OBJETIVO: Record<Problematica, string> = {
  escolha: "entrada.resumo.escolha",
  ranking: "entrada.resumo.ranking",
  sorting: "entrada.resumo.sorting",
  portfolio: "entrada.resumo.portfolio",
  beneficio_custo: "entrada.resumo.beneficio_custo",
};

/* Sem chave para as salvas: elas nao sao um passo do cadastro, e o resumo do
   primeiro passo nao fala delas. */
const RESUMO_MODO: Record<Modo, string> = {
  manual: "entrada.resumo.modo.manual",
  planilha: "entrada.resumo.modo.planilha",
  salvas: "",
};

/** O que o botao vai realmente abrir, e nao um "Continuar" para lugar nenhum. */
const ACAO_MODO: Record<Modo, string> = {
  manual: "entrada.acao.manual",
  planilha: "entrada.acao.planilha",
  salvas: "entrada.acao.salvas",
};

/**
 * A forma de entrada, em botoes compactos.
 *
 * Ela vinha com o mesmo cartao dos objetivos, e as duas perguntas pareciam ter
 * o mesmo peso -- uma e sobre o problema, a outra e sobre de onde os dados
 * saem. Sete cartoes iguais nao diziam qual das duas decidia alguma coisa.
 */
function EscolhaCompacta({
  valor,
  ativo,
  rotulo,
  Icone,
  nome,
  onEscolher,
}: {
  valor: string;
  ativo: boolean;
  rotulo: string;
  Icone: typeof Trophy;
  nome: string;
  onEscolher: () => void;
}) {
  return (
    <label
      className="tatil inline-flex cursor-pointer items-center gap-2 rounded-[var(--raio-controle)] border px-3 py-2"
      style={{
        borderColor: ativo ? "var(--accent)" : "var(--borda-forte)",
        background: ativo ? "var(--accent-suave)" : "transparent",
      }}
    >
      <input
        type="radio"
        name={nome}
        value={valor}
        checked={ativo}
        onChange={onEscolher}
        className="sr-only"
      />
      <Icone
        size={15}
        weight={ativo ? "fill" : "regular"}
        style={{ color: ativo ? "var(--accent)" : "var(--tinta-fraca)" }}
        className="shrink-0"
      />
      <span
        className="text-[13px]"
        style={{
          color: ativo ? "var(--accent)" : "var(--tinta-2)",
          fontWeight: ativo ? 500 : 400,
        }}
      >
        {rotulo}
      </span>
    </label>
  );
}

/**
 * Os cartões dos objetivos: três simples e a caixa dupla das carteiras.
 *
 * Os quatro lado a lado e quase quadrados: assim se comparam de relance.
 * Empilhados em faixas largas viravam uma lista, e uma lista sugere uma ordem
 * que aqui nao existe. A proporcao so vale onde as quatro colunas cabem; num
 * celular o quadrado viraria um bloco alto demais para caber na dobra.
 */
function CartoesObjetivo({
  problematica,
  onEscolher,
}: {
  problematica: Problematica;
  onEscolher: (p: Problematica) => void;
}) {
  const { t } = useIdioma();
  const naCarteira = CARTEIRAS.includes(problematica);

  const simples = PROBLEMATICAS.map(({ valor, chave, Icone }) => {
    const ativo = problematica === valor;
    const Diagrama = DIAGRAMAS[valor];
    return (
      <CartaoOpcao
        key={valor}
        nome="problematica"
        ativo={ativo}
        rotulo={t(chave)}
        ajuda={t(`${chave}.ajuda`)}
        icone={<Icone size={22} weight={ativo ? "fill" : "regular"} />}
        /* A figura carrega o que o texto custa a explicar: "ordenação"
           e "classificação" soam parecidos escritos, e dão resultados
           completamente diferentes. Em realce ela se move, e o
           movimento é o que separa uma da outra -- ver
           `DiagramasObjetivo`. */
        figura={(emRealce) => <Diagrama ativo={ativo} emRealce={emRealce} />}
        onEscolher={() => onEscolher(valor)}
      />
    );
  });

  const carteiras = (
    <CartaoOpcaoDupla
      key="carteira"
      nome="problematica"
      icone={<Stack size={22} weight={naCarteira ? "fill" : "regular"} />}
      /* O mesmo desenho para as duas: a diferença entre elas não é o
         que se procura -- um conjunto dentro de um teto -- e sim como
         se procura. Um desenho diferente prometeria outra coisa; o
         movimento, esse sim, mostra a diferença, e vem da região do
         cartão sobre a qual o mouse está. */
      figura={(emRealce) => (
        <DIAGRAMAS.portfolio
          ativo={naCarteira}
          modo={(emRealce as "portfolio" | "beneficio_custo" | null) ?? null}
        />
      )}
      opcoes={CARTEIRAS.map((valor) => ({
        valor,
        rotulo: t(`problematica.${valor}`),
      }))}
      selecionado={naCarteira ? problematica : null}
      onEscolher={(valor) => onEscolher(valor as Problematica)}
      dica={
        <Dica titulo={t("problematica.carteira.dica.titulo")}>
          <p>{t("problematica.carteira.dica.combinatorial")}</p>
          <p>{t("problematica.carteira.dica.razao")}</p>
          <p style={{ color: "var(--tinta-3)" }}>
            {t("problematica.carteira.dica.comum")}
          </p>
        </Dica>
      }
    />
  );

  const cartoes = [...simples];
  cartoes.splice(POSICAO_CARTEIRA, 0, carteiras);

  /* Altura mínima, não proporção fixa. `aspect-square` prendia o
     cartão em 240px e o conteúdo precisava de 256, então três dos
     quatro transbordavam por cima do texto seguinte - e o quarto,
     com uma linha de ajuda a menos, ficava visivelmente mais baixo.
     A grade já iguala as alturas da linha entre si. */
  return (
    <div className="mt-3 grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {cartoes.map((cartao, i) => (
        <div
          key={cartao.key}
          className="entra-em-lista grid min-h-[8.5rem] lg:min-h-[12.5rem]"
          style={{ "--ordem": i } as React.CSSProperties}
        >
          {cartao}
        </div>
      ))}
    </div>
  );
}

export function EscolhaInicial({ onContinuar }: { onContinuar: () => void }) {
  const { t } = useIdioma();
  const {
    estado: rascunho,
    acoes: { atualizar },
  } = useRascunho();
  const passos = trilhaDe(rascunho.modo, rascunho.problematica, t).length;
  const ajudaDoModo = MODOS.find((m) => m.valor === rascunho.modo)?.chave;

  return (
    <div className="space-y-7">
      <fieldset>
        <legend className="mb-1 flex items-center gap-1.5 text-[13px] font-medium">
          <span style={{ color: "var(--tinta)" }}>
            {t("entrada.objetivo.pergunta")}
          </span>
          <Dica titulo={t("entrada.objetivo.dica.titulo")}>
            <p>{t("entrada.objetivo.dica.perguntas")}</p>
            <p>{t("entrada.objetivo.dica.trocar")}</p>
          </Dica>
        </legend>

        <CartoesObjetivo
          problematica={rascunho.problematica}
          onEscolher={(problematica) => atualizar((r) => ({ ...r, problematica }))}
        />
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-[13px] font-medium" style={{ color: "var(--tinta)" }}>
          {t("entrada.fonte.pergunta")}
        </legend>

        <div className="mt-2.5 flex flex-wrap gap-2">
          {MODOS.map(({ valor, chave, Icone }) => (
            <EscolhaCompacta
              key={valor}
              nome="modo"
              valor={valor}
              ativo={rascunho.modo === valor}
              rotulo={t(chave)}
              Icone={Icone}
              onEscolher={() => atualizar((r) => ({ ...r, modo: valor }))}
            />
          ))}
        </div>

        {/* só a ajuda do modo marcado: três linhas de ajuda de uma vez pesavam
            tanto quanto a pergunta de cima, que é a que importa */}
        <p className="mt-2 text-[12px]" style={{ color: "var(--tinta-3)" }}>
          {ajudaDoModo ? t(`${ajudaDoModo}.ajuda`) : null}
        </p>
      </fieldset>

      {/* Duas opções já vêm marcadas. Sem este eco, a pessoa segue sem saber que
          escolheu, e a trilha muda de tamanho longe de onde ela está olhando. */}
      <p
        className="prosa border-t pt-5 text-[13px]"
        style={{ borderColor: "var(--borda)", color: "var(--tinta-2)" }}
      >
        {t("entrada.resumo.antes")}{" "}
        <strong style={{ color: "var(--tinta)" }}>
          {t(RESUMO_OBJETIVO[rascunho.problematica])}
        </strong>
        {t("entrada.resumo.meio", {
          modo: RESUMO_MODO[rascunho.modo] ? t(RESUMO_MODO[rascunho.modo]) : "",
        })}{" "}
        <span className="num">{passos}</span> {t("entrada.resumo.passos")}.
      </p>

      <Rodape>
        <Rodape.Acoes>
          <Botao onClick={onContinuar} icone={<ArrowRight size={14} weight="bold" />}>
            {t(ACAO_MODO[rascunho.modo])}
          </Botao>
        </Rodape.Acoes>
      </Rodape>
    </div>
  );
}
