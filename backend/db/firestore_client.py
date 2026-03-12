"""
Firestore client initialization and low-level CRUD helpers.

Uses the Google Cloud Firestore Python SDK with Application Default
Credentials (or a service-account key pointed to by
GOOGLE_APPLICATION_CREDENTIALS).
"""

from __future__ import annotations

import os
from datetime import datetime, timezone, timedelta
from typing import Any

from zoneinfo import ZoneInfo

from google.cloud import firestore

_db: firestore.AsyncClient | None = None


def get_db() -> firestore.AsyncClient:
    global _db
    if _db is None:
        project = os.getenv("GOOGLE_CLOUD_PROJECT", "prelude-488809")
        _db = firestore.AsyncClient(project=project)
    return _db


async def create_document(
    collection: str, data: dict[str, Any], doc_id: str | None = None
) -> str:
    """Create a Firestore document. Returns the document ID."""
    db = get_db()
    if doc_id:
        ref = db.collection(collection).document(doc_id)
    else:
        ref = db.collection(collection).document()
    await ref.set(data)
    return ref.id


async def get_document(collection: str, doc_id: str) -> dict[str, Any] | None:
    db = get_db()
    snap = await db.collection(collection).document(doc_id).get()
    return snap.to_dict() if snap.exists else None


async def update_document(
    collection: str, doc_id: str, data: dict[str, Any]
) -> None:
    db = get_db()
    await db.collection(collection).document(doc_id).update(data)


async def query_documents(
    collection: str, field: str, op: str, value: Any
) -> list[dict[str, Any]]:
    db = get_db()
    docs = (
        db.collection(collection).where(filter=firestore.FieldFilter(field, op, value)).stream()
    )
    results: list[dict[str, Any]] = []
    async for doc in docs:
        results.append(doc.to_dict())
    return results


def server_timestamp() -> Any:
    return firestore.SERVER_TIMESTAMP


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def get_user_timezone(user_doc: dict[str, Any] | None) -> str:
    """Return the user's timezone string, with a safe default.

    Falls back to America/Los_Angeles if no timezone is stored yet. This keeps
    week-boundary math deterministic while we gradually roll out per-user
    timezones in the app.
    """
    if not user_doc:
        return "America/Los_Angeles"
    tz = user_doc.get("timezone")
    if isinstance(tz, str) and tz.strip():
        return tz.strip()
    return "America/Los_Angeles"


def get_week_boundaries_for_timestamp(
    ts_utc: datetime,
    timezone_str: str,
) -> tuple[datetime, datetime]:
    """Compute Sunday–Saturday week boundaries for a given UTC timestamp.

    The computation is performed in the user's local timezone and then converted
    back to UTC for storage and comparison.

    Args:
        ts_utc: A timezone-aware UTC datetime.
        timezone_str: IANA timezone string (e.g. "America/Los_Angeles").

    Returns:
        (week_start_utc, week_end_utc) as timezone-aware UTC datetimes, where:
        - week_start is Sunday 00:00:00 local time
        - week_end is Saturday 23:59:59.999999 local time
    """
    if ts_utc.tzinfo is None:
        ts_utc = ts_utc.replace(tzinfo=timezone.utc)

    try:
        tz = ZoneInfo(timezone_str)
    except Exception:
        tz = ZoneInfo("America/Los_Angeles")

    local_dt = ts_utc.astimezone(tz)

    # Python weekday(): Monday=0, Sunday=6. We want the most recent Sunday.
    days_since_sunday = (local_dt.weekday() + 1) % 7
    week_start_local = (local_dt - timedelta(days=days_since_sunday)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    week_end_local = week_start_local + timedelta(days=7) - timedelta(microseconds=1)

    week_start_utc = week_start_local.astimezone(timezone.utc)
    week_end_utc = week_end_local.astimezone(timezone.utc)
    return week_start_utc, week_end_utc


def get_week_boundaries_for_now(timezone_str: str) -> tuple[datetime, datetime]:
    """Convenience wrapper around get_week_boundaries_for_timestamp for 'now'."""
    return get_week_boundaries_for_timestamp(now_utc(), timezone_str)
