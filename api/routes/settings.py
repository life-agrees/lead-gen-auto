"""
api/routes/settings.py
-----------------------
Campaign settings CRUD. ALL settings are saved to settings_local.json.
Supabase campaigns table is only used for best-effort system_prompt sync.
Niche-typed client codes replace the old single paid_passcode field.
"""

import json
import os
import random
import string
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional

ADMIN_MASTER_CODE = os.getenv("ADMIN_MASTER_CODE", "trovr2026")
from api.db.supabase_client import DatabaseClient
from utils.logger import get_logger

router = APIRouter(prefix="/settings", tags=["settings"])
logger = get_logger("SettingsRouter")
db = DatabaseClient()

SETTINGS_FALLBACK_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "settings_local.json")

# Valid niche labels the system understands
VALID_NICHES = ["defi", "kol", "lp", "pred", "nft", "gen"]

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
    # niche_codes: maps passcode -> niche label
    # e.g. {"defi-xyz9": "defi", "kol-abc4": "kol"}
    "niche_codes": {},
}


class CampaignSettings(BaseModel):
    persona_instructions: str
    hot_threshold: int
    warm_threshold: int
    keywords: List[str]
    digest_enabled: bool
    digest_email: Optional[str] = ""
    trial_passcode: Optional[str] = "free10"
    niche_codes: Optional[Dict[str, str]] = {}


class VerifyCodeRequest(BaseModel):
    code: str


# ── Local JSON helpers ────────────────────────────────────────────────────────

def _read_local() -> dict:
    """Read all settings from settings_local.json merged over defaults."""
    if os.path.exists(SETTINGS_FALLBACK_PATH):
        try:
            with open(SETTINGS_FALLBACK_PATH, "r", encoding="utf-8") as f:
                return {**DEFAULT_SETTINGS, **json.load(f)}
        except Exception:
            pass
    return dict(DEFAULT_SETTINGS)


def _write_local(data: dict) -> None:
    """Write all settings to settings_local.json."""
    with open(SETTINGS_FALLBACK_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def _read_trial_passcode() -> str:
    return _read_local().get("trial_passcode", DEFAULT_SETTINGS["trial_passcode"])


def _read_niche_codes() -> Dict[str, str]:
    return _read_local().get("niche_codes", {})


def _generate_niche_code(niche: str) -> str:
    """Generate a unique niche-prefixed code, e.g. defi-xyz9ab12."""
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"{niche}-{suffix}"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/campaign")
def get_campaign_settings() -> dict:
    """
    Returns current campaign configuration from settings_local.json.
    If Supabase has an existing system_prompt and the local file still has
    the default persona, we merge it in for backwards compatibility.
    """
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
    """
    Saves ALL settings to settings_local.json.
    Also attempts a best-effort sync of system_prompt to Supabase.
    """
    data = settings.model_dump()
    try:
        _write_local(data)
        logger.info("Campaign settings saved to settings_local.json successfully.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save settings: {str(e)}")

    # Best-effort Supabase sync of system_prompt only
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


@router.post("/generate-niche-code")
def generate_niche_code(body: dict) -> dict:
    """
    Generate a new niche-typed passcode and save it.
    Body: { "niche": "defi" }
    Returns: { "code": "defi-xyz9ab12", "niche": "defi" }
    """
    niche = (body.get("niche") or "").strip().lower()
    if niche not in VALID_NICHES:
        raise HTTPException(status_code=400, detail=f"Invalid niche. Must be one of: {VALID_NICHES}")

    local = _read_local()
    niche_codes: dict = local.get("niche_codes", {})

    code = _generate_niche_code(niche)
    # Ensure uniqueness
    while code in niche_codes:
        code = _generate_niche_code(niche)

    niche_codes[code] = niche
    local["niche_codes"] = niche_codes
    _write_local(local)

    logger.info(f"Generated niche code '{code}' for niche '{niche}'.")
    return {"code": code, "niche": niche, "niche_codes": niche_codes}


@router.delete("/niche-code/{code}")
def delete_niche_code(code: str) -> dict:
    """Remove a niche client code."""
    local = _read_local()
    niche_codes: dict = local.get("niche_codes", {})
    if code not in niche_codes:
        raise HTTPException(status_code=404, detail="Code not found")
    del niche_codes[code]
    local["niche_codes"] = niche_codes
    _write_local(local)
    logger.info(f"Removed niche code '{code}'.")
    return {"status": "removed", "niche_codes": niche_codes}


@router.post("/verify-code")
def verify_access_code(body: VerifyCodeRequest) -> dict:
    """
    Verifies a client or admin access code.
    Returns { "verified": true, "role": "admin" | "paid" | "trial", "niche": "defi" | ... }
    Admin: role=admin, niche=null
    Trial: role=trial, niche=gen (sees all leads, no filter)
    Paid: role=paid, niche=<their niche>
    """
    submitted = (body.code or "").strip()
    if not submitted:
        raise HTTPException(status_code=401, detail="No code provided")

    if submitted == ADMIN_MASTER_CODE:
        return {"verified": True, "role": "admin", "niche": None}

    trial_code = _read_trial_passcode()
    if submitted == trial_code:
        return {"verified": True, "role": "trial", "niche": "gen"}

    niche_codes = _read_niche_codes()
    logger.info(f"verify-code: submitted='{submitted}', known_codes={list(niche_codes.keys())}")
    if submitted in niche_codes:
        niche = niche_codes[submitted]
        return {"verified": True, "role": "paid", "niche": niche}

    raise HTTPException(status_code=401, detail="Invalid access code")
