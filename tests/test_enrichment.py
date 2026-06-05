import pytest
from unittest.mock import patch, MagicMock
from enrichment.twitter_enricher import enrich_twitter_lead
from enrichment.github_enricher import enrich_github
from enrichment.onchain_enricher import enrich_onchain
from enrichment.enricher_pipeline import run_enrichment_pipeline, EnricherPipeline
from utils.constants import LeadStatus

@patch("tweepy.Client")
def test_twitter_enrichment(mock_tweepy_client):
    # Setup mock user and tweet data
    mock_client_instance = MagicMock()
    mock_tweepy_client.return_value = mock_client_instance
    
    # Mock user response
    mock_user = MagicMock()
    mock_user.id = 12345
    mock_user.description = "Solidity developer. building DeFi. contact at alice.eth"
    mock_user.public_metrics = {
        "followers_count": 1200,
        "following_count": 300,
        "tweet_count": 150,
        "listed_count": 5
    }
    mock_user.location = "EVM Space"
    mock_user.created_at = None
    
    mock_user_resp = MagicMock()
    mock_user_resp.data = mock_user
    mock_client_instance.get_user.return_value = mock_user_resp
    
    # Mock tweets response
    mock_tweet1 = MagicMock()
    mock_tweet1.text = "Just launched a new Solidity contract: 0x1111111111111111111111111111111111111111"
    mock_tweet1.created_at = None
    mock_tweet1.public_metrics = {"like_count": 10, "retweet_count": 2}
    
    mock_tweets_resp = MagicMock()
    mock_tweets_resp.data = [mock_tweet1]
    mock_client_instance.get_users_tweets.return_value = mock_tweets_resp
    
    # Lead to enrich
    lead = {
        "twitter_handle": "alice_dev",
        "raw_data": {}
    }
    
    updates = enrich_twitter_lead(lead)
    
    assert updates["status"] == LeadStatus.ENRICHED
    assert updates["follower_count"] == 1200
    assert "alice.eth" in updates["raw_data"]["extracted_ens"]
    # Verify wallet address extraction from tweets
    assert updates["wallet_address"] == "0x1111111111111111111111111111111111111111"


@patch("requests.get")
def test_github_enrichment(mock_requests_get):
    # Mock profile and repos responses
    mock_profile_resp = MagicMock()
    mock_profile_resp.status_code = 200
    mock_profile_resp.json.return_value = {
        "login": "bob_builder",
        "bio": "Solidity/Rust dev",
        "company": "EVM Labs",
        "location": "Remote",
        "followers": 55,
        "public_repos": 12,
        "blog": "https://bob.dev"
    }
    
    mock_repos_resp = MagicMock()
    mock_repos_resp.status_code = 200
    mock_repos_resp.json.return_value = [
        {"name": "defi-vaults", "language": "Solidity"},
        {"name": "rust-client", "language": "Rust"}
    ]
    
    # Route request mock calls based on URL
    def side_effect(url, *args, **kwargs):
        if "repos" in url:
            return mock_repos_resp
        return mock_profile_resp
        
    mock_requests_get.side_effect = side_effect
    
    result = enrich_github("bob_builder")
    
    assert result["github_username"] == "bob_builder"
    assert result["github_company"] == "EVM Labs"
    assert result["has_solidity"] is True
    assert "Solidity" in result["github_languages"]
    assert "Rust" in result["github_languages"]
    assert result["github_website"] == "https://bob.dev"


@patch("enrichment.onchain_enricher.get_web3")
def test_onchain_enrichment(mock_get_web3):
    mock_w3 = MagicMock()
    mock_get_web3.return_value = mock_w3
    
    # Mock ENS name
    mock_w3.ens.name.return_value = "charlie.eth"
    # Mock tx count
    mock_w3.eth.get_transaction_count.return_value = 42
    # Mock latest block
    mock_w3.eth.block_number = 100000
    
    # Mock logs to simulate watched contract interaction
    mock_log = MagicMock()
    mock_log.transactionHash = b"txhash"
    mock_w3.eth.get_logs.return_value = [mock_log]
    
    # Mock transaction details
    mock_tx = {"from": "0x2222222222222222222222222222222222222222"}
    mock_w3.eth.get_transaction.return_value = mock_tx
    
    wallet = "0x2222222222222222222222222222222222222222"
    result = enrich_onchain(wallet)
    
    assert result["ens_name"] == "charlie.eth"
    assert "ethereum" in result["chains_active"]
    assert result["onchain_tx_counts"]["ethereum"] == 42
    assert result["watched_contract_hit"] is True


@patch("enrichment.enricher_pipeline.get_leads_by_status")
@patch("enrichment.enricher_pipeline.update_lead")
@patch("enrichment.enricher_pipeline.enrich_twitter_lead")
@patch("enrichment.enricher_pipeline.enrich_github")
@patch("enrichment.enricher_pipeline.enrich_onchain")
def test_enrichment_pipeline(mock_onchain, mock_github, mock_twitter, mock_update, mock_get_leads):
    # Mock data
    mock_get_leads.return_value = [
        {
            "id": "lead_uuid_1",
            "source": "twitter",
            "twitter_handle": "alice_dev",
            "wallet_address": None,
            "raw_data": {}
        }
    ]
    
    mock_twitter.return_value = {
        "bio": "Building on Ethereum",
        "follower_count": 100,
        "wallet_address": "0x1111111111111111111111111111111111111111",
        "raw_data": {
            "github_username": "alice_github"
        },
        "status": LeadStatus.ENRICHED
    }
    
    mock_github.return_value = {
        "github_followers": 20,
        "has_solidity": True
    }
    
    mock_onchain.return_value = {
        "chains_active": ["ethereum"],
        "watched_contract_hit": False
    }
    
    # Run pipeline
    count = run_enrichment_pipeline(batch_size=1)
    
    assert count == 1
    # Verify update_lead was called with merged data
    mock_update.assert_called_once()
    args, kwargs = mock_update.call_args
    assert args[0] == "lead_uuid_1"
    
    updates = args[1]
    assert updates["status"] == LeadStatus.ENRICHED
    assert updates["wallet_address"] == "0x1111111111111111111111111111111111111111"
    assert updates["raw_data"]["github_followers"] == 20
    assert updates["raw_data"]["has_solidity"] is True
    assert updates["raw_data"]["chains_active"] == ["ethereum"]
