import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { BriefContent } from "./gemini";

// ── Types ───────────────────────────────────────────────────────────────────

export interface SessionDoc {
  sessionId: string;
  patientId: string;
  startedAt: string | Timestamp;
  completedAt: string | Timestamp;
  durationSeconds: number;
  status: "complete" | "brief-generated";
  transcript: string;
  emotionalArc: string;
}

export interface BriefDoc {
  briefId: string;
  sessionId: string;
  patientId: string;
  generatedAt: string | Timestamp;
  savedToDashboard: boolean;
  savedAt?: string | Timestamp;
  content: BriefContent;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toMillis(val: string | Timestamp | undefined): number {
  if (!val) return 0;
  if (val instanceof Timestamp) return val.toMillis();
  return new Date(val).getTime();
}

export function toDate(val: string | Timestamp | undefined): Date {
  if (!val) return new Date();
  if (val instanceof Timestamp) return val.toDate();
  return new Date(val);
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
  const q = query(
    collection(db, "briefs"),
    where("patientId", "==", patientId)
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => d.data() as BriefDoc);
  docs.sort((a, b) => toMillis(b.generatedAt) - toMillis(a.generatedAt));
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
  docs.sort((a, b) => toMillis(b.completedAt) - toMillis(a.completedAt));
  return docs;
}

export async function updateBriefContent(
  briefId: string,
  content: BriefContent
): Promise<void> {
  const briefRef = doc(db, "briefs", briefId);
  await updateDoc(briefRef, {
    content,
  });
}
