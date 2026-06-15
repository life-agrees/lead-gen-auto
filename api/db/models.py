from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List

class ScoreBreakdown(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    twitter_influence: float = 0.0
    github_activity: float = 0.0
    onchain_relevance: float = 0.0
    bio_relevance: float = 0.0

class LeadBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    source: str
    username: str
    name: str
    bio: Optional[str] = ""
    followers_count: Optional[int] = 0
    public_repos: Optional[int] = 0
    tx_count: Optional[int] = 0
    eth_balance: Optional[float] = 0.0
    score: Optional[float] = 0.0
    score_breakdown: Optional[Dict[str, Any]] = {}
    outreach_status: Optional[str] = "discovered"
    status: Optional[str] = "raw"
    last_contacted: Optional[str] = None
    created_at: Optional[str] = None
    # Enriched profile fields (populated by enrichment pipeline)
    raw_data: Optional[Dict[str, Any]] = {}
    twitter_handle: Optional[str] = None
    wallet_address: Optional[str] = None
    github_username: Optional[str] = None
    chains_active: Optional[List[str]] = []

class LeadCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    source: str
    username: str
    name: str
    bio: Optional[str] = ""
    followers_count: Optional[int] = 0
    public_repos: Optional[int] = 0
    tx_count: Optional[int] = 0
    eth_balance: Optional[float] = 0.0

class OutreachLogBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: Optional[int] = None
    lead_id: Optional[str] = None
    stage: Optional[str] = "day_1_pitch"
    message_body: Optional[str] = ""
    sent_at: Optional[str] = None
    send_after: Optional[str] = None
    status: Optional[str] = "sent"
    name: Optional[str] = None
    username: Optional[str] = None


class OutreachTrigger(BaseModel):
    lead_id: str
    stage: Optional[str] = "day_1_pitch"

class PipelineStatus(BaseModel):
    running: bool
    last_run: Optional[str] = None
    leads_discovered_last_run: int = 0
