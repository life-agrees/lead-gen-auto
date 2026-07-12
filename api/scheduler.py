"""
api/scheduler.py
-----------------
APScheduler background job — fires daily at 08:00 UTC.
Reads digest_enabled + digest_email from settings and sends the digest.
Mounted in api/main.py startup event.
"""

import os
from datetime import datetime, timezone
from utils.logger import get_logger

logger = get_logger("Scheduler")

_scheduler = None


def _run_daily_digest():
    """Called by APScheduler at 08:00 UTC every day."""
    logger.info(f"[Scheduler] Daily digest job triggered at {datetime.now(timezone.utc).isoformat()}")
    try:
        from api.routes.settings import _read_from_supabase, _read_fallback
        from api.db.supabase_client import DatabaseClient

        db = DatabaseClient()
        settings = _read_from_supabase() if db.use_supabase else _read_fallback()

        if not settings.get("digest_enabled"):
            logger.info("[Scheduler] Digest is disabled. Skipping.")
            return

        recipient = settings.get("digest_email", "").strip()
        if not recipient:
            logger.warning("[Scheduler] digest_email is not set. Skipping send.")
            return

        from api.routes.digest import _build_digest_payload, _format_email_html, RESEND_API_KEY, DIGEST_FROM
        import httpx

        payload = _build_digest_payload()
        html    = _format_email_html(payload)

        res = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from":    DIGEST_FROM,
                "to":      [recipient],
                "subject": f"Trovr.ai Daily Digest — {payload['date']}",
                "html":    html,
            },
            timeout=20,
        )
        if res.status_code in (200, 201):
            logger.info(f"[Scheduler] Digest sent to {recipient}")
        else:
            logger.error(f"[Scheduler] Resend returned {res.status_code}: {res.text}")

    except Exception as e:
        logger.error(f"[Scheduler] Daily digest job failed: {e}")


def start_scheduler():
    """Starts the APScheduler background scheduler. Safe to call multiple times."""
    global _scheduler
    if _scheduler is not None:
        return

    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger

        _scheduler = BackgroundScheduler(timezone="UTC")
        _scheduler.add_job(
            _run_daily_digest,
            trigger=CronTrigger(hour=8, minute=0),
            id="daily_digest",
            replace_existing=True,
        )
        _scheduler.start()
        logger.info("[Scheduler] Started. Daily digest fires at 08:00 UTC.")
    except ImportError:
        logger.warning(
            "[Scheduler] APScheduler not installed — daily digest scheduling is disabled. "
            "Install with: pip install apscheduler"
        )
    except Exception as e:
        logger.error(f"[Scheduler] Failed to start: {e}")


def stop_scheduler():
    """Shuts down the scheduler cleanly on app teardown."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[Scheduler] Stopped.")
