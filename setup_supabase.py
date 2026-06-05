#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
setup_supabase.py
-----------------
Creates the required tables (leads, outreach_logs) in your Supabase
project if they don't already exist.

Run once:
    python setup_supabase.py
"""

import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[ERROR] SUPABASE_URL or SUPABASE_KEY missing in .env")
    sys.exit(1)

# ── SQL migration ─────────────────────────────────────────────
MIGRATION_SQL = """
-- Drop existing tables to start fresh with a clean unified schema
DROP TABLE IF EXISTS public.outreach_logs CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;

-- Enable UUID extension (needed for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- leads table
CREATE TABLE IF NOT EXISTS public.leads (
    id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    source           TEXT NOT NULL,
    username         TEXT UNIQUE,
    name             TEXT,
    display_name     TEXT,
    bio              TEXT,
    followers_count  INTEGER DEFAULT 0,
    follower_count   INTEGER DEFAULT 0,
    public_repos     INTEGER DEFAULT 0,
    tx_count         INTEGER DEFAULT 0,
    eth_balance      DOUBLE PRECISION DEFAULT 0.0,
    score            DOUBLE PRECISION DEFAULT 0.0,
    score_breakdown  JSONB DEFAULT '{}'::JSONB,
    outreach_status  TEXT DEFAULT 'discovered',
    last_contacted   TEXT,
    twitter_handle   TEXT,
    github_username  TEXT,
    wallet_address   TEXT,
    status           TEXT DEFAULT 'raw',
    raw_data         JSONB DEFAULT '{}'::JSONB,
    chains_active    TEXT[] DEFAULT '{}'::TEXT[],
    keywords_matched TEXT[] DEFAULT '{}'::TEXT[],
    influence_ratio  DOUBLE PRECISION DEFAULT 0.0,
    influence_tier   TEXT,
    verified         BOOLEAN DEFAULT false,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- outreach_logs table
CREATE TABLE IF NOT EXISTS public.outreach_logs (
    id            BIGSERIAL PRIMARY KEY,
    lead_id       TEXT REFERENCES public.leads(id) ON DELETE CASCADE,
    stage         TEXT,
    message_body  TEXT,
    sent_at       TEXT,
    status        TEXT DEFAULT 'sent'
);

-- Row Level Security
ALTER TABLE public.leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'leads' AND policyname = 'Allow all for anon'
    ) THEN
        CREATE POLICY "Allow all for anon"
            ON public.leads FOR ALL
            TO anon, authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'outreach_logs' AND policyname = 'Allow all for anon'
    ) THEN
        CREATE POLICY "Allow all for anon"
            ON public.outreach_logs FOR ALL
            TO anon, authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
"""

def run_migration():
    """Execute migration SQL via Supabase REST API."""
    headers = {
        "apikey":        SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type":  "application/json",
    }

    # Try exec_sql RPC
    sql_endpoint = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    try:
        resp = requests.post(
            sql_endpoint,
            headers=headers,
            json={"sql": MIGRATION_SQL},
            timeout=30,
        )
        if resp.status_code in (200, 201, 204):
            print("[OK] Migration applied via exec_sql RPC.")
            return True
    except Exception as e:
        print(f"[WARN] exec_sql attempt failed: {e}")

    # Print SQL for manual execution
    print("[WARN] Could not auto-apply migration via RPC.")
    print("       Please run the SQL below in your Supabase SQL Editor:")
    print(f"       https://supabase.com/dashboard/project/mradkzyhorutefopiisl/sql/new")
    print()
    print("=" * 60)
    print(MIGRATION_SQL)
    print("=" * 60)
    return False


def verify_tables():
    """Verify both tables are accessible via the anon key."""
    headers = {
        "apikey":        SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }

    ok = True
    for table in ("leads", "outreach_logs"):
        try:
            resp = requests.get(
                f"{SUPABASE_URL}/rest/v1/{table}?limit=1",
                headers=headers,
                timeout=10,
            )
            if resp.status_code == 200:
                print(f"  [OK] Table '{table}' is accessible.")
            else:
                print(f"  [FAIL] Table '{table}': HTTP {resp.status_code} -- {resp.text[:120]}")
                ok = False
        except Exception as e:
            print(f"  [ERROR] Could not check table '{table}': {e}")
            ok = False
    return ok


if __name__ == "__main__":
    print("Supabase Table Setup")
    print(f"Project: {SUPABASE_URL}")
    print()

    print("-- Step 1: Attempting migration ----")
    run_migration()

    print()
    print("-- Step 2: Verifying tables --------")
    if verify_tables():
        print()
        print("[DONE] Supabase is ready! The pipeline will now store leads in the cloud.")
    else:
        print()
        print("[ACTION REQUIRED]")
        print("  1. Open: https://supabase.com/dashboard/project/mradkzyhorutefopiisl/sql/new")
        print("  2. Paste the SQL printed above and click Run")
        print("  3. Re-run this script to verify: python setup_supabase.py")
