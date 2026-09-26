# Equivalência com o FITradeoff oficial

O [PARIDADE.md](../PARIDADE.md) compara **recursos**: o que existe de um lado e
do outro, levantado do guia do usuário. Este documento compara **comportamento**:
os mesmos problemas rodados nos dois sistemas, pergunta a pergunta, resultado a
resultado.

A distinção importa. Ter a mesma tela não é fazer a mesma coisa; e foi só ao
rodar lado a lado que apareceram três divergências reais de método, todas
corrigidas — e duas que permanecem, documentadas aqui.

O sistema de referência é o `FU-T3MMM-WF1a` do CDSID/UFPE, acessado pelo
navegador, na conta do próprio usuário.

## Como a comparação é feita

Cada caso é cadastrado nos dois sistemas com as mesmas alternativas, os mesmos
critérios e a mesma matriz de desempenhos, e respondido com a **mesma política:
sempre a opção A**.

A política fixa não é a resposta de um decisor real. É a única forma de o
percurso ser reproduzível dos dois lados — e o que se verifica não é "a
recomendação está certa", que depende da preferência de quem responde, e sim que
os dois sistemas **fazem as mesmas perguntas e chegam ao mesmo lugar**.

Dois parâmetros são igualados de propósito: função de valor **linear** em todos
os critérios (o oficial oferece "declare linear function for all criteria") e
limiar de equivalência em **0,01**, que é o padrão dele.

Os casos crescem até 20 alternativas por um motivo: com três ou quatro, duas
implementações concordam por coincidência, porque há poucos caminhos possíveis.
Com 20 são 190 pares para ordenar e 2²⁰ subconjuntos de carteira.

## As telas, lado a lado

O fluxo do oficial é: escolher o módulo → cadastrar → matriz → função de valor →
Input Page → ordenar as constantes de escala → elicitação por decomposição →
resultado. A nossa interface segue a mesma progressão, com os passos nomeados.

**Escolha do módulo.** As cinco problemáticas, escolhidas antes de tudo.

![Módulos no oficial](telas/oficial-modulos.png)

**Matriz de desempenhos.** Alternativas nas linhas, critérios nas colunas. No
oficial os critérios aparecem como `C1`, `C2`, `C3`, com uma tabela de apoio ao
lado dizendo qual é qual; na nossa o nome e a direção ficam no cabeçalho da
coluna, e dá para colar a tabela inteira do Excel.

![Matriz no oficial](telas/oficial-matriz.png)
![Matriz na nossa](telas/nosso-matriz.png)

**Ordenação das constantes de escala.** Comparação par a par, com a faixa de
cada critério desenhada. É o mesmo par, no mesmo ponto, nos dois sistemas.

![Ordenação no oficial](telas/oficial-ordenacao.png)
![Ordenação na nossa](telas/nosso-ordenacao.png)

**Pergunta de tradeoff.** Duas consequências hipotéticas, ambas ruins em quase
tudo. O oficial desenha as duas como barras; nós mostramos os valores por
critério e marcamos o que é idêntico nas duas situações.

![Tradeoff no oficial](telas/oficial-tradeoff.png)
![Tradeoff na nossa](telas/nosso-tradeoff.png)

## Resultados

<!-- inicio:tabela -->
| Caso | Alt × Crit | Oficial `ord/tradeoff` | Nosso `ord/tradeoff` | |
|---|---|---|---|---|
| `escolha-dominante` | 3 × 3 | 3/0 | 3/0 | **bate** |
| `escolha-minima` | 2 × 2 | 1/1 | 1/1 | **bate** |
| `ranking-cruzado` | 3 × 3 | 3/8 | 3/8 | **bate** |
| `escolha-06` | 6 × 5 | 8/10 | 8/10 | **bate** |
| `ranking-06` | 6 × 5 | 8/14 | 8/14 | **bate** |
| `sorting-04` | 4 × 3 | 3/6 | 3/6 | **bate** |
| `escolha-12` | 12 × 5 | 8/6 | 8/6 | **bate** |
| `ranking-12` | 12 × 5 | 8/14 | 8/14 | **bate** |
| `escolha-15` | 15 × 3 | 3/6 | 3/6 | **bate** |
| `ranking-15` | 15 × 3 | 3/12 | 3/12 | **bate** |
| `sorting-06` | 6 × 5 | 8/18 | 8/22 | difere |
| `bc-08` | 8 × 4 | 5/17 | 5/17 | **bate** |
| `escolha-20` | 20 × 5 | 8/12 | 8/12 | **bate** |
| `ranking-20` | 20 × 5 | 8/21 | 8/22 | difere |
| `sorting-20` | 20 × 4 | 5/17 | 5/17 | **bate** |
| `bc-20` | 20 × 4 | 5/17 | 5/11 | difere |
| `escolha-empate` | 3 × 3 | **trava** | 3/0 | oficial não completa |

<!-- fim:tabela -->

**13 de 16 casos** que o sistema oficial completa batem em número de perguntas, nas duas fases — ordenação das constantes de escala e elicitação por decomposição. Em 1 caso o oficial não completa.


## O que a comparação encontrou

Três divergências de método, achadas pelo mesmo procedimento: capturar as duas
sequências de perguntas e diferenciar. Nas três, as perguntas iniciais eram
**idênticas** — mesmos pares, mesmos pontos de bisseção — e a diferença estava
em **quando cada sistema para**.

As três correções estão no motor e valem para a maioria dos casos, mas **não
fecham tudo**: `sorting-06` e `ranking-20` continuam divergindo. Vale dizer por
quê, porque é um risco de método: cada correção foi medida contra o caso em que
a divergência apareceu, e casos novos mostraram que a regra encontrada não
generaliza por completo. O número de casos que batem subiu de 10 para 13 em 16,
e os três que restam estão na seção seguinte.

### A pergunta de abertura

O oficial abre a elicitação confrontando o critério **mais importante com o
menos importante**, e só depois refina par a par. Nós só perguntávamos sobre
pares consecutivos, o que dava sempre uma pergunta a menos.

Com três critérios ele abre com `qualidade × prazo`; com cinco, `qualidade ×
suporte técnico`. É a razão de pesos mais larga que existe, então respondê-la
corta o espaço de pesos no ponto de maior ignorância.

Detalhe que não é cosmético: a razão extrema é o **produto** das razões
consecutivas, e cada fator está em (0, 1]. Um piso no produto é piso em cada
fator, e precisa ser propagado — sem isso o seletor pergunta dentro de uma faixa
que já não existe, e responder "B" esvazia o espaço de pesos. O decisor receberia
"as declarações se contradizem" por ter respondido o que lhe foi perguntado.

### O limiar de equivalência, e o que ele não era

O `epsilon` do nosso motor estava documentado como equivalente ao *equivalence
threshold* do oficial. Não era. O nosso é folga de restrição entre as constantes
de escala de dois **critérios**; o dele compara os valores globais de duas
**alternativas** para declará-las indiferentes. Objetos distintos com o mesmo
nome — o que custou um diagnóstico errado antes de ser percebido.

O limiar de verdade passou a existir, com o padrão 0,01 do oficial, e entra como
**folga no teste de dominância**. A medida que fechou isso: num caso de 12
alternativas, depois de 14 respostas,

```
max(V[Alt 07] − V[Alt 01]) = 0.009222
max(V[Alt 01] − V[Alt 07]) = 0.057143
```

Alt 01 nunca fica mais de 0,0092 atrás — abaixo do limiar. O oficial declara a
dominância; nós exigíamos vantagem até a última casa e gastávamos quatro
perguntas atrás de uma diferença que ninguém sente.

Isso trouxe uma consequência que precisou de tratamento: dominância com folga
deixa de ser antissimétrica, e duas alternativas próximas "superam" as duas.
Somado como dominância dupla, produzia faixa de posição **invertida** — `[12-11]`,
primeira posição maior que a última, indo para a tela. Empate passou a ser lido
como empate, e o ranking fecha como **pré-ordem** — a mesma palavra que o
oficial usa ("A complete pre-order has been found").

### O sorting decide pela largura da faixa

Mesma investigação, terceiro resultado. As 18 primeiras perguntas idênticas; no
passo 18 sobrava uma alternativa atravessando um corte:

```
passo 17: faixa [0.6912, 0.7083]  largura 0.0171  atravessa por 0.0083
passo 18: faixa [0.6995, 0.7083]  largura 0.0088  atravessa por 0.0005
```

O critério não é a **profundidade** do cruzamento — 0,0083 no passo 17 já caberia
em qualquer limiar de 0,01, e mesmo assim ele seguiu perguntando. É a **largura**
da faixa: se o valor global não pode mais ser fixado com precisão melhor que o
limiar, nenhuma pergunta futura decide de que lado do corte a alternativa está.

## O que permanece diferente

### Ranking e classificação: uma instância cada

`ranking-20` fica em 22 perguntas contra 21 dele, e `sorting-06` em 22 contra
18. São as mesmas duas problemáticas cujas divergências foram corrigidas — e
que voltam a divergir em instâncias diferentes das que serviram de medida.

A leitura honesta: as regras encontradas (dominância com folga do limiar, e
classificação pela largura da faixa) descrevem o comportamento do oficial nos
casos em que foram medidas, e não em todos. Falta o mesmo trabalho — capturar as
duas sequências nesses dois casos e medir o estado no passo onde divergem.

Nos dois, o **desfecho** é o mesmo: ordem completa de um lado e do outro,
classificação completa de um lado e do outro.

### Benefício-custo: mesmo resultado, menos perguntas

Nos casos de carteira por razão benefício-custo os dois sistemas chegam à
**mesma carteira** — conferido projeto a projeto, inclusive com 20 projetos e
2²⁰ subconjuntos possíveis:

```
oficial:  [Alt 07, Alt 04, Alt 05, Alt 08, Alt 10, Alt 02]   $143 de $160
nosso:    [Alt 02, Alt 04, Alt 05, Alt 07, Alt 08, Alt 10]   $143 de $160
```

A diferença é o número de perguntas: a nossa parada dispara quando a carteira
está definida; o oficial continua. Cinco hipóteses foram testadas para explicar
o ponto exato em que ele para — separação das faixas de razão, largura das
faixas de razão, largura das faixas de valor, esgotamento da bissecção,
resolução mais grossa de bracket — e **todas foram refutadas**. Não sabemos o
critério dele.

O que se sabe: forçar mais perguntas do nosso lado **não muda a carteira**. A
diferença é de processo, não de conclusão.

### Portfólio combinatorial: não comparável em sessão

O módulo de Portfólio Combinatorial roda num deploy separado
(`fitradeoffportcombinatorio.dll`, versão `FU-TXPNM-WF1`) e pede login de novo.
Depois de salvar a matriz ele **não elicita**: entra num processamento
assíncrono —

> *"The set of feasible portfolios is being generated. Depending on the number
> of criteria and projects, this process may take a few minutes. We'll send you
> a notification through the registered e-mail as soon as this process is
> finished."*

Quatro casos ficaram sete minutos sem concluir, inclusive um com orçamento menor
que o projeto mais barato, cujo conjunto viável é trivial. É diferença de
arquitetura: ele enumera carteiras offline, nós aproximamos por amostragem de
vértices e respondemos na hora. Comparar exige o modelo de voltar depois.

## Onde o oficial não completa

Com **matriz degenerada** — todas as alternativas idênticas — o oficial trava, e
no mesmo ponto nos dois módulos testados: depois do `Save & Continue`, a tela de
Intra-Criteria Evaluation nunca aparece. Faz sentido: com alternativas iguais
todo critério tem faixa zero, e a elicitação da função valor não tem o que fazer.

Nós respondemos, e desde o limiar de equivalência respondemos bem: *"3
alternativas ficaram equivalentes dentro do limiar de 0,01: qualquer uma delas
serve; mais perguntas não separariam."*
