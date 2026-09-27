"use client";

/**
 * Troca do tema, na navegação.
 *
 * Fica ao lado do seletor de idioma, e pela mesma razão: é preferência de quem
 * está usando, não configuração do problema. Quem precisa do modo escuro
 * costuma precisar dele na primeira tela, e procurar isso dentro de um menu de
 * ajustes é o tipo de caça que faz a pessoa desistir.
 *
 * Duas formas, porque a barra tem larguras muito diferentes: segmentado de
 * ícones onde há espaço, e linhas nomeadas dentro do menu do celular. A barra
 * já estava no limite da largura numa tela de 390px, e três botões a mais
 * empurrariam o conteúdo para fora.
 *
 * Cor nenhuma sai daqui: tudo vem de classe em `globals.css`. Estilo inline
 * vence regra de classe, e um `:hover` anulado assim não dá erro — só não
 * acontece. Já aconteceu três vezes neste projeto.
 */

import { Desktop, Moon, Sun } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/nucleo";
import { TEMAS, aplicar, gravarTema, lerTema, type Tema } from "@/lib/tema";

const ICONE = {
  sistema: Desktop,
  claro: Sun,
  escuro: Moon,
} as const;

export function SeletorTema({
  variante = "barra",
}: {
  variante?: "barra" | "menu";
}) {
  const { t } = useIdioma();
  /* Começa no padrão e só lê o armazenamento depois de montar: ler durante a
     renderização faria o HTML do servidor divergir do cliente. Quem já escolheu
     não vê lampejo mesmo assim, porque o script de `layout.tsx` já pintou a
     página antes de o React existir -- este estado é só o do controle. */
  const [tema, setTema] = useState<Tema>("sistema");

  useEffect(() => setTema(lerTema()), []);

  /* Em "sistema", trocar a preferência do sistema operacional com a página
     aberta tem de repintar na hora. Sem isto, só repintaria no próximo
     carregamento -- e o modo que se chama "sistema" seria o único a não
     acompanhar o sistema. */
  useEffect(() => {
    aplicar(tema);
    if (tema !== "sistema") return;
    const consulta = window.matchMedia("(prefers-color-scheme: dark)");
    const aoMudar = () => aplicar("sistema");
    consulta.addEventListener("change", aoMudar);
    return () => consulta.removeEventListener("change", aoMudar);
  }, [tema]);

  const escolher = (novo: Tema) => {
    setTema(novo);
    gravarTema(novo);
  };

  if (variante === "menu") {
    return (
      <div role="radiogroup" aria-label={t("nav.tema")} className="grid gap-0.5">
        {TEMAS.map((chave) => {
          const Icone = ICONE[chave];
          const ativo = tema === chave;
          return (
            <button
              key={chave}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => escolher(chave)}
              data-ativo={ativo}
              className="item-tema tatil flex items-center gap-2.5 rounded-[var(--raio-controle)] px-3 py-2.5 text-sm"
            >
              <Icone size={16} weight={ativo ? "fill" : "regular"} aria-hidden />
              {t(`nav.tema.${chave}`)}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label={t("nav.tema")}
      className="grupo-tema flex overflow-hidden rounded-[var(--raio-controle)] border"
    >
      {TEMAS.map((chave) => {
        const Icone = ICONE[chave];
        const ativo = tema === chave;
        return (
          <button
            key={chave}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => escolher(chave)}
            data-ativo={ativo}
            title={t(`nav.tema.${chave}`)}
            className="botao-tema tatil px-2 py-1"
          >
            <Icone size={14} weight={ativo ? "fill" : "regular"} aria-hidden />
            <span className="sr-only">{t(`nav.tema.${chave}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
