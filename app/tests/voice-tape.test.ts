import test from "node:test";
import assert from "node:assert/strict";
import { createVoiceTape, resample } from "../src/lib/voice-tape";

const pcm = (seconds: number, rate: number, value: number) =>
  new Int16Array(Math.round(seconds * rate)).fill(value).buffer;

test("voice tape clips timeline spans as 16 kHz WAV and forgets old audio", async () => {
  const tape = createVoiceTape(48000);
  tape.setOrigin(100);
  tape.push(pcm(3, 48000, 1000));
  tape.push(pcm(3, 48000, -1000));
  assert.equal(tape.clip(100.5, 103), null, "too short for a voiceprint");
  assert.equal(tape.clip(99, 102.5), null, "before the recording started");
  assert.equal(tape.clip(104, 107), null, "not captured yet");
  const clip = tape.clip(101.5, 104.5)!;
  const bytes = new Uint8Array(await clip.arrayBuffer());
  const view = new DataView(bytes.buffer);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "RIFF");
  assert.equal(view.getUint32(24, true), 16000);
  assert.equal(view.getUint32(40, true), 3 * 16000 * 2);
  assert.equal(view.getInt16(44, true), 1000);
  assert.equal(view.getInt16(bytes.length - 2, true), -1000);
  tape.push(pcm(121, 48000, 0));
  assert.equal(tape.clip(101.5, 104.5), null, "older than the two-minute window");
  assert.equal(resample(new Int16Array([0, 300]), 16000, 16000).length, 2);
});
