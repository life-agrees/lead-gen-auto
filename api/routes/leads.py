from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from typing import List, Dict, Any
from api.db.supabase_client import DatabaseClient
from api.db.models import LeadBase, LeadCreate
from discovery.twitter_scraper import TwitterScraper
from discovery.github_scraper import GitHubScraper
from discovery.onchain_scanner import OnchainScanner
from discovery.discord_monitor import DiscordMonitor
from discovery.dexscreener_scraper import DexScreenerScraper
from enrichment.enricher_pipeline import EnricherPipeline
from scoring.rule_scorer import RuleScorer
from scoring.ml_scorer import MLScorer
from utils.logger import get_logger

router = APIRouter(prefix="/leads", tags=["leads"])
logger = get_logger("LeadsRouter")
db = DatabaseClient()

# Pipelines instantiations
twitter_scraper = TwitterScraper()
github_scraper = GitHubScraper()
onchain_scanner = OnchainScanner()
discord_monitor = DiscordMonitor()
dexscreener_scraper = DexScreenerScraper()
enricher_pipeline = EnricherPipeline()
rule_scorer = RuleScorer()
ml_scorer = MLScorer()

def run_discovery_and_enrichment_task(limit: int = 5):
    """Background pipeline executor combining scrapers, enrichers, and scorers."""
    logger.info("Executing background lead generation pipeline run...")
    try:
        raw_leads = []
        
        # 1. Scraping runs
        raw_leads.extend(twitter_scraper.search_leads(limit=limit))
        raw_leads.extend(github_scraper.search_active_contributors(limit=limit))
        raw_leads.extend(onchain_scanner.scan_active_wallets(limit=limit))
        raw_leads.extend(discord_monitor.listen_keywords(limit=limit))
        raw_leads.extend(dexscreener_scraper.search_leads(limit=limit))

        # 2. Enrichment batch
        enriched_leads = enricher_pipeline.enrich_batch(raw_leads)

        # 3. Scoring runs and saving
        for lead in enriched_leads:
            score, breakdown = rule_scorer.calculate_score(lead)
            
            # Predict ML fit probability if available
            ml_prob, _ = ml_scorer.predict_fit_probability(lead)
            # Combine rule score & ML probability for a rich composite score
            composite_score = round((score + ml_prob) / 2.0, 1)
            
            lead["score"] = composite_score
            lead["score_breakdown"] = breakdown
            
            # Save to Database
            db.create_lead(lead)
            
        logger.info(f"Background pipeline run finished. Processed and saved {len(enriched_leads)} leads.")
    except Exception as e:
        logger.error(f"Background pipeline run crashed: {str(e)}")

@router.get("/stats")
def get_leads_stats() -> Dict[str, Any]:
    """Returns aggregated pipeline stats used by the Week 5 dashboard charts."""
    leads = db.get_leads(0.0)

    # Tier breakdown (Hot ≥70, Warm 40-69, Cold <40)
    hot = sum(1 for l in leads if l.get("score", 0) >= 70)
    warm = sum(1 for l in leads if 40 <= l.get("score", 0) < 70)
    cold = sum(1 for l in leads if l.get("score", 0) < 40)

    # Pipeline stage counts
    stage_counts = {
        "discovered": 0,
        "scored": 0,
        "contacted": 0,
        "replied": 0,
    }
    for lead in leads:
        outreach_status = (lead.get("outreach_status") or "discovered").lower()
        lead_status     = (lead.get("status") or "raw").lower()
        if outreach_status == "scored" or lead_status == "scored":
            stage_counts["scored"] += 1
        elif "day_" in outreach_status:
            stage_counts["contacted"] += 1
        elif outreach_status == "replied":
            stage_counts["replied"] += 1
        else:
            stage_counts["discovered"] += 1

    # Source distribution + hot leads per source
    sources: Dict[str, int] = {}
    hot_by_source: Dict[str, int] = {}
    for lead in leads:
        src = lead.get("source", "unknown").lower()
        sources[src] = sources.get(src, 0) + 1
        if lead.get("score", 0) >= 70:
            hot_by_source[src] = hot_by_source.get(src, 0) + 1

    return {
        "total": len(leads),
        "tiers": {"hot": hot, "warm": warm, "cold": cold},
        "pipeline": stage_counts,
        "sources": sources,
        "hot_by_source": hot_by_source,
    }

@router.get("/", response_model=List[LeadBase])
def read_leads(min_score: float = Query(0.0, description="Minimum lead fit score to filter by")):
    """Retrieves all leads from the database, sorted by score."""
    import json as _json
    leads = db.get_leads(min_score)
    # Coerce any JSON-string fields back to native Python types
    for lead in leads:
        for field in ("raw_data", "score_breakdown"):
            if isinstance(lead.get(field), str):
                try:
                    lead[field] = _json.loads(lead[field])
                except Exception:
                    lead[field] = {}
        if isinstance(lead.get("chains_active"), str):
            try:
                lead["chains_active"] = _json.loads(lead["chains_active"])
            except Exception:
                lead["chains_active"] = []
        # Ensure required string fields are never None
        lead.setdefault("username", lead.get("twitter_handle") or lead.get("wallet_address") or "unknown")
        lead.setdefault("name", lead.get("username") or "unknown")
        lead.setdefault("source", "unknown")
    return leads

@router.get("/{lead_id}", response_model=LeadBase)
def read_lead(lead_id: str):
    """Retrieves detailed profile information for a single lead."""
    lead = db.get_lead_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")
    return lead

@router.post("/", response_model=LeadBase)
def create_lead(lead: LeadCreate):
    """Enables manual lead insertion directly into the automation pipeline."""
    # Convert Create schema to Dict
    lead_dict = lead.model_dump()
    # Compute base scoring immediately
    score, breakdown = rule_scorer.calculate_score(lead_dict)
    lead_dict["score"] = score
    lead_dict["score_breakdown"] = breakdown
    
    saved_lead = db.create_lead(lead_dict)
    return saved_lead

@router.post("/trigger-pipeline")
def trigger_pipeline(background_tasks: BackgroundTasks, limit: int = 5):
    """Asynchronously launches the complete scraping, enrichment, and scoring pipelines."""
    background_tasks.add_task(run_discovery_and_enrichment_task, limit)
    return {"status": "running", "message": "Lead generation pipeline triggered in background."}

@router.post("/{lead_id}/rescore", response_model=LeadBase)
def rescore_lead(lead_id: str):
    """Triggers recalculation of the heuristic and ML score for an existing lead."""
    lead = db.get_lead_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")
        
    score, breakdown = rule_scorer.calculate_score(lead)
    ml_prob, _ = ml_scorer.predict_fit_probability(lead)
    composite_score = round((score + ml_prob) / 2.0, 1)
    
    db.update_lead_score(lead_id, composite_score, breakdown)
    
    updated_lead = db.get_lead_by_id(lead_id)
    return updated_lead
