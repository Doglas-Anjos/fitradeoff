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

/** Quem esta logado, como o FasorX informou junto com o token.
 *
 *  Vem na RESPOSTA do pedido de token, e nao de dentro do JWT: o token so
 *  carrega o `sub`, de proposito -- o que nao esta nele nao vaza por ele. */
export type Pessoa = { nome: string; email: string };
let pessoa: Pessoa | null = null;
/** Onde sair. A sessao e do FasorX, e so ele a encerra. */
let urlSair = "";
/** Para onde mandar quem tem sessao mas ainda nao pode entrar (perfil ou termo
 *  de uso pendente). Vem do FasorX num 403; vazio, vai para /entrar/. */
let completar = "";

/** Quem quer saber quando a pessoa muda (a navegacao, para mostrar o nome). */
const ouvintes = new Set<() => void>();
function avisar() {
  ouvintes.forEach((f) => f());
}
export function assinar(f: () => void): () => void {
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
}
export const pessoaAtual = (): Pessoa | null => pessoa;
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
    // 403 com `completar`: ha sessao, mas falta perfil ou o aceite do termo.
    // Mandar para /entrar/ seria mandar quem ja entrou entrar de novo.
    completar = "";
    try {
      const j = (await r.json()) as { completar?: unknown };
      if (typeof j.completar === "string" && j.completar.startsWith(`${FASORX}/`)) {
        completar = j.completar;
      }
    } catch {
      /* corpo sem JSON: vai para /entrar/ */
    }
    if (pessoa !== null) {
      pessoa = null;
      avisar();
    }
    return null;
  }
  if (!r.ok) {
    // Falha de rede ou 5xx nao e falta de sessao. Devolver null aqui mandaria
    // a pessoa para a tela de login por causa de uma oscilacao de rede, e ela
    // perderia o que estava preenchendo.
    throw new Error(`token: ${r.status}`);
  }

  const j = (await r.json()) as {
    token: string;
    validade: number;
    pessoa?: Pessoa;
    sair?: string;
  };
  token = j.token;
  // `validade` vem em segundos a partir de agora.
  vence = Date.now() + j.validade * 1000;
  // So o endereco do proprio FasorX: o link de sair nunca leva a outro lugar.
  if (typeof j.sair === "string" && j.sair.startsWith(`${FASORX}/`)) urlSair = j.sair;
  const nova = j.pessoa && typeof j.pessoa.nome === "string" ? j.pessoa : null;
  if (nova?.nome !== pessoa?.nome || nova?.email !== pessoa?.email) {
    pessoa = nova;
    avisar();
  }
  return token;
}

/** O token de agora, buscando ou renovando se preciso. `null` = sem sessao.
 *
 *  `novo: true` descarta o token em memoria e busca outro, mesmo valido. Serve
 *  para a emissao de chave, que a API so aceita com token emitido ha pouco:
 *  um token de 4 minutos ainda vale, mas ja nao prova que a pessoa acabou de
 *  estar aqui. Uma busca ja em curso serve -- comecou agora. */
export async function obter(opcoes?: { novo?: boolean }): Promise<string | null> {
  if (!identidadeLigada()) return null;
  if (opcoes?.novo && !buscando) vence = 0;
  if (valido()) return token;
  if (buscando) return buscando;

  buscando = buscar().finally(() => {
    buscando = null;
  });
  return buscando;
}

/** Manda para o FasorX -- e pede para voltar para ca depois.
 *
 *  `?volta=fitradeoff` e um NOME, que o FasorX confere contra a lista fixa de
 *  aplicacoes dele; nunca um endereco. Com sessao mas perfil ou termo
 *  pendente, vai direto para a /conta/ de la, que devolve a pessoa aqui depois
 *  de salvar. */
export function urlDeLogin(): string {
  const destino = completar || `${FASORX}/entrar/`;
  return `${destino}${destino.includes("?") ? "&" : "?"}volta=fitradeoff`;
}

/** Vai ao login SEM disjuntor.
 *
 *  Para quando o proprio FasorX disse que nao ha sessao (token 401) ou mandou
 *  completar a conta (403 com `completar`): ai mandar ao login e sempre o
 *  certo, e nao ha laco -- o /entrar/ do FasorX so devolve a pessoa para ca
 *  quando ela TEM sessao e conta pronta. Por isso o Portao usa esta, e nao
 *  `irParaLogin`. */
export function irAoFasorx(): void {
  if (!identidadeLigada()) return;
  window.location.href = urlDeLogin();
}

/** Vai ao login COM disjuntor. So para quando a API DESTA aplicacao recusou
 *  um token que o FasorX acabou de emitir (lib/api.ts). */
export function irParaLogin(): boolean {
  if (!identidadeLigada()) return false;

  // Disjuntor. Aqui o FasorX TEM sessao (acabou de emitir o token) e quem
  // recusa e a API daqui -- JWKS fora do ar, relogio fora da folga, emissor
  // divergente. Mandar ao login devolve a pessoa para ca com outro token, que
  // a API recusa de novo, e tudo recomeca ate o limitador do FasorX responder
  // 429 para o IP inteiro, que numa universidade e o de todo mundo. Na segunda
  // vez em menos de um minuto, para e devolve false: quem chamou mostra o erro.
  //
  // So neste caminho. No Portao, "sem sessao" vem do proprio FasorX, e o
  // disjuntor ali confundia "acabei de entrar e voltei" com um laco -- a
  // pessoa via "nao foi possivel confirmar seu acesso" logo depois do login.
  const CHAVE = "fitradeoff:foi-ao-login";
  try {
    const antes = Number(window.sessionStorage.getItem(CHAVE) || 0);
    if (Date.now() - antes < 60_000) return false;
    window.sessionStorage.setItem(CHAVE, String(Date.now()));
  } catch {
    /* sem sessionStorage (janela privada restrita): segue sem disjuntor */
  }

  window.location.href = urlDeLogin();
  return true;
}

/** Sair. A sessao e do FasorX: a pagina /sair/ de la a encerra. Um POST daqui
 *  para /api/sair seria recusado -- o FasorX so aceita escrita da propria
 *  origem, para que nenhuma aplicacao consiga deslogar alguem sem pedir. */
export function sair(): void {
  if (!identidadeLigada()) return;
  token = null;
  vence = 0;
  window.location.href = urlSair || `${FASORX}/sair/`;
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
