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
| 1.5 | **Avaliação intra-critério por elicitação de pontos** | ◐ | O motor aceita e persiste a curva (`curva_de_valor`); falta a tela que a elicita |
| 1.6 | Input Page — revisão dos dados antes de começar | ❌ | |
| 1.7 | **Limiar de equivalência editável** | ◐ | Existe no motor (`epsilon`), não exposto na tela |

## 2. Ordenação das constantes de escala

| # | Recurso | Nós | Observação |
|---|---|---|---|
| 2.1 | **Pairwise comparison com gráfico de consequências** | ❌ | Compara A vs B graficamente para ordenar os pesos |
| 2.2 | Overall evaluation | ◐ | Temos a seleção sequencial; falta o gráfico de barras com a faixa de cada critério |
| 2.3 | Tela de indiferença → escolher critério representativo | ❌ | |
| 2.4 | Heurística para reduzir o nº de perguntas da ordenação | ❌ | |

## 3. Elicitação por decomposição

| # | Recurso | Nós | Observação |
|---|---|---|---|
| 3.1 | Pergunta de tradeoff com gráfico | ✅ | |
| 3.2 | Respostas A / B / Indiferente | ✅ | |
| 3.3 | **Resposta "No Answer"** | ❌ | Permite pular a pergunta sem declarar preferência |
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
| 4.10 | Tabela de diferenças máximas entre incomparáveis | ❌ | |
| 4.11 | "Finalize decision process" | ❌ | Encerrar por decisão do usuário |
| 4.12 | Salvar gráfico como imagem | ❌ | |

## 5. Avaliação holística

| # | Recurso | Nós | Observação |
|---|---|---|---|
| 5.1 | Julgamento entre alternativas reais | ✅ | Agora também na tela, ao lado dos gráficos |
| 5.2 | Escolher a visualização antes de julgar | ❌ | |
| 5.3 | Explicação conceitual junto ao gráfico | ❌ | |

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
| 8.2 | **Resumo das perguntas** (ciclo a ciclo) | ◐ | Temos a trilha narrada; falta o formato tabular ciclo/consequência A/B/resposta |
| 8.3 | Relatório da análise de sensibilidade | ❌ | Depende de 7.1 |

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
| Entrada | 2 | 3 | 2 |
| Ordenação de pesos | 0 | 1 | 3 |
| Elicitação | 5 | 1 | 2 |
| Visualizações | 8 | 1 | 3 |
| Holística | 1 | 0 | 2 |
| Inconsistência | 3 | 0 | 0 |
| Sensibilidade | 3 | 1 | 0 |
| Export | 1 | 1 | 1 |
| **Total** | **26** | **8** | **10** |

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

### O que falta, por prioridade

1. **Tela que elicita a curva de valor** (1.5) — o motor já aceita e persiste;
   falta a interface ponto a ponto com gráfico
2. **Pairwise comparison gráfico** na ordenação de pesos (2.1)
3. **Resposta "No Answer"** na elicitação (3.3)
4. Recorte da SA por posição e por classe (7.4)
5. Itens menores: 1.4, 1.6, 2.3, 2.4, 4.10–4.12, 5.2, 5.3, 8.2, 8.3

---

O maior vazio era o **bloco 4, visualizações** — que no FITradeoff não é enfeite:
o apoio gráfico é parte do método, porque é como o decisor faz a avaliação
holística. Depois vêm a **análise de sensibilidade sobre consequências** (7.1) e
a **curva de valor intra-critério** (1.5), que hoje assumimos linear.
