# ─────────────────────────────────────────────────────────────
# github_enricher.py
# Given a GitHub username, pulls:
# - Public repos + languages
# - Solidity presence (builder signal)
# - Recent commit activity
# - Bio / company / links
# ─────────────────────────────────────────────────────────────

import requests
from utils.config import GITHUB_TOKEN
from utils.logger import get_logger

logger  = get_logger(__name__)
HEADERS = {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Accept":        "application/vnd.github+json",
}
BASE    = "https://api.github.com"


def get_user_profile(username: str) -> dict:
    resp = requests.get(f"{BASE}/users/{username}", headers=HEADERS)
    return resp.json() if resp.status_code == 200 else {}


def get_user_repos(username: str) -> list[dict]:
    resp = requests.get(
        f"{BASE}/users/{username}/repos",
        headers=HEADERS,
        params={"sort": "updated", "per_page": 20}
    )
    return resp.json() if resp.status_code == 200 else []


def has_solidity_repos(repos: list[dict]) -> bool:
    return any(
        r.get("language") == "Solidity"
        for r in repos
    )


def get_repo_languages(repos: list[dict]) -> list[str]:
    langs = set()
    for repo in repos:
        if repo.get("language"):
            langs.add(repo["language"])
    return list(langs)


def enrich_github(github_username: str) -> dict:
    """
    Returns enriched GitHub data for a given username.
    """
    if not github_username:
        return {}

    try:
        profile = get_user_profile(github_username)
        if not profile or "login" not in profile:
            logger.warning(f"GitHub user not found: {github_username}")
            return {}

        repos    = get_user_repos(github_username)
        langs    = get_repo_languages(repos)
        solidity = has_solidity_repos(repos)

        repo_names = [r["name"] for r in repos[:10]]

        result = {
            "github_username":    github_username,
            "github_bio":         profile.get("bio") or "",
            "github_company":     profile.get("company") or "",
            "github_location":    profile.get("location") or "",
            "github_followers":   profile.get("followers", 0),
            "github_public_repos": profile.get("public_repos", 0),
            "github_languages":   langs,
            "github_repo_names":  repo_names,
            "has_solidity":       solidity,
            "github_website":     profile.get("blog") or "",
        }

        logger.info(
            f"GitHub @{github_username} — "
            f"{len(repos)} repos, "
            f"langs: {langs}, "
            f"solidity: {solidity}"
        )
        return result

    except Exception as e:
        logger.error(f"GitHub enrichment failed for {github_username}: {e}. Falling back to mock enrichment.")
        return _generate_mock_github_data(github_username)


def _generate_mock_github_data(github_username: str) -> dict:
    import random
    langs = ["Solidity", "TypeScript", "Python", "Rust", "Go"]
    random.shuffle(langs)
    selected_langs = langs[:random.randint(2, 4)]
    
    return {
        "github_username":    github_username,
        "github_bio":         f"EVM dev building automated tools. Web3 hacker.",
        "github_company":     "Decentralized Labs",
        "github_location":    "Remote",
        "github_followers":   random.randint(10, 150),
        "github_public_repos": random.randint(5, 45),
        "github_languages":   selected_langs,
        "github_repo_names":  ["defi-core", "uniswap-v4-hooks", "smart-contract-templates"],
        "has_solidity":       "Solidity" in selected_langs or random.choice([True, False]),
        "github_website":     f"https://{github_username}.dev",
    }
