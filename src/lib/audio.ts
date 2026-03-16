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

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // ADK's model_dump_json() may emit base64url encoding (RFC 4648 §5).
  // Convert to standard base64 so atob() can handle it.
  let std = base64.replace(/-/g, "+").replace(/_/g, "/");
  while (std.length % 4) std += "=";

  const raw = atob(std);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes.buffer;
}

function base64ToPcm16Float32(base64: string): Float32Array {
  const buf = base64ToArrayBuffer(base64);
  const int16 = new Int16Array(buf);
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

  /** Legacy callback: base64-encoded PCM16 chunks */
  onAudioChunk: ((base64Pcm: string) => void) | null = null;

  /** ADK protocol callback: raw PCM16 ArrayBuffer for binary WebSocket frames */
  onAudioBytes: ((pcmBuffer: ArrayBuffer) => void) | null = null;

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
        // Prefer binary callback (ADK protocol) over base64 (legacy)
        if (this.onAudioBytes) {
          this.onAudioBytes(pcm);
        } else if (this.onAudioChunk) {
          this.onAudioChunk(arrayBufferToBase64(pcm));
        }
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

// ── WebRTC loopback for Chrome/Safari AEC (production echo fix) ──────────────
// Chrome only applies echo cancellation to audio from RTCPeerConnection.
// Routing our agent playback through a local loopback makes Chrome treat it as
// "remote" audio and cancel it from the mic. Safari may use the loopback when
// it succeeds, or fall back to normal playback (Safari often applies AEC to
// default output anyway). See Chromium bug 687574 and
// https://gist.github.com/alexciarlillo/4b9f75516f93c10d7b39282d10cd17bc

const LOOPBACK_TIMEOUT_MS = 4000;

async function createLoopbackAudioElement(
  sendStream: MediaStream
): Promise<{ loopbackStream: MediaStream; audioElement: HTMLAudioElement } | null> {
  const pcA = new RTCPeerConnection();
  const pcB = new RTCPeerConnection();
  const loopbackStream = new MediaStream();

  return new Promise((resolve) => {
    let resolved = false;
    const cleanup = () => {
      pcA.close();
      pcB.close();
    };

    const tryResolve = () => {
      if (
        resolved ||
        loopbackStream.getTracks().length === 0 ||
        (pcA.iceConnectionState !== "connected" && pcA.iceConnectionState !== "completed")
      )
        return;
      resolved = true;
      clearTimeout(timeoutId);
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.setAttribute("data-prelude-loopback", "true");
      audio.style.cssText =
        "position:fixed;width:0;height:0;opacity:0;pointer-events:none;";
      audio.srcObject = loopbackStream;
      document.body.appendChild(audio);
      resolve({ loopbackStream, audioElement: audio });
    };

    const timeoutId = setTimeout(() => {
      if (resolved) return;
      cleanup();
      console.warn("[Audio] WebRTC loopback timed out; echo cancellation may be limited.");
      resolve(null);
    }, LOOPBACK_TIMEOUT_MS);

    pcB.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach((t) => loopbackStream.addTrack(t));
      tryResolve();
    };

    pcA.onicecandidate = (e) => {
      if (e.candidate) pcB.addIceCandidate(e.candidate).catch(() => {});
    };
    pcB.onicecandidate = (e) => {
      if (e.candidate) pcA.addIceCandidate(e.candidate).catch(() => {});
    };

    pcA.oniceconnectionstatechange = () => {
      if (pcA.iceConnectionState === "failed" || pcA.iceConnectionState === "disconnected") {
        if (!resolved) {
          clearTimeout(timeoutId);
          cleanup();
          resolve(null);
        }
      } else {
        tryResolve();
      }
    };

    sendStream.getTracks().forEach((track) => pcA.addTrack(track, sendStream));

    pcA
      .createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false })
      .then((offer) => pcA.setLocalDescription(offer))
      .then(() => pcB.setRemoteDescription(pcA.localDescription!))
      .then(() => pcB.createAnswer())
      .then((answer) => pcB.setLocalDescription(answer))
      .then(() => pcA.setRemoteDescription(pcB.localDescription!))
      .then(() => tryResolve())
      .catch((err) => {
        if (!resolved) {
          clearTimeout(timeoutId);
          cleanup();
          console.warn("[Audio] WebRTC loopback failed:", err);
          resolve(null);
        }
      });
  });
}

// ── AudioPlayer (base64 PCM 24 kHz → speaker) ──────────────────────────────

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private gainNode: GainNode | null = null;
  private streamDestination: MediaStreamAudioDestinationNode | null = null;
  private loopbackAudioElement: HTMLAudioElement | null = null;
  private _ready = false;
  private _loopbackReady = false;

  get ready(): boolean {
    return this._ready;
  }

  /** True when playback is routed through WebRTC loopback (Chrome AEC applies). */
  get loopbackReady(): boolean {
    return this._loopbackReady;
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

    this.streamDestination = this.audioContext.createMediaStreamDestination();
    this.workletNode.connect(this.gainNode);
    this.gainNode.connect(this.streamDestination);

    const result = await createLoopbackAudioElement(this.streamDestination.stream);
    if (result) {
      this.loopbackAudioElement = result.audioElement;
      this._loopbackReady = true;
    } else {
      this.gainNode.disconnect();
      this.gainNode.connect(this.audioContext.destination);
    }

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
    this._loopbackReady = false;
    this.loopbackAudioElement?.remove();
    this.loopbackAudioElement = null;
    this.workletNode?.disconnect();
    this.gainNode?.disconnect();
    this.streamDestination = null;
    this.audioContext?.close();
    this.workletNode = null;
    this.gainNode = null;
    this.audioContext = null;
  }
}
