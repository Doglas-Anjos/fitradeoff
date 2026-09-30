"use client";

import { Prohibit, TrendDown, TrendUp } from "@phosphor-icons/react";
import { useState } from "react";

import { avisar } from "@/components/Avisos";
import { BlocoLista, aposExcluir, reposicionar } from "@/components/cadastro/BlocoLista";
import { FormularioCriterio } from "@/components/cadastro/FormularioCriterio";
import { useRascunho } from "@/components/entrada/contextoRascunho";
import { ListaArrastavel } from "@/components/ListaArrastavel";
import { Dica, Selo } from "@/components/ui";
import { useIdioma } from "@/lib/i18n";
import { comNos } from "@/lib/i18n/estrutura";
import "@/lib/i18n/nucleo";
import {
  removerCriterio,
  restaurarCriterio,
  temVeto,
  type CriterioRascunho,
} from "@/lib/rascunho";

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

/** Os critérios: o formulário que os define e a lista dos já definidos. */
export function BlocoCriterios() {
  const { t } = useIdioma();
  const {
    estado: rascunho,
    acoes: { atualizar },
  } = useRascunho();
  const [editando, setEditando] = useState<number | null>(null);
  /* Cada abertura de edição é uma sessão nova do formulário, e a `key` dele
     muda com ela: é o que o recarrega com o critério escolhido. Reordenar ou
     excluir outro critério só move o índice, e o que estava sendo digitado
     continua lá. */
  const [sessao, setSessao] = useState(0);
  const recomecar = (i: number | null) => {
    setEditando(i);
    setSessao((s) => s + 1);
  };
  const semCriterios = rascunho.colunas.length === 0;

  const excluir = (i: number) => {
    const criterio = rascunho.colunas[i];
    const valores = new Map(rascunho.linhas.map((l) => [l.nome, l.valores[i] ?? ""]));
    if (editando === i) recomecar(null);
    else setEditando(aposExcluir(editando, i));
    atualizar((r) => removerCriterio(r, i));
    // o critério leva junto uma coluna inteira da matriz
    avisar.desfazivel(
      t("estrutura.criterio.excluido", { nome: criterio.nome }),
      () => atualizar((r) => restaurarCriterio(r, i, criterio, valores)),
      t("acao.desfazer"),
    );
  };

  /* Cada critério é uma coluna da matriz de desempenhos, e os valores de cada
     alternativa vêm na mesma ordem das colunas. Reordenar só a lista de
     critérios deixaria o preço debaixo do prazo em toda a matriz. */
  const reordenar = (ordem: string[]) => {
    const indices = ordem.map(Number);
    setEditando(reposicionar(indices, editando));
    atualizar((r) => ({
      ...r,
      colunas: indices.map((i) => r.colunas[i]),
      linhas: r.linhas.map((l) => ({
        ...l,
        valores: indices.map((i) => l.valores[i] ?? ""),
      })),
    }));
  };

  return (
    <BlocoLista.Raiz id="bloco-criterios" titulo={t("estrutura.criterios.titulo")}>
      <BlocoLista.Cabecalho
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
                termo: <strong>{t("estrutura.criterios.dica.corpo2.termo")}</strong>,
              })}
            </p>
          </Dica>
        }
      />

      <FormularioCriterio
        key={sessao}
        editando={editando}
        onFechar={() => setEditando(null)}
      />

      {semCriterios ? (
        <BlocoLista.Vazio>{t("estrutura.criterios.vazio")}</BlocoLista.Vazio>
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
                <BlocoLista.Acoes
                  nome={rascunho.colunas[i].nome}
                  onEditar={() => recomecar(i)}
                  onExcluir={() => excluir(i)}
                />
              );
            }}
          />
        </div>
      )}
    </BlocoLista.Raiz>
  );
}
