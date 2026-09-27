"""Adaptador do HiGHS chamado direto, sem passar pelo scipy.

Mesma interface de ``ScipyLinearSolver`` e mesmo solver por baixo -- o HiGHS --,
sem a camada de validacao e montagem do ``scipy.optimize.linprog``. A troca vale
porque os LPs do metodo sao minusculos, meia dezena de criterios, e a montagem
dominava: o calculo em si sempre foi a menor parte do tempo.

O ganho vem de montar o modelo uma vez por espaco de pesos e so trocar o vetor de
custos. Uma elicitacao resolve centenas de LPs sobre um punhado de espacos
distintos, e o espaco e o que e caro de montar, nao o objetivo.

Duas decisoes deste adaptador merecem explicacao, porque as duas trocam um pouco
de velocidade por uma propriedade que vale mais:

*Base descartada a cada solve.* Reaproveitar a base do solve anterior e mais
rapido, mas faz o vertice devolvido por ``argmax`` depender de quais consultas
correram antes -- em objetivo com empate, o mesmo par (espaco, objetivo) devolvia
``[1, 0, 0, 0, 0]`` sozinho e ``[0.5, 0.5, 0, 0, 0]`` depois de outro solve. Os
dois sao otimos legitimos, e por isso o erro passaria calado por qualquer teste
que comparasse so o valor do objetivo. Mas um adaptador que responde diferente
para a mesma pergunta torna uma decisao irreproduzivel, e reproduzir e o que
``explicar`` promete. Com a base limpa o vertice volta a ser funcao das entradas,
e coincide com o que o scipy escolhe.

*So o modelo sem linhas extra fica em cache.* As linhas ``extra`` sao da consulta
em curso -- uma alternativa contra as outras -- e praticamente nunca repetem, ao
contrario do espaco de pesos, que muda poucas vezes por elicitacao. Guardar as
duas coisas enchia o cache de modelos de uso unico e, num problema grande, ele
saturava e passava a recusar justamente a chave que se reaproveita.

Um modelo do HiGHS guarda estado entre ``changeColsCost`` e ``run``, portanto duas
threads dentro do mesmo modelo corrompem memoria -- nao levanta excecao, derruba o
processo. Dai a trava. Ela serializa o LP, entao compartilhar um solver entre
requisicoes concorrentes custa mais do que economiza: quem monta deve criar um
por requisicao, e e o que ``fitradeoff_api.deps`` faz.
"""

from __future__ import annotations

import threading

import highspy
import numpy as np

from ..domain.weights import WeightSpace
from .base import LinearSolver, build_rows

_INF = highspy.kHighsInf


def _assinatura(space: WeightSpace) -> tuple:
    """Identidade do modelo reaproveitavel: o espaco de pesos, e mais nada.

    O objetivo fica de fora porque e exatamente o que o modelo aceita trocar sem
    ser remontado. As linhas ``extra`` ficam de fora porque modelo com elas nao
    entra no cache.
    """
    return (
        space.n_criteria,
        tuple((c.coefficients, c.sense.value, c.rhs) for c in space.constraints),
    )


class HighsLinearSolver(LinearSolver):
    """Programacao linear pelo HiGHS, com o modelo reaproveitado entre chamadas."""

    def __init__(self, max_modelos: int = 64) -> None:
        self._modelos: dict[tuple, highspy.Highs] = {}
        self._max = max_modelos
        # Protege tanto o dicionario quanto o estado interno de cada modelo: sao
        # a mesma seccao critica, porque usar um modelo e mexer nele.
        self._trava = threading.Lock()

    def _monta(self, space: WeightSpace, extra: np.ndarray | None) -> highspy.Highs:
        a_ub, b_ub, a_eq, b_eq = build_rows(space, extra)
        linhas: list[np.ndarray] = []
        inferior: list[float] = []
        superior: list[float] = []
        # Igualdades viram linha com os dois limites iguais; desigualdades, linha
        # sem limite inferior. E a traducao direta do que build_rows entrega.
        for i in range(len(b_eq)):
            linhas.append(np.asarray(a_eq[i], dtype=float))
            inferior.append(float(b_eq[i]))
            superior.append(float(b_eq[i]))
        if a_ub is not None:
            for i in range(len(b_ub)):
                linhas.append(np.asarray(a_ub[i], dtype=float))
                inferior.append(-_INF)
                superior.append(float(b_ub[i]))

        n = space.n_criteria
        lp = highspy.HighsLp()
        lp.num_col_ = n
        lp.num_row_ = len(linhas)
        lp.col_cost_ = np.zeros(n)
        lp.col_lower_ = np.zeros(n)
        lp.col_upper_ = np.ones(n)
        lp.row_lower_ = np.array(inferior, dtype=float)
        lp.row_upper_ = np.array(superior, dtype=float)

        lp.a_matrix_.format_ = highspy.MatrixFormat.kRowwise
        inicio, indice, valor = [0], [], []
        for linha in linhas:
            nao_nulos = np.nonzero(linha)[0]
            indice.extend(nao_nulos.tolist())
            valor.extend(linha[nao_nulos].tolist())
            inicio.append(len(indice))
        lp.a_matrix_.start_ = inicio
        lp.a_matrix_.index_ = indice
        lp.a_matrix_.value_ = valor
        lp.a_matrix_.num_col_ = n
        lp.a_matrix_.num_row_ = len(linhas)

        modelo = highspy.Highs()
        modelo.setOptionValue("output_flag", False)
        if modelo.passModel(lp) == highspy.HighsStatus.kError:
            raise RuntimeError(
                "O HiGHS recusou o modelo montado a partir do espaco de pesos."
            )
        return modelo

    def _modelo(self, space: WeightSpace, extra: np.ndarray | None) -> highspy.Highs:
        if extra is not None and len(extra) > 0:
            # Consulta de uso unico: nao vale guardar, e guardar prejudica.
            return self._monta(space, extra)

        chave = _assinatura(space)
        pronto = self._modelos.get(chave)
        if pronto is not None:
            return pronto
        modelo = self._monta(space, None)
        # O teto e rede de seguranca, nao politica: a chave e o espaco de pesos, e
        # uma elicitacao passa por poucos. Se algum uso imprevisto encostar no
        # limite, para de guardar e segue correto, so mais lento.
        if len(self._modelos) < self._max:
            self._modelos[chave] = modelo
        return modelo

    def _resolve(
        self,
        space: WeightSpace,
        objective: np.ndarray | None,
        extra: np.ndarray | None,
    ) -> highspy.Highs | None:
        """Resolve, ou ``None`` se o HiGHS falhou -- e nao se o LP e infactivel.

        Distinguir os dois importa: num modelo reaproveitado, um solve que falha
        deixa de pe o estado do anterior, e ler esse estado devolveria o otimo da
        consulta passada como se fosse desta.
        """
        modelo = self._modelo(space, extra)
        n = space.n_criteria
        custo = (
            np.zeros(n)
            if objective is None
            else np.asarray(objective, dtype=float)
        )
        # Descarta a base do solve anterior: sem isto a resposta depende do
        # historico do modelo. Ver a nota no topo do modulo.
        if modelo.clearSolver() == highspy.HighsStatus.kError:
            return None
        if modelo.changeColsCost(n, np.arange(n, dtype=np.int32), custo) == (
            highspy.HighsStatus.kError
        ):
            return None
        if modelo.run() == highspy.HighsStatus.kError:
            return None
        return modelo

    def _otimo(self, modelo: highspy.Highs | None) -> bool:
        return (
            modelo is not None
            and modelo.getModelStatus() == highspy.HighsModelStatus.kOptimal
        )

    def is_feasible(self, space: WeightSpace, extra: np.ndarray | None = None) -> bool:
        with self._trava:
            return self._otimo(self._resolve(space, None, extra))

    def maximize(
        self,
        space: WeightSpace,
        objective: np.ndarray,
        extra: np.ndarray | None = None,
    ) -> float | None:
        # O HiGHS minimiza, como o linprog; maximizar e minimizar o simetrico
        with self._trava:
            modelo = self._resolve(space, -np.asarray(objective, dtype=float), extra)
            if not self._otimo(modelo):
                return None
            return float(-modelo.getInfo().objective_function_value)

    def argmax(
        self,
        space: WeightSpace,
        objective: np.ndarray,
        extra: np.ndarray | None = None,
    ) -> np.ndarray | None:
        with self._trava:
            modelo = self._resolve(space, -np.asarray(objective, dtype=float), extra)
            if not self._otimo(modelo):
                return None
            # Copia, e nao vista: o modelo e reaproveitado, e o proximo solve
            # sobrescreve a solucao dele.
            return np.array(modelo.getSolution().col_value, dtype=float)
