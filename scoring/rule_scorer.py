# ─────────────────────────────────────────────────────────────
# scoring/rule_scorer.py
# Layer 1: Deterministic rule-based scorer.
#
# Reads the SCORE_WEIGHTS dict from constants.py (max 140 pts)
# and evaluates each signal independently. The final score is
# normalised to 0-100.
#
# This is the ALWAYS-AVAILABLE baseline. The ML scorer falls
# back to this when fewer than 50 labelled leads exist.
# ─────────────────────────────────────────────────────────────

from __future__ import annotations

from typing import Any, Dict, Tuple

from utils.constants import SCORE_WEIGHTS, MAX_SCORE
from utils.logger import get_logger
from scoring.features import extract_features

logger = get_logger("RuleScorer")


class RuleScorer:
    """
    Rule-based lead scorer.

    Each signal maps to one key in SCORE_WEIGHTS.  Points are
    awarded or withheld based on the enriched feature dict.
    Final score = raw_points / MAX_SCORE * 100, clamped 0-100.
    """

    def __init__(self) -> None:
        self.weights = SCORE_WEIGHTS          # from constants.py
        self.max_score = MAX_SCORE            # sum of all weights (140)

    # ── public API ────────────────────────────────────────────

    def calculate_score(
        self, lead: Dict[str, Any]
    ) -> Tuple[float, Dict[str, Any]]:
        """
        Returns (score_0_to_100, breakdown_dict).

        breakdown_dict maps each signal name → points awarded.
        """
        feats = extract_features(lead)
        breakdown: Dict[str, float] = {}
        raw_points = 0.0

        # ── Twitter signals ────────────────────────────────────
        if feats["has_1k_followers"]:
            pts = self.weights.get("twitter_followers_1k", 15)
            breakdown["twitter_followers_1k"] = pts
            raw_points += pts

        if feats["has_5k_followers"]:
            pts = self.weights.get("twitter_followers_5k", 10)
            breakdown["twitter_followers_5k"] = pts
            raw_points += pts

        if feats["bio_keyword_match"]:
            pts = self.weights.get("bio_keyword_match", 15)
            breakdown["bio_keyword_match"] = pts
            raw_points += pts

        if feats["tweeted_keyword"]:
            pts = self.weights.get("tweeted_keyword_last_30d", 25)
            breakdown["tweeted_keyword_last_30d"] = pts
            raw_points += pts

        # ── On-chain signals ───────────────────────────────────
        if feats["onchain_active_30d"]:
            pts = self.weights.get("onchain_active_last_30d", 30)
            breakdown["onchain_active_last_30d"] = pts
            raw_points += pts

        if feats["has_ens"]:
            pts = self.weights.get("has_ens", 10)
            breakdown["has_ens"] = pts
            raw_points += pts

        if feats["onchain_multichain"]:
            pts = self.weights.get("multiple_chains_active", 10)
            breakdown["multiple_chains_active"] = pts
            raw_points += pts

        # ── GitHub signals ─────────────────────────────────────
        if feats["has_linked_github"]:
            pts = self.weights.get("has_github", 10)
            breakdown["has_github"] = pts
            raw_points += pts

        if feats["github_has_solidity"]:
            pts = self.weights.get("github_has_solidity", 15)
            breakdown["github_has_solidity"] = pts
            raw_points += pts

        # ── Normalise to 0-100 ────────────────────────────────
        score = round(min((raw_points / self.max_score) * 100.0, 100.0), 1)

        # Attach summary stats to breakdown
        breakdown["_raw_points"] = raw_points
        breakdown["_max_possible"] = self.max_score
        breakdown["_score"] = score

        logger.debug(
            f"Rule score: {score} ({raw_points}/{self.max_score} pts) "
            f"signals={[k for k, v in breakdown.items() if not k.startswith('_') and v > 0]}"
        )

        return score, breakdown

    def tier(self, score: float) -> str:
        """Maps score to a human-readable tier label."""
        if score >= 75:
            return "A"    # hot lead — contact immediately
        if score >= 50:
            return "B"    # warm lead
        if score >= 25:
            return "C"    # lukewarm — nurture
        return "D"        # low fit — skip for now


# ── smoke test ────────────────────────────────────────────────
if __name__ == "__main__":
    scorer = RuleScorer()

    sample = {
        "source": "twitter",
        "followers_count": 3200,
        "bio": "Building DeFi prediction markets on Base. Solidity + Rust.",
        "twitter_handle": "0xbuilder",
        "raw_data": {
            "recent_tweets": [
                {"text": "just deployed on base — prediction market is live"},
                {"text": "uniswap v4 hooks are insane, love the composability"},
            ],
            "github_username": "builder0x",
            "top_languages": ["Solidity", "TypeScript"],
            "eth_balance": 5.2,
            "tx_count": 120,
            "chains_active": ["polygon", "base"],
            "ens_name": "builder.eth",
        },
    }

    score, breakdown = scorer.calculate_score(sample)
    tier = scorer.tier(score)
    print(f"\nScore : {score}/100  (Tier {tier})")
    print(f"Points: {breakdown}")
