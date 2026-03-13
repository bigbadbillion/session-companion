"""
ADK tools for managing session state during a voice prep conversation.

These tools give the SessionAgent structured actions for phase management,
topic tracking, emotional weight logging, and prior-session context —
making the conversation genuinely agentic rather than prompt-only.
"""

from __future__ import annotations

import logging
import time

logger = logging.getLogger(__name__)

_session_store: dict[str, dict] = {}


def reset_session_state() -> None:
    """Clears all session tool state. Called at the start of each new WebSocket connection."""
    _session_store.clear()


def _get_session(session_id: str) -> dict:
    if session_id not in _session_store:
        _session_store[session_id] = {
            "phase": "opening",
            "phase_history": ["opening"],
            "start_time": time.time(),
            "topics": [],
            "patient_words": [],
            "distress_flagged": False,
            "suggest_follow_ups_invocations": 0,
        }
    return _session_store[session_id]


def get_current_phase(session_id: str) -> dict:
    """Returns the current conversation phase and elapsed time.

    Args:
        session_id: The active session identifier.

    Returns:
        dict with the current phase name, elapsed seconds, and phase description.
    """
    state = _get_session(session_id)
    elapsed = int(time.time() - state["start_time"])

    phase_descriptions = {
        "opening": "Warm greeting, set expectations, let the patient settle in. (~60 seconds)",
        "exploring": "Ask one open question and listen fully. Reflect emotional weight, not content. (~3-4 minutes)",
        "deeper": "Follow the single highest-weight emotional thread. Use excavation questions. (~3-4 minutes)",
        "wrapping_up": "Read back themes, emotional state, and what they want their therapist to know. (~2 minutes)",
    }

    return {
        "status": "success",
        "current_phase": state["phase"],
        "elapsed_seconds": elapsed,
        "description": phase_descriptions.get(state["phase"], "Unknown phase"),
        "phases_visited": state["phase_history"],
    }


def advance_phase(session_id: str, next_phase: str) -> dict:
    """Transitions the conversation to the next phase.

    Valid phase transitions:
    - opening -> exploring
    - exploring -> deeper
    - deeper -> wrapping_up
    - Any phase -> wrapping_up (early exit for distress)

    Args:
        session_id: The active session identifier.
        next_phase: The phase to transition to. One of: exploring, deeper, wrapping_up.

    Returns:
        dict with status and the new phase.
    """
    state = _get_session(session_id)
    current = state["phase"]

    valid_transitions = {
        "opening": ["exploring"],
        "exploring": ["deeper"],
        "deeper": ["wrapping_up"],
        "wrapping_up": [],
    }

    allowed = valid_transitions.get(current, [])
    # Always allow jumping to wrapping_up (safety exit)
    if next_phase == "wrapping_up" or next_phase in allowed:
        state["phase"] = next_phase
        state["phase_history"].append(next_phase)
        return {
            "status": "success",
            "previous_phase": current,
            "new_phase": next_phase,
        }

    return {
        "status": "error",
        "error_message": f"Cannot transition from '{current}' to '{next_phase}'. "
        f"Allowed transitions: {allowed + ['wrapping_up']}",
    }


def log_topic(
    session_id: str,
    topic: str,
    emotional_weight: str,
    was_minimized: str,
) -> dict:
    """Logs a topic mentioned by the patient with its emotional weight.

    Call this every time the patient mentions a distinct topic or theme.
    Topics that were minimized ("it's fine", "not a big deal") should be
    marked as minimized — these are often the most significant.

    Args:
        session_id: The active session identifier.
        topic: Brief description of the topic (4-8 words).
        emotional_weight: The emotional intensity: low, medium, or high.
        was_minimized: Whether the patient minimized this topic: true or false.

    Returns:
        dict with status and the updated topic list.
    """
    state = _get_session(session_id)

    is_minimized = was_minimized.lower() in ("true", "yes", "1")
    # Minimized topics get automatically elevated to high weight
    effective_weight = "high" if is_minimized else emotional_weight.lower()

    entry = {
        "topic": topic,
        "emotional_weight": effective_weight,
        "was_minimized": is_minimized,
        "timestamp": time.time() - state["start_time"],
    }
    state["topics"].append(entry)

    return {
        "status": "success",
        "topic_logged": topic,
        "effective_weight": effective_weight,
        "total_topics": len(state["topics"]),
    }


def get_highest_weight_topic(session_id: str) -> dict:
    """Returns the topic with the highest emotional weight for deeper exploration.

    Prioritizes minimized topics, then high-weight topics, ordered by recency.

    Args:
        session_id: The active session identifier.

    Returns:
        dict with the highest-priority topic to explore.
    """
    state = _get_session(session_id)
    topics = state["topics"]

    if not topics:
        return {
            "status": "success",
            "has_topic": False,
            "suggestion": "No topics logged yet. Continue listening.",
        }

    def sort_key(t: dict) -> tuple:
        weight_order = {"high": 3, "medium": 2, "low": 1}
        return (
            1 if t["was_minimized"] else 0,
            weight_order.get(t["emotional_weight"], 0),
            t["timestamp"],
        )

    ranked = sorted(topics, key=sort_key, reverse=True)
    top = ranked[0]

    return {
        "status": "success",
        "has_topic": True,
        "topic": top["topic"],
        "emotional_weight": top["emotional_weight"],
        "was_minimized": top["was_minimized"],
        "all_topics": [t["topic"] for t in ranked],
    }


def save_patient_words(session_id: str, quote: str) -> dict:
    """Preserves a verbatim or near-verbatim quote from the patient.

    Call this when the patient says something emotionally significant that
    should be preserved in their exact words for the brief.

    Args:
        session_id: The active session identifier.
        quote: The patient's exact or near-exact words.

    Returns:
        dict with status confirmation.
    """
    state = _get_session(session_id)
    state["patient_words"].append({
        "quote": quote,
        "timestamp": time.time() - state["start_time"],
    })

    return {
        "status": "success",
        "quote_saved": quote,
        "total_quotes": len(state["patient_words"]),
    }


def flag_distress(session_id: str) -> dict:
    """Flags that the patient is showing signs of acute distress.

    When called, the agent should:
    1. Respond with compassion and validation
    2. Encourage reaching out to 988 (Suicide & Crisis Lifeline)
    3. Suggest speaking with their therapist directly
    4. Transition directly to wrapping_up phase

    Args:
        session_id: The active session identifier.

    Returns:
        dict with safety protocol instructions.
    """
    state = _get_session(session_id)
    state["distress_flagged"] = True
    state["phase"] = "wrapping_up"
    state["phase_history"].append("wrapping_up")

    return {
        "status": "distress_flagged",
        "action_required": (
            "Respond with compassion. Do NOT continue probing. "
            "Gently encourage the patient to contact 988 (Suicide & Crisis Lifeline) "
            "or speak with their therapist directly. "
            "Transition to a warm, brief closing."
        ),
        "new_phase": "wrapping_up",
    }


def get_session_summary(session_id: str) -> dict:
    """Returns a full summary of the session state for brief generation.

    Call this at the end of a session to gather all tracked data.

    Args:
        session_id: The active session identifier.

    Returns:
        dict with all session data: topics, quotes, phases, timing.
    """
    state = _get_session(session_id)
    elapsed = int(time.time() - state["start_time"])

    return {
        "status": "success",
        "elapsed_seconds": elapsed,
        "phases_visited": state["phase_history"],
        "topics": state["topics"],
        "patient_words": state["patient_words"],
        "distress_flagged": state["distress_flagged"],
    }


def cleanup_session(session_id: str) -> dict:
    """Removes session tracking data after the session is complete.

    Args:
        session_id: The active session identifier.

    Returns:
        dict confirming cleanup.
    """
    _session_store.pop(session_id, None)
    return {"status": "success", "message": "Session data cleaned up."}


# Static memory-jog cues to help patients recall significant moments they might have forgotten.
# Used when the patient is vague or has only given a high-level summary.
_MEMORY_CUES_STATIC = [
    "Sometimes a small moment sticks — a look someone gave you, a 2AM thought, a wave of feeling on an ordinary afternoon. Anything like that this week?",
    "What's one moment from the past few days that keeps coming back, even if it seems small?",
    "When you think about the week, is there something that felt significant in the moment but you haven't put into words yet?",
]


async def get_memory_cues(patient_id: str | None = None) -> dict:
    """Returns 1–3 short memory-jog prompts to help the patient recall significant moments.

    Use when the patient is vague or has only given a high-level summary. The agent
    should use one as inspiration and adapt to the conversation, not read verbatim.

    Previous-session continuity (e.g. "Last time you mentioned X") is already available
    from get_previous_session_context run before the greeting; do not fetch it again here.

    Args:
        patient_id: Optional. Unused; kept for API compatibility. Continuity comes from
            the start-of-session context the agent already has.

    Returns:
        dict with status and memory_jog_cues (list of cue strings).
    """
    return {
        "status": "success",
        "memory_jog_cues": list(_MEMORY_CUES_STATIC),
    }


async def suggest_follow_ups(
    session_id: str,
    last_patient_turn: str,
) -> dict:
    """Returns 2–4 content-specific follow-up suggestions based on what the patient just said.

    Call this after the patient speaks, passing their last turn (or a short summary).
    Uses the session's logged topics and minimization flags. The agent should use one
    suggestion as inspiration and adapt to the conversation, not read verbatim.

    Args:
        session_id: The active session identifier (used to read logged topics).
        last_patient_turn: What the patient just said, or a brief summary of it.

    Returns:
        dict with status and a list of suggestion strings (follow_ups).
    """
    from backend.tools.reflection_engine import suggest_follow_ups_async

    state = _get_session(session_id)
    topics = [t["topic"] for t in state["topics"]]
    has_minimized = any(t.get("was_minimized") for t in state["topics"])

    # If the agent (or ADK) calls this tool multiple times for the same patient turn,
    # avoid repeated model calls by caching the last suggestions for that session_id
    # and last_patient_turn.
    last_turn_cached = state.get("last_follow_up_turn")
    last_suggestions_cached = state.get("last_follow_up_suggestions")
    if last_turn_cached == last_patient_turn and last_suggestions_cached:
        return {
            "status": "success",
            "follow_ups": last_suggestions_cached,
            "cached": True,
        }

    # Skip the 5–7s reflection-engine call for the first two invocations per session
    # so the first responses after the greeting are fast regardless of prompt adherence.
    invocations = state.get("suggest_follow_ups_invocations", 0)
    if invocations < 2:
        state["suggest_follow_ups_invocations"] = invocations + 1
        early_suggestions = [
            "Reflect what they said in your own words, then ask one specific question.",
            "Notice what carried weight and ask about that.",
        ]
        state["last_follow_up_turn"] = last_patient_turn
        state["last_follow_up_suggestions"] = early_suggestions
        return {
            "status": "success",
            "follow_ups": early_suggestions,
            "early_response": True,
        }

    suggestions = await suggest_follow_ups_async(
        last_patient_turn=last_patient_turn,
        topics=topics if topics else None,
        has_minimized=has_minimized,
    )

    state["last_follow_up_turn"] = last_patient_turn
    state["last_follow_up_suggestions"] = suggestions

    return {
        "status": "success",
        "follow_ups": suggestions,
    }


async def get_previous_session_context(patient_id: str) -> dict:
    """Retrieves the patient's most recent brief for session continuity.

    Call this at the start of a session to see what the patient talked about
    last time. Use it to create natural callbacks — "Last week you mentioned X,
    has anything shifted?" — but only if it feels organic.

    Args:
        patient_id: The patient's user ID.

    Returns:
        dict with the previous session's themes, emotional state, focus items,
        and any pattern notes. Returns has_previous=False if no prior session.
    """
    try:
        from backend.db.firestore_client import query_documents

        all_briefs = await query_documents("briefs", "patientId", "==", patient_id)

        if not all_briefs:
            return {
                "status": "success",
                "has_previous": False,
                "message": "No previous sessions found. This may be their first time.",
            }

        # Normalize mixed timestamp/string generatedAt fields for safe sorting
        from backend.tools.firestore_tools import _to_sorted_timestamp

        all_briefs.sort(
            key=lambda b: _to_sorted_timestamp(b.get("generatedAt")), reverse=True
        )
        brief = all_briefs[0]
        content = brief.get("content", {})

        return {
            "status": "success",
            "has_previous": True,
            "previous_themes": content.get("themes", []),
            "previous_emotional_state": content.get("emotionalState", ""),
            "previous_dominant_emotion": content.get("dominantEmotion", ""),
            "previous_focus_items": content.get("focusItems", []),
            "previous_pattern_note": content.get("patternNote"),
            "days_since_last_session": None,  # Could calculate from generatedAt
        }

    except Exception as e:
        logger.warning(f"get_previous_session_context failed: {e}")
        return {
            "status": "error",
            "has_previous": False,
            "message": f"Could not retrieve previous session: {e}",
        }
