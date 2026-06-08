# Trovr.ai — Autonomous Web3 Lead Intelligence

**Trovr.ai** is an end-to-end autonomous lead generation and outreach engine, purpose-built for Web3 ICP targeting. It leverages multi-source scrapers (Twitter/X, GitHub, Discord, DexScreener, on-chain wallets), a dual-layer scoring model (custom heuristics + `scikit-learn` gradient boosting), an LLM outreach manager with modular provider adapters (Groq, Gemini, Claude, OpenAI), background APScheduler cron daemons, and a premium cybernetic intelligence dashboard built with React and Vite.

---

## 🏗️ Architecture & Pipeline

```
   [Discovery Scrapers] ── X (Twitter), GitHub, Discord, DexScreener, Blockchain Logs
            │
            ▼
   [Enrichment Engines] ── Profile Followers, Repo Languages, On-chain protocols
            │
            ▼
   [Scoring Matrix] ───── Composite Heuristics + Scikit-Learn GradientBoosting Model
            │
            ▼
   [FastAPI Core / DB] ── Trovr.ai REST API (Supabase / local SQLite fallback)
            │
            ▼
   [Intelligence Dashboard] ── React Glassmorphic HUD with Recharts Analytics
```

---

## ⚙️ Configuration & Secrets (.env)

Trovr.ai operates in **dual-mode**. If any external service credential is missing in `.env`, the pipeline gracefully falls back to local SQLite and realistic synthetic mock data.

```env
# Database (Leave empty for local SQLite at data/lead_gen.db)
SUPABASE_URL=
SUPABASE_KEY=

# LLM Providers (Trovr.ai wraps and switches between these)
GROQ_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=

# Preferred default LLM: 'groq', 'openai', 'anthropic', 'gemini', or 'mock'
DEFAULT_LLM_PROVIDER=groq

# Scraper Credentials (Optional — all fall back to mock if missing)
TWITTER_BEARER_TOKEN=
GITHUB_TOKEN=
DUNE_API_KEY=
DISCORD_BOT_TOKEN=
```

---

## 🚀 Startup Guide

### 1. Backend

```bash
# Install dependencies
pip install -r requirements.txt

# (Optional) Pre-train the ML scorer on synthetic lead matrices
python scoring/train.py

# Launch FastAPI backend
uvicorn api.main:app --reload --port 8000
```

Swagger docs available at `http://localhost:8000/docs`.

### 2. Dashboard

```bash
cd dashboard
npm install
npm run dev
```

Dashboard available at `http://localhost:5173`.

### 3. CLI Discovery Runner

```bash
# Run all scrapers
python run_discovery.py

# Run individual scrapers
python run_discovery.py --twitter
python run_discovery.py --onchain
python run_discovery.py --dexscreener
```

### 4. Background Cron Daemon

```bash
python scheduler/cron_jobs.py
```

---

## 🧪 Tests

```bash
pytest tests/
```

---

## 🧬 Codebase Map

| Module | Description |
|--------|-------------|
| `discovery/` | Multi-source scrapers — Twitter, GitHub, Discord, DexScreener, On-chain |
| `enrichment/` | Adds followers, languages, protocol usage, and wallet context |
| `scoring/` | Rule engine (`rule_scorer.py`) + ML predictor (`ml_scorer.py`) |
| `outreach/` | LLM message generator, sequence tracker, and multi-stage dispatch |
| `api/` | FastAPI controllers, dual-mode DB client, and analytics reports |
| `scheduler/` | APScheduler background loop coordinator |
| `dashboard/` | React + Recharts intelligence HUD with glassmorphic cyberpunk design |
| `utils/` | Config, constants, logger, LLM client, and helpers |
