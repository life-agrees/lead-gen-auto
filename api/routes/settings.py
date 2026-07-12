"""
api/routes/settings.py
-----------------------
Campaign settings CRUD — reads and updates persona, thresholds, keywords,
and digest configuration. Persists to the Supabase `campaigns` table when
available, otherwise falls back to a local JSON file.
"""

import json
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from api.db.supabase_client import DatabaseClient
from utils.logger import get_logger

router = APIRouter(prefix="/settings", tags=["settings"])
logger = get_logger("SettingsRouter")
db = DatabaseClient()

SETTINGS_FALLBACK_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "settings_local.json")

# ── Default settings ─────────────────────────────────────────────────────────
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
}


class CampaignSettings(BaseModel):
    persona_instructions: str
    hot_threshold: int
    warm_threshold: int
    keywords: List[str]
    digest_enabled: bool
    digest_email: Optional[str] = ""


def _read_fallback() -> dict:
    if os.path.exists(SETTINGS_FALLBACK_PATH):
        try:
            with open(SETTINGS_FALLBACK_PATH, "r", encoding="utf-8") as f:
                return {**DEFAULT_SETTINGS, **json.load(f)}
        except Exception:
            pass
    return dict(DEFAULT_SETTINGS)


def _write_fallback(data: dict) -> None:
    with open(SETTINGS_FALLBACK_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def _read_from_supabase() -> dict:
    try:
        res = (
            db.client.table("campaigns")
            .select("*")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        rows = res.data or []
        if rows:
            row = rows[0]
            return {
                "persona_instructions": row.get("system_prompt", DEFAULT_SETTINGS["persona_instructions"]),
                "hot_threshold": row.get("hot_threshold", DEFAULT_SETTINGS["hot_threshold"]),
                "warm_threshold": row.get("warm_threshold", DEFAULT_SETTINGS["warm_threshold"]),
                "keywords": row.get("keywords", DEFAULT_SETTINGS["keywords"]) or DEFAULT_SETTINGS["keywords"],
                "digest_enabled": row.get("digest_enabled", False),
                "digest_email": row.get("digest_email", ""),
            }
    except Exception as e:
        logger.warning(f"Could not read settings from Supabase: {e}")
    return dict(DEFAULT_SETTINGS)


def _write_to_supabase(data: dict) -> None:
    try:
        res = (
            db.client.table("campaigns")
            .select("id")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        rows = res.data or []
        payload = {
            "system_prompt": data["persona_instructions"],
            "hot_threshold": data["hot_threshold"],
            "warm_threshold": data["warm_threshold"],
            "keywords": data["keywords"],
            "digest_enabled": data["digest_enabled"],
            "digest_email": data["digest_email"],
        }
        if rows:
            campaign_id = rows[0]["id"]
            db.client.table("campaigns").update(payload).eq("id", campaign_id).execute()
        else:
            db.client.table("campaigns").insert(payload).execute()
    except Exception as e:
        logger.error(f"Could not write settings to Supabase: {e}")
        raise


@router.get("/campaign")
def get_campaign_settings() -> dict:
    """Returns current campaign configuration."""
    if db.use_supabase:
        return _read_from_supabase()
    return _read_fallback()


@router.post("/campaign")
def update_campaign_settings(settings: CampaignSettings) -> dict:
    """Persists updated campaign configuration."""
    data = settings.model_dump()
    try:
        if db.use_supabase:
            _write_to_supabase(data)
        else:
            _write_fallback(data)
        logger.info("Campaign settings updated successfully.")
        return {"status": "saved", **data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save settings: {str(e)}")
