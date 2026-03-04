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

# ADK configuration
ENV GOOGLE_GENAI_USE_VERTEXAI=TRUE

EXPOSE ${PORT}

CMD ["sh", "-c", "python -m uvicorn backend.api.main:app --host 0.0.0.0 --port ${PORT}"]
