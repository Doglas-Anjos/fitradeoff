# Padrão de documentação do código

Para quem audita o motor e para quem mexe nele. O objetivo é um só: um auditor
deve conseguir partir de qualquer função que decide algo e chegar, pela
docstring, ao **porquê**, à **fonte** e ao **custo** daquela decisão, sem precisar
perguntar a ninguém.

O padrão formaliza o que o código já faz nas suas melhores partes (o
`problematics/evaluator.py` é o exemplo de referência). Ele não impõe um formato
novo: impõe que o formato que já funciona chegue a todo lugar que decide.

Um teste verifica a parte mecânica: `engine/tests/test_documentacao.py` falha se
algo que o padrão exige ficar sem docstring. O conteúdo é conferido na revisão
do PR.

---

## 1. Princípios

1. **A docstring responde ao que o nome e os tipos não respondem.** O nome diz o
   quê; a assinatura, com as anotações de tipo, diz com o quê. A docstring diz o
   porquê, o contrato que não cabe no tipo e o que custa. Repetir o nome em prosa
   ("Calcula as faixas.") é ruído.
2. **Rastreável.** Toda regra do método aponta para a fonte. Uma regra vem de um
   artigo (autor, ano e, se houver, seção) ou de uma medição contra o sistema
   oficial (o caso, a data e os números). "Porque o oficial faz assim" só vale
   acompanhado da medição.
3. **Honesta sobre a exatidão.** Se o resultado é exato (sai de LP), aproximado
   (sai de amostragem) ou conservador (envelope, sob veto), a docstring diz isso.
   É a distinção que o [AUDITORIA.md](AUDITORIA.md) cobra das telas, e ela começa
   no código.
4. **Português, sem acento, em prosa.** É a convenção do repositório (330 das 338
   docstrings existentes quando o padrão foi escrito). Nada de seções `Args:` e
   `Returns:`: os tipos estão nas anotações. Um parâmetro só é comentado quando
   tem unidade ou semântica que o tipo não mostra ("em valor normalizado", "na
   unidade do critério", "índice, não chave").

---

## 2. O que precisa de docstring

| Item | Exigido | Observação |
|---|---|---|
| Módulo | **sempre** | 1 a 3 linhas: o papel dele na arquitetura |
| Classe pública | **sempre** | o conceito que ela representa; invariantes, se houver |
| Função ou método público com corpo de mais de 5 linhas | **sempre** | |
| Rota HTTP | **sempre** | vira a descrição no OpenAPI; diz os erros previstos (404, 409, 422) |
| Ferramenta MCP | **sempre** | o texto vai no `description` do decorador, que já é obrigatório |
| Função privada que implementa regra do método ou de paridade | **sempre** | ex.: `_propagar_abertura`, `_carteira_fechada_pelo_orcamento` |
| Constante que muda a conclusão | **comentário acima** | o objeto, a unidade e a origem (ver `elicitation/selectors.py`) |

Dispensados, porque a docstring seria o nome repetido:

- `to_dict` e serialização direta de campos;
- propriedade ou método de até 5 linhas cujo nome diz tudo (`n_alternatives`,
  `has_veto`);
- sobrescrita de método abstrato já documentado na base — a docstring vive na
  base (`Problematic.analyse`, `LinearSolver.maximize`);
- testes: o nome do teste é a documentação, e já é escrito como frase
  (`test_orcamento_so_encerra_antes_do_primeiro_tradeoff`).

---

## 3. Estrutura

**Primeira linha:** uma frase que se sustenta sozinha. Para um predicado, a
pergunta que ele responde (`"""O espaco de pesos ainda e nao vazio?"""`); para o
resto, o que devolve ou o que faz, sem "Esta funcao...".

**Corpo:** parágrafos livres. O porquê, o caso que motivou a regra, a alternativa
descartada quando ela foi uma decisão real.

**Rótulos**, ao final, só os que se aplicam, um por linha. São fixos para que dê
para procurar com `grep`:

```
Metodo:    de Almeida et al. (2016)            -- artigo que define a regra
Paridade:  fin-E3, 29/09/2026                  -- medicao contra o oficial
Exatidao:  exata (LP) | aproximada (amostragem) | conservadora (envelope)
Custo:     2n LPs por chamada                  -- quando nao e trivial
Unidade:   valor normalizado [0, 1] | unidade do criterio
Erros:     InvalidRequest se ...               -- o que o chamador precisa tratar
```

Com os rótulos, perguntas de auditoria viram uma busca:

| Pergunta | Busca |
|---|---|
| Que regras vieram de medição contra o oficial? | `grep -rn "Paridade:" engine/src` |
| Onde o motor gasta LPs, e quantos? | `grep -rn "Custo:" engine/src` |
| O que é aproximado? | `grep -rn "Exatidao: aproximada" engine/src` |
| Que regras vêm de qual artigo? | `grep -rn "Metodo:" engine/src` |

Os detalhes da medição ficam em [`paridade/EQUIVALENCIA.md`](paridade/EQUIVALENCIA.md).
A docstring traz o caso e a data, o bastante para achar a seção, e os números que
fixaram a regra, quando cabem numa linha.

---

## 4. Exemplos

**Bom** — `Evaluator.is_consistent`. A pergunta na primeira linha, e o porquê que
um auditor procuraria (por que não há código dedicado de inconsistência):

```python
def is_consistent(self, space: WeightSpace) -> bool:
    """O espaco de pesos ainda e nao vazio?

    Espaco vazio significa preferencias que se contradizem: e o teste de
    inconsistencia do metodo, que sai de graca desta formulacao.
    """
```

**Bom, com rótulos** — uma função com custo e exatidão que importam:

```python
def value_bounds(self, problem: Problem, space: WeightSpace) -> tuple[Bounds, ...]:
    """Faixa do valor global de cada alternativa, **sem** o veto.

    E a base do grafico de barras da avaliacao holistica, e o que a
    problematica de sorting usa para alocar alternativas em classes. Com veto,
    quem precisa da faixa da recomendacao pede ``penalized_bounds``.

    Exatidao: exata (LP)
    Custo: 2n LPs
    Unidade: valor global normalizado [0, 1]
    """
```

**Ruim** — o nome repetido, e o que importa ausente:

```python
def dominance_matrix(self, problem, space, subset=None):
    """Calcula a matriz de dominancia."""
```

O que falta ali é exatamente o que a versão real traz: que são n² LPs no caso
geral, que três atalhos dispensam a maioria deles e por que cada atalho é
exato.

---

## 5. Comentários dentro do código

Comentário explica o que o código não consegue dizer: um atalho e por que ele é
correto, um limite numérico, a medição por trás de um número. Não narra o que a
linha faz. Um comentário que passa a contradizer o código é defeito, com a mesma
gravidade de um bug: quem audita confia nele.
