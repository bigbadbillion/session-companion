import { useState, useRef, useCallback, useEffect } from "react";
import { GeminiLiveClient, type TranscriptionData } from "@/lib/gemini-live";
import { API_BASE } from "@/lib/api-base";
import { AudioStreamer, AudioPlayer } from "@/lib/audio";
import { generateBrief, type BriefContent } from "@/lib/gemini";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ───────────────────────────────────────────────────────────────────

export type SessionStatus =
  | "idle"
  | "connecting"
  | "active"
  | "ended"
  | "error";

export interface TranscriptTurn {
  speaker: "agent" | "patient";
  text: string;
  timestamp: number;
}

export interface UseVoiceSessionReturn {
  status: SessionStatus;
  transcript: TranscriptTurn[];
  pendingAgentText: string;
  pendingPatientText: string;
  elapsed: number;
  isMicMuted: boolean;
  isAgentThinking: boolean;
  errorMessage: string | null;
  brief: BriefContent | null;
  isGeneratingBrief: boolean;
  startSession: () => Promise<void>;
  toggleMic: () => void;
  endSession: () => Promise<BriefContent | null>;
}

interface SessionParams {
  patientId?: string;
  patientName: string;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useVoiceSession(params: SessionParams): UseVoiceSessionReturn {
  const { user } = useAuth();
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [brief, setBrief] = useState<BriefContent | null>(null);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [pendingAgentText, setPendingAgentText] = useState("");
  const [pendingPatientText, setPendingPatientText] = useState("");
  const [isAgentThinking, setIsAgentThinking] = useState(false);

  const clientRef = useRef<GeminiLiveClient | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  // Mirror of transcript state for synchronous reads in endSession
  const transcriptRef = useRef<TranscriptTurn[]>([]);

  // Latest partial transcription (replacement, not delta)
  const pendingInputRef = useRef("");
  const pendingOutputRef = useRef("");
  const queuedAgentAudioRef = useRef<string[]>([]);

  // Track whether the agent has spoken — drives "connecting" → "active"
  const agentHasSpokenRef = useRef(false);

  // Single turn per user turn: block next agent output until user speaks. We set "turn ended"
  // only after a short delay past onTurnComplete so trailing audio for the current turn can arrive.
  const agentTurnEndedRef = useRef(false);
  const userSpokeSinceRef = useRef(false);
  const turnCompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const TURN_END_GRACE_MS = 600;

  // ── Timer ───────────────────────────────────────────────────────────────

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        elapsedRef.current = prev + 1;
        return prev + 1;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (turnCompleteTimeoutRef.current) {
        clearTimeout(turnCompleteTimeoutRef.current);
        turnCompleteTimeoutRef.current = null;
      }
      stopTimer();
      streamerRef.current?.stop();
      playerRef.current?.destroy();
      clientRef.current?.disconnect();
    };
  }, [stopTimer]);

  // ── Transcript helpers ──────────────────────────────────────────────────

  /** Strip control characters, silence markers, and filler (e.g. "hmm..") from Live API transcription. */
  const sanitizeTranscriptText = useCallback((raw: string): string => {
    let cleaned = raw
      .replace(/<ctrl\d+>/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    // Strip trailing filler ("hmm", "hmm..", "Hmm?", "mmm...") that the model sometimes appends after a response.
    cleaned = cleaned.replace(/\s*[hH]m+m+\.*\?*\.*$/i, "").trim();
    cleaned = cleaned.replace(/\s*[mM]{2,}\.?\.*\?*$/i, "").trim();

    // Strip explicit silence/pause markers that the Live API sometimes emits.
    const silenceTokens = new Set([
      "(silence)",
      "(Silence)",
      "(pause)",
      "(Pause)",
      "[silence]",
      "[Silence]",
      "[pause]",
      "[Pause]",
    ]);
    if (silenceTokens.has(cleaned)) {
      return "";
    }

    // Drop turns that are only filler ("hmm", "Hmm?", "mmm...", etc.) so they don't appear as separate lines.
    if (/^[hH]m+m+\.*\?*\.*$/i.test(cleaned) || /^[mM]{2,}\.?\.*\?*$/i.test(cleaned)) {
      return "";
    }

    // Hide internal system nudge text or model's acknowledgment of it (e.g. "(System nudge ignored)").
    if (/\(?\s*System nudge\s*(ignored|:)?/i.test(cleaned) || /nudge\s+ignored/i.test(cleaned)) {
      return "";
    }

    // Drop second-turn phrases where the agent says it's waiting instead of just staying silent.
    if (/^(I'm )?waiting for (your |you to )?response\.?$/i.test(cleaned)) return "";
    if (/^I'll just wait for your response\.?$/i.test(cleaned)) return "";
    if (/^I'm here when you're ready\.?$/i.test(cleaned)) return "";
    if (/^Take your time\.?$/i.test(cleaned)) return "";
    if (/^(Whenever you're ready|I'll wait)\.?$/i.test(cleaned)) return "";
    if (/^Wait\.?$/i.test(cleaned)) return "";

    return cleaned;
  }, []);

  const pushTurn = useCallback(
    (speaker: "agent" | "patient", text: string) => {
      const cleaned = sanitizeTranscriptText(text);
      if (!cleaned) return;

      // Avoid duplicate consecutive agent turns (e.g. same outputTranscript delivered twice).
      const prev = transcriptRef.current[transcriptRef.current.length - 1];
      if (speaker === "agent" && prev?.speaker === "agent" && prev.text === cleaned) {
        return;
      }

      const turn: TranscriptTurn = { speaker, text: cleaned, timestamp: Date.now() };
      transcriptRef.current = [...transcriptRef.current, turn];
      setTranscript(transcriptRef.current);
    },
    [sanitizeTranscriptText]
  );

  // ── Start session ───────────────────────────────────────────────────────

  const startSession = useCallback(async () => {
    setStatus("connecting");
    setErrorMessage(null);
        setTranscript([]);
        transcriptRef.current = [];
        setElapsed(0);
        elapsedRef.current = 0;
        setBrief(null);
        setIsAgentThinking(false);
        pendingInputRef.current = "";
        pendingOutputRef.current = "";
        agentHasSpokenRef.current = false;
        agentTurnEndedRef.current = false;
        userSpokeSinceRef.current = false;
        if (turnCompleteTimeoutRef.current) {
          clearTimeout(turnCompleteTimeoutRef.current);
          turnCompleteTimeoutRef.current = null;
        }
        setPendingAgentText("");
        setPendingPatientText("");

    try {
      // VITE_* is inlined at build time — without this, WS hits the static host and fails.
      if (!import.meta.env.DEV && !API_BASE) {
        setErrorMessage(
          "Backend URL missing: set VITE_BACKEND_URL in Vercel (Production) to your Cloud Run URL, then redeploy."
        );
        setStatus("error");
        return;
      }

      const player = new AudioPlayer();
      await player.init();
      playerRef.current = player;

      const token = await user?.getIdToken().catch(() => null);

      const client = new GeminiLiveClient(
        {
          systemInstruction: "",
          enableAffectiveDialog: true,
          voiceName: "Puck",
          temperature: 0.9,
        },
        {
          onSetupComplete: async () => {
            // Stay in "connecting" — transition to "active" on first audio
            clientRef.current?.sendText("(Session started. Please begin with your warm greeting.)");

            try {
              const streamer = new AudioStreamer();
              streamer.onAudioBytes = (pcmBuffer: ArrayBuffer) => {
                clientRef.current?.sendAudioBytes(pcmBuffer);
              };
              await streamer.start();
              streamerRef.current = streamer;
            } catch (micErr) {
              console.error("Mic access failed:", micErr);
              setErrorMessage(
                "Microphone access denied. Please allow microphone access and try again."
              );
              setStatus("error");
            }
          },

          onAudio: (base64Pcm) => {
            const allow = !agentTurnEndedRef.current || userSpokeSinceRef.current;
            if (!allow) return;
            if (userSpokeSinceRef.current) {
              userSpokeSinceRef.current = false;
              agentTurnEndedRef.current = false;
            }
            setIsAgentThinking(false);
            if (!agentHasSpokenRef.current) {
              agentHasSpokenRef.current = true;
              setStatus("active");
              startTimer();
            }
            playerRef.current?.play(base64Pcm);
          },

          onToolStart: () => setIsAgentThinking(true),
          onToolEnd: () => setIsAgentThinking(false),

          onInputTranscript: (data: TranscriptionData) => {
            // ADK sends replacement text (full text so far), not deltas
            pendingInputRef.current = data.text;
            if (data.text.trim()) {
              userSpokeSinceRef.current = true;
              if (turnCompleteTimeoutRef.current) {
                clearTimeout(turnCompleteTimeoutRef.current);
                turnCompleteTimeoutRef.current = null;
              }
            }
            if (data.finished) {
              pushTurn("patient", data.text);
              pendingInputRef.current = "";
              setPendingPatientText("");
            }
          },

          onOutputTranscript: (data: TranscriptionData) => {
            const allow = !agentTurnEndedRef.current || userSpokeSinceRef.current;
            if (!allow) return;
            if (userSpokeSinceRef.current) {
              userSpokeSinceRef.current = false;
              agentTurnEndedRef.current = false;
            }
            pendingOutputRef.current = data.text;
            if (data.finished) {
              pushTurn("agent", data.text);
              pendingOutputRef.current = "";
              setPendingAgentText("");
            }
          },

          onInterrupted: () => {
            // Stop any currently playing agent audio when Gemini reports
            // that the user has interrupted. This avoids talking over them
            // without adding extra client-side delays.
            playerRef.current?.interrupt();
            if (pendingOutputRef.current.trim()) {
              pushTurn("agent", pendingOutputRef.current);
              pendingOutputRef.current = "";
              setPendingAgentText("");
            }
          },

          onTurnComplete: () => {
            if (turnCompleteTimeoutRef.current) clearTimeout(turnCompleteTimeoutRef.current);
            turnCompleteTimeoutRef.current = setTimeout(() => {
              turnCompleteTimeoutRef.current = null;
              agentTurnEndedRef.current = true;
            }, TURN_END_GRACE_MS);
          },

          onError: (error) => {
            console.error("[VoiceSession] Error:", error);
            setErrorMessage(error);
            setStatus("error");
            stopTimer();
          },

          onClose: () => {
            if (status !== "ended") {
              stopTimer();
            }
          },
        },
        {
          patientName: params.patientName,
          userId: params.patientId,
          token,
        }
      );

      clientRef.current = client;
      client.connect();
    } catch (err) {
      console.error("Session start failed:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to start session"
      );
      setStatus("error");
    }
  }, [params, pushTurn, startTimer, stopTimer, status, user]);

  // ── Toggle mic ──────────────────────────────────────────────────────────

  const toggleMic = useCallback(() => {
    const streamer = streamerRef.current;
    if (!streamer) return;

    if (streamer.muted) {
      streamer.unmute();
      setIsMicMuted(false);
    } else {
      streamer.mute();
      setIsMicMuted(true);
    }
  }, []);

  // ── End session ─────────────────────────────────────────────────────────

  const endSession = useCallback(async (): Promise<BriefContent | null> => {
    stopTimer();

    // Flush any pending partial transcriptions before tearing down
    if (pendingInputRef.current.trim()) {
      pushTurn("patient", pendingInputRef.current);
      pendingInputRef.current = "";
    }
    if (pendingOutputRef.current.trim()) {
      pushTurn("agent", pendingOutputRef.current);
      pendingOutputRef.current = "";
    }
    setPendingAgentText("");
    setPendingPatientText("");

    streamerRef.current?.stop();
    streamerRef.current = null;
    clientRef.current?.disconnect();
    clientRef.current = null;
    playerRef.current?.destroy();
    playerRef.current = null;

    setStatus("ended");

    // Read transcript synchronously from ref (not async React state)
    const transcriptSnapshot = transcriptRef.current;
    const duration = elapsedRef.current;

    if (transcriptSnapshot.length === 0) {
      return null;
    }

    const transcriptText = transcriptSnapshot
      .map((t) => `${t.speaker === "agent" ? "Prelude" : "Patient"}: ${t.text}`)
      .join("\n\n");

    setIsGeneratingBrief(true);
    try {
      const result = await generateBrief(
        transcriptText,
        undefined,
        params.patientId,
        undefined,
        duration
      );
      setBrief(result);

      return result;
    } catch (err) {
      console.error("Brief generation failed:", err);
      setErrorMessage("Brief generation failed. You can try again from your dashboard.");
      return null;
    } finally {
      setIsGeneratingBrief(false);
    }
  }, [stopTimer, pushTurn, params.patientId]);

  return {
    status,
    transcript,
    pendingAgentText,
    pendingPatientText,
    elapsed,
    isMicMuted,
    isAgentThinking,
    errorMessage,
    brief,
    isGeneratingBrief,
    startSession,
    toggleMic,
    endSession,
  };
}
