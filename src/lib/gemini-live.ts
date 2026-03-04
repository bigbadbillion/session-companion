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
}

// ── Client class (ADK protocol) ─────────────────────────────────────────

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private callbacks: GeminiLiveCallbacks;
  private config: GeminiLiveConfig;
  private connOpts: GeminiLiveConnectionOpts;
  private _connected = false;
  private setupNotified = false;

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

  connect(): void {
    this.ws = createSessionWebSocket(this.connOpts);

    this.ws.onopen = () => {
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
      this._connected = false;
      this.callbacks.onError?.("WebSocket connection error");
    };

    this.ws.onclose = (ev) => {
      const wasConnected = this._connected;
      this._connected = false;
      if (wasConnected && ev.code !== 1000) {
        this.callbacks.onError?.("Connection to voice session lost unexpectedly.");
      } else {
        this.callbacks.onClose?.();
      }
    };
  }

  disconnect(): void {
    this._connected = false;
    if (this.ws) {
      this.ws.close();
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3f40d80b-f5c9-4044-bf55-722475fc32a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gemini-live.ts:handleAdkEvent',message:'turnComplete',data:{author:event.author},timestamp:Date.now(),hypothesisId:'B,C'})}).catch(()=>{});
      // #endregion
      this.callbacks.onTurnComplete?.();
      return;
    }

    // Interrupted (barge-in)
    if (event.interrupted) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3f40d80b-f5c9-4044-bf55-722475fc32a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gemini-live.ts:handleAdkEvent',message:'interrupted',data:{author:event.author},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      this.callbacks.onInterrupted?.();
      return;
    }

    // Input transcription (patient speech → text)
    if (event.inputTranscription?.text) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3f40d80b-f5c9-4044-bf55-722475fc32a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gemini-live.ts:handleAdkEvent',message:'inputTranscription',data:{text:event.inputTranscription.text?.substring(0,100),finished:event.inputTranscription.finished},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      this.callbacks.onInputTranscript?.({
        text: event.inputTranscription.text,
        finished: event.inputTranscription.finished ?? false,
      });
    }

    // Output transcription (agent speech → text)
    if (event.outputTranscription?.text) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3f40d80b-f5c9-4044-bf55-722475fc32a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gemini-live.ts:handleAdkEvent',message:'outputTranscription',data:{text:event.outputTranscription.text?.substring(0,120),finished:event.outputTranscription.finished},timestamp:Date.now(),hypothesisId:'A,C'})}).catch(()=>{});
      // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3f40d80b-f5c9-4044-bf55-722475fc32a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gemini-live.ts:handleAdkEvent',message:'textPart',data:{text:part.text?.substring(0,120),author:event.author},timestamp:Date.now(),hypothesisId:'A,E'})}).catch(()=>{});
        // #endregion
        this.callbacks.onText?.(part.text);
      } else if (part.inlineData) {
        const mime = part.inlineData.mimeType || "";
        if (mime.startsWith("audio/")) {
          this.callbacks.onAudio?.(part.inlineData.data);
        }
      }
      // #region agent log
      if (part.functionCall) {
        fetch('http://127.0.0.1:7242/ingest/3f40d80b-f5c9-4044-bf55-722475fc32a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gemini-live.ts:handleAdkEvent',message:'functionCall',data:{call:JSON.stringify(part.functionCall).substring(0,200),author:event.author},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
      }
      // #endregion
    }
  }
}
