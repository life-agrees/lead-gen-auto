# ─────────────────────────────────────────────────────────────
# outreach/outreach_tracker.py
#
# Fix 3: Added queue_outreach_event() which writes a "queued"
# log entry with an explicit send_after timestamp, so follow-up
# steps are scheduled — not fired immediately.
# ─────────────────────────────────────────────────────────────

from datetime import datetime, timezone
from typing import Dict, Any, Optional
from utils.logger import get_logger

logger = get_logger("OutreachTracker")


class OutreachTracker:
    def __init__(self):
        logger.info("OutreachTracker initialized.")

    def log_outreach_event(
        self,
        db_client: Any,
        lead_id: str,
        stage: str,
        message: str,
    ) -> Dict[str, Any]:
        """
        Registers a message as SENT immediately.
        Updates the lead's outreach_status and last_contacted timestamp.
        """
        now_str = datetime.now(timezone.utc).isoformat()
        logger.info(f"Logging SENT event: Lead {lead_id} → Stage: {stage}")

        log_entry = {
            "lead_id":      lead_id,
            "stage":        stage,
            "message_body": message,
            "sent_at":      now_str,
            "send_after":   now_str,   # sent immediately — send_after == sent_at
            "status":       "sent",
        }

        try:
            db_client.update_lead_outreach(lead_id, stage, now_str)
            db_client.create_outreach_log(log_entry)
        except Exception as e:
            logger.error(f"Failed to save outreach tracking to DB: {str(e)}")

        return log_entry

    def queue_outreach_event(
        self,
        db_client: Any,
        lead_id: str,
        stage: str,
        message: str,
        send_after: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Fix 3: Registers a follow-up message as QUEUED with a future
        send_after date. The lead's outreach_status is NOT updated yet —
        it will be updated when the scheduler actually sends this message.

        Args:
            send_after: UTC datetime when this message should be dispatched.
                        Defaults to now + 3 days if not provided.
        """
        from datetime import timedelta

        now = datetime.now(timezone.utc)
        if send_after is None:
            send_after = now + timedelta(days=3)

        send_after_str = send_after.isoformat()
        logger.info(
            f"Queuing {stage} for Lead {lead_id} — "
            f"scheduled for {send_after.strftime('%Y-%m-%d at %H:%M UTC')}"
        )

        log_entry = {
            "lead_id":      lead_id,
            "stage":        stage,
            "message_body": message,
            "sent_at":      None,          # not sent yet
            "send_after":   send_after_str,
            "status":       "queued",
        }

        try:
            db_client.create_outreach_log(log_entry)
        except Exception as e:
            logger.error(f"Failed to queue outreach event in DB: {str(e)}")

        return log_entry

    def update_delivery_status(
        self,
        db_client: Any,
        log_id: str,
        lead_id: str,
        new_status: str,
    ) -> bool:
        """Updates event state (queued → sent → opened → replied) in DB."""
        logger.info(f"Updating funnel status for Lead {lead_id} → {new_status}")

        try:
            db_client.update_outreach_log_status(log_id, new_status)
            if new_status in ("sent", "replied"):
                db_client.update_lead_outreach(
                    lead_id,
                    new_status,
                    datetime.now(timezone.utc).isoformat(),
                )
            return True
        except Exception as e:
            logger.error(f"Failed to update delivery status: {str(e)}")
            return False
