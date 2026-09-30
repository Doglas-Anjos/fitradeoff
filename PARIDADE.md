# Paridade com o sistema oficial

Levantado do *Practical User Guide — FITradeoff* (CDSID-UFPE, 2023, 41 páginas),
que traz as figuras de todas as telas do sistema `FU_T3MMM_WF1a`.

Legenda: **✅ temos** · **◐ parcial** · **❌ falta**

## 1. Entrada de dados

| # | Recurso no oficial | Nós | Observação |
|---|---|---|---|
| 1.1 | Import de planilha | ✅ | Melhor: aceitamos `.xlsx`/`.csv`; eles exigem `.xls` 97-2003 |
| 1.2 | Cadastro manual de alternativas e critérios | ✅ | Tela estrutural própria, com listas, contagem, seleção, edição e exclusão antes da matriz de desempenhos |
| 1.2b | **Configuração exigida por cada problemática** | ✅ | Faixas e cortes no sorting; orçamento e coluna de custo na carteira, apresentados depois da estrutura e dos desempenhos |
| 1.3 | Critério discreto com nº de níveis declarado | ✅ | Níveis são cadastrados e editados na tela do critério e limitam os valores aceitos na matriz |
| 1.4 | Critério contínuo com marcação de inteiro | ✅ | A marcação é preservada no rascunho e valida os valores da matriz sem inventar campo no contrato do motor |
| 1.5 | **Avaliação intra-critério por elicitação de pontos** | ✅ | Elicitação por bisseção, com a reta desenhada por baixo. Desde 25/09 é passo do fluxo, antes da ordenação — estava só dentro da etapa "Problema", onde ninguém achava |
| 1.6 | Input Page — revisão dos dados antes de começar | ✅ | A etapa "Problema", acessível a qualquer momento |
| 1.7 | **Limiar de equivalência editável** | ◐ | Padrão 0,01, o mesmo dele, e configurável por decisão pela API e pelo MCP; o valor é gravado no registro, para que reabrir a decisão reproduza o resultado. Falta o controle na tela. Não confundir com `epsilon`, que é folga entre constantes de escala. Confirmado com captura: lá fica na tela de revisão, com valor padrão 0,01, e pode ser alterado durante a elicitação |
| 1.8 | **Mecanismo de veto** | ◐ | Implementado para escolha e ordenação, como lá. A penalidade é a de de Almeida (2013); a dominância sai de um envelope conservador por LP, porque o valor penalizado é quadrático nos pesos. Faixas mais largas que as verdadeiras, nunca mais estreitas — e a ressalva acompanha o resultado. Ver a seção "O veto" abaixo |

## 2. Ordenação das constantes de escala

| # | Recurso | Nós | Observação |
|---|---|---|---|
| 2.1 | **Pairwise comparison com gráfico de consequências** | ✅ | Modo padrão da ordenação, com a faixa de cada critério desenhada |
| 2.2 | Overall evaluation | ◐ | Temos a seleção sequencial; falta o gráfico de barras com a faixa de cada critério |
| 2.3 | Tratamento da indiferença na ordenação | ✅ | O par fica registrado e a tela avisa que a posição foi arbitrada |
| 2.4 | Heurística para reduzir o nº de perguntas da ordenação | ✅ | Inserção com busca binária: O(n log n) em vez de O(n²) |

## 3. Elicitação por decomposição

| # | Recurso | Nós | Observação |
|---|---|---|---|
| 3.1 | Pergunta de tradeoff com gráfico | ✅ | |
| 3.2 | Respostas A / B / Indiferente | ✅ | |
| 3.3 | **Resposta "não sei"** | ✅ | Encerra o par sem gerar restrição — distinta da indiferença |
| 3.4 | Níveis intermediários em critério discreto | ◐ | O motor respeita os níveis; falta a tela dedicada |
| 3.5 | Contador de perguntas respondidas | ✅ | |
| 3.6 | Contador de alternativas potencialmente ótimas | ✅ | |
| 3.7 | "Show Current Results" durante a elicitação | ✅ | Mostramos sempre, sem precisar pedir |
| 3.8 | "Go back one step" | ✅ | |

## 4. Visualizações de resultado

| # | Recurso | Nós | Observação |
|---|---|---|---|
| 4.1 | Visualização tabular | ✅ | |
| 4.2 | **Gráfico de barras** (alternativas × critérios) | ✅ | |
| 4.3 | **Gráfico radar** | ✅ | Critérios em sentido horário |
| 4.4 | **Gráfico de bolhas** | ✅ | |
| 4.5 | **Diagrama de Hasse** (ranking e portfólio) | ✅ | Com redução transitiva; falta distinguir a origem do arco por cor |
| 4.6 | **Gráfico de Gantt** (sorting) | ✅ | Faixas de valor por classe, com os perfis marcados |
| 4.7 | Gráfico dos limites das constantes de escala | ◐ | Temos as faixas; eles mostram a evolução ao longo das perguntas |
| 4.8 | Selecionar quais alternativas exibir | ✅ | |
| 4.9 | Esconder critérios em que todas empatam | ✅ | |
| 4.10 | Tabela de diferenças máximas entre incomparáveis | ✅ | Mostra se ainda vale perguntar sobre aquele par |
| 4.11 | "Finalize decision process" | ✅ | "Já decidi, encerrar", com volta para continuar respondendo |
| 4.12 | Salvar gráfico como imagem | ✅ | PNG, com as variáveis CSS resolvidas antes de exportar |

## 5. Avaliação holística

| # | Recurso | Nós | Observação |
|---|---|---|---|
| 5.1 | Julgamento entre alternativas reais | ✅ | Agora também na tela, ao lado dos gráficos |
| 5.2 | Escolher a visualização antes de julgar | ✅ | As quatro abas ficam acima do julgamento |
| 5.3 | Explicação conceitual junto ao gráfico | ✅ | Dica contextual em cada visualização |

## 6. Teste de inconsistência

| # | Recurso | Nós | Observação |
|---|---|---|---|
| 6.1 | Detecção de inconsistência | ✅ | Sai do LP inviável |
| 6.2 | **Tela de resolução** | ✅ | Mostra o par em conflito e as saídas; distingue conflito de declaração impossível |
| 6.3 | Reversão automática da resposta descartada | ✅ | A→B e B→A; a indiferença não tem oposto único, então só remove |

## 7. Análise de sensibilidade

| # | Recurso | Nós | Observação |
|---|---|---|---|
| 7.1 | **SA sobre as consequências** | ✅ | Varia os valores em ±% por critério e conta em quantos cenários a solução muda |
| 7.2 | SA sobre o limiar de equivalência | ✅ | **Só nós temos** — é outra coisa, não substitui 7.1 |
| 7.3 | Escolher quais critérios variar e em quanto | ✅ | |
| 7.4 | Gráfico e tabelas do resultado da SA | ◐ | Feito para escolha; falta o recorte por posição (ranking) e por classe (sorting) |

## 8. Export

| # | Recurso | Nós | Observação |
|---|---|---|---|
| 8.1 | Dados de entrada e resultado | ✅ | |
| 8.2 | **Resumo das perguntas** (ciclo a ciclo) | ✅ | Aba "Perguntas" no export, além da trilha narrada |
| 8.3 | Relatório da análise de sensibilidade | ✅ | Aba opcional no export (`?sensibilidade=true`) |

## O veto: o que se sabe, e como foi implementado

Levantado em 25/09/2026 a partir do *User Guide* oficial (web-7, abril/2025, cap. 3.1
"The Veto Mechanism") e da formulação publicada em Palha, de Almeida, Morais &
Hipel (2019), *J. Civil Eng. Manag.* 25(4), seção 3.1, que reproduz as equações
de de Almeida (2013). Implementado em 25/09/2026, pelo caminho 4 descrito
adiante — que não estava na primeira análise.

**O que o veto faz.** Penaliza, não elimina. O decisor declara, por critério e
opcionalmente, um limite superior `u` (desempenho mínimo aceitável, acima do
qual nada muda) e um limite inferior `l` (desempenho a partir do qual é
inaceitável). Entre os dois fica a região de hesitação, onde a alternativa sofre
penalidade proporcional. Disponível só nas problemáticas de escolha e ordenação.

Com `v_i(x)` o valor intra-critério e `k_i` a constante de escala:

    z_i(x) = 0                        se v_i(x) ≤ l_i
           = 1                        se v_i(x) ≥ u_i
           = (v_i(x) − l_i)/(u_i − l_i)  entre os dois

    V'(x) = [ Σ_i k_i · z_i(x) ] · [ Σ_i k_i · v_i(x) ]

Duas consequências que a fórmula deixa explícitas e que a prosa do guia não
deixa: um veto total (`z_i = 0`) **não zera** a alternativa, apenas retira `k_i`
do multiplicador — `V' = (1 − k_i)·V`; e o critério vetado continua somando em
`Σ k_i v_i`, apesar de o texto dizer que "não deveria contribuir". A fórmula é o
que vale.

**O problema que o veto cria.** `V'` é o produto de duas expressões lineares em
`k`, logo **quadrática em `k`**. Todo o motor decide dominância e otimalidade
potencial resolvendo programas lineares sobre o politopo de pesos viáveis; com o
valor penalizado, o teste `V'(a) ≥ V'(b) para todo k admissível` deixa de ser um
LP — minimizar a diferença de duas formas quadráticas indefinidas sobre um
politopo é programação bilinear, NP-difícil no caso geral. Não é um campo a mais
na tela: é mexer na base do que torna escolha e ranking resultados **exatos**.

Os caminhos, com o preço de cada um:

1. **Amostragem de vértices**, como a carteira já faz. Barato, cabe na
   arquitetura, e é *inseguro*: os extremos de uma função bilinear não estão
   necessariamente nos vértices do politopo, então amostrar pode afirmar
   dominância que não existe.
2. **Programação quadrática**, trocando o solver. Mantém a exatidão e é a
   mudança mais cara do projeto até aqui.
3. **Não implementar**, e registrar a diferença.
4. **Envelope conservador por LP** — o caminho escolhido. Como `r(x) = Σ k_i z_i`
   e `V(x) = Σ k_i v_i` são ambas lineares e não negativas no espaço viável,

       r_min · V_min  ≤  r(k) · V(k)  ≤  r_max · V_max

   para todo `k` admissível. Os quatro extremos saem de LPs exatos, então a faixa
   publicada **contém** a faixa verdadeira: é mais larga que ela, nunca mais
   estreita. A dominância só é declarada entre faixas disjuntas — o mesmo
   critério que a carteira por razão já usa.

**O que o caminho 4 custa, dito onde importa.** Um envelope conservador tem dois
erros possíveis, e eles não valem o mesmo: deixar de declarar uma dominância que
existe é perda de poder; declarar uma que não existe é mentir sobre a decisão de
alguém. O envelope só comete o primeiro. Na prática, com veto declarado podem ser
necessárias mais perguntas até uma recomendação. Isso está dito na ressalva que
acompanha todo resultado sob veto (`problematics/veto.py`, publicada pela API, pelo
MCP e pela tela) e no próprio cadastro, antes de a pessoa declarar o veto.

**Um ponto que a primeira análise deixou passar.** A otimalidade potencial também
precisou mudar. O LP de POA responde sobre o valor *sem* penalidade, e sob veto
ele pode descartar uma alternativa que, penalizada a rival, seria a melhor —
descartar é sumir com a opção da tela antes de o decisor a ver. Sob veto a
leitura passou a ser a conservadora: é POA quem nenhuma outra domina pelo
envelope. `engine/tests/test_veto.py` traz o contraexemplo com o vetor de pesos
em que a descartada vence, para que isso não dependa de acreditar no envelope.

**Onde vale.** Escolha e ordenação, como o guia. Nas outras três o registro é
recusado, com mensagem — calcular ignorando o veto entregaria ao decisor um
número que ele leria como se tivesse veto, o que é pior que não entregar número.
A recusa mora no template de `Problematic.validate`, e um teste de arquitetura
impede que uma problemática nova escape dela sobrescrevendo `validate`.

**O que não foi confirmado:** que o sistema de referência implemente exatamente
essas equações — o guia não traz fórmula, e a ligação entre os dois documentos é
inferida da linhagem (mesmo grupo, mesma terminologia de limite superior e
inferior). Também não se sabe como eles contornam o problema do LP, nem se
interpolam a hesitação na escala bruta ou na escala de valor. O artigo de
de Almeida (2013), que resolveria a primeira dúvida, está atrás de paywall.
**Nossa escolha:** interpolar na escala de **valor**, não na bruta — é o que
resolve de uma vez a direção do critério (num critério de minimização "acima do
limite superior" quer dizer número menor) e a curva elicitada, quando existe.
Um `if` sobre a direção resolveria a primeira e erraria a segunda.

**Uma confusão a evitar:** há um uso *aplicado* do veto no FITradeoff que
elimina alternativas (Rodrigues et al., 2020, seleção de fornecedores têxteis),
mas ali o veto é um pré-filtro do analista, feito **antes** do método. Não é o
"Use veto model" do sistema. E o veto do ELECTRE é outra coisa ainda: bloqueia
relação de sobreclassificação, é binário e relacional; este é um multiplicador
escalar sobre o valor global de uma alternativa isolada.

---

## 9. O que só nós temos

| Recurso | Por quê importa |
|---|---|
| API HTTP | Integração com outros sistemas |
| Servidor MCP + agente conversacional | Decidir conversando |
| Trocar de problemática sem reelicitar | O log serve às quatro leituras |
| Trilha de auditoria narrada em português | Defender a decisão sem ler LP |
| SA sobre o limiar de equivalência | Mostra o quanto a conclusão depende dele |
| Responsivo e acessível | O oficial não abre em celular |
| Suíte automatizada de motor, API e interface | |

## Verificado no sistema oficial, com acesso à tela

Percorrido em 24/09/2026 pelo navegador, na sessão do próprio usuário.

**Eles têm cinco módulos, não quatro.** A tela de seleção lista:

    Portfólio (Benefit-to-Cost)
    Choice [Escolha]
    Portfólio (Combinatorial)
    Sorting [Classificação]
    Ranking [Ordenação]

Nosso `portfolio` faz seleção de conjunto dentro de um orçamento, o que
corresponde ao **Combinatorial**. O **Benefit-to-Cost** é um método distinto,
e era a única lacuna de capacidade encontrada em toda a comparação - todo o
resto que faltava era apresentação sobre capacidade que o motor já tinha.

**Fechada em 25/09/2026**: a problemática `beneficio_custo` existe, com as cinco
agora registradas. Ela ordena os projetos pela razão entre benefício e custo e
seleciona nessa ordem enquanto o orçamento permitir.

**Na tela, também em 25/09/2026.** Até aqui a quinta existia no motor, na API e
no MCP e não na interface: o seletor de objetivo tinha quatro entradas, e dava
para criar uma carteira por razão pelo chat mas não pelo formulário. Agora as
duas carteiras dividem uma caixa só, com o mesmo diagrama e um helper que diz
qual usar - que é como o sistema de referência as apresenta, e pela mesma razão:
as duas pedem os mesmos dados e respondem à mesma pergunta, e o que muda é o
critério de seleção.

Os nomes dos cinco passaram a ser os de lá. "Montar carteira" descrevia melhor
a ação, mas quem chega de um artigo ou usa os dois sistemas lado a lado procura
por "Portfólio (Combinatorial)". O desenho da carteira também: era um gráfico de
barras sob um teto tracejado escrito "orçamento" - a única palavra dentro dos
quatro diagramas - e passou a ser a figura de lá, pontos com uma elipse em volta
do subconjunto levado.

O que é exato e o que não é, porque a distinção importa: a faixa de razão de
cada projeto sai por programação linear, sem amostragem - o custo é constante e
o valor global é linear nos pesos, logo a razão também é, e os seus extremos
sobre o espaço de pesos são obteníveis direto. A dominância entre dois projetos
é declarada quando as faixas não se sobrepõem, critério conservador e
conferível na tela. Já a carteira final é aproximada por amostragem de
vértices, porque a seleção gulosa depende da ordem completa e a ordem depende
do vetor de pesos. A ressalva diz isso ao decisor.

**Quando ela para de perguntar, medido contra o oficial (28–29/09/2026).** A
elicitação segue até a ordem das razões ficar fechada par a par, e não só até a
carteira ficar única: é o que o oficial faz, e o que faz `bc-08` e `bc-20`
terminarem com as mesmas 17 perguntas dos dois lados. Há uma segunda parada,
antes da primeira pergunta de tradeoff: se o que entra na carteira já está em
posição própria e o que ainda está sem ordem fica todo de fora do orçamento,
ele encerra com *"Considering the budget value, this is the recommendation"*, e
nós também. As medições que fixaram as duas regras, inclusive o caso que
derrubou a primeira versão da segunda, estão em
[`paridade/EQUIVALENCIA.md`](paridade/EQUIVALENCIA.md).

**A problemática lá é um módulo escolhido antes de tudo.** O fluxo é: escolher
módulo -> escolher entre importar planilha, cadastrar problema novo ou
continuar um registrado -> só então o formulário. A interface atual segue a
mesma progressão e mantém cada responsabilidade numa etapa própria.

**Eles não pedem perfis de referência no cadastro estrutural.** A tela de
cadastro do Sorting é idêntica à do Choice: alternativas, critérios, escala,
direção e nome. Aqui também: classes e cortes aparecem numa etapa posterior,
depois da matriz, imediatamente antes de criar a decisão válida no motor.

## Resumo

| Bloco | Temos | Parcial | Falta |
|---|---:|---:|---:|
| Entrada | 7 | 1 | 0 |
| Ordenação de pesos | 3 | 1 | 0 |
| Elicitação | 6 | 1 | 1 |
| Visualizações | 11 | 1 | 0 |
| Holística | 3 | 0 | 0 |
| Inconsistência | 3 | 0 | 0 |
| Sensibilidade | 3 | 1 | 0 |
| Export | 3 | 0 | 0 |
| **Total** | **39** | **4** | **1** |

### Feito até aqui

- Fluxo de entrada em etapas: problemática e fonte, cadastro estrutural,
  desempenhos e ajustes específicos. O rascunho conserva a etapa e os dados ao
  voltar ou reabrir a página
- Cadastro estrutural de alternativas e critérios com listas editáveis, escala
  contínua ou discreta, níveis declarados e validação de valores inteiros
- Barras, radar, bolhas e tabela, com seleção de alternativas e filtro de
  critérios empatados (4.2–4.4, 4.8, 4.9)
- Julgamento holístico na tela (5.1)
- **Diagrama de Hasse** (4.5), com redução transitiva — só as arestas de
  cobertura, senão o grafo vira um emaranhado
- **Sensibilidade sobre as consequências** (7.1, 7.3, 7.4) — a que os papers
  usam, e que não substitui a nossa sobre o limiar
- **Curva de valor intra-critério** (1.5) no motor: o método não supõe que valor
  cresce linearmente com desempenho, e agora nós também não

### Também feito

- **Diagrama de Hasse** (4.5) e **Gantt do sorting** (4.6)
- **Resolução de inconsistência** (6.2, 6.3): mostra o par em conflito lado a
  lado e oferece saídas. Distingue dois casos que o oficial trata como um só —
  duas declarações que não cabem juntas, e uma declaração que a própria matriz
  desmente (preferir quem perde em todos os critérios)

### O que falta

| Item | Situação |
|---|---|
| 1.7 · Limiar de equivalência editável na tela | Configurável por decisão na API e no MCP, e gravado com o registro — reabrir devolve o mesmo resultado. Falta o controle na tela |
| 2.2 · Gráfico na *overall evaluation* | O modo par a par, que é o do método, já tem |
| 3.4 · Tela dedicada a níveis intermediários | O motor respeita os níveis nas perguntas |
| 4.7 · Evolução das faixas ao longo das perguntas | Mostramos o estado atual, não a série histórica |
| 7.4 · Recorte da sensibilidade por posição e classe | Feito para escolha |

Nada aqui muda o resultado de uma decisão: são refinamentos de apresentação
sobre capacidade que o motor já tem.

---

O maior vazio era o **bloco 4, visualizações** — que no FITradeoff não é enfeite:
o apoio gráfico é parte do método, porque é como o decisor faz a avaliação
holística. Depois vinham a **análise de sensibilidade sobre consequências** (7.1) e
a **curva de valor intra-critério** (1.5), que na época assumíamos linear. As três
estão feitas; a curva, inclusive, com as regras de elicitação conferidas pergunta a
pergunta contra o oficial, em escala contínua e discreta.
