"use client";

/**
 * O formulário do critério: o mesmo painel serve para cadastrar e editar,
 * porque os campos são os mesmos e a pessoa já sabe onde eles ficam.
 *
 * O que está sendo digitado mora aqui, e não no bloco da lista: é estado do
 * formulário, que só vira rascunho quando é confirmado. Quem abre a edição de
 * outro critério remonta o formulário (o bloco troca a `key`), e é isso que o
 * carrega com os dados daquele critério.
 */

import { Check, Plus, TrendDown, TrendUp } from "@phosphor-icons/react";
import { useState } from "react";

import { avisar } from "@/components/Avisos";
import { EditorNiveis } from "@/components/cadastro/EditorNiveis";
import { EditorVeto } from "@/components/cadastro/EditorVeto";
import { useRascunho } from "@/components/entrada/contextoRascunho";
import { Botao, Campo, Dica, Entrada, Segmentado } from "@/components/ui";
import { useIdioma } from "@/lib/i18n";
import { traduzir } from "@/lib/i18n/dominio";
import { comNos } from "@/lib/i18n/estrutura";
import "@/lib/i18n/nucleo";
import {
  aceitaVeto,
  adicionarCriterio,
  atualizarCriterio,
  criterioVazio,
  validarCriterio,
  type CriterioRascunho,
} from "@/lib/rascunho";
import type { Direcao } from "@/lib/types";

export function FormularioCriterio({
  editando,
  onFechar,
}: {
  /** O índice do critério em edição, ou `null` para cadastrar um novo. */
  editando: number | null;
  /** A edição terminou -- salva ou desistida. */
  onFechar: () => void;
}) {
  const { t } = useIdioma();
  const {
    estado: rascunho,
    acoes: { atualizar },
  } = useRascunho();
  const [forma, setForma] = useState<CriterioRascunho>(() =>
    editando === null ? criterioVazio() : { ...rascunho.colunas[editando] },
  );

  const mexer = (parcial: Partial<CriterioRascunho>) =>
    setForma({ ...forma, ...parcial });

  /* O formulário volta em branco no mesmo elemento, sem remontar: o foco fica
     no botão que acabou de ser usado, e quem cadastra pelo teclado segue dali. */
  const limpar = () => {
    setForma(criterioVazio());
    if (editando !== null) onFechar();
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
    atualizar((r) =>
      editando === null
        ? adicionarCriterio(r, limpo)
        : atualizarCriterio(r, editando, limpo),
    );
    limpar();
  };

  const discreto = forma.escala === "discreta";

  /* Era tracejado sobre fundo transparente, para ler como "área de
     entrada". Contra o branco do painel o tracejado quase não aparecia, e
     a região de digitação ficava indistinguível da lista de critérios já
     cadastrados logo abaixo. Agora é superfície rebaixada, e a lista é
     erguida: a diferença passa a ser de relevo, que não depende de
     reparar num fio de 1px. */
  return (
    <div className="area-entrada mt-3 space-y-3 p-3.5" data-editando={editando !== null}>
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
                  termo: <strong>{t("estrutura.criterio.escala.continua")}</strong>,
                })}
              </p>
              <p>
                {comNos(t("estrutura.criterio.escala.dica.discreta"), {
                  termo: <strong>{t("estrutura.criterio.escala.discreta")}</strong>,
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
            <span style={{ color: "var(--tinta-2)" }}>{t("estrutura.criterio.inteiro")}</span>
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
      {aceitaVeto(rascunho.problematica) && <EditorVeto criterio={forma} onChange={mexer} />}

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
  );
}
