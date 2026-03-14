/**
 * Prelude API client.
 *
 * All API calls go through the Python FastAPI + ADK backend at /api/* and /ws/*
 * so the API key never reaches the browser.
 */

export type DominantEmotion =
  | "anxious" | "sad" | "frustrated" | "calm" | "hopeful"
  | "reflective" | "grounded" | "happy" | "grateful"
  | "confident" | "distressed" | "flat" | "excited";

export interface BriefContent {
  emotionalState: string;
  dominantEmotion: DominantEmotion;
  themes: string[];
  patientWords: string;
  focusItems: string[];
  patternNote: string | null;
}

import { auth } from "@/lib/firebase";
import { apiUrl, wsSessionUrl } from "@/lib/api-base";

export async function generateBrief(
  transcript: string,
  _systemPrompt?: string,
  patientId?: string,
  sessionId?: string,
  durationSeconds?: number
): Promise<BriefContent> {
  const currentUser = auth.currentUser;
  const token = currentUser ? await currentUser.getIdToken() : null;

  const res = await fetch(apiUrl("/api/generate-brief"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      transcript,
      patientId: patientId || "anonymous",
      sessionId: sessionId || undefined,
      patientName: "the patient",
      durationSeconds: durationSeconds || 0,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Brief generation failed");
  }

  return res.json();
}

/**
 * Creates a WebSocket connection to the ADK-backed voice session endpoint.
 * Optional query params personalize the agent for the patient.
 */
export function createSessionWebSocket(opts?: {
  patientName?: string;
  userId?: string;
  sessionId?: string;
  token?: string | null;
}): WebSocket {
  const params = new URLSearchParams();
  if (opts?.patientName) params.set("patientName", opts.patientName);
  if (opts?.userId) params.set("userId", opts.userId);
  if (opts?.sessionId) params.set("sessionId", opts.sessionId);
  if (opts?.token) params.set("token", opts.token);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return new WebSocket(wsSessionUrl(qs));
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(apiUrl("/api/health"));
    const data = await res.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}

// Weekly brief API lives in weekly-briefs.ts (avoids stale HMR / missing named exports).
export {
  getCurrentWeeklyBrief,
  listWeeklyBriefs,
  type WeeklyBriefApi,
  type CurrentWeeklyBriefResponse,
} from "@/lib/weekly-briefs";
