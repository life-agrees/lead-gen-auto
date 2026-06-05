import os
from dotenv import load_dotenv

load_dotenv()

# Twitter
TWITTER_BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN")

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Dune
DUNE_API_KEY = os.getenv("DUNE_API_KEY")

# GitHub
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

# Alchemy API Key
ALCHEMY_API_KEY = os.getenv("ALCHEMY_API_KEY")

# Multichain RPCs
RPC_URLS = {
    "ethereum": os.getenv("RPC_ETHEREUM") or (f"https://eth-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}" if ALCHEMY_API_KEY else None),
    "base":     os.getenv("RPC_BASE")     or (f"https://base-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}" if ALCHEMY_API_KEY else None),
    "arbitrum": os.getenv("RPC_ARBITRUM") or (f"https://arb-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}" if ALCHEMY_API_KEY else None),
    "polygon":  os.getenv("RPC_POLYGON")  or (f"https://polygon-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}" if ALCHEMY_API_KEY else None),
    "optimism": os.getenv("RPC_OPTIMISM") or (f"https://opt-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}" if ALCHEMY_API_KEY else None),
}

# LLM Providers
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
OPENAI_API_KEY    = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY    = os.getenv("GEMINI_API_KEY")
GROK_API_KEY      = os.getenv("GROK_API_KEY")
MISTRAL_API_KEY   = os.getenv("MISTRAL_API_KEY")
GROQ_API_KEY      = os.getenv("GROQ_API_KEY")

# LLM Config
DEFAULT_LLM_PROVIDER = os.getenv("DEFAULT_LLM_PROVIDER", "anthropic")
DEFAULT_LLM_MODEL    = os.getenv("DEFAULT_LLM_MODEL", "claude-sonnet-4-20250514")

# App
ENV       = os.getenv("ENV", "development")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
