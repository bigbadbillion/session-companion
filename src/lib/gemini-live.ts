import { createSessionWebSocket } from "./gemini";

// ── ADK Event types ──────────────────────────────────────────────────────

export type LiveResponseType =
  | "setupComplete"
  | "audio"
  | "text"
  | "inputTranscription"
  | "outputTranscription"
  | "turnComplete"
  | "interrupted"
  | "toolCall"
  | "error";

export interface TranscriptionData {
  text: string;
  finished: boolean;
}

// ── Setup config ────────────────────────────────────────────────────────

export interface GeminiLiveConfig {
  model?: string;
  systemInstruction: string;
  voiceName?: string;
  enableAffectiveDialog?: boolean;
  temperature?: number;
}

// ── Callbacks ───────────────────────────────────────────────────────────

export interface GeminiLiveCallbacks {
  onSetupComplete?: () => void;
  onAudio?: (base64Pcm: string) => void;
  onText?: (text: string) => void;
  onInputTranscript?: (data: TranscriptionData) => void;
  onOutputTranscript?: (data: TranscriptionData) => void;
  onTurnComplete?: () => void;
  onInterrupted?: () => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

// ── ADK Event interface ─────────────────────────────────────────────────

interface AdkEventPart {
  text?: string;
  thought?: boolean;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  functionCall?: Record<string, unknown>;
}

interface AdkEvent {
  content?: {
    parts?: AdkEventPart[];
    role?: string;
  };
  author?: string;
  partial?: boolean;
  turnComplete?: boolean;
  interrupted?: boolean;
  inputTranscription?: {
    text?: string;
    finished?: boolean;
  };
  outputTranscription?: {
    text?: string;
    finished?: boolean;
  };
  actions?: Record<string, unknown>;
  id?: string;
  invocationId?: string;
  timestamp?: number;
}

// ── Connection options (passed through to WebSocket URL) ─────────────────

export interface GeminiLiveConnectionOpts {
  patientName?: string;
  userId?: string;
  sessionId?: string;
  token?: string | null;
}

// ── Client class (ADK protocol) ─────────────────────────────────────────

/** Max time to wait for WebSocket to open before treating as timeout (ms). */
const HANDSHAKE_TIMEOUT_MS = 25_000;

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private callbacks: GeminiLiveCallbacks;
  private config: GeminiLiveConfig;
  private connOpts: GeminiLiveConnectionOpts;
  private _connected = false;
  private setupNotified = false;
  private handshakeTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(
    config: GeminiLiveConfig,
    callbacks: GeminiLiveCallbacks,
    connOpts: GeminiLiveConnectionOpts = {}
  ) {
    this.config = config;
    this.callbacks = callbacks;
    this.connOpts = connOpts;
  }

  get connected(): boolean {
    return this._connected;
  }

  private clearHandshakeTimeout(): void {
    if (this.handshakeTimeoutId != null) {
      clearTimeout(this.handshakeTimeoutId);
      this.handshakeTimeoutId = null;
    }
  }

  connect(): void {
    this.ws = createSessionWebSocket(this.connOpts);

    this.handshakeTimeoutId = setTimeout(() => {
      this.handshakeTimeoutId = null;
      if (this.ws?.readyState !== WebSocket.OPEN) {
        this.ws?.close();
        this.ws = null;
        this._connected = false;
        this.callbacks.onError?.(
          "Connection timed out. Make sure the backend is running (e.g. port 8000) and try again."
        );
      }
    }, HANDSHAKE_TIMEOUT_MS);

    this.ws.onopen = () => {
      this.clearHandshakeTimeout();
      this._connected = true;
      // ADK handles setup internally — notify the app that we're ready
      // once the WebSocket is open. The first downstream event confirms
      // the agent is live.
      if (!this.setupNotified) {
        this.setupNotified = true;
        this.callbacks.onSetupComplete?.();
      }
    };

    this.ws.onmessage = async (event: MessageEvent) => {
      try {
        let jsonStr: string;
        if (event.data instanceof Blob) {
          jsonStr = await event.data.text();
        } else if (event.data instanceof ArrayBuffer) {
          jsonStr = new TextDecoder().decode(event.data);
        } else {
          jsonStr = event.data;
        }
        const parsed = JSON.parse(jsonStr);

        // Backend may send {error: "..."} when the model connection fails
        if (parsed.error) {
          this.callbacks.onError?.(parsed.error);
          return;
        }

        this.handleAdkEvent(parsed);
      } catch (err) {
        console.error("[GeminiLive] Failed to parse ADK event:", err);
      }
    };

    this.ws.onerror = () => {
      this.clearHandshakeTimeout();
      this._connected = false;
      this.callbacks.onError?.("WebSocket connection error");
    };

    this.ws.onclose = (ev) => {
      this.clearHandshakeTimeout();
      const wasConnected = this._connected;
      this._connected = false;
      if (ev.code === 4401) {
        this.callbacks.onError?.("Please sign in again.");
      } else if (ev.code === 1000) {
        // Normal closure (e.g. user ended session). Don't treat as error even if
        // we already set _connected = false in disconnect().
        this.callbacks.onClose?.();
      } else if (wasConnected) {
        this.callbacks.onError?.("Connection to voice session lost unexpectedly.");
      } else {
        this.callbacks.onError?.(
          "Connection failed. Make sure the backend is running and try again."
        );
      }
    };
  }

  disconnect(): void {
    this.clearHandshakeTimeout();
    this._connected = false;
    if (this.ws) {
      // Use 1000 (normal closure) so onclose calls onClose, not onError.
      // Otherwise the UI shows "Connection lost" when the user intentionally ends the session.
      this.ws.close(1000, "Session ended");
      this.ws = null;
    }
  }

  /**
   * Send raw PCM16 audio bytes as a binary WebSocket frame.
   * This is the ADK protocol: binary frames for real-time audio.
   */
  sendAudioBytes(pcmBuffer: ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(pcmBuffer);
    }
  }

  /**
   * Legacy method: send base64-encoded audio as a JSON message.
   * The ADK backend accepts this via {"type": "audio", "data": "..."}.
   */
  sendAudio(base64Pcm: string): void {
    this.sendJson({ type: "audio", data: base64Pcm });
  }

  sendText(text: string): void {
    this.sendJson({ type: "text", text });
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private sendJson(msg: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleAdkEvent(event: AdkEvent): void {
    // Turn complete
    if (event.turnComplete) {
      this.callbacks.onTurnComplete?.();
      return;
    }

    // Interrupted (barge-in)
    if (event.interrupted) {
      this.callbacks.onInterrupted?.();
      return;
    }

    // Input transcription (patient speech → text)
    if (event.inputTranscription?.text) {
      this.callbacks.onInputTranscript?.({
        text: event.inputTranscription.text,
        finished: event.inputTranscription.finished ?? false,
      });
    }

    // Output transcription (agent speech → text)
    if (event.outputTranscription?.text) {
      this.callbacks.onOutputTranscript?.({
        text: event.outputTranscription.text,
        finished: event.outputTranscription.finished ?? false,
      });
    }

    // Content parts (audio or text)
    const parts = event.content?.parts;
    if (!parts?.length) return;

    for (const part of parts) {
      // Skip thinking/reasoning text
      if (part.thought) continue;

      if (part.text) {
        this.callbacks.onText?.(part.text);
      } else if (part.inlineData) {
        const mime = part.inlineData.mimeType || "";
        if (mime.startsWith("audio/")) {
          this.callbacks.onAudio?.(part.inlineData.data);
        }
      }
    }
  }
}
