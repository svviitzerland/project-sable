/**
 * Minimal AWS event-stream framing (vnd.amazon.eventstream) for Amazon Transcribe
 * streaming over WebSocket: string headers only, CRC32 prelude and message checksums.
 * Frame: total length (4) | headers length (4) | prelude CRC (4) | headers | payload | CRC (4).
 */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array, start = 0, end = bytes.length) {
  let crc = 0xffffffff;
  for (let i = start; i < end; i++)
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodeEvent(
  headers: Record<string, string>,
  payload: Uint8Array,
): Uint8Array<ArrayBuffer> {
  const parts: Uint8Array[] = [];
  for (const [name, value] of Object.entries(headers)) {
    const key = encoder.encode(name),
      text = encoder.encode(value);
    const header = new Uint8Array(1 + key.length + 1 + 2 + text.length);
    const view = new DataView(header.buffer);
    header[0] = key.length;
    header.set(key, 1);
    header[1 + key.length] = 7; // string
    view.setUint16(2 + key.length, text.length);
    header.set(text, 4 + key.length);
    parts.push(header);
  }
  const headersLength = parts.reduce((n, p) => n + p.length, 0);
  const total = 12 + headersLength + payload.length + 4;
  const frame = new Uint8Array(total);
  const view = new DataView(frame.buffer);
  view.setUint32(0, total);
  view.setUint32(4, headersLength);
  view.setUint32(8, crc32(frame, 0, 8));
  let offset = 12;
  for (const part of parts) {
    frame.set(part, offset);
    offset += part.length;
  }
  frame.set(payload, offset);
  view.setUint32(total - 4, crc32(frame, 0, total - 4));
  return frame;
}

export function decodeEvent(data: ArrayBuffer | Uint8Array) {
  const frame = data instanceof Uint8Array ? data : new Uint8Array(data);
  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
  const total = view.getUint32(0),
    headersLength = view.getUint32(4);
  if (total !== frame.length || view.getUint32(8) !== crc32(frame, 0, 8))
    throw new Error("Invalid event-stream prelude");
  if (view.getUint32(total - 4) !== crc32(frame, 0, total - 4))
    throw new Error("Invalid event-stream checksum");
  const headers: Record<string, string> = {};
  let offset = 12;
  const end = 12 + headersLength;
  while (offset < end) {
    const nameLength = frame[offset];
    const name = decoder.decode(
      frame.subarray(offset + 1, offset + 1 + nameLength),
    );
    offset += 1 + nameLength;
    const type = frame[offset++];
    if (type !== 7) throw new Error("Unsupported event-stream header type");
    const length = view.getUint16(offset);
    headers[name] = decoder.decode(
      frame.subarray(offset + 2, offset + 2 + length),
    );
    offset += 2 + length;
  }
  return { headers, payload: frame.subarray(end, total - 4) };
}

export const audioEvent = (pcm: Uint8Array) =>
  encodeEvent(
    {
      ":content-type": "application/octet-stream",
      ":event-type": "AudioEvent",
      ":message-type": "event",
    },
    pcm,
  );

/** Transcribe results -> the provider-neutral word/punctuation batch the API stores. */
export type TranscribeItem = {
  StartTime?: number;
  EndTime?: number;
  Type?: string;
  Content?: string;
  Speaker?: string;
  Confidence?: number;
};
export type TranscribeResult = {
  IsPartial?: boolean;
  StartTime?: number;
  EndTime?: number;
  Alternatives?: { Transcript?: string; Items?: TranscribeItem[] }[];
};
export function toBatchResults(result: TranscribeResult) {
  const items = result.Alternatives?.[0]?.Items ?? [];
  return items.map((item) =>
    item.Type === "punctuation"
      ? { type: "punctuation", alternatives: [{ content: item.Content ?? "" }] }
      : {
          type: "word",
          start_time: item.StartTime ?? result.StartTime ?? 0,
          end_time: item.EndTime ?? result.EndTime ?? 0,
          alternatives: [
            {
              content: item.Content ?? "",
              ...(item.Speaker ? { speaker: `spk_${item.Speaker}` } : {}),
              ...(typeof item.Confidence === "number"
                ? { confidence: item.Confidence }
                : {}),
            },
          ],
        },
  );
}
