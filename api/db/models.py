from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class ScoreBreakdown(BaseModel):
    twitter_influence: float = 0.0
    github_activity: float = 0.0
    onchain_relevance: float = 0.0
    bio_relevance: float = 0.0

class LeadBase(BaseModel):
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
    score_breakdown: Optional[Dict[str, float]] = {}
    outreach_status: Optional[str] = "discovered"
    last_contacted: Optional[str] = None
    created_at: Optional[str] = None

class LeadCreate(BaseModel):
    source: str
    username: str
    name: str
    bio: Optional[str] = ""
    followers_count: Optional[int] = 0
    public_repos: Optional[int] = 0
    tx_count: Optional[int] = 0
    eth_balance: Optional[float] = 0.0

class OutreachLogBase(BaseModel):
    id: Optional[int] = None
    lead_id: str
    stage: str
    message_body: str
    sent_at: str
    status: str = "sent"
    name: Optional[str] = None
    username: Optional[str] = None

class OutreachTrigger(BaseModel):
    lead_id: str
    stage: Optional[str] = "day_1_pitch"

class PipelineStatus(BaseModel):
    running: bool
    last_run: Optional[str] = None
    leads_discovered_last_run: int = 0
