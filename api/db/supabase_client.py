# ─────────────────────────────────────────────────────────────
# supabase_client.py
# Single connection point to Supabase and local SQLite fallback.
# All DB reads/writes go through here.
# ─────────────────────────────────────────────────────────────

import os
import sqlite3
import json
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from supabase import create_client, Client
from utils.config import SUPABASE_URL, SUPABASE_KEY
from utils.logger import get_logger

logger = get_logger(__name__)

# ── Singleton client ──────────────────────────────────────────
_client: Optional[Client] = None

def get_client() -> Optional[Client]:
    global _client
    if _client is None:
        if SUPABASE_URL and SUPABASE_KEY:
            try:
                _client = create_client(SUPABASE_URL, SUPABASE_KEY)
                logger.info("Supabase client initialised")
            except Exception as e:
                logger.error(f"Failed to initialise Supabase client: {e}")
        else:
            logger.info("Supabase credentials missing. Local SQLite fallback will be used.")
    return _client


# ── Dual-Mode Database Client ─────────────────────────────────
class DatabaseClient:
    """Class wrapper supporting BOTH Supabase and local SQLite fallback."""
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(DatabaseClient, cls).__new__(cls, *args, **kwargs)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True

        self.use_supabase = False
        self.client = None
        self.sqlite_path = Path("data/lead_gen.db")
        
        # Ensure data directory exists
        self.sqlite_path.parent.mkdir(parents=True, exist_ok=True)

        if SUPABASE_URL and SUPABASE_KEY:
            try:
                self.client = get_client()
                if self.client:
                    # Test connection and table existence
                    self.client.table("leads").select("id").limit(1).execute()
                    self.use_supabase = True
                    logger.info("DatabaseClient: Using Supabase backend.")
            except Exception as e:
                logger.warning(
                    f"DatabaseClient: Supabase connection failed or tables missing: {e}. "
                    f"Falling back to local SQLite at {self.sqlite_path}."
                )

        if not self.use_supabase:
            logger.info(f"DatabaseClient: Initializing local SQLite database at {self.sqlite_path}")
            self._init_sqlite()

    def _init_sqlite(self):
        conn = sqlite3.connect(self.sqlite_path)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS leads (
                id TEXT PRIMARY KEY,
                source TEXT,
                username TEXT UNIQUE,
                name TEXT,
                bio TEXT,
                followers_count INTEGER DEFAULT 0,
                public_repos INTEGER DEFAULT 0,
                tx_count INTEGER DEFAULT 0,
                eth_balance REAL DEFAULT 0.0,
                score REAL DEFAULT 0.0,
                score_breakdown TEXT DEFAULT '{}',
                outreach_status TEXT DEFAULT 'discovered',
                status TEXT DEFAULT 'raw',
                scored_at TEXT,
                last_contacted TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS outreach_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_id TEXT,
                stage TEXT,
                message_body TEXT,
                sent_at TEXT,
                send_after TEXT,
                status TEXT DEFAULT 'sent'
            )
        """)
        conn.commit()
        conn.close()
        self._migrate_sqlite()

    def _migrate_sqlite(self):
        """Safely adds new columns to existing SQLite tables (idempotent)."""
        new_columns = [
            ("leads", "status",          "TEXT DEFAULT 'raw'"),
            ("leads", "scored_at",        "TEXT"),
            ("leads", "raw_data",         "TEXT DEFAULT '{}'"),
            ("leads", "chains_active",    "TEXT DEFAULT '[]'"),
            ("leads", "twitter_handle",   "TEXT"),
            ("leads", "wallet_address",   "TEXT"),
            ("leads", "github_username",  "TEXT"),
            # Fix 3: send_after lets the scheduler respect future send dates
            ("outreach_logs", "send_after", "TEXT"),
        ]
        conn = sqlite3.connect(self.sqlite_path)
        cursor = conn.cursor()
        for table, col, col_def in new_columns:
            try:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}")
            except sqlite3.OperationalError:
                pass   # column already exists — skip
        conn.commit()
        conn.close()

    def _execute_sqlite(self, query: str, params: tuple = (), fetchall: bool = False, fetchone: bool = False, commit: bool = False) -> Any:
        conn = sqlite3.connect(self.sqlite_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        try:
            cursor.execute(query, params)
            if commit:
                conn.commit()
            if fetchall:
                return [dict(row) for row in cursor.fetchall()]
            if fetchone:
                row = cursor.fetchone()
                return dict(row) if row else None
            return None
        except Exception as e:
            logger.error(f"SQLite execute error: {e}")
            raise
        finally:
            conn.close()

    def _clean_sqlite_row(self, row: dict) -> dict:
        if not row:
            return row
        cleaned = dict(row)
        if "score_breakdown" in cleaned and isinstance(cleaned["score_breakdown"], str):
            try:
                cleaned["score_breakdown"] = json.loads(cleaned["score_breakdown"])
            except Exception:
                cleaned["score_breakdown"] = {}
        return cleaned

    def create_lead(self, lead: dict) -> Optional[dict]:
        if self.use_supabase:
            try:
                # Remove mock IDs like tw_... if they are new, so DB auto-generates UUID
                lead_data = lead.copy()
                if "id" in lead_data and any(str(lead_data["id"]).startswith(prefix) for prefix in ["tw_", "gh_", "chain_", "dc_"]):
                    del lead_data["id"]
                response = self.client.table("leads").insert(lead_data).execute()
                return response.data[0] if response.data else None
            except Exception as e:
                if "duplicate" in str(e).lower() or "unique" in str(e).lower():
                    logger.debug(f"DatabaseClient: Duplicate lead skipped in Supabase.")
                    return None
                logger.error(f"DatabaseClient.create_lead Supabase failed: {e}")
                return None
        else:
            lead_id = lead.get("id")
            if not lead_id or any(str(lead_id).startswith(prefix) for prefix in ["tw_", "gh_", "chain_", "dc_"]):
                lead_id = str(uuid.uuid4())

            username = lead.get("username") or lead.get("twitter_handle") or lead.get("wallet_address") or lead_id
            name = lead.get("name") or lead.get("display_name") or username

            breakdown_str = json.dumps(lead.get("score_breakdown", {}))
            query = """
                INSERT INTO leads (
                    id, source, username, name, bio, followers_count,
                    public_repos, tx_count, eth_balance, score,
                    score_breakdown, outreach_status, last_contacted
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            params = (
                lead_id,
                lead.get("source"),
                username,
                name,
                lead.get("bio", ""),
                lead.get("followers_count", 0),
                lead.get("public_repos", 0),
                lead.get("tx_count", 0),
                lead.get("eth_balance", 0.0),
                lead.get("score", 0.0),
                breakdown_str,
                lead.get("outreach_status", "discovered"),
                lead.get("last_contacted")
            )
            try:
                self._execute_sqlite(query, params, commit=True)
                return self.get_lead_by_id(lead_id)
            except sqlite3.IntegrityError:
                logger.debug(f"DatabaseClient.create_lead SQLite: Duplicate lead '{username}' skipped.")
                return None
            except Exception as e:
                logger.error(f"DatabaseClient.create_lead SQLite failed: {e}")
                return None

    def get_leads(self, min_score: float = 0.0) -> list[dict]:
        if self.use_supabase:
            try:
                response = (
                    self.client.table("leads")
                    .select("*")
                    .gte("score", min_score)
                    .order("score", desc=True)
                    .execute()
                )
                return response.data or []
            except Exception as e:
                logger.error(f"DatabaseClient.get_leads Supabase failed: {e}")
                return []
        else:
            query = "SELECT * FROM leads WHERE score >= ? ORDER BY score DESC"
            try:
                rows = self._execute_sqlite(query, (min_score,), fetchall=True)
                return [self._clean_sqlite_row(row) for row in rows]
            except Exception as e:
                logger.error(f"DatabaseClient.get_leads SQLite failed: {e}")
                return []

    def get_lead_by_id(self, lead_id: str) -> Optional[dict]:
        if self.use_supabase:
            try:
                response = (
                    self.client.table("leads")
                    .select("*")
                    .eq("id", lead_id)
                    .execute()
                )
                return response.data[0] if response.data else None
            except Exception as e:
                logger.error(f"DatabaseClient.get_lead_by_id Supabase failed: {e}")
                return None
        else:
            query = "SELECT * FROM leads WHERE id = ?"
            try:
                row = self._execute_sqlite(query, (lead_id,), fetchone=True)
                return self._clean_sqlite_row(row) if row else None
            except Exception as e:
                logger.error(f"DatabaseClient.get_lead_by_id SQLite failed: {e}")
                return None

    def update_lead_score(self, lead_id: str, score: float, breakdown: dict) -> Optional[dict]:
        if self.use_supabase:
            try:
                response = (
                    self.client.table("leads")
                    .update({"score": score, "score_breakdown": breakdown})
                    .eq("id", lead_id)
                    .execute()
                )
                return response.data[0] if response.data else None
            except Exception as e:
                logger.error(f"DatabaseClient.update_lead_score Supabase failed: {e}")
                return None
        else:
            query = "UPDATE leads SET score = ?, score_breakdown = ? WHERE id = ?"
            try:
                self._execute_sqlite(query, (score, json.dumps(breakdown), lead_id), commit=True)
                return self.get_lead_by_id(lead_id)
            except Exception as e:
                logger.error(f"DatabaseClient.update_lead_score SQLite failed: {e}")
                return None

    def update_lead_outreach(self, lead_id: str, status: str, last_contacted: str) -> Optional[dict]:
        if self.use_supabase:
            try:
                response = (
                    self.client.table("leads")
                    .update({"outreach_status": status, "last_contacted": last_contacted})
                    .eq("id", lead_id)
                    .execute()
                )
                return response.data[0] if response.data else None
            except Exception as e:
                logger.error(f"DatabaseClient.update_lead_outreach Supabase failed: {e}")
                return None
        else:
            query = "UPDATE leads SET outreach_status = ?, last_contacted = ? WHERE id = ?"
            try:
                self._execute_sqlite(query, (status, last_contacted, lead_id), commit=True)
                return self.get_lead_by_id(lead_id)
            except Exception as e:
                logger.error(f"DatabaseClient.update_lead_outreach SQLite failed: {e}")
                return None

    def create_outreach_log(self, log_entry: dict) -> Optional[dict]:
        if self.use_supabase:
            try:
                response = (
                    self.client.table("outreach_logs")
                    .insert(log_entry)
                    .execute()
                )
                return response.data[0] if response.data else None
            except Exception as e:
                logger.error(f"DatabaseClient.create_outreach_log Supabase failed: {e}")
                return None
        else:
            # Fix 3: persist send_after so the scheduler can respect it
            query = """
                INSERT INTO outreach_logs
                    (lead_id, stage, message_body, sent_at, send_after, status)
                VALUES (?, ?, ?, ?, ?, ?)
            """
            params = (
                log_entry.get("lead_id"),
                log_entry.get("stage"),
                log_entry.get("message_body"),
                log_entry.get("sent_at"),
                log_entry.get("send_after"),
                log_entry.get("status", "sent"),
            )
            try:
                conn = sqlite3.connect(self.sqlite_path)
                cursor = conn.cursor()
                cursor.execute(query, params)
                inserted_id = cursor.lastrowid
                conn.commit()
                conn.close()
                return self.get_outreach_log_by_id(inserted_id)
            except Exception as e:
                logger.error(f"DatabaseClient.create_outreach_log SQLite failed: {e}")
                return None

    def get_pending_sequences(self, limit: int = 50) -> List[dict]:
        """
        Fix 3: Returns queued outreach log entries whose send_after
        timestamp is <= now, ordered by send_after ascending.
        Only these should be dispatched by the scheduler.
        """
        now = datetime.now(timezone.utc).isoformat()
        if self.use_supabase:
            try:
                response = (
                    self.client.table("outreach_logs")
                    .select("*, leads(*)")
                    .eq("status", "queued")
                    .lte("send_after", now)
                    .order("send_after")
                    .limit(limit)
                    .execute()
                )
                return response.data or []
            except Exception as e:
                logger.error(f"DatabaseClient.get_pending_sequences Supabase failed: {e}")
                return []
        else:
            query = """
                SELECT ol.*, l.twitter_handle, l.username, l.name
                FROM outreach_logs ol
                LEFT JOIN leads l ON l.id = ol.lead_id
                WHERE ol.status = 'queued'
                  AND (ol.send_after IS NULL OR ol.send_after <= ?)
                ORDER BY ol.send_after ASC
                LIMIT ?
            """
            try:
                return self._execute_sqlite(query, (now, limit), fetchall=True)
            except Exception as e:
                logger.error(f"DatabaseClient.get_pending_sequences SQLite failed: {e}")
                return []

    def get_outreach_log_by_id(self, log_id: int) -> Optional[dict]:
        query = "SELECT * FROM outreach_logs WHERE id = ?"
        try:
            return self._execute_sqlite(query, (log_id,), fetchone=True)
        except Exception as e:
            logger.error(f"DatabaseClient.get_outreach_log_by_id SQLite failed: {e}")
            return None

    def get_outreach_logs(self) -> list[dict]:
        if self.use_supabase:
            try:
                response = (
                    self.client.table("outreach_logs")
                    .select("*")
                    .order("sent_at", desc=True)
                    .execute()
                )
                return response.data or []
            except Exception as e:
                logger.error(f"DatabaseClient.get_outreach_logs Supabase failed: {e}")
                return []
        else:
            query = "SELECT * FROM outreach_logs ORDER BY sent_at DESC"
            try:
                return self._execute_sqlite(query, fetchall=True)
            except Exception as e:
                logger.error(f"DatabaseClient.get_outreach_logs SQLite failed: {e}")
                return []

    def update_outreach_log_status(self, log_id: str, status: str) -> Optional[dict]:
        if self.use_supabase:
            try:
                response = (
                    self.client.table("outreach_logs")
                    .update({"status": status})
                    .eq("id", log_id)
                    .execute()
                )
                return response.data[0] if response.data else None
            except Exception as e:
                logger.error(f"DatabaseClient.update_outreach_log_status Supabase failed: {e}")
                return None
        else:
            query = "UPDATE outreach_logs SET status = ? WHERE id = ?"
            try:
                self._execute_sqlite(query, (status, log_id), commit=True)
                return self.get_outreach_log_by_id(int(log_id))
            except Exception as e:
                logger.error(f"DatabaseClient.update_outreach_log_status SQLite failed: {e}")
                return None


# ── Global Wrapper Functions ──────────────────────────────────
# These match the original functions to maintain absolute compatibility.

def insert_lead(lead: dict) -> Optional[dict]:
    db = DatabaseClient()
    return db.create_lead(lead)

def bulk_insert_leads(leads: list[dict]) -> int:
    db = DatabaseClient()
    inserted = 0
    for lead in leads:
        if db.create_lead(lead):
            inserted += 1
    return inserted

def get_leads_by_status(status: str, limit: int = 100) -> list[dict]:
    db = DatabaseClient()
    if db.use_supabase:
        try:
            response = (
                db.client.table("leads")
                .select("*")
                .eq("status", status)
                .limit(limit)
                .execute()
            )
            return response.data or []
        except Exception:
            return []
    else:
        # Query BOTH the new `status` column AND the legacy `outreach_status`
        # column so rows written by either old or new code are returned.
        sql_status_legacy = "discovered" if status == "raw" else status
        query = """
            SELECT * FROM leads
            WHERE status = ? OR outreach_status = ?
            LIMIT ?
        """
        try:
            rows = db._execute_sqlite(
                query, (status, sql_status_legacy, limit), fetchall=True
            )
            return [db._clean_sqlite_row(row) for row in rows]
        except Exception as exc:
            logger.error(f"get_leads_by_status SQLite failed: {exc}")
            return []

def update_lead(lead_id: str, updates: dict) -> Optional[dict]:
    db = DatabaseClient()
    if db.use_supabase:
        try:
            response = (
                db.client.table("leads")
                .update(updates)
                .eq("id", lead_id)
                .execute()
            )
            return response.data[0] if response.data else None
        except Exception:
            return None
    else:
        # Construct update query dynamically
        if not updates:
            return db.get_lead_by_id(lead_id)

        # Known column remappings for SQLite schema compatibility
        _REMAP = {
            "raw_data":        lambda v: json.dumps(v) if isinstance(v, dict) else v,
            "score_breakdown": lambda v: json.dumps(v) if isinstance(v, dict) else v,
            "chains_active":   lambda v: json.dumps(v) if isinstance(v, list)  else v,
        }
        # Columns that don't exist in SQLite — silently skip
        _SKIP_COLS: set = set()

        fields = []
        params = []
        for k, v in updates.items():
            if k in _SKIP_COLS:
                continue
            transform = _REMAP.get(k)
            if transform:
                v = transform(v)
            fields.append(f"{k} = ?")
            params.append(v)

        if not fields:
            return db.get_lead_by_id(lead_id)

        query = f"UPDATE leads SET {', '.join(fields)} WHERE id = ?"
        params.append(lead_id)

        try:
            db._execute_sqlite(query, tuple(params), commit=True)
            return db.get_lead_by_id(lead_id)
        except Exception as exc:
            logger.error(f"update_lead SQLite failed: {exc}")
            return None

def lead_exists(twitter_handle: str = None, wallet_address: str = None, lead_id: str = None) -> bool:
    db = DatabaseClient()
    if db.use_supabase:
        query = db.client.table("leads").select("id")
        if lead_id:
            query = query.eq("id", lead_id)
        elif twitter_handle:
            query = query.eq("twitter_handle", twitter_handle.lower())
        elif wallet_address:
            query = query.eq("wallet_address", wallet_address.lower())
        else:
            return False
        try:
            res = query.execute()
            return len(res.data) > 0
        except Exception:
            return False
    else:
        if lead_id:
            query = "SELECT id FROM leads WHERE id = ?"
            val = lead_id
        elif twitter_handle:
            query = "SELECT id FROM leads WHERE username = ? OR id = ?"
            val = twitter_handle.lower()
        elif wallet_address:
            query = "SELECT id FROM leads WHERE username = ? OR id = ?"
            val = wallet_address.lower()
        else:
            return False
        try:
            if lead_id:
                res = db._execute_sqlite(query, (val,), fetchone=True)
            else:
                res = db._execute_sqlite(query, (val, val), fetchone=True)
            return res is not None
        except Exception:
            return False
