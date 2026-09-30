"use client";

import dynamic from "next/dynamic";

import { IndicadorCalculando } from "@/components/IndicadorCalculando";
import { PainelSalvas } from "@/components/PainelSalvas";
import { TintaCabecalho } from "@/components/TintaCabecalho";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/telas";

import { useDecisao } from "./contexto";

/* As duas metades da página nunca aparecem juntas: sem problema, só a
   entrada; com problema, só a condução. Carregar tudo de uma vez fazia quem
   volta a uma decisão baixar o cadastro inteiro. */
const EntradaProblema = dynamic(
  () => import("@/components/EntradaProblema").then((m) => m.EntradaProblema),
  { loading: () => <div className="esqueleto mt-6 h-64 w-full" /> },
);

/* --- antes de existir um problema: so a entrada de dados --- */
export function NovaDecisao() {
  const { t } = useIdioma();
  const {
    state: { ocupado, erro },
    actions: { receber },
  } = useDecisao();

  return (
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-10 sm:pt-12">
      {/* As salvas continuam a um toque desde a primeira tela - antes elas
          eram um passo da trilha, o que obrigava a sair do cadastro para ver o
          que já existia -, mas não ocupam mais uma coluna da grade: o painel
          se ancora na borda da janela e sobrepõe. Sem coluna reservada, o
          cadastro usa a largura inteira e não muda de tamanho quando alguém
          abre ou fecha a lista. */}
      {/* "Nova decisão" é contexto, não o assunto da tela: o título de cada
          passo é a pergunta daquele passo, e vem de EntradaProblema. */}
      <div className="cabecalho-escuro mb-7 overflow-hidden px-6 py-7 sm:px-8">
        <TintaCabecalho semente={4711} />
        <p className="sobrelinha text-[#8fc5ff]">FITradeoff</p>
        <p className="display mt-2.5 text-[26px] font-semibold text-white sm:text-[30px]">
          {t("tela.decisao.nova")}
        </p>
      </div>
      <div className="superficie-alta p-5 sm:p-8">
        <EntradaProblema onPronto={receber} />
      </div>
      <PainelSalvas onAbrir={receber} ocupado={ocupado} />
      <IndicadorCalculando ativo={ocupado} />
      {erro && (
        <p role="alert" className="mt-5 text-sm" style={{ color: "var(--erro)" }}>
          {erro}
        </p>
      )}
    </main>
  );
}
