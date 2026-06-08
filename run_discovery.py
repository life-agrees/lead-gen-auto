# ─────────────────────────────────────────────────────────────
# run_discovery.py
# Week 1 entry point. Runs Twitter + on-chain discovery
# and pushes all leads into Supabase.
#
# Usage:
#   python run_discovery.py              → runs everything
#   python run_discovery.py --twitter    → Twitter only
#   python run_discovery.py --onchain    → on-chain only
# ─────────────────────────────────────────────────────────────

import sys
from utils.logger import get_logger
from discovery.twitter_scraper import run_twitter_scraper
from discovery.onchain_scanner import run_onchain_scanner
from discovery.dexscreener_scraper import run_dexscreener_scraper

logger = get_logger("run_discovery")


def main():
    args     = sys.argv[1:]
    run_all  = not args

    twitter_count = 0
    onchain_count = 0
    dexscreener_count = 0

    logger.info("═══════════════════════════════════════════")
    logger.info("  Trovr.ai Discovery Pipeline — Week 5     ")
    logger.info("═══════════════════════════════════════════")

    if run_all or "--twitter" in args:
        twitter_count = run_twitter_scraper()

    if run_all or "--onchain" in args:
        onchain_count = run_onchain_scanner()

    if run_all or "--dexscreener" in args:
        dexscreener_count = run_dexscreener_scraper()

    total = twitter_count + onchain_count + dexscreener_count
    logger.info("═══════════════════════════════════════════")
    logger.info(f"  Total new leads inserted: {total}")
    logger.info(f"  Twitter: {twitter_count}  |  On-chain: {onchain_count}  |  DexScreener: {dexscreener_count}")
    logger.info("═══════════════════════════════════════════")


if __name__ == "__main__":
    main()
