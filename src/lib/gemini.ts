/**
 * Gemini proxy client.
 *
 * All Gemini API calls go through our Express server at /api/* and /ws/*
 * so the API key never reaches the browser.
 */

export interface BriefContent {
  emotionalState: string;
  themes: string[];
  patientWords: string;
  focusItems: string[];
  patternNote: string | null;
}

export async function generateBrief(
  transcript: string,
  systemPrompt?: string
): Promise<BriefContent> {
  const res = await fetch("/api/generate-brief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, systemPrompt }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Brief generation failed");
  }

  return res.json();
}

export function createSessionWebSocket(): WebSocket {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${protocol}//${window.location.host}/ws/session`);
  return ws;
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}
