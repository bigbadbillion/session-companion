import { useState, useRef, useCallback, useEffect } from "react";
import { GeminiLiveClient, type TranscriptionData } from "@/lib/gemini-live";
import { AudioStreamer, AudioPlayer } from "@/lib/audio";
import { generateBrief, type BriefContent } from "@/lib/gemini";

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

  // Latest partial transcription (replacement, not delta)
  const pendingInputRef = useRef("");
  const pendingOutputRef = useRef("");

  // Track whether the agent has spoken — drives "connecting" → "active"
  const agentHasSpokenRef = useRef(false);

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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3f40d80b-f5c9-4044-bf55-722475fc32a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceSession.ts:pushTurn',message:'pushTurn called',data:{speaker,textPreview:text.trim().substring(0,120),existingTurnCount:transcriptRef.current.length},timestamp:Date.now(),hypothesisId:'A,B,C'})}).catch(()=>{});
      // #endregion
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
    agentHasSpokenRef.current = false;

    try {
      const player = new AudioPlayer();
      await player.init();
      playerRef.current = player;

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
            if (!agentHasSpokenRef.current) {
              agentHasSpokenRef.current = true;
              setStatus("active");
              startTimer();
            }
            playerRef.current?.play(base64Pcm);
          },

          onInputTranscript: (data: TranscriptionData) => {
            // ADK sends replacement text (full text so far), not deltas
            pendingInputRef.current = data.text;
            if (data.finished) {
              pushTurn("patient", data.text);
              pendingInputRef.current = "";
            }
          },

          onOutputTranscript: (data: TranscriptionData) => {
            pendingOutputRef.current = data.text;
            if (data.finished) {
              pushTurn("agent", data.text);
              pendingOutputRef.current = "";
            }
          },

          onInterrupted: () => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/3f40d80b-f5c9-4044-bf55-722475fc32a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVoiceSession.ts:onInterrupted',message:'interrupted handler',data:{hasPendingOutput:!!pendingOutputRef.current.trim(),pendingPreview:pendingOutputRef.current.trim().substring(0,100)},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            playerRef.current?.interrupt();
            if (pendingOutputRef.current.trim()) {
              pushTurn("agent", pendingOutputRef.current);
              pendingOutputRef.current = "";
            }
          },

          onTurnComplete: () => {
            // No-op for text — onOutputTranscript is the sole authority.
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
