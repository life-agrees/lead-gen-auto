# ─────────────────────────────────────────────────────────────
# scoring/ml_scorer.py
# Layer 2: scikit-learn GradientBoosting scorer.
#
# Falls back to RuleScorer transparently when the model file
# doesn't exist (< 50 labelled leads).
#
# Model artefacts live in data/
#   data/ml_scorer.pkl   – trained GradientBoostingClassifier
#   data/ml_scaler.pkl   – fitted StandardScaler
# ─────────────────────────────────────────────────────────────

from __future__ import annotations

import os
import pickle
from typing import Any, Dict, Optional, Tuple

import numpy as np

from scoring.features import to_feature_vector, FEATURE_COLUMNS
from scoring.rule_scorer import RuleScorer
from utils.logger import get_logger

logger = get_logger("MLScorer")

# Absolute path anchor — data/ lives at project root
_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
MODEL_PATH  = os.path.join(_DATA_DIR, "ml_scorer.pkl")
SCALER_PATH = os.path.join(_DATA_DIR, "ml_scaler.pkl")


class MLScorer:
    """
    Gradient-boosted lead scorer (Layer 2).

    predict() returns (score_0_to_100, confidence, tier_label).

    When no model is trained yet it proxies every call through
    RuleScorer so the pipeline always produces a number.
    """

    def __init__(self) -> None:
        self.model:  Optional[Any] = None
        self.scaler: Optional[Any] = None
        self.rule_scorer = RuleScorer()
        self._ready = self._load()

    # ── internals ─────────────────────────────────────────────

    def _load(self) -> bool:
        """Try to load both model and scaler from disk."""
        model_ok  = self._load_artifact(MODEL_PATH,  "model")
        scaler_ok = self._load_artifact(SCALER_PATH, "scaler")
        if model_ok and scaler_ok:
            logger.info(
                f"MLScorer ready — model={MODEL_PATH}, scaler={SCALER_PATH}"
            )
            return True
        logger.warning(
            "MLScorer: model or scaler not found. "
            "Run `python scoring/train.py` to train. "
            "Falling back to RuleScorer until then."
        )
        return False

    def _load_artifact(self, path: str, attr: str) -> bool:
        if not os.path.exists(path):
            return False
        try:
            with open(path, "rb") as fh:
                setattr(self, attr, pickle.load(fh))
            return True
        except Exception as exc:
            logger.error(f"Failed to load {attr} from {path}: {exc}")
            return False

    def _rule_fallback(
        self, lead: Dict[str, Any]
    ) -> Tuple[float, float, str]:
        score, _ = self.rule_scorer.calculate_score(lead)
        confidence = score / 100.0          # proxy confidence
        tier = self.rule_scorer.tier(score)
        return score, round(confidence, 3), tier

    # ── public API ────────────────────────────────────────────

    @property
    def is_trained(self) -> bool:
        return self._ready

    def predict(
        self, lead: Dict[str, Any]
    ) -> Tuple[float, float, str]:
        """
        Returns (score_0_to_100, confidence_0_to_1, tier_label).

        tier_label: "A" | "B" | "C" | "D"
        """
        if not self._ready:
            return self._rule_fallback(lead)

        try:
            vec = to_feature_vector(lead).reshape(1, -1)

            # Scale if scaler available
            if self.scaler is not None:
                vec = self.scaler.transform(vec)

            prob = float(self.model.predict_proba(vec)[0][1])   # P(class=1)
            score = round(prob * 100.0, 1)
            tier  = self.rule_scorer.tier(score)
            return score, round(prob, 3), tier

        except Exception as exc:
            logger.error(f"MLScorer.predict failed: {exc}. Using rule fallback.")
            return self._rule_fallback(lead)

    # ── legacy compat ─────────────────────────────────────────

    def predict_fit_probability(
        self, lead: Dict[str, Any]
    ) -> Tuple[float, float]:
        """Kept for backward compatibility (score, pred_class)."""
        score, conf, _ = self.predict(lead)
        pred_class = 1.0 if score >= 50 else 0.0
        return score, pred_class

    def load_model(self) -> bool:
        self._ready = self._load()
        return self._ready
