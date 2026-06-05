# ─────────────────────────────────────────────────────────────
# run_scoring.py
# Week 3 entry point.
#
# Usage:
#   python run_scoring.py                  # score all enriched leads
#   python run_scoring.py --rule-only      # force rule scorer (no ML)
#   python run_scoring.py --train-first    # train ML model, then score
#   python run_scoring.py --batch 50       # limit batch size
# ─────────────────────────────────────────────────────────────

import argparse
import sys
import os

# Ensure project root is on the path when invoked directly
sys.path.insert(0, os.path.dirname(__file__))

from utils.logger import get_logger
from scoring.scoring_pipeline import run_scoring_pipeline

logger = get_logger("run_scoring")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Score all enriched leads and write results to the DB."
    )
    parser.add_argument(
        "--rule-only", action="store_true",
        help="Use the rule scorer only (skip ML model)."
    )
    parser.add_argument(
        "--train-first", action="store_true",
        help="Train (or retrain) the ML model on synthetic data before scoring."
    )
    parser.add_argument(
        "--batch", type=int, default=200,
        help="Maximum number of leads to score per run (default 200)."
    )
    return parser.parse_args()


def main():
    args = parse_args()

    # ── optional: train first ─────────────────────────────────
    if args.train_first:
        logger.info("--train-first flag set. Training ML model…")
        from scoring.train import generate_synthetic_dataset, train_and_save
        X, y = generate_synthetic_dataset(size=args.batch * 2 if args.batch < 200 else 400)
        train_and_save(X, y)

    # -- run the scoring pass ----------------------------------
    use_ml = not args.rule_only
    stats  = run_scoring_pipeline(batch_size=args.batch, use_ml=use_ml)

    # -- print final summary -----------------------------------
    sep = "=" * 50
    print("\n" + sep)
    print("  Scoring complete")
    print(sep)
    print(f"  Total leads   : {stats['total']}")
    print(f"  Scored        : {stats['scored']}")
    print(f"  Skipped       : {stats['skipped']}")
    tc = stats.get("tier_counts", {})
    print(f"  Tier A (hot)  : {tc.get('A', 0)}")
    print(f"  Tier B (warm) : {tc.get('B', 0)}")
    print(f"  Tier C (cool) : {tc.get('C', 0)}")
    print(f"  Tier D (skip) : {tc.get('D', 0)}")

    top = stats.get("top_leads", [])
    if top:
        print("\n  -- Top 5 Leads ------------------------------------------")
        for i, r in enumerate(top[:5], 1):
            lead   = r["lead"]
            handle = (
                lead.get("twitter_handle")
                or lead.get("username")
                or str(lead.get("id", ""))[:10]
            )
            print(
                f"  #{i}  score={r['score']:5.1f}  tier={r['tier']}  "
                f"@{handle}  source={lead.get('source','?')}"
            )
    print(sep + "\n")


if __name__ == "__main__":
    main()
