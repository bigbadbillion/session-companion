# Prelude (Session Companion)

Voice-first prep companion for therapy sessions: React web app + FastAPI backend (Google ADK / Gemini) for live audio sessions and brief generation. Auth and data via Firebase.

**Live app:** [https://prelude.echovault.me](https://prelude.echovault.me) (Vercel) — try it without running locally. Voice sessions use a WebRTC loopback so Chrome applies echo cancellation to the agent’s voice (works with speakers; no headphones required). If loopback fails in your environment, use headphones as fallback. For additional product context or risk details, email ugo@echovault.me.

## Stack

- **Frontend:** Vite, React, TypeScript, Tailwind, shadcn-ui, Firebase Auth
- **Backend:** Python, FastAPI, uvicorn, Google GenAI / ADK
- **Deploy:** Backend on Google Cloud Run; frontend on Vercel. Docker (`backend/Dockerfile`), Cloud Build (`cloudbuild.yaml`)

## Prerequisites

- Node.js 18+ and npm
- Python 3.11+ (backend virtualenv recommended at `backend/.venv`)
- (Optional) [Google Cloud SDK](https://cloud.google.com/sdk) and a [Firebase](https://console.firebase.google.com/) project if you want to deploy the backend or use your own Firebase

## Setup

```sh
git clone <repo-url> && cd session-companion

# Frontend + tooling
npm install

# Backend (from repo root)
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && cd ..
```

## Environment

Do not commit secrets. Create a `.env` file at the project root or in `backend/` as needed.

**Backend** (project root or `backend/`):

- `GEMINI_API_KEY` or `GOOGLE_API_KEY` — required for ADK / Gemini.
- (Optional) `GOOGLE_APPLICATION_CREDENTIALS` — path to service account JSON if using Firebase Admin (e.g. auth) locally.

For a fuller description of configuration and environment options, email ugo@echovault.me.

**Frontend** (`.env` at repo root; Vite inlines these at build time):

- **Local dev:** Optional. If omitted, `npm run dev` proxies to `http://localhost:8000` (see [src/lib/api-base.ts](src/lib/api-base.ts); empty `VITE_BACKEND_URL`).
- **Firebase (required for auth):** `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` (see [src/lib/firebase.ts](src/lib/firebase.ts)).
- **Production build (e.g. Vercel):** `VITE_BACKEND_URL` = your Cloud Run backend URL (e.g. `https://prelude-backend-366905720098.us-central1.run.app`). Without this, WebSocket and API calls fail in production.

**Firebase Console:** Enable **Authentication → Sign-in method → Email/Password** so email sign-up works.

## Run locally

```sh
# API + Vite together (needs backend/.venv)
npm run dev
```

- Backend: typically `http://localhost:8000` (health check: `GET http://localhost:8000/api/health`).
- Frontend: Vite’s port (e.g. 5173; see terminal output).

Backend only (API testing):

```sh
cd backend && uvicorn backend.api.main:app --reload
```

Or run frontend and backend separately:

```sh
npm run dev:client
npm run start:server
```

## Deploy

**Backend (Cloud Run):** From repo root, `gcloud builds submit --config cloudbuild.yaml .`. For deployment runbook details (projects, secrets, IAM), email ugo@echovault.me.

**Frontend (Vercel):** Set the env vars above; `VITE_BACKEND_URL` must point to your Cloud Run URL. Build command: `npm run build`; output directory: `dist/`.

## Architecture

- **Diagram (overview + agentic flow):** [docs/architecture.md](docs/architecture.md)
- **PNG for submission:** [docs/architecture-overview.png](docs/architecture-overview.png), [docs/architecture-agentic-flow.png](docs/architecture-agentic-flow.png) (generate with `npm run build:diagram`).

## Build

```sh
npm run build
```

## Test

```sh
npm test
```

## Hackathon

Built for the **Gemini Live Agent Challenge**. Architecture diagram source and PNGs are in `docs/`; see links above.

## License

See repository license if present; otherwise all rights reserved by the author.
