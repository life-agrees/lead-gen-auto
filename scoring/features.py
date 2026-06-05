# ─────────────────────────────────────────────────────────────
# scoring/features.py
# Centralized feature extraction.
# Converts a raw lead dict (with nested raw_data JSON from
# enrichment) into two things:
#   1. extract_features()  → human-readable dict of 0-100 signals
#   2. to_feature_vector() → flat np.ndarray for the ML model
#
# Both the RuleScorer and MLScorer consume this module.
# To add a new signal: add it here and retrain.
# ─────────────────────────────────────────────────────────────

from __future__ import annotations

import re
from typing import Any, Dict, List

import numpy as np

from utils.constants import ICP_KEYWORDS, TWITTER_BIO_KEYWORDS, SCORE_WEIGHTS
from utils.helpers import calculate_bio_relevance, safe_json_loads

# ── helpers ───────────────────────────────────────────────────

def _raw(lead: Dict[str, Any]) -> Dict[str, Any]:
    """Safely unwrap the raw_data blob (string or dict)."""
    blob = lead.get("raw_data") or {}
    if isinstance(blob, str):
        blob = safe_json_loads(blob, {})
    return blob if isinstance(blob, dict) else {}


def _has_keyword(text: str, keywords: List[str]) -> bool:
    if not text:
        return False
    text_lower = text.lower()
    return any(kw.lower() in text_lower for kw in keywords)


def _wallet_looks_valid(wallet: str) -> bool:
    """Returns True if the string looks like an EVM wallet address."""
    return bool(wallet and re.match(r"^0x[0-9a-fA-F]{40}$", wallet.strip()))


# ── main extractor ────────────────────────────────────────────

def extract_features(lead: Dict[str, Any]) -> Dict[str, Any]:
    """
    Returns a dict of named feature signals (mostly 0.0-100.0 floats,
    some booleans as 0/1) covering all three enrichment layers.

    Keys:
        followers              – twitter followers count (raw)
        has_1k_followers       – 0/1  ≥1 000 followers
        has_5k_followers       – 0/1  ≥5 000 followers
        bio_keyword_match      – 0/1  bio contains ≥1 ICP keyword
        bio_relevance_score    – 0-100 % of ICP keywords found in bio
        tweeted_keyword        – 0/1  recent tweets contain ICP keyword
        tweet_keyword_density  – 0-100 % of last-10 tweets that matched
        has_linked_github      – 0/1  github_username discovered
        github_has_solidity    – 0/1  Solidity in top languages
        github_public_repos    – raw count
        github_activity_score  – 0-100 normalised repo+commit signal
        has_wallet             – 0/1  wallet_address detected
        has_ens                – 0/1  ENS name found
        onchain_active_30d     – 0/1  tx in last 30 days on watched contract
        onchain_multichain     – 0/1  active on 2+ chains
        eth_balance            – raw float
        tx_count               – raw int
        onchain_score          – 0-100 combined on-chain signal
    """
    raw = _raw(lead)

    # ── Twitter signals ────────────────────────────────────────
    followers = float(
        lead.get("followers_count")
        or lead.get("followers")
        or raw.get("followers_count")
        or 0
    )

    bio = (
        lead.get("bio")
        or raw.get("bio")
        or ""
    ).lower()

    has_1k = 1 if followers >= 1_000 else 0
    has_5k = 1 if followers >= 5_000 else 0

    bio_kw_match = 1 if _has_keyword(bio, ICP_KEYWORDS) else 0
    bio_relevance = calculate_bio_relevance(bio, ICP_KEYWORDS)

    # Check last-10 tweets for keyword hits
    recent_tweets: List[str] = raw.get("recent_tweets", [])
    if recent_tweets and isinstance(recent_tweets[0], dict):
        recent_tweets = [t.get("text", "") for t in recent_tweets]

    tweet_hits = sum(1 for t in recent_tweets if _has_keyword(t, ICP_KEYWORDS))
    tweeted_kw = 1 if tweet_hits > 0 else 0
    tweet_kw_density = (tweet_hits / max(len(recent_tweets), 1)) * 100.0 if recent_tweets else 0.0

    # ── GitHub signals ─────────────────────────────────────────
    github_username = (
        raw.get("github_username")
        or lead.get("github_username")
        or ""
    )
    has_github = 1 if github_username else 0

    languages: list = raw.get("top_languages", []) or []
    solidity_langs = {"solidity", "rust", "typescript"}
    github_has_solidity = 1 if any(
        lang.lower() in solidity_langs for lang in languages
    ) else 0

    public_repos = float(
        lead.get("public_repos")
        or raw.get("public_repos")
        or 0
    )
    commits = float(
        lead.get("commits_to_repo")
        or raw.get("commits_last_year")
        or lead.get("tx_count")     # fallback for onchain leads
        or 0
    )
    # Normalise: 50 repos → 100 pts; 500 commits → 100 pts; average
    repo_score  = min(public_repos / 50.0 * 100.0, 100.0)
    commit_score = min(commits / 500.0 * 100.0, 100.0)
    github_activity_score = (repo_score + commit_score) / 2.0

    # ── On-chain signals ───────────────────────────────────────
    wallet = (
        lead.get("wallet_address")
        or raw.get("wallet_address")
        or ""
    )
    has_wallet = 1 if _wallet_looks_valid(wallet) else 0

    ens = raw.get("ens_name") or lead.get("ens_name") or ""
    has_ens = 1 if ens and ens.endswith(".eth") else 0

    chains_active: list = (
        lead.get("chains_active")
        or raw.get("chains_active")
        or []
    )
    onchain_multichain = 1 if isinstance(chains_active, list) and len(chains_active) >= 2 else 0

    tx_count = float(
        lead.get("tx_count")
        or raw.get("tx_count")
        or 0
    )
    eth_balance = float(
        lead.get("eth_balance")
        or raw.get("eth_balance")
        or 0.0
    )

    # Active on watched contract in last 30 days
    onchain_active_30d = int(
        bool(raw.get("onchain_active_last_30d"))
        or bool(lead.get("onchain_active_last_30d"))
        or (tx_count > 0 and has_wallet)
    )

    # On-chain composite: balance (up to 10 ETH → 50 pts) + tx activity (up to 1000 → 50 pts)
    balance_score   = min(eth_balance / 10.0 * 50.0, 50.0)
    tx_score        = min(tx_count / 1000.0 * 50.0, 50.0)
    onchain_score   = balance_score + tx_score

    return {
        # Twitter
        "followers":             followers,
        "has_1k_followers":      float(has_1k),
        "has_5k_followers":      float(has_5k),
        "bio_keyword_match":     float(bio_kw_match),
        "bio_relevance_score":   round(bio_relevance, 2),
        "tweeted_keyword":       float(tweeted_kw),
        "tweet_keyword_density": round(tweet_kw_density, 2),
        # GitHub
        "has_linked_github":     float(has_github),
        "github_has_solidity":   float(github_has_solidity),
        "github_public_repos":   public_repos,
        "github_activity_score": round(github_activity_score, 2),
        # On-chain
        "has_wallet":            float(has_wallet),
        "has_ens":               float(has_ens),
        "onchain_active_30d":    float(onchain_active_30d),
        "onchain_multichain":    float(onchain_multichain),
        "eth_balance":           eth_balance,
        "tx_count":              tx_count,
        "onchain_score":         round(onchain_score, 2),
    }


# Feature column order — MUST stay stable across train + predict
FEATURE_COLUMNS = [
    "followers",
    "has_1k_followers",
    "has_5k_followers",
    "bio_keyword_match",
    "bio_relevance_score",
    "tweeted_keyword",
    "tweet_keyword_density",
    "has_linked_github",
    "github_has_solidity",
    "github_public_repos",
    "github_activity_score",
    "has_wallet",
    "has_ens",
    "onchain_active_30d",
    "onchain_multichain",
    "eth_balance",
    "tx_count",
    "onchain_score",
]


def to_feature_vector(lead: Dict[str, Any]) -> np.ndarray:
    """Returns a stable 1-D numpy array from the feature dict."""
    feats = extract_features(lead)
    return np.array([feats[col] for col in FEATURE_COLUMNS], dtype=np.float32)


# ── legacy aliases (keep backward compat) ─────────────────────
def extract_numerical_features(lead: Dict[str, Any]) -> Dict[str, float]:
    f = extract_features(lead)
    return {
        "followers":       f["followers"],
        "public_repos":    f["github_public_repos"],
        "activity_count":  f["tx_count"],
        "eth_balance":     f["eth_balance"],
        "bio_relevance":   f["bio_relevance_score"],
        "bio_length":      float(len(lead.get("bio") or "")),
    }


def convert_to_feature_vector(lead: Dict[str, Any]) -> np.ndarray:
    return to_feature_vector(lead)
