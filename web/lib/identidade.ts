/** A identidade vinda do FasorX.
 *
 * O desenho, e por que ele e assim
 * ---------------------------------
 * Quem autentica e o FasorX. Esta aplicacao nao tem tela de login, nao guarda
 * senha e nao decide quem e ninguem: ela recebe uma afirmacao assinada e a
 * apresenta a propria API, que confere a assinatura contra o JWKS do FasorX.
 *
 * O token dura 5 minutos. Isso nao e um prazo de sessao -- e curto de
 * proposito, e a renovacao periodica e justamente o mecanismo:
 *
 *   renovar == perguntar ao FasorX "esta pessoa ainda esta logada?"
 *
 * Um JWT, uma vez assinado, vale ate vencer -- ninguem consegue cancela-lo.
 * Fosse ele de 5 horas, sair do FasorX nao teria efeito nenhum aqui durante
 * horas. Com 5 minutos e renovacao, a saida no FasorX derruba esta aplicacao na
 * renovacao seguinte, que e o comportamento pedido.
 *
 * Por que o token fica na MEMORIA
 * --------------------------------
 * Nem localStorage, nem cookie. Em localStorage ele sobreviveria ao fechar da
 * aba e ficaria legivel por qualquer script da pagina. Na memoria, ele morre
 * com a aba e um XSS precisa estar rodando no momento exato para alcanca-lo.
 * O custo -- pedir outro token ao recarregar a pagina -- e uma requisicao.
 */

/** Onde mora quem autentica. Em desenvolvimento nao ha ninguem, e o valor
 *  vazio desliga tudo isto -- que e o que mantem `npm run dev` funcionando sem
 *  um FasorX ao lado. */
const FASORX = process.env.NEXT_PUBLIC_FASORX_URL ?? "";

/** Sobra de seguranca antes do vencimento.
 *
 *  Sem ela, um token buscado 1s antes de vencer chegaria a API ja vencido: a
 *  viagem ate o servidor e o relogio de cada maquina nao sao o mesmo instante.
 *  30s cobrem a rede e um desajuste pequeno de relogio. */
const FOLGA_MS = 30_000;

let token: string | null = null;
let vence = 0;
/** A busca em curso.
 *
 *  Sem isto, cinco chamadas simultaneas da tela -- que e o normal ao abrir uma
 *  analise -- disparariam cinco pedidos de token. Guardando a promessa, as
 *  cinco esperam a mesma. */
let buscando: Promise<string | null> | null = null;

export const identidadeLigada = (): boolean => FASORX !== "";

function valido(): boolean {
  return token !== null && Date.now() < vence - FOLGA_MS;
}

async function buscar(): Promise<string | null> {
  const r = await fetch(`${FASORX}/api/token/fitradeoff`, {
    method: "POST",
    // Sem isto o cookie de sessao do FasorX nao vai junto, porque a requisicao
    // e para outra origem. O cookie chega la por ser host-only de fasorx.com.br
    // -- que e o alvo -- e por subdominio e dominio serem o mesmo site, o que o
    // SameSite=Lax nao barra.
    credentials: "include",
  });

  if (r.status === 401 || r.status === 403) {
    token = null;
    vence = 0;
    return null;
  }
  if (!r.ok) {
    // Falha de rede ou 5xx nao e falta de sessao. Devolver null aqui mandaria
    // a pessoa para a tela de login por causa de uma oscilacao de rede, e ela
    // perderia o que estava preenchendo.
    throw new Error(`token: ${r.status}`);
  }

  const j = (await r.json()) as { token: string; validade: number };
  token = j.token;
  // `validade` vem em segundos a partir de agora.
  vence = Date.now() + j.validade * 1000;
  return token;
}

/** O token de agora, buscando ou renovando se preciso. `null` = sem sessao. */
export async function obter(): Promise<string | null> {
  if (!identidadeLigada()) return null;
  if (valido()) return token;
  if (buscando) return buscando;

  buscando = buscar().finally(() => {
    buscando = null;
  });
  return buscando;
}

/** Manda para o FasorX. A volta e pela tela de aplicacoes, de proposito:
 *  e de la que a pessoa escolhe para onde ir. */
export function irParaLogin(): void {
  if (!identidadeLigada()) return;
  window.location.href = `${FASORX}/entrar/`;
}

/** O cabecalho, ou nada quando nao ha identidade a apresentar. */
export async function cabecalho(): Promise<Record<string, string>> {
  const t = await obter();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** O ping.
 *
 *  Renova o token de tempos em tempos e, com isso, descobre que a sessao do
 *  FasorX acabou -- por vencimento ou porque a pessoa saiu de la.
 *
 *  So com a aba VISIVEL. Uma aba esquecida aberta a noite inteira renovaria a
 *  sessao do FasorX a cada poucos minutos e ela nunca venceria; e o FasorX tem
 *  um teto absoluto justamente porque esta suposicao nao pode ser confiada a
 *  uma so das pontas. Alem disso, uma aba escondida nao tem ninguem olhando,
 *  entao a renovacao nao serve para nada enquanto ela nao volta. */
export function vigiar(aoSair: () => void): () => void {
  if (!identidadeLigada()) return () => {};

  const INTERVALO = 4 * 60 * 1000;

  async function conferir() {
    if (document.visibilityState !== "visible") return;
    try {
      // Forca a renovacao: o que interessa e a resposta do FasorX, e um token
      // ainda valido em memoria nao diz nada sobre a sessao de la.
      vence = 0;
      if ((await obter()) === null) aoSair();
    } catch {
      // Rede instavel nao e sessao encerrada. Tenta de novo no proximo ciclo.
    }
  }

  const id = window.setInterval(conferir, INTERVALO);
  // Ao voltar para a aba, confere na hora: se a sessao caiu enquanto ela estava
  // escondida, a pessoa descobre ao voltar e nao ao clicar em salvar.
  document.addEventListener("visibilitychange", conferir);

  return () => {
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", conferir);
  };
}
