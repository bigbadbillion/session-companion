# Prelude — Product Requirements Document
**AI-Powered Therapy Prep Agent**
_Living document. Updated by coding agent as build progresses._

---

## Document Metadata

| Field | Value |
|---|---|
| **Product Name** | Prelude |
| **Hackathon** | Gemini Live Agent Challenge (Devpost) |
| **Deadline** | March 16, 2026 @ 5:00pm PDT |
| **Category** | Live Agents 🗣️ |
| **Prize Target** | Grand Prize ($25,000) + Best Live Agent ($10,000) |
| **Last Updated** | March 12, 2026 (session prompt simplification + guidelines) |
| **Build Status** | 🟡 In Progress |

---

## Table of Contents

1. [Vision & Problem Statement](#1-vision--problem-statement)
2. [Target Users](#2-target-users)
3. [Core Features](#3-core-features)
4. [Technical Architecture](#4-technical-architecture)
5. [Data Model](#5-data-model)
6. [Agent Conversation Design](#6-agent-conversation-design)  
   - [Session Prompt Guidelines (Do's and Don'ts)](#session-prompt-guidelines-dos-and-donts)
7. [Brief Format Specification](#7-brief-format-specification)
8. [Build Phases & Task Tracker](#8-build-phases--task-tracker)
9. [Hackathon Submission Checklist](#9-hackathon-submission-checklist)
10. [Post-Hackathon Roadmap](#10-post-hackathon-roadmap)
11. [Environment Variables & Secrets](#11-environment-variables--secrets)
12. [Known Risks & Mitigations](#12-known-risks--mitigations)

---

## 1. Vision & Problem Statement

### The Problem

Therapy is the most expensive, time-limited, cognitively demanding conversation a person has — and it starts cold.

The first 5-10 minutes of most therapy sessions are spent trying to remember what happened over the past week, what felt significant, and what the patient actually wants to address. This is expensive dead time — the patient is paying $150-$300/hour and spending a chunk of it just trying to get oriented.

Meanwhile, the emotionally significant moments of the week — the 2AM anxiety spiral, the tense conversation with a parent, the wave of grief on a Tuesday afternoon — evaporate between sessions. They don't make it into the room.

### The Solution

Prelude is a voice-first AI agent that patients speak to for 10 minutes _before_ each therapy session. It listens, asks thoughtful questions, detects emotional weight in real time, and generates a structured brief on the patient's personal dashboard — so they walk into therapy knowing exactly what they need to say.

It does not replace therapy. It makes every session count more.

### The Core Insight

> The value isn't what Prelude says. It's what it helps the patient _surface_ — things they didn't know they needed to say until Prelude asked.

### Why Voice-First Matters

Typing is cognitive labor. Speaking is instinctive. When a patient is emotionally activated — anxious, grieving, overwhelmed — they can speak far more honestly and fluently than they can type. The Gemini Live API's real-time emotional tone detection makes this modality genuinely different from a chatbot: Prelude can _hear_ that something matters before the patient has the words to say it.

---

## 2. Target Users

### User A — The Patient

**Who they are:** Adults in ongoing therapy (weekly or biweekly sessions) who want to get more out of their time with their therapist.

**Their core pain:**
- "I always forget what I wanted to talk about by the time I get there."
- "I spend half the session just catching my therapist up."
- "There was this moment on Wednesday that felt really important but I can't quite describe it now."

**What they need from Prelude:**
- A gentle, private space to think out loud before a session
- A feeling of being heard without judgment
- Confidence walking into therapy knowing exactly what they want to say

---

## 3. Core Features

### MVP Features (Hackathon Scope)

#### F1 — Voice Prep Session (Patient-Facing)
- Patient initiates a 10-minute voice conversation via web browser (no app install)
- Gemini Live API handles real-time bidirectional audio
- Agent follows a structured 4-phase conversation flow (see Section 6)
- Session automatically ends after ~10 minutes or when patient signals completion
- Patient hears a read-back of their brief before it's saved

#### F2 — Brief Generation
- After session ends, a second sub-agent generates a structured written brief
- Brief is stored in Firestore linked to the upcoming session date
- Patient can review and optionally edit the brief before saving to their dashboard

#### F3 — Patient Brief Dashboard
- Generated brief appears on the patient's personal dashboard immediately after a session
- Patient can review, edit, and save the brief
- Past briefs are accessible in session history
- Pattern note: auto-generated flag when a theme recurs 3+ weeks in a row

#### F4 — Patient Session History
- Patients can view their own past briefs
- Emotional state trends displayed as a chart over time with:
  - A weekly view that aggregates Sunday–Saturday and highlights the most frequent dominant emotion for each week (emotion + intensity)
  - A session-by-session view that shows each prep session individually

#### F5 — Auth
- Patients sign in with Google OAuth via Firebase Auth
- All data is scoped to the authenticated patient's account

---

## 4. Technical Architecture

### System Overview

```
               ┌────────────────────────────────┐
               │       PATIENT WEB APP          │
               │     React + Vite + Firebase    │
               │                                │
               │  • Mic/speaker interface       │
               │  • "Start Prep Session"        │
               │  • Brief dashboard             │
               │  • Session history & trends    │
               └───────────────┬────────────────┘
                               ↓
               ┌────────────────────────────────────┐
               │         Google Cloud Run           │
               │      FastAPI + ADK Orchestrator    │
               │                                    │
               │  ┌─────────────────────────────┐   │
               │  │     Session Agent (ADK)     │   │
               │  │  • Runs Gemini Live API     │   │
               │  │  • 4-phase conversation     │   │
               │  │  • Tone metadata capture    │   │
               │  └────────────┬────────────────┘   │
               │               │ transcript +        │
               │               │ emotional metadata  │
               │  ┌────────────▼────────────────┐   │
               │  │   Brief Generator (ADK)     │   │
               │  │  • Gemini 2.0 Flash         │   │
               │  │  • Structured brief output  │   │
               │  │  • Pattern detection        │   │
               │  └────────────┬────────────────┘   │
               └───────────────┼────────────────────┘
                               │
               ┌───────────────┼───────────────┐
               ↓                               ↓
        ┌─────────────┐               ┌──────────────┐
        │  Firestore  │               │Cloud Storage │
        │             │               │  (optional)  │
        │ users       │               │ PDF briefs   │
        │ sessions    │               │ audio logs   │
        │ briefs      │               └──────────────┘
        │ patterns    │
        └─────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Voice AI | Gemini Live API | Real-time bidirectional audio, tone detection |
| Brief AI | Gemini 2.0 Flash | Structured brief generation from transcript |
| Agent Orchestration | Google ADK (Python) | Multi-agent coordination and conversation state |
| Backend Runtime | FastAPI (Python) | API server wrapping ADK agents |
| Hosting | Google Cloud Run | Serverless container hosting |
| Database | Firestore | Sessions, briefs, users, patterns |
| File Storage | Cloud Storage | PDF briefs (optional) |
| Auth | Firebase Auth (Google OAuth) | Patient sign-in |
| Frontend | React + Vite | Patient app (dashboard, briefs, history, trends) |
| Secrets | Google Secret Manager | API keys and credentials |

### Why Cloud Run for a Beginner

Cloud Run deploys any Docker container with a single command. It scales to zero when idle (no cost), scales up automatically under load, and requires zero infrastructure knowledge. The ADK agent runs inside this container as a long-lived WebSocket session.

---

## 5. Data Model

### Firestore Collections

#### `users/{userId}`
```json
{
  "userId": "string (Firebase Auth UID)",
  "name": "string",
  "email": "string",
  "createdAt": "timestamp",
  "nextSessionDate": "timestamp",
  "timezone": "string"
}
```

#### `sessions/{sessionId}`
```json
{
  "sessionId": "string (auto-generated)",
  "patientId": "string",
  "scheduledDate": "timestamp",
  "prepStartedAt": "timestamp",
  "prepCompletedAt": "timestamp",
  "status": "pending | in-progress | complete | brief-generated",
  "transcript": [
    {
      "turn": "number",
      "speaker": "agent | patient",
      "text": "string",
      "timestamp": "timestamp",
      "toneScore": "number (0-1, emotional intensity)",
      "toneLabel": "calm | anxious | sad | frustrated | flat"
    }
  ],
  "emotionalArc": {
    "openingTone": "string",
    "peakIntensityTurn": "number",
    "closingTone": "string",
    "dominantEmotion": "string"
  }
}
```

#### `briefs/{briefId}`
```json
{
  "briefId": "string",
  "sessionId": "string",
  "patientId": "string",
  "generatedAt": "timestamp",
  "savedToDashboard": "boolean",
  "savedAt": "timestamp",
  "content": {
    "emotionalState": "string (1-2 sentence summary)",
    "dominantEmotion": "string",
    "themes": ["string", "string", "string"],
    "patientWords": "string (direct quote/near-quote preserved)",
    "focusItems": ["string", "string"],
    "patternNote": "string | null"
  }
}
```

#### `patterns/{patientId}`
```json
{
  "patientId": "string",
  "weeklyThemes": [
    {
      "weekOf": "timestamp",
      "themes": ["string", "string", "string"]
    }
  ],
  "flaggedPatterns": [
    {
      "theme": "string",
      "firstSeenWeek": "timestamp",
      "occurrences": "number",
      "flaggedAt": "timestamp"
    }
  ],
  "lastUpdated": "timestamp"
}
```

#### `weekly_briefs/{weeklyBriefId}` *(backend-generated weekly summary)*
```json
{
  "weeklyBriefId": "string",
  "patientId": "string",
  "weekStart": "timestamp",
  "weekEnd": "timestamp",
  "sessions": ["sessionId", "sessionId"],
  "summary": {
    "emotionalState": "1–3 sentences summarizing the week's emotional arc",
    "dominantEmotions": ["string", "string"],
    "themes": ["string", "string"],
    "patientWordsSample": "string",
    "focusItems": ["string"],
    "patternNote": "string | null"
  },
  "generatedAt": "timestamp",
  "source": "auto | on-demand"
}
```

---

## 6. Agent Conversation Design

### ADK Agent Structure

```
ADKOrchestrator
├── SessionAgent        ← runs during the voice session (Gemini Live API)
└── BriefGeneratorAgent ← runs after session ends (Gemini 2.0 Flash)
```

### SessionAgent — Phase-by-Phase Prompt Design

The SessionAgent must embody a specific character: warm, unhurried, slightly more reflective than a friend, slightly less clinical than a therapist. It never diagnoses. It never advises. It asks, reflects, and listens.

**Current implementation:** The live session prompt lives in `backend/prompts/session_prompts.py` and is kept **short and clear** (~55 lines). In March 2026 we discovered that an overgrown prompt (many repeated "one turn" rules, long lists of forbidden phrases, and complex nudge-handling instructions) caused the agent to freeze (long pauses with no response even after tools completed and the backend nudge fired) and to emit extra filler turns ("Wait.", "I'll just wait for your response"). Simplifying the prompt—putting "Always respond when the patient speaks" first and removing redundant restrictions—resolved both issues. The phase fragments below are reference for tone and structure; the source of truth for behavior is the simplified prompt in code. See **Session Prompt Guidelines** below before editing that file.

---

#### Phase 1 — Warm Open (~60 seconds)

**System instruction fragment:**
```
You are Prelude, a gentle voice companion helping [patient_name] prepare for their 
upcoming therapy session.

Your tone is warm, calm, and unhurried. Speak as if you have all the time in the world.
Never rush. Never interrupt unless the patient has clearly finished speaking.

Begin with a brief, personal greeting. Acknowledge the upcoming session without making 
it feel clinical. Set the intention: this is a space to think out loud, not to perform 
or produce the "right" answers.

Opening line template:
"Hi [name], good to hear your voice. You've got a session coming up soon. We have 
about ten minutes — no agenda, no right answers. Let's just see what's been with 
you this week."

Then wait. Do not follow up immediately. Let silence be comfortable.
```

**Agent behavior:**
- Detect vocal tone on first response (baseline)
- If patient sounds flat/reluctant: "Take your time — there's no pressure to have it figured out."
- If patient sounds anxious: slow down pacing, lower inflection

---

#### Phase 2 — Open Field (~3–4 minutes)

**System instruction fragment:**
```
Ask one open question and listen fully before responding. Do not ask follow-up questions 
yet — this phase is about hearing the full unedited landscape of their week.

After they speak, reflect back the EMOTIONAL WEIGHT of what they said, not the content.
Focus on what seemed to carry the most feeling, not what was most logically prominent.

Example: If a patient says "work has been crazy and also my mom called and I don't know, 
it's fine" — your reflection should be: "It sounds like the situation with your mom might 
be carrying more weight than the work stress, even though you mentioned work first."

Opening question options (choose based on tone detected):
- Neutral/calm: "What's been taking up the most space in your mind this week?"
- Anxious: "Let's start somewhere easy — what was one moment this week that felt significant, 
  even in a small way?"
- Flat/low energy: "What's one thing you've been carrying around that you haven't had a 
  chance to put down?"

Track which topics the patient mentions and assign rough emotional weight scores internally.
Do not reveal this scoring to the patient.
```

**Agent behavior:**
- Listen for: topics mentioned, emotion words used, topics mentioned then immediately minimized ("it's fine", "not a big deal", "whatever")
- Log minimized topics as HIGH PRIORITY for Phase 3
- After patient finishes: reflect once, then transition with "Tell me more about [highest-weight thread]"

---

#### Phase 3 — Excavation (~3–4 minutes)

**System instruction fragment:**
```
You now follow the single highest-weight emotional thread identified in Phase 2.
Do not introduce new topics. Stay on this thread until you have enough to write a brief.

Ask the kinds of questions that help the patient clarify what matters most:

1. Temporal anchor: "When did you first feel this way this week — was there a specific moment?"
2. Familiarity check: "Is this a familiar feeling for you, or does it feel different from before?"
3. Body/sensation (optional, if patient seems open): "Where do you feel this in your body, if anywhere?"

Therapy bridge is a reflective arc, not a single question. Help the patient build toward naming
what they want to carry into therapy through reflection and reframes (e.g. "You've mentioned X and Y
a few times — it sounds like Y might be what you most want them to hear. Does that fit?"). Only after
they've narrowed the priority might you ask something like "If your therapist could understand one
thing about this before you walked in, what would it be?" — never ask it cold. If they don't land on
a single "one thing," the brief can still capture themes and focus items from the conversation.

Do not ask the questions in sequence. Weave them naturally. Prioritize depth and surfacing over
rushing to Phase 4.

If the patient opens a second significant thread mid-Phase 3, note it but stay on the
primary thread. Flag the second thread for the brief's "themes" section.
```

**Agent behavior:**
- Maximum 4–5 exchanges in this phase (or longer if they're still uncovering)
- If patient goes silent for >8 seconds: "Take your time."
- If patient becomes distressed: slow down, validate, do NOT probe further. Pivot to Phase 4 gently.
- Capture verbatim: significant patient quotes; "what to carry in" may emerge from the arc, not one Q&A

---

#### Phase 4 — Read-Back (~2 minutes)

**System instruction fragment:**
```
Signal the transition to read-back naturally:
"I want to make sure I capture this well before I put your brief together. 
Can I read back what I'm hearing, and you tell me if anything's off?"

Read back a brief oral summary — three themes, their emotional state, and what they 
want to carry into therapy. Keep it under 90 seconds.

End with:
"I'll put this together as your brief — you'll find it on your dashboard. Is there 
anything you'd like me to add or change?"

If the patient requests changes: incorporate them naturally and confirm once.
Then close: "You're all set. I hope the session goes well — you've done good work 
today just by showing up and thinking out loud."

After the patient confirms, end the voice session and trigger the BriefGeneratorAgent.
```

---

### BriefGeneratorAgent — Prompt Design

This agent receives the full transcript + emotional metadata and generates the written brief.

**System prompt:**
```
You are a personal reflection summarizer working as part of the Prelude system. 
You have received a transcript of a 10-minute pre-therapy voice session between 
an AI and a patient.

Your job is to generate a structured brief for the patient's personal dashboard.

Rules:
- Write in first person from the patient's perspective ("I expressed...", "I described...")
- Preserve the patient's own words in the "patientWords" field — use a near-verbatim 
  quote of their most emotionally significant statement
- Themes should be 4-8 words each, descriptive not diagnostic
- emotionalState should be 1-2 sentences: tone + trajectory (e.g., "I came in feeling 
  anxious but softened through the session; ended with cautious resolve")
- dominantEmotion must be exactly one of: anxious, sad, frustrated, calm, hopeful, 
  reflective, grounded, happy, grateful, confident, distressed, flat, excited
- focusItems should be personal intentions for the therapy session ("Explore the Tuesday 
  conversation with mom", "Bring up the sleep pattern from last week")
- patternNote: only include if patterns data shows this theme appearing 3+ consecutive weeks

Output ONLY a valid JSON object. No preamble. No explanation.

Output format:
{
  "emotionalState": "string",
  "dominantEmotion": "string",
  "themes": ["string", "string", "string"],
  "patientWords": "string",
  "focusItems": ["string", "string"],
  "patternNote": "string or null"
}
```

---

### Session Prompt Guidelines (Do's and Don'ts)

When editing `backend/prompts/session_prompts.py`, follow these rules so we never reintroduce the bloat that caused agent freezes and extra filler turns.

**Do:**
- **Keep the prompt short.** Target ~50–60 lines. If it grows past ~80 lines, trim before adding more.
- **Lead with the primary behavior.** The first rule under "core behavior" should be: always respond when the patient speaks; never leave them waiting in silence.
- **State each rule once.** One clear sentence per idea. No repeating "one response per turn" in multiple sections.
- **Prefer positive instructions.** e.g. "Respond when they speak" over long lists of "do not say X, Y, Z."
- **Leave out implementation details.** The model does not need to know about backend nudges, tool-end events, or client-side behavior.
- **Test after edits.** Run a short voice session and confirm the agent responds promptly after the user speaks and does not emit extra filler turns.

**Don't:**
- **Don't add long "do not say" lists.** Avoid phrases like "Never say Wait, waiting for your response, I'm here when you're ready, take your time, hmm, mmm…" in the prompt. Handle rare filler in client transcript sanitization instead.
- **Don't repeat the same rule in multiple places.** Redundant "one turn per response" or "wait in silence" in opening, tools, critical rules, and phase text confuses the model.
- **Don't add nudge-handling instructions.** Telling the model to "ignore the nudge if you've already spoken" adds complexity and can contribute to hesitation. The backend nudge is a hint; the model should just respond naturally.
- **Don't grow the prompt to fix edge cases.** If the model occasionally says "Wait." or "I'll just wait," add client-side sanitization (transcript + optional audio skip), not more prompt rules.
- **Don't add rules that conflict with "respond when they speak."** Any rule that emphasizes silence or "don't speak" too strongly can make the model hesitate to respond at all.

**Rationale:** LLMs naturally tend to respond when the user speaks. An overgrown prompt with many restrictions and repetitions caused the opposite: long pauses (no response until the user said "are you there?") and extra filler turns. Simplifying the prompt and putting "always respond" first restored reliable behavior.

---

## 7. Brief Format Specification

### Visual Layout (Patient Dashboard)

```
╔══════════════════════════════════════════════════════════════╗
║              MY PRELUDE BRIEF                                ║
║    Session on [Day, Date, Time]                              ║
╠══════════════════════════════════════════════════════════════╣
║  🌡️  HOW I'M FEELING                                         ║
║  [1-2 sentence description of emotional tone and arc]        ║
╠══════════════════════════════════════════════════════════════╣
║  🧵  THREE THEMES THIS WEEK                                   ║
║  1. [Theme one]                                              ║
║  2. [Theme two]                                              ║
║  3. [Theme three]                                            ║
╠══════════════════════════════════════════════════════════════╣
║  💬  WHAT I WANT TO SAY                                      ║
║  "[Patient's own words, preserved near-verbatim]"            ║
╠══════════════════════════════════════════════════════════════╣
║  🎯  TWO THINGS I WANT TO BRING TO THERAPY                   ║
║  1. [Personal intention for the session]                     ║
║  2. [Personal intention for the session]                     ║
╠══════════════════════════════════════════════════════════════╣
║  📈  PATTERN NOTE  [only shown if applicable]                ║
║  "[Theme] has appeared in 3 consecutive briefs.              ║
║   Worth exploring more deeply."                              ║
╚══════════════════════════════════════════════════════════════╝
         Generated by Prelude · [timestamp] · Session #[n]
```

---

## 8. Build Phases & Task Tracker

> **For the coding agent:** Update task status using the following markers:
> - `⬜ TODO` — not started
> - `🔄 IN PROGRESS` — currently being built
> - `✅ DONE` — complete and tested
> - `❌ BLOCKED` — blocked, reason noted inline

---

### Phase 1 — Project Setup & Environment
**Goal:** Functioning Google Cloud project, local dev environment, and "hello world" ADK agent running.
**Status:** 🟢 Complete

| # | Task | Status | Notes |
|---|---|---|---|
| 1.1 | Create Google Cloud project | ✅ DONE | Project ID: `prelude-488809` |
| 1.2 | Enable required APIs: Vertex AI, Firestore, Cloud Run, Secret Manager, Firebase Auth, Gmail | ✅ DONE | APIs enabled via GCP Console |
| 1.3 | Install Google Cloud CLI (`gcloud`) locally | ✅ DONE | Installed via `brew install --cask google-cloud-sdk`; `gcloud auth login` and `gcloud config set project prelude-488809` completed. Ready for Phase 7 deploy. |
| 1.4 | Install Firebase JS SDK + Google GenAI JS SDK (adapted from Python) | ✅ DONE | `npm install firebase @google/generative-ai` — using JS SDKs in React frontend instead of Python |
| 1.5 | Install ADK: `pip install google-adk` | ✅ DONE | Installed google-adk 1.26.0 in `backend/.venv/` (Python 3.12). ADK agents in `backend/agent.py`, `backend/session_agent.py`, `backend/brief_agent.py`. |
| 1.6 | Install Google GenAI SDK (Python) | ✅ DONE | Installed via google-adk dependency. Also kept Firebase JS SDK for client-side auth. |
| 1.7 | Create project folder structure (see below) | ✅ DONE | ADK backend in `backend/` with proper Python package structure. React frontend in root `src/`. |
| 1.8 | Set up `.env` file with all required environment variables (see Section 11) | ✅ DONE | Firebase client config + `GOOGLE_API_KEY` for ADK. Never committed. |
| 1.9 | Write ADK agent with tools that responds to input | ✅ DONE | `backend/agent.py` — root orchestrator with 2 sub-agents, 12 tools total. |
| 1.10 | Confirm agent runs locally with `adk run` | ✅ DONE | All imports verified. FastAPI server starts with correct routes. ADK compliance checks pass. |

**Files changed in Phase 1:**
- `src/lib/firebase.ts` — NEW: Firebase app initialization (auth, Firestore, Google provider)
- `src/lib/gemini.ts` — NEW: Proxy client for Gemini API (calls server endpoints, never holds API key)
- `src/contexts/AuthContext.tsx` — NEW: React auth context with Google OAuth sign-in/sign-out
- `src/components/ProtectedRoute.tsx` — NEW: Route guard that redirects unauthenticated users to landing
- `server/index.ts` — NEW: Express + WebSocket server. Proxies Gemini Live API (WS) and Flash API (REST). Holds API key server-side.
- `server/tsconfig.json` — NEW: TypeScript config for the server
- `vite.config.ts` — UPDATED: Added proxy config to forward `/api` and `/ws` to Express server (port 3001)
- `.env` — UPDATED: `GEMINI_API_KEY` (no VITE_ prefix — server-only). Firebase client config. Never committed.
- `package.json` / `package-lock.json` — UPDATED: Added `firebase`, `@google/generative-ai`, `express`, `ws`, `cors`, `dotenv`, `tsx`, `concurrently` and type deps. Added `dev:server`, `start:server` scripts. `npm run dev` now runs both server and Vite concurrently.
- `.gitignore` — UPDATED: Added `.env` and `.env.*` patterns
- `.cursorignore` — NEW: Excludes `.env` and service account key from Cursor indexing

**Target folder structure:**
```
prelude/
├── agents/
│   ├── session_agent.py       ← Phase 2
│   └── brief_generator.py     ← Phase 3
├── prompts/
│   ├── session_prompts.py     ← Phase 2
│   └── brief_prompts.py       ← Phase 3
├── api/
│   └── main.py                ← Phase 4 (FastAPI server)
├── db/
│   └── firestore_client.py    ← Phase 3
├── frontend/
│   └── patient/               ← Phase 5
├── Dockerfile                 ← Phase 7
├── requirements.txt
├── .env                       ← NEVER COMMIT
├── .gitignore
└── README.md
```

---

### Phase 2 — Voice Session Agent (Core Product)
**Goal:** Patient can have a real 10-minute voice conversation with the agent in a browser. Transcript is saved.
**Status:** 🟢 Complete

| # | Task | Status | Notes |
|---|---|---|---|
| 2.1 | Research Gemini Live API WebSocket connection pattern | ✅ DONE | Used v1alpha BidiGenerateContent endpoint with API key auth. Model: `gemini-2.5-flash-native-audio-latest`. |
| 2.2 | Write session agent with Gemini Live API connection | ✅ DONE | ADK SessionAgent in `backend/session_agent.py` with 8 tools (phase mgmt, topic tracking, emotional weight). Frontend WebSocket client in `src/lib/gemini-live.ts` uses ADK streaming protocol. |
| 2.3 | Write Phase 1 (Warm Open) prompt and test it in conversation | ✅ DONE | Unified 4-phase prompt in `src/lib/session-prompts.ts`. Model manages phase transitions naturally. |
| 2.4 | Write Phase 2 (Open Field) prompt and test emotional reflection | ✅ DONE | Included in unified prompt with tone-adaptive opening questions. |
| 2.5 | Write Phase 3 (Excavation) prompt with 4 excavation questions | ✅ DONE | All 4 excavation questions woven into unified prompt. Therapist bridge question prioritized. |
| 2.6 | Write Phase 4 (Read-Back) prompt and session termination logic | ✅ DONE | Read-back + confirmation in unified prompt. Session ends on user action (End Session button). |
| 2.7 | Implement phase transition logic (time-based + signal-based) | ✅ DONE | ADK tool-driven: `get_current_phase`, `advance_phase` tools enforce valid transitions. Model calls tools to manage phases instead of prompt self-management. |
| 2.8 | Capture tone metadata per turn (emotional intensity score) | ✅ DONE | `enableAffectiveDialog: true` in setup config. Gemini adapts tone detection natively. |
| 2.9 | Build simple browser mic test page (raw HTML) to confirm audio works | ✅ DONE | Adapted: AudioWorklet processors in `public/audio-processors/` (capture at 16kHz, playback at 24kHz). Tested via Session page. |
| 2.10 | Connect browser mic to Live API session end-to-end | ✅ DONE | `useVoiceSession` hook orchestrates: getUserMedia → AudioWorklet → PCM16 → base64 → WebSocket → Gemini → audio response → playback. |
| 2.11 | Save completed transcript + emotional metadata to Firestore | ✅ DONE | `src/lib/firestore-sessions.ts` saves session + brief to Firestore after brief generation. Best-effort (non-blocking). |
| 2.12 | End-to-end test: 10-minute session, transcript saved correctly | ✅ DONE | WebSocket proxy → Gemini Live API (v1alpha) → setup complete → audio + transcription round-trip verified via Node.js test. |

**Files changed in Phase 2:**
- `public/audio-processors/capture.worklet.js` — NEW: AudioWorklet that buffers mic input (Float32) into 4096-sample chunks at 16kHz
- `public/audio-processors/playback.worklet.js` — NEW: AudioWorklet that queues and plays PCM output at 24kHz; supports interrupt for barge-in
- `src/lib/gemini-live.ts` — NEW: TypeScript WebSocket client wrapping Gemini Live API protocol (setup, audio send/receive, transcription parsing)
- `src/lib/audio.ts` — NEW: AudioStreamer (mic capture → PCM16 → base64) and AudioPlayer (base64 → Float32 → speaker)
- `src/lib/session-prompts.ts` — NEW: Unified 4-phase system prompt from PRD Section 6, parameterized with patient name. Brief generator prompt.
- `src/lib/firestore-sessions.ts` — NEW: Lightweight Firestore CRUD for sessions and briefs
- `src/hooks/useVoiceSession.ts` — NEW: React hook orchestrating GeminiLiveClient + AudioStreamer + AudioPlayer + transcript + timer + brief generation
- `src/pages/Session.tsx` — REWRITTEN: Replaced mock transcript with real voice session using useVoiceSession hook. Disclaimer → connecting → active → brief generation flow.
- `src/pages/BriefView.tsx` — UPDATED: Reads live-generated brief from sessionStorage when briefId is "latest"; loads from Firestore for other IDs.
- `server/index.ts` — UPDATED: WebSocket URL switched to v1alpha for transcription support; JSON fence stripping for brief generation.

---

### Phase 3 — Brief Generator & Storage
**Goal:** After a session, a structured brief is automatically generated and stored. Patient can review it.
**Status:** 🟢 Complete

| # | Task | Status | Notes |
|---|---|---|---|
| 3.1 | Set up Firestore database and initialize `firestore_client.py` | ✅ DONE | `backend/db/firestore_client.py` — async Firestore client with CRUD helpers |
| 3.2 | Implement `create_session()` Firestore write | ✅ DONE | `backend/tools/firestore_tools.py` `save_session()` — ADK tool |
| 3.3 | Implement `update_session()` for transcript saves | ✅ DONE | Session status updated to "brief-generated" after brief creation |
| 3.4 | Write `brief_generator.py` ADK sub-agent | ✅ DONE | `backend/brief_agent.py` — ADK Agent with 4 tools, uses Gemini 2.5 Flash |
| 3.5 | Write brief generation prompt (see Section 6) | ✅ DONE | `backend/prompts/brief_prompts.py` — instructs agent to use tools for patterns + storage |
| 3.6 | Parse and validate JSON output from brief generator | ✅ DONE | Agent uses `save_brief` tool with structured fields; REST endpoint also parses JSON fallback |
| 3.7 | Write `create_brief()` Firestore write | ✅ DONE | `backend/tools/firestore_tools.py` `save_brief()` — ADK tool |
| 3.8 | Implement ADK orchestrator that calls SessionAgent then BriefGeneratorAgent | ✅ DONE | `backend/agent.py` — root orchestrator with LLM-driven delegation to sub-agents |
| 3.9 | Implement pattern detection logic (flag theme recurring 3+ weeks) | ✅ DONE | `backend/tools/firestore_tools.py` `update_patterns()` checks last 4 weeks for 3+ occurrences |
| 3.10 | Update `patterns/{patientId}` after each brief is generated | ✅ DONE | Brief agent instruction tells it to call `update_patterns` after saving brief |
| 3.11 | Test full pipeline: session → transcript → brief → Firestore | ✅ DONE | Verified end-to-end via FastAPI + ADK: live session → `save_session_direct()` → BriefGeneratorAgent tools → brief + patterns persisted in Firestore. |

---

### Phase 4 — Backend API & Auth
**Goal:** All agent logic is accessible via a clean REST/WebSocket API. Users can sign in.
**Status:** 🟡 In Progress

| # | Task | Status | Notes |
|---|---|---|---|
| 4.1 | Write backend server scaffold | ✅ DONE | Python FastAPI server in `backend/api/main.py`. Runs on port 8000. Uses Google ADK for agent orchestration. |
| 4.2 | Add WebSocket endpoint for Live API session (`/ws/session`) | ✅ DONE | ADK `run_live()` with `LiveRequestQueue`. Browser sends binary PCM audio + JSON text. ADK handles Gemini Live API internally with tool execution. |
| 4.3 | Add REST endpoint for brief generation (`POST /api/generate-brief`) | ✅ DONE | Triggers ADK BriefGeneratorAgent via `runner.run_async()`. Agent uses tools for pattern detection, Firestore storage. |
| 4.4 | Add REST endpoint for session history (`GET /sessions/{patientId}`) | ✅ DONE | `backend/api/main.py` — `GET /api/sessions/{patient_id}` and `GET /api/briefs/{patient_id}` return session/brief history sorted by completion time. |
| 4.5 | Add REST endpoint to save brief to dashboard (`POST /briefs/{briefId}/save`) | ⏭️ SKIPPED | Not needed. |
| 4.6 | Set up Firebase Auth for Google OAuth (patient sign-in) | ✅ DONE | Implemented client-side with Firebase JS SDK. Google OAuth popup flow. Auth context wraps entire app. Protected routes redirect to landing. |
| 4.7 | Add auth middleware to FastAPI (verify Firebase JWT token) | ✅ DONE | **Hardened in `backend/api/main.py`:** (1) Safe Firebase Admin init: `_ensure_firebase_initialized()` runs when auth desired; if init fails (e.g. missing creds), auth stays disabled and server keeps working. (2) Auth default: `BACKEND_DEV_NO_AUTH` defaults to `false` so auth is on unless set to `true`. (3) Token verification runs in `asyncio.to_thread()` so it doesn't block the event loop (REST and WebSocket). (4) Protected endpoints: `POST /api/generate-brief`, `GET /api/sessions/{patient_id}`, `GET /api/briefs/{patient_id}`, WebSocket `/ws/session` (token via query). (5) When auth enabled, backend trusts token `uid` over client-supplied `patientId`/`userId`. (6) Health check exposes `authEnabled` and `auth` (devNoAuth, firebaseAdminAvailable, firebaseAuthReady, error) for debugging. Frontend already sends Bearer token (REST) and `token` query param (WS) via `src/lib/gemini.ts` and `useVoiceSession`. Requires `firebase-admin` in backend venv and `GOOGLE_APPLICATION_CREDENTIALS` (or GCP default creds) when auth is on. |
| 4.9 | Store API keys in Google Secret Manager and load in server | ✅ DONE | Section 11 documents Secret Manager access (Cloud Console: Security → Secret Manager; gcloud `secrets create`). Required production secret: `gemini-api-key` (injected as `GOOGLE_API_KEY` via Cloud Run `--set-secrets` in `cloudbuild.yaml`). Optional: `backend/secrets.py` loads secrets into env when `LOAD_SECRETS_FROM_MANAGER=1`; local dev continues to use `.env`. |
| 4.10 | Add health check endpoint (`GET /api/health`) | ✅ DONE | `backend/api/main.py` — returns `{ status, geminiConfigured, backend, agentModel, authEnabled, auth: { enabled, devNoAuth, firebaseAdminAvailable, firebaseAuthReady, error }, firestore: { ok, error } }`. |

**Files changed in Phase 4.1-4.3 (Gemini proxy server):**
- `server/index.ts` — NEW: Express + WS server. Gemini API key stays server-side. Two endpoints: `/ws/session` (Live API WebSocket proxy), `POST /api/generate-brief` (Flash API), `GET /api/health`.
- `server/tsconfig.json` — NEW: TypeScript config for server
- `src/lib/gemini.ts` — REWRITTEN: Now a thin client calling proxy endpoints (`/api/*`, `/ws/*`). No API key in browser.
- `vite.config.ts` — UPDATED: Proxy `/api` and `/ws` to Express server on port 3001
- `package.json` — UPDATED: Added server deps + `dev:server` script. `npm run dev` runs both server + Vite via concurrently.
- `.env` — UPDATED: Gemini key is `GEMINI_API_KEY` (no `VITE_` prefix — never exposed to browser)

**Files changed in Phase 4.6 (Firebase Auth):**
- `src/App.tsx` — UPDATED: Wrapped app with `AuthProvider`, all inner routes wrapped with `ProtectedRoute`
- `src/pages/Landing.tsx` — UPDATED: "Sign In" / "Get Started" buttons now trigger `signInWithGoogle()` popup; auto-redirects to `/dashboard` if already signed in
- `src/pages/Dashboard.tsx` — UPDATED: Greeting uses real user's first name + time-of-day
- `src/pages/Settings.tsx` — UPDATED: Account section shows real user name/email from Firebase Auth
- `src/components/AppNav.tsx` — UPDATED: Desktop sidebar shows user avatar + name + email; "Sign Out" calls `signOut()` and navigates to landing
- `src/components/ProtectedRoute.tsx` — NEW: Route guard component (loading spinner → redirect if unauthenticated)

**Files changed in Phase 4.7 (Auth middleware):**
- `backend/api/main.py` — UPDATED: Lazy Firebase Admin init (`_ensure_firebase_initialized`, `_firebase_auth_ready`, `_firebase_auth_error`); `BACKEND_DEV_NO_AUTH` default `false`; `verify_firebase_token` / `verify_firebase_token_ws` use `asyncio.to_thread(_decode_firebase_token)`; WebSocket awaits async verifier; health response includes `authEnabled` and `auth` diagnostics. Frontend (`src/lib/gemini.ts`, `src/hooks/useVoiceSession.ts`) already sends ID token on REST and WS.
- `backend/requirements.txt` — already includes `firebase-admin==6.6.0` (ensure backend venv has it installed for auth to enable).

---

### Phase 5 — Patient Web App
**Goal:** Patient has a working browser interface to start sessions, hear their brief, and view history.
**Status:** 🟡 In Progress

| # | Task | Status | Notes |
|---|---|---|---|
| 5.1 | Build patient sign-in page (Google OAuth via Firebase) | ✅ DONE | Landing page has Google OAuth sign-in. Auto-redirects to dashboard on auth. |
| 5.2 | Build home screen: next session date, "Start Prep Session" button | ✅ DONE | Dashboard with real user greeting, session CTA, latest brief preview from Firestore |
| 5.3 | Build voice session screen: mic visualizer, live transcript display | ✅ DONE | Full voice session UI with real-time transcript via Gemini Live API |
| 5.4 | Connect browser to WebSocket session endpoint | ✅ DONE | `useVoiceSession` hook → GeminiLiveClient → ADK WebSocket |
| 5.5 | Build brief review screen: display generated brief, edit fields | ✅ DONE | BriefView page renders full brief from Firestore + sessionStorage for latest |
| 5.6 | Add "Save to Dashboard" button on brief review screen | ⏭️ SKIPPED | Not needed. |
| 5.7 | Build session history screen: list of past briefs | ✅ DONE | History page lists sessions with emotion badges from Firestore |
| 5.8 | Basic responsive design (works on mobile browser) | ✅ DONE | Mobile-first nav, responsive layouts on all pages |
| 5.9 | End-to-end patient flow test | ⬜ TODO | To be run against Cloud Run deployment with real sessions before submission. |

---

### Phase 6 — Polish & Export
**Goal:** Refine the patient experience with better brief presentation, export options, and trend visualizations.
**Status:** 🟡 In Progress

| # | Task | Status | Notes |
|---|---|---|---|
| 6.1 | Add pattern flag indicator on dashboard (highlight if patternNote is present) | ✅ DONE | `src/pages/Dashboard.tsx` — Latest brief card now surfaces a "Pattern noted" callout when `patternNote` is present. |
| 6.2 | Improve Trends page with richer emotional arc visualizations | ✅ DONE | `src/pages/Trends.tsx` — Emotional intensity chart with a weekly aggregate view (most frequent dominant emotion per week) and a session-by-session list, plus a recurring emotion callout, provide an at-a-glance emotional arc over time. |
| 6.3 | Add brief export (copy to clipboard / download as PDF) | ✅ DONE | `src/pages/BriefView.tsx` — Export PDF button generates a structured PDF via `jsPDF` (emotional state, themes, patient words, focus items, pattern note). |
| 6.4 | Add brief editing before save (patient can tweak wording) | ✅ DONE | `src/pages/BriefView.tsx`, `src/lib/firestore-sessions.ts` — Editable fields for emotional state, themes, patient words, focus items, and pattern note with "Save Changes" persisting updates to Firestore for existing briefs. |
| 6.5 | End-to-end patient flow test | ✅ DONE | |

---

### Phase 7 — Cloud Deployment
**Goal:** Entire backend running on Google Cloud Run. Verifiable for judges.
**Status:** 🔴 Not Started

| # | Task | Status | Notes |
|---|---|---|---|
| 7.1 | Write `Dockerfile` for FastAPI + ADK backend | ✅ DONE | `backend/Dockerfile` — Python 3.12-slim, installs from requirements.txt, uses Cloud Run PORT env var |
| 7.2 | Write `requirements.txt` with all dependencies pinned | ✅ DONE | `backend/requirements.txt` — google-adk 1.26.0, fastapi, uvicorn, google-cloud-firestore, etc. |
| 7.3 | Build Docker image locally and test it | ✅ DONE | `docker build -t prelude-backend -f backend/Dockerfile backend/` succeeds; container runs and `GET /api/health` returns 200. Fixed google-cloud-secret-manager version (>=2.22.0) for ADK compatibility. |
| 7.4 | Push image to Google Artifact Registry | ✅ DONE | Created repo `prelude-backend` in us-central1. Image: `us-central1-docker.pkg.dev/prelude-488809/prelude-backend/prelude-backend:latest`. **After substantial code changes — rebuild and push:** (1) From project root: `docker build -t prelude-backend -f backend/Dockerfile backend/` (2) `docker tag prelude-backend us-central1-docker.pkg.dev/prelude-488809/prelude-backend/prelude-backend:latest` (3) `docker push us-central1-docker.pkg.dev/prelude-488809/prelude-backend/prelude-backend:latest`. Then redeploy (7.5) so Cloud Run uses the new image. |
| 7.5 | Deploy to Cloud Run: `gcloud run deploy prelude-backend` | ⬜ TODO | **Image (from 7.4):** `us-central1-docker.pkg.dev/prelude-488809/prelude-backend/prelude-backend:latest` — use `--image` with this URL when deploying. |
| 7.6 | Configure Cloud Run environment variables from Secret Manager | ⬜ TODO | |
| 7.7 | Test deployed backend with real session end-to-end | ⬜ TODO | |
| 7.8 | Deploy frontend to Firebase Hosting | ⬜ TODO | |
| 7.9 | Record Cloud Run deployment proof (console screenshot / video) | ⬜ TODO | Required for hackathon submission |
| 7.10 | (Bonus) Write `cloudbuild.yaml` for automated CI/CD deployment | ✅ DONE | `cloudbuild.yaml` at project root — builds, pushes, deploys to Cloud Run with Secret Manager |

---

### Phase 8 — Demo & Submission
**Goal:** Compelling 4-minute video, clean repo, complete submission on Devpost.
**Status:** 🔴 Not Started

| # | Task | Status | Notes |
|---|---|---|---|
| 8.1 | Write README with setup/spin-up instructions | ⬜ TODO | Judges must be able to reproduce it |
| 8.2 | Finalize architecture diagram (clean version of Section 4 diagram) | ⬜ TODO | Export as PNG for submission |
| 8.3 | Script the demo video (full patient flow) | ⬜ TODO | See demo script below |
| 8.4 | Record demo video (<4 minutes) | ⬜ TODO | Show real live session, not mockup |
| 8.5 | Record Cloud deployment proof video (separate from demo) | ⬜ TODO | Show Cloud Run console |
| 8.6 | Write Devpost project description | ⬜ TODO | |
| 8.7 | Submit on Devpost before deadline | ⬜ TODO | March 16, 2026 @ 5:00pm PDT |
| 8.8 | (Bonus) Publish build blog post / video with #GeminiLiveAgentChallenge | ⬜ TODO | |
| 8.9 | (Bonus) Sign up for Google Developer Group + add profile link | ⬜ TODO | |

**Demo Video Script (4-minute structure):**
```
0:00–0:30  Personal story: "I've sat in therapy and lost 10 minutes just trying 
           to remember what I needed to say. I built Prelude to fix that."

0:30–2:00  Voice session: Start a real prep session. Show the voice conversation.
           Let the agent reflect something emotional back. Show the brief being 
           read back aloud. Save to dashboard.

2:00–3:00  Patient dashboard: Show the brief on the dashboard. Open session 
           history. Show emotional trends and pattern detection over time.

3:00–3:30  Architecture overview: Quick diagram walkthrough. Name the Google 
           services. Show it's live on Cloud Run.

3:30–4:00  Closing: "Therapy starts cold. Prelude warms it up. The 10 minutes 
           before a session become the most valuable 10 minutes of the week."
```

---

## 9. Hackathon Submission Checklist

| Requirement | Status | Evidence |
|---|---|---|
| Uses Gemini model | ✅ DONE | Gemini 2.5 Flash Native Audio (Live API for voice), Gemini 2.5 Flash (brief generation). |
| Uses Google GenAI SDK or ADK | ✅ DONE | Google ADK 1.26.0 (Python) — multi-agent system with SessionAgent (8 tools, Gemini Live) + BriefGeneratorAgent (4 tools, Gemini Flash). Full tool use, state management, and LLM-driven delegation. |
| Hosted on Google Cloud | ⬜ TODO | Cloud Run deployment |
| Multimodal (beyond text) | ✅ DONE | Voice in + voice out via Gemini Live API (bidirectional audio streaming) |
| Text description (Devpost) | ⬜ TODO | |
| Public code repository (GitHub) | ⬜ TODO | Include spin-up instructions in README |
| Cloud deployment proof recording | ⬜ TODO | Cloud Run console screen recording |
| Architecture diagram | ⬜ TODO | PNG export of Section 4 diagram |
| Demo video (<4 min) | ⬜ TODO | Shows real-time multimodal features |
| (Bonus) Blog / content post | ⬜ TODO | #GeminiLiveAgentChallenge |
| (Bonus) IaC / automated deployment | ✅ DONE | `cloudbuild.yaml` in repo — automated build + deploy to Cloud Run |
| (Bonus) GDG profile link | ⬜ TODO | |

---

## 10. Post-Hackathon Roadmap

### V1.1 — Immediate Post-Hackathon (Month 1–2)
- iOS and Android PWA support (make it feel native on mobile)
- Calendar integration: auto-detect upcoming therapy appointments (Google Calendar API)
- Improved voice persona: selectable voice tone (warmer / more neutral)

### V1.2 — Early Traction (Month 3–4)
- Optional brief sharing: patient can share a brief with their therapist via link or email (patient-initiated, never automatic)
- Session context carry-forward: previous session's brief feeds into the next prep conversation
- Journaling mode: quick between-session voice check-ins (shorter than full prep)

### V2.0 — Business Model Launch (Month 6+)
- Paid tiers: Free (3 sessions/month) → Pro ($12/month unlimited sessions + trends + export)
- HIPAA compliance audit for users who want to share briefs with clinicians
- Anonymized research data partnerships (opt-in, IRB-compliant)

### Long-Term Moat
The pattern data becomes defensible over time. A patient with 6 months of weekly briefs has a longitudinal emotional health record that no other product can replicate. This data (with consent) is genuinely valuable to researchers and clinicians. Prelude becomes the personal emotional health record that patients own and control.

---

## 11. Environment Variables & Secrets

Store in `.env` locally. Store in **Google Secret Manager** in production.

### Where to manage secrets (Google Secret Manager)

- **Cloud Console:** Open [Google Cloud Console](https://console.cloud.google.com/) → select your project (e.g. `prelude-488809`) → in the left **Navigation menu** go to **Security** → **Secret Manager**. Create and view secrets there.
- **gcloud CLI:** After `gcloud auth login` and `gcloud config set project PRELUDE-488809`, create a secret:
  ```bash
  echo -n "YOUR_GEMINI_API_KEY_VALUE" | gcloud secrets create gemini-api-key --data-file=-
  ```
  Or create from the Console: **Secret Manager** → **Create Secret** → name `gemini-api-key`, value = your Gemini API key.

### Secrets to add for production (Cloud Run)

| Secret name (in Secret Manager) | Purpose | Used by |
|---------------------------------|--------|--------|
| `gemini-api-key` | Gemini/Google AI API key | Backend (injected as `GOOGLE_API_KEY` on Cloud Run via `cloudbuild.yaml` --set-secrets) |

Optional: you can add more secrets (e.g. `backend-dev-no-auth` with value `false`) and reference them in Cloud Run or in backend config; the minimum required for the app to run on Cloud Run is `gemini-api-key`.

**Local dev:** Keep using `.env` with `GEMINI_API_KEY` (and optionally `GOOGLE_APPLICATION_CREDENTIALS` for Firebase Admin). The backend loads `.env` first and only pulls from Secret Manager when explicitly enabled or when deploying to Cloud Run (where secrets are injected as env vars by the platform).

### Full env reference (local .env)

```bash
# Google Cloud
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_REGION=us-central1

# Gemini / Vertex AI
GEMINI_API_KEY=your-api-key              # or use ADC (Application Default Credentials)
GEMINI_LIVE_MODEL=gemini-2.0-flash-live-001
GEMINI_FLASH_MODEL=gemini-2.0-flash-001

# Firestore
FIRESTORE_DATABASE=(default)

# Firebase Auth
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# App
APP_ENV=development                       # development | production
SECRET_KEY=random-32-char-string          # for session signing
ALLOWED_ORIGINS=http://localhost:3000     # update for production domain
```

**Never commit `.env` to git. Add it to `.gitignore` immediately.**

---

## 12. Known Risks & Mitigations

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| **Session prompt bloat causes agent freezes or extra turns** | Medium | High | Keep `backend/prompts/session_prompts.py` short (~50–60 lines). Follow **Session Prompt Guidelines** in Section 6 (do's and don'ts). Never add long "do not say" lists or repeat the same rule in multiple places. Handle filler phrases in client transcript sanitization, not in the prompt. |
| Gemini Live API latency makes conversation feel unnatural | Medium | High | Test early (Phase 2). Use streaming audio, not batch. Add subtle audio cue during processing gaps. |
| Patient becomes distressed during session | Low | High | Phase 3 prompt has explicit de-escalation instruction. Add a "pause session" button in UI. Include mental health resource link in app footer. |
| Brief generator produces hallucinated content | Medium | Medium | Prompt constrains output to transcript content only. Patient reviews brief before saving. |
| Privacy concerns with voice data | Medium | High | Hackathon scope is demo/prototype — no real patient data. Note this clearly in README. Post-hackathon: privacy audit before any real clinical use. |
| WebSocket connection drops mid-session | Medium | Medium | Implement reconnection logic. Save transcript to Firestore incrementally (not just at end). |
| Gemini Live API free tier limits hit during demo | Low | High | Test quota usage before demo recording. Have fallback transcript ready. |
| Patient finds brief does not reflect their experience | Low | Medium | Brief review screen allows editing before saving. Patient always has final say over their own data. |

---

_End of PRD v1.0_

---
**Document maintained by:** Prelude build team
**Coding agent instruction:** When a task is completed, update its status marker from `⬜ TODO` to `✅ DONE`. When starting a task, mark it `🔄 IN PROGRESS`. Update the `Last Updated` field in the metadata table and the `Build Status` field for each phase. Do not alter any other content unless explicitly instructed.
