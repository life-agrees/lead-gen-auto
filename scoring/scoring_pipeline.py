# ─────────────────────────────────────────────────────────────
# scoring/scoring_pipeline.py
# Orchestrates the full scoring pass:
#   1. Pull all "enriched" leads from the DB
#   2. Score each one (ML → rule fallback)
#   3. Write score + breakdown + status="scored" back to DB
#   4. Print a ranked summary table
#
# Usage (via run_scoring.py):
#   python run_scoring.py
# ─────────────────────────────────────────────────────────────

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from api.db.supabase_client import (
    DatabaseClient,
    get_leads_by_status,
    update_lead,
)
from scoring.ml_scorer import MLScorer
from scoring.rule_scorer import RuleScorer
from utils.constants import LeadStatus
from utils.logger import get_logger

logger = get_logger("ScoringPipeline")


# ── helpers ───────────────────────────────────────────────────

def _fmt_row(lead: Dict[str, Any], score: float, tier: str, breakdown: dict) -> str:
    handle = (
        lead.get("twitter_handle")
        or lead.get("username")
        or lead.get("wallet_address", "")[:10]
        or lead.get("id", "")[:8]
    )
    source = lead.get("source", "?")[:7]
    signals = [k for k, v in breakdown.items() if not k.startswith("_") and v > 0]
    return (
        f"  [{tier}] {score:5.1f}  @{handle:<20s}  src={source:<7s}  "
        f"signals={signals}"
    )


# ── main pipeline class ───────────────────────────────────────

class ScoringPipeline:
    """
    Scores all enriched leads and persists results to the DB.

    Instantiate once; call run() to execute a scoring pass.
    """

    def __init__(self, use_ml: bool = True) -> None:
        self.use_ml     = use_ml
        self.ml_scorer  = MLScorer()
        self.rule_scorer = RuleScorer()

        if use_ml and self.ml_scorer.is_trained:
            logger.info("ScoringPipeline: ML scorer active.")
        else:
            logger.info(
                "ScoringPipeline: ML model not found — using RuleScorer. "
                "Run `python scoring/train.py` to enable ML scoring."
            )

    # ── score a single lead ────────────────────────────────────

    def score_lead(
        self, lead: Dict[str, Any]
    ) -> Tuple[float, float, str, Dict[str, Any]]:
        """
        Returns (score, confidence, tier, breakdown).

        Always succeeds — falls back to rule scorer on any error.
        """
        # Try ML first
        if self.use_ml and self.ml_scorer.is_trained:
            try:
                score, confidence, tier = self.ml_scorer.predict(lead)
                # Supplement ML output with rule breakdown for explainability
                _, rule_breakdown = self.rule_scorer.calculate_score(lead)
                rule_breakdown["_ml_score"]      = score
                rule_breakdown["_ml_confidence"] = confidence
                rule_breakdown["_scorer"]        = "ml"
                return score, confidence, tier, rule_breakdown
            except Exception as exc:
                logger.warning(f"ML scorer failed: {exc}. Using rule scorer.")

        # Rule fallback
        score, breakdown = self.rule_scorer.calculate_score(lead)
        confidence = score / 100.0
        tier       = self.rule_scorer.tier(score)
        breakdown["_scorer"] = "rule"
        return score, confidence, tier, breakdown

    # ── main run ──────────────────────────────────────────────

    def run(self, batch_size: int = 200) -> Dict[str, Any]:
        """
        Fetches enriched leads, scores them, and writes back.

        Returns a stats dict:
          { "total": int, "scored": int, "skipped": int,
            "tier_counts": {"A": n, ...}, "top_leads": [...] }
        """
        logger.info("===========================================")
        logger.info("  Scoring Pipeline — Week 3               ")
        logger.info("===========================================")

        # ── fetch enriched leads ──────────────────────────────
        leads = get_leads_by_status(LeadStatus.ENRICHED, limit=batch_size)

        # Also pick up any that were already scored (re-score is idempotent)
        already_scored = get_leads_by_status(LeadStatus.SCORED, limit=batch_size)
        leads = leads + already_scored

        if not leads:
            logger.info("No enriched leads to score. Run enrichment first.")
            return {"total": 0, "scored": 0, "skipped": 0,
                    "tier_counts": {}, "top_leads": []}

        logger.info(f"Scoring {len(leads)} leads…")

        tier_counts: Dict[str, int] = {"A": 0, "B": 0, "C": 0, "D": 0}
        results: List[Dict[str, Any]] = []
        scored_count = 0
        skipped_count = 0

        for lead in leads:
            lead_id = lead.get("id")
            if not lead_id:
                skipped_count += 1
                continue

            try:
                score, confidence, tier, breakdown = self.score_lead(lead)

                # Write back to DB
                updates = {
                    "score":           score,
                    "score_breakdown": breakdown,
                    "status":          LeadStatus.SCORED,
                    "updated_at":      datetime.now(timezone.utc).isoformat(),
                }
                update_lead(lead_id, updates)

                tier_counts[tier] = tier_counts.get(tier, 0) + 1
                scored_count += 1

                results.append({
                    "id":         lead_id,
                    "score":      score,
                    "tier":       tier,
                    "confidence": confidence,
                    "breakdown":  breakdown,
                    "lead":       lead,
                })

                logger.info(_fmt_row(lead, score, tier, breakdown))

            except Exception as exc:
                logger.error(f"Failed to score lead {lead_id}: {exc}")
                skipped_count += 1
                continue

        # ── ranked summary ────────────────────────────────────
        results.sort(key=lambda r: r["score"], reverse=True)
        top_leads = results[:10]

        logger.info("")
        logger.info("-- Top Leads ------------------------------------------")
        for i, r in enumerate(top_leads, 1):
            logger.info(
                f"  #{i:02d}  score={r['score']:5.1f}  tier={r['tier']}  "
                f"id={str(r['id'])[:8]}…"
            )

        logger.info("")
        logger.info(f"  Tiers   A={tier_counts.get('A',0)}  "
                    f"B={tier_counts.get('B',0)}  "
                    f"C={tier_counts.get('C',0)}  "
                    f"D={tier_counts.get('D',0)}")
        logger.info(f"  Scored  {scored_count}/{len(leads)} leads")
        logger.info("===========================================")

        return {
            "total":       len(leads),
            "scored":      scored_count,
            "skipped":     skipped_count,
            "tier_counts": tier_counts,
            "top_leads":   top_leads,
        }


# ── convenience function ──────────────────────────────────────

def run_scoring_pipeline(batch_size: int = 200, use_ml: bool = True) -> Dict[str, Any]:
    """Drop-in function wrapper used by run_scoring.py."""
    pipeline = ScoringPipeline(use_ml=use_ml)
    return pipeline.run(batch_size=batch_size)
