# FITradeoff — plataforma de apoio à decisão multicritério

Implementação do método **FITradeoff** (Flexible and Interactive Tradeoff, De Almeida et al., 2016)
para elicitação de constantes de escala em modelos aditivos no escopo da MAVT, a partir de
**informação parcial** de preferência.

Duas formas de conduzir a mesma decisão: a **tela estruturada**, com o fluxo clássico do método e
apoio gráfico, e o **chat**, em que um agente conduz a elicitação conversando. As duas usam as
mesmas operações — o agente não tem atalho por dentro.

O decisor nunca vê um espaço de pesos nem um problema de programação linear: responde a
comparações entre situações concretas, em reais e dias, e recebe uma recomendação que sabe
justificar.

O método é público e está descrito na literatura; esta é uma implementação independente,
sem vínculo com o sistema oficial do CDSID-UFPE.

## Estado

| Módulo | Situação |
|---|---|
| Escolha, ranking, sorting | **pronto** — exatos |
| Portfólio benefício-custo | **pronto** — aproximado, ver ressalva abaixo |
| Avaliação holística + tradeoff no mesmo espaço | **pronto** |
| Auditoria, desfazer, sensibilidade | **pronto** |
| Servidor MCP (13 ferramentas) | **pronto** — validado por stdio |
| API HTTP (FastAPI) | **pronto** — 18 rotas |
| Tela de decisão estruturada | **pronto** — com os gráficos |
| Tela de chat com agente | **pronto** — exige `ANTHROPIC_API_KEY` |
| Entrada manual + import de planilha | **pronto** — `.xlsx` e `.csv` |
| Export (entrada + resultado + trilha) | **pronto** |
| Ordenação de pesos nos dois modos | **pronto** — lista e avaliação global |
| Decisão em grupo | a fazer |

**246 testes**, incluindo um decisor-oráculo que verifica a invariante central do método (a
alternativa verdadeiramente ótima nunca sai do conjunto de POAs), testes que auditam a própria
arquitetura e testes de entrada não confiável.

## Arquitetura

```
  web (Next.js)     MCP (chat/IDE)     chat com agente
        │                  │                  │
        └──── HTTP ────> FastAPI <────────────┘
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
| **Strategy** | [`Problematic`](engine/src/fitradeoff/problematics/base.py), [`QuestionSelector`](engine/src/fitradeoff/elicitation/selectors.py) | 4 leituras do mesmo espaço de pesos; trocar a heurística de perguntas sem tocar na sessão |
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

## As quatro problemáticas

| Chave | O que responde | Exatidão |
|---|---|---|
| `escolha` | qual alternativa recomendar | exata |
| `ranking` | ordem completa; com informação parcial, faixas de posição | exata |
| `sorting` | alocação em classes, por perfis de referência | exata |
| `portfolio` | carteira dentro de um orçamento | **aproximada** |

**A ressalva do portfólio, que precisa chegar ao decisor:** com os pesos ainda incertos, decidir se
um projeto pertence a algum portfólio ótimo é um problema **bilevel** — a escolha binária depende
dos pesos, que por sua vez são variáveis. Não se resolve com um LP. O que fazemos é amostrar
vértices do espaço de pesos e resolver a mochila em cada um. Por isso "sempre selecionado" e "nunca
selecionado" valem **para as amostras avaliadas**, e o servidor MCP instrui o agente a dizer isso.
As outras três problemáticas não têm essa ressalva.

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

A tela de chat exige `ANTHROPIC_API_KEY` no ambiente da API; a tela de decisão
estruturada funciona sem ela. Os dados ficam em `~/.fitradeoff/decisoes`
(configurável por `FITRADEOFF_DATA`).

### As duas telas

**Decisão estruturada** — o fluxo clássico do método, em quatro etapas que só
aparecem quando a anterior fecha (não há pergunta antes da ordenação dos pesos,
nem resultado antes de haver resposta). A pergunta de tradeoff é desenhada, não
descrita: os dois lados aparecem completos, com barras por critério e o valor na
unidade real. Isso importa — em texto mal formulado, o decisor responde a uma
pergunta diferente da que o modelo registra.

**Chat de decisões** — o agente conduz a mesma elicitação conversando. Ele usa
exatamente as mesmas operações, sem caminho alternativo por dentro, e o rastro
de ferramentas fica visível na resposta para que se veja que a recomendação saiu
do método.

## Uso por código

```bash
python -m venv engine/.venv
engine/.venv/Scripts/python -m pip install -e engine[dev] -e mcp_server
engine/.venv/Scripts/python -m pytest engine/tests mcp_server/tests -q
engine/.venv/Scripts/python engine/examples/quatro_problematicas.py
```

O [`.mcp.json`](.mcp.json) na raiz conecta o servidor ao **Claude Code** neste projeto (reinicie a
sessão para carregá-lo). Para o **Claude Desktop**, a mesma estrutura com caminho absoluto.

Por código, sem chat:

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

`listar_problematicas` · `criar_problema` · `listar_problemas` · `ver_problema` ·
`ordenar_criterios` · `proxima_pergunta` · `responder` · `julgar` · `desfazer` · `situacao` ·
`explicar` · `mudar_problematica` · `analise_sensibilidade`

As `instructions` do servidor instruem o agente a **não responder pelo decisor**, a reproduzir as
duas opções por inteiro, e a declarar a ressalva do portfólio. A ordenação dos critérios é uma
declaração de preferência do decisor: o agente pode propor, mas precisa confirmar.

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
3. **Curvas de valor elicitadas** — hoje a avaliação intra-critério é linear (ou por níveis, nas
   escalas construídas). Substituir é trocar a implementação de [`Scale`](engine/src/fitradeoff/domain/scales.py);
   o resto do motor não muda.
4. **Refinar o seletor por ganho de informação** — [`InformationGainSelector`](engine/src/fitradeoff/elicitation/selectors.py)
   já escolhe a pergunta que mais reduz o conjunto de alternativas indefinidas, por critério
   minimax. Falta medir, em escala, quantas perguntas ele economiza contra o `WidestBracketSelector`.

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
  problematics/     evaluator + as 4 estratégias + registry
  elicitation/      perguntas, seletores, sessão
  repositories/     porta de persistência + memória/JSON
  application/      casos de uso, DTOs, views e limites de entrada
  container.py      composição explícita das dependências
mcp_server/         casca fina de protocolo sobre o serviço
```

## Referências

- De Almeida, A.T. et al. (2016). *A new method for elicitation of criteria weights in additive
  models: Flexible and interactive tradeoff.* European Journal of Operational Research, 250(1), 179-191.
- Frej, E.A. et al. (2019) — ranking. Kang, T.H.A. et al. (2020) — sorting. Frej, E.A. et al. (2021) — portfólio.
- [fitradeoff.org](https://fitradeoff.org/) — método e sistema oficial do CDSID-UFPE.
