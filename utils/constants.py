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
    "building on uniswap v4",
    "uniswap v4 hooks",
    "prediction market defi",
    "building prediction market",
    "just launched on base",
    "just deployed on base",
    "defi primitive",
    "looking for liquidity providers",
    "looking for LPs defi",
    "raised pre-seed defi",
    "seed round defi",
    "building on base defi",
    "launched on arbitrum defi",
    "defi protocol launch",
    "on-chain prediction",
    "permissionless market",
    "defi hooks",
]

# ── ICP Twitter bio keywords ──────────────────────────────────
# Used to filter accounts during enrichment.
# If a bio contains any of these, it's a stronger signal.
TWITTER_BIO_KEYWORDS = [
    "building",
    "founder",
    "defi",
    "web3",
    "prediction market",
    "uniswap",
    "solidity",
    "smart contract",
    "on-chain",
    "protocol",
    "base",
    "arbitrum",
    "ethereum",
    "liquidity",
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
}

# ── On-chain: Activity filters ────────────────────────────────
ONCHAIN_MIN_TRANSACTIONS  = 3      # minimum tx count with watched contract
ONCHAIN_ACTIVE_DAYS       = 7     # only wallets active in last N days
ONCHAIN_MIN_ETH_BALANCE   = 0.01   # filter out dust wallets

# ── Dune query IDs ────────────────────────────────────────────
# Pre-built Dune queries that return relevant wallets.
# Create these on dune.com and paste their IDs here.
DUNE_QUERIES = {
    "polymarket_active_traders":  7629776,
    "azuro_active_bettors":       7629946,
    "base_contract_deployers":    7630029,
    "uniswap_v4_hook_deployers":  None,   # Week 2+
    "base_defi_active_wallets":   None,   # Week 2+
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

