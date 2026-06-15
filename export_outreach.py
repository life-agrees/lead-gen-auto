"""
export_outreach.py
------------------
Exports outreach log from Supabase to outreach_queue.csv.

By default exports ALL rows (any status/step) so you always get data.
Pass --queued-only to restrict to status=queued, sequence_step=1.

Usage:
    python export_outreach.py
    python export_outreach.py --queued-only
"""

import csv
import sys
from api.db.supabase_client import get_client
from utils.logger import get_logger

logger = get_logger("export_outreach")


def export_to_csv(output_file: str = "outreach_queue.csv", queued_only: bool = False) -> None:
    client = get_client()

    query = (
        client.table("outreach_logs")
        .select("*, leads(twitter_handle, display_name, score, score_tier, bio)")
        .order("sent_at")
    )

    if queued_only:
        query = query.eq("status", "queued")

    response = query.execute()
    rows = response.data or []

    if not rows:
        logger.info("No rows found -- nothing to export.")
        print("\n[!] No rows found in outreach_logs.")
        return

    # utf-8-sig adds the BOM so Excel/Sheets auto-detects encoding correctly
    with open(output_file, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow([
            "Twitter Handle",
            "Display Name",
            "Score",
            "Tier",
            "Bio (first 100 chars)",
            "Message",
            "Outreach ID",
            "Stage",
            "Status",
            "Sent At",
        ])

        for row in rows:
            lead = row.get("leads") or {}
            writer.writerow([
                lead.get("twitter_handle", ""),
                lead.get("display_name", ""),
                lead.get("score", ""),
                lead.get("score_tier", ""),
                (lead.get("bio") or "")[:100],
                row.get("message_body", ""),
                row.get("id", ""),
                row.get("stage", ""),
                row.get("status", ""),
                row.get("sent_at", ""),
            ])

    logger.info(f"Exported {len(rows)} rows -> {output_file}")
    print(f"\n[OK] Exported {len(rows)} rows to {output_file}")
    print("     Open in Google Sheets: File -> Import -> Upload -> select the CSV")


if __name__ == "__main__":
    queued_only = "--queued-only" in sys.argv
    export_to_csv(queued_only=queued_only)
