# Verificações de tela

Dois roteiros que medem a interface **renderizada**, e não o código. Existem
porque os dois defeitos que eles pegam são invisíveis na leitura do fonte:

- **`verificar_hover.py`** — passa o mouse em todo controle visível e compara o
  que o navegador calcula antes e depois. O projeto tem histórico de definir cor
  em `style` inline, e aí a regra de `:hover` existe e simplesmente não vale —
  estilo inline vence classe, e um hover anulado assim não dá erro nenhum. Na
  primeira execução, 60 dos 164 controles não reagiam ao ponteiro.
- **`verificar_contraste.py`** — mede cada nó de texto contra o fundo que ele de
  fato tem, nos dois temas. Foi assim que apareceram três superfícies com
  `bg-white` fixo, que só quebravam no escuro.

- **`verificar_comparador.py`** — confere o comparador de telas da paridade:
  que ele alterna sozinho, que para com o ponteiro dentro, que o botão de pausa
  para de verdade, que as abas trocam, e que a captura em foco cai na mesma
  coordenada nas duas. Este último é o ponto do componente — se as duas saírem
  em lugares diferentes, comparar volta a exigir memória.

Os três pedem o front no ar (`npm run dev`) e saem com código 1 quando acham
algo, para servirem em automação.

```
python web/scripts/verificar_hover.py
python web/scripts/verificar_contraste.py
python web/scripts/verificar_comparador.py
```

Precisam de Playwright, que já está no ambiente Python do motor:

```
engine\.venv\Scripts\python.exe web\scripts\verificar_hover.py
```
