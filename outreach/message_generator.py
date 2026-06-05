# ─────────────────────────────────────────────────────────────
# outreach/message_generator.py
# Multi-LLM message generator for personalized outreach.
#
# Fix 1: Added _build_lead_summary(), data-guard (skips leads with
# no usable signal), strict builder-to-builder prompt, and an
# INSUFFICIENT_DATA sentinel so the LLM can signal sparse data.
# ─────────────────────────────────────────────────────────────

import os
from typing import Dict, Any
from dotenv import load_dotenv
from utils.logger import get_logger

load_dotenv()
logger = get_logger("LLMMessageGenerator")

# ── Sender context injected into every prompt ─────────────────
SENDER_CONTEXT = """
You represent TrenchyBet — a crypto analytics and lead intelligence
platform built for serious Web3 operators. We give high-signal teams
10 free leads sourced from on-chain + social data, no strings attached.
"""


def _build_lead_summary(lead: dict) -> str:
    """Assembles a structured, LLM-readable summary of everything
    we know about a lead. The richer this is, the more specific
    the generated message will be."""
    lines = []

    handle = lead.get("twitter_handle") or lead.get("username") or ""
    if handle:
        lines.append(f"Twitter handle: @{handle}")

    name = lead.get("name") or lead.get("display_name") or ""
    if name and name != handle:
        lines.append(f"Display name: {name}")

    bio = lead.get("bio") or ""
    if bio:
        lines.append(f"Bio: {bio}")

    wallet = lead.get("wallet_address") or ""
    if wallet:
        lines.append(f"Wallet: {wallet}")

    raw = lead.get("raw_data") or {}

    # On-chain signals
    ens = raw.get("ens_name") or ""
    if ens:
        lines.append(f"ENS name: {ens}")

    tx_count = raw.get("tx_count") or lead.get("tx_count") or 0
    if tx_count:
        lines.append(f"Total transactions: {tx_count}")

    chains = raw.get("chains_active") or lead.get("chains_active") or []
    if chains:
        lines.append(f"Active chains: {', '.join(chains)}")

    contracts = raw.get("contracts_deployed") or []
    if contracts:
        lines.append(f"Contracts deployed: {', '.join(str(c) for c in contracts[:3])}")

    eth_balance = raw.get("eth_balance") or lead.get("eth_balance") or 0
    if eth_balance:
        lines.append(f"ETH balance: {eth_balance:.4f} ETH")

    has_solidity = raw.get("has_solidity") or False
    if has_solidity:
        lines.append("Writes Solidity (confirmed via GitHub)")

    # GitHub signals
    github_username = raw.get("github_username") or lead.get("github_username") or ""
    if github_username:
        lines.append(f"GitHub: @{github_username}")

    repos = raw.get("top_repos") or []
    if repos:
        lines.append(f"Top repos: {', '.join(repos[:3])}")

    public_repos = raw.get("public_repos") or lead.get("public_repos") or 0
    if public_repos:
        lines.append(f"Public repos: {public_repos}")

    # Twitter/social signals
    tweets = raw.get("recent_tweets") or []
    if tweets:
        sample = tweets[:3]
        formatted = [f'  • "{t}"' for t in sample]
        lines.append("Recent tweets:\n" + "\n".join(formatted))

    followers = raw.get("followers_count") or lead.get("followers_count") or 0
    if followers:
        lines.append(f"Followers: {followers:,}")

    repo_contributed = raw.get("repo_contributed") or lead.get("repo_contributed") or ""
    if repo_contributed:
        lines.append(f"Notable contribution: {repo_contributed}")

    source = lead.get("source") or ""
    if source:
        lines.append(f"Discovered via: {source}")

    score = lead.get("score") or 0
    if score:
        lines.append(f"Lead score: {score}/100")

    return "\n".join(lines) if lines else "(no data available)"


class LLMMessageGenerator:
    # Providers we actually support
    SUPPORTED_PROVIDERS = {"mock", "openai", "anthropic", "gemini", "grok", "groq"}

    def __init__(self):
        self.provider = os.getenv("DEFAULT_LLM_PROVIDER", "mock").lower()
        self.openai_key = os.getenv("OPENAI_API_KEY")
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.grok_key = os.getenv("GROK_API_KEY")
        self.groq_key = os.getenv("GROQ_API_KEY")

        # If the configured provider isn't in our supported list, fall back
        if self.provider not in self.SUPPORTED_PROVIDERS:
            logger.warning(
                f"Provider '{self.provider}' is not supported. "
                f"Supported: {', '.join(sorted(self.SUPPORTED_PROVIDERS))}. "
                f"Falling back to best available."
            )
            self._fallback_provider(self.provider)
        # Check that the selected supported provider actually has a key
        elif self.provider == "openai" and not self.openai_key:
            self._fallback_provider("openai")
        elif self.provider == "anthropic" and not self.anthropic_key:
            self._fallback_provider("anthropic")
        elif self.provider == "gemini" and not self.gemini_key:
            self._fallback_provider("gemini")
        elif self.provider == "grok" and not self.grok_key:
            self._fallback_provider("grok")
        elif self.provider == "groq" and not self.groq_key:
            self._fallback_provider("groq")

        logger.info(f"LLM Message Generator active. Primary Provider: {self.provider.upper()}")

    def _fallback_provider(self, failed: str):
        """Attempts to find any secondary active API key before resorting to mock fallback."""
        if self.gemini_key:
            self.provider = "gemini"
        elif self.openai_key:
            self.provider = "openai"
        elif self.anthropic_key:
            self.provider = "anthropic"
        elif self.grok_key:
            self.provider = "grok"
        else:
            self.provider = "mock"
        logger.warning(f"Preferred provider '{failed.upper()}' lacks API Key. Auto-switched to: {self.provider.upper()}")

    def generate_personalized_message(self, lead: Dict[str, Any], stage: str = "day_1_pitch") -> str:
        """
        Entry point for all message generation.

        Returns the generated message string, or "" if the lead has
        insufficient data for a personalised message (Fix 1 guard).
        """
        if stage == "day_1_pitch":
            return self._generate_intro(lead)
        elif stage == "day_3_followup":
            return self._generate_followup(lead, day=3)
        else:  # day_7_breakup
            return self._generate_followup(lead, day=7)

    # ── Fix 1: Data-guarded intro generator ──────────────────

    def _generate_intro(self, lead: dict) -> str:
        """Generate a highly personalised Day-1 DM. Returns '' if data is too thin."""
        lead_summary = _build_lead_summary(lead)

        # Guard: require at least ONE specific signal
        bio     = lead.get("bio") or ""
        raw     = lead.get("raw_data") or {}
        tweets  = raw.get("recent_tweets") or []
        wallet  = lead.get("wallet_address") or ""
        repos   = raw.get("top_repos") or []
        has_sol = raw.get("has_solidity") or False

        has_signal = bool(bio or tweets or wallet or repos or has_sol)
        if not has_signal:
            handle = lead.get("twitter_handle") or lead.get("username") or "unknown"
            logger.warning(
                f"Lead @{handle} has too little data for personalised outreach — skipping"
            )
            return ""

        prompt = f"""
{SENDER_CONTEXT}

You're writing a cold Twitter/X DM to this Web3 founder/builder.
Here is everything we know about them:

{lead_summary}

STRICT rules for this message:
- You MUST reference something SPECIFIC from their data above
  (a real tweet they posted, their ENS name, a contract they
  interacted with, a GitHub repo they own, their bio claim)
- If you cannot find ONE specific thing to reference,
  return the exact text: INSUFFICIENT_DATA
- Max 3 sentences total
- Sentence 1: the specific observation about THEM (not us)
- Sentence 2: one line about TrenchyBet as credibility
- Sentence 3: offer 10 free leads, no strings, reply to claim
- Zero corporate language. Zero "I hope this finds you well."
- Do NOT use the words: pipeline, synergy, automate, leverage
- Sound like a builder texting a builder

Return ONLY the message. No preamble. No sign-off. No quotes.
"""

        if self.provider == "mock":
            return self._generate_templated_mock(lead, "day_1_pitch")

        try:
            raw_msg = self._call_provider(prompt)
            message = raw_msg.strip()

            if "INSUFFICIENT_DATA" in message:
                handle = lead.get("twitter_handle") or lead.get("username") or "unknown"
                logger.warning(f"LLM flagged insufficient data for @{handle}")
                return ""

            handle = lead.get("twitter_handle") or lead.get("username") or "unknown"
            logger.info(f"Generated intro DM for @{handle} via {self.provider}")
            return message

        except Exception as e:
            logger.error(f"Message generation failed: {e}")
            return self._generate_templated_mock(lead, "day_1_pitch")

    def _generate_followup(self, lead: dict, day: int = 3) -> str:
        """Generate Day-3 or Day-7 follow-up message."""
        name = lead.get("name") or lead.get("display_name") or "there"
        handle = lead.get("twitter_handle") or lead.get("username") or "unknown"

        if day == 3:
            prompt = f"""
{SENDER_CONTEXT}

Write a 1-sentence follow-up DM to @{handle} (name: {name}).
They haven't replied to our first message 3 days ago about TrenchyBet.
Keep it casual, zero-pressure. No "just checking in". Sound human.
Return ONLY the message.
"""
        else:
            prompt = f"""
{SENDER_CONTEXT}

Write a friendly "closing the loop" DM to @{handle} (name: {name}).
This is the last message in our sequence — we're closing their slot.
Be warm, wish them well, leave the door open. Max 2 sentences.
Return ONLY the message.
"""

        if self.provider == "mock":
            stage = "day_3_followup" if day == 3 else "day_7_breakup"
            return self._generate_templated_mock(lead, stage)

        try:
            return self._call_provider(prompt).strip()
        except Exception as e:
            logger.error(f"Follow-up generation failed: {e}")
            stage = "day_3_followup" if day == 3 else "day_7_breakup"
            return self._generate_templated_mock(lead, stage)

    # ── Provider dispatch ─────────────────────────────────────

    def _call_provider(self, prompt: str) -> str:
        """Route to the active LLM provider."""
        if self.provider == "groq":
            try:
                return self._call_groq(prompt)
            except Exception as e:
                logger.warning(f"Groq runtime call failed, falling back to Gemini: {e}")
                return self._call_gemini(prompt)
        elif self.provider == "openai":
            return self._call_openai(prompt)
        elif self.provider == "anthropic":
            return self._call_anthropic(prompt)
        elif self.provider == "gemini":
            return self._call_gemini(prompt)
        elif self.provider == "grok":
            return self._call_grok(prompt)
        else:
            raise ValueError(f"Unknown provider: {self.provider}")

    def _call_openai(self, prompt: str) -> str:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=self.openai_key)
            completion = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.7
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"OpenAI API call failed: {str(e)}.")
            raise

    def _call_anthropic(self, prompt: str) -> str:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=self.anthropic_key)
            message = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=200,
                temperature=0.7,
                system="You are a professional outreach automation bot.",
                messages=[{"role": "user", "content": prompt}]
            )
            return message.content[0].text.strip()
        except Exception as e:
            logger.error(f"Anthropic API call failed: {str(e)}.")
            raise

    def _call_gemini(self, prompt: str) -> str:
        try:
            from google import genai
            client = genai.Client(api_key=self.gemini_key)
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
            )
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini API call failed: {str(e)}.")
            raise

    def _call_grok(self, prompt: str) -> str:
        try:
            # xAI Grok API uses OpenAI SDK specification
            from openai import OpenAI
            client = OpenAI(
                api_key=self.grok_key,
                base_url="https://api.x.ai/v1"
            )
            completion = client.chat.completions.create(
                model="grok-3",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Grok API call failed: {str(e)}.")
            raise

    def _call_groq(self, prompt: str) -> str:
        try:
            from groq import Groq
            client = Groq(api_key=self.groq_key)
            completion = client.chat.completions.create(
                model=os.getenv("DEFAULT_LLM_MODEL", "llama3-70b-8192"),
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.7
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Groq API call failed: {str(e)}.")
            raise

    def _generate_templated_mock(self, lead: Dict[str, Any], stage: str) -> str:
        """Fallback mock message generator — used when no LLM keys are configured."""
        name   = lead.get("name") or lead.get("display_name") or "there"
        source = lead.get("source", "web3")
        bio    = lead.get("bio", "")
        raw    = lead.get("raw_data") or {}
        tweets = raw.get("recent_tweets") or []
        repos  = raw.get("top_repos") or []
        ens    = raw.get("ens_name") or ""

        if stage == "day_1_pitch":
            # Try to use the richest available signal
            if ens:
                return (
                    f"Saw your ENS {ens} — clearly you're serious about on-chain identity. "
                    f"We built TrenchyBet to surface operators like you before the crowd does. "
                    f"Reply and I'll drop 10 free leads for you, no strings."
                )
            elif tweets:
                snippet = tweets[0][:80].strip()
                return (
                    f"Caught your tweet: \"{snippet}\" — that's exactly the kind of signal we track. "
                    f"TrenchyBet maps Web3 builder graphs to surface high-quality deal flow. "
                    f"Reply and I'll send you 10 free leads."
                )
            elif repos:
                repo = repos[0].split("/")[-1]
                return (
                    f"Your work on {repo} caught our attention — deep builder energy. "
                    f"TrenchyBet tracks on-chain + social signals to surface operators like you. "
                    f"Reply and grab 10 free leads, on us."
                )
            elif bio:
                snippet = bio[:60].strip()
                return (
                    f"Your bio — \"{snippet}\" — is exactly what we look for when sourcing deal flow. "
                    f"TrenchyBet maps Web3 builder graphs in real time. "
                    f"Reply for 10 free leads, no pitch, no strings."
                )
            else:
                # Bare minimum — generic but at least not "Hi {name}, saw your bio"
                return (
                    f"Your {source} activity has you on our radar as a serious Web3 operator. "
                    f"TrenchyBet surfaces high-conviction deal flow for builders like you. "
                    f"Reply and I'll send 10 free leads to your inbox."
                )

        elif stage == "day_3_followup":
            return (
                f"Hey {name} — bumping this up in case it got buried. "
                f"Still happy to drop those 10 free leads if the timing's better now."
            )

        else:  # day_7_breakup
            return (
                f"No worries {name}, I'll close out your slot. "
                f"Good luck with whatever you're building — feel free to ping if you circle back."
            )
