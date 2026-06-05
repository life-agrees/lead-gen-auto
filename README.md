# Lead Gen Automation // Cyber HUD & Scrapers Dashboard

Lead Gen Automation is an end-to-end autonomous business development pipeline. It leverages multi-source scrapers, a dual-layer scoring model (custom heuristics + `scikit-learn` predictive classification), an LLM outreach manager with modular adapters (Claude, ChatGPT, Gemini, Grok), background apscheduler cron daemons, and a state-of-the-art cybernetic dashboard frontend built with React and Vite.

---

## 🏗️ Core Architecture & Pipeline Flow

```
   [Discovery Scrapers] ── X (Twitter), GitHub, Discord, Blockchain Logs
            │
            ▼
   [Enrichment Engines] ── Profile Followers, Repo Languages, On-chain protocols
            │
            ▼
   [Scoring Matrix] ───── Composite Heuristics + Scikit-Learn RandomForest Model
            │
            ▼
   [FastAPI Core / DB] ── Unified JSON API (Supabase / local SQLite fallback)
            │
            ▼
   [Cyber HUD React] ──── Responsive Glassmorphic Control Telemetry Table
```

---

## ⚙️ Configuration & Secrets (.env)

The application operates in **dual-mode**. If any external service credential is missing in `.env`, the pipeline gracefully falls back to local SQLite operations and realistic synthetic mockup data.

To configure your pipeline, modify your local `.env`:

```env
# Database Settings (Leave empty for local SQLite data/lead_gen.db fallback)
SUPABASE_URL=
SUPABASE_KEY=

# LLM Providers (Outreach message generator wraps and switches between these keys)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
GROK_API_KEY=

# Preferred default provider: 'openai', 'anthropic', 'gemini', 'grok', or 'mock'
DEFAULT_LLM_PROVIDER=mock

# Scraper Credentials (Optional)
TWITTER_BEARER_TOKEN=
GITHUB_TOKEN=
DUNE_API_KEY=
DISCORD_BOT_TOKEN=
```

---

## 🚀 Speedrun Startup Guide

### 1. Backend API Scaffolding & Setup

Initialize your virtual environment, install python dependencies, and bootstrap initial seed leads:

```bash
# Install dependencies
pip install -r requirements.txt

# (Optional) Pre-train the ML scorer on synthetic lead matrices
python scoring/train.py

# Launch FastAPI local webserver
uvicorn api.main:app --reload --port 8000
```
FastAPI interactive Swagger documentation will immediately become active at `http://localhost:8000/docs`.

### 2. React HUD Dashboard Setup

Navigate to your dashboard directory, install dependencies, and spin up the premium dark-themed Vite HUD interface:

```bash
# Navigate to react workspace
cd dashboard

# Install packages
npm install

# Start local server
npm run dev
```
The React HUD console is active at `http://localhost:5173`.

### 3. Background Pipeline Daemon

To execute background interval loops (searching Web3 contributors, advancing Day 3 / Day 7 follow-up sequences automatically), start the cron scheduler:

```bash
python scheduler/cron_jobs.py
```

---

## 🧪 Pipeline Validation & Testing

Run the localized validation test suite via `pytest` to verify discovery models, mathematical scoring weights, and sequence calculators:

```bash
pytest tests/
```

---

## 🧬 Codebase Components Map

* `discovery/` - Raw scraper logic tracking keywords, EVM balances, and repo contributions.
* `enrichment/` - Adds followings, languages, and protocol usage context to raw leads.
* `scoring/` - Rules engine weights (`rule_scorer.py`) and tabular model predictor (`ml_scorer.py`).
* `outreach/` - Multi-LLM client wrapper (`message_generator.py`) and sequence tracking timers.
* `api/` - FastAPI controllers, dual client (`supabase_client.py`), and reports aggregator.
* `scheduler/` - APScheduler background loops coordinator.
* `dashboard/` - High-fidelity React glassmorphism HUD frontend.
