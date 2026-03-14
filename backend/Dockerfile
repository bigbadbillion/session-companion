FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . ./backend/

# Cloud Run sets PORT env var (default 8080)
ENV PORT=8080

# ADK: match local dev — use Google AI + API key for Live (Vertex native-audio preview
# often returns WebSocket 1008 policy violation on Cloud Run). Override in Cloud Run if Vertex allowlisted.
ENV GOOGLE_GENAI_USE_VERTEXAI=FALSE

EXPOSE ${PORT}

CMD ["sh", "-c", "python -m uvicorn backend.api.main:app --host 0.0.0.0 --port ${PORT}"]
