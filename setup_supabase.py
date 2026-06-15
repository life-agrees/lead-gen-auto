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
DROP TABLE IF EXISTS public.campaigns CASCADE;

-- Enable UUID extension (needed for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT false,
    twitter_keywords TEXT[] DEFAULT '{}'::TEXT[],
    twitter_negative_keywords TEXT[] DEFAULT '{}'::TEXT[],
    watched_contracts JSONB DEFAULT '{}'::JSONB,
    onchain_min_transactions INTEGER DEFAULT 3,
    onchain_active_days INTEGER DEFAULT 7,
    dune_queries JSONB DEFAULT '{}'::JSONB,
    system_persona TEXT,
    trovr_context TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Seeding default active campaign
INSERT INTO public.campaigns (
    name,
    description,
    active,
    twitter_keywords,
    twitter_negative_keywords,
    watched_contracts,
    onchain_min_transactions,
    onchain_active_days,
    dune_queries,
    system_persona,
    trovr_context
) VALUES (
    'Default Web3 Campaign',
    'Targeting prediction markets, Uniswap v4 hook developers, and BSC builders.',
    true,
    ARRAY[
        'just shipped', 'just launched', 'building on', 'testnet', 'mainnet launch',
        'raising funds', 'pre-seed', 'seed round', 'looking for users', 'need users',
        'need liquidity', 'need KOLs', 'need liquidity providers', 'looking for beta testers',
        'growth hacking', 'user acquisition', 'BD', 'business development',
        'prediction market', 'prediction markets', 'event betting', 'sports prediction',
        'Polymarket', 'Azuro', 'Kalshi', 'betting protocol', 'binary market',
        'range market', 'prediction market defi', 'building prediction market',
        'on-chain prediction', 'Uniswap hooks', 'V4 hooks', 'Uniswap V4',
        'hooks builder', 'hook developer', 'liquidity hook', 'building on uniswap v4',
        'uniswap v4 hooks', 'defi hooks', 'DeFi project', 'Web3 project',
        'onchain', 'on-chain', 'liquidity provider', 'LP position', 'adding liquidity',
        'protocol launch', 'smart contract', 'dApp', 'defi primitive',
        'looking for liquidity providers', 'looking for LPs defi',
        'launched on arbitrum defi', 'defi protocol launch', 'permissionless market',
        'anyone recommend', 'can anyone', 'looking for', 'struggling with',
        'need help with', 'recommend a', 'who is building', 'hiring dev',
        'hiring community', 'hiring marketer', 'alpha call', 'community building',
        'partner with', 'collab with', 'integrate with', 'grant', 'grants',
        'accelerator', 'incubated by', 'waitlist', 'early access'
    ],
    ARRAY['airdrop', 'giveaway', 'memecoin', 'scam'],
    '{
        "ethereum": [],
        "polygon": [
            "0xE111180000d2663C0091e4f400237545B87B996B",
            "0xe2222d279d744050d28e00520010520000310F59",
            "0x7A1c3FEf712753374C4DCe34254B96faF2B7265B",
            "0xF9548Be470A4e130c90ceA8b179FCD66D2972AC7"
        ],
        "base": [],
        "arbitrum": [],
        "optimism": [],
        "bsc": [
            "0x10ED43C718714eb63d5aA57B78B54704E256024E",
            "0x13f4EA83D0bd40E75C8222255bc855a974568Dd4",
            "0xf1bE8ecC990cBcb90e166b71E368299f0116d421",
            "0xA625AB01B08ce023B2a342Dbb12a16f2C8489A8F"
        ]
    }'::JSONB,
    3,
    7,
    '{
        "polymarket_active_traders": 7629776,
        "azuro_active_bettors": 7629946,
        "base_contract_deployers": 7630029,
        "uniswap_v4_hook_deployers": null,
        "base_defi_active_wallets": null,
        "pancakeswap_active_traders": 7721847,
        "alpaca_active_users": 7721884,
        "bnb_contract_deployers": 7721893
    }'::JSONB,
    'You are a real person reaching out on Twitter/X — a Web3 builder yourself, reaching out to other builders you''ve noticed in the space. You write the way a thoughtful founder would write in a DM: short, specific, and direct. Never robotic. Never using buzzwords. Never starting with "Hey there!" or "I came across your profile." Every message you write references something real and specific about the person.',
    'You represent Trovr.ai — a Web3 lead intelligence platform that surfaces high-signal builders, founders, and DeFi operators from on-chain activity, GitHub contributions, and social footprints. The offer: 10 free leads sourced from live data, no strings attached.'
);

-- Row Level Security
ALTER TABLE public.leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns     ENABLE ROW LEVEL SECURITY;

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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'campaigns' AND policyname = 'Allow all for anon'
    ) THEN
        CREATE POLICY "Allow all for anon"
            ON public.campaigns FOR ALL
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
    """Verify all tables are accessible via the anon key."""
    headers = {
        "apikey":        SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }

    ok = True
    for table in ("leads", "outreach_logs", "campaigns"):
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
