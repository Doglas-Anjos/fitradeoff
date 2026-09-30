import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api, mensagemDeErro } from "@/lib/api";
import { useIdioma } from "@/lib/i18n";
import { favoritasPrimeiro } from "@/lib/resumoDecisao";
import type { Problema, Problematica, Resumo } from "@/lib/types";

export type Filtro = Problematica | "todos";
export type Ordem = "recente" | "nome";

/**
 * O `Resumo` da API com as duas datas que o motor passou a devolver.
 *
 * `lib/types.ts` está fora do escopo desta mudança, então o tipo mora aqui até
 * o `Resumo` oficial ganhar os campos. As duas são opcionais porque decisão
 * salva antes da mudança volta do servidor sem elas - e sem data o painel não
 * pode inventar uma.
 */
export type ResumoDatado = Resumo & {
  criado_em?: string | null;
  atualizado_em?: string | null;
};

/** Milissegundos, ou `null` quando a data falta ou não é uma data. */
export function instante(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * As decisões salvas do painel lateral: a lista, a busca, o filtro por tipo, a
 * ordem, a estrela e o pedido de abrir uma.
 *
 * A lista só é pedida quando alguém quer vê-la (`carregar`, chamado ao abrir a
 * gaveta). Antes o pedido saía na montagem, e o painel está sempre montado --
 * fechado, no canto -- e remonta a cada decisão aberta: cada troca de decisão
 * disparava uma ida ao servidor por uma lista que quase ninguém ia olhar.
 */
export function useDecisoesSalvas({ locale }: { locale: string }) {
  const { t } = useIdioma();
  const [itens, setItens] = useState<ResumoDatado[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<Filtro>("todos");
  const [ordem, setOrdem] = useState<Ordem>("recente");
  const [abrindo, setAbrindo] = useState<string | null>(null);

  /* O texto de erro é escolhido quando o erro acontece, no idioma daquele
     momento. Capturado pelo efeito da montagem, ele ficava no idioma em que a
     tela nasceu, mesmo depois de a pessoa trocar. */
  const traduzir = useRef(t);
  useEffect(() => {
    traduzir.current = t;
  });

  const montado = useRef(false);
  const pedida = useRef(false);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  /** Pede a lista uma vez por montagem. Chamar de novo não faz nada. */
  const carregar = useCallback(() => {
    if (pedida.current) return;
    pedida.current = true;
    api
      .listar()
      .then((r) => montado.current && setItens(r.decisoes))
      .catch((e) => {
        if (!montado.current) return;
        /* Lista vazia com o motivo à vista, nunca uma coluna em branco: a falha
           é da rede, e o resto da tela continua utilizável. */
        setItens([]);
        setErro(mensagemDeErro(e, traduzir.current("paineis.erro.servidor")));
      });
  }, []);

  const filtradas = useMemo(() => {
    if (!itens) return null;
    const termo = busca.trim().toLowerCase();
    const visiveis = itens.filter(
      (r) =>
        (tipo === "todos" || r.problematica === tipo) &&
        (termo === "" || r.nome.toLowerCase().includes(termo)),
    );
    const alfabetica = new Intl.Collator(locale, { sensitivity: "base" });
    return visiveis.sort((a, b) => {
      /* As favoritas sobem acima do critério escolhido, inclusive do alfabeto:
         quem marcou quer aquelas decisões no topo, não espalhadas pela lista
         conforme a inicial do nome. Empatadas, decide o critério de sempre. */
      const destaque = favoritasPrimeiro(a, b);
      if (destaque !== 0) return destaque;
      if (ordem === "nome") return alfabetica.compare(a.nome, b.nome);
      const ia = instante(a.atualizado_em);
      const ib = instante(b.atualizado_em);
      /* Sem data não se inventa posição: o item cai para o fim da lista, e
         entre os sem data vale a ordem que o servidor mandou. */
      if (ia === null && ib === null) return 0;
      if (ia === null) return 1;
      if (ib === null) return -1;
      return ib - ia;
    });
  }, [itens, busca, tipo, ordem, locale]);

  const alternarFavorita = async (id: string, favorita: boolean) => {
    /* A estrela troca antes da resposta do servidor: marcar é um gesto barato e
       repetido, e esperar o ida-e-volta para ela acender faria a lista parecer
       travada. Falhando o pedido, ela volta ao que era e o motivo aparece -- o
       que não pode acontecer é o painel afirmar um favorito que o servidor não
       tem. */
    const marcar = (valor: boolean) =>
      setItens(
        (atual) =>
          atual?.map((r) => (r.id === id ? { ...r, favorita: valor } : r)) ?? null,
      );

    setErro(null);
    marcar(favorita);
    try {
      await api.favoritar(id, favorita);
    } catch (e) {
      marcar(!favorita);
      setErro(mensagemDeErro(e, t("paineis.erro.favoritar")));
    }
  };

  /** Busca o problema completo e o entrega. Devolve se deu certo. */
  const abrir = async (
    id: string,
    entregar: (problema: Problema) => void,
  ): Promise<boolean> => {
    setAbrindo(id);
    setErro(null);
    try {
      entregar(await api.ver(id));
      return true;
    } catch (e) {
      setErro(mensagemDeErro(e, t("paineis.erro.abrir")));
      return false;
    } finally {
      setAbrindo(null);
    }
  };

  return {
    itens,
    filtradas,
    erro,
    busca,
    setBusca,
    tipo,
    setTipo,
    ordem,
    setOrdem,
    abrindo,
    carregar,
    alternarFavorita,
    abrir,
  };
}
