"""O que acompanha todo resultado calculado sob veto.

A ressalva fica num modulo proprio porque e afirmacao sobre o metodo, nao sobre
a tela: a API, o servidor MCP e a interface web precisam receber exatamente o
mesmo texto, e ele nao pode divergir entre os tres. Quem publicar um numero
calculado sob veto sem publicar isto junto esta escondendo do decisor o que o
numero significa.

Fundamentacao: de Almeida (2013), modelo aditivo com veto, na formulacao
reproduzida por Palha, de Almeida e Alencar (2019),

    z_j(x) = 0            se v_j(x) <= l_j
           = 1            se v_j(x) >= u_j
           = interpolado  entre os dois limites

    V'(x)  = [ SUM_j k_j z_j(x) ] . [ SUM_j k_j v_j(x) ]
"""

RESSALVA_VETO = (
    "Este resultado foi calculado com veto declarado. O valor global passa a "
    "ser o produto de duas grandezas lineares nos pesos, e deixa de ser linear: "
    "a comparação entre alternativas não sai mais de um programa linear exato. "
    "As faixas publicadas são um envelope garantido, calculado por programação "
    "linear — contêm o valor verdadeiro e são mais largas do que ele. Uma "
    "alternativa só é declarada superior a outra quando as duas faixas não se "
    "sobrepõem. É um critério conservador: pode deixar de apontar uma "
    "superioridade que existe, mas nunca aponta uma que não existe. Na prática, "
    "com veto podem ser necessárias mais perguntas para chegar a uma "
    "recomendação."
)

#: Versao curta, para caber num selo ou numa linha de rodape.
SELO_VETO = "Resultado com veto: faixas conservadoras"
