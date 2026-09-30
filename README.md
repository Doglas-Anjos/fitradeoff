# FITradeoff — plataforma de apoio à decisão multicritério

Implementação do método **FITradeoff** (Flexible and Interactive Tradeoff, De Almeida et al., 2016)
para elicitação de constantes de escala em modelos aditivos no escopo da MAVT, a partir de
**informação parcial** de preferência.

Duas formas de conduzir a mesma decisão: a **tela estruturada**, com o fluxo clássico do método e
apoio gráfico, e o **servidor MCP**, que entrega o método como ferramentas ao assistente que o
decisor já usa — Claude, Cursor, VS Code. As duas usam as mesmas operações: o assistente não tem
atalho por dentro, e não calcula nada por conta própria.

O decisor nunca vê um espaço de pesos nem um problema de programação linear: responde a
comparações entre situações concretas, em reais e dias, e recebe uma recomendação que sabe
justificar.

O método é público e está descrito na literatura; esta é uma implementação independente,
sem vínculo com o sistema oficial do CDSID-UFPE — e **comparada com ele, caso a caso**, por
uma suíte que está no repositório.

> **Veio auditar?** [`AUDITORIA.md`](AUDITORIA.md) é a porta de entrada: em que arquivo mora
> cada etapa do método, quais parâmetros mudam a conclusão, o que é exato e o que é
> aproximado, e como reproduzir tudo — inclusive a comparação com o sistema oficial.

## Estado

| Módulo | Situação |
|---|---|
| Escolha, ranking, sorting | **pronto** — exatos |
| Portfólio combinatorial | **pronto** — aproximado, ver ressalva abaixo |
| Portfólio benefício-custo | **pronto** — faixas de razão exatas, carteira aproximada |
| Avaliação holística + tradeoff no mesmo espaço | **pronto** |
| Curva de valor intra-critério elicitada | **pronto** — por bisseção, antes da ordenação |
| Modelo de veto | **pronto** — escolha e ordenação, por envelope conservador |
| Auditoria, desfazer, sensibilidade | **pronto** — sobre o limiar e sobre as consequências |
| Servidor MCP (19 ferramentas) | **pronto** — stdio e HTTP remoto, com chave |
| Superfície pública do MCP | **pronto** — imagem, composição e túnel |
| Identidade vinda de outra aplicação | **pronto** — JWT assinado, um acervo por pessoa |
| Autenticação de `/api` | **pronto** — atrás de quem autentica; local segue sem cadastro |
| API HTTP (FastAPI) | **pronto** — 27 rotas |
| Tela de decisão estruturada | **pronto** — com os gráficos |
| Tela de chaves do MCP | **pronto** — emitir, listar e revogar |
| Entrada manual + import de planilha | **pronto** — `.xlsx` e `.csv` |
| Export (entrada + resultado + trilha) | **pronto** |
| Ordenação de pesos nos dois modos | **pronto** — lista e avaliação global |
| Paridade medida contra o sistema oficial | **74 casos**, versionados — 63 batem de 73 comparáveis; ver abaixo |
| Decisão em grupo | a fazer |

**1469 testes**: 756 de motor e API, 73 do servidor MCP, 125 de paridade e 515 de interface.
Entre eles, um decisor-oráculo que verifica a invariante central do método (a alternativa
verdadeiramente ótima nunca sai do conjunto de POAs), testes que auditam a própria
arquitetura e testes de entrada não confiável.

## Arquitetura

```
  web (Next.js)     MCP stdio (local)     MCP HTTP (remoto)
        │                    │                     │
        └──── HTTP ────> FastAPI <─────────────────┘
                            │
                      application  (casos de uso)
                            │
                                    ┌───────────────┼───────────────┐
                              elicitation     problematics     repositories
                                    │               │               │
                                    └──────> domain <┘         (arquivo/Postgres)
                                                ▲
                                             solvers  (porta + adaptador HiGHS)
```

Dependências apontam **sempre para dentro**. O domínio não conhece ninguém —
[`test_architecture.py`](engine/tests/test_architecture.py) verifica isso por AST a cada execução
da suíte, porque arquitetura em camadas que ninguém checa vira, com o tempo, um grafo qualquer.

### Padrões aplicados, e por quê

| Padrão | Onde | Problema que resolve |
|---|---|---|
| **Strategy** | [`Problematic`](engine/src/fitradeoff/problematics/base.py), [`QuestionSelector`](engine/src/fitradeoff/elicitation/selectors.py) | 5 leituras do mesmo espaço de pesos; trocar a heurística de perguntas sem tocar na sessão |
| **Port/Adapter** | [`LinearSolver`](engine/src/fitradeoff/solvers/base.py) | scipy hoje, highspy/OR-Tools amanhã, sem mexer em regra |
| **Repository** | [`DecisionRepository`](engine/src/fitradeoff/repositories/base.py) | arquivo hoje, Postgres depois; memória nos testes |
| **Value Object + polimorfismo** | [`Scale`](engine/src/fitradeoff/domain/scales.py) | elimina os `if is_discrete` espalhados |
| **Factory/Registry** | [`ProblematicRegistry`](engine/src/fitradeoff/problematics/registry.py) | problemática nova entra com uma linha |
| **Event Sourcing** | [`AuditLog`](engine/src/fitradeoff/domain/audit.py) | auditoria, desfazer e sensibilidade saem de graça |
| **DI por construtor** | [`Container`](engine/src/fitradeoff/container.py) | testes sem mock; wiring visível numa tela |
| **Template Method** | [`Problematic.analyse`](engine/src/fitradeoff/problematics/base.py) | pré-condições numa linha só, não repetidas em 4 estratégias |
| **DTO** | [`application/dto.py`](engine/src/fitradeoff/application/dto.py) | contrato de saída declarado, não improvisado por view |

**Descartados de propósito:** Singleton (estado global mataria a auditoria), container de DI com
resolução automática (tornaria o wiring invisível — o oposto do que um sistema auditável precisa),
Observer e Visitor (não há o que observar nem hierarquia a percorrer).

### As duas decisões que sustentam tudo

**1. O motor é uma função pura.** `(matriz de valor, espaço de pesos) → análise`. Sem estado, sem
I/O. Daí vêm a escala horizontal, o cache por hash, os testes diretos contra os exemplos
publicados, e o fato de as mesmas operações virarem ferramentas MCP sem reescrever nada.

**2. Só as declarações do decisor são persistidas.** O estado nunca é salvo: sai de um replay.
Quatro funcionalidades que num SAD são features separadas aparecem sozinhas:

- **desfazer** → truncar o log;
- **teste de inconsistência** → o espaço de pesos ficou vazio (LP inviável);
- **análise de sensibilidade** → reprocessar o mesmo log com outro limiar;
- **trocar de problemática** → reler o mesmo log; nada é reelicitado.

Os intervalos da busca binária também são **derivados do log**, nunca guardados à parte — se
fossem estado próprio, uma correção no log poderia dessincronizá-los, e a auditoria passaria a
mentir.

Um servidor reiniciado retoma exatamente de onde parou, porque não havia nada na memória.

## As cinco problemáticas

São as mesmas cinco do sistema oficial, com os nomes de lá — quem chega de um artigo ou usa
os dois sistemas lado a lado procura por eles.

| Chave | O que responde | Exatidão |
|---|---|---|
| `escolha` | qual alternativa recomendar | exata |
| `ranking` | ordem completa; com informação parcial, faixas de posição | exata |
| `sorting` | alocação em classes, por perfis de referência | exata |
| `portfolio` | a carteira de maior benefício agregado dentro do orçamento | **aproximada** |
| `beneficio_custo` | a carteira montada pela ordem da razão benefício/custo | **mista** |

O decisor responde **uma vez**: as cinco leituras saem do mesmo log de auditoria, e trocar de
problemática não reelicita nada.

**A ressalva das carteiras, que precisa chegar ao decisor:** com os pesos ainda incertos, decidir
se um projeto pertence a algum portfólio ótimo é um problema **bilevel** — a escolha binária
depende dos pesos, que por sua vez são variáveis. Não se resolve com um LP. O que fazemos é
amostrar vértices do espaço de pesos e resolver a carteira em cada um. Por isso "sempre
selecionado" e "nunca selecionado" valem **para as amostras avaliadas**, e a ressalva acompanha o
resultado na API, no MCP, na tela e na planilha exportada.

Em `beneficio_custo` a divisão é mais fina, e a distinção importa: as **faixas de razão** e a
dominância entre faixas que não se sobrepõem são **exatas** — o custo é constante, logo a razão é
linear nos pesos e seus extremos saem de LPs. Só a **carteira** é amostrada. As outras três
problemáticas não têm ressalva nenhuma.

Sob **veto** declarado, qualquer resultado passa a ser um envelope conservador: o valor penalizado
é quadrático nos pesos e a dominância deixa de ser um LP. As faixas publicadas contêm a verdadeira
e são mais largas que ela — o método pode deixar de apontar uma superioridade que existe, nunca
aponta uma que não existe. Detalhe em [`AUDITORIA.md`](AUDITORIA.md) e em
[`problematics/veto.py`](engine/src/fitradeoff/problematics/veto.py).

## Validação contra o sistema oficial

Os mesmos problemas rodados aqui e no FITradeoff oficial (CDSID/UFPE), pergunta a pergunta e
resultado a resultado: **74 casos** nas quatro problemáticas que o oficial elicita em sessão, de 2 a
30 alternativas e de 2 a 7 critérios, com curva de valor não linear, critério discreto, respostas A,
B e misturadas, e casos de borda feitos para quebrar a equivalência.

**63 batem de 73 comparáveis** — a mesma contagem nas duas fases, a mesma sequência de perguntas e
o mesmo resultado (vencedor, ordem, classe de cada alternativa, carteira). Os 10 que não batem se
resumem a três diferenças estreitas, cada uma presa num teste para que fechá-la também o quebre:

- **abertura respondida B**: os valores das perguntas batem, a ordem dos pares não (4 casos);
- **ordenar 7 critérios**: 15 comparações dele contra 14 nossas, chegando à mesma ordem (5 casos);
- **um par a menos de 0,4% do limiar de 0,01**: uma pergunta a mais num caso, a menos no outro.

Um caso o oficial não completa: com um critério de faixa zero, ele trava depois de salvar a
matriz. O detalhe de cada medição, e o que foi corrigido por causa dela, está em
[`paridade/EQUIVALENCIA.md`](paridade/EQUIVALENCIA.md).

A medição do lado oficial está versionada, então a suíte roda sem rede e sem conta:

```bash
python -m pytest paridade/
```

- [`paridade/README.md`](paridade/README.md) — como rodar cada modo e o que a suíte trava
- [`PARIDADE.md`](PARIDADE.md) — comparação de **recursos**, levantada do guia do usuário oficial
- [`paridade/EQUIVALENCIA.md`](paridade/EQUIVALENCIA.md) — comparação de **comportamento**: as
  regras que a comparação encontrou e corrigiu, e as três diferenças que permanecem

Rodar lado a lado é o que revelou essas regras. Na maior parte delas as perguntas iniciais eram
idênticas e a diferença estava em **quando cada sistema para** — a largura mínima de um par, a
parada pelo orçamento no benefício-custo, a pergunta de abertura que sai mesmo com o critério do
topo quase constante. É o tipo de coisa que nenhuma leitura do artigo entrega.

## A parte difícil: perguntar em texto

A pergunta de tradeoff do FITradeoff é visual por design — o SAD original usa gráficos de barras
porque comparar duas consequências hipotéticas é cognitivamente pesado. Em texto mal formulado, a
elicitação degrada.

A solução é o motor devolver a pergunta **estruturada e em unidades reais**, nunca em escala
normalizada:

```
  Opcao A:
    - Indice de qualidade: 0.89
    - Custo unitario: 15.8 R$/un (o pior possivel)
    - Prazo de entrega: 45 dias (o pior possivel)
  Opcao B:
    - Custo unitario: 10.2 R$/un (o melhor possivel)
    - Indice de qualidade: 0.71 (o pior possivel)
    ...
```

Ambos os lados vêm por inteiro, marcando o que é melhor e pior possível — caso contrário o decisor
responde a uma pergunta diferente da que o modelo registra. O campo `posicao_na_escala` acompanha
a resposta, para renderizar a mesma pergunta como gráfico quando houver interface visual.

A auditoria segue a mesma regra: a frase lida pelo decisor e a restrição imposta ao LP saem do
**mesmo objeto** ([`PreferenceStatement`](engine/src/fitradeoff/domain/preferences.py)), e não de
dois trechos de código que alguém pode esquecer de sincronizar.

> [1] Ordenou os criterios por importancia: Indice de qualidade > Custo unitario > Prazo de entrega.
> [2] Preferiu ter 'Custo unitario' no melhor nivel (10.2 R$/un) a ter 'Indice de qualidade' em
> 0.83 (50% da escala): o peso de 'Custo unitario' supera o peso de 'Indice de qualidade' vezes 0.50.

## Como rodar

```bash
# motor + API
python -m venv engine/.venv
engine/.venv/Scripts/python -m pip install -e engine[dev] -e mcp_server -e api

# front
cd web && npm install && cd ..

# tudo de uma vez (Windows)
.\iniciar.ps1
```

| Serviço | Endereço |
|---|---|
| Front | http://localhost:3000 |
| API | http://127.0.0.1:8000 |
| Documentação da API | http://127.0.0.1:8000/docs |

> Não rode `npm run build` enquanto o `npm run dev` estiver no ar: os dois
> escrevem no mesmo `.next` e o dev passa a servir 500 com `MODULE_NOT_FOUND`.
> Se acontecer, pare o dev, apague `web/.next` e suba de novo.

Os dados ficam em `~/.fitradeoff/decisoes` (configurável por `FITRADEOFF_DATA`).

| Variável | Para quê |
|---|---|
| `FITRADEOFF_DATA` | onde as decisões são gravadas |
| `FITRADEOFF_DATABASE_URL` | grava as decisões no PostgreSQL em vez de arquivos (ver abaixo) |
| `FITRADEOFF_DB_POOL` | conexões por processo com o banco (padrão 10) |
| `FITRADEOFF_VAGAS_POR_PESSOA` | cálculos simultâneos por pessoa; o excedente espera a vez (padrão 2) |
| `FITRADEOFF_VAGAS_NO_TOTAL` | cálculos simultâneos no processo, abaixo dos 40 trabalhadores (padrão 24) |
| `FITRADEOFF_ESPERA_POR_VAGA` | segundos esperando vaga antes de responder 503 (padrão 60) |
| `FITRADEOFF_ESPERANDO_POR_PESSOA` | pedidos de uma pessoa na fila, além dos que rodam; acima disso, 429 (padrão 8) |
| `FITRADEOFF_MCP_URL` | endereço do MCP que a tela de chaves manda copiar |
| `FITRADEOFF_MCP_HOSTS` | domínios públicos do MCP, separados por vírgula — **declarar é o que diz "publiquei"** |
| `FITRADEOFF_ADMIN_TOKEN` | segredo que libera emitir chaves de fora deste computador |
| `FITRADEOFF_JWT_ISSUER` | o `iss` que a aplicação da frente assina |
| `FITRADEOFF_JWT_AUDIENCE` | o `aud` que ela põe no token para este serviço |
| `FITRADEOFF_JWT_JWKS_URL` | onde buscar a chave pública dela (RS256) |
| `FITRADEOFF_JWT_SECRET` | o segredo compartilhado, se for HS256 |
| `FITRADEOFF_JWT_MAX_VALIDADE` | por quantos segundos, no máximo, um token pode valer (padrão 900) |
| `FITRADEOFF_MCP_JSON` | responder num JSON só, em vez de fluxo de eventos (padrão desligado) |
| `FITRADEOFF_ACEITAR_CHAVES_DO_COFRE` | se as chaves da tela valem neste servidor (padrão ligado) |
| `FITRADEOFF_CHAVE_DIAS` | validade, em dias, de cada chave emitida (padrão 90) |
| `FITRADEOFF_CHAVE_TOKEN_RECENTE_S` | idade máxima do token do FasorX que pode emitir chave (padrão 120) |
| `FITRADEOFF_MAX_DECISOES_POR_PESSOA` | teto de decisões no acervo de cada pessoa; o do dono não tem teto (padrão 300, 0 desliga) |
| `ANTHROPIC_API_KEY` | só para a rota `/api/chat`, que não tem mais tela |

### Decisões no PostgreSQL

Sem `FITRADEOFF_DATABASE_URL`, cada decisão é um arquivo JSON — o certo para quem
roda no próprio computador, sem nada para instalar. Com ela, as decisões vão para
o PostgreSQL, que é o certo quando há várias pessoas, ou mais de um processo
escrevendo: transação no lugar de arquivo reescrito, e uma gravação que apagaria a
de outra janela é recusada (409) em vez de aceita em silêncio.

**Um papel próprio para a aplicação, sem superusuário.** Superusuário e
`BYPASSRLS` ignoram Row-Level Security, e é ela a segunda camada do isolamento
entre pessoas. A partida avisa no log quando o papel pode ignorá-la.

```sql
CREATE ROLE fitradeoff_app LOGIN PASSWORD '...' NOSUPERUSER NOBYPASSRLS;
CREATE DATABASE fitradeoff OWNER fitradeoff_app;
```

```bash
export FITRADEOFF_DATABASE_URL=postgresql://fitradeoff_app:...@host/fitradeoff
python -m fitradeoff.repositories.postgres esquema            # cria as tabelas (a API também cria ao subir)
python -m fitradeoff.repositories.postgres importar ~/.fitradeoff/decisoes   # traz os arquivos; pode repetir
```

O desenho está comentado em [`postgres.py`](engine/src/fitradeoff/repositories/postgres.py).
Em resumo: o problema vai num `jsonb` só, porque o motor sempre lê a matriz
inteira; a listagem sai de colunas próprias, sem tocar no documento; a trilha tem
uma linha por declaração, então responder é um `INSERT` pequeno e desfazer, um
`DELETE`; e a chave primária começa pelo dono, então o filtro de isolamento é
também o caminho do índice.

Medido com 10.201 decisões no banco (400 donos), para um dono com 201 decisões:

| Operação | Arquivo | PostgreSQL |
|---|---|---|
| listar | 96 ms | 2,6 ms |
| responder e desfazer | 66 ms | 35 ms |
| marcar favorita | 34 ms | 17 ms |
| abrir a maior decisão permitida (500 × 30) | 5 ms | 10 ms |

Abrir fica mais lento porque os 289 KB do documento atravessam a rede; o servidor
responde a consulta em 0,03 ms. É 0,2% dos 5 a 6 s que o solver leva nessa mesma
decisão.

Ainda em arquivo, mesmo com banco: o rascunho do formulário e o cofre de chaves do
MCP. Com mais de uma máquina servindo a API, os dois precisam de volume
compartilhado até migrarem também.

Os testes do banco rodam contra um PostgreSQL de verdade e são pulados sem ele:

```bash
FITRADEOFF_TEST_DATABASE_URL=postgresql://fitradeoff_app:...@127.0.0.1:5432/fitradeoff_teste pytest
```

### As duas telas

**Decisão estruturada** — o fluxo clássico do método, em quatro etapas que só
aparecem quando a anterior fecha (não há pergunta antes da ordenação dos pesos,
nem resultado antes de haver resposta). A pergunta de tradeoff é desenhada, não
descrita: os dois lados aparecem completos, com barras por critério e o valor na
unidade real. Isso importa — em texto mal formulado, o decisor responde a uma
pergunta diferente da que o modelo registra.

**Chaves do MCP** — onde se gera a credencial que liga o assistente do decisor
a este servidor, e se revoga a que não é mais usada. A tela monta o trecho de
configuração pronto para cada cliente, com a chave dentro, porque trocar
`SUA_CHAVE` à mão depois de colar é o passo em que se erra.

Uma chave não é senha escolhida por gente: são 256 bits aleatórios, e o que fica
gravado é o resumo SHA-256 dela. O texto existe uma vez, na resposta que o criou.
Perder a chave não tem recuperação — revoga-se e emite-se outra.

Toda chave **vence** — em 90 dias por padrão (`FITRADEOFF_CHAVE_DIAS`) —, e a lista mostra
"vence em …" ou "vencida". Uma credencial portadora sem prazo valeria para sempre depois de vazar.
Só o dono da plataforma pode emitir chave sem prazo, e só explicitamente
(`python -m fitradeoff_api.chaves criar "CI" --dias 0`). Chaves gravadas antes da validade existir:
as de pessoa vencem 90 dias depois de criadas; as do dono continuam sem prazo até ele revogá-las.

## Uso por código

```bash
python -m venv engine/.venv
engine/.venv/Scripts/python -m pip install -e engine[dev] -e mcp_server
engine/.venv/Scripts/python -m pytest engine/tests mcp_server/tests -q
engine/.venv/Scripts/python engine/examples/quatro_problematicas.py
```

O [`.mcp.json`](.mcp.json) na raiz conecta o servidor ao **Claude Code** neste projeto (reinicie a
sessão para carregá-lo). Para o **Claude Desktop**, a mesma estrutura com caminho absoluto.

Por código, sem assistente:

```python
from fitradeoff import DecisionService, build_container

service = DecisionService(build_container(storage="./decisoes"))
criada = service.create("Fornecedores", alternativas, criterios, consequencias)
service.rank_criteria(criada["id"], ["qualidade", "custo", "prazo"])

while (pergunta := service.next_question(criada["id"])).get("enunciado"):
    print(pergunta["enunciado"])
    service.answer(criada["id"], input("A, B ou indiferente? "))

print(service.state(criada["id"])["analise"]["resumo"])
```

### Ferramentas MCP

`list_problematics` · `create_problem` · `list_problems` · `get_problem` ·
`rank_criteria` · `next_question` · `answer` · `record_judgment` · `undo` · `status` ·
`explain` · `change_problematic` · `set_equivalence_threshold` · `sensitivity_analysis`

As `instructions` do servidor instruem o agente a **não responder pelo decisor**, a reproduzir as
duas opções por inteiro, e a declarar a ressalva do portfólio. A ordenação dos critérios é uma
declaração de preferência do decisor: o agente pode propor, mas precisa confirmar.

### Os dois modos do MCP

**stdio**, como no [`.mcp.json`](.mcp.json): o cliente lança o processo, que roda como o próprio
usuário. Não há chave, porque não há fronteira — quem lançou o processo já podia ler os arquivos.
Continua sendo o caminho certo para um cliente na mesma máquina.

**HTTP**, em `/mcp`, montado na própria API: para clientes que não rodam aqui, e em especial para o
Claude na web, que roda nos servidores da Anthropic. A fronteira existe, então há chave portadora,
apresentada de duas formas:

```bash
# cabeçalho: Claude Code, Cursor, VS Code
curl -X POST http://127.0.0.1:8000/mcp   -H "Authorization: Bearer $CHAVE"   -H "Content-Type: application/json"   -H "Accept: application/json, text/event-stream"   -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# chave na URL: o painel de conectores do claude.ai aceita só uma URL
curl -X POST "http://127.0.0.1:8000/mcp/$CHAVE" ...
```

A forma com a chave na URL existe porque, sem ela, o caso de uso que motivou o modo remoto não
existiria: o painel do claude.ai pede um endereço e nada mais, sem campo de cabeçalho. Em troca, a
chave aparece em histórico de navegador e em log de servidor — daí uma chave por cliente, e revogar
a que saiu de uso.

As quatro formas de endereço respondem igual, porque os painéis normalizam a URL de jeitos
diferentes e a documentação do ChatGPT manda cadastrar com a barra no fim:

```
/mcp        /mcp/        /mcp/<chave>        /mcp/<chave>/
```

O modo é sem sessão (`stateless_http`): cada requisição se explica por inteiro, então reiniciar a
API não derruba a conversa em andamento do cliente.

## Publicar o MCP

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
das catorze ferramentas faz isso.

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

## Entrada não confiável

O servidor roda em stdio, como o próprio usuário, atendendo um cliente: não há fronteira de
privilégio *dentro* do processo a defender. O que existe é a fronteira por onde entra o que o
agente manda — e é lá que as barreiras estão. Cada uma responde a um vetor que foi reproduzido
antes de ser corrigido:

| Vetor | O que acontecia | Barreira |
|---|---|---|
| Log adulterado com índice fora da faixa | `IndexError` cru vazava pelo protocolo | `PreferenceStatement.validate` confere índices contra o problema antes de virar restrição |
| Matriz com milhares de alternativas | O(n²) LPs travavam o processo | [`Limits`](engine/src/fitradeoff/application/limits.py), injetáveis |
| Identificador com `../` | Só o adaptador de disco validava | Padrão de caracteres **e** conferência do caminho resolvido, nos dois adaptadores |
| Identificador de 48 bits | Adivinhável; o id também é credencial de leitura | `secrets.token_hex(16)` — 128 bits |
| Exceção não prevista | Vazava tipo e caminho de arquivo para o agente | Rede de segurança no servidor: mensagem contida |

O campo `actor` da auditoria é aceito, mas **não é autenticado** — a própria trilha diz isso
(`nota_sobre_autoria`). Tratá-lo como prova de autoria seria enganoso, e esse é o tipo de coisa
que só se descobre tarde demais numa auditoria de verdade.

Fora de escopo por enquanto, e explicitamente: **não há controle de acesso entre usuários**. Quem
tem o identificador lê e escreve a decisão. Isso basta para um servidor local de um usuário só, e
não basta no momento em que isto virar serviço multiusuário — aí entra autenticação e dono por
registro.

### Planilhas

O sistema oficial aceita apenas `.xls` no formato 97-2003, o que obriga a
converter o arquivo antes de começar. Aqui entram **`.xlsx` e `.csv`**, com
detecção de separador (o Excel brasileiro salva com `;`) e vírgula decimal.

O layout tem três linhas de cabeçalho:

```
| Seleção de fornecedor | Qualidade | Custo | Prazo |
| direcao               | max       | min   | min   |
| unidade               |           | R$/un | dias  |
| Fornecedor A          | 0.82      | 12.5  | 30    |
```

A linha `direcao` é o único dado que não dá para inferir dos números, e errar
nela inverte a decisão inteira — por isso é obrigatória, e a mensagem de erro
diz exatamente o que falta quando ela não está lá.

O **export** traz três abas: entrada, resultado e trilha de auditoria. A aba de
entrada volta pelo importador sem edição (há teste para isso), e a trilha vai
junto de propósito: um resultado sem o registro do que foi declarado não se
defende numa auditoria.

## Sistema visual

O produto é um instrumento de trabalho, não uma página de marketing: quem usa
precisa defender a decisão depois. As escolhas saem daí.

| Eixo | Decisão | Por que não o default |
|---|---|---|
| Tipografia | Geist + Geist Mono | números são o conteúdo aqui; mono para dados é exigência funcional |
| Accent | petróleo `#14524B`, **uma só**, travada | não é o azul/roxo de AI nem terracotta; 8,98:1 de contraste |
| Dados | teal `#0D9488` / laranja `#C2410C` | validados para daltonismo e contraste nos dois modos |
| Neutros | zinc, família única | misturar cinza quente e frio é um tell |
| Raio | painéis 10px, controles 6px | regra documentada; instrumento técnico não usa pill |
| Layout | duas colunas assimétricas, painel fixo | não a coluna de cards idênticos |

O elemento em que a interface gasta atenção é **o conjunto encolhendo**: o painel
fixo mostra quantas alternativas seguem em disputa, e as descartadas ficam
riscadas em vez de sumir. É o conceito central do método, e sem ele responder
perguntas sobre situações ruins parece não levar a lugar nenhum.

Contraste conferido nos dois temas — a tinta fraca do modo claro estava em
2,46:1 (abaixo do mínimo WCAG de 4,5:1) e foi corrigida para 4,63:1.

O `.agents/skills/` traz as skills de design usadas na revisão (Anthropic
`frontend-design`, `emilkowalski/skills`, `Leonxlnx/taste-skill`). São
instruções de terceiros: leia antes de confiar.

### Onde a pessoa trava, e o que a ajuda

O método tem três pontos em que quem usa sempre empaca. A ajuda fica ao lado do
controle que confunde, no momento em que confunde — não num manual à parte.

| Ponto | O que confunde | O que a interface faz |
|---|---|---|
| Direção do critério | "max/min" não diz nada | botão com seta e a palavra: **maior** / **menor**, com o sentido completo no `title` |
| Ordem de importância | não é o critério no abstrato, é a **faixa** dele | a faixa real aparece ao lado de cada nome, e a dica explica a diferença |
| Pergunta de tradeoff | por que as duas situações são péssimas? | dica explicando que é de propósito: isola o que se quer medir |
| Faixas no resultado | por que um intervalo e não um número? | dica: os pesos não foram fixados, então o valor é uma faixa |
| Alternativas riscadas | sumiram ou foram descartadas? | ícone + risco, e a dica diz o critério do descarte |

Nos formulários: **rótulo acima do campo, ajuda abaixo do rótulo, erro abaixo do
controle**, e o campo com erro fica marcado. Placeholder nunca faz as vezes de
rótulo — ele some quando a pessoa digita, justamente quando ela volta para
conferir o que preencheu.

Ícones são do Phosphor, uma família só. O `iniciar.ps1` sobe tudo.

## Desempenho medido

scipy 1.17 / HiGHS, Python 3.11, pesos apenas ordenados:

| Alternativas | Critérios | Escolha | Ranking |
|---:|---:|---:|---:|
| 50 | 10 | 0,108 s | 0,56 s |
| 100 | 10 | 0,215 s | 2,06 s |
| 250 | 10 | 0,739 s | — |

O gargalo é a matriz de dominância, O(n²) LPs. Três reduções **exatas** cortam o custo em ~100x:

1. restringir aos pares que interessam (entre POAs, para a escolha);
2. dominância de Pareto dispensa o LP;
3. **refutação por vértice** — um único vetor de pesos viável em que `l` supera `i` já prova que
   `i` não domina `l`. Amostrar alguns vértices custa dezenas de LPs e dispensa milhares. Sozinha,
   levou o ranking de 11,9s para 2,1s em 100 alternativas.

Uma decisão inteira responde em tempo de chat. Não há necessidade de fila.

Próxima otimização, se necessário: trocar `scipy.optimize.linprog` por `highspy` com reuso do
modelo — hoje ~1 ms por LP é quase todo overhead de montagem, não de solução. É um adaptador novo
em [`solvers/`](engine/src/fitradeoff/solvers/), nada mais.

## Próximos passos

1. **Decisão em grupo** — uma sessão por decisor, e o agente localiza onde eles divergem.
2. **Montagem do problema a partir de documento** — o agente lê um edital ou planilha e propõe
   alternativas, critérios e matriz para o decisor validar.
3. **Portfólio combinatorial comparado com o oficial** — é a única das cinco leituras sem medição
   de paridade, porque o módulo de lá não elicita em sessão: enumera as carteiras offline e avisa
   por e-mail. Comparar exige o modelo de voltar depois.

## Estrutura

```
engine/src/fitradeoff/
  domain/           entidades, preferências, auditoria — não importa nada
    scales.py         escala de valor (contínua, construída, degenerada)
    problem.py        problema, critérios, matriz de valor
    weights.py        espaço de pesos e restrições lineares
    preferences.py    declarações: ordenação, tradeoff, julgamento holístico
    audit.py          log imutável, com autor e instante
    formatting.py     formatação de números, num lugar só
  solvers/          porta de otimização + adaptador HiGHS
  problematics/     evaluator + as 5 estratégias + veto + registry
  elicitation/      perguntas, seletores, sessão
  repositories/     porta de persistência + memória/JSON
  application/      casos de uso, DTOs, views e limites de entrada
  container.py      composição explícita das dependências
api/                FastAPI sobre o mesmo serviço
mcp_server/         casca fina de protocolo sobre o serviço
web/                Next.js: as duas telas e os gráficos
paridade/           suíte que compara com o sistema oficial, e as medições
```

Em que arquivo mora cada etapa do método: [`AUDITORIA.md`](AUDITORIA.md).

## Referências

- De Almeida, A.T. et al. (2016). *A new method for elicitation of criteria weights in additive
  models: Flexible and interactive tradeoff.* European Journal of Operational Research, 250(1), 179-191.
- Frej, E.A. et al. (2019) — ranking. Kang, T.H.A. et al. (2020) — sorting. Frej, E.A. et al. (2021) — portfólio.
- de Almeida, A.T. (2013) — modelo aditivo com veto, na formulação reproduzida por Palha,
  de Almeida, Morais & Hipel (2019), *J. Civil Eng. Manag.* 25(4).
- [fitradeoff.org](https://fitradeoff.org/) — método e sistema oficial do CDSID-UFPE.
