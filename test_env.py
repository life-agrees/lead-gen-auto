from utils.config import (
    TWITTER_BEARER_TOKEN,
    SUPABASE_URL,
    DUNE_API_KEY,
    GITHUB_TOKEN,
    ALCHEMY_API_KEY,
    RPC_URLS,
    ANTHROPIC_API_KEY,
    OPENAI_API_KEY,
    GEMINI_API_KEY,
    GROK_API_KEY,
    MISTRAL_API_KEY,
    GROQ_API_KEY,
)
from utils.llm_client import ask

def check(name, value):
    status = "[OK]" if value else "[MISSING]"
    print(f"  {status}  {name}")

print("\n== Infrastructure ====================================")
check("TWITTER_BEARER_TOKEN", TWITTER_BEARER_TOKEN)
check("SUPABASE_URL",         SUPABASE_URL)
check("DUNE_API_KEY",         DUNE_API_KEY)
check("GITHUB_TOKEN",         GITHUB_TOKEN)
check("ALCHEMY_API_KEY",     ALCHEMY_API_KEY)

print("\n== Chains ============================================")
for chain, url in RPC_URLS.items():
    check(f"RPC_{chain.upper()}", url)

print("\n== LLM Providers =====================================")
check("ANTHROPIC_API_KEY", ANTHROPIC_API_KEY)
check("OPENAI_API_KEY",    OPENAI_API_KEY)
check("GEMINI_API_KEY",    GEMINI_API_KEY)
check("GROK_API_KEY",      GROK_API_KEY)
check("MISTRAL_API_KEY",   MISTRAL_API_KEY)
check("GROQ_API_KEY",      GROQ_API_KEY)

# == Live LLM test ==========================================
print("\n== Live LLM Test =====================================")
providers = ["anthropic", "openai", "gemini", "grok", "mistral", "groq"]

for p in providers:
    try:
        result = ask("Say hello in one word.", provider=p, tier="fast")
        print(f"  [OK]  {p}: {result.strip()}")
    except Exception as e:
        print(f"  [FAIL]  {p}: {str(e)}")

print()
