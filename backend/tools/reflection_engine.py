"""
Lightweight reflection engine for therapy prep sessions.

Generates content-specific follow-up suggestions (reflective reframes, temporal
questions, memory cues) from the patient's last turn and current topics, so the
session agent can ask something specific instead of generic scripted questions.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re

logger = logging.getLogger(__name__)

REFLECTION_SYSTEM = """You suggest follow-up questions for a brief voice therapy-prep conversation.
Given what the patient just said and the topics so far, output 2-4 short, specific follow-up suggestions.
Each suggestion should be one sentence the agent could adapt (not read verbatim).

Good types: reflective reframe ("It sounds like X might be weighing more than Y — does that fit?"), temporal anchor ("When did you first notice that this week?"), "what do you wish had been different?", or a gentle memory cue for something they might have forgotten.
Never suggest generic questions like "How does that make you feel?" or "Tell me more."
Be specific to their words. Output ONLY a JSON array of 2-4 strings, no other text."""


async def suggest_follow_ups_async(
    last_patient_turn: str,
    topics: list[str] | None = None,
    has_minimized: bool = False,
) -> list[str]:
    """Returns 2-4 content-specific follow-up suggestions for the session agent.

    Args:
        last_patient_turn: What the patient just said (or a short summary).
        topics: Optional list of topic strings already logged this session.
        has_minimized: If True, one suggestion may target the minimized topic.

    Returns:
        List of 2-4 suggestion strings. Empty list on error or empty input.
    """
    last = (last_patient_turn or "").strip()[:1500]
    if not last:
        return []

    topics_str = ", ".join(topics[:10]) if topics else "none yet"
    user_content = (
        f"Patient just said:\n{last}\n\n"
        f"Topics so far: {topics_str}\n"
        f"Patient minimized something: {str(has_minimized).lower()}\n\n"
        "Output a JSON array of 2-4 follow-up suggestion strings."
    )

    try:
        from google import genai

        client = genai.Client()
        full_prompt = f"{REFLECTION_SYSTEM}\n\n{user_content}"

        def _call() -> str:
            resp = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=full_prompt,
            )
            return getattr(resp, "text", "") or ""

        raw = await asyncio.to_thread(_call)
    except Exception as e:
        logger.warning("reflection_engine suggest_follow_ups_async failed: %s", e)
        return []

    # Parse JSON array from response (allow markdown code fence)
    text = raw.strip()
    if not text:
        return []

    # Strip markdown code block if present
    if "```" in text:
        match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
        if match:
            text = match.group(1).strip()

    try:
        out = json.loads(text)
        if isinstance(out, list):
            return [str(s).strip() for s in out if s][:4]
        return []
    except json.JSONDecodeError:
        # Fallback: split by newlines and take non-empty lines as suggestions
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        return lines[:4] if lines else []
