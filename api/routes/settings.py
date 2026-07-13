"""
api/routes/settings.py
-----------------------
Campaign settings CRUD. ALL settings are saved to settings_local.json.
Supabase campaigns table is only used for best-effort system_prompt sync.
"""

import json
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

ADMIN_MASTER_CODE = os.getenv("ADMIN_MASTER_CODE", "trovr2026")
from api.db.supabase_client import DatabaseClient
from utils.logger import get_logger

router = APIRouter(prefix="/settings", tags=["settings"])
logger = get_logger("SettingsRouter")
db = DatabaseClient()

SETTINGS_FALLBACK_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "settings_local.json")

DEFAULT_SETTINGS = {
    "persona_instructions": (
        "You are a founder reaching out to a potential collaborator. "
        "Keep messages short, direct, and warm. No bullet points, no em-dashes. "
        "Write like a human, not a tool."
    ),
    "hot_threshold": 70,
    "warm_threshold": 40,
    "keywords": ["defi", "solidity", "web3", "crypto", "zk", "nft", "dao", "ethereum"],
    "digest_enabled": False,
    "digest_email": "",
    "trial_passcode": "free10",
    "paid_passcode": "paidleads",
}


class CampaignSettings(BaseModel):
    persona_instructions: str
    hot_threshold: int
    warm_threshold: int
    keywords: List[str]
    digest_enabled: bool
    digest_email: Optional[str] = ""
    trial_passcode: Optional[str] = "free10"
    paid_passcode: Optional[str] = "paidleads"


class VerifyCodeRequest(BaseModel):
    code: str


def _read_local() -> dict:
    if os.path.exists(SETTINGS_FALLBACK_PATH):
        try:
            with open(SETTINGS_FALLBACK_PATH, "r", encoding="utf-8") as f:
                return {**DEFAULT_SETTINGS, **json.load(f)}
        except Exception:
            pass
    return dict(DEFAULT_SETTINGS)


def _write_local(data: dict) -> None:
    with open(SETTINGS_FALLBACK_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def _read_trial_passcode() -> str:
    return _read_local().get("trial_passcode", DEFAULT_SETTINGS["trial_passcode"])


def _read_paid_passcode() -> str:
    return _read_local().get("paid_passcode", DEFAULT_SETTINGS["paid_passcode"])


@router.get("/campaign")
def get_campaign_settings() -> dict:
    local = _read_local()
    if db.use_supabase:
        try:
            res = (
                db.client.table("campaigns")
                .select("system_prompt")
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            rows = res.data or []
            if rows and rows[0].get("system_prompt"):
                if local["persona_instructions"] == DEFAULT_SETTINGS["persona_instructions"]:
                    local["persona_instructions"] = rows[0]["system_prompt"]
        except Exception as e:
            logger.warning(f"Could not read system_prompt from Supabase (non-fatal): {e}")
    return local


@router.post("/campaign")
def update_campaign_settings(settings: CampaignSettings) -> dict:
    data = settings.model_dump()
    try:
        _write_local(data)
        logger.info("Campaign settings saved to settings_local.json successfully.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save settings: {str(e)}")
    if db.use_supabase:
        try:
            res = (
                db.client.table("campaigns")
                .select("id")
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            rows = res.data or []
            payload = {"system_prompt": data["persona_instructions"]}
            if rows:
                db.client.table("campaigns").update(payload).eq("id", rows[0]["id"]).execute()
            else:
                db.client.table("campaigns").insert(payload).execute()
            logger.info("system_prompt synced to Supabase.")
        except Exception as e:
            logger.warning(f"Could not sync system_prompt to Supabase (non-fatal): {e}")
    return {"status": "saved", **data}


@router.post("/verify-code")
def verify_access_code(body: VerifyCodeRequest) -> dict:
    submitted = (body.code or "").strip()
    if not submitted:
        raise HTTPException(status_code=401, detail="No code provided")
    if submitted == ADMIN_MASTER_CODE:
        return {"verified": True, "role": "admin"}
    trial_code = _read_trial_passcode()
    paid_code = _read_paid_passcode()
    logger.info(f"verify-code: submitted='{submitted}', trial='{trial_code}', paid='{paid_code}'")
    if submitted == trial_code:
        return {"verified": True, "role": "trial"}
    if submitted == paid_code:
        return {"verified": True, "role": "paid"}
    raise HTTPException(status_code=401, detail="Invalid access code")
