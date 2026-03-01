import { createSessionWebSocket } from "./gemini";

// ── Response types ──────────────────────────────────────────────────────────

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

// ── Setup config ────────────────────────────────────────────────────────────

export interface GeminiLiveConfig {
  model?: string;
  systemInstruction: string;
  voiceName?: string;
  enableAffectiveDialog?: boolean;
  temperature?: number;
}

// ── Callbacks ───────────────────────────────────────────────────────────────

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

// ── Client class ────────────────────────────────────────────────────────────

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private callbacks: GeminiLiveCallbacks;
  private config: GeminiLiveConfig;
  private _connected = false;

  constructor(config: GeminiLiveConfig, callbacks: GeminiLiveCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
  }

  get connected(): boolean {
    return this._connected;
  }

  connect(): void {
    this.ws = createSessionWebSocket();

    this.ws.onopen = () => {
      this.sendSetup();
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
        this.handleMessage(JSON.parse(jsonStr));
      } catch (err) {
        console.error("[GeminiLive] Failed to parse message:", err);
      }
    };

    this.ws.onerror = () => {
      this._connected = false;
      this.callbacks.onError?.("WebSocket connection error");
    };

    this.ws.onclose = () => {
      this._connected = false;
      this.callbacks.onClose?.();
    };
  }

  disconnect(): void {
    this._connected = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  sendAudio(base64Pcm: string): void {
    this.send({
      realtimeInput: {
        audio: { mimeType: "audio/pcm", data: base64Pcm },
      },
    });
  }

  sendText(text: string): void {
    this.send({
      clientContent: {
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true,
      },
    });
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private send(msg: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private sendSetup(): void {
    const model = this.config.model ?? "models/gemini-2.5-flash-native-audio-latest";
    const voice = this.config.voiceName ?? "Puck";

    const setup: Record<string, unknown> = {
      setup: {
        model,
        generationConfig: {
          responseModalities: ["AUDIO"],
          temperature: this.config.temperature ?? 0.9,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
          ...(this.config.enableAffectiveDialog !== false && {
            enableAffectiveDialog: true,
          }),
        },
        systemInstruction: {
          parts: [{ text: this.config.systemInstruction }],
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: false,
            silenceDurationMs: 2000,
            prefixPaddingMs: 500,
          },
        },
      },
    };

    this.send(setup);
  }

  private handleMessage(data: Record<string, unknown>): void {
    // Setup complete
    if (data.setupComplete) {
      this._connected = true;
      this.callbacks.onSetupComplete?.();
      return;
    }

    const sc = data.serverContent as Record<string, unknown> | undefined;
    if (!sc) return;

    // Turn complete
    if (sc.turnComplete) {
      this.callbacks.onTurnComplete?.();
      return;
    }

    // Interrupted (barge-in)
    if (sc.interrupted) {
      this.callbacks.onInterrupted?.();
      return;
    }

    // Input transcription (patient speech → text)
    if (sc.inputTranscription) {
      const t = sc.inputTranscription as Record<string, unknown>;
      this.callbacks.onInputTranscript?.({
        text: (t.text as string) ?? "",
        finished: (t.finished as boolean) ?? false,
      });
      return;
    }

    // Output transcription (agent speech → text)
    if (sc.outputTranscription) {
      const t = sc.outputTranscription as Record<string, unknown>;
      this.callbacks.onOutputTranscript?.({
        text: (t.text as string) ?? "",
        finished: (t.finished as boolean) ?? false,
      });
      return;
    }

    // Model turn parts (audio or text)
    const modelTurn = sc.modelTurn as Record<string, unknown> | undefined;
    const parts = modelTurn?.parts as Array<Record<string, unknown>> | undefined;
    if (!parts?.length) return;

    for (const part of parts) {
      if (part.text) {
        this.callbacks.onText?.(part.text as string);
      } else if (part.inlineData) {
        const inline = part.inlineData as Record<string, string>;
        this.callbacks.onAudio?.(inline.data);
      }
    }
  }
}
