/**
 * Production backend (Cloud Run). Empty in dev → Vite proxy to localhost:8000.
 * Set in Vercel: VITE_BACKEND_URL=https://prelude-backend-....run.app
 *
 * Echo on deployed is mitigated by routing agent playback through a WebRTC loopback
 * so Chrome applies AEC to the mic (see src/lib/audio.ts). See PRD §12 Known Risks.
 */
const raw = (import.meta.env.VITE_BACKEND_URL as string | undefined) || "";
export const API_BASE = raw.replace(/\/$/, "");

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${p}` : p;
}

/** WebSocket origin for ADK session (same host as API_BASE, or current host in dev). */
export function wsSessionUrl(query: string): string {
  if (API_BASE) {
    const u = new URL(API_BASE);
    const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProto}//${u.host}/ws/session${query}`;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/session${query}`;
}
