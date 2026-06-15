import pytest
from unittest.mock import patch
from discovery.twitter_scraper import TwitterScraper
from discovery.github_scraper import GitHubScraper
from discovery.onchain_scanner import OnchainScanner
from discovery.discord_monitor import DiscordMonitor

def test_twitter_scraper_mock():
    scraper = TwitterScraper()
    leads = scraper.search_leads(limit=2)
    assert len(leads) <= 2
    for lead in leads:
        assert lead["source"] == "twitter"
        assert "username" in lead
        assert "bio" in lead
        assert "followers_count" in lead

def test_github_scraper_mock():
    scraper = GitHubScraper()
    leads = scraper.search_active_contributors(limit=2)
    assert len(leads) <= 2
    for lead in leads:
        assert lead["source"] == "github"
        assert "username" in lead
        assert "repo_contributed" in lead

@patch("discovery.onchain_scanner.scan_contract_interactions")
def test_onchain_scanner_mock(mock_scan):
    mock_scan.return_value = ["0x1234567890123456789012345678901234567890"]
    scanner = OnchainScanner()
    leads = scanner.scan_active_wallets(limit=2)
    assert len(leads) <= 2
    for lead in leads:
        assert lead["source"] in ("onchain", "dune")
        assert lead["wallet_address"].startswith("0x")
        assert lead["tx_count"] >= 0

def test_discord_monitor_mock():
    monitor = DiscordMonitor()
    leads = monitor.listen_keywords(limit=2)
    assert len(leads) <= 2
    for lead in leads:
        assert lead["source"] == "discord"
        assert "message_content" in lead
        assert "discord_id" in lead
