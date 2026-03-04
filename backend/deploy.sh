#!/usr/bin/env bash
# Deploy Prelude backend to Google Cloud Run.
#
# Prerequisites:
#   1. gcloud CLI installed and authenticated
#   2. GOOGLE_CLOUD_PROJECT set (or defaults to prelude-488809)
#   3. GEMINI_API_KEY stored in Secret Manager as "gemini-api-key"
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh

set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-prelude-488809}"
REGION="${GOOGLE_CLOUD_REGION:-us-central1}"
SERVICE_NAME="prelude-backend"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "==> Building Docker image..."
docker build -t "${IMAGE}" .

echo "==> Pushing to Container Registry..."
docker push "${IMAGE}"

echo "==> Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE}" \
  --platform managed \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=${PROJECT_ID}" \
  --set-env-vars "GOOGLE_CLOUD_LOCATION=${REGION}" \
  --set-env-vars "GOOGLE_GENAI_USE_VERTEXAI=TRUE" \
  --set-secrets "GOOGLE_API_KEY=gemini-api-key:latest" \
  --memory 1Gi \
  --cpu 1 \
  --timeout 600 \
  --session-affinity \
  --min-instances 0 \
  --max-instances 10

echo "==> Deployment complete!"
gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --format "value(status.url)"
