from fastapi import APIRouter
from typing import Dict, Any, List
from api.db.supabase_client import DatabaseClient
from utils.logger import get_logger

router = APIRouter(prefix="/reports", tags=["reports"])
logger = get_logger("ReportsRouter")
db = DatabaseClient()

@router.get("/summary")
def get_dashboard_summary() -> Dict[str, Any]:
    """Aggregates multi-dimensional stats across leads and logs to render premium dashboards."""
    leads = db.get_leads(0.0) # fetch all leads
    logs = db.get_outreach_logs()

    total_leads = len(leads)
    
    # 1. Sources count
    sources = {"twitter": 0, "github": 0, "onchain": 0, "discord": 0}
    
    # 2. Funnel metrics
    funnel = {
        "discovered": 0,
        "scored": 0,
        "contacted": 0, # day_1_pitch, day_3_followup, day_7_breakup
        "opened": 0,
        "replied": 0
    }
    
    total_score = 0.0
    highly_fit_count = 0
    
    for lead in leads:
        # Increment source counts
        source = lead.get("source", "").lower()
        if source in sources:
            sources[source] += 1
            
        # Accumulate score averages
        score = lead.get("score", 0.0)
        total_score += score
        if score >= 70.0:
            highly_fit_count += 1
            
        # Segment funnel status
        status = lead.get("outreach_status", "discovered").lower()
        if status in ["discovered", "scored"]:
            funnel[status] += 1
        elif "day_" in status:
            funnel["contacted"] += 1
        elif status == "replied":
            funnel["replied"] += 1
            
    # Add open/reply counts from log traces
    opened_logs = sum(1 for log in logs if log.get("status") == "opened")
    replied_logs = sum(1 for log in logs if log.get("status") == "replied")
    funnel["opened"] = opened_logs
    if replied_logs > funnel["replied"]:
        funnel["replied"] = replied_logs
        
    # Calculate averages
    avg_score = round(total_score / total_leads, 1) if total_leads > 0 else 0.0
    conversion_rate = round((funnel["replied"] / max(funnel["contacted"] + funnel["replied"], 1)) * 100.0, 1)

    return {
        "total_leads": total_leads,
        "highly_fit": highly_fit_count,
        "average_score": avg_score,
        "conversion_rate": conversion_rate,
        "source_breakdown": sources,
        "funnel_metrics": funnel,
        "recent_logs_count": len(logs)
    }
