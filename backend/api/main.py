"""
FastAPI server for the Prelude backend.

Replaces the Express server (server/index.ts) with a Python backend that
uses Google ADK for agentic voice sessions and brief generation.

Endpoints:
  WS  /ws/session/{user_id}/{session_id}  — ADK-backed voice session
  POST /api/generate-brief                 — Trigger brief generation agent
  GET  /api/health                         — Health check
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import uuid
from pathlib import Path

from dotenv import load_dotenv

# Load .env from backend dir or project root BEFORE importing agents
_env_path = Path(__file__).resolve().parent.parent / ".env"
_root_env = Path(__file__).resolve().parent.parent.parent / ".env"

for _p in [_env_path, _root_env]:
    if _p.exists():
        try:
            load_dotenv(_p, override=False)
        except Exception:
            pass

# Optional: load from Google Secret Manager (e.g. when LOAD_SECRETS_FROM_MANAGER=1)
try:
    from backend.secrets import load_secrets_into_env
    load_secrets_into_env()
except Exception:
    pass

# Map GEMINI_API_KEY to GOOGLE_API_KEY for ADK
if os.getenv("GEMINI_API_KEY") and not os.getenv("GOOGLE_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY", "")

if not os.getenv("GOOGLE_GENAI_USE_VERTEXAI"):
    os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "FALSE"

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google import genai
from google.genai import types

try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth
    FIREBASE_ADMIN_AVAILABLE = True
except ModuleNotFoundError:
    firebase_admin = None  # type: ignore[assignment]
    firebase_auth = None  # type: ignore[assignment]
    FIREBASE_ADMIN_AVAILABLE = False

# Only set after we attempt init (see below). Ensures we don't require auth if init fails.
_firebase_auth_ready = False
_firebase_auth_error: str | None = None

from backend.session_agent import create_session_agent
from backend.brief_agent import create_brief_agent
from backend.tools.session_tools import reset_session_state

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# When unset, we default to requiring auth (BACKEND_DEV_NO_AUTH = false).
# You can explicitly disable auth in local dev by setting BACKEND_DEV_NO_AUTH=true.
BACKEND_DEV_NO_AUTH = os.getenv("BACKEND_DEV_NO_AUTH", "false").lower() in (
    "1",
    "true",
    "yes",
)


def _ensure_firebase_initialized() -> None:
    """Initialize Firebase Admin once when auth is desired. Safe to call multiple times."""
    global _firebase_auth_ready, _firebase_auth_error
    if _firebase_auth_ready or not FIREBASE_ADMIN_AVAILABLE or BACKEND_DEV_NO_AUTH:
        return
    try:
        try:
            firebase_admin.get_app()
        except ValueError:
            firebase_admin.initialize_app()
        _firebase_auth_ready = True
        _firebase_auth_error = None
        logger.info("Firebase Admin initialized for auth")
    except Exception as e:
        _firebase_auth_error = str(e)
        logger.warning(
            "Firebase Admin init failed (auth disabled): %s. Set GOOGLE_APPLICATION_CREDENTIALS or run with BACKEND_DEV_NO_AUTH=true.",
            e,
        )


def auth_enabled() -> bool:
    _ensure_firebase_initialized()
    return FIREBASE_ADMIN_AVAILABLE and _firebase_auth_ready and not BACKEND_DEV_NO_AUTH


def _decode_firebase_token(token: str) -> dict:
    """Blocking decode; run via asyncio.to_thread to avoid blocking event loop."""
    return firebase_auth.verify_id_token(token)  # type: ignore[arg-type]


async def verify_firebase_token(request: Request) -> str | None:
    """Verify Firebase ID token from Authorization header and return uid.

    When BACKEND_DEV_NO_AUTH is truthy or firebase_admin is unavailable,
    this acts as a no-op and returns None.
    """
    if not auth_enabled():
        return None

    auth_header = request.headers.get("authorization") or request.headers.get(
        "Authorization"
    )
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization Bearer token",
        )

    token = auth_header.split(" ", 1)[1].strip()
    try:
        decoded = await asyncio.to_thread(_decode_firebase_token, token)
    except Exception as e:  # noqa: BLE001
        logger.warning("Failed to verify Firebase ID token: %s", e)
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
        ) from e

    uid = decoded.get("uid")
    if not uid:
        raise HTTPException(
            status_code=401,
            detail="Token missing uid",
        )
    return uid


async def verify_firebase_token_ws(token: str | None) -> str | None:
    """Verify Firebase ID token for WebSocket flows.

    Behaves like verify_firebase_token but takes a raw token instead of a Request.
    Raises HTTPException on failure so the WebSocket handler can close with 4401.
    """
    if not auth_enabled():
        return None

    if not token:
        raise HTTPException(status_code=401, detail="Missing token")

    try:
        decoded = await asyncio.to_thread(_decode_firebase_token, token)
    except Exception as e:  # noqa: BLE001
        logger.warning("Failed to verify Firebase ID token (WS): %s", e)
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
        ) from e

    uid = decoded.get("uid")
    if not uid:
        raise HTTPException(
            status_code=401,
            detail="Token missing uid",
        )
    return uid


# ── Application Setup ─────────────────────────────────────────────────────

app = FastAPI(title="Prelude API", version="1.0.0")

# CORS: allow_credentials=True + allow_origins=["*"] is invalid per spec — browsers
# block preflight on cross-origin fetch(..., { headers: { Authorization } }) (e.g. Vercel → Cloud Run).
# Bearer tokens do not need cookies; use credentials=False with *, or set CORS_ORIGINS (comma-separated).
_cors_origins_env = os.getenv("CORS_ORIGINS", "").strip()
if _cors_origins_env:
    _cors_origins = [o.strip() for o in _cors_origins_env.split(",") if o.strip()]
    _cors_credentials = True
else:
    _cors_origins = ["*"]
    _cors_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_cors_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ADK Runners ───────────────────────────────────────────────────────────

SESSION_APP = "prelude-session"
BRIEF_APP = "prelude-brief"

session_service = InMemorySessionService()

session_agent = create_session_agent(patient_name="there")
session_runner = Runner(
    app_name=SESSION_APP,
    agent=session_agent,
    session_service=session_service,
)

brief_agent = create_brief_agent()
brief_runner = Runner(
    app_name=BRIEF_APP,
    agent=brief_agent,
    session_service=session_service,
)

# ── Health Check ──────────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    """Basic health check for the backend and its dependencies."""
    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")

    # Basic Firestore connectivity check (non-fatal if it fails)
    firestore_ok = False
    firestore_error: str | None = None
    try:
        from backend.db.firestore_client import get_db

        db = get_db()
        _ = db.collection("healthcheck")
        firestore_ok = True
    except Exception as e:
        firestore_error = str(e)

    enabled = auth_enabled()

    return {
        "status": "ok",
        "geminiConfigured": bool(api_key),
        "backend": "python-adk",
        "agentModel": session_agent.model,
        "authEnabled": enabled,
        "auth": {
            "enabled": enabled,
            "devNoAuth": BACKEND_DEV_NO_AUTH,
            "firebaseAdminAvailable": FIREBASE_ADMIN_AVAILABLE,
            "firebaseAuthReady": _firebase_auth_ready,
            "error": _firebase_auth_error,
        },
        "firestore": {
            "ok": firestore_ok,
            "error": firestore_error,
        },
    }


# ── Voice Session WebSocket (ADK Live API) ────────────────────────────────

@app.websocket("/ws/session")
async def voice_session_ws(websocket: WebSocket):
    """WebSocket endpoint for ADK-backed voice sessions.

    Follows the ADK streaming protocol:
    - Upstream: binary frames for audio, JSON text for text/control
    - Downstream: ADK events as JSON
    """
    await websocket.accept()
    token = websocket.query_params.get("token")
    # JWT in query strings can exceed proxy URL limits → "network connection was lost".
    # Prefer first frame: {"type":"auth","token":"..."} when auth is required.
    if auth_enabled() and not token:
        try:
            first = await asyncio.wait_for(websocket.receive(), timeout=20.0)
            if first.get("type") == "websocket.disconnect":
                return
            if "text" not in first:
                await websocket.close(code=4401, reason="auth_first")
                return
            data = json.loads(first["text"])
            if data.get("type") != "auth" or not data.get("token"):
                await websocket.close(code=4401, reason="auth_first")
                return
            token = data["token"]
        except asyncio.TimeoutError:
            logger.warning("WebSocket auth timeout (no first message)")
            await websocket.close(code=4401, reason="auth_timeout")
            return
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning("WebSocket auth parse error: %s", e)
            await websocket.close(code=4401, reason="auth_invalid")
            return
    try:
        uid = await verify_firebase_token_ws(token)
    except HTTPException as exc:
        logger.warning("Closing WebSocket due to auth failure: %s", exc.detail)
        await websocket.close(code=4401, reason="auth_failed")
        return

    logger.info("Voice session WebSocket connected")
    reset_session_state()

    # Parse optional query params
    patient_name = websocket.query_params.get("patientName", "there")
    user_id = websocket.query_params.get("userId", f"user-{uuid.uuid4().hex[:8]}")
    session_id = websocket.query_params.get("sessionId", f"session-{uuid.uuid4().hex[:8]}")

    # When auth is enabled, trust the uid over any client-supplied userId.
    if auth_enabled() and uid:
        user_id = uid

    # Create a session agent with user/session IDs so tools can be called correctly
    patient_agent = create_session_agent(
        patient_name=patient_name,
        user_id=user_id,
        session_id=session_id,
    )
    patient_runner = Runner(
        app_name=SESSION_APP,
        agent=patient_agent,
        session_service=session_service,
    )

    # Ensure session exists
    session = await session_service.get_session(
        app_name=SESSION_APP, user_id=user_id, session_id=session_id
    )
    if not session:
        await session_service.create_session(
            app_name=SESSION_APP, user_id=user_id, session_id=session_id
        )

    run_config = RunConfig(
        streaming_mode=StreamingMode.BIDI,
        response_modalities=["AUDIO"],
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        session_resumption=types.SessionResumptionConfig(),
        enable_affective_dialog=True,
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name="Puck"
                )
            )
        ),
    )

    live_request_queue = LiveRequestQueue()
    downstream_task_ref: asyncio.Task | None = None

    # Prefetch state: run context tools before audible greeting
    prefetch_done = False
    prefetch_instruction_sent = False
    prefetch_tools_required = {
        "get_previous_session_context",
        "get_session_context_for_patient",
    }
    prefetch_tools_completed: set[str] = set()

    async def upstream_task() -> None:
        """Receives messages from browser WebSocket and sends to ADK."""
        nonlocal downstream_task_ref
        while True:
            message = await websocket.receive()

            if message.get("type") == "websocket.disconnect":
                if downstream_task_ref is not None:
                    downstream_task_ref.cancel()
                break

            if "bytes" in message:
                audio_data = message["bytes"]
                audio_blob = types.Blob(
                    mime_type="audio/pcm;rate=16000",
                    data=audio_data,
                )
                live_request_queue.send_realtime(audio_blob)

            elif "text" in message:
                text_data = message["text"]
                try:
                    json_msg = json.loads(text_data)
                    msg_type = json_msg.get("type", "")

                    if msg_type == "text":
                        content = types.Content(
                            parts=[types.Part(text=json_msg["text"])]
                        )
                        live_request_queue.send_content(content)

                    elif msg_type == "audio":
                        audio_bytes = base64.b64decode(json_msg["data"])
                        audio_blob = types.Blob(
                            mime_type="audio/pcm;rate=16000",
                            data=audio_bytes,
                        )
                        live_request_queue.send_realtime(audio_blob)

                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON from client: {text_data[:100]}")

    async def downstream_task() -> None:
        """Receives ADK events from run_live() and sends to browser."""
        nonlocal prefetch_done, prefetch_instruction_sent, prefetch_tools_completed

        # On first downstream iteration, inject a short, invisible instruction so the
        # agent prefetches context before greeting out loud.
        if not prefetch_instruction_sent:
            try:
                live_request_queue.send_content(
                    types.Content(
                        parts=[
                            types.Part(
                                text=(
                                    "Before greeting the patient out loud, first call "
                                    "get_previous_session_context (if available), then "
                                    "get_session_context_for_patient. After both tool "
                                    "calls return, begin your audible greeting."
                                )
                            )
                        ]
                    )
                )
                prefetch_instruction_sent = True
            except Exception as instr_err:  # noqa: BLE001
                logger.debug("Prefetch instruction send failed: %s", instr_err)

        async for event in patient_runner.run_live(
            user_id=user_id,
            session_id=session_id,
            live_request_queue=live_request_queue,
            run_config=run_config,
        ):
            # Send explicit toolStart so the client can show "Prelude is thinking" (ADK event
            # serialization may not include function_call in a way the client sees)
            if getattr(event, "get_function_calls", None):
                for fc in event.get_function_calls():
                    name = getattr(fc, "name", None)
                    if name:
                        logger.info("Voice session tool call: %s", name)
                        await websocket.send_text(
                            json.dumps({"toolStart": True, "tool": name})
                        )
                        break

            # Track completion of the initial context tools so we can delay audible
            # output until both have finished successfully.
            if getattr(event, "get_function_responses", None) and event.get_function_responses():
                completed_non_prefetch = False
                for fr in event.get_function_responses():
                    tool_name = getattr(fr, "name", None) or getattr(
                        fr, "function_name", None
                    )
                    if not tool_name:
                        continue
                    if tool_name not in prefetch_tools_required:
                        completed_non_prefetch = True
                    response_payload = getattr(fr, "response", None)
                    # Treat missing or non-dict responses as non-error; our Firestore tools
                    # always return a dict with status.
                    status = None
                    if isinstance(response_payload, dict):
                        status = response_payload.get("status")

                    if (
                        tool_name in prefetch_tools_required
                        and status != "error"
                    ):
                        prefetch_tools_completed.add(tool_name)

                if not prefetch_done and prefetch_tools_required.issubset(
                    prefetch_tools_completed
                ):
                    prefetch_done = True

                # When a tool finishes, send toolEnd so client hides spinner.
                await websocket.send_text(json.dumps({"toolEnd": True}))
                # Only nudge after non-prefetch tools. After prefetch (get_previous_session_context,
                # get_session_context_for_patient) the agent already has "begin your audible greeting"
                # — nudging here caused a second message before the patient spoke.
                if completed_non_prefetch:
                    try:
                        live_request_queue.send_content(
                            types.Content(
                                parts=[
                                    types.Part(
                                        text=(
                                            "(System nudge: If you have not yet spoken out "
                                            "loud in response to the patient's last turn, "
                                            "now offer ONE brief verbal response and then "
                                            "wait for them. If you already responded, "
                                            "ignore this message.)"
                                        )
                                    )
                                ]
                            )
                        )
                    except Exception as nudge_err:
                        logger.debug("Post-tool nudge send failed: %s", nudge_err)

            event_json = event.model_dump_json(
                exclude_none=True, by_alias=True
            )

            # While prefetch is running, suppress downstream ADK events (including audio)
            # so the patient does not hear anything until both context tools have completed.
            if prefetch_done:
                await websocket.send_text(event_json)

    try:
        downstream_task_ref = asyncio.create_task(downstream_task())
        await asyncio.gather(upstream_task(), downstream_task_ref)
    except asyncio.CancelledError:
        logger.info("Voice session ended (client disconnected or task cancelled)")
    except WebSocketDisconnect:
        logger.info("Voice session client disconnected")
    except Exception as e:
        # Log full error for Cloud Run logs (Console → Logs)
        logger.error("Voice session error (full): %s", repr(e), exc_info=True)
        try:
            error_msg = str(e)
            if "not found" in error_msg or "not supported" in error_msg:
                error_msg = "Voice model unavailable. Please try again later."
            elif "1008" in error_msg or "policy violation" in error_msg.lower() or "not implemented, or supported, or enabled" in error_msg.lower():
                error_msg = "The voice session ended due to a service limit. You can start a new session."
            elif "1011" in error_msg or "internal error occurred" in error_msg.lower():
                error_msg = "The voice connection had an internal error. Please start a new session."
            await websocket.send_json({"error": error_msg})
        except Exception:
            pass
    finally:
        live_request_queue.close()
        logger.info("Voice session ended, queue closed")


# ── Brief Generation (REST) ──────────────────────────────────────────────

class BriefRequest(BaseModel):
    transcript: str
    patientId: str = "anonymous"
    sessionId: str | None = None
    patientName: str = "the patient"
    durationSeconds: int = 0


@app.get("/api/sessions/{patient_id}")
async def list_sessions(patient_id: str, uid: str | None = Depends(verify_firebase_token)):
    """Returns all prep sessions for a patient, newest first.

    Shape is aligned with the frontend's SessionDoc type in
    src/lib/firestore-sessions.ts so we can gradually migrate reads
    from client-side Firestore to this API without breaking the UI.
    """
    from backend.db.firestore_client import query_documents
    from backend.tools.firestore_tools import _to_sorted_timestamp

    if auth_enabled() and uid is not None and uid != patient_id:
        raise HTTPException(status_code=403, detail="Forbidden for this patient")

    sessions = await query_documents("sessions", "patientId", "==", patient_id)
    sessions.sort(
        key=lambda s: _to_sorted_timestamp(s.get("completedAt")), reverse=True
    )
    return sessions


@app.get("/api/briefs/{patient_id}")
async def list_briefs(patient_id: str, uid: str | None = Depends(verify_firebase_token)):
    """Returns all briefs for a patient, newest first.

    Shape matches the BriefDoc type used in the React frontend.
    """
    from backend.db.firestore_client import query_documents
    from backend.tools.firestore_tools import _to_sorted_timestamp

    if auth_enabled() and uid is not None and uid != patient_id:
        raise HTTPException(status_code=403, detail="Forbidden for this patient")

    briefs = await query_documents("briefs", "patientId", "==", patient_id)
    briefs.sort(
        key=lambda b: _to_sorted_timestamp(b.get("generatedAt")), reverse=True
    )
    return briefs


@app.get("/api/weekly-briefs/{patient_id}")
async def list_weekly_briefs(
    patient_id: str,
    uid: str | None = Depends(verify_firebase_token),
):
    """Return all weekly briefs for a patient, newest first."""
    from backend.db.firestore_client import query_documents
    from backend.tools.firestore_tools import _to_sorted_timestamp

    if auth_enabled() and uid is not None and uid != patient_id:
        raise HTTPException(status_code=403, detail="Forbidden for this patient")

    weekly = await query_documents("weekly_briefs", "patientId", "==", patient_id)
    weekly.sort(
        key=lambda w: _to_sorted_timestamp(w.get("weekStart")), reverse=True
    )
    return weekly


@app.get("/api/weekly-briefs/{patient_id}/current")
async def get_current_weekly_brief(
    patient_id: str,
    uid: str | None = Depends(verify_firebase_token),
):
    """Ensure weekly briefs exist for recent completed weeks and return the latest.

    This endpoint performs lazy generation instead of relying on a scheduler.
    """
    from backend.db.firestore_client import query_documents
    from backend.tools.firestore_tools import (
        _to_sorted_timestamp,
        generate_weekly_briefs_for_patient,
    )

    if auth_enabled() and uid is not None and uid != patient_id:
        raise HTTPException(status_code=403, detail="Forbidden for this patient")

    gen_result = await generate_weekly_briefs_for_patient(patient_id)

    weekly = await query_documents("weekly_briefs", "patientId", "==", patient_id)
    if not weekly:
        return {
            "status": gen_result.get("status", "success"),
            "generated_count": gen_result.get("generated_count", 0),
            "weekly_brief": None,
        }

    weekly.sort(
        key=lambda w: _to_sorted_timestamp(w.get("weekStart")), reverse=True
    )
    latest = weekly[0]
    return {
        "status": gen_result.get("status", "success"),
        "generated_count": gen_result.get("generated_count", 0),
        "weekly_brief": latest,
    }


@app.post("/api/generate-brief")
async def generate_brief(req: BriefRequest, uid: str | None = Depends(verify_firebase_token)):
    """Triggers the BriefGeneratorAgent to produce a structured brief.

    Pipeline:
    1. Endpoint saves session to Firestore (transcript too large for tool param)
    2. Agent retrieves patterns and recent briefs, generates brief JSON
    3. Agent persists brief and updates pattern tracking via tools
    4. Endpoint returns brief JSON to frontend
    """
    from backend.tools.firestore_tools import (
        save_session_direct,
        save_brief_direct,
        check_brief_exists,
    )

    user_id = req.patientId
    if auth_enabled() and uid is not None and uid != user_id:
        raise HTTPException(status_code=403, detail="Forbidden for this patient")
    brief_session_id = f"brief-{uuid.uuid4().hex[:8]}"

    # Step 1: Save session directly (transcript too large for LLM tool param)
    session_id, session_error = await save_session_direct(
        patient_id=user_id,
        transcript=req.transcript,
        duration_seconds=req.durationSeconds,
    )
    if session_error:
        logger.warning(f"Session save failed (continuing anyway): {session_error}")
        session_id = req.sessionId or f"session-{uuid.uuid4().hex[:8]}"

    logger.info(f"Brief generation starting for session_id={session_id}, patient={user_id}")

    await session_service.create_session(
        app_name=BRIEF_APP,
        user_id=user_id,
        session_id=brief_session_id,
    )

    # Step 2: Build prompt with session_id for the agent
    prompt = (
        f"Generate a therapy prep brief from the following session transcript.\n"
        f"Session ID: {session_id}\n"
        f"Patient ID: {req.patientId}\n"
        f"Duration: {req.durationSeconds} seconds\n\n"
        f"TRANSCRIPT:\n{req.transcript}"
    )

    user_content = types.Content(
        role="user",
        parts=[types.Part(text=prompt)],
    )

    # Step 3: Run the agent
    final_text = ""
    tool_errors = []
    async for event in brief_runner.run_async(
        user_id=user_id,
        session_id=brief_session_id,
        new_message=user_content,
    ):
        if event.content and event.content.parts:
            for part in event.content.parts:
                if part.text:
                    final_text += part.text
                if hasattr(part, "function_response") and part.function_response:
                    resp = part.function_response
                    if hasattr(resp, "response") and isinstance(resp.response, dict):
                        if resp.response.get("status") == "error":
                            tool_errors.append(resp.response.get("message", "unknown"))

    logger.info(f"Agent raw output length: {len(final_text)} chars")
    if tool_errors:
        logger.warning(f"Agent tool errors: {tool_errors}")

    # Step 4: Extract JSON from agent response (or fall back to direct model call)
    brief_json = _extract_json(final_text)
    if not brief_json:
        logger.warning(
            "Could not parse JSON from agent response; falling back to direct model summarization."
        )
        try:
            brief_json = await _generate_brief_with_model_fallback(
                prompt=prompt,
                patient_id=user_id,
            )
        except Exception as e:
            logger.warning(f"Model fallback brief generation failed: {e}")
            brief_json = None

    if not brief_json:
        # Final safety fallback to keep the UI functional
        brief_json = {
            "emotionalState": final_text.strip()[:500] or "Brief could not be structured.",
            "dominantEmotion": "calm",
            "themes": [],
            "patientWords": "",
            "focusItems": [],
            "patternNote": None,
        }

    brief_json = _normalize_brief_json(brief_json)

    # Step 5: Fallback persistence if agent didn't save the brief
    try:
        brief_exists = await check_brief_exists(session_id)
        if not brief_exists:
            logger.info(f"Brief not found in Firestore, saving via fallback")
            brief_id, fallback_error = await save_brief_direct(
                session_id=session_id,
                patient_id=user_id,
                brief_content=brief_json,
            )
            if fallback_error:
                logger.warning(f"Fallback brief save failed: {fallback_error}")
            else:
                logger.info(f"Fallback brief saved: {brief_id}")
        else:
            logger.info(f"Brief already saved by agent for session {session_id}")
    except Exception as e:
        logger.warning(f"Fallback persistence check failed: {e}")

    return brief_json


def _extract_json(text: str) -> dict | None:
    """Try multiple strategies to extract a JSON object from agent text."""
    cleaned = text.strip()

    # Strip markdown code fences if present
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(lines).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Try to find a JSON object embedded in the text
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(cleaned[start : end + 1])
        except json.JSONDecodeError:
            pass

    return None


ALLOWED_EMOTIONS = {
    "anxious",
    "sad",
    "frustrated",
    "calm",
    "hopeful",
    "reflective",
    "grounded",
    "happy",
    "grateful",
    "confident",
    "distressed",
    "flat",
    "excited",
}


async def _generate_brief_with_model_fallback(
    prompt: str,
    patient_id: str,
) -> dict | None:
    """Fallback brief generator using the plain Gemini text model.

    This runs outside the ADK Agent to guarantee we always get a JSON brief
    even if the agent returns no final text.
    """
    client = genai.Client()

    system_instruction = (
        "You are a personal reflection summarizer for therapy prep.\n"
        "Return a JSON object with these exact keys:\n"
        '{\n'
        '  "emotionalState": "1-2 sentences: tone + trajectory",\n'
        '  "dominantEmotion": "single word from allowed list",\n'
        '  "themes": ["theme 1", "theme 2", "theme 3"],\n'
        '  "patientWords": "near-verbatim quote",\n'
        '  "focusItems": ["intention 1", "intention 2"],\n'
        '  "patternNote": null or "recurring pattern note"\n'
        "}\n\n"
        "dominantEmotion must be exactly one of: "
        "anxious, sad, frustrated, calm, hopeful, reflective, grounded, "
        "happy, grateful, confident, distressed, flat, excited.\n"
        "Respond with ONLY the JSON object, no extra text, no markdown."
    )

    full_prompt = (
        f"{system_instruction}\n\n"
        f"Patient ID: {patient_id}\n\n"
        f"{prompt}"
    )

    def _call_model() -> str:
        resp = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=full_prompt,
        )
        return getattr(resp, "text", "") or ""

    raw = await asyncio.to_thread(_call_model)
    if not raw.strip():
        return None

    parsed = _extract_json(raw)
    if parsed:
        return parsed

    return {
        "emotionalState": raw.strip()[:500],
        "dominantEmotion": "calm",
        "themes": [],
        "patientWords": "",
        "focusItems": [],
        "patternNote": None,
    }


def _normalize_brief_json(data: dict) -> dict:
    """Ensure the brief JSON has all expected fields in the right shape."""
    if not isinstance(data, dict):
        data = {}

    emotional_state = str(
        data.get("emotionalState")
        or data.get("emotional_state")
        or ""
    ).strip()
    if not emotional_state:
        emotional_state = "I shared how I'm showing up before this session."

    dominant = str(
        data.get("dominantEmotion")
        or data.get("dominant_emotion")
        or "calm"
    ).lower()
    if dominant not in ALLOWED_EMOTIONS:
        dominant = "calm"

    themes = data.get("themes", [])
    if isinstance(themes, str):
        themes = [t.strip() for t in themes.split(",") if t.strip()]
    if not isinstance(themes, list):
        themes = []
    themes = themes[:3]

    patient_words = str(
        data.get("patientWords")
        or data.get("patient_words")
        or ""
    )

    focus_items = data.get("focusItems", [])
    if isinstance(focus_items, str):
        focus_items = [f.strip() for f in focus_items.split(",") if f.strip()]
    if not isinstance(focus_items, list):
        focus_items = []
    focus_items = focus_items[:2]

    pattern_note = data.get("patternNote", data.get("pattern_note"))
    if isinstance(pattern_note, str) and pattern_note.strip().lower() in {
        "",
        "none",
        "null",
    }:
        pattern_note = None

    return {
        "emotionalState": emotional_state,
        "dominantEmotion": dominant,
        "themes": themes,
        "patientWords": patient_words,
        "focusItems": focus_items,
        "patternNote": pattern_note,
    }


# ── Entry point ───────────────────────────────────────────────────────────

def main():
    import uvicorn
    port = int(os.getenv("SERVER_PORT", "8000"))
    uvicorn.run(
        "backend.api.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        reload_dirs=[str(Path(__file__).resolve().parent.parent)],
    )


if __name__ == "__main__":
    main()
