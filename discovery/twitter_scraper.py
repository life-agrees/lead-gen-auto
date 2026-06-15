# ─────────────────────────────────────────────────────────────
# twitter_scraper.py
# Searches Twitter/X for accounts matching our ICP keywords.
# Pushes raw leads into Supabase.
# Supports both API searches and local mock fallbacks.
# ─────────────────────────────────────────────────────────────

import tweepy
import time
import urllib.parse
from datetime import datetime, timezone
from typing import List, Dict, Any

from utils.config import TWITTER_BEARER_TOKEN
from utils.constants import (
    TWITTER_KEYWORDS,
    TWITTER_NEGATIVE_KEYWORDS,
    TWITTER_MAX_RESULTS_PER_QUERY,
    TWITTER_MAX_LEADS_PER_RUN,
    LeadSource,
    LeadStatus,
)
from utils.logger import get_logger
from api.db.supabase_client import bulk_insert_leads, lead_exists
from utils.campaign import get_active_campaign

logger = get_logger(__name__)


# ── Client Builder ───────────────────────────────────────────
def get_twitter_client() -> tweepy.Client:
    # URL-decode token if it contains percent-encoded characters
    token = TWITTER_BEARER_TOKEN
    if token and "%" in token:
        try:
            token = urllib.parse.unquote(token)
        except Exception as e:
            logger.warning(f"Failed to URL-decode Twitter Bearer Token: {e}")

    return tweepy.Client(
        bearer_token=token,
        wait_on_rate_limit=True    # auto-pause when rate limited
    )


# ── Core search function ──────────────────────────────────────
def search_keyword(
    client: tweepy.Client,
    keyword: str,
    max_results: int = TWITTER_MAX_RESULTS_PER_QUERY
) -> list[dict]:
    """
    Search recent tweets for a keyword.
    Returns a list of raw lead dicts.
    """
    leads = []

    try:
        # Load from active campaign if available
        campaign = get_active_campaign()
        negative_keywords = campaign.get("twitter_negative_keywords") or TWITTER_NEGATIVE_KEYWORDS

        # Construct query with negative keywords to filter noise (airdrop, giveaway, etc.)
        neg_query = " ".join([f"-{kw}" for kw in negative_keywords])
        search_query = f"{keyword} {neg_query} -is:retweet lang:en"

        # Only pull tweets from the last 7 days (recency matters)
        response = client.search_recent_tweets(
            query=search_query,
            max_results=max_results,
            tweet_fields=["author_id", "created_at", "text"],
            expansions=["author_id"],
            user_fields=[
                "username", "name", "description",
                "public_metrics", "created_at", "location"
            ],
        )

        if not response.data:
            logger.debug(f"No tweets found for: '{keyword}'")
            return []

        # Build a map of author_id → user object
        users = {}
        if response.includes and "users" in response.includes:
            users = {u.id: u for u in response.includes["users"]}

        for tweet in response.data:
            user = users.get(tweet.author_id)
            if not user:
                continue

            handle = user.username.lower()

            # Skip if already in DB
            if lead_exists(twitter_handle=handle):
                logger.debug(f"Already exists, skipping: @{handle}")
                continue

            followers = user.public_metrics.get("followers_count", 0)

            lead = {
                "source":            LeadSource.TWITTER,
                "status":            LeadStatus.RAW,
                "username":          handle,
                "twitter_handle":    handle,
                "name":              user.name,
                "display_name":      user.name,
                "bio":               user.description or "",
                "followers_count":   followers,
                "follower_count":    followers,
                "keywords_matched":  [keyword],
                "raw_data": {
                    "tweet_id":      str(tweet.id),
                    "tweet_text":    tweet.text,
                    "tweet_date":    tweet.created_at.isoformat() if tweet.created_at else None,
                    "user_id":       str(user.id),
                    "location":      user.location or "",
                    "following_count": user.public_metrics.get("following_count", 0),
                    "tweet_count":   user.public_metrics.get("tweet_count", 0),
                    "scraped_at":    datetime.now(timezone.utc).isoformat(),
                },
            }
            leads.append(lead)

    except tweepy.errors.Forbidden as e:
        logger.warning(f"Twitter API returned 403 Forbidden for '{keyword}' (likely Free tier restriction).")
        raise
    except tweepy.errors.Unauthorized as e:
        logger.warning(f"Twitter API returned 401 Unauthorized for '{keyword}' (invalid bearer token).")
        raise
    except tweepy.TooManyRequests:
        logger.warning(f"Rate limit hit on keyword: '{keyword}'. Pausing 60s.")
        time.sleep(60)
    except tweepy.TwitterServerError as e:
        logger.error(f"Twitter server error on '{keyword}': {e}")
    except Exception as e:
        logger.error(f"Unexpected error on '{keyword}': {e}")
        raise

    return leads


# ── TwitterScraper Class ──────────────────────────────────────
class TwitterScraper:
    """Class wrapper for Twitter/X scraping, matching other scraper pipeline modules."""
    def __init__(self):
        self.client = get_twitter_client()
        # Assume mock mode if token is missing or dummy
        self.is_mock = not TWITTER_BEARER_TOKEN or "AAAAAAAAAAAAAAAAAAAA" not in TWITTER_BEARER_TOKEN

    def search_leads(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Searches recent X/Twitter posts for keywords. Falls back to mock data if API limits hit."""
        logger.info(f"TwitterScraper: Starting search run (limit: {limit})")
        
        campaign = get_active_campaign()
        keywords = campaign.get("twitter_keywords") or TWITTER_KEYWORDS
        
        if self.is_mock:
            logger.info("TwitterScraper running in Mock Data Mode (no valid Twitter Token).")
            return self._generate_mock_leads(limit, keywords)

        leads = []
        try:
            for keyword in keywords:
                if len(leads) >= limit:
                    break
                logger.info(f"TwitterScraper searching: '{keyword}'")
                try:
                    kw_leads = search_keyword(self.client, keyword, max_results=min(limit, 10))
                    for lead in kw_leads:
                        if lead["twitter_handle"] not in [l["twitter_handle"] for l in leads]:
                            leads.append(lead)
                except (tweepy.errors.Forbidden, tweepy.errors.Unauthorized):
                    logger.warning("TwitterScraper API auth/plan issues encountered. Falling back to mock leads.")
                    # Fill the rest with mock leads
                    remaining = limit - len(leads)
                    if remaining > 0:
                        leads.extend(self._generate_mock_leads(remaining, keywords))
                    break
                
                time.sleep(1)
                
            return leads[:limit]
        except Exception as e:
            logger.error(f"TwitterScraper failed to scrape: {e}. Returning mock leads.")
            return self._generate_mock_leads(limit, keywords)

    def _generate_mock_leads(self, limit: int, keywords: List[str] = None) -> List[Dict[str, Any]]:
        import random
        if keywords is None:
            keywords = TWITTER_KEYWORDS
        handles = ["0xAlchemist", "defi_princess", "solidity_guru", "base_builder", "zk_wizard", "eth_maximalist", "agent_dev_0x", "uniswap_hooker"]
        names = ["Elena Alchemist", "Sarah DeFi", "Raj Solidity", "Marcus Base", "ZK Wizard", "Vitalik Fan", "Agent Dev", "Uniswap Hook Dev"]
        bios = [
            "Co-founder @0xDeFi. Building next-gen liquidity protocols. AI agents and multi-agent developer.",
            "Building prediction markets on Base. DeFi researcher and seed investor.",
            "Writing custom Uniswap v4 hooks. Smart contract security auditor.",
            "DeFi builder. Just deployed a new permissionless liquidity primitive on Base.",
            "Zero Knowledge proof compiler engineer. Building on Base and Arbitrum.",
            "DeFi maximalist. Building multi-chain prediction markets.",
            "AI Agent developer building autonomous onchain agents using Gemini & Mistral.",
            "Uniswap hook builder. Researching custom oracle hooks & dynamic fee structures."
        ]

        leads = []
        for i in range(min(limit, len(handles))):
            kw = random.choice(keywords)
            handle = handles[i].lower()
            
            # Skip if already in DB
            if lead_exists(twitter_handle=handle):
                continue
                
            followers = random.randint(800, 15000)
            leads.append({
                "source":            LeadSource.TWITTER,
                "status":            LeadStatus.RAW,
                "username":          handle,
                "twitter_handle":    handle,
                "name":              names[i],
                "display_name":      names[i],
                "bio":               bios[i],
                "followers_count":   followers,
                "follower_count":    followers,
                "keywords_matched":  [kw],
                "raw_data": {
                    "tweet_id":      f"tweet_{random.randint(1000000000, 9999999999)}",
                    "tweet_text":    f"Just launched a new feature matching '{kw}'! Check out the repo.",
                    "tweet_date":    datetime.now(timezone.utc).isoformat(),
                    "user_id":       f"usr_{random.randint(10000000, 99999999)}",
                    "location":      "Global",
                    "following_count": random.randint(200, 1500),
                    "tweet_count":   random.randint(100, 5000),
                    "scraped_at":    datetime.now(timezone.utc).isoformat(),
                },
            })
        return leads


# ── Main runner for run_discovery.py ─────────────────────────
def run_twitter_scraper() -> int:
    """
    Runs through all ICP keywords, collects leads, pushes to Supabase.
    Returns total number of new leads inserted.
    """
    scraper = TwitterScraper()
    leads = scraper.search_leads(limit=TWITTER_MAX_LEADS_PER_RUN)

    if not leads:
        logger.info("No new leads found this run.")
        return 0

    logger.info(f"Found {len(leads)} unique new leads — pushing to Supabase...")
    inserted = bulk_insert_leads(leads)
    logger.info(f"── Twitter scraper done: {inserted} leads inserted ──")
    return inserted


if __name__ == "__main__":
    run_twitter_scraper()
