import { useState, useRef, useCallback, useEffect } from "react";
import { GeminiLiveClient, type TranscriptionData } from "@/lib/gemini-live";
import { AudioStreamer, AudioPlayer } from "@/lib/audio";
import { generateBrief, type BriefContent } from "@/lib/gemini";
import { buildSessionSystemPrompt, BRIEF_GENERATOR_PROMPT } from "@/lib/session-prompts";
import { saveSession, saveBrief } from "@/lib/firestore-sessions";

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
  elapsed: number;
  isMicMuted: boolean;
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
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [brief, setBrief] = useState<BriefContent | null>(null);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);

  const clientRef = useRef<GeminiLiveClient | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  // Mirror of transcript state for synchronous reads in endSession
  const transcriptRef = useRef<TranscriptTurn[]>([]);

  // Partial transcription accumulators
  const pendingInputRef = useRef("");
  const pendingOutputRef = useRef("");

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
      stopTimer();
      streamerRef.current?.stop();
      playerRef.current?.destroy();
      clientRef.current?.disconnect();
    };
  }, [stopTimer]);

  // ── Transcript helpers ──────────────────────────────────────────────────

  const pushTurn = useCallback(
    (speaker: "agent" | "patient", text: string) => {
      if (!text.trim()) return;
      const turn: TranscriptTurn = { speaker, text: text.trim(), timestamp: Date.now() };
      transcriptRef.current = [...transcriptRef.current, turn];
      setTranscript(transcriptRef.current);
    },
    []
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
    pendingInputRef.current = "";
    pendingOutputRef.current = "";

    try {
      const player = new AudioPlayer();
      await player.init();
      playerRef.current = player;

      const systemInstruction = buildSessionSystemPrompt({
        patientName: params.patientName,
      });

      const client = new GeminiLiveClient(
        {
          systemInstruction,
          enableAffectiveDialog: true,
          voiceName: "Puck",
          temperature: 0.9,
        },
        {
          onSetupComplete: async () => {
            setStatus("active");
            startTimer();

            // Nudge the model to begin its greeting immediately
            clientRef.current?.sendText("(Session started. Please begin with your warm greeting.)");

            // Start mic streaming
            try {
              const streamer = new AudioStreamer();
              streamer.onAudioChunk = (b64) => {
                clientRef.current?.sendAudio(b64);
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
            playerRef.current?.play(base64Pcm);
          },

          onInputTranscript: (data: TranscriptionData) => {
            pendingInputRef.current += data.text;
            if (data.finished) {
              pushTurn("patient", pendingInputRef.current);
              pendingInputRef.current = "";
            }
          },

          onOutputTranscript: (data: TranscriptionData) => {
            pendingOutputRef.current += data.text;
            if (data.finished) {
              pushTurn("agent", pendingOutputRef.current);
              pendingOutputRef.current = "";
            }
          },

          onInterrupted: () => {
            playerRef.current?.interrupt();
            // Flush any partial output transcription
            if (pendingOutputRef.current.trim()) {
              pushTurn("agent", pendingOutputRef.current);
              pendingOutputRef.current = "";
            }
          },

          onTurnComplete: () => {
            // Flush any remaining partial output
            if (pendingOutputRef.current.trim()) {
              pushTurn("agent", pendingOutputRef.current);
              pendingOutputRef.current = "";
            }
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
  }, [params, pushTurn, startTimer, stopTimer, status]);

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
      const result = await generateBrief(transcriptText, BRIEF_GENERATOR_PROMPT);
      setBrief(result);

      // Persist to Firestore (best-effort, don't block UX)
      if (params.patientId) {
        try {
          const sessionId = await saveSession(
            params.patientId,
            transcriptSnapshot,
            duration
          );
          await saveBrief(sessionId, params.patientId, result);
        } catch (saveErr) {
          console.error("Firestore save failed (non-blocking):", saveErr);
        }
      }

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
    elapsed,
    isMicMuted,
    errorMessage,
    brief,
    isGeneratingBrief,
    startSession,
    toggleMic,
    endSession,
  };
}
