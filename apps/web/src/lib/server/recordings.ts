import { z } from "zod";
import type { Runtime } from "./runtime";
import { boundedBody, hearingFor, publish } from "./runtime";
import type { Case, Tables } from "./contracts";
import { assert } from "./errors";
import { uid } from "./database";
import { deleteFile, readFileData, saveFile } from "./providers";

/**
 * Audio recordings of live hearing sessions, captured in the browser alongside
 * transcription so testimony can be replayed and verified. Stored privately (S3 in
 * production); recording requires the presiding judge's permission (confirmed before
 * capture starts) and stays deletable.
 */
export const MAX_RECORDING_BYTES = 64 * 1024 * 1024;
const MIMES = new Set(["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg"]);
const recordingQuery = z.object({
  hearing_id: z.uuid(),
  start_offset: z.coerce.number().min(0).max(604800),
  duration: z.coerce.number().min(0).max(86400),
});
export const recordingOutput = z.object({
  id: z.string(),
  hearing_id: z.string(),
  mime: z.string(),
  size: z.number(),
  start_offset: z.number(),
  duration: z.number(),
  created_at: z.string(),
});

export async function saveRecording(
  rt: Runtime,
  record: Case,
  request: Request,
  url: URL,
) {
  const query = recordingQuery.parse(Object.fromEntries(url.searchParams));
  const mime = (request.headers.get("content-type") || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  assert(MIMES.has(mime), 415, "Upload WebM, Ogg, MP4 or MP3 audio.");
  const hearing = await hearingFor(rt, record.id, query.hearing_id);
  const data = await boundedBody(request, MAX_RECORDING_BYTES);
  assert(data.length > 0, 422, "The recording is empty.");
  const id = uid(),
    key = `recordings/${record.id}/${id}.${mime.split("/")[1]}`;
  const storage = await saveFile(rt, key, data, mime);
  const saved = await rt.db.insert("recordings", {
    id,
    case_id: record.id,
    hearing_id: hearing.id,
    storage_key: key,
    storage,
    mime,
    size: data.length,
    start_offset: query.start_offset,
    duration: query.duration,
  });
  await publish(rt, record.id, { type: "recording" });
  return recordingOutput.parse(saved);
}

export async function listRecordings(rt: Runtime, caseId: string) {
  return (
    await rt.db.all("recordings", "case_id=?", [caseId], "ORDER BY created_at")
  ).map((r) => recordingOutput.parse(r));
}

async function owned(rt: Runtime, record: Case, id: string) {
  const recording = await rt.db.one("recordings", "id=? AND case_id=?", [
    id,
    record.id,
  ]);
  assert(recording, 404, "Recording not found.");
  return recording as Tables["recordings"];
}

/** Bytes with HTTP Range support so the browser audio player can seek. */
export async function recordingResponse(
  rt: Runtime,
  record: Case,
  id: string,
  request: Request,
) {
  const recording = await owned(rt, record, id);
  const data = await readFileData(rt, recording);
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") || "");
  const headers = {
    "Content-Type": recording.mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
  };
  if (range && (range[1] || range[2])) {
    const size = data.length;
    const start = range[1]
      ? Number(range[1])
      : Math.max(0, size - Number(range[2]));
    const end =
      range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end)
      return new Response(null, {
        status: 416,
        headers: { ...headers, "Content-Range": `bytes */${size}` },
      });
    return new Response(Buffer.from(data.subarray(start, end + 1)), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}` },
    });
  }
  return new Response(Buffer.from(data), { headers });
}

export async function deleteRecording(rt: Runtime, record: Case, id: string) {
  const recording = await owned(rt, record, id);
  await deleteFile(rt, recording.storage_key, recording.storage);
  await rt.db.remove("recordings", "id=?", [id]);
  await publish(rt, record.id, { type: "recording" });
  return { removed: 1 };
}
