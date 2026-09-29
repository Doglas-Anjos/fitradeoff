"use client";

/** A aplicacao so aparece para quem esta logado no FasorX.
 *
 * Enquanto o FasorX nao confirma a sessao, a tela e so um aviso leve de
 * "verificando". Sem sessao, a pessoa vai para https://fasorx.com.br/entrar/
 * -- e volta para ca depois de entrar (ver irParaLogin).
 *
 * O que isto e, e o que nao e
 * ---------------------------
 * E a porta da FRENTE: quem nao esta logado nao ve a aplicacao. A seguranca
 * dos DADOS nao mora aqui -- o JavaScript da pagina e publico de qualquer jeito,
 * e quem guarda as decisoes e a API, que recusa com 401 todo pedido sem um
 * token valido do FasorX. Este componente so evita mostrar uma tela que nao
 * vai funcionar.
 *
 * O HTML que o servidor manda ja e o do "verificando": o estado inicial e
 * esse, entao nem o markup da aplicacao chega antes da confirmacao.
 */

import { useEffect, useState } from "react";

import { MarcaFasorx } from "@/components/MarcaFasorx";
import { useIdioma } from "@/lib/i18n";
import "@/lib/i18n/nucleo";
import { identidadeLigada, irParaLogin, obter } from "@/lib/identidade";

type Estado = "verificando" | "liberado" | "falha";

export function Portao({ children }: { children: React.ReactNode }) {
  const { t } = useIdioma();
  // Sem FasorX configurado (instalacao local, `npm run dev`) nao ha quem
  // confirmar: a aplicacao abre direto, como sempre abriu.
  const [estado, setEstado] = useState<Estado>(identidadeLigada() ? "verificando" : "liberado");
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!identidadeLigada()) return;
    let vivo = true;
    obter()
      .then((token) => {
        if (!vivo) return;
        if (token) setEstado("liberado");
        // Sem sessao: fica no "verificando" enquanto o navegador troca de
        // pagina, em vez de piscar a aplicacao antes de sair. Se o disjuntor
        // segurou (acabou de voltar do FasorX sem conseguir), mostra a falha.
        else if (!irParaLogin()) setEstado("falha");
      })
      .catch(() => {
        // Rede ou 5xx nao e falta de sessao -- nao manda para o login.
        if (vivo) setEstado("falha");
      });
    return () => {
      vivo = false;
    };
  }, [tentativa]);

  if (estado === "liberado") return <>{children}</>;

  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center"
      aria-busy={estado === "verificando"}
    >
      <span style={{ color: "var(--tinta-fraca)" }}>
        <MarcaFasorx tamanho={36} />
      </span>
      <p role="status" aria-live="polite" className="text-sm" style={{ color: "var(--tinta-2)" }}>
        {estado === "verificando" ? t("portao.verificando") : t("portao.falha")}
      </p>
      {estado === "falha" && (
        <button
          type="button"
          onClick={() => {
            setEstado("verificando");
            setTentativa((n) => n + 1);
          }}
          className="tatil rounded-[var(--raio-controle)] border px-4 py-2 text-sm"
          style={{ borderColor: "var(--borda)", color: "var(--tinta)" }}
        >
          {t("portao.tentar")}
        </button>
      )}
    </main>
  );
}
