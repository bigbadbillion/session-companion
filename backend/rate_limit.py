"""
In-process sliding-window rate limits for expensive agent paths.

Keyed by authenticated Firebase uid when auth is on; otherwise by client identifier
(WebSocket userId query param or REST client host). Sufficient for a single Cloud Run
instance; for many replicas, back with Redis/Memorystore later.

Disable entirely with RL_ENABLED=false (e.g. local debugging).
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass

import asyncio

_RL_ENABLED = os.getenv("RL_ENABLED", "true").lower() in ("1", "true", "yes")


def _int_env(name: str, default: int) -> int:
    raw = os.getenv(name, str(default)).strip()
    try:
        v = int(raw)
        return max(0, v)
    except ValueError:
        return default


# WebSocket voice session
_RL_WS_CONNECT_MAX_PER_HOUR = _int_env("RL_WS_CONNECT_MAX_PER_HOUR", 20)
_RL_WS_CONNECT_MAX_PER_DAY = _int_env("RL_WS_CONNECT_MAX_PER_DAY", 80)
_RL_WS_MAX_CONCURRENT = _int_env("RL_WS_MAX_CONCURRENT", 2)

# POST /api/generate-brief
_RL_BRIEF_MAX_PER_HOUR = _int_env("RL_BRIEF_MAX_PER_HOUR", 15)
_RL_BRIEF_MAX_PER_DAY = _int_env("RL_BRIEF_MAX_PER_DAY", 60)

# GET .../weekly-briefs/.../current (may run LLM backfill)
_RL_WEEKLY_CURRENT_MAX_PER_HOUR = _int_env("RL_WEEKLY_CURRENT_MAX_PER_HOUR", 10)
_RL_WEEKLY_CURRENT_MAX_PER_DAY = _int_env("RL_WEEKLY_CURRENT_MAX_PER_DAY", 30)

# Read-mostly GETs (sessions, briefs, weekly list)
_RL_READ_MAX_PER_HOUR = _int_env("RL_READ_MAX_PER_HOUR", 120)


WINDOW_HOUR = 3600.0
WINDOW_DAY = 86400.0

_lock = asyncio.Lock()
# key -> monotonic timestamps in window (pruned on access)
_events: dict[str, list[float]] = {}
_ws_concurrent: dict[str, int] = {}


def rate_limiting_enabled() -> bool:
    return _RL_ENABLED


@dataclass(frozen=True)
class RateLimitDenied:
    reason: str
    retry_after: int


async def _try_hit(key: str, window: float, cap: int) -> RateLimitDenied | None:
    """Record a hit if under cap; else return denial with Retry-After (seconds)."""
    if cap <= 0:
        return None
    now = time.monotonic()
    cutoff = now - window
    async with _lock:
        lst = _events.setdefault(key, [])
        while lst and lst[0] < cutoff:
            lst.pop(0)
        if len(lst) >= cap:
            retry = int(window - (now - lst[0])) + 1
            return RateLimitDenied("rate_limit", max(retry, 1))
        lst.append(now)
    return None


async def try_acquire_voice_session(client_id: str) -> RateLimitDenied | None:
    """Concurrent + connect-rate limits for /ws/session. Call release_voice_session in finally."""
    if not _RL_ENABLED:
        return None

    now = time.monotonic()

    async with _lock:
        # Prune connect counters
        for hk in (f"ws:hr:{client_id}", f"ws:day:{client_id}"):
            lst = _events.setdefault(hk, [])
            w = WINDOW_HOUR if hk.startswith("ws:hr:") else WINDOW_DAY
            cut = now - w
            while lst and lst[0] < cut:
                lst.pop(0)

        hr = _events.setdefault(f"ws:hr:{client_id}", [])
        day = _events.setdefault(f"ws:day:{client_id}", [])

        if _RL_WS_CONNECT_MAX_PER_HOUR > 0 and len(hr) >= _RL_WS_CONNECT_MAX_PER_HOUR:
            retry = int(WINDOW_HOUR - (now - hr[0])) + 1
            return RateLimitDenied("ws_connect_hourly", max(retry, 1))
        if _RL_WS_CONNECT_MAX_PER_DAY > 0 and len(day) >= _RL_WS_CONNECT_MAX_PER_DAY:
            retry = int(WINDOW_DAY - (now - day[0])) + 1
            return RateLimitDenied("ws_connect_daily", max(retry, 1))

        active = _ws_concurrent.get(client_id, 0)
        if _RL_WS_MAX_CONCURRENT > 0 and active >= _RL_WS_MAX_CONCURRENT:
            return RateLimitDenied("ws_concurrent", 10)

        if _RL_WS_CONNECT_MAX_PER_HOUR > 0:
            hr.append(now)
        if _RL_WS_CONNECT_MAX_PER_DAY > 0:
            day.append(now)
        _ws_concurrent[client_id] = active + 1

    return None


async def release_voice_session(client_id: str) -> None:
    if not _RL_ENABLED:
        return
    async with _lock:
        n = _ws_concurrent.get(client_id, 0)
        if n <= 1:
            _ws_concurrent.pop(client_id, None)
        else:
            _ws_concurrent[client_id] = n - 1


async def try_brief_generation(client_id: str) -> RateLimitDenied | None:
    if not _RL_ENABLED:
        return None
    if d := await _try_hit(f"brief:hr:{client_id}", WINDOW_HOUR, _RL_BRIEF_MAX_PER_HOUR):
        return RateLimitDenied("brief_hourly", d.retry_after)
    if d := await _try_hit(f"brief:day:{client_id}", WINDOW_DAY, _RL_BRIEF_MAX_PER_DAY):
        return RateLimitDenied("brief_daily", d.retry_after)
    return None


async def try_weekly_current(client_id: str) -> RateLimitDenied | None:
    if not _RL_ENABLED:
        return None
    if d := await _try_hit(
        f"weekly:hr:{client_id}", WINDOW_HOUR, _RL_WEEKLY_CURRENT_MAX_PER_HOUR
    ):
        return RateLimitDenied("weekly_current_hourly", d.retry_after)
    if d := await _try_hit(
        f"weekly:day:{client_id}", WINDOW_DAY, _RL_WEEKLY_CURRENT_MAX_PER_DAY
    ):
        return RateLimitDenied("weekly_current_daily", d.retry_after)
    return None


async def try_read_heavy(client_id: str) -> RateLimitDenied | None:
    if not _RL_ENABLED:
        return None
    if d := await _try_hit(f"read:hr:{client_id}", WINDOW_HOUR, _RL_READ_MAX_PER_HOUR):
        return RateLimitDenied("read_hourly", d.retry_after)
    return None
