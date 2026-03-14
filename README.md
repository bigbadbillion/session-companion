# Prelude (Session Companion)

Voice-first prep companion for therapy sessions: React web app + FastAPI backend (Google ADK / Gemini) for live audio sessions and brief generation. Auth and data via Firebase.

## Stack

- **Frontend:** Vite, React, TypeScript, Tailwind, shadcn-ui, Firebase Auth
- **Backend:** Python, FastAPI, uvicorn, Google GenAI / ADK
- **Deploy:** Docker (`backend/Dockerfile`), Cloud Build (`cloudbuild.yaml`)

## Prerequisites

- Node.js 18+ and npm
- Python 3.11+ (backend virtualenv recommended at `backend/.venv`)

## Setup

```sh
# Frontend + tooling
npm install

# Backend (from repo root)
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && cd ..
```

## Environment

Create a **backend** `.env` (or project root `.env`) with the variables your deployment expects. Do not commit secrets. Typical names include:

- `GEMINI_API_KEY` or `GOOGLE_API_KEY` (GenAI)
- Firebase / Google Cloud settings as required by the app

Frontend build may expect public Firebase config via Vite env prefixes (see `scripts/check-vite-env.cjs` and your hosting setup).

## Run locally

```sh
# API + Vite together (needs backend/.venv)
npm run dev
```

- API: `http://localhost:8000` (e.g. `GET /api/health`)
- Client: Vite default port (see terminal output)

```sh
# Or separately
npm run dev:client
npm run start:server
```

## Build

```sh
npm run build
```

## Test

```sh
npm test
```

## License

See repository license if present; otherwise all rights reserved by the author.
