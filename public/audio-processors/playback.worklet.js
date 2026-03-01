class PCMPlaybackProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];

    this.port.onmessage = (event) => {
      if (event.data === "interrupt") {
        this.queue = [];
      } else if (event.data instanceof Float32Array) {
        this.queue.push(event.data);
      }
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    if (output.length === 0) return true;

    const channel = output[0];
    let written = 0;

    while (written < channel.length && this.queue.length > 0) {
      const buf = this.queue[0];
      if (!buf || buf.length === 0) {
        this.queue.shift();
        continue;
      }

      const remaining = channel.length - written;
      const available = buf.length;
      const count = Math.min(remaining, available);

      for (let i = 0; i < count; i++) {
        channel[written++] = buf[i];
      }

      if (count < available) {
        this.queue[0] = buf.slice(count);
      } else {
        this.queue.shift();
      }
    }

    while (written < channel.length) {
      channel[written++] = 0;
    }

    return true;
  }
}

registerProcessor("pcm-processor", PCMPlaybackProcessor);
