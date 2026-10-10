<!-- Extraido do README para encurta-lo; e o runbook de operacao do MCP remoto. -->

# Publicar o MCP

Para o assistente chamar o método de fora desta máquina, o servidor precisa estar num endereço
alcançável — e o que se publica **não** é a porta 8000.

### A superfície pública

`fitradeoff_api.mcp_remoto` serve `/mcp` e `/saude`, e mais nada. Não é uma regra de proxy: é um
aplicativo que não tem as outras rotas. Uma regra de proxy está a um erro de digitação de publicar
`/api` junto — e esse erro não aparece em teste nenhum,
aparece quando alguém acha as decisões. [`test_mcp_remoto.py`](api/tests/test_mcp_remoto.py)
afirma pela negativa o que este aplicativo não serve.

```bash
uvicorn fitradeoff_api.mcp_remoto:app --host 0.0.0.0 --port 8765
```

### Num hospedeiro

```bash
FITRADEOFF_MCP_HOSTS=fit.seu-dominio.org docker compose up -d
docker compose run --rm mcp python -m fitradeoff_api.chaves criar "Claude na web"
```

O [`compose.yml`](compose.yml) sobe um serviço só, preso ao loopback do hospedeiro: quem termina o
TLS e publica é o proxy na frente. O claude.ai só aceita `https`, então isso não é opcional.

A tela de chaves fica de fora do hospedeiro de propósito — ela mora no aplicativo local. Num
servidor, chave se emite por comando, no mesmo volume:
`python -m fitradeoff_api.chaves criar|listar|revogar`.

O volume `fitradeoff` guarda as decisões e o cofre. Recriá-lo revoga todas as chaves de uma vez.

### Para experimentar hoje, sem hospedar nada

```powershell
.\publicar.ps1 -NovaChave "Claude na web"
```

Abre um túnel `https` temporário (precisa de `cloudflared`), declara o domínio sorteado em
`FITRADEOFF_MCP_HOSTS` e imprime a URL pronta para colar no painel de conectores. O endereço muda
a cada execução, então serve para provar que funciona, não para uso continuado.

### O que protege a porta

A proteção mais forte é não publicar esta porta. Com a aplicação principal na frente, o endereço
público é o dela: o MCP fica no loopback do hospedeiro (é o que o `compose.yml` faz) ou numa
interface privada, com o firewall recusando o resto. Não precisa de certificado nem de domínio
próprio.

O resto é o que vale **se** alguém alcançar a porta assim mesmo:

| Camada | O que faz |
|---|---|
| Credencial obrigatória | toda chamada a `/mcp` precisa de chave do cofre ou token assinado; sem ela, `401` — e o `401` não diz por quê, para não virar oráculo |
| Superfície mínima | só `/mcp` e `/saude` existem. Sem `/api`, sem `/docs`, sem emitir chave |
| Escopo por identidade | uma credencial válida abre **o acervo dela**, não o dos outros |
| Algoritmo fixado | o JWT é verificado com o algoritmo que nós configuramos, nunca o que ele declara; `exp` exigido, `iss` e `aud` conferidos |
| Chaves do cofre | 256 bits, guardadas por resumo, comparadas em tempo constante; vencem (90 dias por padrão); revogar vale na chamada seguinte, porque o índice do cofre é refeito sempre que o arquivo muda |
| Cofre compartilhado | `api` e `mcp` gravam o mesmo `chaves.json` sob trava de arquivo, com provisório único e `fsync`; arquivo ilegível nunca é sobrescrito por uma lista vazia |
| `Host` declarado | quem chega por um nome fora de `FITRADEOFF_MCP_HOSTS` é recusado |
| Corpo limitado | 4 MiB por requisição, teto do próprio SDK |
| Custo limitado | 500 alternativas, 30 critérios, 200 amostras, 20 limiares — o preço de uma requisição é limitado por construção, não por sorte |
| Log limpo | a chave que viaja na URL é apagada do escopo antes de a requisição seguir, então não chega ao registro de acesso |
| Processo sem privilégio | o container roda como usuário comum, dono apenas do próprio volume |
| Cofre desligável | atrás da aplicação principal, `FITRADEOFF_ACEITAR_CHAVES_DO_COFRE=0` deixa só a asserção assinada |

E o que **não** está coberto — por escolha, não por esquecimento:

- **Não há limite de taxa.** O lugar dele é a borda, que vê o tráfego inteiro; espalhar o controle
  por dois lugares faria os dois discordarem.
- **A quantidade de decisões não tem teto.** O método existe para reduzir o que se pede ao decisor;
  pôr um teto no número de decisões limitaria o produto para resolver um problema que é de
  operação. O controle certo é de infraestrutura — acompanhar o espaço do volume.
- **O log da aplicação da frente é dela.** O nosso não guarda mais a chave; o dela guarda, se ela
  encaminhar na URL. Por isso o contrato pede o cabeçalho `Authorization`.

### Atrás de outra aplicação

Quando o MCP fica atrás da aplicação principal, quem sabe quem está logado é ela — nós não temos
sessão, nem cookie, nem como perguntar. Então ela **afirma**, assinando, e nós verificamos a
assinatura:

```
chat  ──►  aplicação principal  ──►  MCP
                (autentica)        (verifica a assinatura,
                                    abre o acervo daquela pessoa)
```

O que ela manda, em cada requisição encaminhada:

```http
Authorization: Bearer <JWT>
```

O que o token precisa trazer:

| Claim | Papel |
|---|---|
| `sub` | quem é a pessoa. É o que separa um acervo do outro, então precisa ser estável |
| `exp` | validade. Exigido sempre, e **limitado**: um token que valha mais que `FITRADEOFF_JWT_MAX_VALIDADE` (padrão 15min) é recusado |
| `iss` | quem assinou, conferido contra `FITRADEOFF_JWT_ISSUER` |
| `aud` | para quem o token vale, conferido contra `FITRADEOFF_JWT_AUDIENCE` |

Assinatura em **RS256** (ela publica a chave pública num JWKS, e roda a chave quando quiser) ou
**HS256** (segredo compartilhado, mais simples, mas quem tem o segredo emite tokens). O algoritmo
aceito é o que **nós** configuramos, nunca o que o token declara — aceitar o do cabeçalho é o
defeito clássico desta família, e é o que transforma uma chave pública em chave de assinatura.
Há teste para isso.

Sem `FITRADEOFF_JWT_JWKS_URL` nem `FITRADEOFF_JWT_SECRET`, nenhum token é aceito: só as chaves do
cofre entram. Um verificador que aceitasse qualquer assinatura seria pior do que não existir.

Com `FITRADEOFF_JWT_JWKS_URL`, **`FITRADEOFF_JWT_ISSUER` e `FITRADEOFF_JWT_AUDIENCE` são
obrigatórias**: sem as duas o processo não parte, e o registro diz qual falta. A chave pública de
um JWKS costuma assinar tudo o que aquele emissor emite; sem `aud` conferido, um token que a
aplicação da frente emitiu para outro serviço dela entraria aqui. Os tokens, por sua vez, precisam
trazer `iss` e `aud`. No HS256 o público continua opcional — o segredo é só das duas pontas.

**O emissor não muda depois de publicado.** Ele entra no nome do diretório de cada pessoa; trocar
`FITRADEOFF_JWT_ISSUER` deixa todos os acervos para trás. A barra no fim é ignorada
(`https://x.org` e `https://x.org/` dão o mesmo diretório), mas qualquer outra diferença conta.

Token assinado vai **só no cabeçalho** `Authorization`. Na URL (`/mcp/<credencial>`) só a chave
do cofre (`fit_...`) é aceita: um JWT no caminho ficaria gravado em log de proxy, e não há como
revogá-lo antes de expirar.

**Cada `sub` abre o próprio acervo**, ao lado do acervo do dono da plataforma — e a identidade
nunca vira componente de caminho: o diretório é o resumo de `iss` + `sub`. Um identificador cru
traria junto o problema do `..` e deixaria a lista de quem usa a plataforma legível no disco.

Não há lista de revogação: um token vazado vale até expirar. Por isso a janela é curta e o teto
é **nosso** — pedir tokens curtos e aceitar os longos assim mesmo seria pedir por educação o que
não se verifica. A aplicação da frente assina a cada requisição que encaminha, então minutos
bastam.

**Ela manda no cabeçalho `Authorization`, nunca na URL.** A forma com a chave na URL existe por
causa do painel do claude.ai, que não tem campo de cabeçalho; a aplicação principal é servidor e
não tem essa limitação. Um token na URL entra no registro de acesso dela, e aí o segredo está em
disco do lado de lá.

**As rotas de `/api` passam a exigir a mesma afirmação.** Configurar um verificador é o que fecha
a porta: sem ele, a instalação local segue atendendo sem cadastro, como sempre; com ele, não há
mais chamada anônima, e cada `sub` alcança o próprio acervo — decisões e rascunho. O estado
perigoso, publicado e aberto, não é alcançável por esquecimento, porque é a mesma configuração que
liga a integração e que tranca a porta.

**Cada pessoa emite a própria chave, e ela abre só o próprio acervo.** Na tela *Conectar*, quem
entrou pela aplicação principal emite, lista e revoga as próprias chaves — e a chave guarda o
**dono** (o mesmo resumo de `iss` + `sub` que nomeia o diretório do acervo), então o assistente
dessa pessoa grava onde ela vê na tela, e em nenhum outro lugar. Ninguém vê nem revoga a chave de
outra pessoa. Até 10 chaves por pessoa.

Emitir exige **sessão confirmada agora**: o token do FasorX precisa ter no máximo 120 s
(`FITRADEOFF_CHAVE_TOKEN_RECENTE_S`), e a tela busca um novo logo antes de emitir. Sem isso, um
token de 5 minutos vazado viraria uma chave de 90 dias. Token velho leva `403` ("Entre de novo
para emitir uma chave"). O acervo de cada pessoa tem teto de decisões
(`FITRADEOFF_MAX_DECISOES_POR_PESSOA`, 300) em todos os caminhos de criação — tela, planilha,
chat e `create_problem` do MCP —; acima dele, `409`.

As chaves **do dono da plataforma** — emitidas pela linha de comando (`python -m
fitradeoff_api.chaves criar`) ou com `FITRADEOFF_ADMIN_TOKEN` — continuam abrindo o acervo
principal, e continuam exigindo esse token para serem emitidas de fora.

Para as pessoas conectarem o assistente, o servidor do MCP precisa aceitar as chaves do cofre
(`FITRADEOFF_ACEITAR_CHAVES_DO_COFRE=1`, o padrão do serviço `mcp`). Desligar (`=0`) remove o vetor
da chave vazada em log de proxy ou em histórico de navegador, ao preço de ninguém conectar o
assistente pelo servidor publicado.

Se o encaminhamento dela acumular a resposta antes de repassar, a ferramenta parece travar sem
erro nenhum. `FITRADEOFF_MCP_JSON=1` troca o fluxo de eventos por um JSON só, e aí não há o que
acumular. Nada se perde: a troca custaria as perguntas do servidor de volta ao cliente, e nenhuma
das ferramentas faz isso.

Três coisas que costumam morder na integração:

- O `Host` que a aplicação da frente encaminha precisa estar em `FITRADEOFF_MCP_HOSTS`. Se ela
  reescreve para um nome interno, é esse nome que vai na lista — senão, `421`.
- Relógios. A folga é de 30s nos dois sentidos; além disso, token recusado sem explicação útil do
  outro lado.
- A chave do cofre (`fit_...`) continua valendo em paralelo, para o cliente do próprio dono que
  fala direto com o servidor. O prefixo é o que distingue as duas formas.

### A armadilha que custa uma tarde

`FITRADEOFF_MCP_HOSTS` não é burocracia. Sem o domínio declarado, a proteção contra DNS rebinding
do SDK recusa **todo** pedido que chegar por ele com `421 Invalid Host header` — mensagem que não
menciona MCP, nem chave, nem variável de ambiente. A tela de chaves confere essa coerência e avisa
antes; o `compose.yml` se recusa a subir sem ela.
