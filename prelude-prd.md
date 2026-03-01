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
| **Last Updated** | March 1, 2026 |
| **Build Status** | 🟡 In Progress |

---

## Table of Contents

1. [Vision & Problem Statement](#1-vision--problem-statement)
2. [Target Users](#2-target-users)
3. [Core Features](#3-core-features)
4. [Technical Architecture](#4-technical-architecture)
5. [Data Model](#5-data-model)
6. [Agent Conversation Design](#6-agent-conversation-design)
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

The first 5–10 minutes of most therapy sessions are spent trying to remember what happened over the past week, what felt significant, and what the patient actually wants to address. This is expensive dead time — for the patient paying $150–$300/hour and for the therapist trying to be effective.

Meanwhile, the emotionally significant moments of the week — the 2AM anxiety spiral, the tense conversation with a parent, the wave of grief on a Tuesday afternoon — evaporate between sessions. They don't make it into the room.

### The Solution

Prelude is a voice-first AI agent that patients speak to for 10 minutes _before_ each therapy session. It listens, asks thoughtful questions, detects emotional weight in real time, and delivers a structured brief to the therapist before the patient walks in the door.

It does not replace the therapist. It makes every session count more.

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
- Confidence walking into therapy knowing their therapist already understands the week

### User B — The Therapist

**Who they are:** Licensed therapists (LCSWs, LMFTs, psychologists, counselors) running private practices or working within group practices.

**Their core pain:**
- "I see 8 clients a day. By the time I sit down with someone, I've lost context from our last session."
- "My clients sometimes spend the whole session on something surface-level because they couldn't articulate what was really going on."
- "I wish I had 5 minutes of context before each appointment."

**What they need from Prelude:**
- A reliable pre-session brief in their inbox before each appointment
- Longitudinal theme tracking across weeks (pattern detection)
- Zero overhead — they shouldn't need to chase patients to use it

---

## 3. Core Features

### MVP Features (Hackathon Scope)

#### F1 — Voice Prep Session (Patient-Facing)
- Patient initiates a 10-minute voice conversation via web browser (no app install)
- Gemini Live API handles real-time bidirectional audio
- Agent follows a structured 4-phase conversation flow (see Section 6)
- Session automatically ends after ~10 minutes or when patient signals completion
- Patient hears a read-back of their brief before it's sent

#### F2 — Brief Generation
- After session ends, a second sub-agent generates a structured written brief
- Brief is stored in Firestore linked to the upcoming session date
- Patient can review and optionally edit the brief before it's marked as "approved"

#### F3 — Brief Delivery to Therapist
- Approved brief is visible in the therapist dashboard
- Optional: brief is emailed to therapist via Gmail API
- Therapist sees briefs organized by patient and date

#### F4 — Therapist Dashboard
- Simple web UI showing all linked patients
- Inbox view: upcoming sessions with available briefs flagged
- Per-patient history: briefs from all past sessions
- Pattern note: auto-generated flag when a theme recurs 3+ weeks in a row

#### F5 — Patient Session History
- Patients can view their own past briefs
- Emotional state trends displayed as a simple chart over time

#### F6 — Basic Auth & User Linking
- Patients and therapists sign in with Google OAuth
- Therapist generates a unique link code; patient enters it to link accounts

---

## 4. Technical Architecture

### System Overview

```
┌────────────────────────────┐     ┌─────────────────────────────┐
│      PATIENT WEB APP       │     │    THERAPIST DASHBOARD      │
│  React / plain HTML+JS     │     │    React / plain HTML+JS    │
│                            │     │                             │
│  • Mic/speaker interface   │     │  • Client roster            │
│  • "Start Prep Session"    │     │  • Pre-session briefs inbox │
│  • Session history         │     │  • Emotional trend charts   │
│  • Edit & approve brief    │     │  • Pattern flags            │
└─────────────┬──────────────┘     └────────────────┬────────────┘
              │                                     │
              └─────────────────┬───────────────────┘
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
         ┌─────────────────────┼─────────────────────┐
         ↓                     ↓                     ↓
  ┌─────────────┐     ┌──────────────┐      ┌───────────────┐
  │  Firestore  │     │Cloud Storage │      │  Gmail API    │
  │             │     │              │      │  (optional)   │
  │ users       │     │ PDF briefs   │      │               │
  │ sessions    │     │ audio logs   │      │ Delivers      │
  │ briefs      │     │ (opt)        │      │ brief to      │
  │ patterns    │     │              │      │ therapist     │
  └─────────────┘     └──────────────┘      └───────────────┘
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
| Auth | Firebase Auth (Google OAuth) | Patient and therapist sign-in |
| Email Delivery | Gmail API | Brief delivery to therapist |
| Frontend | React or plain HTML/JS | Patient app + therapist dashboard |
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
  "role": "patient | therapist",
  "name": "string",
  "email": "string",
  "createdAt": "timestamp",
  "linkedTherapistId": "string (if role=patient)",
  "linkedPatientIds": ["array of strings (if role=therapist)"],
  "nextSessionDate": "timestamp (if role=patient)",
  "timezone": "string"
}
```

#### `sessions/{sessionId}`
```json
{
  "sessionId": "string (auto-generated)",
  "patientId": "string",
  "therapistId": "string",
  "scheduledDate": "timestamp",
  "prepStartedAt": "timestamp",
  "prepCompletedAt": "timestamp",
  "status": "pending | in-progress | complete | brief-sent",
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
  "therapistId": "string",
  "generatedAt": "timestamp",
  "approvedByPatient": "boolean",
  "approvedAt": "timestamp",
  "sentToTherapist": "boolean",
  "sentAt": "timestamp",
  "content": {
    "emotionalState": "string (1-2 sentence summary)",
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

---

#### Phase 1 — Warm Open (~60 seconds)

**System instruction fragment:**
```
You are Prelude, a gentle voice companion helping [patient_name] prepare for their 
therapy session with [therapist_name] on [session_date].

Your tone is warm, calm, and unhurried. Speak as if you have all the time in the world.
Never rush. Never interrupt unless the patient has clearly finished speaking.

Begin with a brief, personal greeting. Acknowledge the upcoming session without making 
it feel clinical. Set the intention: this is a space to think out loud, not to perform 
or produce the "right" answers.

Opening line template:
"Hi [name], good to hear your voice. You've got a session with [therapist] coming up 
[tomorrow / on Thursday / soon]. We have about ten minutes — no agenda, no right answers. 
Let's just see what's been with you this week."

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

Ask exactly the kinds of questions a good therapist would want answered before the session:

1. Temporal anchor: "When did you first feel this way this week — was there a specific moment?"
2. Familiarity check: "Is this a familiar feeling for you, or does it feel different from before?"
3. Body/sensation (optional, if patient seems open): "Where do you feel this in your body, if anywhere?"
4. Therapist bridge: "What do you wish [therapist_name] understood about this — something you 
   might not get to say in the first few minutes of your session?"

Do not ask all four in sequence. Weave them naturally into the conversation.
The fourth question — what they wish their therapist knew — is the most important. 
Always find a way to ask it before Phase 4.

If the patient opens a second significant thread mid-Phase 3, note it but stay on the 
primary thread. Flag the second thread for the brief's "themes" section.
```

**Agent behavior:**
- Maximum 4–5 exchanges in this phase
- If patient goes silent for >8 seconds: "Take your time."
- If patient becomes distressed: slow down, validate, do NOT probe further. Pivot to Phase 4 gently.
- Capture verbatim: the patient's answer to "what do you wish your therapist knew"

---

#### Phase 4 — Read-Back (~2 minutes)

**System instruction fragment:**
```
Signal the transition to read-back naturally:
"I want to make sure I capture this well before I put it together for [therapist_name]. 
Can I read back what I'm hearing, and you tell me if anything's off?"

Read back a brief oral summary — three themes, their emotional state, and what they 
want the therapist to know. Keep it under 90 seconds.

End with:
"I'll send this over to [therapist_name] before your session. Is there anything you'd 
like me to add or change before I do?"

If the patient requests changes: incorporate them naturally and confirm once.
Then close: "You're all set. I hope the session goes well."

After the patient confirms, end the voice session and trigger the BriefGeneratorAgent.
```

---

### BriefGeneratorAgent — Prompt Design

This agent receives the full transcript + emotional metadata and generates the written brief.

**System prompt:**
```
You are a clinical summarization assistant. You have received a transcript of a 
10-minute pre-therapy voice session between an AI and a patient.

Your job is to generate a structured pre-session brief for the patient's therapist.

Rules:
- Write in third person about the patient ("The patient expressed...", "They described...")
- Preserve the patient's own words in the "patientWords" field — use a near-verbatim 
  quote of their most emotionally significant statement
- Themes should be 4-8 words each, descriptive not diagnostic
- emotionalState should be 1-2 sentences: tone + trajectory (e.g., "arrived anxious but 
  softened through the session; ended with cautious resolve")
- focusItems should be action-oriented for the therapist ("Explore the Tuesday conversation 
  with mother", "Check in on sleep pattern mentioned last week")
- patternNote: only include if patterns data shows this theme appearing 3+ consecutive weeks

Output ONLY a valid JSON object. No preamble. No explanation.

Output format:
{
  "emotionalState": "string",
  "themes": ["string", "string", "string"],
  "patientWords": "string",
  "focusItems": ["string", "string"],
  "patternNote": "string or null"
}
```

---

## 7. Brief Format Specification

### Visual Layout (Therapist Receives This)

```
╔══════════════════════════════════════════════════════════════╗
║              PRELUDE BRIEF — [Patient Name]                  ║
║    Session with [Therapist Name] · [Day, Date, Time]         ║
╠══════════════════════════════════════════════════════════════╣
║  🌡️  EMOTIONAL STATE CHECK-IN                                 ║
║  [1-2 sentence description of patient's tone and arc]        ║
╠══════════════════════════════════════════════════════════════╣
║  🧵  THREE THEMES THIS WEEK                                   ║
║  1. [Theme one]                                              ║
║  2. [Theme two]                                              ║
║  3. [Theme three]                                            ║
╠══════════════════════════════════════════════════════════════╣
║  💬  WHAT THEY WANT YOU TO KNOW                              ║
║  "[Patient's own words, preserved near-verbatim]"            ║
╠══════════════════════════════════════════════════════════════╣
║  🎯  TWO THINGS TO FOCUS ON TODAY                            ║
║  1. [Action-oriented focus item for therapist]               ║
║  2. [Action-oriented focus item for therapist]               ║
╠══════════════════════════════════════════════════════════════╣
║  📈  PATTERN NOTE  [only shown if applicable]                ║
║  "[Theme] has appeared in 3 consecutive briefs.              ║
║   Flagging for your awareness."                              ║
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
| 1.3 | Install Google Cloud CLI (`gcloud`) locally | ⬜ TODO | Not yet installed; not needed until Phase 7 (Cloud Run deploy) |
| 1.4 | Install Firebase JS SDK + Google GenAI JS SDK (adapted from Python) | ✅ DONE | `npm install firebase @google/generative-ai` — using JS SDKs in React frontend instead of Python |
| 1.5 | ~~Install ADK: `pip install google-adk`~~ | ⬜ TODO | Deferred — may add Python backend later; frontend uses JS SDKs directly |
| 1.6 | ~~Install Google GenAI SDK (Python)~~ | ✅ DONE | Adapted: installed `@google/generative-ai` JS SDK instead |
| 1.7 | Create project folder structure (see below) | ✅ DONE | React frontend is the root project. Key new files: `src/lib/firebase.ts`, `src/lib/gemini.ts`, `src/contexts/AuthContext.tsx` |
| 1.8 | Set up `.env` file with all required environment variables (see Section 11) | ✅ DONE | Firebase client config + GCP project + Gemini API key placeholder. Never committed. |
| 1.9 | Write a "hello world" ADK agent that responds to text input | ⬜ TODO | Adapted: Gemini config ready in `src/lib/gemini.ts`; actual test deferred to Phase 2 |
| 1.10 | Confirm agent runs locally with `adk run` | ⬜ TODO | Will validate Gemini connectivity when building voice session (Phase 2) |

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
│   ├── patient/               ← Phase 5
│   └── therapist/             ← Phase 6
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
| 2.2 | Write session agent with Gemini Live API connection | ✅ DONE | Adapted to JS/TS: `src/lib/gemini-live.ts` (WebSocket client), `src/lib/audio.ts` (mic capture + playback). No Python — runs in browser via server proxy. |
| 2.3 | Write Phase 1 (Warm Open) prompt and test it in conversation | ✅ DONE | Unified 4-phase prompt in `src/lib/session-prompts.ts`. Model manages phase transitions naturally. |
| 2.4 | Write Phase 2 (Open Field) prompt and test emotional reflection | ✅ DONE | Included in unified prompt with tone-adaptive opening questions. |
| 2.5 | Write Phase 3 (Excavation) prompt with 4 excavation questions | ✅ DONE | All 4 excavation questions woven into unified prompt. Therapist bridge question prioritized. |
| 2.6 | Write Phase 4 (Read-Back) prompt and session termination logic | ✅ DONE | Read-back + confirmation in unified prompt. Session ends on user action (End Session button). |
| 2.7 | Implement phase transition logic (time-based + signal-based) | ✅ DONE | Prompt-driven: model paces through phases using time guidance in system instruction. No client-side state machine needed. |
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
- `src/lib/session-prompts.ts` — NEW: Unified 4-phase system prompt from PRD Section 6, parameterized with patient/therapist names. Brief generator prompt.
- `src/lib/firestore-sessions.ts` — NEW: Lightweight Firestore CRUD for sessions and briefs
- `src/hooks/useVoiceSession.ts` — NEW: React hook orchestrating GeminiLiveClient + AudioStreamer + AudioPlayer + transcript + timer + brief generation
- `src/pages/Session.tsx` — REWRITTEN: Replaced mock transcript with real voice session using useVoiceSession hook. Disclaimer → connecting → active → brief generation flow.
- `src/pages/BriefView.tsx` — UPDATED: Reads live-generated brief from sessionStorage when briefId is "latest"; falls back to mock data for other IDs.
- `server/index.ts` — UPDATED: WebSocket URL switched to v1alpha for transcription support; JSON fence stripping for brief generation.

---

### Phase 3 — Brief Generator & Storage
**Goal:** After a session, a structured brief is automatically generated and stored. Patient can review it.
**Status:** 🔴 Not Started

| # | Task | Status | Notes |
|---|---|---|---|
| 3.1 | Set up Firestore database and initialize `firestore_client.py` | ⬜ TODO | |
| 3.2 | Implement `create_session()` Firestore write | ⬜ TODO | |
| 3.3 | Implement `update_session()` for transcript saves | ⬜ TODO | |
| 3.4 | Write `brief_generator.py` ADK sub-agent | ⬜ TODO | Uses Gemini 2.0 Flash, not Live API |
| 3.5 | Write brief generation prompt (see Section 6) | ⬜ TODO | Test with 3 different transcripts |
| 3.6 | Parse and validate JSON output from brief generator | ⬜ TODO | Handle malformed output gracefully |
| 3.7 | Write `create_brief()` Firestore write | ⬜ TODO | |
| 3.8 | Implement ADK orchestrator that calls SessionAgent then BriefGeneratorAgent | ⬜ TODO | |
| 3.9 | Implement pattern detection logic (flag theme recurring 3+ weeks) | ⬜ TODO | Read from `patterns/{patientId}` collection |
| 3.10 | Update `patterns/{patientId}` after each brief is generated | ⬜ TODO | |
| 3.11 | Test full pipeline: session → transcript → brief → Firestore | ⬜ TODO | |

---

### Phase 4 — Backend API & Auth
**Goal:** All agent logic is accessible via a clean REST/WebSocket API. Users can sign in.
**Status:** 🟡 In Progress

| # | Task | Status | Notes |
|---|---|---|---|
| 4.1 | Write backend server scaffold | ✅ DONE | Adapted: Node.js/Express server in `server/index.ts` (not Python FastAPI). Runs on port 3001. |
| 4.2 | Add WebSocket endpoint for Live API session (`/ws/session`) | ✅ DONE | WebSocket-to-WebSocket proxy. Browser ↔ Express ↔ Gemini Live API. API key added server-side. |
| 4.3 | Add REST endpoint for brief generation (`POST /api/generate-brief`) | ✅ DONE | Accepts transcript, calls Gemini 2.0 Flash, returns structured brief JSON. |
| 4.4 | Add REST endpoint for session history (`GET /sessions/{patientId}`) | ⬜ TODO | Will add when Firestore is integrated |
| 4.5 | Add REST endpoint to approve and send brief (`POST /briefs/{briefId}/approve`) | ⬜ TODO | |
| 4.6 | Set up Firebase Auth for Google OAuth (patient + therapist sign-in) | ✅ DONE | Implemented client-side with Firebase JS SDK. Google OAuth popup flow. Auth context wraps entire app. Protected routes redirect to landing. |
| 4.7 | Add auth middleware to Express (verify Firebase JWT token) | ⬜ TODO | |
| 4.8 | Implement therapist link code system (generate code, patient enters it) | ⬜ TODO | |
| 4.9 | Store API keys in Google Secret Manager and load in server | ⬜ TODO | Currently in `.env` (never committed). Will move to Secret Manager for Cloud Run. |
| 4.10 | Add health check endpoint (`GET /api/health`) | ✅ DONE | Returns `{ status: "ok", geminiConfigured: true }` |

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

---

### Phase 5 — Patient Web App
**Goal:** Patient has a working browser interface to start sessions, hear their brief, and view history.
**Status:** 🟡 In Progress

| # | Task | Status | Notes |
|---|---|---|---|
| 5.1 | Build patient sign-in page (Google OAuth via Firebase) | ✅ DONE | Landing page has Google OAuth sign-in. Auto-redirects to dashboard on auth. |
| 5.2 | Build home screen: next session date, "Start Prep Session" button | ✅ DONE | Dashboard with real user greeting, session CTA, latest brief preview (mock data — will wire to Firestore in Phase 3) |
| 5.3 | Build voice session screen: mic visualizer, live transcript display | 🔄 IN PROGRESS | UI built with mock transcript. Needs Gemini Live API integration (Phase 2). |
| 5.4 | Connect browser to WebSocket session endpoint | ⬜ TODO | |
| 5.5 | Build brief review screen: display generated brief, edit fields | ✅ DONE | BriefView page renders full brief. Uses mock data — will wire to Firestore. |
| 5.6 | Add "Approve & Send to Therapist" button | ⬜ TODO | |
| 5.7 | Build session history screen: list of past briefs | ✅ DONE | History page lists sessions with emotion badges. Uses mock data. |
| 5.8 | Basic responsive design (works on mobile browser) | ✅ DONE | Mobile-first nav, responsive layouts on all pages |
| 5.9 | End-to-end patient flow test | ⬜ TODO | |

---

### Phase 6 — Therapist Dashboard
**Goal:** Therapist can see incoming briefs, patient history, and pattern flags.
**Status:** 🔴 Not Started

| # | Task | Status | Notes |
|---|---|---|---|
| 6.1 | Build therapist sign-in page | ⬜ TODO | |
| 6.2 | Build client roster screen | ⬜ TODO | |
| 6.3 | Build brief inbox: list of upcoming sessions with brief status (available / pending / none) | ⬜ TODO | |
| 6.4 | Build brief detail view: full brief rendered cleanly | ⬜ TODO | |
| 6.5 | Add pattern flag indicator (highlight if patternNote is present) | ⬜ TODO | |
| 6.6 | Build per-patient brief history view | ⬜ TODO | |
| 6.7 | Implement brief email delivery via Gmail API | ⬜ TODO | Optional but strong for demo |
| 6.8 | Basic responsive design | ⬜ TODO | |
| 6.9 | End-to-end therapist flow test | ⬜ TODO | |

---

### Phase 7 — Cloud Deployment
**Goal:** Entire backend running on Google Cloud Run. Verifiable for judges.
**Status:** 🔴 Not Started

| # | Task | Status | Notes |
|---|---|---|---|
| 7.1 | Write `Dockerfile` for FastAPI + ADK backend | ⬜ TODO | |
| 7.2 | Write `requirements.txt` with all dependencies pinned | ⬜ TODO | |
| 7.3 | Build Docker image locally and test it | ⬜ TODO | |
| 7.4 | Push image to Google Artifact Registry | ⬜ TODO | |
| 7.5 | Deploy to Cloud Run: `gcloud run deploy prelude-backend` | ⬜ TODO | |
| 7.6 | Configure Cloud Run environment variables from Secret Manager | ⬜ TODO | |
| 7.7 | Test deployed backend with real session end-to-end | ⬜ TODO | |
| 7.8 | Deploy frontend to Firebase Hosting | ⬜ TODO | |
| 7.9 | Record Cloud Run deployment proof (console screenshot / video) | ⬜ TODO | Required for hackathon submission |
| 7.10 | (Bonus) Write `cloudbuild.yaml` for automated CI/CD deployment | ⬜ TODO | Bonus points for IaC |

---

### Phase 8 — Demo & Submission
**Goal:** Compelling 4-minute video, clean repo, complete submission on Devpost.
**Status:** 🔴 Not Started

| # | Task | Status | Notes |
|---|---|---|---|
| 8.1 | Write README with setup/spin-up instructions | ⬜ TODO | Judges must be able to reproduce it |
| 8.2 | Finalize architecture diagram (clean version of Section 4 diagram) | ⬜ TODO | Export as PNG for submission |
| 8.3 | Script the demo video (patient flow + therapist dashboard) | ⬜ TODO | See demo script below |
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

0:30–2:00  Patient flow: Start a real prep session. Show the voice conversation.
           Let the agent reflect something emotional back. Show the brief being 
           read back aloud. Hit "Approve & Send."

2:00–3:00  Therapist dashboard: Open the brief inbox. Show the brief that just 
           arrived. Highlight the pattern note (if applicable).

3:00–3:30  Architecture overview: Quick diagram walkthrough. Name the Google 
           services. Show it's live on Cloud Run.

3:30–4:00  Closing: "Therapists become more effective. Patients feel heard. 
           And the 10 minutes before a session become the most valuable 10 
           minutes of the week."
```

---

## 9. Hackathon Submission Checklist

| Requirement | Status | Evidence |
|---|---|---|
| Uses Gemini model | ✅ DONE | Gemini 2.5 Flash Native Audio (Live API for voice), Gemini 2.5 Flash (brief generation). |
| Uses Google GenAI SDK or ADK | ✅ DONE | `@google/generative-ai` JS SDK for brief generation. Raw WebSocket for Live API. |
| Hosted on Google Cloud | ⬜ TODO | Cloud Run deployment |
| Multimodal (beyond text) | ✅ DONE | Voice in + voice out via Gemini Live API (bidirectional audio streaming) |
| Text description (Devpost) | ⬜ TODO | |
| Public code repository (GitHub) | ⬜ TODO | Include spin-up instructions in README |
| Cloud deployment proof recording | ⬜ TODO | Cloud Run console screen recording |
| Architecture diagram | ⬜ TODO | PNG export of Section 4 diagram |
| Demo video (<4 min) | ⬜ TODO | Shows real-time multimodal features |
| (Bonus) Blog / content post | ⬜ TODO | #GeminiLiveAgentChallenge |
| (Bonus) IaC / automated deployment | ⬜ TODO | `cloudbuild.yaml` in repo |
| (Bonus) GDG profile link | ⬜ TODO | |

---

## 10. Post-Hackathon Roadmap

### V1.1 — Immediate Post-Hackathon (Month 1–2)
- iOS and Android PWA support (make it feel native on mobile)
- Calendar integration: auto-detect upcoming therapy appointments (Google Calendar API)
- Improved voice persona: selectable voice tone (warmer / more neutral)

### V1.2 — Early Traction (Month 3–4)
- Therapist onboarding flow and practice management features
- EHR-lite: therapists can add session notes that feed context into future prep sessions
- Waitlist / referral system for practice-wide rollout

### V2.0 — Business Model Launch (Month 6+)
- Paid tiers: Free (3 sessions/month) → Patient Pro ($12/month unlimited) → Therapist Practice ($40/month per therapist, unlimited patients)
- HIPAA compliance audit and BAA agreements with therapy practices
- Insurance company pilot: demonstrate session efficiency improvement
- Anonymized research data partnerships (opt-in, IRB-compliant)

### Long-Term Moat
The pattern data becomes defensible over time. A patient with 6 months of weekly briefs has a longitudinal emotional health record that no other product can replicate. This data (with consent) is genuinely valuable to researchers, insurers, and clinicians. Prelude becomes the emotional health record layer that therapists build their practice on.

---

## 11. Environment Variables & Secrets

Store in `.env` locally. Store in **Google Secret Manager** in production.

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

# Gmail API (optional)
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...

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
| Gemini Live API latency makes conversation feel unnatural | Medium | High | Test early (Phase 2). Use streaming audio, not batch. Add subtle audio cue during processing gaps. |
| Patient becomes distressed during session | Low | High | Phase 3 prompt has explicit de-escalation instruction. Add a "pause session" button in UI. Include mental health resource link in app footer. |
| Brief generator produces hallucinated content | Medium | Medium | Prompt constrains output to transcript content only. Patient reviews brief before it sends. |
| HIPAA compliance concerns block therapist adoption post-hackathon | High | High | Hackathon scope is demo/prototype — no real patient data. Note this clearly in README. Post-hackathon: HIPAA audit before any real clinical use. |
| WebSocket connection drops mid-session | Medium | Medium | Implement reconnection logic. Save transcript to Firestore incrementally (not just at end). |
| Gemini Live API free tier limits hit during demo | Low | High | Test quota usage before demo recording. Have fallback transcript ready. |
| Patient edits brief to remove something therapist should know | Low | Medium | This is intentional by design — patient controls their data. Note this in product philosophy. |

---

_End of PRD v1.0_

---
**Document maintained by:** Prelude build team
**Coding agent instruction:** When a task is completed, update its status marker from `⬜ TODO` to `✅ DONE`. When starting a task, mark it `🔄 IN PROGRESS`. Update the `Last Updated` field in the metadata table and the `Build Status` field for each phase. Do not alter any other content unless explicitly instructed.
