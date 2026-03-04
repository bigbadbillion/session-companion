import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPatientBriefs,
  getPatientSessions,
  type BriefDoc,
  type SessionDoc,
} from "@/lib/firestore-sessions";

interface PatientData {
  briefs: BriefDoc[];
  sessions: SessionDoc[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

async function fetchBriefsWithFallback(userId: string): Promise<BriefDoc[]> {
  // Try backend API first (FastAPI + ADK), then fall back to direct Firestore reads.
  try {
    const res = await fetch(`/api/briefs/${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = (await res.json()) as BriefDoc[];
      return data;
    }
  } catch (err) {
    console.warn("Backend briefs API failed, falling back to Firestore:", err);
  }

  return getPatientBriefs(userId);
}

async function fetchSessionsWithFallback(userId: string): Promise<SessionDoc[]> {
  try {
    const res = await fetch(`/api/sessions/${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = (await res.json()) as SessionDoc[];
      return data;
    }
  } catch (err) {
    console.warn("Backend sessions API failed, falling back to Firestore:", err);
  }

  return getPatientSessions(userId);
}

export function usePatientData(): PatientData {
  const { user } = useAuth();
  const [briefs, setBriefs] = useState<BriefDoc[]>([]);
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchBriefsWithFallback(user.uid),
      fetchSessionsWithFallback(user.uid),
    ])
      .then(([b, s]) => {
        if (cancelled) return;
        setBriefs(b);
        setSessions(s);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load patient data:", err);
        setError(err.message ?? "Failed to load data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.uid, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  return { briefs, sessions, loading, error, refresh };
}
