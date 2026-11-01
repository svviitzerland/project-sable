/**
 * Keeps the last two minutes of captured PCM so a finalized statement's audio can be
 * sent for voice matching. Audio stays in memory and is discarded as recording advances.
 */
const KEEP_SECONDS = 120;
const MIN_SECONDS = 1.6;
const MAX_SECONDS = 25;
const TARGET_RATE = 16000;

export function createVoiceTape(rate: number) {
  let chunks: { first: number; data: Int16Array }[] = [];
  let captured = 0;
  let origin = 0;
  return {
    /** Timeline second of the first captured sample (the hearing offset). */
    setOrigin(seconds: number) {
      origin = seconds;
    },
    push(buffer: ArrayBuffer) {
      const data = new Int16Array(buffer.slice(0));
      chunks.push({ first: captured, data });
      captured += data.length;
      const oldest = captured - KEEP_SECONDS * rate;
      while (chunks.length && chunks[0].first + chunks[0].data.length < oldest)
        chunks.shift();
    },
    /** WAV (16 kHz mono PCM16) for a timeline span, or null if too short or expired. */
    clip(start: number, end: number): Blob | null {
      if (end - start < MIN_SECONDS) return null;
      end = Math.min(end, start + MAX_SECONDS);
      const from = Math.round((start - origin) * rate),
        to = Math.round((end - origin) * rate);
      if (from < 0 || to > captured || !chunks.length || from < chunks[0].first)
        return null;
      const samples = new Int16Array(to - from);
      for (const chunk of chunks) {
        const a = Math.max(from, chunk.first),
          b = Math.min(to, chunk.first + chunk.data.length);
        if (a < b)
          samples.set(
            chunk.data.subarray(a - chunk.first, b - chunk.first),
            a - from,
          );
      }
      return encodeWav(resample(samples, rate, TARGET_RATE), TARGET_RATE);
    },
    reset() {
      chunks = [];
      captured = 0;
    },
  };
}

export function resample(samples: Int16Array, from: number, to: number) {
  if (from === to) return samples;
  const out = new Int16Array(
    Math.max(1, Math.round((samples.length * to) / from)),
  );
  const step = (samples.length - 1) / Math.max(1, out.length - 1);
  for (let i = 0; i < out.length; i++) {
    const position = i * step,
      left = Math.floor(position),
      right = Math.min(samples.length - 1, left + 1),
      weight = position - left;
    out[i] = Math.round(samples[left] * (1 - weight) + samples[right] * weight);
  }
  return out;
}

export function encodeWav(samples: Int16Array, rate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2),
    view = new DataView(buffer);
  const text = (offset: number, value: string) =>
    [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  new Int16Array(buffer, 44).set(samples);
  return new Blob([buffer], { type: "audio/wav" });
}

/** Sends clips one at a time; voice matching is advisory, so failures are dropped. */
export function createVoiceUploader(caseId: string) {
  let disabled = false;
  let queue = Promise.resolve();
  return (segmentId: string, clip: Blob) => {
    if (disabled) return;
    queue = queue.then(async () => {
      if (disabled) return;
      try {
        const response = await fetch(
          `/api/v1/cases/${caseId}/transcripts/${segmentId}/voice`,
          {
            method: "POST",
            body: clip,
            credentials: "same-origin",
            headers: { "Content-Type": "audio/wav" },
          },
        );
        if (response.status === 503 || response.status === 409) disabled = true;
      } catch {
        /* The transcript is already saved; labels stay per connection. */
      }
    });
  };
}
