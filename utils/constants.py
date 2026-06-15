# ─────────────────────────────────────────────────────────────
# constants.py
# Central definition of WHO we're looking for and WHAT signals
# matter. Edit this file to change your ICP without touching
# any scraper logic.
# ─────────────────────────────────────────────────────────────

# ── ICP Twitter search keywords ──────────────────────────────
# These are fed directly into Twitter search queries.
# Think: what would your ideal lead tweet about?
TWITTER_KEYWORDS = [
    # ── Category 1: High-Intent Builder & Founder Keywords ──
    "just shipped",
    "just launched",
    "building on",
    "testnet",
    "mainnet launch",
    "raising funds",
    "pre-seed",
    "seed round",
    "looking for users",
    "need users",
    "need liquidity",
    "need KOLs",
    "need liquidity providers",
    "looking for beta testers",
    "growth hacking",
    "user acquisition",
    "BD",
    "business development",
    "raised pre-seed defi",
    "seed round defi",
    "building on base defi",
    "just launched on base",
    "just deployed on base",

    # ── Category 2: Prediction Market & Betting Specific ──
    "prediction market",
    "prediction markets",
    "event betting",
    "sports prediction",
    "Polymarket",
    "Azuro",
    "Kalshi",
    "betting protocol",
    "binary market",
    "range market",
    "prediction market defi",
    "building prediction market",
    "on-chain prediction",

    # ── Category 3: Uniswap V4 & DeFi Hooks ──
    "Uniswap hooks",
    "V4 hooks",
    "Uniswap V4",
    "hooks builder",
    "hook developer",
    "liquidity hook",
    "building on uniswap v4",
    "uniswap v4 hooks",
    "defi hooks",

    # ── Category 4: General Web3 / DeFi Intent ──
    "DeFi project",
    "Web3 project",
    "onchain",
    "on-chain",
    "liquidity provider",
    "LP position",
    "adding liquidity",
    "protocol launch",
    "smart contract",
    "dApp",
    "defi primitive",
    "looking for liquidity providers",
    "looking for LPs defi",
    "launched on arbitrum defi",
    "defi protocol launch",
    "permissionless market",

    # ── Category 5: Pain & Help-Seeking Phrases ──
    "anyone recommend",
    "can anyone",
    "looking for",
    "struggling with",
    "need help with",
    "recommend a",
    "who is building",
    "hiring dev",
    "hiring community",
    "hiring marketer",

    # ── Category 6: Bonus / Advanced Keywords ──
    "alpha call",
    "community building",
    "partner with",
    "collab with",
    "integrate with",
    "grant",
    "grants",
    "accelerator",
    "incubated by",
    "waitlist",
    "early access",
]

# ── Twitter Filter Settings & Negative Keywords ────────────────
TWITTER_NEGATIVE_KEYWORDS = [
    "airdrop",
    "giveaway",
    "memecoin",
    "scam",
]

# ── Strong Combined Search Queries (Copy-Paste Ready) ─────────
TWITTER_COMBINED_QUERIES = [
    '("prediction market" OR "Uniswap hooks" OR "V4 hooks" OR DeFi OR Web3) ("building" OR "launched" OR "raising" OR "need users" OR "need liquidity" OR "looking for") -min_faves:0 -filter:replies lang:en',
    '("need users" OR "need liquidity" OR "looking for KOLs" OR "need beta testers") ("prediction market" OR DeFi OR Web3)',
    '("building on" OR "just launched") (Base OR Arbitrum OR Solana OR "Uniswap V4" OR prediction)',
    '("prediction market" (testnet OR mainnet OR launch))',
    '("hiring community" OR "hiring dev" OR "looking for") (prediction OR DeFi)',
    '("just shipped" OR "just launched") (prediction OR betting OR hooks)'
]

# ── ICP Twitter bio keywords ──────────────────────────────────
# Used to filter accounts during enrichment.
# If a bio contains any of these, it's a stronger signal.
TWITTER_BIO_KEYWORDS = [
    # Core Roles & Actions
    "building",
    "founder",
    "co-founder",
    "builder",
    "developer",
    "dev",
    "marketer",
    "bd",
    "partner",
    
    # Core Tech & Ecosystems
    "defi",
    "web3",
    "solidity",
    "smart contract",
    "on-chain",
    "onchain",
    "protocol",
    "dapp",
    
    # Chains
    "base",
    "arbitrum",
    "solana",
    "ethereum",
    
    # Prediction Markets & Betting
    "prediction market",
    "polymarket",
    "azuro",
    "kalshi",
    "betting",
    
    # Uniswap & Hooks
    "uniswap",
    "v4 hooks",
    "uniswap hooks",
    "hook developer",
    
    # Fundraising & Liquidity
    "pre-seed",
    "seed round",
    "liquidity",
    "lp",
]

# ── On-chain: Contracts to watch ─────────────────────────────
# Wallets that interact with these contracts are warm leads.
# These are real deployed contracts on their respective chains.
WATCHED_CONTRACTS = {
    "ethereum": [],

    "polygon": [
        # ── Polymarket V2 (core trading only) ──────────────
        "0xE111180000d2663C0091e4f400237545B87B996B",   # CTF Exchange
        "0xe2222d279d744050d28e00520010520000310F59",   # Neg Risk CTF Exchange

        # ── Azuro V3 Polygon (core betting only) ───────────
        "0x7A1c3FEf712753374C4DCe34254B96faF2B7265B",  # AzuroBet
        "0xF9548Be470A4e130c90ceA8b179FCD66D2972AC7",  # ClientCore
    ],

    "base":     [],
    "arbitrum": [],
    "optimism": [],
    "bsc": [
        "0x10ED43C718714eb63d5aA57B78B54704E256024E",  # PancakeSwap V2 Router
        "0x13f4EA83D0bd40E75C8222255bc855a974568Dd4",  # PancakeSwap V3 Router
        "0xf1bE8ecC990cBcb90e166b71E368299f0116d421",  # Alpaca Finance Vault
        "0xA625AB01B08ce023B2a342Dbb12a16f2C8489A8F",  # Alpaca Finance FairLaunch
    ],
}

# ── On-chain: Activity filters ────────────────────────────────
ONCHAIN_MIN_TRANSACTIONS  = 3      # minimum tx count with watched contract
ONCHAIN_ACTIVE_DAYS       = 7     # only wallets active in last N days
ONCHAIN_MIN_ETH_BALANCE   = 0.01   # filter out dust wallets

# ── DexScreener — new launches (high intent ICP signal) ──────
DEXSCREENER_CHAINS = ["base", "polygon", "arbitrum", "bnb"]
DEXSCREENER_MIN_LIQUIDITY  = 10_000   # $10k minimum — filters dust
DEXSCREENER_MAX_AGE_DAYS   = 60       # only recent launches

# ── Dune query IDs ────────────────────────────────────────────
# Pre-built Dune queries that return relevant wallets.
# Create these on dune.com and paste their IDs here.
DUNE_QUERIES = {
    "polymarket_active_traders":  7629776,
    "azuro_active_bettors":       7629946,
    "base_contract_deployers":    7630029,
    "uniswap_v4_hook_deployers":  None,   # Week 2+
    "base_defi_active_wallets":   None,   # Week 2+

    # New — BNB Chain
    "pancakeswap_active_traders":  7721847,  # ← paste query ID
    "alpaca_active_users":         7721884,  # ← paste query ID
    "bnb_contract_deployers":      7721893,  # ← paste query ID
}

# ── Lead scoring weights (rule-based, Week 3) ─────────────────
SCORE_WEIGHTS = {
    "twitter_followers_1k":        15,   # has 1k+ Twitter followers
    "twitter_followers_5k":        10,   # bonus for 5k+
    "bio_keyword_match":           15,   # bio contains ICP keyword
    "tweeted_keyword_last_30d":    25,   # tweeted ICP keyword recently
    "onchain_active_last_30d":     30,   # wallet active on watched contract
    "has_ens":                     10,   # has ENS name (serious builder signal)
    "has_github":                  10,   # has linked GitHub
    "github_has_solidity":         15,   # GitHub has Solidity repos
    "multiple_chains_active":      10,   # active on 2+ chains
}
MAX_SCORE = sum(SCORE_WEIGHTS.values())  # 140 — normalize to 100 later

# ── Lead statuses (pipeline stages) ──────────────────────────
class LeadStatus:
    RAW       = "raw"
    ENRICHED  = "enriched"
    SCORED    = "scored"
    CONTACTED = "contacted"
    REPLIED   = "replied"
    CONVERTED = "converted"

# ── Sources ───────────────────────────────────────────────────
class LeadSource:
    TWITTER = "twitter"
    ONCHAIN = "onchain"
    GITHUB  = "github"
    DUNE    = "dune"
    DEXSCREENER = "dexscreener"

# ── Twitter API limits ────────────────────────────────────────
TWITTER_MAX_RESULTS_PER_QUERY = 10    # free tier: 10 per request
TWITTER_MAX_LEADS_PER_RUN     = 100   # cap per scraper run

# ── Missing constants for Scrapers and Scorer ──────────────────
TARGET_GITHUB_TOPICS = [
    "uniswap-v4",
    "uniswap-hook",
    "defi",
    "prediction-market",
    "solidity-hooks",
    "zk-proofs",
]

SCORING_WEIGHTS = {
    "twitter_influence": 0.20,
    "github_activity":   0.35,
    "onchain_relevance": 0.25,
    "bio_relevance":     0.20,
}

ICP_KEYWORDS = TWITTER_BIO_KEYWORDS

