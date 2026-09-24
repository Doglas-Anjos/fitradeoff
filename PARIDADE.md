# Paridade com o sistema oficial

Levantado do *Practical User Guide — FITradeoff* (CDSID-UFPE, 2023, 41 páginas),
que traz as figuras de todas as telas do sistema `FU_T3MMM_WF1a`.

Legenda: **✅ temos** · **◐ parcial** · **❌ falta**

## 1. Entrada de dados

| # | Recurso no oficial | Nós | Observação |
|---|---|---|---|
| 1.1 | Import de planilha | ✅ | Melhor: aceitamos `.xlsx`/`.csv`; eles exigem `.xls` 97-2003 |
| 1.2 | Cadastro manual de alternativas e critérios | ✅ | |
| 1.3 | Critério discreto com nº de níveis declarado | ◐ | O motor suporta escala construída; falta a UI |
| 1.4 | Critério contínuo com marcação de inteiro | ❌ | |
| 1.5 | **Avaliação intra-critério por elicitação de pontos** | ✅ | Elicitação por bisseção, com a reta linear desenhada por baixo para comparar |
| 1.6 | Input Page — revisão dos dados antes de começar | ✅ | A etapa "Problema", acessível a qualquer momento |
| 1.7 | **Limiar de equivalência editável** | ◐ | Existe no motor (`epsilon`), não exposto na tela |

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

## 9. O que só nós temos

| Recurso | Por quê importa |
|---|---|
| API HTTP | Integração com outros sistemas |
| Servidor MCP + agente conversacional | Decidir conversando |
| Trocar de problemática sem reelicitar | O log serve às quatro leituras |
| Trilha de auditoria narrada em português | Defender a decisão sem ler LP |
| SA sobre o limiar de equivalência | Mostra o quanto a conclusão depende dele |
| Responsivo e acessível | O oficial não abre em celular |
| 246 testes automatizados | |

## Resumo

| Bloco | Temos | Parcial | Falta |
|---|---:|---:|---:|
| Entrada | 4 | 2 | 1 |
| Ordenação de pesos | 3 | 1 | 0 |
| Elicitação | 6 | 1 | 1 |
| Visualizações | 11 | 1 | 0 |
| Holística | 3 | 0 | 0 |
| Inconsistência | 3 | 0 | 0 |
| Sensibilidade | 3 | 1 | 0 |
| Export | 3 | 0 | 0 |
| **Total** | **36** | **5** | **2** |

### Feito até aqui

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
| 1.3 · UI para escala construída (níveis) | O motor suporta; a planilha aceita; falta o formulário |
| 1.4 · Marcar critério como inteiro | Cosmético — afeta só a apresentação do número |
| 1.7 · Limiar de equivalência editável na tela | Existe na API e no chat |
| 2.2 · Gráfico na *overall evaluation* | O modo par a par, que é o do método, já tem |
| 3.4 · Tela dedicada a níveis intermediários | O motor respeita os níveis nas perguntas |
| 4.7 · Evolução das faixas ao longo das perguntas | Mostramos o estado atual, não a série histórica |
| 7.4 · Recorte da sensibilidade por posição e classe | Feito para escolha |

Nada aqui muda o resultado de uma decisão: são refinamentos de apresentação
sobre capacidade que o motor já tem.

---

O maior vazio era o **bloco 4, visualizações** — que no FITradeoff não é enfeite:
o apoio gráfico é parte do método, porque é como o decisor faz a avaliação
holística. Depois vêm a **análise de sensibilidade sobre consequências** (7.1) e
a **curva de valor intra-critério** (1.5), que hoje assumimos linear.
