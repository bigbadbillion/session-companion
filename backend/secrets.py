"""
Optional loader for environment variables from Google Secret Manager.

Used when LOAD_SECRETS_FROM_MANAGER=1 (e.g. in some deployment setups).
Cloud Run can instead inject secrets via --set-secrets (see cloudbuild.yaml);
in that case this loader is not needed.
"""

from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)

# Map Secret Manager secret name -> env var to set (only if not already set).
SECRET_TO_ENV: dict[str, str] = {
    "gemini-api-key": "GOOGLE_API_KEY",
}


def load_secrets_into_env(project_id: str | None = None) -> None:
    """
    Fetch secrets from Google Secret Manager and set os.environ for any
    env var not already set. Skips entirely if LOAD_SECRETS_FROM_MANAGER is not set.
    """
    if os.getenv("LOAD_SECRETS_FROM_MANAGER", "").lower() not in ("1", "true", "yes"):
        return

    proj = project_id or os.getenv("GOOGLE_CLOUD_PROJECT")
    if not proj:
        logger.warning("LOAD_SECRETS_FROM_MANAGER is set but GOOGLE_CLOUD_PROJECT is not; skipping Secret Manager load")
        return

    try:
        from google.cloud import secretmanager
    except ImportError:
        logger.warning("google-cloud-secret-manager not installed; skipping Secret Manager load")
        return

    client = secretmanager.SecretManagerServiceClient()
    for secret_name, env_var in SECRET_TO_ENV.items():
        if os.getenv(env_var):
            continue
        try:
            name = f"projects/{proj}/secrets/{secret_name}/versions/latest"
            response = client.access_secret_version(request={"name": name})
            value = response.payload.data.decode("utf-8").strip()
            os.environ[env_var] = value
            logger.info("Loaded %s from Secret Manager into %s", secret_name, env_var)
        except Exception as e:
            logger.warning("Failed to load secret %s: %s", secret_name, e)
