# ─────────────────────────────────────────────────────────────
# run_outreach.py
# Entry point for the outreach campaign runner.
#
# Usage:
#   python run_outreach.py                        # hot leads, live
#   python run_outreach.py --dry-run              # preview without DB writes
#   python run_outreach.py --tier warm            # include warm leads too
#   python run_outreach.py --tier all             # hot + warm (never cold)
#   python run_outreach.py --min-score 50.0       # override score floor
#   python run_outreach.py --provider gemini      # swap LLM provider
#   python run_outreach.py --batch 10             # max 10 actions this run
#   python run_outreach.py --preview <lead-id>    # inspect a single lead
#   python run_outreach.py --stats                # show queued message stats
# ─────────────────────────────────────────────────────────────

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from outreach.outreach_pipeline import OutreachPipeline
from api.db.supabase_client import DatabaseClient
from utils.logger import get_logger

logger = get_logger("run_outreach")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Run automated outreach and follow-up sequence loops."
    )
    parser.add_argument(
        "--tier",
        type=str,
        default="hot",
        choices=["hot", "warm", "all"],
        help=(
            "Which score tier to contact: "
            "'hot' (>=70, default), 'warm' (>=40), 'all' (hot+warm). "
            "Cold leads (<35) are NEVER contacted regardless of this flag."
        ),
    )
    parser.add_argument(
        "--min-score",
        type=float,
        default=None,
        help=(
            "Absolute score floor override. "
            "Defaults to the tier threshold (hot=70, warm=40). "
            "Cannot go below 35 (cold lead hard stop)."
        ),
    )
    parser.add_argument(
        "--batch",
        type=int,
        default=50,
        help="Maximum number of outreach actions to execute (default: 50).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Generate and preview messages without updating the database.",
    )
    parser.add_argument(
        "--provider",
        type=str,
        default=None,
        help="Override default LLM provider (mock, openai, anthropic, gemini, grok).",
    )
    parser.add_argument(
        "--preview",
        type=str,
        default=None,
        metavar="LEAD_ID",
        help=(
            "Preview lead data and what message would be generated for a "
            "specific lead ID. Does not write to the database."
        ),
    )
    parser.add_argument(
        "--stats",
        action="store_true",
        help="Show counts of sent, queued, and pending outreach messages and exit.",
    )
    return parser.parse_args()


def show_stats():
    """Print a quick summary of outreach log status counts."""
    db = DatabaseClient()
    logs = db.get_outreach_logs()

    counts = {"sent": 0, "queued": 0, "replied": 0, "failed": 0, "other": 0}
    for log in logs:
        status = log.get("status", "other")
        if status in counts:
            counts[status] += 1
        else:
            counts["other"] += 1

    pending = db.get_pending_sequences()

    logger.info("=" * 48)
    logger.info("  Outreach Log Stats")
    logger.info("=" * 48)
    logger.info(f"  Total log entries : {len(logs)}")
    logger.info(f"  Sent              : {counts['sent']}")
    logger.info(f"  Queued (future)   : {counts['queued']}")
    logger.info(f"  Due now (pending) : {len(pending)}")
    logger.info(f"  Replied           : {counts['replied']}")
    logger.info(f"  Failed            : {counts['failed']}")
    logger.info("=" * 48)


TIER_DEFAULTS = {
    "hot":  70.0,
    "warm": 40.0,
    "all":  40.0,   # warm threshold for "all"
}
COLD_FLOOR = 35.0   # absolute minimum — never go below this


def main():
    args = parse_args()

    pipeline = OutreachPipeline(provider=args.provider)

    # ── --stats mode ──────────────────────────────────────────
    if args.stats:
        show_stats()
        return

    # ── --preview mode ────────────────────────────────────────
    if args.preview:
        pipeline.preview(args.preview)
        return

    # ── Campaign run ──────────────────────────────────────────
    # Resolve min_score: explicit flag > tier default > cold floor
    tier = args.tier
    min_score = args.min_score
    if min_score is None:
        min_score = TIER_DEFAULTS.get(tier, 70.0)
    # Hard safety: never allow below cold floor
    min_score = max(min_score, COLD_FLOOR)

    pipeline.run(
        min_score=min_score,
        batch_size=args.batch,
        dry_run=args.dry_run,
        tier=tier,
    )


if __name__ == "__main__":
    main()
