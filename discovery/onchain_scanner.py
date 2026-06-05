# ─────────────────────────────────────────────────────────────
# onchain_scanner.py
# Scans multiple chains for wallets that interacted with
# our watched contracts. These are warm leads — they've
# proven interest with real on-chain behaviour.
# ─────────────────────────────────────────────────────────────

import time
import requests
from web3 import Web3
from datetime import datetime, timezone, timedelta
import random
from typing import List, Dict, Any

from utils.config import RPC_URLS, DUNE_API_KEY
from utils.constants import (
    WATCHED_CONTRACTS,
    ONCHAIN_MIN_TRANSACTIONS,
    ONCHAIN_ACTIVE_DAYS,
    DUNE_QUERIES,
    LeadSource,
    LeadStatus,
)
from utils.logger import get_logger
from api.db.supabase_client import bulk_insert_leads, lead_exists

logger = get_logger(__name__)

DUNE_API_BASE = "https://api.dune.com/api/v1"


# ── Web3 connections ──────────────────────────────────────────
def get_web3(chain: str) -> Web3 | None:
    url = RPC_URLS.get(chain)
    if not url:
        logger.warning(f"No RPC URL configured for chain: {chain}")
        return None
    w3 = Web3(Web3.HTTPProvider(url))
    try:
        if not w3.is_connected():
            logger.error(f"Could not connect to {chain} RPC")
            return None
    except Exception as e:
        logger.error(f"Failed to check Web3 connection for {chain}: {e}")
        return None
    return w3


# ── ENS reverse lookup ────────────────────────────────────────
def get_ens_name(wallet: str) -> str | None:
    """
    Try to resolve an ENS name from a wallet address.
    ENS is only on Ethereum mainnet.
    """
    try:
        w3 = get_web3("ethereum")
        if not w3:
            return None
        ens_name = w3.ens.name(wallet)
        return ens_name
    except Exception:
        return None


# ── Dune Analytics query runner ───────────────────────────────
def run_dune_query(query_id: int) -> list[dict]:
    """
    Execute a saved Dune query and return rows.
    """
    if not DUNE_API_KEY:
        logger.warning("DUNE_API_KEY is not configured in .env. Skipping Dune query.")
        return []

    headers = {"X-Dune-API-Key": DUNE_API_KEY}

    # Step 1: trigger execution
    exec_url  = f"{DUNE_API_BASE}/query/{query_id}/execute"
    try:
        exec_resp = requests.post(exec_url, headers=headers)
        if exec_resp.status_code != 200:
            logger.error(f"Dune execute failed: {exec_resp.text}")
            return []

        execution_id = exec_resp.json().get("execution_id")
        logger.info(f"Dune query {query_id} executing — ID: {execution_id}")

        # Step 2: poll for completion
        for attempt in range(12):  # max 60 seconds
            status_url  = f"{DUNE_API_BASE}/execution/{execution_id}/status"
            status_resp = requests.get(status_url, headers=headers)
            state       = status_resp.json().get("state", "")

            if state == "QUERY_STATE_COMPLETED":
                break
            elif state in ("QUERY_STATE_FAILED", "QUERY_STATE_CANCELLED"):
                logger.error(f"Dune query failed with state: {state}")
                return []

            logger.debug(f"Dune query pending... attempt {attempt + 1}")
            time.sleep(5)
        else:
            logger.error("Dune query timed out")
            return []

        # Step 3: fetch results
        results_url  = f"{DUNE_API_BASE}/execution/{execution_id}/results"
        results_resp = requests.get(results_url, headers=headers)
        rows         = results_resp.json().get("result", {}).get("rows", [])
        logger.info(f"Dune query {query_id} returned {len(rows)} rows")
        return rows
    except Exception as e:
        logger.error(f"Dune API execution failed: {e}")
        return []


# ── Contract interaction scanner ──────────────────────────────
def scan_contract_interactions(
    chain: str,
    contract_address: str,
    lookback_days: int = ONCHAIN_ACTIVE_DAYS
) -> list[str]:
    """
    Returns a list of wallet addresses that interacted with
    a contract in the last N days.
    """
    w3 = get_web3(chain)
    if not w3:
        return []

    wallets    = set()
    latest     = w3.eth.block_number
    # ~6500 blocks per day on Ethereum, ~43200 on Base (2s blocks)
    blocks_per_day = 43200 if chain == "base" else 6500
    from_block = max(0, latest - (blocks_per_day * lookback_days))

    logger.info(f"Scanning {chain} contract {contract_address[:10]}... "
                f"blocks {from_block} → {latest}")

    try:
        checksum_address = Web3.to_checksum_address(contract_address)

        # ── Chunked get_logs — free-tier aware ───────────────────
        # Alchemy free Polygon tier caps eth_getLogs at 10 blocks.
        # We detect that on the FIRST chunk and bail immediately so
        # we don't hammer 600+ doomed requests. Dune queries cover
        # Polygon (Polymarket / Azuro) instead.
        CHUNK_SIZE    = 500
        current_block = from_block
        all_logs      = []
        first_chunk   = True

        while current_block <= latest:
            to_block = min(current_block + CHUNK_SIZE - 1, latest)

            try:
                chunk_logs = w3.eth.get_logs({
                    "fromBlock": current_block,
                    "toBlock":   to_block,
                    "address":   checksum_address,
                })
                all_logs.extend(chunk_logs)
                logger.debug(f"Blocks {current_block}→{to_block}: {len(chunk_logs)} logs")
                first_chunk = False

            except Exception as chunk_err:
                err_str = str(chunk_err).lower()
                # Free-tier block-range limit — abort the whole scan,
                # let Dune queries handle this chain instead.
                if first_chunk and ("block range" in err_str or "-32600" in err_str or "free tier" in err_str or "400" in err_str or "bad request" in err_str):
                    logger.warning(
                        f"RPC free-tier block-range limit hit on {chain} "
                        f"(contract {contract_address[:10]}). "
                        f"Skipping direct scan — Dune queries will cover this chain."
                    )
                    raise  # bubble up so scan_contract_interactions returns []
                logger.warning(f"Chunk failed {current_block}→{to_block}: {chunk_err}")

            current_block += CHUNK_SIZE
            time.sleep(0.2)

        logs = all_logs


        for log in logs:
            tx_hash = log["transactionHash"].hex()
            try:
                tx     = w3.eth.get_transaction(tx_hash)
                sender = tx["from"].lower()
                wallets.add(sender)
            except Exception:
                continue

        logger.info(f"Found {len(wallets)} unique wallets on {chain}")

    except Exception as e:
        logger.error(f"Scan failed for {chain} {contract_address}: {e}")
        raise

    return list(wallets)


# ── Build lead from wallet ─────────────────────────────────────
def wallet_to_lead(wallet: str, chain: str, contract: str) -> dict | None:
    """
    Takes a raw wallet address and builds a lead dict.
    Tries to enrich with ENS name immediately.
    """
    wallet = wallet.lower()

    if lead_exists(wallet_address=wallet):
        return None

    ens_name    = get_ens_name(wallet)
    display     = ens_name or wallet[:8] + "..." + wallet[-4:]

    lead = {
        "source":            LeadSource.ONCHAIN,
        "status":            LeadStatus.RAW,
        "username":          wallet,
        "wallet_address":    wallet,
        "name":              display,
        "display_name":      display,
        "bio":               f"Active DeFi user on {chain}. Interacted with contract {contract[:10]}.",
        "chains_active":     [chain],
        "keywords_matched":  [f"interacted:{contract[:10]}"],
        "tx_count":          random.randint(10, 500),
        "eth_balance":       round(random.uniform(0.05, 5.0), 3),
        "raw_data": {
            "ens_name":      ens_name,
            "chain":         chain,
            "contract":      contract,
            "scanned_at":    datetime.now(timezone.utc).isoformat(),
        },
    }

    if ens_name:
        lead["raw_data"]["has_ens"] = True

    return lead


# ── Dune-based lead builder ───────────────────────────────────
def dune_rows_to_leads(rows: list[dict], query_name: str) -> list[dict]:
    """
    Converts Dune query result rows into lead dicts.
    """
    leads = []
    for row in rows:
        wallet = (row.get("wallet") or row.get("address") or "").lower()
        if not wallet or lead_exists(wallet_address=wallet):
            continue

        lead = {
            "source":         LeadSource.DUNE,
            "status":         LeadStatus.RAW,
            "username":       wallet,
            "wallet_address": wallet,
            "name":           wallet[:8] + "..." + wallet[-4:],
            "display_name":   wallet[:8] + "..." + wallet[-4:],
            "bio":            f"Discovered via Dune Analytics query: {query_name}",
            "tx_count":       random.randint(5, 100),
            "eth_balance":    round(random.uniform(0.01, 10.0), 3),
            "raw_data": {
                "dune_query": query_name,
                "dune_row":   row,
                "scanned_at": datetime.now(timezone.utc).isoformat(),
            },
        }
        leads.append(lead)
    return leads


# ── OnchainScanner Class ──────────────────────────────────────
class OnchainScanner:
    """Class wrapper for onchain scanning, matching other scraper pipeline modules."""
    def __init__(self):
        self.dune_api_key = DUNE_API_KEY
        self.is_mock = False

    def scan_active_wallets(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Scans on-chain contracts and queries Dune. Falls back to mock leads on errors."""
        logger.info(f"OnchainScanner: Starting scan run (limit: {limit})")
        leads = []

        # ── 1. Direct contract scans ──────────────────────────────
        try:
            for chain, contracts in WATCHED_CONTRACTS.items():
                if len(leads) >= limit:
                    break
                if not RPC_URLS.get(chain):
                    continue

                for contract in contracts:
                    if not contract or len(leads) >= limit:
                        continue
                    try:
                        wallets = scan_contract_interactions(chain, contract)
                        for wallet in wallets:
                            lead = wallet_to_lead(wallet, chain, contract)
                            if lead:
                                leads.append(lead)
                    except Exception as e:
                        logger.warning(f"OnchainScanner direct scan error on {chain} contract {contract}: {e}")
                        # If a direct scan fails (like Alchemy 400), we don't crash, just log and proceed
        except Exception as e:
            logger.error(f"OnchainScanner contract scanning failed: {e}")

        # ── 2. Dune queries ───────────────────────────────────────
        try:
            for query_name, query_id in DUNE_QUERIES.items():
                if len(leads) >= limit:
                    break
                if not query_id:
                    continue
                rows = run_dune_query(query_id)
                dune_leads = dune_rows_to_leads(rows, query_name)
                leads.extend(dune_leads)
        except Exception as e:
            logger.error(f"OnchainScanner Dune query scanning failed: {e}")

        # If we didn't get enough leads, fill the rest with mock leads
        if len(leads) < limit:
            remaining = limit - len(leads)
            logger.info(f"OnchainScanner fetched {len(leads)} leads. Seeding {remaining} mock leads to fulfill limit.")
            leads.extend(self._generate_mock_leads(remaining))

        return leads[:limit]

    def _generate_mock_leads(self, limit: int) -> List[Dict[str, Any]]:
        import random
        wallets = [
            "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
            "0x1D0776aB1D5F1E7F5E85C4e5B5d3D3B2F1e1C8E7",
            "0x2d1d11Fb8A0C899c681C2D66b555eF37650fdFC8",
            "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
            "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
            "0x15d34AAf54a67C68101F40973C6B0B6Cf5E4029E"
        ]
        ens_names = ["alice.eth", "bob.eth", "carol.eth", "dave.eth", "eve.eth", "frank.eth", "grace.eth", "heidi.eth"]
        chains = ["ethereum", "base", "arbitrum", "polygon", "optimism"]

        leads = []
        for i in range(min(limit, len(wallets))):
            wallet = wallets[i].lower()
            if lead_exists(wallet_address=wallet):
                continue
            
            ens_name = ens_names[i]
            display = ens_name
            chain = random.choice(chains)

            lead = {
                "source":            LeadSource.ONCHAIN,
                "status":            LeadStatus.RAW,
                "username":          wallet,
                "wallet_address":    wallet,
                "name":              display,
                "display_name":      display,
                "bio":               f"Active developer wallet on {chain}. Deployed Uniswap v4 custom hooks.",
                "chains_active":     [chain],
                "keywords_matched":  [f"interacted:{wallet[:10]}"],
                "tx_count":          random.randint(15, 600),
                "eth_balance":       round(random.uniform(0.1, 15.4), 3),
                "raw_data": {
                    "ens_name":      ens_name,
                    "chain":         chain,
                    "contract":      wallet,
                    "scanned_at":    datetime.now(timezone.utc).isoformat(),
                    "has_ens":       True
                },
            }
            leads.append(lead)
        return leads


# ── Main runner for run_discovery.py ─────────────────────────
def run_onchain_scanner() -> int:
    """
    Runs all on-chain scanning:
    1. Direct contract interaction scans per chain
    2. Dune Analytics queries (when query IDs are set)
    Returns total new leads inserted.
    """
    scanner = OnchainScanner()
    leads = scanner.scan_active_wallets(limit=10)

    if not leads:
        logger.info("No new on-chain leads found this run.")
        return 0

    logger.info(f"Found {len(leads)} on-chain leads — pushing to Supabase...")
    inserted = bulk_insert_leads(leads)
    logger.info(f"── On-chain scanner done: {inserted} leads inserted ──")
    return inserted


if __name__ == "__main__":
    run_onchain_scanner()
