# Guia de auditoria

Para quem abre este repositório sem conhecer ninguém aqui e precisa responder três
perguntas: **isto implementa mesmo o FITradeoff?**, **posso confiar no resultado?** e
**como eu reproduzo?**

O método é público (De Almeida et al., 2016). Esta é uma implementação independente,
sem vínculo com o sistema oficial do CDSID-UFPE — e foi comparada com ele, caso a
caso, por uma suíte que está no repositório.

---

## 1. Onde cada etapa do método mora no código

O motor é uma função pura: `(matriz de valor, espaço de pesos) → análise`. Tudo abaixo
está em [`engine/src/fitradeoff/`](engine/src/fitradeoff/); a API, o servidor MCP e a
tela são cascas que não tomam decisão de método nenhuma.

| Etapa do FITradeoff | Onde | O que conferir |
|---|---|---|
| **Modelo aditivo, escala de valor intra-critério** | [`domain/scales.py`](engine/src/fitradeoff/domain/scales.py) | Convenção MAVT: `v = 1` na melhor consequência, `0` na pior. `ContinuousScale` é a normalização linear; `PiecewiseScale` é a curva elicitada, quando o decisor levantou uma |
| **Ordenação das constantes de escala** | [`domain/preferences.py`](engine/src/fitradeoff/domain/preferences.py) (`CriteriaRanking`) → [`domain/weights.py`](engine/src/fitradeoff/domain/weights.py) (`ordering_constraints`) | Vira `k[i] − k[j] ≥ ε` para pares consecutivos na ordem declarada |
| **Elicitação por decomposição** (a pergunta de tradeoff) | [`elicitation/questions.py`](engine/src/fitradeoff/elicitation/questions.py) | `TradeoffQuestion` é o par e o ponto; `Bracket` é a busca binária sobre a razão `k_rival / k_criterio`; `QuestionPresenter` traduz para reais e dias |
| **Qual pergunta fazer em seguida** | [`elicitation/selectors.py`](engine/src/fitradeoff/elicitation/selectors.py) | `WidestBracketSelector` é o padrão: ataca o par de maior incerteza. Com a abertura respondida B, o oficial escolhe os pares em outra ordem — uma das duas diferenças que restam (seção 6) |
| **A resposta vira restrição** | `domain/preferences.py` (`TradeoffAnswer`) → `domain/weights.py` (`tradeoff_coefficients`) | A: `value·k[foco] ≥ k[rival]`; B: o contrário; indiferença: igualdade; "não sei": **nenhuma** restrição |
| **Espaço de pesos** | [`domain/weights.py`](engine/src/fitradeoff/domain/weights.py) | Só as restrições vindas de declarações. Soma igual a 1 e não negatividade pertencem ao modelo e entram no solver ([`solvers/base.py::build_rows`](engine/src/fitradeoff/solvers/base.py)) |
| **Teste de alternativa potencialmente ótima (POA), por LP** | [`problematics/evaluator.py`](engine/src/fitradeoff/problematics/evaluator.py) (`is_potentially_optimal`, `potentially_optimal`) | Um LP por alternativa: existe vetor de pesos viável que a coloque à frente de todas? |
| **As cinco leituras** | [`problematics/`](engine/src/fitradeoff/problematics/) | `choice.py` (2016) · `ranking.py` (Frej 2019) · `sorting.py` (Kang 2020) · `portfolio.py` e `benefit_cost.py` (Frej 2021) |
| **Avaliação holística** | `domain/preferences.py` (`HolisticJudgement`); faixas para os gráficos em `evaluator.value_bounds` / `bounds_by_index` | Entra no **mesmo** espaço de pesos da decomposição, como uma restrição a mais |
| **Critério de parada** | `Analysis.resolved` em cada problemática + `evaluator.are_equivalent` + [`elicitation/session.py`](engine/src/fitradeoff/elicitation/session.py) (`finished`) | Ver a seção 2: é onde as duas plataformas mais divergiram, e onde a comparação rendeu mais. No `beneficio_custo` há uma segunda parada, antes da primeira pergunta, quando o orçamento já decide a carteira (`benefit_cost.py::_carteira_fechada_pelo_orcamento`) |
| **Teste de inconsistência** | `evaluator.is_consistent` (LP inviável) e [`application/inconsistency.py`](engine/src/fitradeoff/application/inconsistency.py) | Espaço de pesos vazio = preferências que se contradizem. O diagnóstico acha **o par** em conflito, não só a última resposta |
| **Veto** | [`domain/problem.py`](engine/src/fitradeoff/domain/problem.py) (`veto_factors`), [`problematics/veto.py`](engine/src/fitradeoff/problematics/veto.py), `evaluator.penalized_bounds` | de Almeida (2013). Só escolha e ordenação, como no oficial; ver a ressalva na seção 3 |
| **Trilha de auditoria** | [`domain/audit.py`](engine/src/fitradeoff/domain/audit.py) | Log imutável. **Nenhum** estado derivado é persistido: espaço de pesos, POAs e recomendação saem sempre de um replay |

**A invariante que amarra tudo**, e que tem teste próprio: a frase que o decisor lê e a
restrição imposta ao LP saem do **mesmo objeto** (`PreferenceStatement`). Não há como a
auditoria narrar uma coisa e o modelo impor outra.

**Como o código é documentado.** As regras estão em
[`PADRAO_DE_DOCUMENTACAO.md`](PADRAO_DE_DOCUMENTACAO.md), e
`engine/tests/test_documentacao.py` falha se alguma função, classe ou rota que o
padrão exige ficar sem docstring. As funções que decidem algo trazem rótulos fixos,
que transformam perguntas de auditoria em buscas:

```bash
grep -rn "Paridade:" engine/src    # regras que vieram de medição contra o oficial
grep -rn "Custo:" engine/src       # onde o motor gasta LPs, e quantos
grep -rn "Exatidao:" engine/src    # o que é exato, aproximado ou conservador
grep -rn "Limitacao conhecida:" engine/src api/src mcp_server/src   # defeitos declarados
```

A arquitetura em camadas é verificada por AST a cada execução da suíte
([`engine/tests/test_architecture.py`](engine/tests/test_architecture.py)): o domínio não
importa ninguém.

---

## 2. Os parâmetros que mudam a conclusão

Seis números. Confundi-los já custou um diagnóstico errado neste projeto, então cada um
diz explicitamente **sobre que objeto** ele fala.

| Parâmetro | Padrão | Sobre o quê | Onde |
|---|---|---|---|
| **Limiar de equivalência** | `0,01` | Duas **alternativas**: diferença máxima de valor global abaixo da qual elas contam como indiferentes | `problematics/evaluator.py::DEFAULT_EQUIVALENCE` |
| **Epsilon** | `1e-4` | Dois **critérios**: folga da preferência estrita entre constantes de escala | `domain/weights.py::DEFAULT_EPSILON` |
| **Largura mínima do par** | `0,01` | Um **par de critérios**: abaixo desta largura, levada à consequência e medida **na unidade do critério**, o par é abandonado. A pergunta de abertura é exceção | `elicitation/selectors.py::LARGURA_MINIMA` |
| **Peso desprezível** | `5e-6` | O **critério rival**: se o peso dele não pode passar disso, a pergunta sobre o par não muda nada e é abandonada | `elicitation/selectors.py::PESO_DESPREZIVEL` |
| **Resolução de bracket** | `1e-9` | Um **par de critérios**: piso numérico em valor, só contra ruído de ponto flutuante | `elicitation/selectors.py::DEFAULT_RESOLUTION` |
| **Amostras** | `24` | O **espaço de pesos**: quantos vértices as carteiras avaliam | `problematics/registry.py` |

O que cada um **não** é:

- O **limiar de equivalência** é o *equivalence threshold* do sistema oficial, e adotamos o
  padrão dele (0,01) para que as duas plataformas parem no mesmo ponto. É configurável por
  decisão (API e MCP) e **gravado no registro** — reabrir a decisão reproduz o resultado.
  Faixa aceita: `[0; 0,5]`.
- O **epsilon** é escolha nossa, de condicionamento numérico, e **não** vem da documentação
  do FITradeoff. A suíte de paridade roda com `epsilon = 0` justamente para que ele não
  interfira na comparação.
- A **largura mínima do par** e o **peso desprezível** saíram de medição contra o oficial,
  não de escolha nossa: são os pontos em que ele deixa de perguntar um par. Os dois mudam
  contagens de perguntas, e o comentário no código traz as medidas que os fixaram. A largura
  mínima depende da escala do critério — um custo em milhares nunca chega a uma faixa de
  0,01, e o par só se encerra pelo peso ou pela problemática —, e é o que o oficial faz.
  A abertura escapa dela: com o critério do topo quase constante, o oficial ainda faz a
  pergunta de abertura (`fin-E3`).
- A **resolução de bracket** já foi `1e-2` e encerrava os pares sem que se soubesse, porque
  nos casos lineares a diferença não aparecia. A curva não linear mostrou o erro; hoje ela é
  só um piso numérico.
- As **amostras** valem só para `portfolio` e `beneficio_custo`. As outras três não amostram
  nada.

A **análise de sensibilidade** existe sobre dois deles: sobre o limiar de equivalência
(`POST /api/decisoes/{id}/sensibilidade`, que reprocessa o mesmo log) e sobre as
consequências (`.../sensibilidade-consequencias`, "e se os números estiverem um pouco
errados?"). São perguntas diferentes e não se substituem.

---

## 3. O que é exato e o que é aproximado

| Leitura | Exatidão | Por quê |
|---|---|---|
| `escolha` | **exata** | O teste de POA é um LP: a resposta é sim ou não, sem amostragem |
| `ranking` | **exata** | As faixas de posição saem da matriz de dominância, que sai de LPs |
| `sorting` | **exata** | A faixa de valor global de cada alternativa sai de dois LPs |
| `beneficio_custo` | **mista** | As faixas de razão benefício/custo e a dominância entre faixas disjuntas são **exatas** (o custo é constante, logo a razão é linear nos pesos). Só a **carteira** é amostrada |
| `portfolio` | **aproximada** | Com os pesos incertos, decidir se um projeto pertence a algum portfólio ótimo é um problema **bilevel** — a escolha binária depende dos pesos, que são variáveis. Não sai de um LP. Amostramos vértices e resolvemos a mochila em cada um |
| qualquer uma **sob veto** | **envelope conservador** | O valor penalizado `V' = r(k)·V(k)` é o produto de duas expressões lineares, logo **quadrático** nos pesos, e a dominância deixa de ser um LP. Publicamos `r_min·V_min ≤ V' ≤ r_max·V_max`: mais largo que a faixa real, nunca mais estreito |

Duas consequências que o auditor deve cobrar:

1. Em `portfolio` e `beneficio_custo`, "sempre selecionado" e "nunca selecionado" valem
   **para as amostras avaliadas**. A ressalva acompanha o resultado em todas as saídas —
   `Analysis.detail["ressalva"]`, as `instructions` do servidor MCP, a tela
   (`web/components/ResultadoAnalise.tsx`) e a planilha exportada — e há teste de front que
   falha se a tela publicar a carteira sem ela.
2. Sob veto, o erro possível é **deixar de apontar** uma superioridade que existe; nunca
   apontar uma que não existe. Na prática, com veto podem ser necessárias mais perguntas.
   O texto integral está em `problematics/veto.py::RESSALVA_VETO`, num módulo próprio
   exatamente para que API, MCP e tela não possam divergir entre si.

---

## 4. Quando as preferências se contradizem

Não é um caso de erro: é um resultado previsto do método. O espaço de pesos fica vazio, o
LP torna-se inviável, e isso é detectado sem nenhum código dedicado —
`evaluator.is_consistent`.

Dizer "desfaça a última" seria verdadeiro e inútil: a última só é culpada por ter chegado
por último. [`application/inconsistency.py`](engine/src/fitradeoff/application/inconsistency.py)
remove uma declaração anterior de cada vez e pergunta se o espaço volta a ser viável —
assim identifica **o par** em conflito e mostra as duas declarações ao decisor.

Distinguimos dois casos que o sistema oficial trata como um só: duas declarações que não
cabem juntas, e uma declaração que a própria matriz desmente (preferir quem perde em todos
os critérios).

---

## 5. Como reproduzir

### Subir e rodar as suítes

```bash
python -m venv engine/.venv
engine/.venv/Scripts/python -m pip install -e engine[dev] -e mcp_server -e api

engine/.venv/Scripts/python -m pytest engine/tests api/tests -q   # 736
engine/.venv/Scripts/python -m pytest mcp_server/tests -q         # 69
cd web && npm install && npm test -- --run                        # 512
```

Entre eles há um **decisor-oráculo** que verifica a invariante central do método — a
alternativa verdadeiramente ótima nunca sai do conjunto de POAs —, testes que auditam a
própria arquitetura e testes de entrada não confiável.

Um passeio pelas leituras, com o mesmo log servindo a quatro delas:

```bash
engine/.venv/Scripts/python engine/examples/quatro_problematicas.py
```

### Refazer a comparação com o sistema oficial

A suíte vive em [`paridade/`](paridade/) e **não** é reproduzida aqui: o
[README de lá](paridade/README.md) diz como rodar cada modo, o que a suíte trava e as três
armadilhas do sistema de referência. Em resumo:

```bash
python -m pytest paridade/          # 125 testes; confere o motor contra a medição gravada
```

Isso roda sem rede e sem conta, porque o lado oficial está versionado em
`paridade/resultados/oficial.json` (os 17 casos originais) e
`paridade/resultados/casos_medidos.json` (os outros 57) — é o que torna a afirmação
auditável. Refazer a medição contra o servidor do CDSID exige credenciais e Playwright, e
leva minutos por caso; para os casos do registro, pede também o script de sessão estendido
que não está no repositório (ver o README da paridade).

Os dois relatórios respondem a perguntas diferentes:

- [`PARIDADE.md`](PARIDADE.md) compara **recursos**, levantados do guia do usuário oficial:
  o que existe de um lado e do outro.
- [`paridade/EQUIVALENCIA.md`](paridade/EQUIVALENCIA.md) compara **comportamento**: os mesmos
  problemas rodados nos dois sistemas, pergunta a pergunta, resultado a resultado.

---

## 6. Os limites, declarados

O que um auditor deve saber que **não** está garantido:

- **`portfolio` não tem medição de paridade.** É a única das cinco leituras sem caso rodado
  nos dois lados. Não foi esquecimento: o módulo Portfolio Combinatorial do oficial roda num
  deploy separado que não elicita em sessão — enumera as carteiras offline e avisa por
  e-mail. Não há percurso para percorrer lado a lado.
- **Duas diferenças de percurso permanecem**, em 6 dos 73 casos comparáveis, todas
  declaradas no registro de casos (`divergencia`, com o nosso número e o porquê) e presas
  em `paridade/test_paridade.py` — fechá-las quebra o teste de propósito:
  - **abertura respondida B**: os valores das perguntas batem, a ordem dos pares não; em
    dois dos quatro casos a contagem também muda;
  - **um par a menos de 0,4% do limiar de 0,01**: uma pergunta a mais num caso, a menos no
    outro.

  O detalhe, com as hipóteses testadas e descartadas, está em
  [`paridade/EQUIVALENCIA.md`](paridade/EQUIVALENCIA.md).
- **O campo `actor` da trilha não é autenticado.** A própria trilha diz isso
  (`nota_sobre_autoria`). Tratá-lo como prova de autoria seria enganoso.
- **Não há controle de acesso entre usuários.** Quem tem o identificador lê e escreve a
  decisão. Basta para um servidor local de um usuário só; não basta como serviço
  multiusuário.
- **Decisão em grupo não existe.** Uma sessão é de um decisor.

---

## Referências

- De Almeida, A.T. et al. (2016). *A new method for elicitation of criteria weights in
  additive models: Flexible and interactive tradeoff.* EJOR, 250(1), 179-191.
- Frej, E.A. et al. (2019) — ranking. Kang, T.H.A. et al. (2020) — sorting.
  Frej, E.A. et al. (2021) — portfólio. de Almeida, A.T. (2013) — veto.
- [fitradeoff.org](https://fitradeoff.org/) — método e sistema oficial do CDSID-UFPE.
