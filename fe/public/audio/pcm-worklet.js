/* Mono PCM16 audio capture. No audio is retained in browser storage. */
class JudePCM extends AudioWorkletProcessor {
  constructor() {
    super();
    this.samples = [];
    this.stopped = false;
    this.port.onmessage = (event) => {
      if (event.data.type === "flush") {
        this.stopped = true;
        this.flush();
        this.port.postMessage({ type: "flushed" });
      }
    };
  }
  flush() {
    if (!this.samples.length) return;
    const pcm = new Int16Array(this.samples);
    this.port.postMessage(pcm.buffer, [pcm.buffer]);
    this.samples = [];
  }
  process(inputs) {
    if (this.stopped) return true;
    const channels = inputs[0];
    if (!channels?.length) return true;
    for (let i = 0; i < channels[0].length; i++) {
      let value = 0;
      for (const channel of channels) value += channel[i] / channels.length;
      this.samples.push(Math.round(Math.max(-1, Math.min(1, value)) * 32767));
    }
    if (this.samples.length >= 2048) {
      this.flush();
    }
    return true;
  }
}
registerProcessor("jude-pcm", JudePCM);
