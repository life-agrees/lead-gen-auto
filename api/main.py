from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import leads, outreach, reports
from api.db.supabase_client import DatabaseClient
from utils.logger import get_logger
from datetime import datetime, timezone
import json
import os

logger = get_logger("APIServer")

app = FastAPI(
    title="Trovr.ai API",
    description="Core intelligence backend powering Trovr.ai — autonomous Web3 lead discovery, enrichment, scoring, and outreach sequencing.",
    version="1.0.0"
)

# Enable CORS for local development and production Vercel deployment
cors_origins_str = os.getenv("CORS_ORIGINS", "")
if cors_origins_str:
    allow_origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]
else:
    allow_origins = [
        "http://localhost:5173",
        "https://trovr-ai.vercel.app",
        "https://trovr.ai",
        "https://www.trovr.ai",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount individual feature routers
app.include_router(leads.router, prefix="/api")
app.include_router(outreach.router, prefix="/api")
app.include_router(reports.router, prefix="/api")

@app.on_event("startup")
def on_startup():
    logger.info("Initializing API services...")
    # Trigger DB tables verify/create
    db = DatabaseClient()
    
    # Bootstrap seed leads if database is empty for instantaneous premium experience
    try:
        existing_leads = db.get_leads(0.0)
        if not existing_leads:
            logger.info("Database is empty. Seeding initial mockup leads for interactive experience...")
            _seed_initial_data(db)
    except Exception as e:
        logger.error(f"Failed to verify or seed database startup rows: {str(e)}")

def _seed_initial_data(db: DatabaseClient):
    """Generates high-fit and medium-fit seed data representation."""
    seed_profiles = [
        {
            "id": "tw_seed_101",
            "source": "twitter",
            "username": "0xAlchemist",
            "name": "Elena Alchemist",
            "bio": "Co-founder @0xDeFi. Building next-gen liquidity protocols. AI agents and multi-agent developer.",
            "followers_count": 8750,
            "public_repos": 14,
            "tx_count": 890,
            "eth_balance": 142.5,
            "score": 88.5,
            "score_breakdown": {"twitter_influence": 87.5, "github_activity": 85.0, "onchain_relevance": 92.0, "bio_relevance": 90.0},
            "outreach_status": "day_1_pitch",
            "last_contacted": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "gh_seed_102",
            "source": "github",
            "username": "rust_block_guru",
            "name": "Alex Kovalev",
            "bio": "Core developer in solidity and rust. Working on zero knowledge rollup implementations and contract bridges.",
            "followers_count": 450,
            "public_repos": 42,
            "tx_count": 1450,
            "eth_balance": 34.2,
            "score": 79.4,
            "score_breakdown": {"twitter_influence": 45.0, "github_activity": 92.0, "onchain_relevance": 78.0, "bio_relevance": 85.0},
            "outreach_status": "replied",
            "last_contacted": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "chain_seed_103",
            "source": "onchain",
            "username": "0x51c96a3bc8...",
            "name": "Active DeFi Address",
            "bio": "High transaction volume wallet with deep smart contract deployment logs on Arbitrum.",
            "followers_count": 0,
            "public_repos": 0,
            "tx_count": 3450,
            "eth_balance": 540.2,
            "score": 68.2,
            "score_breakdown": {"twitter_influence": 0.0, "github_activity": 50.0, "onchain_relevance": 100.0, "bio_relevance": 65.0},
            "outreach_status": "discovered",
            "last_contacted": None
        },
        {
            "id": "dc_seed_104",
            "source": "discord",
            "username": "zk_wizard#9912",
            "name": "ZK Wizard",
            "bio": "Discord builder active in solidity discussions and compiler optimization bugs. High activity rate.",
            "followers_count": 12,
            "public_repos": 15,
            "tx_count": 140,
            "eth_balance": 1.4,
            "score": 54.5,
            "score_breakdown": {"twitter_influence": 12.0, "github_activity": 55.0, "onchain_relevance": 50.0, "bio_relevance": 75.0},
            "outreach_status": "discovered",
            "last_contacted": None
        }
    ]
    
    for profile in seed_profiles:
        db.create_lead(profile)
    logger.info("Seed leads populated successfully.")

@app.get("/")
def get_root():
    return {
        "status": "online",
        "service": "Trovr.ai Intelligence Backend",
        "version": "1.0.0",
        "documentation": "/docs"
    }

@app.get("/api/status")
def get_system_status():
    """Returns real-time system status including active DB backend."""
    db = DatabaseClient()
    db_mode = "supabase" if db.use_supabase else "sqlite"
    db_label = "SUPABASE" if db.use_supabase else "LOCAL_SQLITE"
    try:
        lead_count = len(db.get_leads(0.0))
    except Exception:
        lead_count = 0
    return {
        "status": "online",
        "db_mode": db_mode,
        "db_label": db_label,
        "lead_count": lead_count,
        "version": "1.0.0",
    }
