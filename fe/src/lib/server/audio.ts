import { z } from "zod";
import type { Runtime } from "./runtime";
import {
  cookieToken,
  hash,
  hearingFor,
  locked,
  publish,
  rate,
} from "./runtime";
import { seconds } from "./database";
import type { Case, Tables } from "./contracts";
import { assert, ProviderError } from "./errors";
import { requestJson } from "./providers";
import { enqueue, stageJob } from "./jobs";
export const audioInput = z.strictObject({
  hearing_id: z.uuid().nullable(),
  language: z.enum(["id", "en"]),
  sample_rate: z.union([
    z.literal(16000),
    z.literal(22050),
    z.literal(24000),
    z.literal(44100),
    z.literal(48000),
  ]),
  authorized: z.literal(true),
  start_offset: z.number().min(0).max(604800).default(0),
});
const speechResult = z.object({
  type: z.string(),
  start_time: z.number().min(0).max(300).optional(),
  end_time: z.number().min(0).max(300).optional(),
  speaker: z.string().max(64).optional(),
  alternatives: z
    .array(
      z.object({
        content: z.string().max(6000),
        speaker: z.string().max(64).optional(),
        confidence: z.number().min(0).max(1).optional(),
      }),
    )
    .max(10),
});
export const audioBatch = z.strictObject({
  sequence: z.number().int().min(1),
  results: z.array(speechResult).max(3000),
});
export function normalizeTranscript(results: z.output<typeof speechResult>[]) {
  const groups: {
    speaker: string;
    text: string;
    start: number;
    end: number;
    confidences: number[];
  }[] = [];
  for (const result of results) {
    const alt = result.alternatives[0];
    if (!alt) continue;
    const speaker = alt.speaker || result.speaker || "Unknown";
    let group = groups.at(-1);
    if (result.type === "punctuation" && group) {
      group.text += alt.content;
      continue;
    }
    if (!group || group.speaker !== speaker) {
      group = {
        speaker,
        text: "",
        start: result.start_time || 0,
        end: 0,
        confidences: [],
      };
      groups.push(group);
    }
    group.text += (group.text ? " " : "") + alt.content;
    group.end = result.end_time ?? group.start;
    if (alt.confidence !== undefined) group.confidences.push(alt.confidence);
  }
  return groups
    .filter((g) => g.text.trim())
    .map(({ confidences, ...group }) => ({
      ...group,
      confidence: confidences.length
        ? confidences.reduce((n, c) => n + c, 0) / confidences.length
        : null,
    }));
}
export async function expireAudio(rt: Runtime, caseId?: string) {
  const stale = await rt.db.all(
    "audio_sessions",
    `status=? AND expires<?${caseId ? " AND case_id=?" : ""}`,
    ["active", seconds(), ...(caseId ? [caseId] : [])],
  );
  for (const session of stale) await finishSession(rt, session);
  // A revoked login cascades its sessions; recover their live badges too.
  const orphaned = await rt.db.all(
    "cases",
    `status=?${caseId ? " AND id=?" : ""} AND NOT EXISTS (SELECT 1 FROM jude_audio_sessions a WHERE a.case_id=jude_cases.id AND a.status=? AND a.expires>?)`,
    ["live", ...(caseId ? [caseId] : []), "active", seconds()],
    "LIMIT 100",
  );
  for (const record of orphaned) {
    await rt.db.update(
      "hearings",
      { status: "paused" },
      "case_id=? AND status=?",
      [record.id, "live"],
    );
    await rt.db.update("cases", { status: "paused" }, "id=? AND status=?", [
      record.id,
      "live",
    ]);
  }
  await rt.db.remove(
    "audio_sessions",
    `status=? AND expires<?${caseId ? " AND case_id=?" : ""}`,
    ["closed", seconds() - 3600, ...(caseId ? [caseId] : [])],
  );
}
async function finishSession(rt: Runtime, session: Tables["audio_sessions"]) {
  await rt.db.transaction(async (db) => {
    await db.update("audio_sessions", { status: "closed" }, "id=?", [
      session.id,
    ]);
    const other = await db.one(
      "audio_sessions",
      "case_id=? AND status=? AND expires>?",
      [session.case_id, "active", seconds()],
    );
    if (!other) {
      await db.update("cases", { status: "paused" }, "id=? AND status=?", [
        session.case_id,
        "live",
      ]);
      await db.update("hearings", { status: "paused" }, "id=? AND status=?", [
        session.hearing_id,
        "live",
      ]);
    }
  });
  await publish(rt, session.case_id, { type: "session" });
}
export async function beginAudio(
  rt: Runtime,
  record: Case,
  request: Request,
  body: z.output<typeof audioInput>,
) {
  assert(
    rt.config.speechKey,
    503,
    "Speechmatics is not configured. Use a simulated hearing or add transcript text.",
  );
  await rate(rt, `audio:${record.owner_id}`, 30, 3600);
  return locked(rt, `audio:start:${record.id}`, async () => {
    await expireAudio(rt, record.id);
    assert(
      !(await rt.db.one(
        "audio_sessions",
        "case_id=? AND status=? AND expires>?",
        [record.id, "active", seconds()],
      )) && !rt.simulations.has(record.id),
      409,
      "Another audio connection or hearing is active. Stop it before reconnecting.",
    );
    const hearing = await hearingFor(rt, record.id, body.hearing_id);
    // Matches the Speechmatics temporary-key endpoint used by @speechmatics/auth.
    const credentials = await requestJson(
      rt,
      "https://mp.speechmatics.com/v1/api_keys?type=rt",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rt.config.speechKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: 300, region: "eu" }),
      },
    );
    if (typeof credentials.key_value !== "string" || !credentials.key_value)
      throw new ProviderError(
        "Speech provider could not create a temporary audio session.",
      );
    const previous = await rt.db.all(
        "segments",
        "hearing_id=?",
        [hearing.id],
        'ORDER BY "end" DESC LIMIT 1',
      ),
      offset = Math.max(previous[0]?.end || 0, body.start_offset);
    const session = await rt.db.transaction(async (db) => {
      const session = await db.insert("audio_sessions", {
        case_id: record.id,
        hearing_id: hearing.id,
        session_hash: hash(cookieToken(request)),
        offset,
        last_sequence: 0,
        expires: seconds() + 300,
        status: "active",
      });
      await db.update("cases", { status: "live" }, "id=?", [record.id]);
      await db.update("hearings", { status: "live" }, "id=?", [hearing.id]);
      return session;
    });
    await publish(rt, record.id, { type: "session" });
    return {
      id: session.id,
      token: credentials.key_value,
      url: rt.config.speechUrl,
      start_offset: offset,
      rotate_after: 210,
    };
  });
}
async function ownedSession(
  rt: Runtime,
  record: Case,
  request: Request,
  id: string,
) {
  const session = await rt.db.one(
    "audio_sessions",
    "id=? AND case_id=? AND session_hash=?",
    [id, record.id, hash(cookieToken(request))],
  );
  assert(session, 404, "Audio session not found.");
  return session;
}
export async function saveAudio(
  rt: Runtime,
  record: Case,
  request: Request,
  id: string,
  body: z.output<typeof audioBatch>,
) {
  return locked(rt, `audio:save:${id}`, async () => {
    const session = await ownedSession(rt, record, request, id);
    assert(
      session.status === "active" && session.expires > seconds(),
      409,
      "Audio session expired. Check the saved transcript before restarting.",
    );
    if (body.sequence <= session.last_sequence)
      return { received: body.sequence };
    assert(
      body.sequence === session.last_sequence + 1,
      409,
      "Audio transcript is out of order. Retry the preceding batch.",
    );
    const groups = normalizeTranscript(body.results);
    assert(
      groups.every((g) => g.text.length <= 6000 && g.end >= g.start),
      422,
      "Invalid speech transcript.",
    );
    const ids = await rt.db.transaction(async (db) => {
      const ids: string[] = [];
      for (const group of groups) {
        const segment = await db.insert("segments", {
          ...group,
          case_id: record.id,
          hearing_id: session.hearing_id,
          origin: "speechmatics",
          speaker: `${session.id.slice(0, 8)}:${group.speaker}`,
          start: group.start + session.offset,
          end: group.end + session.offset,
        });
        if (rt.config.hosted) await stageJob(db, segment.id);
        ids.push(segment.id);
      }
      await db.update(
        "audio_sessions",
        { last_sequence: body.sequence },
        "id=?",
        [id],
      );
      return ids;
    });
    await publish(rt, record.id, { type: "transcript" });
    await Promise.all(ids.map((id) => enqueue(rt, id)));
    return { received: body.sequence };
  });
}
export async function endAudio(
  rt: Runtime,
  record: Case,
  request: Request,
  id: string,
) {
  return locked(rt, `audio:save:${id}`, async () => {
    const session = await ownedSession(rt, record, request, id);
    await finishSession(rt, session);
    return { message: "Audio session stopped" };
  });
}
