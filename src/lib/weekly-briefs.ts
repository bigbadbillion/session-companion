/**
 * Weekly brief API client (GET /api/weekly-briefs/*).
 * Kept separate from gemini.ts so Vite always resolves these exports reliably.
 */
import { auth } from "@/lib/firebase";
import { apiUrl } from "@/lib/api-base";

export interface WeeklyBriefApi {
  weeklyBriefId: string;
  patientId: string;
  weekStart: string;
  weekEnd: string;
  sessions: string[];
  summary: {
    emotionalState: string;
    dominantEmotions?: string[];
    themes?: string[];
    patientWordsSample?: string;
    focusItems?: string[];
    patternNote?: string | null;
  };
  generatedAt: string;
  source: "auto" | "on-demand";
}

export interface CurrentWeeklyBriefResponse {
  status: string;
  generated_count: number;
  weekly_brief: WeeklyBriefApi | null;
}

export async function getCurrentWeeklyBrief(
  patientId: string
): Promise<CurrentWeeklyBriefResponse> {
  const currentUser = auth.currentUser;
  const token = currentUser ? await currentUser.getIdToken() : null;

  const res = await fetch(
    apiUrl(`/api/weekly-briefs/${encodeURIComponent(patientId)}/current`),
    {
      method: "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to load weekly brief");
  }

  return res.json();
}

export async function listWeeklyBriefs(patientId: string): Promise<WeeklyBriefApi[]> {
  const currentUser = auth.currentUser;
  const token = currentUser ? await currentUser.getIdToken() : null;

  const res = await fetch(apiUrl(`/api/weekly-briefs/${encodeURIComponent(patientId)}`), {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to list weekly briefs");
  }

  return res.json();
}
