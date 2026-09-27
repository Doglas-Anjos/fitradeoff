/**
 * Catálogo da tela de chaves do MCP.
 *
 * Quem chega aqui pode nunca ter ouvido falar de MCP, e o texto assume isso: a
 * tela explica o que a conexão dá antes de pedir qualquer coisa. Três escolhas
 * de redação valem registro:
 *
 * **"Chave", e não "token" nem "API key".** O decisor desta plataforma é da
 * área de decisão, não de infraestrutura. "Chave" ele entende sem glossário, e
 * a metáfora é honesta: abre uma porta, e pode ser trocada.
 *
 * **O aviso de que o texto aparece uma vez vem junto do texto, não depois.**
 * Um aviso que só aparece quando já é tarde não é aviso.
 *
 * **Nomes de cliente não se traduzem.** "Claude Code", "Cursor", "VS Code" são
 * nomes próprios; traduzi-los faria a pessoa procurar um programa que não
 * existe. O mesmo vale para o caminho do painel do Claude, que a tela reproduz
 * como aparece no idioma da interface dele - em inglês, que é o padrão dela.
 */

import { registrar } from "./index";
import "./nucleo";

export const CHAVES = registrar({
  "tela.chaves.editorial": { pt: "Conexão", en: "Connection", es: "Conexión" },
  "tela.chaves.titulo": {
    pt: "Chaves do MCP",
    en: "MCP keys",
    es: "Claves del MCP",
  },
  "tela.chaves.descricao": {
    pt: "Gere uma chave e conduza a decisão de dentro do seu assistente. Ele ganha as catorze ferramentas do método, e quem calcula continua sendo esta plataforma.",
    en: "Generate a key and run the decision from inside your assistant. It gains the method's fourteen tools, and this platform remains the one doing the computing.",
    es: "Genere una clave y conduzca la decisión desde su asistente. Este obtiene las catorce herramientas del método, y quien calcula sigue siendo esta plataforma.",
  },

  // --- o que a conexão dá -----------------------------------------------------
  "tela.chaves.oque.titulo": {
    pt: "O que a chave abre",
    en: "What the key opens",
    es: "Qué abre la clave",
  },
  "tela.chaves.oque.p1": {
    pt: "MCP é o protocolo por onde um assistente usa ferramentas de fora. Conectado a este servidor, ele monta o problema, propõe a ordem dos critérios, faz as perguntas de tradeoff e explica o resultado. Nada disso ele calcula por conta própria: cada passo é uma chamada ao método, com os mesmos números que a tela de decisão mostraria.",
    en: "MCP is the protocol through which an assistant uses outside tools. Connected to this server, it builds the problem, proposes the criteria order, asks the tradeoff questions and explains the result. It computes none of that on its own: every step is a call into the method, with the same numbers the decision screen would show.",
    es: "MCP es el protocolo por el cual un asistente usa herramientas externas. Conectado a este servidor, arma el problema, propone el orden de los criterios, hace las preguntas de tradeoff y explica el resultado. Nada de eso lo calcula por su cuenta: cada paso es una llamada al método, con los mismos números que mostraría la pantalla de decisión.",
  },
  "tela.chaves.oque.p2": {
    pt: "As decisões criadas pelo assistente são as mesmas que aparecem aqui: a chave abre o acervo desta plataforma, não uma cópia à parte.",
    en: "Decisions created by the assistant are the same ones that show up here: the key opens this platform's collection, not a separate copy.",
    es: "Las decisiones creadas por el asistente son las mismas que aparecen aquí: la clave abre el acervo de esta plataforma, no una copia aparte.",
  },
  "tela.chaves.oque.p3": {
    pt: "Uma chave por cliente, e revogar uma não derruba as outras. Quem tem a chave entra, então trate-a como senha.",
    en: "One key per client, and revoking one does not bring down the others. Whoever holds the key gets in, so treat it like a password.",
    es: "Una clave por cliente, y revocar una no derriba las otras. Quien tiene la clave entra, así que trátela como una contraseña.",
  },

  // --- emitir -----------------------------------------------------------------
  "tela.chaves.emitir.titulo": {
    pt: "Gerar uma chave",
    en: "Generate a key",
    es: "Generar una clave",
  },
  "tela.chaves.emitir.rotulo": {
    pt: "Onde esta chave vai ser usada",
    en: "Where this key will be used",
    es: "Dónde se usará esta clave",
  },
  "tela.chaves.emitir.ajuda": {
    pt: "O nome não vai para lugar nenhum além desta lista. Serve para você reconhecer qual revogar depois.",
    en: "The name goes nowhere but this list. It is there so you can tell which one to revoke later.",
    es: "El nombre no va a ningún lugar más que esta lista. Sirve para que usted reconozca cuál revocar después.",
  },
  "tela.chaves.emitir.exemplo": {
    pt: "Claude na web",
    en: "Claude on the web",
    es: "Claude en la web",
  },
  "tela.chaves.emitir.acao": {
    pt: "Gerar chave",
    en: "Generate key",
    es: "Generar clave",
  },
  "tela.chaves.emitir.gerando": { pt: "Gerando…", en: "Generating…", es: "Generando…" },

  "tela.chaves.nova.titulo": {
    pt: "A chave, uma vez só",
    en: "The key, just this once",
    es: "La clave, una sola vez",
  },
  "tela.chaves.nova.aviso": {
    pt: "Este texto não fica guardado em lugar nenhum, nem aqui. Copie agora: se perder, revogue esta chave e gere outra.",
    en: "This text is not stored anywhere, not even here. Copy it now: if you lose it, revoke this key and generate another.",
    es: "Este texto no queda guardado en ningún lugar, ni aquí. Cópielo ahora: si lo pierde, revoque esta clave y genere otra.",
  },
  /* O mesmo texto que as frases acima citam: se divergir, a tela mandaria
     procurar por uma palavra que não está em trecho nenhum. */
  "tela.chaves.placeholder": { pt: "SUA_CHAVE", en: "YOUR_KEY", es: "SU_CLAVE" },
  "tela.chaves.copiar": { pt: "Copiar", en: "Copy", es: "Copiar" },
  "tela.chaves.copiado": { pt: "Copiado", en: "Copied", es: "Copiado" },
  "tela.chaves.copiar.falhou": {
    pt: "Não foi possível copiar. Selecione o texto e copie à mão.",
    en: "Could not copy. Select the text and copy it by hand.",
    es: "No se pudo copiar. Seleccione el texto y cópielo a mano.",
  },

  // --- conectar ---------------------------------------------------------------
  "tela.chaves.conectar.titulo": {
    pt: "Conectar o cliente",
    en: "Connect the client",
    es: "Conectar el cliente",
  },
  "tela.chaves.conectar.semChave": {
    pt: "Os trechos abaixo mostram SUA_CHAVE no lugar da chave. Gere uma acima e eles saem prontos para colar.",
    en: "The snippets below show YOUR_KEY in place of the key. Generate one above and they come out ready to paste.",
    es: "Los fragmentos de abajo muestran SU_CLAVE en lugar de la clave. Genere una arriba y saldrán listos para pegar.",
  },
  "tela.chaves.cliente.claude": {
    pt: "Claude (web e aplicativo)",
    en: "Claude (web and app)",
    es: "Claude (web y aplicación)",
  },
  "tela.chaves.cliente.code": { pt: "Claude Code", en: "Claude Code", es: "Claude Code" },
  "tela.chaves.cliente.editor": {
    pt: "Cursor e VS Code",
    en: "Cursor and VS Code",
    es: "Cursor y VS Code",
  },
  "tela.chaves.claude.passos": {
    pt: "Em Settings › Connectors › Add custom connector, cole esta URL:",
    en: "Under Settings › Connectors › Add custom connector, paste this URL:",
    es: "En Settings › Connectors › Add custom connector, pegue esta URL:",
  },
  "tela.chaves.claude.nota": {
    pt: "O painel do Claude aceita só a URL, sem campo de cabeçalho, e é por isso que a chave vai dentro dela. Uma chave assim aparece em histórico de navegador e em log de servidor: use uma chave dedicada a este cliente, e revogue quando parar de usar.",
    en: "Claude's panel takes only the URL, with no header field, which is why the key goes inside it. A key carried that way shows up in browser history and server logs: use a key dedicated to this client, and revoke it when you stop using it.",
    es: "El panel de Claude acepta solo la URL, sin campo de encabezado, y por eso la clave va dentro de ella. Una clave así aparece en el historial del navegador y en los registros del servidor: use una clave dedicada a este cliente, y revóquela cuando deje de usarla.",
  },
  "tela.chaves.code.passos": {
    pt: "No terminal, uma vez por máquina:",
    en: "In the terminal, once per machine:",
    es: "En la terminal, una vez por máquina:",
  },
  "tela.chaves.editor.passos": {
    pt: "No arquivo de configuração de MCP do editor:",
    en: "In the editor's MCP configuration file:",
    es: "En el archivo de configuración MCP del editor:",
  },
  "tela.chaves.conectar.conferir": {
    pt: "Pergunte ao assistente se ele tem a ferramenta criar_problema. Se tiver, está conectado.",
    en: "Ask the assistant whether it has the criar_problema tool. If it does, it is connected.",
    es: "Pregunte al asistente si tiene la herramienta criar_problema. Si la tiene, está conectado.",
  },

  // --- alcance ----------------------------------------------------------------
  "tela.chaves.local.titulo": {
    pt: "Este endereço só vale nesta máquina",
    en: "This address only works on this machine",
    es: "Esta dirección solo vale en esta máquina",
  },
  "tela.chaves.local.texto": {
    pt: "O Claude na web roda nos servidores da Anthropic, e de lá ninguém alcança o 127.0.0.1 do seu computador. Num cliente que roda aqui - Claude Code, Cursor, VS Code - este endereço já serve. Para conectar de fora, publique a API num endereço alcançável, declare o domínio em FITRADEOFF_MCP_HOSTS e aponte FITRADEOFF_MCP_URL para ele.",
    en: "Claude on the web runs on Anthropic's servers, and from there nobody can reach 127.0.0.1 on your computer. For a client running here - Claude Code, Cursor, VS Code - this address already works. To connect from outside, publish the API at a reachable address, declare the domain in FITRADEOFF_MCP_HOSTS and point FITRADEOFF_MCP_URL at it.",
    es: "Claude en la web corre en los servidores de Anthropic, y desde allí nadie alcanza el 127.0.0.1 de su computadora. En un cliente que corre aquí - Claude Code, Cursor, VS Code - esta dirección ya sirve. Para conectar desde fuera, publique la API en una dirección alcanzable, declare el dominio en FITRADEOFF_MCP_HOSTS y apunte FITRADEOFF_MCP_URL a él.",
  },

  // --- emitidas ---------------------------------------------------------------
  "tela.chaves.emitidas.titulo": {
    pt: "Chaves emitidas",
    en: "Keys issued",
    es: "Claves emitidas",
  },
  "tela.chaves.emitidas.vazio": {
    pt: "Nenhuma chave emitida ainda.",
    en: "No keys issued yet.",
    es: "Ninguna clave emitida todavía.",
  },
  "tela.chaves.emitidas.criada": {
    pt: "Criada em {data}",
    en: "Created on {data}",
    es: "Creada el {data}",
  },
  "tela.chaves.emitidas.uso": {
    pt: "Usada por último em {data}",
    en: "Last used on {data}",
    es: "Usada por última vez el {data}",
  },
  "tela.chaves.emitidas.semUso": {
    pt: "Nunca usada",
    en: "Never used",
    es: "Nunca usada",
  },
  "tela.chaves.revogar": { pt: "Revogar", en: "Revoke", es: "Revocar" },
  "tela.chaves.revogar.confirma": {
    pt: "Revogar a chave {rotulo}? O cliente que usa esta chave para de funcionar na hora.",
    en: "Revoke the key {rotulo}? Whatever client uses this key stops working immediately.",
    es: "¿Revocar la clave {rotulo}? El cliente que usa esta clave deja de funcionar de inmediato.",
  },
  "tela.chaves.revogada": {
    pt: "Chave revogada.",
    en: "Key revoked.",
    es: "Clave revocada.",
  },
  "tela.chaves.carregando": { pt: "Carregando…", en: "Loading…", es: "Cargando…" },
});
