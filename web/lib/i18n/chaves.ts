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
    pt: "Gere uma chave e conduza a decisão de dentro do seu assistente. Ele ganha as ferramentas do método, e quem calcula continua sendo esta plataforma.",
    en: "Generate a key and run the decision from inside your assistant. It gains the method's tools, and this platform remains the one doing the computing.",
    es: "Genere una clave y conduzca la decisión desde su asistente. Este obtiene las herramientas del método, y quien calcula sigue siendo esta plataforma.",
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
    pt: "As decisões criadas pelo assistente são as mesmas que aparecem aqui para você: a chave abre o seu acervo, e só o seu — não uma cópia à parte, nem o de outra pessoa.",
    en: "Decisions created by the assistant are the same ones that show up here for you: the key opens your collection, and only yours — not a separate copy, nor anyone else's.",
    es: "Las decisiones creadas por el asistente son las mismas que aparecen aquí para usted: la clave abre su acervo, y solo el suyo — no una copia aparte, ni el de otra persona.",
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
    pt: "Na URL, a chave pode aparecer em histórico e em log de servidor. Mais reservado: cole a URL sem a chave (terminando em /mcp) e, em Request headers, adicione Authorization com o valor Bearer seguido da chave. Nos dois jeitos, use uma chave só para este cliente e revogue quando parar de usar.",
    en: "In the URL, the key can show up in history and server logs. More private: paste the URL without the key (ending in /mcp) and, under Request headers, add Authorization with the value Bearer followed by the key. Either way, use a key just for this client and revoke it when you stop using it.",
    es: "En la URL, la clave puede aparecer en el historial y en los registros del servidor. Más reservado: pegue la URL sin la clave (terminada en /mcp) y, en Request headers, agregue Authorization con el valor Bearer seguido de la clave. De cualquier forma, use una clave solo para este cliente y revóquela cuando deje de usarla.",
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
    pt: "Pergunte ao assistente se ele tem a ferramenta create_problem. Se tiver, está conectado.",
    en: "Ask the assistant whether it has the create_problem tool. If it does, it is connected.",
    es: "Pregunte al asistente si tiene la herramienta create_problem. Si la tiene, está conectado.",
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
  "tela.chaves.emitidas.vence": {
    pt: "vence em {data}",
    en: "expires on {data}",
    es: "vence el {data}",
  },
  "tela.chaves.emitidas.vencida": {
    pt: "vencida",
    en: "expired",
    es: "vencida",
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

  // --- passo a passo no Claude (web e aplicativo), com as telas ---------------
  /* As imagens sao do Claude em ingles, que e como a interface aparece para a
     maioria; os nomes dos botoes ficam em ingles no texto pelo mesmo motivo --
     e o que a pessoa vai procurar na tela. */
  "tela.chaves.claude.tutorial": {
    pt: "Passo a passo no Claude, com as telas",
    en: "Step by step in Claude, with screenshots",
    es: "Paso a paso en Claude, con capturas",
  },
  "tela.chaves.claude.passo1.titulo": {
    pt: "Adicione o conector",
    en: "Add the connector",
    es: "Agregue el conector",
  },
  "tela.chaves.claude.passo1.texto": {
    pt: "Em Settings › Connectors, clique em Add custom connector. Dê um nome (ex.: FITradeoff), cole a URL acima — com a chave no fim — e clique em Continue.",
    en: "Under Settings › Connectors, click Add custom connector. Give it a name (e.g. FITradeoff), paste the URL above — with the key at the end — and click Continue.",
    es: "En Settings › Connectors, haga clic en Add custom connector. Póngale un nombre (ej.: FITradeoff), pegue la URL de arriba — con la clave al final — y haga clic en Continue.",
  },
  "tela.chaves.claude.passo1.alt": {
    pt: "Janela Add custom connector do Claude, com o nome Fittradeoff e a URL do MCP preenchidos.",
    en: "Claude's Add custom connector window, with the name Fittradeoff and the MCP URL filled in.",
    es: "Ventana Add custom connector de Claude, con el nombre Fittradeoff y la URL del MCP completados.",
  },
  "tela.chaves.claude.passo2.titulo": {
    pt: "Autenticação: No sign-in",
    en: "Authentication: No sign-in",
    es: "Autenticación: No sign-in",
  },
  "tela.chaves.claude.passo2.texto": {
    pt: "O Claude detecta sozinho e marca No sign-in: a chave já vai na URL, então não há login a fazer. Deixe Request headers vazio e clique em Add.",
    en: "Claude detects it and selects No sign-in: the key already travels in the URL, so there is no login. Leave Request headers empty and click Add.",
    es: "Claude lo detecta y marca No sign-in: la clave ya va en la URL, así que no hay inicio de sesión. Deje Request headers vacío y haga clic en Add.",
  },
  "tela.chaves.claude.passo2.alt": {
    pt: "Etapa de autenticação do conector, com No sign-in marcado como detectado e a chave na URL coberta por uma tarja.",
    en: "The connector's authentication step, with No sign-in marked as detected and the key in the URL covered by a bar.",
    es: "Paso de autenticación del conector, con No sign-in marcado como detectado y la clave en la URL cubierta por una franja.",
  },
  "tela.chaves.claude.passo3.titulo": {
    pt: "Escolha as permissões",
    en: "Choose the permissions",
    es: "Elija los permisos",
  },
  "tela.chaves.claude.passo3.texto": {
    pt: "As 14 ferramentas do método aparecem em Tool permissions. Needs approval faz o Claude pedir licença a cada uso; as de consulta (listar, ver, explicar) podem ficar em Always allow.",
    en: "The method's 14 tools show up under Tool permissions. Needs approval makes Claude ask before each use; the read-only ones (list, view, explain) can be set to Always allow.",
    es: "Las 14 herramientas del método aparecen en Tool permissions. Needs approval hace que Claude pida permiso en cada uso; las de consulta (listar, ver, explicar) pueden quedar en Always allow.",
  },
  "tela.chaves.claude.passo3.alt": {
    pt: "Lista de permissões das 14 ferramentas do FITradeoff, todas em Needs approval.",
    en: "Permission list for the 14 FITradeoff tools, all set to Needs approval.",
    es: "Lista de permisos de las 14 herramientas de FITradeoff, todas en Needs approval.",
  },
  "tela.chaves.claude.passo4.titulo": {
    pt: "Use numa conversa",
    en: "Use it in a conversation",
    es: "Úselo en una conversación",
  },
  "tela.chaves.claude.passo4.texto": {
    pt: "Peça algo como “liste minhas decisões no FITradeoff” ou “quero decidir entre três fornecedores”. O Claude pede para usar a ferramenta: Allow once libera só desta vez, Always allow não pergunta mais.",
    en: "Ask something like “list my decisions in FITradeoff” or “I want to choose between three suppliers”. Claude asks to use the tool: Allow once permits it just this time, Always allow stops asking.",
    es: "Pida algo como “liste mis decisiones en FITradeoff” o “quiero decidir entre tres proveedores”. Claude pide usar la herramienta: Allow once lo permite solo esta vez, Always allow deja de preguntar.",
  },
  "tela.chaves.claude.passo4.alt": {
    pt: "Conversa no Claude pedindo permissão para usar a ferramenta Listar problematicas do Fittradeoff, com as opções Deny, Always allow e Allow once.",
    en: "A Claude conversation asking permission to use Fittradeoff's Listar problematicas tool, with the options Deny, Always allow and Allow once.",
    es: "Conversación en Claude pidiendo permiso para usar la herramienta Listar problematicas de Fittradeoff, con las opciones Deny, Always allow y Allow once.",
  },
});
