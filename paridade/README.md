# Suíte de paridade

Roda os mesmos problemas de decisão na nossa plataforma e no **FITradeoff
oficial** (CDSID/UFPE) e compara, caso a caso, quantas perguntas cada um faz e a
que resultado chega.

O relatório está em [EQUIVALENCIA.md](EQUIVALENCIA.md). Isto aqui é como rodar.

## Como rodar

```bash
# só o nosso motor — não precisa de rede nem de conta
python paridade/comparar.py nosso

# o sistema oficial, quatro sessões em paralelo
FIT_USER=seu@email  FIT_PASS=sua-senha  python paridade/comparar.py oficial

# a tabela, a partir do que já foi gravado
python paridade/comparar.py tabela

# as duas sequências de perguntas lado a lado, para achar onde divergem
FIT_USER=...  FIT_PASS=...  python paridade/comparar.py capturar ranking-20

# trava a paridade medida: roda o nosso motor e confere contra resultados/
python -m pytest paridade/

# só o leitor da tela final do oficial, sem rodar o motor (instantâneo)
python -m pytest paridade/test_extrair.py

# um caso só
python paridade/comparar.py nosso ranking-20
```

Cada modo grava em `resultados/`, para que a tabela possa ser refeita sem
repetir a parte cara. O lado oficial leva alguns minutos por caso: é navegador
de verdade contra um servidor de terceiros.

As credenciais vêm do ambiente e nunca são gravadas. A conta é do CDSID; use uma
descartável se for compartilhar o terminal.

## O que há aqui

| Arquivo | |
|---|---|
| [casos.py](casos.py) | Os problemas, de 2 a 20 alternativas |
| [oficial.py](oficial.py) | Dirige o sistema de referência por Playwright |
| [comparar.py](comparar.py) | Roda os dois lados e monta a tabela |
| [gerar_tabela.py](gerar_tabela.py) | Reescreve a tabela do relatório |
| [gerar_web.py](gerar_web.py) | Gera os dados da tela `/paridade` |
| [resultados/](resultados/) | As medições, versionadas: é o que torna a afirmação auditável |
| [extrair.py](extrair.py) | Lê o resultado na tela final que o oficial deixou gravada |
| [test_paridade.py](test_paridade.py) | Trava a paridade: falha se ela mudar |
| [test_extrair.py](test_extrair.py) | Testa o leitor contra telas reais |
| [EQUIVALENCIA.md](EQUIVALENCIA.md) | O relatório |

## O que a suíte trava

Duas coisas, e as duas contra `resultados/oficial.json` — a medição gravada do
sistema de referência, não um valor que alguém digitou como esperado.

**Quantas perguntas.** Os passos de ordenação das constantes de escala e os de
tradeoff, caso a caso. As duas divergências que permanecem estão declaradas por
nome no teste, com o vão exato: fechar uma delas também quebra o teste, de
propósito, para obrigar a atualizar o relatório e a tela junto.

**A que resultado se chega.** Cada caso guarda o texto da tela final do oficial,
e `extrair.py` tira dela o que ele concluiu, conforme a problemática:

| | Comparado |
|---|---|
| escolha | o vencedor |
| ranking | o tipo de desfecho: ordem completa ou pré-ordem |
| sorting | a classe de cada alternativa, uma a uma |
| benefício-custo | o conjunto de projetos da carteira (a ordem de exibição difere) |

Isso fecha um buraco real: antes, uma mudança no motor podia manter a contagem
de perguntas e trocar o vencedor sem que nada reclamasse. Nos 16 casos que o
oficial completa o resultado bate em **todos**, e desde 28/09/2026 o número de
perguntas também — `ranking-20` e `bc-20`, que divergiam, fecharam por medição
(ver `EQUIVALENCIA.md`).

O leitor falha alto quando não entende a tela, em vez de devolver vazio. Não é
zelo: um extrator que devolvesse nada deixaria a comparação passar sem comparar
coisa alguma, e a suíte ficaria verde afirmando o que já não verifica.

## A política de resposta

Todos os casos respondem **sempre a opção A**. Não é a resposta de um decisor
real — é a única forma de o percurso ser reproduzível dos dois lados. O que se
verifica não é "a recomendação está certa", que depende da preferência de quem
responde, e sim que os dois sistemas **fazem as mesmas perguntas e chegam ao
mesmo lugar**.

## Três coisas que o sistema oficial exige e não são óbvias

**A URL que parece certa não é o app.** `http://15.229.155.120/fitradeoff/`
devolve uma tela de erro do IntraWeb — "Device not supported" — que é o
User-Agent sendo recusado, não o sistema fora do ar. A entrada é
`/fitradeoff/fitradeoff.dll/`, e o bootstrap mede o viewport por JavaScript
antes de abrir sessão. `curl` não serve.

**O clique some no meio da ação.** Cada clique dispara um re-render completo e o
próprio botão desaparece; o Playwright reporta timeout embora o clique tenha
funcionado. Por isso `avanca()` nunca verifica o clique — verifica o avanço para
a tela seguinte.

**Espera por relógio não sobrevive à concorrência.** Com quatro sessões o
servidor fica mais lento e um `sleep` calibrado para uma sessão estoura na tela
errada. Todas as esperas são por condição.
