import os
import random
from typing import List, Dict, Any
from dotenv import load_dotenv
from utils.logger import get_logger
from utils.constants import ICP_KEYWORDS

load_dotenv()
logger = get_logger("DiscordMonitor")

class DiscordMonitor:
    def __init__(self):
        self.bot_token = os.getenv("DISCORD_BOT_TOKEN")
        self.is_mock = not self.bot_token

        if self.is_mock:
            logger.warning("DISCORD_BOT_TOKEN not found in .env. Running in Mock Data Generation Mode.")
        else:
            logger.info("DiscordMonitor initialized with Bot credentials.")

    def listen_keywords(self, channel_id: str = "mock_channel", limit: int = 10) -> List[Dict[str, Any]]:
        """Listens to channel messages matching keywords and returns them as raw lead signals."""
        logger.info(f"Monitoring Discord channel {channel_id} (limit: {limit})")

        if self.is_mock:
            return self._generate_mock_leads(limit)

        try:
            # Standard Discord HTTP gateway skeleton
            import requests
            headers = {"Authorization": f"Bot {self.bot_token}"}
            url = f"https://discord.com/api/v10/channels/{channel_id}/messages?limit=50"
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                messages = response.json()
                leads = []
                for msg in messages:
                    content = msg.get("content", "")
                    # Match against keywords
                    if any(kw.lower() in content.lower() for kw in ICP_KEYWORDS):
                        author = msg.get("author", {})
                        leads.append({
                            "id": f"dc_{msg['id']}",
                            "source": "discord",
                            "username": f"{author.get('username')}#{author.get('discriminator', '0000')}",
                            "name": author.get("global_name") or author.get("username"),
                            "discord_id": author.get("id"),
                            "message_content": content,
                            "bio": f"Discord member in channel {channel_id}",
                            "raw_data": msg
                        })
                return leads[:limit]
            else:
                logger.error(f"Discord API returned status: {response.status_code}. Using mock fallback.")
                return self._generate_mock_leads(limit)
        except Exception as e:
            logger.error(f"Failed to query Discord API: {str(e)}. Falling back to mock leads.")
            return self._generate_mock_leads(limit)

    def _generate_mock_leads(self, limit: int) -> List[Dict[str, Any]]:
        """Generates realistic mockup Discord messages of developers posting in Web3/AI servers."""
        users = ["coder_joe#4123", "zk_wizard#9912", "sol_architect#1123", "ai_builder#8823", "0xGamer#0909"]
        nicknames = ["Joe the Builder", "ZK Wizard", "Solana Dev", "AI Core Builder", "0xGamer"]
        messages = [
            "Anyone here working on connecting Solidity contracts to Python AI agents? Looking for best libraries.",
            "Just pushed a proof of concept showing how a zk-SNARK proof can be verified on Arbitrum. Check it out!",
            "Building a decentralized indexer for Solana. Hit me up if you want to collaborate on Rust development.",
            "We are looking for a lead smart contract engineer. Fully remote, Web3 native. DMs are open!",
            "Is anyone else using APScheduler for background blockchain cron tasks? Having some resource lock issues."
        ]

        leads = []
        for i in range(min(limit, len(users))):
            leads.append({
                "id": f"dc_mock_{random.randint(100000, 999999)}",
                "source": "discord",
                "username": users[i],
                "name": nicknames[i],
                "discord_id": f"uid_{random.randint(1000000000, 9999999999)}",
                "message_content": messages[i],
                "bio": f"Active server member in developer Discord channels. Bio status: Building the future.",
                "raw_data": {
                    "username": users[i],
                    "content": messages[i],
                    "timestamp": "2024-05-15T16:00:00Z"
                }
            })
        return leads

if __name__ == "__main__":
    monitor = DiscordMonitor()
    leads = monitor.listen_keywords(limit=2)
    print(leads)
