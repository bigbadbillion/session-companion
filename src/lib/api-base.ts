/**
 * Production backend (Cloud Run). Empty in dev → Vite proxy to localhost:8000.
 * Set in Vercel: VITE_BACKEND_URL=https://prelude-backend-....run.app
 *
 * When API_BASE is set (deployed), the WebSocket goes to Cloud Run and RTT is higher.
 * Higher RTT means agent audio streams over a longer wall-clock time while the mic
 * is still sending, so the mic can capture speaker output (echo). Chrome's AEC does
 * not use our AudioContext playback as reference. So echo can appear only on deployed.
 * Workaround: use headphones when using the deployed app, or run the backend locally
 * and set VITE_BACKEND_URL to a tunnel (e.g. ngrok) so the deployed frontend hits
 * localhost → same RTT as full local. See PRD §12 Known Risks.
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
