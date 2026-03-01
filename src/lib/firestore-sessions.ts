import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { BriefContent } from "./gemini";
import type { TranscriptTurn } from "@/hooks/useVoiceSession";

// ── Types ───────────────────────────────────────────────────────────────────

export interface SessionDoc {
  sessionId: string;
  patientId: string;
  startedAt: Timestamp;
  completedAt: Timestamp;
  durationSeconds: number;
  status: "complete" | "brief-generated";
  transcript: TranscriptTurn[];
  emotionalArc: {
    openingTone: string;
    closingTone: string;
    dominantEmotion: string;
  };
}

export interface BriefDoc {
  briefId: string;
  sessionId: string;
  patientId: string;
  generatedAt: Timestamp;
  approvedByPatient: boolean;
  content: BriefContent;
}

// ── Save session ────────────────────────────────────────────────────────────

export async function saveSession(
  patientId: string,
  transcript: TranscriptTurn[],
  durationSeconds: number
): Promise<string> {
  const sessionsRef = collection(db, "sessions");
  const sessionDoc = doc(sessionsRef);
  const sessionId = sessionDoc.id;

  const data: SessionDoc = {
    sessionId,
    patientId,
    startedAt: Timestamp.fromDate(
      new Date(Date.now() - durationSeconds * 1000)
    ),
    completedAt: Timestamp.now(),
    durationSeconds,
    status: "complete",
    transcript,
    emotionalArc: {
      openingTone: "unknown",
      closingTone: "unknown",
      dominantEmotion: "unknown",
    },
  };

  await setDoc(sessionDoc, data);
  return sessionId;
}

// ── Save brief ──────────────────────────────────────────────────────────────

export async function saveBrief(
  sessionId: string,
  patientId: string,
  content: BriefContent
): Promise<string> {
  const briefsRef = collection(db, "briefs");
  const briefDoc = doc(briefsRef);
  const briefId = briefDoc.id;

  const data: BriefDoc = {
    briefId,
    sessionId,
    patientId,
    generatedAt: Timestamp.now(),
    approvedByPatient: false,
    content,
  };

  await setDoc(briefDoc, data);

  // Also update session status
  const sessionRef = doc(db, "sessions", sessionId);
  await setDoc(sessionRef, { status: "brief-generated" }, { merge: true });

  return briefId;
}

// ── Read helpers ────────────────────────────────────────────────────────────

export async function getBrief(briefId: string): Promise<BriefDoc | null> {
  const briefRef = doc(db, "briefs", briefId);
  const snap = await getDoc(briefRef);
  return snap.exists() ? (snap.data() as BriefDoc) : null;
}

export async function getPatientBriefs(
  patientId: string
): Promise<BriefDoc[]> {
  // Single-field query to avoid needing a composite index.
  // Sort client-side instead.
  const q = query(
    collection(db, "briefs"),
    where("patientId", "==", patientId)
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => d.data() as BriefDoc);
  docs.sort((a, b) => b.generatedAt.toMillis() - a.generatedAt.toMillis());
  return docs;
}

export async function getPatientSessions(
  patientId: string
): Promise<SessionDoc[]> {
  const q = query(
    collection(db, "sessions"),
    where("patientId", "==", patientId)
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => d.data() as SessionDoc);
  docs.sort((a, b) => b.completedAt.toMillis() - a.completedAt.toMillis());
  return docs;
}
