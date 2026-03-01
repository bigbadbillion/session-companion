// ── Helpers ─────────────────────────────────────────────────────────────────

function float32ToPcm16(float32: Float32Array): ArrayBuffer {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s * 0x7fff;
  }
  return int16.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToPcm16Float32(base64: string): Float32Array {
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  return float32;
}

// ── AudioStreamer (mic capture → 16 kHz PCM base64 chunks) ──────────────────

export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private _streaming = false;
  private _muted = false;

  onAudioChunk: ((base64Pcm: string) => void) | null = null;

  get streaming(): boolean {
    return this._streaming;
  }

  async start(): Promise<void> {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.audioContext = new AudioContext({ sampleRate: 16000 });
    await this.audioContext.audioWorklet.addModule(
      "/audio-processors/capture.worklet.js"
    );

    this.workletNode = new AudioWorkletNode(
      this.audioContext,
      "audio-capture-processor"
    );

    this.workletNode.port.onmessage = (event: MessageEvent) => {
      if (!this._streaming || this._muted) return;
      if (event.data?.type === "audio") {
        const pcm = float32ToPcm16(event.data.data as Float32Array);
        const b64 = arrayBufferToBase64(pcm);
        this.onAudioChunk?.(b64);
      }
    };

    this.sourceNode = this.audioContext.createMediaStreamSource(
      this.mediaStream
    );
    this.sourceNode.connect(this.workletNode);

    this._streaming = true;
  }

  mute(): void {
    this._muted = true;
  }

  unmute(): void {
    this._muted = false;
  }

  get muted(): boolean {
    return this._muted;
  }

  stop(): void {
    this._streaming = false;
    this.workletNode?.disconnect();
    this.workletNode?.port.close();
    this.workletNode = null;

    this.sourceNode?.disconnect();
    this.sourceNode = null;

    this.audioContext?.close();
    this.audioContext = null;

    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.mediaStream = null;
  }
}

// ── AudioPlayer (base64 PCM 24 kHz → speaker) ──────────────────────────────

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private gainNode: GainNode | null = null;
  private _ready = false;

  get ready(): boolean {
    return this._ready;
  }

  async init(): Promise<void> {
    if (this._ready) return;

    this.audioContext = new AudioContext({ sampleRate: 24000 });
    await this.audioContext.audioWorklet.addModule(
      "/audio-processors/playback.worklet.js"
    );

    this.workletNode = new AudioWorkletNode(
      this.audioContext,
      "pcm-processor"
    );

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;

    this.workletNode.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this._ready = true;
  }

  async play(base64Pcm: string): Promise<void> {
    if (!this._ready) await this.init();

    if (this.audioContext?.state === "suspended") {
      await this.audioContext.resume();
    }

    const float32 = base64ToPcm16Float32(base64Pcm);
    this.workletNode?.port.postMessage(float32);
  }

  interrupt(): void {
    this.workletNode?.port.postMessage("interrupt");
  }

  destroy(): void {
    this._ready = false;
    this.workletNode?.disconnect();
    this.gainNode?.disconnect();
    this.audioContext?.close();
    this.workletNode = null;
    this.gainNode = null;
    this.audioContext = null;
  }
}
