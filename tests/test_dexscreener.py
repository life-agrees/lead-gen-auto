import pytest
from discovery.dexscreener_scraper import DexScreenerScraper

def test_dexscreener_scraper():
    scraper = DexScreenerScraper()
    leads = scraper.search_leads(limit=2)
    assert len(leads) <= 2
    for lead in leads:
        assert lead["source"] == "dexscreener"
        assert "username" in lead
        assert "bio" in lead
        assert "followers_count" in lead
        assert "public_repos" in lead
        assert "tx_count" in lead
        assert "eth_balance" in lead
        assert lead["id"].startswith("dex_")
