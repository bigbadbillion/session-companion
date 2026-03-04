"""
Firestore client initialization and low-level CRUD helpers.

Uses the Google Cloud Firestore Python SDK with Application Default
Credentials (or a service-account key pointed to by
GOOGLE_APPLICATION_CREDENTIALS).
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

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
