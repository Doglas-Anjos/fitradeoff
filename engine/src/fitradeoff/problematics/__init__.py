"""As quatro problematicas do FITradeoff, como estrategias intercambiaveis."""

from .base import Analysis, Problematic
from .choice import ChoiceProblematic
from .evaluator import Evaluator
from .portfolio import PortfolioProblematic
from .ranking import RankingProblematic
from .registry import ProblematicRegistry, UnknownProblematic, default_registry
from .sorting import SortingProblematic

__all__ = [
    "Analysis", "ChoiceProblematic", "Evaluator", "PortfolioProblematic",
    "Problematic", "ProblematicRegistry", "RankingProblematic",
    "SortingProblematic", "UnknownProblematic", "default_registry",
]
