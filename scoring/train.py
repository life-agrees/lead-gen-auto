# ─────────────────────────────────────────────────────────────
# scoring/train.py
# Trains a GradientBoostingClassifier on synthetic data and
# saves model + scaler to data/.
#
# Run whenever you have enough real labelled leads (≥50) or
# just to bootstrap the ML scorer on synthetic data right now.
#
# Usage:
#   python scoring/train.py                    # synthetic bootstrap
#   python scoring/train.py --from-db          # train from DB leads
# ─────────────────────────────────────────────────────────────

from __future__ import annotations

import argparse
import os
import pickle
import random
import sys

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, roc_auc_score

from scoring.features import to_feature_vector, FEATURE_COLUMNS, extract_features
from scoring.rule_scorer import RuleScorer
from utils.logger import get_logger

logger = get_logger("Trainer")

_DATA_DIR   = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
MODEL_PATH  = os.path.join(_DATA_DIR, "ml_scorer.pkl")
SCALER_PATH = os.path.join(_DATA_DIR, "ml_scaler.pkl")

# ── synthetic data generator ──────────────────────────────────

_BIOS_HIGH = [
    "Lead Solidity & Rust engineer building DeFi AI agents.",
    "Founder @ stealth DeFi protocol. prev Uniswap contributor.",
    "Smart contract auditor. On-chain prediction markets.",
    "Building permissionless liquidity on Base. Open to collabs.",
    "Web3 infra engineer. Solidity + TypeScript. 5k GitHub stars.",
]
_BIOS_LOW = [
    "Coffee enthusiast. Views are my own.",
    "Just a regular human account.",
    "Hobbyist photographer and dog lover.",
    "Social media manager.",
    "I love cars and music.",
]
_LANGUAGES_HIGH = [["Solidity", "TypeScript"], ["Rust", "Go"], ["Solidity", "Python"]]
_LANGUAGES_LOW  = [["HTML", "CSS"], ["PHP"], [], ["Java"]]


def _make_lead(high_fit: bool) -> dict:
    if high_fit:
        followers = random.randint(1_200, 30_000)
        repos     = random.randint(12, 80)
        commits   = random.randint(200, 3_000)
        eth       = random.uniform(0.5, 50.0)
        tx        = random.randint(50, 2_000)
        chains    = random.sample(["polygon", "base", "arbitrum", "optimism", "bsc"], k=random.randint(2, 4))
        ens       = "builder.eth" if random.random() > 0.4 else ""
        langs     = random.choice(_LANGUAGES_HIGH)
        bio       = random.choice(_BIOS_HIGH)
        tweets    = [
            {"text": "just deployed on base — prediction market is live"},
            {"text": "uniswap v4 hooks + custom liquidity logic 🔥"},
            {"text": f"defi primitive #{random.randint(1,100)} shipped"},
        ]
    else:
        followers = random.randint(10, 900)
        repos     = random.randint(0, 8)
        commits   = random.randint(0, 40)
        eth       = random.uniform(0.0, 0.3)
        tx        = random.randint(0, 10)
        chains    = random.sample(["polygon", "base"], k=random.randint(0, 1))
        ens       = ""
        langs     = random.choice(_LANGUAGES_LOW)
        bio       = random.choice(_BIOS_LOW)
        tweets    = [
            {"text": "great weather today!"},
            {"text": "loving my new coffee machine"},
        ]

    return {
        "source":          random.choice(["twitter", "github", "onchain"]),
        "followers_count": followers,
        "bio":             bio,
        "raw_data": {
            "recent_tweets":   tweets,
            "github_username": f"user_{random.randint(1000,9999)}" if repos > 0 else "",
            "top_languages":   langs,
            "public_repos":    repos,
            "commits_last_year": commits,
            "eth_balance":     eth,
            "tx_count":        tx,
            "chains_active":   chains,
            "ens_name":        ens,
            "onchain_active_last_30d": tx > 5,
        },
    }


def generate_synthetic_dataset(size: int = 300):
    """Balanced synthetic dataset (50/50 high-fit vs low-fit)."""
    logger.info(f"Generating {size} synthetic samples ({size//2} per class)…")
    rule_scorer = RuleScorer()

    X, y = [], []
    for i in range(size):
        high_fit = (i % 2 == 0)
        lead     = _make_lead(high_fit)
        # Add 10 % label noise
        label    = (1 if high_fit else 0)
        if random.random() < 0.10:
            label = 1 - label
        X.append(to_feature_vector(lead))
        y.append(label)

    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int32)


# ── DB-based dataset ──────────────────────────────────────────

def load_from_db(min_leads: int = 50):
    """
    Loads scored+labelled leads from the DB.
    A lead is labelled '1' if its status is 'converted' or 'replied',
    '0' if status is 'contacted' with no reply.
    Returns (X, y) or (None, None) if not enough data.
    """
    from api.db.supabase_client import DatabaseClient
    db = DatabaseClient()

    try:
        if db.use_supabase:
            res = db.client.table("leads").select("*").in_(
                "status", ["converted", "replied", "contacted"]
            ).execute()
            leads = res.data or []
        else:
            rows = db._execute_sqlite(
                "SELECT * FROM leads WHERE outreach_status IN (?, ?, ?)",
                ("converted", "replied", "contacted"),
                fetchall=True,
            )
            leads = [db._clean_sqlite_row(r) for r in rows]
    except Exception as exc:
        logger.error(f"DB load failed: {exc}")
        return None, None

    if len(leads) < min_leads:
        logger.warning(
            f"Only {len(leads)} labelled leads in DB (need ≥{min_leads}). "
            "Using synthetic data instead."
        )
        return None, None

    X, y = [], []
    for lead in leads:
        label = 1 if lead.get("status") in ("converted", "replied") else 0
        X.append(to_feature_vector(lead))
        y.append(label)

    logger.info(f"Loaded {len(leads)} leads from DB (pos={sum(y)}, neg={len(y)-sum(y)})")
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int32)


# ── train + save ──────────────────────────────────────────────

def train_and_save(X: np.ndarray, y: np.ndarray) -> None:
    os.makedirs(_DATA_DIR, exist_ok=True)

    logger.info(f"Dataset: {len(X)} samples, {len(FEATURE_COLUMNS)} features")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # Scale
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s  = scaler.transform(X_test)

    # Model
    model = GradientBoostingClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        random_state=42,
    )
    model.fit(X_train_s, y_train)

    # Eval
    y_pred = model.predict(X_test_s)
    y_prob = model.predict_proba(X_test_s)[:, 1]

    train_acc = model.score(X_train_s, y_train)
    test_acc  = model.score(X_test_s,  y_test)
    auc       = roc_auc_score(y_test, y_prob)

    logger.info(f"Train acc : {train_acc:.2%}")
    logger.info(f"Test  acc : {test_acc:.2%}")
    logger.info(f"ROC-AUC   : {auc:.3f}")
    logger.info("\n" + classification_report(y_test, y_pred, target_names=["low-fit", "high-fit"]))

    # Cross-val sanity check
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, scaler.transform(X), y, cv=cv, scoring="roc_auc")
    logger.info(f"5-fold AUC: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

    # Feature importance
    importances = sorted(
        zip(FEATURE_COLUMNS, model.feature_importances_),
        key=lambda t: t[1], reverse=True,
    )
    logger.info("Top-5 features:")
    for name, imp in importances[:5]:
        logger.info(f"  {name:30s} {imp:.4f}")

    # Persist
    with open(MODEL_PATH,  "wb") as fh: pickle.dump(model,  fh)
    with open(SCALER_PATH, "wb") as fh: pickle.dump(scaler, fh)
    logger.info(f"Saved model  → {MODEL_PATH}")
    logger.info(f"Saved scaler → {SCALER_PATH}")


# ── entry point ───────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Train the lead-fit ML scorer")
    parser.add_argument(
        "--from-db", action="store_true",
        help="Load labelled leads from DB instead of synthetic data"
    )
    parser.add_argument(
        "--size", type=int, default=400,
        help="Synthetic dataset size (default 400)"
    )
    args = parser.parse_args()

    if args.from_db:
        X, y = load_from_db(min_leads=50)
        if X is None:
            logger.info("Falling back to synthetic data.")
            X, y = generate_synthetic_dataset(args.size)
    else:
        X, y = generate_synthetic_dataset(args.size)

    train_and_save(X, y)


if __name__ == "__main__":
    main()
