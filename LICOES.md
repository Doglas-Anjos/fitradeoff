# Lições de engenharia reversa

Este projeto reimplementa o método FITradeoff a partir de um guia publicado e
de observação do sistema oficial (CDSID/UFPE), e foi validado contra ele caso a
caso (ver [`paridade/EQUIVALENCIA.md`](paridade/EQUIVALENCIA.md)). O difícil não
foi a matemática do método — foi reproduzir, por teste diferencial contra uma
caixa-preta, as dezenas de regras que o sistema oficial aplica e não documenta.

As cinco lições abaixo são genéricas: valem para qualquer engenharia reversa.
Cada uma traz, em itálico, a cicatriz concreta deste projeto.

## 1. O comportamento é a verdade; a documentação é só a intenção

Manual, spec e artigos dizem como *deveria* funcionar — o artefato em execução
carrega decisões que ninguém escreveu. Quando divergem, confie no que o sistema
faz, não no que o PDF diz.

*Aqui: a pergunta de abertura, a regra de parada e a ordem dos pares não
estavam em artigo nenhum; só apareceram rodando o sistema.*

## 2. A técnica central é teste diferencial, passo a passo

Não valide a sua saída — compare-a com a original **em cada etapa**. Rodar os
dois lado a lado e diferenciar a cada pergunta/estado é o que revela as regras
escondidas. Comparar só o resultado final esconde que o caminho divergiu.

*Aqui: capturar as duas sequências de pergunta e diferenciá-las achou todas as
divergências reais de método.*

## 3. A dificuldade mora nos detalhes que ninguém documenta

Arredondamento, desempate, ordem, condições de borda. O "último 5%" — onde se
arredonda, qual valor ganha no empate, o que acontece numa faixa de largura
zero — consome 90% do esforço. Resultados iguais podem esconder caminhos
diferentes.

*Aqui: bisectar na consequência arredondada (1,33) em vez do valor contínuo
(1,25) quebrava 12 de 16 casos.*

## 4. Nomes iguais podem significar coisas diferentes, e o erro é silencioso

Um parâmetro "equivalente" que compara outro objeto não levanta exceção — só
desvia o comportamento devagar. Fixe o que cada quantidade *realmente* mede, não
como ela se chama.

*Aqui: o limiar de equivalência (`epsilon`) estava documentado como equivalente
ao do oficial, mas comparava alvos distintos.*

## 5. Obter observações limpas da original é um projeto à parte

Alvo frágil, anti-automação ou não determinístico faz o *harness de captura*
valer tanto quanto a reimplementação. E versione/congele o que capturou, para
testar sem depender da original.

*Aqui: metade do driver do oficial é cicatriz de IntraWeb (User-Agent recusado,
botão que some no meio do clique, sessão que trava por horas); a medição ficou
versionada e a suíte roda sem rede e sem conta.*

## E a sexta, que todo RE aprende tarde: saiba a hora de parar

Paridade perfeita tem retorno decrescente. Documente a divergência que sobra,
prenda-a num teste para que fechá-la quebre o teste, e siga. **67 de 73 casos
batem, com os 4 restantes marcados** — isso é resultado maduro, não inacabado.
