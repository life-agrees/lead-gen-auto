# ─────────────────────────────────────────────────────────────
# outreach/sequence_manager.py
#
# Fix 3: SequenceManager now returns a typed result that tells
# the pipeline whether to SEND immediately (day_1) or QUEUE with
# a future send_after timestamp (day_3 / day_7).
# ─────────────────────────────────────────────────────────────

from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from utils.helpers import parse_iso_date, days_between
from utils.logger import get_logger

logger = get_logger("SequenceManager")

# Hard minimum score — leads below this are NEVER contacted
COLD_LEAD_SCORE_THRESHOLD = 35


class SequenceResult:
    """Lightweight value object returned by determine_next_stage()."""

    def __init__(
        self,
        stage: str,
        send_immediately: bool = True,
        send_after: Optional[datetime] = None,
    ):
        self.stage = stage
        self.send_immediately = send_immediately
        # send_after is only meaningful when send_immediately=False
        self.send_after = send_after

    def __repr__(self):
        if self.send_immediately:
            return f"<SequenceResult stage={self.stage} SEND_NOW>"
        return (
            f"<SequenceResult stage={self.stage} "
            f"QUEUED send_after={self.send_after.isoformat() if self.send_after else 'None'}>"
        )


class SequenceManager:
    def __init__(self):
        # Calendar delays between sequence steps
        self.day_3_delay = 3   # days after day-1 pitch
        self.day_7_delay = 7   # days after day-1 pitch (4 days after day-3)

    def determine_next_stage(self, lead: Dict[str, Any]) -> Optional[SequenceResult]:
        """
        Examines a lead's outreach history and returns the next action.

        Fix 2: Hard cold-lead guard — returns None for any lead with
               score < COLD_LEAD_SCORE_THRESHOLD.

        Fix 3: Returns a SequenceResult with send_immediately=False and
               a future send_after for follow-up steps, so the pipeline
               never fires all steps at once.

        Returns None if no action is due yet (or lead is cold/replied).
        """
        # ── Fix 2: Hard cold-lead stop ────────────────────────
        score = lead.get("score") or 0
        if score < COLD_LEAD_SCORE_THRESHOLD:
            handle = lead.get("twitter_handle") or lead.get("username") or "unknown"
            logger.debug(
                f"Skipping cold lead @{handle} (score: {score} < {COLD_LEAD_SCORE_THRESHOLD})"
            )
            return None

        outreach_status = lead.get("outreach_status", "discovered")
        last_contacted_str = lead.get("last_contacted")

        # Never re-contact leads that have already replied or been closed
        if outreach_status in ("replied", "closed", "unsubscribed"):
            return None

        # ── Day-1: Initial pitch (send immediately) ───────────
        if outreach_status in ("discovered", "scored", "pending"):
            return SequenceResult(stage="day_1_pitch", send_immediately=True)

        # Need a contact date to schedule follow-ups
        if not last_contacted_str:
            return None

        last_contacted = parse_iso_date(last_contacted_str)
        now = datetime.now(timezone.utc)
        elapsed_days = days_between(now, last_contacted)

        # ── Day-3: Follow-up ──────────────────────────────────
        if outreach_status == "day_1_pitch":
            send_after = last_contacted + timedelta(days=self.day_3_delay)
            if elapsed_days >= self.day_3_delay:
                # Time has already come — send immediately
                logger.info(
                    f"Lead @{lead.get('username')} due for Day-3 follow-up "
                    f"({elapsed_days} days elapsed)."
                )
                return SequenceResult(stage="day_3_followup", send_immediately=True)
            else:
                # Queue for the future
                return SequenceResult(
                    stage="day_3_followup",
                    send_immediately=False,
                    send_after=send_after,
                )

        # ── Day-7: Breakup ────────────────────────────────────
        if outreach_status == "day_3_followup":
            send_after = last_contacted + timedelta(days=self.day_7_delay - self.day_3_delay)
            if elapsed_days >= (self.day_7_delay - self.day_3_delay):
                logger.info(
                    f"Lead @{lead.get('username')} due for Day-7 breakup "
                    f"({elapsed_days} days elapsed)."
                )
                return SequenceResult(stage="day_7_breakup", send_immediately=True)
            else:
                return SequenceResult(
                    stage="day_7_breakup",
                    send_immediately=False,
                    send_after=send_after,
                )

        return None
