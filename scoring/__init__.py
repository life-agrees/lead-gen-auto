# scoring/__init__.py
# Exports the main scoring pipeline interface.

from scoring.scoring_pipeline import ScoringPipeline, run_scoring_pipeline

__all__ = ["ScoringPipeline", "run_scoring_pipeline"]
