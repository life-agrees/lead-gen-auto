from fastapi import APIRouter, HTTPException
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
    return logs

@router.post("/trigger", response_model=OutreachLogBase)
def trigger_outreach(trigger: OutreachTrigger):
    """Triggers the LLM (Claude/ChatGPT/Gemini/Grok) message generator for a single lead, saving the event."""
    lead_id = trigger.lead_id
    stage = trigger.stage or "day_1_pitch"

    # 1. Fetch Lead
    lead = db.get_lead_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Target lead not found.")

    logger.info(f"Generating personalized outreach message for Lead {lead_id} ({lead.get('name')}) - Stage: {stage}")

    try:
        # 2. Generate personalized message
        message_body = msg_generator.generate_personalized_message(lead, stage)

        # 3. Log event inside DB (updates lead status + creates log)
        log_entry = tracker.log_outreach_event(db, lead_id, stage, message_body)
        
        # Add basic lead keys to model response so the React dashboard renders them immediately
        log_entry["name"] = lead.get("name")
        log_entry["username"] = lead.get("username")
        
        return log_entry
    except Exception as e:
        logger.error(f"Failed to generate and track outreach message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"LLM outreach execution failed: {str(e)}")

@router.post("/logs/{log_id}/status")
def update_log_status(log_id: str, lead_id: str, new_status: str):
    """Updates log delivery status (opened, replied) to simulate email/DM receipts."""
    success = tracker.update_delivery_status(db, log_id, lead_id, new_status)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update log delivery status.")
    return {"status": "success", "message": f"Log status updated to {new_status}."}
