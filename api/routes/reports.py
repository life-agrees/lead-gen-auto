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
    total_hot_score = 0.0
    highly_fit_count = 0
    
    for lead in leads:
        # Increment source counts
        source = lead.get("source", "").lower()
        if source in sources:
            sources[source] += 1
        elif source == "dexscreener":
            sources["dexscreener"] = sources.get("dexscreener", 0) + 1
            
        # Accumulate score averages
        score = lead.get("score", 0.0)
        total_score += score
        if score >= 70.0:
            highly_fit_count += 1
            total_hot_score += score
            
        # Segment funnel status — check both `status` and `outreach_status` columns
        outreach_status = (lead.get("outreach_status") or "discovered").lower()
        lead_status = (lead.get("status") or "raw").lower()

        if outreach_status in ("discovered",) and lead_status in ("raw", "discovered"):
            funnel["discovered"] += 1
        elif outreach_status == "scored" or lead_status == "scored":
            funnel["scored"] += 1
        elif "day_" in outreach_status:
            funnel["contacted"] += 1
        elif outreach_status == "replied":
            funnel["replied"] += 1
        else:
            funnel["discovered"] += 1
            
    # Add open/reply counts from log traces
    opened_logs = sum(1 for log in logs if log.get("status") == "opened")
    replied_logs = sum(1 for log in logs if log.get("status") == "replied")
    funnel["opened"] = opened_logs
    if replied_logs > funnel["replied"]:
        funnel["replied"] = replied_logs
        
    # Calculate averages
    avg_score = round(total_score / total_leads, 1) if total_leads > 0 else 0.0
    avg_hot_score = round(total_hot_score / highly_fit_count, 1) if highly_fit_count > 0 else 0.0
    conversion_rate = round((funnel["replied"] / max(funnel["contacted"] + funnel["replied"], 1)) * 100.0, 1)

    return {
        "total_leads": total_leads,
        "highly_fit": highly_fit_count,
        "average_score": avg_score,
        "average_hot_score": avg_hot_score,
        "conversion_rate": conversion_rate,
        "source_breakdown": sources,
        "funnel_metrics": funnel,
        "recent_logs_count": len(logs)
    }

@router.get("/pipeline-report")
def get_pipeline_report() -> Dict[str, Any]:
    """Returns enriched pipeline analytics: stage conversion rates, top leads, and stage performance metrics."""
    leads = db.get_leads(0.0)
    logs = db.get_outreach_logs()

    # Stage performance — messages sent per stage + reply rate
    stages = ["day_1_pitch", "day_3_followup", "day_7_breakup"]
    stage_perf: Dict[str, Dict] = {}
    for stage in stages:
        stage_logs = [l for l in logs if l.get("stage") == stage]
        sent = len(stage_logs)
        replied = sum(1 for l in stage_logs if l.get("status") == "replied")
        opened = sum(1 for l in stage_logs if l.get("status") in ("opened", "replied"))
        stage_perf[stage] = {
            "sent": sent,
            "opened": opened,
            "replied": replied,
            "reply_rate": round((replied / max(sent, 1)) * 100, 1),
            "open_rate": round((opened / max(sent, 1)) * 100, 1),
        }

    # Top 5 leads by score
    sorted_leads = sorted(leads, key=lambda l: l.get("score", 0), reverse=True)
    top_leads = [
        {
            "id": l.get("id"),
            "name": l.get("name", "Unknown"),
            "username": l.get("username", ""),
            "score": l.get("score", 0),
            "source": l.get("source", ""),
            "outreach_status": l.get("outreach_status", "discovered"),
        }
        for l in sorted_leads[:5]
    ]

    # Daily activity — count logs per day (last 7 days)
    from collections import defaultdict
    from datetime import datetime, timezone, timedelta
    daily_counts: Dict[str, int] = defaultdict(int)
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    for log in logs:
        sent_at_raw = log.get("sent_at")
        if sent_at_raw:
            try:
                sent_at = datetime.fromisoformat(sent_at_raw.replace("Z", "+00:00"))
                if sent_at >= cutoff:
                    day_key = sent_at.strftime("%Y-%m-%d")
                    daily_counts[day_key] += 1
            except Exception:
                pass

    daily_activity = [
        {"date": k, "count": v}
        for k, v in sorted(daily_counts.items())
    ]

    return {
        "stage_performance": stage_perf,
        "top_leads": top_leads,
        "daily_activity": daily_activity,
        "total_messages_sent": len(logs),
    }
