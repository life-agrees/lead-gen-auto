# ─────────────────────────────────────────────────────────────
# enricher_pipeline.py
# Fetches all raw leads from Supabase and runs them through
# all three enrichers. Saves results back to Supabase.
# This is the file you run for Week 2.
# ─────────────────────────────────────────────────────────────

import time
from utils.logger import get_logger
from utils.constants import LeadStatus, LeadSource
from api.db.supabase_client import (
    get_leads_by_status,
    update_lead,
)
from enrichment.twitter_enricher import enrich_twitter_lead
from enrichment.github_enricher  import enrich_github
from enrichment.onchain_enricher import enrich_onchain

logger = get_logger(__name__)


def run_enrichment_pipeline(batch_size: int = 50) -> int:
    """
    Fetches raw leads and enriches them.
    Returns count of successfully enriched leads.
    """
    logger.info("===========================================")
    logger.info("  Enrichment Pipeline — Week 2             ")
    logger.info("===========================================")

    raw_leads = get_leads_by_status(LeadStatus.RAW, limit=batch_size)

    if not raw_leads:
        logger.info("No raw leads to enrich. Run discovery first.")
        return 0

    logger.info(f"Found {len(raw_leads)} raw leads to enrich...")
    enriched_count = 0

    for lead in raw_leads:
        lead_id = lead["id"]
        source  = lead.get("source")
        updates = {}

        try:
            # ── Step 1: Twitter enrichment ────────────────
            if lead.get("twitter_handle"):
                logger.info(f"Enriching Twitter: @{lead['twitter_handle']}")
                twitter_updates = enrich_twitter_lead(lead)
                updates.update(twitter_updates)
                time.sleep(1)   # rate limit buffer

            # ── Step 2: GitHub enrichment ─────────────────
            # Check both the lead directly, updates, and raw_data
            raw_data        = lead.get("raw_data") or {}
            github_username = (
                (updates.get("raw_data") or {}).get("github_username") or
                raw_data.get("github_username") or
                lead.get("github_username")
            )

            if github_username:
                logger.info(f"Enriching GitHub: {github_username}")
                github_data = enrich_github(github_username)
                if github_data:
                    merged_raw = updates.get("raw_data") or raw_data.copy()
                    merged_raw.update(github_data)
                    updates["raw_data"] = merged_raw
                time.sleep(0.5)

            # ── Step 3: On-chain enrichment ───────────────
            wallet = updates.get("wallet_address") or lead.get("wallet_address")
            if wallet:
                logger.info(f"Enriching on-chain: {wallet[:10]}...")
                onchain_data = enrich_onchain(wallet)
                if onchain_data:
                    merged_raw = updates.get("raw_data") or raw_data
                    merged_raw.update(onchain_data)
                    updates["raw_data"]    = merged_raw

                    # Surface chains_active to top-level column
                    if onchain_data.get("chains_active"):
                        updates["chains_active"] = onchain_data["chains_active"]

            # ── Save to Supabase ──────────────────────────
            if updates:
                updates["status"] = LeadStatus.ENRICHED
                update_lead(lead_id, updates)
                enriched_count += 1
                logger.info(f"[Enriched] Lead enriched: {lead.get('twitter_handle') or wallet}")
            else:
                logger.warning(f"No enrichment data found for lead {lead_id}")

        except Exception as e:
            logger.error(f"Pipeline failed for lead {lead_id}: {e}")
            continue

    logger.info("===========================================")
    logger.info(f"  Enrichment complete: {enriched_count}/{len(raw_leads)} leads")
    logger.info("===========================================")
    return enriched_count


class EnricherPipeline:
    def __init__(self):
        logger.info("EnricherPipeline components loaded successfully.")

    def enrich_batch(self, raw_leads: list[dict]) -> list[dict]:
        """Processes a batch of raw scraped leads, routing each to its specific source-enricher."""
        logger.info(f"Starting enrichment batch for {len(raw_leads)} leads.")
        enriched_leads = []

        for lead in raw_leads:
            source = lead.get("source", "").lower()
            updates = {}
            try:
                # ── Step 1: Twitter enrichment ────────────────
                twitter_handle = lead.get("twitter_handle")
                if not twitter_handle and source == "twitter":
                    twitter_handle = lead.get("username")
                
                if twitter_handle:
                    lead_copy = lead.copy()
                    lead_copy["twitter_handle"] = twitter_handle
                    twitter_updates = enrich_twitter_lead(lead_copy)
                    updates.update(twitter_updates)
                    time.sleep(1)   # rate limit buffer

                # ── Step 2: GitHub enrichment ─────────────────
                raw_data = lead.get("raw_data") or {}
                github_username = raw_data.get("github_username") or lead.get("github_username")
                if not github_username and source == "github":
                    github_username = lead.get("username")

                if github_username:
                    github_data = enrich_github(github_username)
                    if github_data:
                        merged_raw = updates.get("raw_data") or raw_data.copy()
                        merged_raw.update(github_data)
                        updates["raw_data"] = merged_raw
                    time.sleep(0.5)

                # ── Step 3: On-chain enrichment ───────────────
                wallet = updates.get("wallet_address") or lead.get("wallet_address")
                if not wallet and source == "onchain":
                    wallet = lead.get("username")

                if wallet:
                    onchain_data = enrich_onchain(wallet)
                    if onchain_data:
                        merged_raw = updates.get("raw_data") or raw_data.copy()
                        merged_raw.update(onchain_data)
                        updates["raw_data"] = merged_raw

                        if onchain_data.get("chains_active"):
                            updates["chains_active"] = onchain_data["chains_active"]

                if updates:
                    enriched = lead.copy()
                    enriched.update(updates)
                    enriched["status"] = LeadStatus.ENRICHED
                else:
                    enriched = lead.copy()
                    enriched["status"] = LeadStatus.ENRICHED

                # Backwards compatible fallback/filling (similar to the old enricher pipeline)
                if "bio" not in enriched or not enriched["bio"]:
                    enriched["bio"] = "Web3 / Tech Builder."
                if "name" not in enriched or not enriched["name"]:
                    enriched["name"] = enriched.get("username", "Anonymous Builder")

                enriched_leads.append(enriched)
            except Exception as e:
                logger.error(f"Failed enriching lead {lead.get('username')}: {str(e)}")
                # Append raw fallback to prevent data dropping
                lead_copy = lead.copy()
                lead_copy["enrichment_error"] = str(e)
                enriched_leads.append(lead_copy)

        logger.info(f"Completed enrichment batch. Enriched: {len(enriched_leads)} leads.")
        return enriched_leads


if __name__ == "__main__":
    run_enrichment_pipeline()

