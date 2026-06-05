import pytest
from scoring.features import extract_numerical_features, convert_to_feature_vector
from scoring.rule_scorer import RuleScorer
from scoring.ml_scorer import MLScorer

def test_feature_extraction():
    lead = {
        "followers_count": 5000,
        "public_repos": 10,
        "tx_count": 250,
        "eth_balance": 15.5,
        "bio": "Solidity compiler engineer building automated defi rollups"
    }
    feats = extract_numerical_features(lead)
    assert feats["followers"] == 5000.0
    assert feats["public_repos"] == 10.0
    assert feats["activity_count"] == 250.0
    assert feats["eth_balance"] == 15.5
    assert feats["bio_relevance"] > 0.0

    vec = convert_to_feature_vector(lead)
    assert vec.shape == (18,)

def test_rule_scorer():
    scorer = RuleScorer()
    lead = {
        "followers_count": 1000,
        "public_repos": 5,
        "tx_count": 10,
        "eth_balance": 1.0,
        "bio": "Simple bio with no keywords"
    }
    score, breakdown = scorer.calculate_score(lead)
    assert 0.0 <= score <= 100.0
    assert "_score" in breakdown
    assert "twitter_followers_1k" in breakdown

def test_ml_scorer_fallback():
    scorer = MLScorer()
    lead = {
        "followers_count": 8000,
        "public_repos": 20,
        "tx_count": 500,
        "eth_balance": 50.0,
        "bio": "Solidity Web3 developer building smart systems"
    }
    # Should work cleanly using standard rule-based model fallback even if pickle does not exist yet
    prob, pred_class = scorer.predict_fit_probability(lead)
    assert 0.0 <= prob <= 100.0
    assert pred_class in [0.0, 1.0]
