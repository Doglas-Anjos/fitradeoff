"use client";

/**
 * As decisoes que este navegador ja abriu.
 *
 * Sem login nao ha "minhas decisoes" no servidor, mas o identificador de cada
 * uma e o suficiente para voltar. Guardar essa lista localmente e o que evita
 * que fechar a aba signifique perder o trabalho -- que e o pior jeito de
 * descobrir que o sistema nao tem contas.
 */

import { ArrowRight, ClockCounterClockwise, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { esquecerRecente, lerRecentes, type Recente } from "@/lib/persistencia";

function quando(instante: number): string {
  const minutos = Math.round((Date.now() - instante) / 60000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "ontem" : `há ${dias} dias`;
}

export function Recentes() {
  const [itens, setItens] = useState<Recente[] | null>(null);

  // so depois da montagem: ler o armazenamento na renderizacao faria o HTML do
  // servidor divergir do cliente
  useEffect(() => setItens(lerRecentes()), []);

  if (!itens || itens.length === 0) return null;

  return (
    <section className="mt-10">
      <h2
        className="mb-3 flex items-center gap-1.5 text-[13px] font-medium"
        style={{ color: "var(--tinta-3)" }}
      >
        <ClockCounterClockwise size={14} />
        Voltar a uma decisão
      </h2>

      <ul className="divide-y" style={{ borderColor: "var(--borda)" }}>
        {itens.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-2">
            <Link
              href={`/decisao?id=${item.id}`}
              className="tatil group flex min-w-0 flex-1 items-center gap-2 text-sm"
              style={{ color: "var(--tinta-2)" }}
            >
              <span className="truncate">{item.nome}</span>
              <span className="text-[11px]" style={{ color: "var(--tinta-fraca)" }}>
                {quando(item.em)}
              </span>
              <ArrowRight
                size={13}
                className="opacity-0 transition-opacity group-hover:opacity-100"
                style={{ color: "var(--accent)" }}
              />
            </Link>
            <button
              onClick={() => {
                esquecerRecente(item.id);
                setItens(lerRecentes());
              }}
              aria-label={`Remover ${item.nome} da lista`}
              className="tatil shrink-0"
              style={{ color: "var(--tinta-fraca)" }}
            >
              <X size={13} weight="bold" />
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-[11px]" style={{ color: "var(--tinta-fraca)" }}>
        Esta lista fica só neste navegador. As decisões em si ficam no servidor.
      </p>
    </section>
  );
}
