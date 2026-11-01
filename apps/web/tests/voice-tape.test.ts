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
  assert.equal(
    tape.clip(101.5, 104.5),
    null,
    "older than the two-minute window",
  );
  assert.equal(resample(new Int16Array([0, 300]), 16000, 16000).length, 2);
});

test("AWS event-stream frames round-trip with valid checksums and map Transcribe items", async () => {
  const { audioEvent, decodeEvent, encodeEvent, toBatchResults, crc32 } =
    await import("../src/lib/aws-eventstream");
  // Reference CRC32 of "123456789".
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  const pcm = new Uint8Array([1, 2, 3, 4]);
  const decoded = decodeEvent(audioEvent(pcm));
  assert.equal(decoded.headers[":event-type"], "AudioEvent");
  assert.deepEqual([...decoded.payload], [1, 2, 3, 4]);
  const frame = encodeEvent({ ":message-type": "event" }, new Uint8Array(0));
  frame[frame.length - 1] ^= 1;
  assert.throws(() => decodeEvent(frame), /checksum/);
  assert.deepEqual(
    toBatchResults({
      IsPartial: false,
      Alternatives: [
        {
          Items: [
            {
              Type: "pronunciation",
              Content: "Saya",
              StartTime: 1,
              EndTime: 1.4,
              Speaker: "0",
              Confidence: 0.9,
            },
            { Type: "punctuation", Content: "." },
          ],
        },
      ],
    }),
    [
      {
        type: "word",
        start_time: 1,
        end_time: 1.4,
        alternatives: [{ content: "Saya", speaker: "spk_0", confidence: 0.9 }],
      },
      { type: "punctuation", alternatives: [{ content: "." }] },
    ],
  );
});
