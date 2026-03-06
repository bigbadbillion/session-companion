#!/usr/bin/env python3
"""
Test that the gemini-api-key secret is accessible from Secret Manager.
Run from project root: backend/.venv/bin/python backend/scripts/test_secret_access.py

Loads .env from backend/ or project root so GOOGLE_APPLICATION_CREDENTIALS is set.
"""

import os
import sys
from pathlib import Path

# Project root (parent of backend/)
backend_dir = Path(__file__).resolve().parent.parent
root = backend_dir.parent
for env_path in [backend_dir / ".env", root / ".env"]:
    if env_path.exists():
        try:
            from dotenv import load_dotenv
            load_dotenv(env_path, override=False)
        except Exception:
            pass
        break

if not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
    print("GOOGLE_APPLICATION_CREDENTIALS is not set. Set it in .env or export it.", file=sys.stderr)
    sys.exit(1)

from google.cloud import secretmanager

project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "prelude-488809")
client = secretmanager.SecretManagerServiceClient()
name = f"projects/{project_id}/secrets/gemini-api-key/versions/latest"
resp = client.access_secret_version(request={"name": name})
val = resp.payload.data.decode("utf-8")
print("OK: secret accessible, value length =", len(val))
