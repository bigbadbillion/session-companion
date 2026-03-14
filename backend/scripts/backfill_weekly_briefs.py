#!/usr/bin/env python3
"""
Backfill missing weekly_briefs for a patient.

The app only creates weekly brief documents for *completed* calendar weeks
(Sun–Sat in the user’s timezone). For each such week, if there is no
weekly_briefs doc yet but there are sessions in that range, this creates
a minimal weekly summary (same logic as GET /api/weekly-briefs/.../current).

Use this when weekly briefs were added after you already had sessions.

Run from project root (session-companion):

  export GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json
  export GOOGLE_CLOUD_PROJECT=your-project-id   # optional; defaults in code

  PYTHONPATH=. python backend/scripts/backfill_weekly_briefs.py <FIREBASE_UID> --weeks 52

Or with venv:

  PYTHONPATH=. backend/.venv/bin/python backend/scripts/backfill_weekly_briefs.py <FIREBASE_UID> --weeks 52

patient_id must be the same as Firebase Auth UID (Firestore patientId on sessions).
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
root = backend_dir.parent

# So `from backend.tools...` works
if str(root) not in sys.path:
    sys.path.insert(0, str(root))

# Load .env if present (optional; ADC still required for Firestore)
for env_path in [backend_dir / ".env", root / ".env"]:
    if env_path.exists():
        try:
            from dotenv import load_dotenv

            load_dotenv(env_path, override=False)
        except Exception:
            pass
        break


async def main() -> int:
    parser = argparse.ArgumentParser(description="Backfill weekly_briefs for a patient")
    parser.add_argument(
        "patient_id",
        help="Firebase UID / Firestore patientId",
    )
    parser.add_argument(
        "--weeks",
        type=int,
        default=52,
        metavar="N",
        help="How many completed weeks to scan backward (default: 52)",
    )
    args = parser.parse_args()

    if not os.getenv("GOOGLE_APPLICATION_CREDENTIALS") and not os.getenv(
        "GOOGLE_CLOUD_PROJECT"
    ):
        print(
            "Tip: set GOOGLE_APPLICATION_CREDENTIALS (or use gcloud auth application-default login).",
            file=sys.stderr,
        )

    from backend.tools.firestore_tools import generate_weekly_briefs_for_patient

    print(f"Backfilling weekly briefs for patient_id={args.patient_id!r}, weeks_back={args.weeks}")
    result = await generate_weekly_briefs_for_patient(
        args.patient_id,
        weeks_back=args.weeks,
    )

    if result.get("status") != "success":
        print("Error:", result.get("message", result), file=sys.stderr)
        return 1

    created = result.get("weeks") or []
    print(f"Done. Created {len(created)} new weekly brief document(s).")
    for w in created:
        print(
            f"  - {w.get('weekStart', '')[:10]} … {w.get('weekEnd', '')[:10]}  "
            f"sessions={len(w.get('sessions') or [])}  id={w.get('weeklyBriefId')}"
        )
    if not created:
        print(
            "No new docs. Either every week already had a brief, or no sessions "
            "fell in those completed weeks (check timezone on users/{uid}.timezone).",
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
