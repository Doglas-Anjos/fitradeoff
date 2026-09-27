"use client";

/**
 * A estrela que marca uma decisão como favorita.
 *
 * Um componente para as duas listas — `DecisoesSalvas` e `PainelSalvas` — pela
 * mesma razão que levou os rótulos e o resumo para `lib/resumoDecisao`: cópia
 * de controle diverge. E o que divergiria aqui é justamente o que não aparece
 * na tela — o `aria-pressed`, o rótulo que diz de qual decisão se trata, o
 * atributo que o CSS lê. Nada disso quebra visivelmente quando erra.
 *
 * Um `<button>` de verdade, e não um ícone clicável: precisa chegar pelo Tab,
 * responder ao Espaço e ao Enter, e anunciar que é alternância. O rótulo não
 * muda com o estado — quem anuncia o estado é o `aria-pressed` — mas carrega o
 * nome da decisão, porque numa lista de vinte itens vinte botões chamados
 * "Favorita" não distinguem nada.
 *
 * Cor, fundo e realce vêm de `.botao-favorita`, em `globals.css`, dirigidos por
 * `data-favorita`. Não de `style` inline: inline vence regra de classe, e o
 * `:hover` anulado assim não dá erro nenhum — some em silêncio. Já aconteceu
 * duas vezes neste arquivo CSS, com os cartões de escolha e com o botão entre
 * eles.
 */

import { Star } from "@phosphor-icons/react";

import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/paineis";

export function BotaoFavorita({
  nome,
  favorita,
  onAlternar,
  desabilitado = false,
  tamanho = 15,
  className = "",
}: {
  /** Nome da decisão: entra no rótulo acessível, não na tela. */
  nome: string;
  favorita: boolean;
  /** Recebe o estado desejado, não um "inverta": é o que a rota também pede. */
  onAlternar: (favorita: boolean) => void;
  desabilitado?: boolean;
  tamanho?: number;
  className?: string;
}) {
  const { t } = useIdioma();

  return (
    <button
      type="button"
      onClick={() => onAlternar(!favorita)}
      disabled={desabilitado}
      aria-pressed={favorita}
      aria-label={t("paineis.salvas.favorita.rotulo", { nome })}
      title={t("paineis.salvas.favorita.dica")}
      data-favorita={favorita ? "true" : "false"}
      className={`tatil botao-favorita shrink-0 rounded-[var(--raio-controle)] p-1.5 ${className}`}
    >
      {/* Preenchida quando marcada. A cor também muda, mas cor sozinha não
          chega a quem não a distingue, e aqui a diferença entre marcada e não
          marcada é a informação inteira do controle. */}
      <Star size={tamanho} weight={favorita ? "fill" : "regular"} aria-hidden />
    </button>
  );
}
