import sys
import os
import time
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv

# Ensure root folder is on PATH
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from api.routes.leads import run_discovery_and_enrichment_task
from api.db.supabase_client import DatabaseClient
from outreach.sequence_manager import SequenceManager
from outreach.message_generator import LLMMessageGenerator
from outreach.outreach_tracker import OutreachTracker
from utils.logger import get_logger

load_dotenv()
logger = get_logger("CronScheduler")
db = DatabaseClient()
sequence_mgr = SequenceManager()
message_gen = LLMMessageGenerator()
outreach_tracker = OutreachTracker()

def automatic_lead_generation_job():
    """Runs automated scraping, enrichment, and scoring loops."""
    logger.info("CRON: Triggering automated discovery and scoring run...")
    try:
        run_discovery_and_enrichment_task(limit=5)
        logger.info("CRON: Automated lead generation job finished successfully.")
    except Exception as e:
        logger.error(f"CRON: Automated lead generation crashed: {str(e)}")

def automatic_outreach_sequence_job():
    """Checks lead tables for due follow-ups and automatically advances sequences."""
    logger.info("CRON: Checking active lead outreach schedules...")
    try:
        leads = db.get_leads(0.0)
        processed = 0
        for lead in leads:
            next_stage = sequence_mgr.determine_next_stage(lead)
            if next_stage:
                lead_id = lead["id"]
                logger.info(f"CRON: Advancing Lead {lead['username']} to stage: {next_stage}")
                
                # Generate and save the message
                message = message_gen.generate_personalized_message(lead, next_stage)
                outreach_tracker.log_outreach_event(db, lead_id, next_stage, message)
                processed += 1
                
        logger.info(f"CRON: Outreach sequence check finished. Advanced {processed} leads.")
    except Exception as e:
        logger.error(f"CRON: Outreach sequencing job crashed: {str(e)}")

def start_scheduler():
    scheduler = BackgroundScheduler()
    
    # 1. Schedule Lead discovery job to run every 12 hours (720 minutes)
    scheduler.add_job(automatic_lead_generation_job, 'interval', minutes=720, id='lead_gen_job')
    
    # 2. Schedule Follow-up sequence job to run every 6 hours (360 minutes)
    scheduler.add_job(automatic_outreach_sequence_job, 'interval', minutes=360, id='outreach_seq_job')
    
    scheduler.start()
    logger.info("APScheduler Background Thread Started successfully.")
    logger.info("Jobs Scheduled: LeadGen (every 12 hrs), OutreachSeq (every 6 hrs)")

    try:
        while True:
            time.sleep(2)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
        logger.info("Scheduler thread terminated safely.")

if __name__ == "__main__":
    start_scheduler()
