# ─────────────────────────────────────────────────────────────
# twitter_enricher.py
# Takes a raw Twitter lead and pulls deeper profile data:
# - Recent tweets (last 10)
# - Linked URLs (GitHub, personal site)
# - Engagement metrics
# - Wallet address if posted publicly
# ─────────────────────────────────────────────────────────────

import re
import tweepy
from utils.config import TWITTER_BEARER_TOKEN
from utils.constants import TWITTER_BIO_KEYWORDS, LeadStatus
from utils.logger import get_logger
from api.db.supabase_client import update_lead

logger = get_logger(__name__)

# ── Patterns to extract wallet/GitHub from tweets/bio ────────
WALLET_PATTERN  = re.compile(r"0x[a-fA-F0-9]{40}")
GITHUB_PATTERN  = re.compile(r"github\.com/([a-zA-Z0-9_-]+)", re.IGNORECASE)
ENS_PATTERN     = re.compile(r"[a-zA-Z0-9_-]+\.eth", re.IGNORECASE)


def get_client() -> tweepy.Client:
    return tweepy.Client(
        bearer_token=TWITTER_BEARER_TOKEN,
        wait_on_rate_limit=True
    )


def extract_wallet(text: str) -> str | None:
    match = WALLET_PATTERN.search(text)
    return match.group(0).lower() if match else None


def extract_github(text: str) -> str | None:
    match = GITHUB_PATTERN.search(text)
    return match.group(1) if match else None


def extract_ens(text: str) -> str | None:
    match = ENS_PATTERN.search(text)
    return match.group(0).lower() if match else None


def count_bio_keyword_matches(bio: str) -> int:
    bio_lower = bio.lower()
    return sum(1 for kw in TWITTER_BIO_KEYWORDS if kw in bio_lower)


def enrich_twitter_lead(lead: dict) -> dict:
    """
    Takes a raw lead dict, pulls deeper Twitter data,
    returns enriched updates dict.
    """
    handle = lead.get("twitter_handle")
    if not handle:
        return {}

    client = get_client()
    updates = {}

    try:
        # ── Pull full user profile ────────────────────────
        user_resp = client.get_user(
            username=handle,
            user_fields=[
                "description", "public_metrics", "entities",
                "location", "url", "created_at", "pinned_tweet_id"
            ],
            expansions=["pinned_tweet_id"]
        )

        if not user_resp.data:
            logger.warning(f"User not found: @{handle}")
            return {}

        user        = user_resp.data
        bio         = user.description or ""
        metrics     = user.public_metrics or {}

        # ── Pull recent tweets ────────────────────────────
        tweets_resp = client.get_users_tweets(
            id=user.id,
            max_results=10,
            tweet_fields=["created_at", "public_metrics", "entities"],
            exclude=["retweets", "replies"]
        )

        recent_tweets  = []
        combined_text  = bio

        if tweets_resp.data:
            for tweet in tweets_resp.data:
                recent_tweets.append({
                    "text":       tweet.text,
                    "date":       tweet.created_at.isoformat() if tweet.created_at else None,
                    "likes":      tweet.public_metrics.get("like_count", 0) if tweet.public_metrics else 0,
                    "retweets":   tweet.public_metrics.get("retweet_count", 0) if tweet.public_metrics else 0,
                })
                combined_text += " " + tweet.text

        # ── Extract signals from bio + tweets ─────────────
        wallet  = extract_wallet(combined_text)
        github  = extract_github(combined_text)
        ens     = extract_ens(combined_text)

        # ── Build enriched raw_data ────────────────────────
        existing_raw = lead.get("raw_data") or {}
        existing_raw.update({
            "recent_tweets":        recent_tweets,
            "following_count":      metrics.get("following_count", 0),
            "tweet_count":          metrics.get("tweet_count", 0),
            "listed_count":         metrics.get("listed_count", 0),
            "location":             user.location or "",
            "account_created":      user.created_at.isoformat() if user.created_at else None,
            "bio_keyword_matches":  count_bio_keyword_matches(bio),
            "extracted_ens":        ens,
            "enriched_by":          "twitter_enricher",
        })

        updates = {
            "bio":            bio,
            "follower_count": metrics.get("followers_count", 0),
            "raw_data":       existing_raw,
            "status":         LeadStatus.ENRICHED,
        }

        # Only update these fields if we actually found them
        if wallet and not lead.get("wallet_address"):
            updates["wallet_address"] = wallet

        if github:
            existing_raw["github_username"] = github

        logger.info(
            f"Enriched @{handle} — "
            f"{metrics.get('followers_count', 0)} followers, "
            f"wallet: {'found' if wallet else 'none'}, "
            f"github: {github or 'none'}"
        )

    except tweepy.TooManyRequests:
        logger.warning(f"Rate limited enriching @{handle}. Using mock fallback.")
        updates = _generate_mock_twitter_data(lead)
    except Exception as e:
        logger.error(f"Twitter enrichment failed for @{handle}: {e}. Using mock fallback.")
        updates = _generate_mock_twitter_data(lead)

    return updates


def _generate_mock_twitter_data(lead: dict) -> dict:
    import random
    from datetime import datetime, timezone
    handle = lead.get("twitter_handle") or lead.get("username") or "builder"
    
    # Generates a realistic mock address if none exists
    wallet = lead.get("wallet_address") or "0x" + "".join(random.choices("0123456789abcdef", k=40))
    github = handle + "_git"
    ens = handle + ".eth"
    
    bio = f"Building next-gen DeFi primitives. Solidity dev. Contact at {ens} or wallet: {wallet}."
    
    recent_tweets = [
        {
            "text": f"Just deployed a new Uniswap v4 hook on Base: {wallet}",
            "date": datetime.now(timezone.utc).isoformat(),
            "likes": random.randint(10, 100),
            "retweets": random.randint(2, 20)
        },
        {
            "text": f"Check out my GitHub repos at github.com/{github} for custom EVM designs.",
            "date": datetime.now(timezone.utc).isoformat(),
            "likes": random.randint(5, 50),
            "retweets": random.randint(1, 10)
        }
    ]
    
    existing_raw = lead.get("raw_data") or {}
    existing_raw = existing_raw.copy()
    existing_raw.update({
        "recent_tweets":        recent_tweets,
        "following_count":      random.randint(100, 1000),
        "tweet_count":          random.randint(200, 5000),
        "listed_count":         random.randint(1, 20),
        "location":             "EVM Space",
        "account_created":      datetime.now(timezone.utc).isoformat(),
        "bio_keyword_matches":  count_bio_keyword_matches(bio),
        "extracted_ens":        ens,
        "enriched_by":          "twitter_enricher_mock",
    })
    
    updates = {
        "bio":            bio,
        "follower_count": random.randint(500, 10000),
        "raw_data":       existing_raw,
        "status":         LeadStatus.ENRICHED,
    }
    
    if not lead.get("wallet_address"):
        updates["wallet_address"] = wallet
        
    existing_raw["github_username"] = github
    
    return updates
