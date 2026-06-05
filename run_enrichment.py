# run_enrichment.py
# Usage: python run_enrichment.py

from utils.logger import get_logger
from enrichment.enricher_pipeline import run_enrichment_pipeline

logger = get_logger("run_enrichment")

if __name__ == "__main__":
    run_enrichment_pipeline(batch_size=50)
