import os
from utils.config import (
    ANTHROPIC_API_KEY,
    OPENAI_API_KEY,
    GEMINI_API_KEY,
    GROK_API_KEY,
    MISTRAL_API_KEY,
    GROQ_API_KEY,
    DEFAULT_LLM_PROVIDER,
    DEFAULT_LLM_MODEL,
)
from utils.logger import get_logger

logger = get_logger("llm_client")

# ─── Model maps per provider ──────────────────────────────────────────────────
MODELS = {
    "anthropic": {
        "fast":  "claude-haiku-4-5-20251001",
        "smart": "claude-sonnet-4-20250514",
        "best":  "claude-opus-4-20250514",
    },
    "openai": {
        "fast":  "gpt-4o-mini",
        "smart": "gpt-4o",
        "best":  "gpt-4o",
    },
    "gemini": {
        "fast":  "gemini-2.5-flash",
        "smart": "gemini-2.5-flash",
        "best":  "gemini-2.5-pro",
    },
    "grok": {
        "fast":  "grok-3-mini",
        "smart": "grok-3",
        "best":  "grok-3",
    },
    "mistral": {
        "fast":  "mistral-small-latest",
        "smart": "mistral-medium-latest",
        "best":  "mistral-large-latest",
    },
    "groq": {
        "fast":  "llama-3.1-8b-instant",
        "smart": "qwen/qwen3.6-27b",
        "best":  "qwen/qwen3.6-27b",
    },
}


def ask(
    prompt: str,
    provider: str = None,
    tier: str = "smart",        # fast | smart | best
    model: str = None,          # override model directly
    system: str = "You are a helpful assistant.",
    temperature: float = 0.7,
    max_tokens: int = 1000,
) -> str:
    """
    Universal LLM call. Swap provider without changing any other code.

    Usage:
        ask("Generate a cold DM for this lead...")
        ask("...", provider="openai", tier="fast")
        ask("...", provider="mistral", tier="best")
    """
    provider = provider or DEFAULT_LLM_PROVIDER
    model    = model or MODELS[provider][tier]

    if provider == "groq":
        try:
            return _call_groq(prompt, model, system, temperature, max_tokens)
        except Exception as e:
            logger.warning(f"Groq API call failed, falling back to Gemini: {e}")
            fallback_model = MODELS["gemini"][tier]
            return _call_gemini(prompt, fallback_model, system, temperature, max_tokens)
    elif provider == "anthropic":
        return _call_anthropic(prompt, model, system, temperature, max_tokens)
    elif provider == "openai":
        return _call_openai(prompt, model, system, temperature, max_tokens)
    elif provider == "gemini":
        return _call_gemini(prompt, model, system, temperature, max_tokens)
    elif provider == "grok":
        return _call_grok(prompt, model, system, temperature, max_tokens)
    elif provider == "mistral":
        return _call_mistral(prompt, model, system, temperature, max_tokens)
    else:
        raise ValueError(
            f"Unknown provider: '{provider}'. "
            f"Supported providers: {list(MODELS.keys())}"
        )


# ─── Provider implementations ─────────────────────────────────────────────────

def _call_anthropic(prompt, model, system, temperature, max_tokens):
    import anthropic
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text


def _call_openai(prompt, model, system, temperature, max_tokens):
    from openai import OpenAI
    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.chat.completions.create(
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": prompt},
        ],
    )
    return response.choices[0].message.content


def _call_gemini(prompt, model, system, temperature, max_tokens):
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)
    full_prompt = f"{system}\n\n{prompt}"
    response = genai.GenerativeModel(model).generate_content(
        full_prompt,
        generation_config={
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        },
    )
    return response.text


def _call_grok(prompt, model, system, temperature, max_tokens):
    # Grok uses OpenAI-compatible API
    from openai import OpenAI
    client = OpenAI(
        api_key=GROK_API_KEY,
        base_url="https://api.x.ai/v1",
    )
    response = client.chat.completions.create(
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": prompt},
        ],
    )
    return response.choices[0].message.content


def _call_mistral(prompt, model, system, temperature, max_tokens):
    from mistralai import Mistral
    client = Mistral(api_key=MISTRAL_API_KEY)
    response = client.chat.complete(
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": prompt},
        ],
    )
    return response.choices[0].message.content


def _call_groq(prompt, model, system, temperature, max_tokens):
    from groq import Groq
    client   = Groq(api_key=GROQ_API_KEY)
    response = client.chat.completions.create(
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": prompt},
        ],
    )
    return response.choices[0].message.content
