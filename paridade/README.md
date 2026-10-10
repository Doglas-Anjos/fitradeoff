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
| [casos.py](casos.py) | Os 17 problemas originais, de 2 a 20 alternativas, todos lineares e respondidos com A |
| [resultados/casos_medidos.json](resultados/casos_medidos.json) | Os outros 57 casos medidos: curva não linear, critério discreto, respostas A/B, estresse até 7×30. Cada entrada traz a entrada inteira e o que o oficial fez |
| [medidos.py](medidos.py) | Roda o nosso lado de um caso do registro |
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

Tudo contra medição gravada do sistema de referência — `resultados/oficial.json`
para os 17 casos originais, `resultados/casos_medidos.json` para os demais —, não
contra um valor que alguém digitou como esperado.

**Quantas perguntas.** Os passos de ordenação das constantes de escala e os de
tradeoff, caso a caso, e — nos casos do registro — a **sequência de pares**
pergunta a pergunta. As diferenças que permanecem estão declaradas no próprio
registro (campo `divergencia`, com o nosso número e o porquê): fechar uma delas
também quebra o teste, de propósito, para obrigar a atualizar o relatório e a
tela junto.

**A que resultado se chega.** Cada caso guarda o texto da tela final do oficial,
e `extrair.py` tira dela o que ele concluiu, conforme a problemática:

| | Comparado |
|---|---|
| escolha | o vencedor |
| ranking | o tipo de desfecho: ordem completa ou pré-ordem |
| sorting | a classe de cada alternativa, uma a uma |
| benefício-custo | o conjunto de projetos da carteira (a ordem de exibição difere) |

Isso fecha um buraco real: antes, uma mudança no motor podia manter a contagem
de perguntas e trocar o vencedor sem que nada reclamasse.

O placar hoje: **74 casos, 67 batem de 73 comparáveis**. Os 6 que não batem se
resumem a duas diferenças estreitas — abertura respondida B e um par colado
no limiar — e há um caso que o oficial não completa.
Tudo descrito em `EQUIVALENCIA.md`.

O leitor falha alto quando não entende a tela, em vez de devolver vazio. Não é
zelo: um extrator que devolvesse nada deixaria a comparação passar sem comparar
coisa alguma, e a suíte ficaria verde afirmando o que já não verifica.

## A política de resposta

Os 17 casos originais respondem **sempre a opção A**. Os do registro trazem a
sequência de respostas (`respostas`, com A e B) e, quando há curva, as respostas
da elicitação da curva. Nenhuma é a resposta de um decisor real — é o que torna o
percurso reproduzível dos dois lados. O que se verifica não é "a recomendação
está certa", que depende da preferência de quem responde, e sim que os dois
sistemas **fazem as mesmas perguntas e chegam ao mesmo lugar**.

Uma limitação a declarar: os casos do registro foram medidos no oficial com um
script de sessão estendido (curvas, respostas B, critério discreto) que não está
neste diretório. O registro guarda a entrada inteira e o que o oficial fez — o
suficiente para refazer o nosso lado e auditar a comparação —, mas refazer a
medição do lado oficial para esses casos pede aquele script.

## Três coisas que o sistema oficial exige e não são óbvias

**A URL que parece certa não é o app.** A raiz `…/fitradeoff/` (o endereço fica
em `FIT_BASE_URL`, no `.env`) devolve uma tela de erro do IntraWeb — "Device not
supported" — que é o User-Agent sendo recusado, não o sistema fora do ar. A
entrada é `…/fitradeoff/fitradeoff.dll/`, e o bootstrap mede o viewport por
JavaScript antes de abrir sessão. `curl` não serve.

**O clique some no meio da ação.** Cada clique dispara um re-render completo e o
próprio botão desaparece; o Playwright reporta timeout embora o clique tenha
funcionado. Por isso `avanca()` nunca verifica o clique — verifica o avanço para
a tela seguinte.

**Espera por relógio não sobrevive à concorrência.** Com quatro sessões o
servidor fica mais lento e um `sleep` calibrado para uma sessão estoura na tela
errada. Todas as esperas são por condição.
