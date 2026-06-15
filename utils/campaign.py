# ─────────────────────────────────────────────────────────────
# utils/campaign.py
# Loads the active campaign config from Supabase.
# Every part of the pipeline reads from here instead
# of hardcoded constants.
# ─────────────────────────────────────────────────────────────

from api.db.supabase_client import get_client
from utils.logger import get_logger

logger = get_logger(__name__)
_cache = None


def get_active_campaign() -> dict:
    """
    Returns the active campaign config.
    Cached after first load — call clear_cache()
    if you need to reload mid-run.
    """
    global _cache
    if _cache is not None:
        return _cache

    client = get_client()
    if not client:
        logger.warning("Supabase client is not initialized. Running in default/SQLite mode without active campaign.")
        _cache = {}
        return _cache

    try:
        response = (
            client.table("campaigns")
            .select("*")
            .eq("active", True)
            .limit(1)
            .execute()
        )

        if not response.data or len(response.data) == 0:
            logger.warning("No active campaign found in Supabase.")
            _cache = {}
        else:
            if isinstance(response.data, list):
                _cache = response.data[0]
            else:
                _cache = response.data
            logger.info(f"Loaded active campaign configuration: '{_cache.get('name', 'Unnamed')}'")
    except Exception as e:
        logger.warning(f"Failed to fetch active campaign from Supabase: {e}")
        _cache = {}

    return _cache


def clear_cache():
    """Clears the cached campaign configuration."""
    global _cache
    _cache = None
