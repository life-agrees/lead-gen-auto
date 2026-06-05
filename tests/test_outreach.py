import pytest
from datetime import datetime, timezone, timedelta
from outreach.sequence_manager import SequenceManager
from outreach.message_generator import LLMMessageGenerator
from outreach.outreach_tracker import OutreachTracker

def test_sequence_manager_cadences():
    mgr = SequenceManager()
    
    # 1. New lead should trigger day_1_pitch (must have score >= 35)
    lead1 = {"outreach_status": "discovered", "score": 80}
    res = mgr.determine_next_stage(lead1)
    assert res is not None
    assert res.stage == "day_1_pitch"
    assert res.send_immediately is True

    # 2. Sent pitch recently (0 days) should queue day_3_followup (send_immediately=False)
    now = datetime.now(timezone.utc).isoformat()
    lead2 = {"outreach_status": "day_1_pitch", "last_contacted": now, "score": 80}
    res = mgr.determine_next_stage(lead2)
    assert res is not None
    assert res.stage == "day_3_followup"
    assert res.send_immediately is False

    # 3. Sent pitch 4 days ago should trigger day_3_followup
    four_days_ago = (datetime.now(timezone.utc) - timedelta(days=4)).isoformat()
    lead3 = {"outreach_status": "day_1_pitch", "last_contacted": four_days_ago, "score": 80}
    res = mgr.determine_next_stage(lead3)
    assert res is not None
    assert res.stage == "day_3_followup"
    assert res.send_immediately is True

    # 4. Sent follow up 5 days ago should trigger day_7_breakup
    five_days_ago = (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()
    lead4 = {"outreach_status": "day_3_followup", "last_contacted": five_days_ago, "score": 80}
    res = mgr.determine_next_stage(lead4)
    assert res is not None
    assert res.stage == "day_7_breakup"
    assert res.send_immediately is True

def test_llm_message_generator_templated_mock():
    gen = LLMMessageGenerator()
    gen.provider = "mock"  # Explicitly force mock for this test
    lead = {
        "name": "Bob",
        "source": "github",
        "username": "bob_builder",
        "repo_contributed": "solidity-contracts",
        "bio": "Deploying EVM state machines."
    }
    
    # Verify templates
    pitch = gen.generate_personalized_message(lead, "day_1_pitch")
    assert "Deploying EVM state machines" in pitch
    assert "free leads" in pitch.lower() or "trenchybet" in pitch.lower()

    followup = gen.generate_personalized_message(lead, "day_3_followup")
    assert "Bob" in followup
    assert "workflow" in followup or "smart contracts" in followup or "bump" in followup.lower() or "leads" in followup.lower()


def test_outreach_pipeline_dry_run():
    from outreach.outreach_pipeline import OutreachPipeline
    pipeline = OutreachPipeline(provider="mock")
    # Even if database is empty, the pipeline run should complete successfully returning stats
    stats = pipeline.run(min_score=70.0, batch_size=5, dry_run=True)
    assert "total_leads" in stats
    assert "processed" in stats

