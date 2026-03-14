import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPatientBriefs,
  getPatientSessions,
  type BriefDoc,
  type SessionDoc,
} from "@/lib/firestore-sessions";
import { getCurrentWeeklyBrief, type WeeklyBriefApi } from "@/lib/weekly-briefs";

interface PatientData {
  briefs: BriefDoc[];
  sessions: SessionDoc[];
  weeklyBrief: WeeklyBriefApi | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePatientData(): PatientData {
  const { user } = useAuth();
  const [briefs, setBriefs] = useState<BriefDoc[]>([]);
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [weeklyBrief, setWeeklyBrief] = useState<WeeklyBriefApi | null>(null);
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
      getPatientBriefs(user.uid),
      getPatientSessions(user.uid),
      getCurrentWeeklyBrief(user.uid).then((r) => r.weekly_brief),
    ])
      .then(([b, s, w]) => {
        if (cancelled) return;
        setBriefs(b);
        setSessions(s);
        setWeeklyBrief(w ?? null);
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

  return { briefs, sessions, weeklyBrief, loading, error, refresh };
}
