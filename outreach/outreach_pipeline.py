# ─────────────────────────────────────────────────────────────
# outreach/outreach_pipeline.py
# Orchestrates the outreach campaign run:
#   1. Fetch scored leads from the DB.
#   2. Apply hard score/tier filter (Fix 2 — cold leads never contacted).
#   3. Evaluate each lead's next sequence stage.
#   4. Send day-1 pitches immediately; QUEUE day-3/day-7 with future
#      send_after timestamps so they never fire all at once (Fix 3).
#   5. Generate personalized messages (Fix 1 — data guard).
#   6. Log events to the database (or output to console if dry-run).
# ─────────────────────────────────────────────────────────────

import sys
import os
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from api.db.supabase_client import DatabaseClient, update_lead
from outreach.sequence_manager import SequenceManager, COLD_LEAD_SCORE_THRESHOLD
from outreach.message_generator import LLMMessageGenerator, _build_lead_summary
from outreach.outreach_tracker import OutreachTracker
from utils.constants import LeadStatus
from utils.logger import get_logger

logger = get_logger("OutreachPipeline")

# Score tiers (match scoring pipeline definitions)
TIER_THRESHOLDS = {
    "hot":  70.0,   # Tier A — Day 1 auto-pitched
    "warm": 40.0,   # Tier B — can be contacted manually / with flag
    "cold": 0.0,    # Tier C — NEVER automatically contacted
}


def _score_to_tier(score: float) -> str:
    if score >= TIER_THRESHOLDS["hot"]:
        return "hot"
    elif score >= TIER_THRESHOLDS["warm"]:
        return "warm"
    return "cold"


class OutreachPipeline:
    def __init__(self, provider: str = None) -> None:
        self.db = DatabaseClient()
        self.sequence_mgr = SequenceManager()
        self.msg_generator = LLMMessageGenerator()
        self.tracker = OutreachTracker()

        if provider:
            override_provider = provider.lower()
            valid_providers = ["mock", "openai", "anthropic", "gemini", "grok", "groq"]
            if override_provider in valid_providers:
                self.msg_generator.provider = override_provider
                logger.info(f"OutreachPipeline: LLM Provider overridden to: {override_provider.upper()}")
            else:
                logger.warning(
                    f"OutreachPipeline: Invalid provider override '{provider}'. "
                    f"Staying with default: {self.msg_generator.provider.upper()}"
                )

    # ── Public entry points ───────────────────────────────────

    def preview(self, lead_id: str) -> None:
        """
        --preview <lead_id>: Print what data we have on a lead and what
        message would be generated, without touching the DB.
        """
        lead = self.db.get_lead_by_id(lead_id)
        if not lead:
            logger.error(f"Lead {lead_id} not found in database.")
            return

        handle = lead.get("twitter_handle") or lead.get("username") or lead_id
        score  = lead.get("score", 0)
        tier   = _score_to_tier(score)

        logger.info("=" * 60)
        logger.info(f"  PREVIEW — @{handle}  (score: {score}/100, tier: {tier.upper()})")
        logger.info("=" * 60)
        logger.info("Lead data summary:")
        logger.info(_build_lead_summary(lead))
        logger.info("")

        if score < COLD_LEAD_SCORE_THRESHOLD:
            logger.warning(f"This lead is COLD (score {score} < {COLD_LEAD_SCORE_THRESHOLD}) — would be skipped.")
            return

        result = self.sequence_mgr.determine_next_stage(lead)
        if not result:
            logger.info("No outreach action due for this lead right now.")
            return

        logger.info(f"Next stage: {result.stage}")
        logger.info(f"Send immediately: {result.send_immediately}")
        if not result.send_immediately and result.send_after:
            logger.info(f"Would be queued until: {result.send_after.strftime('%Y-%m-%d %H:%M UTC')}")

        message = self.msg_generator.generate_personalized_message(lead, result.stage)
        if message:
            logger.info(f"\nGenerated message:\n\"{message}\"")
        else:
            logger.warning("\nNo message generated (insufficient data — lead would be skipped).")

    def run(
        self,
        min_score: float = 70.0,
        batch_size: int = 50,
        dry_run: bool = False,
        tier: str = "hot",
    ) -> Dict[str, Any]:
        """
        Executes an outreach sequencing campaign pass.

        Args:
            min_score:  Absolute score cutoff (overrides tier if higher).
            batch_size: Maximum outreach actions per run.
            dry_run:    If True, generates messages but never writes to DB.
            tier:       'hot' | 'warm' | 'all' — which tier to contact.
                        'all' still excludes cold leads.

        Returns a stats dict.
        """
        logger.info("===========================================")
        logger.info(f"  Outreach Pipeline  {'[DRY RUN]' if dry_run else '[LIVE]'}")
        logger.info(f"  Tier filter: {tier.upper()}  |  Min score: {min_score}")
        logger.info("===========================================")

        # Fetch all leads (we post-filter by tier below)
        leads = self.db.get_leads(0.0)
        if not leads:
            logger.info("No leads found in database. Run discovery/scoring first.")
            return self._empty_stats()

        logger.info(f"Fetched {len(leads)} total leads — applying tier filter...")

        # ── Fix 2: Hard tier filter — cold leads never contacted ─
        if tier == "all":
            leads = [l for l in leads if _score_to_tier(l.get("score", 0)) in ("hot", "warm")]
        else:
            leads = [l for l in leads if _score_to_tier(l.get("score", 0)) == tier]

        # Also enforce the absolute min_score floor
        leads = [l for l in leads if (l.get("score") or 0) >= min_score]

        if not leads:
            threshold_used = TIER_THRESHOLDS.get(tier, min_score)
            logger.info(f"No {tier.upper()} leads available (score >= {min_score}).")
            logger.info("Tip: run `python run_scoring.py` first — you may have unscored leads.")
            return self._empty_stats()

        logger.info(f"Evaluating {len(leads)} {tier.upper()} leads for outreach cadences...")

        stats = {
            "total_leads":   len(leads),
            "processed":     0,
            "sent_day_1":    0,
            "queued_day_3":  0,
            "queued_day_7":  0,
            "sent_day_3":    0,
            "sent_day_7":    0,
            "skipped":       0,
            "no_data":       0,
        }

        for lead in leads:
            if stats["processed"] >= batch_size:
                logger.info(f"Reached batch limit of {batch_size} outreach actions. Stopping.")
                break

            lead_id = lead.get("id")
            if not lead_id:
                stats["skipped"] += 1
                continue

            handle = lead.get("username") or lead.get("twitter_handle") or str(lead_id)[:10]
            score  = lead.get("score", 0.0)
            tier_label = _score_to_tier(score).upper()

            # Determine next sequence action
            result = self.sequence_mgr.determine_next_stage(lead)
            if not result:
                # Not due for any action yet
                continue

            if result.send_immediately:
                timing_label = "(NOW)"
            elif result.send_after:
                timing_label = f"(QUEUED {result.send_after.strftime('%Y-%m-%d')})"
            else:
                timing_label = "(QUEUED)"

            logger.info(
                f"  @{handle} [{tier_label} {score}/100] → {result.stage} {timing_label}"
            )

            try:
                message_body = self.msg_generator.generate_personalized_message(lead, result.stage)

                # Fix 1: skip leads with insufficient data
                if not message_body:
                    logger.warning(f"  → Skipping @{handle}: no usable message generated.")
                    stats["no_data"] += 1
                    stats["skipped"] += 1
                    continue

                if dry_run:
                    logger.info(f"  [DRY-RUN] Message:\n  \"{message_body}\"")
                    if not result.send_immediately and result.send_after:
                        logger.info(
                            f"  [DRY-RUN] Would be queued until: "
                            f"{result.send_after.strftime('%Y-%m-%d %H:%M UTC')}"
                        )
                else:
                    if result.send_immediately:
                        # Log as SENT — fires now
                        self.tracker.log_outreach_event(
                            self.db, lead_id, result.stage, message_body
                        )
                        update_lead(lead_id, {"status": LeadStatus.CONTACTED})
                    else:
                        # Fix 3: Log as QUEUED with future send_after
                        self.tracker.queue_outreach_event(
                            self.db,
                            lead_id,
                            result.stage,
                            message_body,
                            send_after=result.send_after,
                        )

                # Update stats
                if result.stage == "day_1_pitch":
                    stats["sent_day_1"] += 1
                elif result.stage == "day_3_followup":
                    if result.send_immediately:
                        stats["sent_day_3"] += 1
                    else:
                        stats["queued_day_3"] += 1
                elif result.stage == "day_7_breakup":
                    if result.send_immediately:
                        stats["sent_day_7"] += 1
                    else:
                        stats["queued_day_7"] += 1

                stats["processed"] += 1

            except Exception as e:
                logger.error(f"Failed to process outreach for lead {lead_id}: {str(e)}")
                stats["skipped"] += 1

        # Final summary
        sep = "=" * 52
        logger.info("")
        logger.info(sep)
        logger.info(f"  Outreach Run Complete  {'[DRY RUN]' if dry_run else '[LIVE]'}")
        logger.info(sep)
        logger.info(f"  Total Checked Leads  : {stats['total_leads']}")
        logger.info(f"  Actions Executed     : {stats['processed']}")
        logger.info(f"  Day-1 Pitches Sent   : {stats['sent_day_1']}")
        logger.info(f"  Day-3 Sent (due)     : {stats['sent_day_3']}")
        logger.info(f"  Day-3 Queued (future): {stats['queued_day_3']}")
        logger.info(f"  Day-7 Sent (due)     : {stats['sent_day_7']}")
        logger.info(f"  Day-7 Queued (future): {stats['queued_day_7']}")
        logger.info(f"  Skipped/No Data      : {stats['skipped']}")
        logger.info(sep)

        return stats

    @staticmethod
    def _empty_stats() -> Dict[str, Any]:
        return {
            "total_leads": 0, "processed": 0,
            "sent_day_1": 0, "queued_day_3": 0, "queued_day_7": 0,
            "sent_day_3": 0, "sent_day_7": 0,
            "skipped": 0, "no_data": 0,
        }
