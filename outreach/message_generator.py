# ─────────────────────────────────────────────────────────────
# outreach/message_generator.py
# Multi-LLM message generator for personalized outreach.
#
# Generates lead-specific, human-toned DMs using each lead's
# actual signals (bio, tweets, repos, on-chain activity, ENS).
# ─────────────────────────────────────────────────────────────

import os
from typing import Dict, Any
from dotenv import load_dotenv
from utils.logger import get_logger

load_dotenv()
logger = get_logger("LLMMessageGenerator")


# ── LLM Persona — injected as system message where supported ──
# This is what makes the output sound like a real person, not a bot.
SYSTEM_PERSONA = """\
You are a real person reaching out on Twitter/X. You are a Web3 builder yourself.
You write the way a thoughtful founder writes in a DM: short, direct, specific.
Never robotic. Never buzzwords. Never "Hey there!" or "I came across your profile."
You always reference something real and specific about the person.

Strict writing rules you must follow without exception:
- No em dashes. Use a comma, period, or new sentence instead.
- Sentence lengths must vary. Mix short sentences with slightly longer ones.
- Keep it brief. Say what needs to be said and stop.
- No bullet points or lists of any kind. Write in flowing sentences only.
- Do not use filler phrases. Every word should earn its place.
"""

# ── Trovr.ai context for the LLM to understand who we represent ─
TROVR_CONTEXT = """\
You represent Trovr.ai, a Web3 lead intelligence platform that surfaces
high-signal builders, founders, and DeFi operators from on-chain activity,
GitHub contributions, and social footprints.
The offer: 10 free leads sourced from live data, no strings attached.
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
    if name and name.lower() != handle.lower():
        lines.append(f"Name: {name}")

    bio = lead.get("bio") or ""
    if bio:
        lines.append(f"Bio: {bio}")

    source = lead.get("source") or ""
    if source:
        lines.append(f"Discovered via: {source}")

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
        lines.append(f"Total on-chain transactions: {tx_count:,}")

    chains = raw.get("chains_active") or lead.get("chains_active") or []
    if chains:
        lines.append(f"Active chains: {', '.join(chains)}")

    contracts = raw.get("contracts_deployed") or []
    if contracts:
        lines.append(f"Contracts deployed: {', '.join(str(c) for c in contracts[:3])}")

    eth_balance = raw.get("eth_balance") or lead.get("eth_balance") or 0
    if eth_balance and float(eth_balance) > 0.0001:
        lines.append(f"ETH/liquidity on-chain: {float(eth_balance):,.4f}")

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

    repo_contributed = raw.get("repo_contributed") or lead.get("repo_contributed") or ""
    if repo_contributed:
        lines.append(f"Notable contribution: {repo_contributed}")

    # Twitter/social signals
    tweets = raw.get("recent_tweets") or []
    if tweets:
        sample = tweets[:3]
        # Handle both string and dict tweet formats
        formatted_tweets = []
        for t in sample:
            text = t.get("text", t) if isinstance(t, dict) else t
            formatted_tweets.append(f'  • "{str(text)[:140]}"')
        lines.append("Recent tweets:\n" + "\n".join(formatted_tweets))

    followers = raw.get("followers_count") or lead.get("followers_count") or 0
    if followers:
        lines.append(f"Twitter followers: {followers:,}")

    score = lead.get("score") or 0
    if score:
        lines.append(f"Lead fit score: {score}/100")

    return "\n".join(lines) if lines else "(no data available)"


def _get_best_signal(lead: dict) -> str:
    """Pull out the single strongest personalisation hook for follow-ups."""
    raw = lead.get("raw_data") or {}

    ens = raw.get("ens_name") or ""
    if ens:
        return f"their ENS name {ens}"

    tweets = raw.get("recent_tweets") or []
    if tweets:
        t = tweets[0]
        text = t.get("text", t) if isinstance(t, dict) else t
        return f'their tweet: "{str(text)[:80]}"'

    repos = raw.get("top_repos") or []
    if repos:
        return f"their work on {repos[0].split('/')[-1]}"

    repo_contributed = raw.get("repo_contributed") or lead.get("repo_contributed") or ""
    if repo_contributed:
        return f"their contribution to {repo_contributed}"

    bio = lead.get("bio") or ""
    if bio:
        return f'their bio: "{bio[:60]}"'

    chains = raw.get("chains_active") or lead.get("chains_active") or []
    if chains:
        return f"their on-chain activity on {', '.join(chains)}"

    source = lead.get("source") or ""
    return f"their {source} footprint" if source else "their Web3 work"


class LLMMessageGenerator:
    SUPPORTED_PROVIDERS = {"mock", "openai", "anthropic", "gemini", "grok", "groq"}

    @property
    def system_persona(self) -> str:
        from utils.campaign import get_active_campaign
        return get_active_campaign().get("system_persona") or SYSTEM_PERSONA

    @property
    def trovr_context(self) -> str:
        from utils.campaign import get_active_campaign
        return get_active_campaign().get("trovr_context") or TROVR_CONTEXT

    def __init__(self):
        self.provider = os.getenv("DEFAULT_LLM_PROVIDER", "mock").lower()
        self.openai_key = os.getenv("OPENAI_API_KEY")
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.grok_key = os.getenv("GROK_API_KEY")
        self.groq_key = os.getenv("GROQ_API_KEY")

        if self.provider not in self.SUPPORTED_PROVIDERS:
            logger.warning(
                f"Provider '{self.provider}' is not supported. "
                f"Supported: {', '.join(sorted(self.SUPPORTED_PROVIDERS))}. "
                f"Falling back to best available."
            )
            self._fallback_provider(self.provider)
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
        if self.groq_key:
            self.provider = "groq"
        elif self.gemini_key:
            self.provider = "gemini"
        elif self.openai_key:
            self.provider = "openai"
        elif self.anthropic_key:
            self.provider = "anthropic"
        else:
            self.provider = "mock"
        logger.warning(f"Preferred provider '{failed.upper()}' lacks API Key. Auto-switched to: {self.provider.upper()}")

    def generate_personalized_message(self, lead: Dict[str, Any], stage: str = "day_1_pitch") -> str:
        """
        Entry point for all message generation.

        Returns the generated message string, or "" if the lead has
        insufficient data for a personalised message.
        """
        if stage == "day_1_pitch":
            return self._generate_intro(lead)
        elif stage == "day_3_followup":
            return self._generate_followup(lead, day=3)
        else:  # day_7_breakup
            return self._generate_followup(lead, day=7)

    def _generate_intro(self, lead: dict) -> str:
        """Generate a highly personalised Day-1 DM."""
        lead_summary = _build_lead_summary(lead)

        # Require at least ONE specific signal before spending an LLM call
        bio     = lead.get("bio") or ""
        raw     = lead.get("raw_data") or {}
        tweets  = raw.get("recent_tweets") or []
        wallet  = lead.get("wallet_address") or ""
        repos   = raw.get("top_repos") or []
        has_sol = raw.get("has_solidity") or False

        has_signal = bool(bio or tweets or wallet or repos or has_sol)
        if not has_signal:
            handle = lead.get("twitter_handle") or lead.get("username") or "unknown"
            logger.warning(f"Lead @{handle} has too little data for personalised outreach — skipping")
            return ""

        prompt = f"""\
{self.trovr_context}

You're writing a cold DM on Twitter/X to this Web3 builder.
Here is everything we know about them:

{lead_summary}

Write a DM that opens by referencing something SPECIFIC and REAL from the data above.
Use one of their actual tweets, their ENS name, a GitHub repo, a chain they're active on,
or something concrete in their bio. Do NOT be vague or make anything up.
Briefly explain what Trovr.ai does in one plain sentence, not a sales pitch.
End with a low-pressure offer: 10 free leads from our data, reply to claim.

Hard rules:
- 2 to 4 sentences maximum. No more.
- No em dashes. Use commas or separate sentences instead.
- Sentence lengths must vary naturally. Avoid uniform rhythm.
- No bullet points or lists. Flowing prose only.
- Do not start with "Hey [name]" or "Hope this finds you well" or "I came across your profile".
- Avoid these words as buzzwords: pipeline, synergy, leverage, automate, optimize, solutions, ecosystem.
- Sound like a real person writing to a builder they respect. Semi-casual, semi-formal.
- If you cannot find one specific real thing to reference, return exactly: INSUFFICIENT_DATA

Return ONLY the message text. No quotes. No preamble."""

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
        """Generate Day-3 or Day-7 follow-up — lead-specific, not generic."""
        name   = lead.get("name") or lead.get("display_name") or "there"
        handle = lead.get("twitter_handle") or lead.get("username") or "unknown"
        signal = _get_best_signal(lead)

        if day == 3:
            prompt = f"""\
{self.trovr_context}

Write a short follow-up DM to @{handle} (name: {name}).
3 days ago we reached out about Trovr.ai and they haven't replied.

What we know about them: {signal}

Write 1 to 2 sentences. Reference what you noticed about them ({signal}) so it
clearly isn't a mass message. Keep it low-pressure. No guilt. No "just checking in".
Semi-casual, semi-formal. Do not start with "Hey" or "Hi [name]".
No em dashes. Vary sentence length naturally. No bullet points.

Return ONLY the message."""
        else:
            prompt = f"""\
{self.trovr_context}

Write a short final DM to @{handle} (name: {name}).
This is the last message in our outreach sequence.

What we know about them: {signal}

Write 1 to 2 sentences. Reference what caught your attention ({signal}).
Warm tone, no hard feelings, leave the door genuinely open.
Sound like a real person, not a bot closing a ticket.
Semi-casual, semi-formal. No em dashes. No bullet points. Vary sentence length.

Return ONLY the message."""

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
                messages=[
                    {"role": "system", "content": self.system_persona},
                    {"role": "user",   "content": prompt}
                ],
                max_tokens=250,
                temperature=0.9
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
                max_tokens=250,
                temperature=0.9,
                system=self.system_persona,
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
                contents=f"{self.system_persona}\n\n{prompt}",
            )
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini API call failed: {str(e)}.")
            raise

    def _call_grok(self, prompt: str) -> str:
        try:
            from openai import OpenAI
            client = OpenAI(
                api_key=self.grok_key,
                base_url="https://api.x.ai/v1"
            )
            completion = client.chat.completions.create(
                model="grok-3",
                messages=[
                    {"role": "system", "content": self.system_persona},
                    {"role": "user",   "content": prompt}
                ],
                max_tokens=250,
                temperature=0.9
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Grok API call failed: {str(e)}.")
            raise

    def _call_groq(self, prompt: str) -> str:
        """Groq call — uses system persona + high temperature for natural variation."""
        try:
            from groq import Groq
            client = Groq(api_key=self.groq_key)
            model = os.getenv("DEFAULT_LLM_MODEL", "qwen/qwen3.6-27b")
            completion = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": self.system_persona},
                    {"role": "user",   "content": prompt}
                ],
                max_tokens=250,
                temperature=0.9       # Higher = more natural variation between leads
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Groq API call failed: {str(e)}.")
            raise

    def _generate_templated_mock(self, lead: Dict[str, Any], stage: str) -> str:
        """Fallback mock message generator — used when no LLM keys are configured.
        Each message uses the richest available signal to simulate personalization."""
        name   = lead.get("name") or lead.get("display_name") or "there"
        source = lead.get("source", "web3")
        bio    = lead.get("bio", "")
        raw    = lead.get("raw_data") or {}
        tweets = raw.get("recent_tweets") or []
        repos  = raw.get("top_repos") or []
        ens    = raw.get("ens_name") or ""
        chains = raw.get("chains_active") or lead.get("chains_active") or []

        if stage == "day_1_pitch":
            if ens:
                return (
                    f"Saw your ENS {ens} and figured I'd reach out. "
                    f"Trovr.ai tracks on-chain and social signals to surface builders worth knowing. "
                    f"Reply and I'll send 10 free leads your way, no strings."
                )
            elif tweets:
                t = tweets[0]
                snippet = (t.get("text", t) if isinstance(t, dict) else t)[:80].strip()
                return (
                    f'Your tweet, "{snippet}", is exactly the kind of signal we track at Trovr.ai. '
                    f"We surface high-quality Web3 deal flow from real builder data. "
                    f"Reply and I'll send you 10 free leads."
                )
            elif repos:
                repo = repos[0].split("/")[-1]
                return (
                    f"Your work on {repo} stood out. "
                    f"Trovr.ai maps on-chain and social signals to find operators like you. "
                    f"Reply and grab 10 free leads, on us."
                )
            elif chains:
                chain_str = " and ".join(chains[:2])
                return (
                    f"Your activity across {chain_str} put you on our radar. "
                    f"Trovr.ai surfaces high-signal deal flow for builders at this level. "
                    f"Reply for 10 free leads, no pitch."
                )
            elif bio:
                snippet = bio[:60].strip()
                return (
                    f'Your bio, "{snippet}", is exactly what we look for when sourcing deal flow. '
                    f"Trovr.ai maps Web3 builder graphs in real time. "
                    f"Reply for 10 free leads."
                )
            else:
                return (
                    f"Your {source} activity put you on our radar. "
                    f"Trovr.ai surfaces high-conviction deal flow for serious Web3 builders. "
                    f"Reply and I'll send 10 free leads to your inbox."
                )

        elif stage == "day_3_followup":
            signal = _get_best_signal(lead)
            return (
                f"Bumping this, {name}. Noticed {signal} and still think it's worth a look. "
                f"Happy to drop those 10 free Trovr.ai leads if now works better."
            )

        else:  # day_7_breakup
            signal = _get_best_signal(lead)
            return (
                f"Closing out your slot. Genuinely found {signal} interesting. "
                f"Feel free to ping if you ever want to revisit. Good luck with the build."
            )
