"""
ADK-compatible async tool functions for Firestore operations.

Each function follows the ADK tool contract: async Python functions with
typed parameters, docstrings, and dict return values.

All tools are exception-safe: they catch Firestore errors and return
{"status": "error", "message": "..."} instead of raising. This prevents
tool failures from derailing the agent.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone, timedelta

from google.cloud import firestore

from backend.db.firestore_client import (
    create_document,
    get_document,
    update_document,
    now_utc,
    get_db,
    get_user_timezone,
    get_week_boundaries_for_timestamp,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Brief tools (used by BriefGeneratorAgent)
# ---------------------------------------------------------------------------

async def save_brief(
    session_id: str,
    patient_id: str,
    emotional_state: str,
    dominant_emotion: str,
    themes: str,
    patient_words: str,
    focus_items: str,
    pattern_note: str,
) -> dict:
    """Saves a generated therapy-prep brief to Firestore.

    Args:
        session_id: The session this brief was generated from.
        patient_id: The patient's user ID.
        emotional_state: 1-2 sentence emotional state summary.
        dominant_emotion: Single word emotional label (e.g. anxious, calm, hopeful).
        themes: Comma-separated list of three themes.
        patient_words: Near-verbatim quote of the patient's most significant statement.
        focus_items: Comma-separated list of personal intentions for the therapy session.
        pattern_note: Recurring pattern note, or "none" if not applicable.

    Returns:
        dict with status and brief_id, or status "error" if persistence fails.
    """
    try:
        brief_id = str(uuid.uuid4())
        now = now_utc()
        data = {
            "briefId": brief_id,
            "sessionId": session_id,
            "patientId": patient_id,
            "generatedAt": now.isoformat(),
            "savedToDashboard": True,
            "savedAt": now.isoformat(),
            "content": {
                "emotionalState": emotional_state,
                "dominantEmotion": dominant_emotion,
                "themes": [t.strip() for t in themes.split(",") if t.strip()],
                "patientWords": patient_words,
                "focusItems": [f.strip() for f in focus_items.split(",") if f.strip()],
                "patternNote": None if pattern_note.lower() in ("none", "null", "") else pattern_note,
            },
        }
        await create_document("briefs", data, doc_id=brief_id)
        try:
            await update_document("sessions", session_id, {"status": "brief-generated"})
        except Exception:
            pass
        return {"status": "success", "brief_id": brief_id}
    except Exception as e:
        logger.warning(f"save_brief failed: {e}")
        return {"status": "error", "message": f"Failed to save brief: {e}"}


def _to_sorted_timestamp(value) -> float:
    """Coerce Firestore timestamps / ISO strings into a sortable float.

    Firestore may return `generatedAt` as either a native timestamp type
    (e.g. DatetimeWithNanoseconds) or an ISO8601 string, depending on how
    the document was originally written (JS SDK vs Python SDK).

    We normalize everything to `seconds since epoch` to avoid type errors
    like `"<" not supported between instances of 'str' and 'DatetimeWithNanoseconds'`.
    """
    if value is None:
        return 0.0

    # Native datetime-like objects (including Firestore's DatetimeWithNanoseconds)
    if hasattr(value, "timestamp"):
        try:
            return float(value.timestamp())
        except Exception:
            return 0.0

    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value).timestamp()
        except Exception:
            return 0.0

    return 0.0


async def get_patient_patterns(patient_id: str) -> dict:
    """Retrieves recurring theme patterns for a patient across previous sessions.

    Args:
        patient_id: The patient's user ID.

    Returns:
        dict with status and patterns data (weekly themes and flagged patterns).
        Returns empty patterns if none exist or if Firestore is unreachable.
    """
    try:
        result = await get_document("patterns", patient_id)
        if result is None:
            return {
                "status": "success",
                "has_patterns": False,
                "weekly_themes": [],
                "flagged_patterns": [],
            }

        return {
            "status": "success",
            "has_patterns": True,
            "weekly_themes": result.get("weeklyThemes", []),
            "flagged_patterns": result.get("flaggedPatterns", []),
        }
    except Exception as e:
        logger.warning(f"get_patient_patterns failed: {e}")
        return {
            "status": "error",
            "message": f"Could not retrieve patterns: {e}",
            "has_patterns": False,
            "weekly_themes": [],
            "flagged_patterns": [],
        }


async def get_recent_briefs(patient_id: str, limit: int = 3) -> dict:
    """Retrieves the patient's most recent briefs for continuity and comparison.

    Use this to see what you generated in previous sessions. This helps you:
    - Notice if this week's themes overlap with prior weeks
    - Avoid generating a brief that reads identically to last week's
    - Reference emotional trajectory across sessions

    Args:
        patient_id: The patient's user ID.
        limit: Maximum number of briefs to retrieve (default 3).

    Returns:
        dict with status and list of recent briefs (themes, emotional state, etc.)
    """
    try:
        from backend.db.firestore_client import query_documents

        all_briefs = await query_documents("briefs", "patientId", "==", patient_id)

        # Normalize mixed timestamp/string fields to a sortable float
        all_briefs.sort(
            key=lambda b: _to_sorted_timestamp(b.get("generatedAt")), reverse=True
        )
        recent = all_briefs[:limit]

        briefs = []
        for data in recent:
            content = data.get("content", {})
            briefs.append({
                "generated_at": data.get("generatedAt", ""),
                "themes": content.get("themes", []),
                "emotional_state": content.get("emotionalState", ""),
                "dominant_emotion": content.get("dominantEmotion", ""),
                "focus_items": content.get("focusItems", []),
                "pattern_note": content.get("patternNote"),
            })

        if not briefs:
            return {
                "status": "success",
                "has_briefs": False,
                "briefs": [],
                "message": "No previous briefs found. This may be their first session.",
            }

        return {
            "status": "success",
            "has_briefs": True,
            "briefs": briefs,
            "count": len(briefs),
        }

    except Exception as e:
        logger.warning(f"get_recent_briefs failed: {e}")
        return {
            "status": "error",
            "has_briefs": False,
            "briefs": [],
            "message": f"Could not retrieve recent briefs: {e}",
        }


async def update_patterns(patient_id: str, themes: str) -> dict:
    """Updates the recurring theme patterns for a patient after a new session.

    Checks if any theme has appeared 3+ consecutive weeks and flags it.

    Args:
        patient_id: The patient's user ID.
        themes: Comma-separated list of themes from the current session.

    Returns:
        dict with status and any newly flagged patterns.
    """
    try:
        theme_list = [t.strip() for t in themes.split(",") if t.strip()]
        now = now_utc()
        week_of = now.strftime("%Y-%W")

        existing = await get_document("patterns", patient_id)

        if existing is None:
            existing = {
                "patientId": patient_id,
                "weeklyThemes": [],
                "flaggedPatterns": [],
                "lastUpdated": now.isoformat(),
            }

        weekly_themes: list[dict] = existing.get("weeklyThemes", [])
        weekly_themes.append({"weekOf": week_of, "themes": theme_list})

        weekly_themes = weekly_themes[-12:]

        flagged: list[dict] = existing.get("flaggedPatterns", [])
        flagged_theme_names = {p["theme"] for p in flagged}
        recent_weeks = weekly_themes[-4:]
        newly_flagged = []

        all_recent_themes: dict[str, int] = {}
        for week in recent_weeks:
            for theme in week.get("themes", []):
                normalized = theme.lower().strip()
                all_recent_themes[normalized] = all_recent_themes.get(normalized, 0) + 1

        for theme_name, count in all_recent_themes.items():
            if count >= 3 and theme_name not in flagged_theme_names:
                flag_entry = {
                    "theme": theme_name,
                    "firstSeenWeek": recent_weeks[0].get("weekOf", week_of),
                    "occurrences": count,
                    "flaggedAt": now.isoformat(),
                }
                flagged.append(flag_entry)
                newly_flagged.append(theme_name)

        updated_data = {
            "patientId": patient_id,
            "weeklyThemes": weekly_themes,
            "flaggedPatterns": flagged,
            "lastUpdated": now.isoformat(),
        }

        await create_document("patterns", updated_data, doc_id=patient_id)

        return {
            "status": "success",
            "themes_recorded": theme_list,
            "newly_flagged_patterns": newly_flagged,
        }
    except Exception as e:
        logger.warning(f"update_patterns failed: {e}")
        return {
            "status": "error",
            "message": f"Failed to update patterns: {e}",
            "themes_recorded": [],
            "newly_flagged_patterns": [],
        }


# ---------------------------------------------------------------------------
# Direct persistence helpers (called by endpoint, not by agent)
# ---------------------------------------------------------------------------

async def save_session_direct(
    patient_id: str,
    transcript: str,
    duration_seconds: int,
) -> tuple[str | None, str | None]:
    """Saves a completed prep session to Firestore directly from the endpoint.

    This is NOT an ADK tool — it's called by the API endpoint before running
    the agent. The transcript is too large to pass as a tool parameter.

    Args:
        patient_id: The patient's user ID.
        transcript: The full session transcript as a single text block.
        duration_seconds: Duration of the session in seconds.

    Returns:
        Tuple of (session_id, error_message). On success, error_message is None.
        On failure, session_id is None and error_message describes the issue.
    """
    try:
        session_id = str(uuid.uuid4())
        now = now_utc()
        data = {
            "sessionId": session_id,
            "patientId": patient_id,
            "startedAt": datetime.fromtimestamp(
                now.timestamp() - duration_seconds, tz=timezone.utc
            ).isoformat(),
            "completedAt": now.isoformat(),
            "durationSeconds": duration_seconds,
            "status": "complete",
            "transcript": transcript,
        }
        await create_document("sessions", data, doc_id=session_id)
        return session_id, None
    except Exception as e:
        logger.warning(f"save_session_direct failed: {e}")
        return None, str(e)


async def save_brief_direct(
    session_id: str,
    patient_id: str,
    brief_content: dict,
) -> tuple[str | None, str | None]:
    """Saves a brief to Firestore directly from the endpoint (fallback).

    This is NOT an ADK tool — it's called by the API endpoint as a fallback
    if the agent's save_brief tool call fails.

    Args:
        session_id: The session this brief was generated from.
        patient_id: The patient's user ID.
        brief_content: The brief content dict (emotionalState, themes, etc.)

    Returns:
        Tuple of (brief_id, error_message). On success, error_message is None.
    """
    try:
        brief_id = str(uuid.uuid4())
        now = now_utc()
        data = {
            "briefId": brief_id,
            "sessionId": session_id,
            "patientId": patient_id,
            "generatedAt": now.isoformat(),
            "savedToDashboard": True,
            "savedAt": now.isoformat(),
            "content": brief_content,
        }
        await create_document("briefs", data, doc_id=brief_id)
        try:
            await update_document("sessions", session_id, {"status": "brief-generated"})
        except Exception:
            pass
        return brief_id, None
    except Exception as e:
        logger.warning(f"save_brief_direct failed: {e}")
        return None, str(e)


async def check_brief_exists(session_id: str) -> bool:
    """Check if a brief already exists for the given session.

    Used by the endpoint to decide whether to run fallback persistence.
    """
    try:
        from backend.db.firestore_client import query_documents
        briefs = await query_documents("briefs", "sessionId", "==", session_id)
        return len(briefs) > 0
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Weekly briefs and session context helpers
# ---------------------------------------------------------------------------


async def generate_weekly_briefs_for_patient(
    patient_id: str,
    weeks_back: int = 8,
) -> dict:
    """Lazily generate missing weekly briefs for completed weeks.

    This helper is intended to be called from an authenticated API endpoint.
    It looks at the patient's recent session history and creates one
    `weekly_briefs` document per completed calendar week (Sunday–Saturday)
    that does not already have a summary.
    """
    try:
        db = get_db()
        user_doc = await _get_user_doc(patient_id)
        tz_str = get_user_timezone(user_doc)

        now = now_utc()
        # Work backwards from LAST COMPLETED week (do not include current in-progress week)
        week_start_now, _ = get_week_boundaries_for_timestamp(now, tz_str)
        last_completed_week_end = week_start_now - timedelta(microseconds=1)
        last_completed_week_start, _ = get_week_boundaries_for_timestamp(
            last_completed_week_end, tz_str
        )

        # Fetch existing weekly briefs so we don't duplicate
        existing_snaps = (
            db.collection("weekly_briefs")
            .where(filter=firestore.FieldFilter("patientId", "==", patient_id))
            .stream()
        )
        existing: dict[str, dict] = {}
        async for doc in existing_snaps:  # type: ignore[assignment]
            data = doc.to_dict()
            if not data:
                continue
            key = data.get("weekStart")
            if isinstance(key, str):
                existing[key] = data
            elif hasattr(key, "isoformat"):
                existing[key.isoformat()] = data

        created_weeks: list[dict] = []
        checked_weeks = 0

        current_week_start = last_completed_week_start
        while checked_weeks < weeks_back:
            current_week_end = current_week_start + timedelta(days=7) - timedelta(
                microseconds=1
            )
            key = current_week_start.isoformat()
            if key not in existing:
                # Look up sessions in this week
                session_snaps = (
                    db.collection("sessions")
                    .where(
                        filter=firestore.FieldFilter(
                            "patientId", "==", patient_id
                        )
                    )
                    .where(
                        filter=firestore.FieldFilter(
                            "completedAt", ">=", current_week_start
                        )
                    )
                    .where(
                        filter=firestore.FieldFilter(
                            "completedAt", "<=", current_week_end
                        )
                    )
                    .stream()
                )
                sessions: list[dict] = []
                async for s in session_snaps:  # type: ignore[assignment]
                    data = s.to_dict()
                    if data:
                        sessions.append(data)

                if sessions:
                    # For now, build a minimal summary using counts; in a follow-up
                    # we can plug this into a dedicated WeeklyBriefGenerator agent.
                    session_ids = [s.get("sessionId") for s in sessions if s.get("sessionId")]
                    summary = {
                        "emotionalState": "This week had "
                        f"{len(sessions)} prep session{'s' if len(sessions) != 1 else ''}.",
                        "dominantEmotions": [],
                        "themes": [],
                        "patientWordsSample": "",
                        "focusItems": [],
                        "patternNote": None,
                    }
                    doc_id = f"{patient_id}-{current_week_start.strftime('%Y-%m-%d')}"
                    weekly_doc = {
                        "weeklyBriefId": doc_id,
                        "patientId": patient_id,
                        "weekStart": current_week_start.isoformat(),
                        "weekEnd": current_week_end.isoformat(),
                        "sessions": session_ids,
                        "summary": summary,
                        "generatedAt": now.isoformat(),
                        "source": "on-demand",
                    }
                    await create_document("weekly_briefs", weekly_doc, doc_id=doc_id)
                    created_weeks.append(weekly_doc)

            checked_weeks += 1
            current_week_start -= timedelta(days=7)

        return {
            "status": "success",
            "generated_count": len(created_weeks),
            "weeks": created_weeks,
        }
    except Exception as e:
        logger.warning(f"generate_weekly_briefs_for_patient failed: {e}")
        return {
            "status": "error",
            "message": f"Failed to generate weekly briefs: {e}",
            "generated_count": 0,
            "weeks": [],
        }

async def _get_user_doc(patient_id: str) -> dict | None:
    """Fetch the user document to read timezone and other prefs.

    This uses the low-level Firestore client directly to avoid adding another
    public tool surface; it's called by internal helpers and tools below.
    """
    try:
        db = get_db()
        snap = await db.collection("users").document(patient_id).get()
        return snap.to_dict() if snap.exists else None
    except Exception:
        return None


async def get_session_context_for_patient(patient_id: str) -> dict:
    """Return lightweight session context for a patient.

    This is designed as an ADK tool surface so the SessionAgent can:
    - Know when the last session was (absolute + relative wording)
    - Know how many sessions have happened this calendar week
    - Distinguish first-ever vs first-of-week vs additional sessions
    """
    try:
        db = get_db()

        # Fetch recent sessions for this patient. We avoid Firestore composite index
        # requirements by filtering on patientId only and sorting in Python.
        sessions_query = db.collection("sessions").where(
            filter=firestore.FieldFilter("patientId", "==", patient_id)
        )

        docs: list[dict] = []
        async for doc in sessions_query.stream():  # type: ignore[assignment]
            data = doc.to_dict()
            if data:
                docs.append(data)

        if not docs:
            return {
                "status": "success",
                "has_history": False,
                "kind": "first_session_ever",
                "last_session_completed_at": None,
                "time_since_last_session": None,
                "sessions_this_week": 0,
            }

        # Most recent session
        docs.sort(key=lambda s: _to_sorted_timestamp(s.get("completedAt")), reverse=True)
        last = docs[0]
        last_completed_at_raw = last.get("completedAt")
        if hasattr(last_completed_at_raw, "isoformat"):
            last_completed_at_iso = last_completed_at_raw.isoformat()
            last_completed_dt = last_completed_at_raw
        else:
            last_completed_at_iso = str(last_completed_at_raw)
            try:
                last_completed_dt = datetime.fromisoformat(last_completed_at_iso)
            except Exception:
                last_completed_dt = now_utc()

        # Resolve timezone and compute week boundaries around "now"
        user_doc = await _get_user_doc(patient_id)
        tz_str = get_user_timezone(user_doc)
        now = now_utc()
        week_start_utc, week_end_utc = get_week_boundaries_for_timestamp(now, tz_str)

        # Count how many sessions fall in the current week
        sessions_this_week = 0
        for s in docs:
            completed_raw = s.get("completedAt")
            if hasattr(completed_raw, "isoformat"):
                completed_dt = completed_raw
            else:
                try:
                    completed_dt = datetime.fromisoformat(str(completed_raw))
                except Exception:
                    continue
            if week_start_utc <= completed_dt <= week_end_utc:
                sessions_this_week += 1

        # Determine context kind
        total_sessions = len(docs)
        if total_sessions == 0:
            kind = "first_session_ever"
        elif sessions_this_week <= 1:
            # Last session might be before this week; treat this as first of week
            kind = "first_session_of_week"
        else:
            kind = "additional_session_this_week"

        # Human-friendly relative time since last session
        delta = now - last_completed_dt
        days = delta.days
        seconds = delta.seconds
        if days <= 0 and seconds < 60 * 60:
            time_since = "earlier today"
        elif days == 0:
            time_since = "earlier today"
        elif days == 1:
            time_since = "yesterday"
        elif days < 7:
            time_since = f"{days} days ago"
        elif days < 14:
            time_since = "about a week ago"
        else:
            weeks = days // 7
            time_since = f"{weeks} weeks ago"

        return {
            "status": "success",
            "has_history": True,
            "kind": kind,
            "last_session_completed_at": last_completed_at_iso,
            "time_since_last_session": time_since,
            "sessions_this_week": sessions_this_week,
            "timezone": tz_str,
        }
    except Exception as e:
        logger.warning(f"get_session_context_for_patient failed: {e}")
        return {
            "status": "error",
            "message": f"Could not retrieve session context: {e}",
            "has_history": False,
            "kind": "unknown",
            "last_session_completed_at": None,
            "time_since_last_session": None,
            "sessions_this_week": 0,
        }
