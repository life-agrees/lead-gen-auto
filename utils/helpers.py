import re
from datetime import datetime, timezone
import json
from typing import Dict, Any

def clean_text(text: str) -> str:
    """Removes special characters, extra whitespaces, and standard emojis."""
    if not text:
        return ""
    text = re.sub(r"http\S+|www\S+|https\S+", "", text, flags=re.MULTILINE)
    text = re.sub(r"[^\w\s@#\-\:\/]", "", text)
    return " ".join(text.split())

def parse_iso_date(date_str: str) -> datetime:
    """Safely parses ISO format dates, returning UTC timezone-aware datetimes."""
    if not date_str:
        return datetime.now(timezone.utc)
    try:
        # Standard cleanups for common string variations
        date_str = date_str.replace("Z", "+00:00")
        return datetime.fromisoformat(date_str)
    except ValueError:
        return datetime.now(timezone.utc)

def days_between(date1: datetime, date2: datetime) -> int:
    """Calculates chronological days between two dates."""
    return abs((date1 - date2).days)

def safe_json_loads(data_str: str, default: Any = None) -> Any:
    """Safely decodes JSON text without crashing."""
    if not data_str:
        return default if default is not None else {}
    try:
        return json.loads(data_str)
    except (json.JSONDecodeError, TypeError):
        return default if default is not None else {}

def calculate_bio_relevance(bio: str, keywords: list) -> float:
    """Computes a percentage match score based on ICP keywords appearing in lead bio."""
    if not bio:
        return 0.0
    bio_lower = bio.lower()
    matched = sum(1 for kw in keywords if kw.lower() in bio_lower)
    # Return scale up to 100 based on matched keyword ratios
    if not keywords:
        return 0.0
    return min((matched / min(len(keywords), 3)) * 100.0, 100.0)
