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
| [EQUIVALENCIA.md](EQUIVALENCIA.md) | O relatório |

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
