"use client";

/**
 * Cadastro do problema: nome, alternativas e criterios -- e so isso.
 *
 * E a tela que faltava. O sistema de referencia registra a *estrutura* do
 * problema antes de pedir qualquer numero: quem sao as alternativas, quais sao
 * os criterios, em que escala cada um e medido. Os desempenhos vem depois, numa
 * matriz cujas linhas e colunas ja estao decididas.
 *
 * A ordem nao e capricho de navegacao. Preencher a matriz enquanto se inventa
 * os criterios mistura duas perguntas diferentes -- "o que importa aqui?" e
 * "quanto cada opcao entrega?" -- e a primeira e a que define o modelo. Quando
 * as duas cabem na mesma tela, a estrutura acaba saindo do formato da tabela,
 * e nao do problema.
 *
 * Cada bloco e uma lista com adicionar, editar e excluir, porque e assim que se
 * trata um cadastro: o item ja registrado tem de poder ser corrigido sem
 * refazer o resto.
 */

import {
  ArrowRight,
  ArrowsClockwise,
  CaretRight,
  Check,
  ListNumbers,
  PencilSimple,
  Plus,
  Prohibit,
  Scales,
  SlidersHorizontal,
  Stack,
  TrendDown,
  TrendUp,
  Trash,
  Trophy,
  X,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { Rodape, Voltar } from "@/components/Etapas";
import { avisar } from "@/components/Avisos";
import { ListaArrastavel } from "@/components/ListaArrastavel";
import { Botao, Campo, Dica, Entrada, Segmentado, Selo } from "@/components/ui";
import { useIdioma } from "@/lib/i18n";
import { traduzir } from "@/lib/i18n/dominio";
import { comNos } from "@/lib/i18n/estrutura";
import "@/lib/i18n/nucleo";
/* Pelo nome da tela de decisões salvas, citado na dica do nome do problema: a
   dica manda a pessoa para lá, e o nome tem de ser o mesmo que ela vai ler. */
import "@/lib/i18n/paineis";
import {
  adicionarAlternativa,
  adicionarCriterio,
  atualizarCriterio,
  criterioVazio,
  removerAlternativa,
  removerCriterio,
  renomearAlternativa,
  temVeto,
  validarCriterio,
  aceitaVeto,
  type CriterioRascunho,
  type Rascunho,
} from "@/lib/rascunho";
import type { Direcao, Problematica } from "@/lib/types";

/* O rótulo vem do catálogo do núcleo, que é quem guarda os nomes das
   problemáticas nos termos da literatura. */
const ROTULO_PROBLEMATICA: Record<
  Problematica,
  { chave: string; Icone: typeof Trophy }
> = {
  escolha: { chave: "problematica.escolha", Icone: Trophy },
  ranking: { chave: "problematica.ranking", Icone: ListNumbers },
  sorting: { chave: "problematica.sorting", Icone: SlidersHorizontal },
  beneficio_custo: { chave: "problematica.beneficio_custo", Icone: Scales },
  portfolio: { chave: "problematica.portfolio", Icone: Stack },
};

/* --- peças comuns aos dois blocos --------------------------------------------- */

function Cabecalho({
  titulo,
  quantos,
  contagem,
  dica,
}: {
  titulo: string;
  quantos: number;
  /**
   * As três formas da contagem: faltando dois, faltando um, e o total. Cada
   * uma é uma chave sua, porque a regra de plural não é a mesma em todo
   * idioma e montar a frase por pedaços só funciona em português.
   */
  contagem: { faltamDois: string; faltaUm: string; total: string };
  dica?: React.ReactNode;
}) {
  const { t } = useIdioma();

  /* "Faltam 2 alternativas" diz o proximo passo; "0 alternativas - minimo 2"
     cobrava um requisito e deixava a conta para quem le. */
  const quantidade =
    quantos === 0
      ? t(contagem.faltamDois)
      : quantos === 1
        ? t(contagem.faltaUm)
        : t(contagem.total, { n: quantos });

  return (
    <div
      className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b pb-2"
      style={{ borderColor: "var(--borda)" }}
    >
      <h3 className="text-[14px] font-semibold" style={{ color: "var(--tinta)" }}>
        {titulo}
      </h3>
      {dica}
      <span
        className="text-[12px]"
        style={{ color: quantos >= 2 ? "var(--tinta-3)" : "var(--tinta-fraca)" }}
      >
        {quantidade}
      </span>
    </div>
  );
}

/**
 * Editar e excluir, discretos ate o cartao receber o ponteiro ou o foco.
 *
 * Nao somem de todo: num toque nao existe hover, e uma acao invisivel ali
 * seria uma acao inexistente. Ficam a 70% de opacidade e sobem para 100% no
 * hover do cartao ou quando o foco de teclado entra neles -- quem navega por
 * Tab enxerga exatamente o que quem usa mouse enxerga.
 */
function Acoes({
  nome,
  onEditar,
  onExcluir,
}: {
  nome: string;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  const { t } = useIdioma();

  return (
    <span className="flex shrink-0 items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
      <button
        type="button"
        onClick={onEditar}
        aria-label={t("estrutura.item.editar", { nome })}
        className="tatil rounded-[var(--raio-controle)] p-1.5"
        style={{ color: "var(--tinta-2)" }}
      >
        <PencilSimple size={14} />
      </button>
      <button
        type="button"
        onClick={onExcluir}
        aria-label={t("estrutura.item.excluir", { nome })}
        className="tatil rounded-[var(--raio-controle)] p-1.5"
        style={{ color: "var(--tinta-2)" }}
      >
        <Trash size={14} />
      </button>
    </span>
  );
}

/**
 * A nova posicao de um indice antigo depois de reordenar, ou `null` se ele
 * saiu da lista. Serve para o item que estava em edicao continuar em edicao.
 */
function reposicionar(indices: number[], antigo: number | null): number | null {
  if (antigo === null) return null;
  const novo = indices.indexOf(antigo);
  return novo < 0 ? null : novo;
}

/**
 * O vazio diz o que preencher, nao como operar o formulario que esta logo
 * acima. Quem nunca usou o metodo nao trava no botao: trava em "o que conta
 * como criterio aqui".
 */
function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <p className="prosa px-0.5 py-1 text-[12.5px]" style={{ color: "var(--tinta-3)" }}>
      {children}
    </p>
  );
}

/* --- alternativas -------------------------------------------------------------- */

function BlocoAlternativas({
  rascunho,
  onAlterar,
}: {
  rascunho: Rascunho;
  onAlterar: (r: Rascunho) => void;
}) {
  const { t } = useIdioma();
  const [novo, setNovo] = useState("");
  const [editando, setEditando] = useState<number | null>(null);
  const [texto, setTexto] = useState("");

  const jaExiste = (nome: string, exceto?: number) =>
    rascunho.linhas.some(
      (l, i) => i !== exceto && l.nome.trim().toLowerCase() === nome.toLowerCase(),
    );

  const adicionar = () => {
    const nome = novo.trim();
    if (!nome) return avisar.erro(t("estrutura.alternativa.erro.semNome"));
    if (jaExiste(nome))
      return avisar.erro(t("estrutura.alternativa.erro.repetida", { nome }));
    setNovo("");
    onAlterar(adicionarAlternativa(rascunho, nome));
  };

  const salvarEdicao = () => {
    if (editando === null) return;
    const nome = texto.trim();
    if (!nome) return avisar.erro(t("estrutura.alternativa.erro.nomeVazio"));
    if (jaExiste(nome, editando))
      return avisar.erro(t("estrutura.alternativa.erro.repetida", { nome }));
    onAlterar(renomearAlternativa(rascunho, editando, nome));
    setEditando(null);
  };

  const excluir = (i: number) => {
    if (editando === i) setEditando(null);
    onAlterar(removerAlternativa(rascunho, i));
  };

  /* A ordem das alternativas e a ordem das linhas da matriz de desempenhos:
     mover um cartao aqui tem de mover a linha inteira, senao os numeros do
     passo seguinte passariam a pertencer a outra alternativa. */
  const reordenar = (ordem: string[]) => {
    const indices = ordem.map(Number);
    setEditando(reposicionar(indices, editando));
    onAlterar({ ...rascunho, linhas: indices.map((i) => rascunho.linhas[i]) });
  };

  return (
    <section aria-labelledby="bloco-alternativas">
      <span id="bloco-alternativas" className="sr-only">
        {t("estrutura.alternativas.titulo")}
      </span>
      <Cabecalho
        titulo={t("estrutura.alternativas.titulo")}
        quantos={rascunho.linhas.length}
        contagem={{
          faltamDois: "estrutura.alternativas.faltamDuas",
          faltaUm: "estrutura.alternativas.faltaUma",
          total: "estrutura.alternativas.contagem",
        }}
        dica={
          <Dica titulo={t("estrutura.alternativas.dica.titulo")}>
            <p>{t("estrutura.alternativas.dica.corpo1")}</p>
            <p>{t("estrutura.alternativas.dica.corpo2")}</p>
          </Dica>
        }
      />

      {/* Superfície rebaixada: é onde se digita, não mais um item da lista.
          Antes este bloco não tinha moldura nenhuma e encostava direto nos
          cartões brancos de baixo. */}
      <div className="area-entrada mb-3 p-3">
        <p className="rotulo-area mb-2">{t("estrutura.alternativas.regiao")}</p>
        <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-32 flex-1">
          <Entrada
            value={novo}
            data-campo="nova-alternativa"
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                adicionar();
              }
            }}
            placeholder={t("estrutura.alternativa.exemplo", {
              n: rascunho.linhas.length + 1,
            })}
            aria-label={t("estrutura.alternativa.nova")}
            className="!text-[13px]"
          />
        </div>
        <Botao
          variante="contorno"
          onClick={adicionar}
          icone={<Plus size={13} weight="bold" />}
        >
          {t("acao.adicionar")}
        </Botao>
        </div>
      </div>

      {rascunho.linhas.length === 0 ? (
        <Vazio>{t("estrutura.alternativas.vazio")}</Vazio>
      ) : (
        <ListaArrastavel
          onReordenar={reordenar}
          itens={rascunho.linhas.map((linha, i) => ({
            id: String(i),
            titulo: linha.nome,
            arrastavel: editando !== i,
            corpo:
              editando === i ? (
                <Entrada
                  value={texto}
                  autoFocus
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      salvarEdicao();
                    }
                    if (e.key === "Escape") setEditando(null);
                  }}
                  aria-label={t("estrutura.alternativa.novoNome", {
                    nome: linha.nome,
                  })}
                  className="!py-1 !text-[13px]"
                />
              ) : undefined,
          }))}
          acoes={(id) => {
            const i = Number(id);
            const linha = rascunho.linhas[i];
            if (editando !== i) {
              return (
                <Acoes
                  nome={linha.nome}
                  onEditar={() => {
                    setEditando(i);
                    setTexto(linha.nome);
                  }}
                  onExcluir={() => excluir(i)}
                />
              );
            }
            /* Confirmar e desistir ficam sempre visiveis: sao a saida de um
               estado do qual nao da para sair de outro jeito. */
            return (
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={salvarEdicao}
                  aria-label={t("estrutura.alternativa.salvarNome")}
                  className="tatil rounded-[var(--raio-controle)] p-1.5"
                  style={{ color: "var(--accent)" }}
                >
                  <Check size={14} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditando(null)}
                  aria-label={t("estrutura.item.cancelarEdicao")}
                  className="tatil rounded-[var(--raio-controle)] p-1.5"
                  style={{ color: "var(--tinta-2)" }}
                >
                  <X size={14} weight="bold" />
                </button>
              </span>
            );
          }}
        />
      )}

    </section>
  );
}

/* --- níveis de uma escala construída ------------------------------------------- */

function EditorNiveis({
  niveis,
  onChange,
}: {
  niveis: string[];
  onChange: (v: string[]) => void;
}) {
  const { t } = useIdioma();

  return (
    <div className="space-y-2">
      <p className="text-[12px]" style={{ color: "var(--tinta-3)" }}>
        {comNos(t("estrutura.niveis.ordem"), {
          termo: <strong>{t("estrutura.niveis.ordem.termo")}</strong>,
        })}
      </p>
      <ul className="space-y-1.5">
        {niveis.map((nivel, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              className="w-16 shrink-0 text-[11px]"
              style={{ color: "var(--tinta-fraca)" }}
            >
              {i === 0
                ? t("estrutura.niveis.pior")
                : i === niveis.length - 1
                  ? t("estrutura.niveis.melhor")
                  : t("estrutura.niveis.intermediario", { n: i + 1 })}
            </span>
            <Entrada
              value={nivel}
              onChange={(e) => onChange(niveis.map((n, j) => (j === i ? e.target.value : n)))}
              inputMode="decimal"
              placeholder={String(i + 1)}
              aria-label={t("estrutura.niveis.campo", { n: i + 1 })}
              className="num !w-28 !py-1 text-right !text-[13px]"
            />
            {niveis.length > 2 && (
              <button
                type="button"
                onClick={() => onChange(niveis.filter((_, j) => j !== i))}
                aria-label={t("estrutura.niveis.remover", { n: i + 1 })}
                className="tatil p-1"
                style={{ color: "var(--tinta-fraca)" }}
              >
                <Trash size={13} />
              </button>
            )}
          </li>
        ))}
      </ul>
      <Botao
        variante="contorno"
        onClick={() => onChange([...niveis, ""])}
        icone={<Plus size={12} weight="bold" />}
        className="!px-2.5 !py-1 !text-[12px]"
      >
        {t("estrutura.niveis.adicionar")}
      </Botao>
    </div>
  );
}

/**
 * Os limites do modelo de veto, num bloco que começa fechado.
 *
 * Fechado porque a maioria das decisões não tem veto, e um par de campos
 * sempre aberto sugere que falta preencher. Aberto assim que há algo
 * declarado, para que reabrir o critério não esconda o que já foi dito.
 *
 * O texto explica o que a penalidade faz, e não só o que digitar: um campo
 * chamado "limite de veto" sem isso convida a pessoa a cortar uma alternativa
 * achando que a elimina - e o modelo aditivo com veto não elimina ninguém,
 * penaliza o valor global (de Almeida, 2013).
 */
function EditorVeto({
  criterio,
  onChange,
}: {
  criterio: CriterioRascunho;
  onChange: (parcial: Partial<CriterioRascunho>) => void;
}) {
  const { t } = useIdioma();
  const declarado = temVeto(criterio);
  const [abertoManual, setAbertoManual] = useState<boolean | null>(null);
  const aberto = abertoManual ?? declarado;

  const unidade = criterio.unidade.trim();
  const maior = criterio.direcao === "max";
  /* Os rótulos falam na direção do critério: "a partir de" num critério de
     maximizar e "até" num de minimizar. Um rótulo fixo obrigaria a pessoa a
     traduzir mentalmente a direção a cada critério, que é exatamente onde o
     par se inverte. */
  const sufixo = maior ? "max" : "min";

  return (
    <div
      className="rounded-[var(--raio-controle)] border"
      style={{ borderColor: "var(--borda)" }}
    >
      <button
        type="button"
        onClick={() => setAbertoManual(!aberto)}
        aria-expanded={aberto}
        className="tatil flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-medium"
        style={{ color: "var(--tinta-2)" }}
      >
        <CaretRight
          size={12}
          weight="bold"
          style={{ transform: aberto ? "rotate(90deg)" : undefined }}
        />
        {t("estrutura.criterio.veto")}
        {declarado && <Selo tom="accent">{t("estrutura.criterio.veto.selo")}</Selo>}
        {!declarado && (
          <span className="text-[11.5px] font-normal" style={{ color: "var(--tinta-fraca)" }}>
            {t("estrutura.criterio.veto.opcional")}
          </span>
        )}
      </button>

      {aberto && (
        <div className="space-y-3 border-t px-3 py-3" style={{ borderColor: "var(--borda)" }}>
          <p className="text-[12px]" style={{ color: "var(--tinta-3)" }}>
            {comNos(t("estrutura.criterio.veto.explicacao"), {
              naoElimina: <strong>{t("estrutura.criterio.veto.naoElimina")}</strong>,
            })}
          </p>

          <div className="flex flex-wrap gap-3">
            <div className="w-44">
              <Campo
                rotulo={t(`estrutura.criterio.veto.aceitavel.${sufixo}`)}
                ajuda={t("estrutura.criterio.veto.aceitavel.ajuda")}
                dica={
                  <Dica titulo={t("estrutura.criterio.veto.dica.titulo")}>
                    <p>{t("estrutura.criterio.veto.dica.corpo1")}</p>
                    <p>{t("estrutura.criterio.veto.dica.corpo2")}</p>
                    <p style={{ color: "var(--tinta-3)" }}>
                      {t("estrutura.criterio.veto.dica.fonte")}
                    </p>
                  </Dica>
                }
              >
                {(props) => (
                  <Entrada
                    {...props}
                    value={criterio.vetoAceitavel}
                    onChange={(e) => onChange({ vetoAceitavel: e.target.value })}
                    inputMode="decimal"
                    placeholder={unidade || t("estrutura.criterio.veto.vazio")}
                    className="num !py-1 text-right !text-[13px]"
                  />
                )}
              </Campo>
            </div>
            <div className="w-44">
              <Campo
                rotulo={t(`estrutura.criterio.veto.inaceitavel.${sufixo}`)}
                ajuda={t("estrutura.criterio.veto.inaceitavel.ajuda")}
              >
                {(props) => (
                  <Entrada
                    {...props}
                    value={criterio.vetoInaceitavel}
                    onChange={(e) => onChange({ vetoInaceitavel: e.target.value })}
                    inputMode="decimal"
                    placeholder={unidade || t("estrutura.criterio.veto.vazio")}
                    className="num !py-1 text-right !text-[13px]"
                  />
                )}
              </Campo>
            </div>
          </div>

          <p className="text-[11.5px]" style={{ color: "var(--tinta-fraca)" }}>
            {t("estrutura.criterio.veto.umSo")}
          </p>
          {declarado && (
            <p className="text-[11.5px]" style={{ color: "var(--tinta-fraca)" }}>
              {t("estrutura.criterio.veto.custo")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* --- critérios ----------------------------------------------------------------- */

/**
 * O que a lista mostra sob o nome do critério.
 *
 * Era uma linha corrida separada por pontos: "R$/un · menor é melhor · só
 * inteiros". Lida rápido, virava uma frase só, e a direção -- o dado que
 * inverte o resultado inteiro -- tinha o mesmo peso da unidade. Em selos cada
 * informação tem contorno próprio e a direção pode receber destaque sem
 * depender só de cor.
 *
 * Numa escala construída a direção não aparece, pela mesma razão que o
 * formulário a esconde: a ordem dos níveis já diz o que é melhor, e mostrar
 * uma direção ali sugeriria uma escolha que não existe.
 */
function SelosCriterio({ criterio }: { criterio: CriterioRascunho }) {
  const { t } = useIdioma();
  const unidade = criterio.unidade.trim();
  const maior = criterio.direcao === "max";

  return (
    <span className="mt-1 flex flex-wrap items-center gap-1">
      {!!unidade && (
        <Selo titulo={t("estrutura.criterio.unidade.selo")}>{unidade}</Selo>
      )}

      {criterio.escala === "discreta" ? (
        <>
          <Selo>{t("estrutura.niveis.selo")}</Selo>
          <Selo titulo={t("estrutura.niveis.selo.titulo")}>
            {t(
              criterio.niveis.length === 1
                ? "estrutura.niveis.contagemUm"
                : "estrutura.niveis.contagem",
              { n: criterio.niveis.length },
            )}
          </Selo>
        </>
      ) : (
        <>
          <Selo
            tom="accent"
            icone={
              maior ? (
                <TrendUp size={11} weight="bold" />
              ) : (
                <TrendDown size={11} weight="bold" />
              )
            }
            titulo={t(
              maior
                ? "estrutura.criterio.direcao.selo.max"
                : "estrutura.criterio.direcao.selo.min",
            )}
          >
            {t(maior ? "termo.maiorMelhor" : "termo.menorMelhor")}
          </Selo>
          {criterio.inteiro && <Selo>{t("estrutura.criterio.inteiro.selo")}</Selo>}
        </>
      )}

      {/* o veto muda o resultado e fica escondido dentro do editor: sem selo,
          quem reabre a lista não tem como saber que ele está lá */}
      {temVeto(criterio) && (
        <Selo
          tom="accent"
          icone={<Prohibit size={11} weight="bold" />}
          titulo={t("estrutura.criterio.veto.selo.titulo")}
        >
          {t("estrutura.criterio.veto.selo")}
        </Selo>
      )}
    </span>
  );
}

function BlocoCriterios({
  rascunho,
  onAlterar,
}: {
  rascunho: Rascunho;
  onAlterar: (r: Rascunho) => void;
}) {
  const { t } = useIdioma();
  const [forma, setForma] = useState<CriterioRascunho>(criterioVazio());
  const [editando, setEditando] = useState<number | null>(null);
  const semCriterios = rascunho.colunas.length === 0;

  const mexer = (parcial: Partial<CriterioRascunho>) =>
    setForma({ ...forma, ...parcial });

  const limpar = () => {
    setForma(criterioVazio());
    setEditando(null);
  };

  const confirmar = () => {
    /* A validação é módulo puro e devolve a chave da recusa, não a frase: é aqui,
       onde o hook existe, que ela ganha idioma. */
    const erro = validarCriterio(forma);
    if (erro) return avisar.erro(traduzir(erro, t));
    const nome = forma.nome.trim().toLowerCase();
    const repetido = rascunho.colunas.some(
      (c, i) => i !== editando && c.nome.trim().toLowerCase() === nome,
    );
    if (repetido)
      return avisar.erro(
        t("estrutura.criterio.erro.repetido", { nome: forma.nome.trim() }),
      );

    const limpo: CriterioRascunho = {
      ...forma,
      nome: forma.nome.trim(),
      unidade: forma.unidade.trim(),
      niveis: forma.escala === "discreta" ? forma.niveis : criterioVazio().niveis,
    };
    onAlterar(
      editando === null
        ? adicionarCriterio(rascunho, limpo)
        : atualizarCriterio(rascunho, editando, limpo),
    );
    limpar();
  };

  const editar = (i: number) => {
    setForma({ ...rascunho.colunas[i] });
    setEditando(i);
  };

  const excluir = (i: number) => {
    if (editando === i) limpar();
    onAlterar(removerCriterio(rascunho, i));
  };

  /* Cada critério é uma coluna da matriz de desempenhos, e os valores de cada
     alternativa vêm na mesma ordem das colunas. Reordenar só a lista de
     critérios deixaria o preço debaixo do prazo em toda a matriz. */
  const reordenar = (ordem: string[]) => {
    const indices = ordem.map(Number);
    setEditando(reposicionar(indices, editando));
    onAlterar({
      ...rascunho,
      colunas: indices.map((i) => rascunho.colunas[i]),
      linhas: rascunho.linhas.map((l) => ({
        ...l,
        valores: indices.map((i) => l.valores[i] ?? ""),
      })),
    });
  };

  const discreto = forma.escala === "discreta";

  return (
    <section aria-labelledby="bloco-criterios">
      <span id="bloco-criterios" className="sr-only">
        {t("estrutura.criterios.titulo")}
      </span>
      <Cabecalho
        titulo={t("estrutura.criterios.titulo")}
        quantos={rascunho.colunas.length}
        contagem={{
          faltamDois: "estrutura.criterios.faltamDois",
          faltaUm: "estrutura.criterios.faltaUm",
          total: "estrutura.criterios.contagem",
        }}
        dica={
          <Dica titulo={t("estrutura.criterios.dica.titulo")}>
            <p>{t("estrutura.criterios.dica.corpo1")}</p>
            <p>
              {comNos(t("estrutura.criterios.dica.corpo2"), {
                termo: (
                  <strong>{t("estrutura.criterios.dica.corpo2.termo")}</strong>
                ),
              })}
            </p>
          </Dica>
        }
      />

      {/* o formulário do critério: mesmo painel serve para cadastrar e editar,
          porque os campos são os mesmos e a pessoa já sabe onde eles ficam */}
      {/* Era tracejado sobre fundo transparente, para ler como "área de
          entrada". Contra o branco do painel o tracejado quase não aparecia, e
          a região de digitação ficava indistinguível da lista de critérios já
          cadastrados logo abaixo. Agora é superfície rebaixada, e a lista é
          erguida: a diferença passa a ser de relevo, que não depende de
          reparar num fio de 1px. */}
      <div
        className="area-entrada mt-3 space-y-3 p-3.5"
        data-editando={editando !== null}
      >
        <p
          className={editando === null ? "rotulo-area" : "text-[12px]"}
          style={editando === null ? undefined : { color: "var(--accent)" }}
        >
          {editando === null
            ? t("estrutura.criterios.regiao")
            : t("estrutura.criterio.editando", {
                nome: rascunho.colunas[editando]?.nome ?? "",
              })}
        </p>

        <div className="flex flex-wrap gap-3">
          <div className="min-w-48 flex-1">
            <Campo rotulo={t("estrutura.criterio.nome")}>
              {(props) => (
                <Entrada
                  {...props}
                  value={forma.nome}
                  data-campo="novo-criterio"
                  onChange={(e) => mexer({ nome: e.target.value })}
                  placeholder={t("estrutura.criterio.nome.exemplo")}
                  className="!text-[13px]"
                />
              )}
            </Campo>
          </div>
          <div className="w-32">
            <Campo
              rotulo={t("estrutura.criterio.unidade")}
              dica={
                <Dica titulo={t("estrutura.criterio.unidade.dica.titulo")}>
                  <p>{t("estrutura.criterio.unidade.dica.corpo1")}</p>
                  <p style={{ color: "var(--tinta-3)" }}>
                    {t("estrutura.criterio.unidade.dica.corpo2")}
                  </p>
                </Dica>
              }
            >
              {(props) => (
                <Entrada
                  {...props}
                  value={forma.unidade}
                  onChange={(e) => mexer({ unidade: e.target.value })}
                  placeholder={t("estrutura.criterio.unidade.exemplo")}
                  className="!text-[13px]"
                />
              )}
            </Campo>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
          <div>
            <p
              className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium"
              style={{ color: "var(--tinta)" }}
            >
              {t("estrutura.criterio.escala")}
              <Dica titulo={t("estrutura.criterio.escala.dica.titulo")}>
                <p>
                  {comNos(t("estrutura.criterio.escala.dica.continua"), {
                    termo: (
                      <strong>{t("estrutura.criterio.escala.continua")}</strong>
                    ),
                  })}
                </p>
                <p>
                  {comNos(t("estrutura.criterio.escala.dica.discreta"), {
                    termo: (
                      <strong>{t("estrutura.criterio.escala.discreta")}</strong>
                    ),
                  })}
                </p>
              </Dica>
            </p>
            <Segmentado
              etiqueta={t("estrutura.criterio.escala.etiqueta")}
              valor={forma.escala}
              onEscolher={(escala) => mexer({ escala })}
              opcoes={[
                {
                  valor: "continua",
                  rotulo: t("estrutura.criterio.escala.continua"),
                  descricao: t("estrutura.criterio.escala.continua.ajuda"),
                },
                {
                  valor: "discreta",
                  rotulo: t("estrutura.criterio.escala.discreta"),
                  descricao: t("estrutura.criterio.escala.discreta.ajuda"),
                },
              ]}
            />
          </div>

          {/* numa escala construída a ordem dos níveis já diz o que é melhor:
              oferecer direção ali seria oferecer uma escolha sem efeito */}
          {!discreto && (
            <div>
              <p
                className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium"
                style={{ color: "var(--tinta)" }}
              >
                {t("estrutura.criterio.direcao")}
                <Dica titulo={t("estrutura.criterio.direcao.dica.titulo")}>
                  <p>{t("estrutura.criterio.direcao.dica.corpo1")}</p>
                  <p>{t("estrutura.criterio.direcao.dica.corpo2")}</p>
                  <p style={{ color: "var(--tinta-3)" }}>
                    {comNos(t("estrutura.criterio.direcao.dica.corpo3"), {
                      max: <strong>{t("termo.maximizacao")}</strong>,
                      min: <strong>{t("termo.minimizacao")}</strong>,
                    })}
                  </p>
                </Dica>
              </p>
              <Segmentado
                etiqueta={t("estrutura.criterio.direcao.etiqueta")}
                valor={forma.direcao}
                onEscolher={(direcao) => mexer({ direcao: direcao as Direcao })}
                opcoes={[
                  {
                    valor: "max",
                    rotulo: t("estrutura.criterio.direcao.maior"),
                    icone: <TrendUp size={12} weight="bold" />,
                    descricao: t("estrutura.criterio.direcao.maior.ajuda"),
                  },
                  {
                    valor: "min",
                    rotulo: t("estrutura.criterio.direcao.menor"),
                    icone: <TrendDown size={12} weight="bold" />,
                    descricao: t("estrutura.criterio.direcao.menor.ajuda"),
                  },
                ]}
              />
            </div>
          )}

          {!discreto && (
            <label className="flex items-center gap-2 self-end pb-1.5 text-[12.5px]">
              <input
                type="checkbox"
                checked={forma.inteiro}
                onChange={(e) => mexer({ inteiro: e.target.checked })}
                className="h-3.5 w-3.5"
              />
              <span style={{ color: "var(--tinta-2)" }}>
                {t("estrutura.criterio.inteiro")}
              </span>
              <Dica titulo={t("estrutura.criterio.inteiro.dica.titulo")}>
                <p>{t("estrutura.criterio.inteiro.dica.corpo1")}</p>
                <p style={{ color: "var(--tinta-3)" }}>
                  {t("estrutura.criterio.inteiro.dica.corpo2")}
                </p>
              </Dica>
            </label>
          )}
        </div>

        {discreto && (
          <EditorNiveis niveis={forma.niveis} onChange={(niveis) => mexer({ niveis })} />
        )}

        {/* O veto só aparece onde o método o define. Oferecê-lo nos outros
            objetivos seria deixar a pessoa preencher um campo para ser barrada
            na tela seguinte. */}
        {aceitaVeto(rascunho.problematica) && (
          <EditorVeto criterio={forma} onChange={mexer} />
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Botao
            variante="contorno"
            onClick={confirmar}
            icone={
              editando === null ? (
                <Plus size={13} weight="bold" />
              ) : (
                <Check size={13} weight="bold" />
              )
            }
          >
            {t(editando === null ? "acao.adicionar" : "estrutura.criterio.salvar")}
          </Botao>
          {editando !== null && (
            <button
              type="button"
              onClick={limpar}
              className="tatil text-[13px] underline underline-offset-2"
              style={{ color: "var(--tinta-3)" }}
            >
              {t("estrutura.criterio.cancelar")}
            </button>
          )}
        </div>
      </div>

      {semCriterios ? (
        <Vazio>{t("estrutura.criterios.vazio")}</Vazio>
      ) : (
        <div className="mt-4">
          <ListaArrastavel
            onReordenar={reordenar}
            itens={rascunho.colunas.map((criterio, i) => ({
              id: String(i),
              titulo: criterio.nome,
              destacado: editando === i,
              detalhe: <SelosCriterio criterio={criterio} />,
            }))}
            acoes={(id) => {
              const i = Number(id);
              return (
                <Acoes
                  nome={rascunho.colunas[i].nome}
                  onEditar={() => editar(i)}
                  onExcluir={() => excluir(i)}
                />
              );
            }}
          />
        </div>
      )}
    </section>
  );
}

/* --- a tela -------------------------------------------------------------------- */

export function CadastroEstrutural({
  rascunho,
  onAlterar,
  onVoltar,
  onSalvar,
  onExemplo,
  campoComErro,
}: {
  rascunho: Rascunho;
  onAlterar: (r: Rascunho) => void;
  onVoltar: () => void;
  onSalvar: () => void;
  onExemplo?: () => void;
  campoComErro?: string | null;
}) {
  const { t } = useIdioma();
  const { chave, Icone } = ROTULO_PROBLEMATICA[rascunho.problematica];

  /* A validação sabe a que campo o erro se refere; sem isto a mensagem saía no
     fim de uma página longa, possivelmente fora da tela, e a pessoa tinha de
     procurar sozinha onde ela se aplica. Mesmo recurso da matriz. */
  useEffect(() => {
    if (!campoComErro) return;
    const alvo = document.querySelector<HTMLElement>(`[data-campo="${campoComErro}"]`);
    alvo?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    alvo?.focus({ preventScroll: true });
    /* Só `campoComErro`: o texto do erro saiu daqui e virou toast, então a
       dependência antiga não existe mais. */
  }, [campoComErro]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-64 flex-1">
          <Campo
            rotulo={t("estrutura.problema.nome")}
            ajuda={t("estrutura.problema.nome.ajuda")}
            dica={
              <Dica titulo={t("estrutura.problema.nome.dica.titulo")}>
                {/* O nome da tela para onde a dica manda vem do catálogo dos
                    painéis, que é quem batiza aquela tela. Repetir o nome aqui
                    deixaria a dica citando uma tela que não existe com esse
                    nome no outro idioma. */}
                <p>
                  {t("estrutura.problema.nome.dica.corpo", {
                    tela: t("paineis.salvas.titulo"),
                  })}
                </p>
              </Dica>
            }
          >
            {(props) => (
              <Entrada
                {...props}
                value={rascunho.nome}
                onChange={(e) => onAlterar({ ...rascunho, nome: e.target.value })}
                placeholder={t("estrutura.problema.nome.exemplo")}
              />
            )}
          </Campo>
        </div>

        {/* O objetivo escolhido fica visível o tempo todo: ele muda o que será
            perguntado no fim, e é fácil esquecer qual foi marcado.

            Vinha em cinza-claro, do tamanho de uma legenda, ao lado de um link
            sublinhado que se confundia com texto. Agora o nome do objetivo é a
            palavra mais forte do bloco, com o rótulo pequeno acima dizendo do
            que se trata, e trocar é um botão com contorno -- um alvo, não uma
            frase. */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="flex items-center gap-2.5 rounded-[var(--raio-controle)] border px-3 py-1.5"
            style={{ borderColor: "var(--borda-forte)", background: "var(--painel)" }}
          >
            <Icone size={18} weight="fill" style={{ color: "var(--accent)" }} />
            <span className="flex flex-col leading-tight">
              <span
                className="text-[10.5px] uppercase tracking-wide"
                style={{ color: "var(--tinta-3)" }}
              >
                {t("estrutura.objetivo.rotulo")}
              </span>
              <strong
                className="text-[13.5px] font-semibold"
                style={{ color: "var(--tinta)" }}
              >
                {t(chave)}
              </strong>
            </span>
          </span>
        </div>
      </div>

      {/* Digitar quatro nomes é trivial; definir um critério, com escala e
          direção, é a decisão que define o resultado. Colunas iguais diziam que
          o esforço era o mesmo. */}
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,19rem)_1fr]">
        <BlocoAlternativas rascunho={rascunho} onAlterar={onAlterar} />
        <BlocoCriterios rascunho={rascunho} onAlterar={onAlterar} />
      </div>

      {/* a mensagem fica colada ao botão que a disparou, não no fim da página */}

      <Rodape>
        {onExemplo && (
          <button
            type="button"
            onClick={onExemplo}
            className="tatil text-sm underline underline-offset-2"
            style={{ color: "var(--tinta-3)" }}
          >
            {t("estrutura.exemplo")}
          </button>
        )}
        <Botao onClick={onSalvar} icone={<ArrowRight size={14} weight="bold" />}>
          {t("estrutura.continuar")}
        </Botao>
      </Rodape>
    </div>
  );
}
