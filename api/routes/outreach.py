import io
import csv
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any
from api.db.supabase_client import DatabaseClient
from api.db.models import OutreachLogBase, OutreachTrigger
from outreach.message_generator import LLMMessageGenerator
from outreach.outreach_tracker import OutreachTracker
from utils.logger import get_logger

router = APIRouter(prefix="/outreach", tags=["outreach"])
logger = get_logger("OutreachRouter")
db = DatabaseClient()

# Outreach utilities instantiations
msg_generator = LLMMessageGenerator()
tracker = OutreachTracker()

@router.get("/logs", response_model=List[OutreachLogBase])
def get_outreach_logs():
    """Retrieves standard history logs of sent, opened, or replied DMs/emails."""
    logs = db.get_outreach_logs()
    # Sanitise None fields that would fail Pydantic str validation
    for log in logs:
        if log.get("sent_at") is None:
            log["sent_at"] = ""
        if log.get("send_after") is None:
            log["send_after"] = ""
        if log.get("status") is None:
            log["status"] = "sent"
        if log.get("message_body") is None:
            log["message_body"] = ""
    return logs


@router.get("/export")
def export_outreach_csv(status: str = None):
    """
    Streams all outreach logs as a UTF-8 BOM CSV — ready for Google Sheets.
    Optional ?status=sent|queued|replied filter.
    """
    try:
        if db.db_mode == "supabase":
            query = (
                db.client.table("outreach_logs")
                .select("*, leads(twitter_handle, display_name, score, score_tier, bio)")
                .order("sent_at")
            )
            if status:
                query = query.eq("status", status)
            rows = (query.execute()).data or []
        else:
            # SQLite fallback — plain join
            rows = db.get_outreach_logs()
            if status:
                rows = [r for r in rows if r.get("status") == status]

        # Build CSV in memory
        output = io.StringIO()
        output.write("\ufeff")  # BOM — Google Sheets / Excel auto-detect UTF-8
        writer = csv.writer(output)
        writer.writerow([
            "Twitter Handle",
            "Display Name",
            "Score",
            "Tier",
            "Bio (first 100 chars)",
            "Outreach Message",
            "Stage",
            "Status",
            "Sent At",
            "Outreach ID",
        ])

        for row in rows:
            lead = row.get("leads") or {}
            writer.writerow([
                lead.get("twitter_handle") or row.get("username", ""),
                lead.get("display_name") or row.get("name", ""),
                lead.get("score", ""),
                lead.get("score_tier", ""),
                (lead.get("bio") or "")[:100],
                row.get("message_body", ""),
                row.get("stage", ""),
                row.get("status", ""),
                row.get("sent_at", ""),
                row.get("id", ""),
            ])

        output.seek(0)
        logger.info(f"Dashboard CSV export: {len(rows)} outreach rows")

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": 'attachment; filename="trovr_outreach_export.csv"'
            },
        )

    except Exception as e:
        logger.error(f"Export failed: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.post("/trigger", response_model=OutreachLogBase)
def trigger_outreach(trigger: OutreachTrigger):
    """Triggers the LLM message generator for a single lead, saving the event."""
    lead_id = trigger.lead_id
    stage = trigger.stage or "day_1_pitch"

    lead = db.get_lead_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Target lead not found.")

    logger.info(f"Generating outreach for Lead {lead_id} ({lead.get('name')}) - Stage: {stage}")

    try:
        message_body = msg_generator.generate_personalized_message(lead, stage)
        log_entry = tracker.log_outreach_event(db, lead_id, stage, message_body)
        log_entry["name"] = lead.get("name")
        log_entry["username"] = lead.get("username")
        return log_entry
    except Exception as e:
        logger.error(f"Failed to generate outreach message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"LLM outreach execution failed: {str(e)}")


@router.post("/logs/{log_id}/status")
def update_log_status(log_id: str, lead_id: str, new_status: str):
    """Updates log delivery status (opened, replied) to simulate email/DM receipts."""
    success = tracker.update_delivery_status(db, log_id, lead_id, new_status)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update log delivery status.")
    return {"status": "success", "message": f"Log status updated to {new_status}."}
