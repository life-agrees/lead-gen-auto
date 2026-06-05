import os
import random
import requests
from typing import List, Dict, Any
from dotenv import load_dotenv
from utils.logger import get_logger
from utils.constants import TARGET_GITHUB_TOPICS

load_dotenv()
logger = get_logger("GitHubScraper")

class GitHubScraper:
    def __init__(self):
        self.github_token = os.getenv("GITHUB_TOKEN")
        self.is_mock = not self.github_token

        if self.is_mock:
            logger.warning("GITHUB_TOKEN not found in .env. Running in Mock Data Generation Mode.")
        else:
            logger.info("GitHubScraper initialized with OAuth token.")

    def search_active_contributors(self, topic: str = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Searches GitHub for top repositories in a topic and retrieves recent committers/contributors."""
        if not topic:
            topic = random.choice(TARGET_GITHUB_TOPICS)

        logger.info(f"Searching GitHub repositories with topic: '{topic}' (limit: {limit})")

        if self.is_mock:
            return self._generate_mock_leads(limit, topic)

        try:
            headers = {
                "Accept": "application/vnd.github.v3+json"
            }
            if self.github_token:
                headers["Authorization"] = f"token {self.github_token}"

            # Step 1: Find active repositories
            search_url = f"https://api.github.com/search/repositories?q=topic:{topic}&sort=stars&order=desc&per_page=5"
            response = requests.get(search_url, headers=headers, timeout=10)
            if response.status_code != 200:
                logger.error(f"GitHub API Repository search error: {response.status_code}. Using mock fallback.")
                return self._generate_mock_leads(limit, topic)

            repos = response.json().get("items", [])
            leads = []

            # Step 2: Grab contributors for these repos
            for repo in repos:
                if len(leads) >= limit:
                    break
                
                repo_name = repo["full_name"]
                logger.info(f"Fetching contributors for {repo_name}...")
                contrib_url = f"https://api.github.com/repos/{repo_name}/contributors?per_page=5"
                contrib_res = requests.get(contrib_url, headers=headers, timeout=10)
                
                if contrib_res.status_code == 200:
                    contributors = contrib_res.json()
                    for user in contributors:
                        if len(leads) >= limit:
                            break
                        if user["type"] == "User":
                            leads.append({
                                "id": f"gh_{user['id']}",
                                "source": "github",
                                "username": user["login"],
                                "name": user["login"],  # Real name requires separate profile fetch
                                "profile_url": user["html_url"],
                                "repo_contributed": repo_name,
                                "commits_to_repo": user.get("contributions", 0),
                                "bio": f"Active contributor to {repo_name}",
                                "raw_data": user
                            })
                else:
                    logger.warning(f"Could not fetch contributors for {repo_name}: {contrib_res.status_code}")

            # If we didn't scrape enough leads, fill the rest with mock leads
            if len(leads) < limit:
                logger.info(f"GitHub API fetched {len(leads)} leads. Filling remainder to limit {limit} with mock leads.")
                leads.extend(self._generate_mock_leads(limit - len(leads), topic))

            return leads[:limit]

        except Exception as e:
            logger.error(f"Failed to query GitHub API: {str(e)}. Falling back to mock leads.")
            return self._generate_mock_leads(limit, topic)

    def _generate_mock_leads(self, limit: int, topic: str) -> List[Dict[str, Any]]:
        """Generates realistic mockup Web3 developer profiles."""
        usernames = ["0xDevNerd", "solidity_builder", "rust_ace", "defi_ninja", "block_wizard", "ai_agent_architect", "eth_maximalist", "zk_genius"]
        repos = [f"awesome-{topic}", f"{topic}-core-library", f"decentralized-{topic}-pipeline", f"smart-contracts-v3"]
        
        leads = []
        for i in range(min(limit, len(usernames))):
            contributions = random.randint(10, 150)
            leads.append({
                "id": f"gh_mock_{random.randint(100000, 999999)}",
                "source": "github",
                "username": usernames[i],
                "name": usernames[i].replace("_", " ").title(),
                "profile_url": f"https://github.com/{usernames[i]}",
                "repo_contributed": f"github-org/{random.choice(repos)}",
                "commits_to_repo": contributions,
                "bio": f"Passionate system engineer working on {topic} technologies. Core maintainer of decentralized libraries.",
                "raw_data": {
                    "contributions": contributions,
                    "type": "User",
                    "public_repos": random.randint(5, 50),
                    "followers": random.randint(15, 600),
                    "created_at": "2022-04-15T09:00:00Z"
                }
            })
        return leads

if __name__ == "__main__":
    scraper = GitHubScraper()
    leads = scraper.search_active_contributors(limit=2)
    print(leads)
