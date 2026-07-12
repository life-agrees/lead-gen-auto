"""
api/routes/digest.py
---------------------
Daily digest endpoint — summarises yesterday's pipeline activity and sends
via Resend. Also exposes a preview endpoint that returns the digest body as
JSON for rendering in the Settings panel.
"""

import os
import json
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from api.db.supabase_client import DatabaseClient
from utils.logger import get_logger

router = APIRouter(prefix="/digest", tags=["digest"])
logger = get_logger("DigestRouter")
db = DatabaseClient()

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
DIGEST_FROM    = os.getenv("DIGEST_FROM_EMAIL", "digest@trovr.ai")


class DigestSendRequest(BaseModel):
    recipient_email: str
    force: Optional[bool] = False


def _build_digest_payload() -> dict:
    """Pulls 24-hour activity window and returns a structured summary dict."""
    leads  = db.get_leads(0.0)
    logs   = db.get_outreach_logs()

    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

    # Leads discovered in the last 24 h
    new_leads = []
    for lead in leads:
        raw_ts = lead.get("created_at") or lead.get("discovered_at") or ""
        if raw_ts:
            try:
                ts = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
                if ts >= cutoff:
                    new_leads.append(lead)
            except Exception:
                pass

    # Messages sent in the last 24 h
    recent_logs = []
    for log in logs:
        raw_ts = log.get("sent_at") or ""
        if raw_ts:
            try:
                ts = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
                if ts >= cutoff:
                    recent_logs.append(log)
            except Exception:
                pass

    sent_count    = len(recent_logs)
    replied_count = sum(1 for l in recent_logs if (l.get("status") or "") == "replied")
    hot_new       = [l for l in new_leads if l.get("score", 0) >= 70]

    # Top 3 new leads by score
    top_new = sorted(new_leads, key=lambda l: l.get("score", 0), reverse=True)[:3]

    return {
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "new_leads_total": len(new_leads),
        "new_hot_leads": len(hot_new),
        "messages_sent": sent_count,
        "replies_received": replied_count,
        "top_new_leads": [
            {
                "name":   l.get("name", "Unknown"),
                "handle": l.get("username") or l.get("twitter_handle", ""),
                "score":  l.get("score", 0),
                "source": l.get("source", ""),
            }
            for l in top_new
        ],
    }


def _format_email_html(payload: dict) -> str:
    top_rows = "".join(
        f"<tr>"
        f"<td style='padding:6px 10px;color:#fff;font-family:monospace'>{l['name']}</td>"
        f"<td style='padding:6px 10px;color:#94a3b8;font-family:monospace'>@{l['handle']}</td>"
        f"<td style='padding:6px 10px;color:#00f0ff;font-family:monospace;font-weight:bold'>{l['score']}%</td>"
        f"<td style='padding:6px 10px;color:#94a3b8;font-family:monospace'>{l['source'].upper()}</td>"
        f"</tr>"
        for l in payload["top_new_leads"]
    )

    top_section = (
        f"<table style='width:100%;border-collapse:collapse;margin-top:10px'>"
        f"<thead><tr>"
        f"<th style='text-align:left;padding:6px 10px;color:#64748b;font-size:11px;font-family:monospace'>NAME</th>"
        f"<th style='text-align:left;padding:6px 10px;color:#64748b;font-size:11px;font-family:monospace'>HANDLE</th>"
        f"<th style='text-align:left;padding:6px 10px;color:#64748b;font-size:11px;font-family:monospace'>SCORE</th>"
        f"<th style='text-align:left;padding:6px 10px;color:#64748b;font-size:11px;font-family:monospace'>SOURCE</th>"
        f"</tr></thead><tbody>{top_rows}</tbody></table>"
        if top_rows else "<p style='color:#64748b;font-family:monospace;font-size:13px'>No new leads today.</p>"
    )

    return f"""
<div style="background:#05070f;padding:32px;border-radius:12px;max-width:600px;margin:0 auto">
  <div style="color:#00f0ff;font-family:monospace;font-size:11px;letter-spacing:2px;margin-bottom:4px">TROVR.AI</div>
  <h1 style="color:#fff;font-family:monospace;font-size:20px;margin:0 0 4px">Daily Pipeline Digest</h1>
  <div style="color:#64748b;font-family:monospace;font-size:12px;margin-bottom:24px">{payload['date']}</div>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:24px">
    <div style="background:#0a0d1a;border:1px solid rgba(0,240,255,0.15);border-radius:8px;padding:14px;text-align:center">
      <div style="color:#00f0ff;font-family:monospace;font-size:22px;font-weight:bold">{payload['new_leads_total']}</div>
      <div style="color:#64748b;font-family:monospace;font-size:10px;margin-top:4px">NEW LEADS</div>
    </div>
    <div style="background:#0a0d1a;border:1px solid rgba(0,240,255,0.15);border-radius:8px;padding:14px;text-align:center">
      <div style="color:#00f0ff;font-family:monospace;font-size:22px;font-weight:bold">{payload['new_hot_leads']}</div>
      <div style="color:#64748b;font-family:monospace;font-size:10px;margin-top:4px">HOT (≥70)</div>
    </div>
    <div style="background:#0a0d1a;border:1px solid rgba(0,240,255,0.15);border-radius:8px;padding:14px;text-align:center">
      <div style="color:#a78bfa;font-family:monospace;font-size:22px;font-weight:bold">{payload['messages_sent']}</div>
      <div style="color:#64748b;font-family:monospace;font-size:10px;margin-top:4px">MSGS SENT</div>
    </div>
    <div style="background:#0a0d1a;border:1px solid rgba(0,240,255,0.15);border-radius:8px;padding:14px;text-align:center">
      <div style="color:#34d399;font-family:monospace;font-size:22px;font-weight:bold">{payload['replies_received']}</div>
      <div style="color:#64748b;font-family:monospace;font-size:10px;margin-top:4px">REPLIES</div>
    </div>
  </div>

  <div style="color:#fff;font-family:monospace;font-size:13px;font-weight:bold;margin-bottom:8px">TOP NEW LEADS</div>
  {top_section}

  <div style="margin-top:24px;color:#334155;font-family:monospace;font-size:11px;text-align:center">
    Trovr.ai &mdash; Autonomous Web3 Lead Intelligence
  </div>
</div>
"""


@router.get("/preview")
def preview_digest() -> dict:
    """Returns the digest payload as structured JSON — for UI preview."""
    return _build_digest_payload()


@router.post("/send")
def send_digest(body: DigestSendRequest) -> dict:
    """
    Sends the daily digest email to the provided recipient via Resend.
    Requires RESEND_API_KEY in environment.
    """
    if not RESEND_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="RESEND_API_KEY not configured. Set it in your .env file."
        )

    payload = _build_digest_payload()
    html    = _format_email_html(payload)

    try:
        import httpx
        res = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from":    DIGEST_FROM,
                "to":      [body.recipient_email],
                "subject": f"Trovr.ai Daily Digest — {payload['date']}",
                "html":    html,
            },
            timeout=15,
        )
        if res.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail=f"Resend error: {res.text}")
        logger.info(f"Digest sent to {body.recipient_email} for {payload['date']}")
        return {"status": "sent", "recipient": body.recipient_email, "summary": payload}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Digest send failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send digest: {str(e)}")
