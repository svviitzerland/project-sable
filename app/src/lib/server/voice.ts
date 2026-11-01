import { z } from "zod";
import type { Runtime } from "./runtime";
import { locked, publish } from "./runtime";
import type { Case, Tables } from "./contracts";
import { assert } from "./errors";
import { requestJson } from "./providers";

/**
 * Stable speaker keys from the optional Python voice service.
 *
 * Speechmatics labels (S1, S2) only last for one connection, so saved turns use
 * `<session>:<label>`. When a finalized turn's audio is identified, every turn from that
 * provider label is re-keyed to `voice:<label>`, which persists across rotations and
 * hearings. A match means "probably the same voice"; names stay user-assigned.
 */
export const VOICE_PREFIX = "voice:";
const MAX_VOICES = 40;
const MAX_ALIASES = 60;
const MAX_SAMPLES = 50;
export const MAX_CLIP_BYTES = 3 * 1024 * 1024;

const identifyOutput = z
  .object({
    model: z.string().min(1).max(200),
    dim: z.number().int().min(1).max(4096),
    embedding: z.array(z.number().finite()),
    match: z.object({ id: z.string(), score: z.number() }).nullable(),
  })
  .refine((o) => o.embedding.length === o.dim, "Embedding size mismatch.");
const healthOutput = z.object({ model: z.string().min(1).max(200) });

type Voiceprint = Tables["voiceprints"];

export const voiceConfigured = (rt: Runtime) =>
  !!rt.config.voiceUrl && rt.config.voiceToken.length >= 16;

const models = new WeakMap<Runtime, string>();
async function activeModel(rt: Runtime) {
  const known = models.get(rt);
  if (known) return known;
  const { model } = healthOutput.parse(
    await requestJson(rt, `${rt.config.voiceUrl}/health`, {}, "Voice API"),
  );
  models.set(rt, model);
  return model;
}

function normalize(vector: number[]) {
  const norm = Math.sqrt(vector.reduce((sum, x) => sum + x * x, 0));
  return norm ? vector.map((x) => Number((x / norm).toFixed(6))) : vector;
}

/** Running mean of normalized embeddings, capped so recent audio still counts. */
export function mergeEmbedding(print: Voiceprint, vector: number[]) {
  const n = Math.min(print.samples, MAX_SAMPLES - 1);
  return normalize(
    print.embedding.map((x, i) => (x * n + vector[i]) / (n + 1)),
  );
}

/** Map provider labels that were already identified to their stable voice key. */
export async function stableSpeakers(rt: Runtime, caseId: string) {
  const map = new Map<string, string>();
  for (const print of await rt.db.all("voiceprints", "case_id=?", [caseId]))
    for (const alias of print.aliases)
      map.set(alias, VOICE_PREFIX + print.label);
  return map;
}

export async function identifySegment(
  rt: Runtime,
  record: Case,
  segmentId: string,
  audio: Uint8Array,
) {
  assert(
    voiceConfigured(rt),
    503,
    "Voice recognition is not configured. Speaker labels stay per recording.",
  );
  assert(
    audio.length >= 44 && audio.length <= MAX_CLIP_BYTES,
    413,
    "Send one WAV clip up to 3 MB.",
  );
  const segment = await rt.db.one("segments", "id=? AND case_id=?", [
    segmentId,
    record.id,
  ]);
  assert(segment, 404, "Statement not found.");
  assert(
    segment.origin === "speechmatics",
    409,
    "Only recorded statements can be matched to a voice.",
  );
  const model = await activeModel(rt);
  return locked(rt, `voice:${record.id}`, async () => {
    const prints = (
      await rt.db.all("voiceprints", "case_id=? AND model=?", [
        record.id,
        model,
      ])
    ).slice(0, MAX_VOICES);
    const form = new FormData();
    form.append(
      "file",
      new Blob([Buffer.from(audio)], { type: "audio/wav" }),
      "clip.wav",
    );
    form.append(
      "candidates",
      JSON.stringify(prints.map((p) => ({ id: p.id, embedding: p.embedding }))),
    );
    const result = identifyOutput.parse(
      await requestJson(
        rt,
        `${rt.config.voiceUrl}/v1/identify`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${rt.config.voiceToken}` },
          body: form,
        },
        "Voice API",
      ),
    );
    if (result.model !== model) models.delete(rt);
    const current = await rt.db.one("segments", "id=?", [segmentId]);
    assert(current, 404, "Statement not found.");
    const providerKey = current.speaker.startsWith(VOICE_PREFIX)
      ? null
      : current.speaker;
    // The first identification of a provider label claims all its turns; later
    // disagreements only move the statement that was actually heard.
    const claim =
      !!providerKey && !(await stableSpeakers(rt, record.id)).has(providerKey);
    const matched = result.match
      ? prints.find((p) => p.id === result.match!.id)
      : undefined;
    let print: Voiceprint;
    if (matched) {
      [print] = await rt.db.update(
        "voiceprints",
        {
          embedding: mergeEmbedding(matched, result.embedding),
          samples: Math.min(matched.samples + 1, MAX_SAMPLES),
          aliases: claim
            ? [...matched.aliases, providerKey!].slice(-MAX_ALIASES)
            : matched.aliases,
        },
        "id=?",
        [matched.id],
      );
    } else {
      const all = await rt.db.all("voiceprints", "case_id=?", [record.id]);
      assert(
        all.length < MAX_VOICES,
        409,
        "This case already has the maximum number of voices.",
      );
      const next =
        Math.max(0, ...all.map((p) => Number(p.label.split("-")[1]) || 0)) + 1;
      print = await rt.db.insert("voiceprints", {
        case_id: record.id,
        label: `voice-${next}`,
        embedding: normalize(result.embedding),
        model: result.model,
        aliases: claim ? [providerKey!] : [],
      });
    }
    const key = VOICE_PREFIX + print.label;
    if (claim)
      await rt.db.update(
        "segments",
        { speaker: key },
        "case_id=? AND speaker=?",
        [record.id, providerKey],
      );
    else await rt.db.update("segments", { speaker: key }, "id=?", [segmentId]);
    await publish(rt, record.id, { type: "speakers" });
    return {
      speaker: key,
      created: !matched,
      score: result.match?.score ?? null,
    };
  });
}

export async function forgetVoices(rt: Runtime, record: Case) {
  const removed = await rt.db.remove("voiceprints", "case_id=?", [record.id]);
  await publish(rt, record.id, { type: "speakers" });
  return { removed: removed.length };
}
