/**
 * Live Bedrock model benchmark on a real .jude case archive (spends real money; keep the
 * sample small). Each screening model runs the app's own pipeline (`investigate`: keyword
 * retrieval, the screening prompt and tool schema, `verifiedConclusion`) on the same fixed
 * sample of hearing turns in a throwaway SQLite runtime, then each review model answers the
 * independent-review prompt for every potential inconsistency the screens produced.
 *
 *   pnpm tsx scripts/benchmark-models.ts --models apac.amazon.nova-lite-v1:0,... \
 *     --review-models global.anthropic.claude-sonnet-4-6 --output bench.json
 *
 * The saved findings of the archive are a reference (another model's output), not ground
 * truth: read the per-turn outputs before trusting agreement numbers.
 */
import { parseArgs } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { z } from "zod";
import {
  BedrockRuntimeClient,
  type ConverseCommand,
  type ConverseCommandOutput,
} from "@aws-sdk/client-bedrock-runtime";
import { settings } from "../src/lib/server/config";
import { connectDatabase } from "../src/lib/server/database";
import type { Runtime } from "../src/lib/server/runtime";
import { importCase, validateArchive } from "../src/lib/server/archive";
import { investigate } from "../src/lib/server/analysis";
import { structured } from "../src/lib/server/providers";
import { exactSourceQuote } from "../src/lib/server/quotes";
import {
  assessmentSchema,
  conclusionSchema,
} from "../src/lib/server/contracts";

const { values } = parseArgs({
  options: {
    archive: { type: "string", default: "static/demo/sambo-796-public.jude" },
    models: { type: "string", default: "" },
    "review-models": { type: "string", default: "" },
    "review-default": {
      type: "string",
      default: "global.anthropic.claude-sonnet-4-6",
    },
    sample: { type: "string", default: "40" },
    output: { type: "string" },
  },
});
if (!values.output) throw new Error("--output path.json is required.");

/** USD per million tokens [input, output], on-demand ap-southeast-1 (global profile where used). */
const PRICES: Record<string, [number, number]> = {
  "amazon.nova-micro": [0.047, 0.188],
  "amazon.nova-lite": [0.081, 0.324],
  "amazon.nova-pro": [1.08, 4.32],
  "amazon.nova-2-lite": [0.41, 3.39],
  "claude-haiku-4-5": [1, 5],
  "claude-sonnet-4-5": [3, 15],
  "claude-sonnet-4-6": [3, 15],
  "claude-opus-4-5": [5, 25],
  "claude-opus-4-6": [5, 25],
  "kimi-k3": [3, 15],
};
const price = (model: string) =>
  Object.entries(PRICES).find(([key]) => model.includes(key))?.[1] ?? [0, 0];

const ID_WORDS =
  /\b(yang|dan|tidak|dengan|saksi|bahwa|untuk|dalam|keterangan|sumber|adalah|tersebut|pada|ini)\b/giu;
const EN_WORDS =
  /\b(the|and|not|with|witness|that|for|source|testimony|is|this|states|statement)\b/giu;
const indonesian = (text: string) =>
  (text.match(ID_WORDS)?.length ?? 0) >= (text.match(EN_WORDS)?.length ?? 0);

type Call = {
  model: string;
  tier: "screen" | "review";
  ms: number;
  input: number;
  output: number;
  throttles: number;
  tool: boolean;
  stop?: string;
  result?: Record<string, unknown>;
  payload: Record<string, unknown>;
};

/** Real Bedrock client behind the runtime seam: own backoff, records latency and usage. */
function recordingClient(calls: Call[]) {
  const client = new BedrockRuntimeClient({
    region: "ap-southeast-1",
    maxAttempts: 1,
  });
  return {
    send: (async (command: ConverseCommand) => {
      // `model#reasoning=low` benchmarks Nova 2 reasoning without changing the app.
      const [baseModel, variant] = command.input.modelId!.split("#");
      const effort = /^reasoning=(low|medium)$/.exec(variant ?? "")?.[1];
      command.input.modelId = baseModel;
      if (effort)
        command.input.additionalModelRequestFields = {
          reasoningConfig: { type: "enabled", maxReasoningEffort: effort },
        };
      let throttles = 0;
      for (let attempt = 0; ; attempt++) {
        const start = performance.now();
        try {
          const response = (await client.send(
            command,
          )) as ConverseCommandOutput;
          const tool = response.output?.message?.content?.find(
            (c) => c.toolUse,
          )?.toolUse;
          const modelId = command.input.modelId!;
          calls.push({
            model: modelId,
            tier: command.input.system?.some((s) =>
              s.text?.includes("Independent reviewer"),
            )
              ? "review"
              : "screen",
            ms: Math.round(performance.now() - start),
            input: response.usage?.inputTokens ?? 0,
            output: response.usage?.outputTokens ?? 0,
            throttles,
            tool: !!tool,
            stop: response.stopReason,
            result: tool?.input as Record<string, unknown> | undefined,
            payload: JSON.parse(
              (command.input.messages![0].content![0] as { text: string }).text,
            ),
          });
          return response;
        } catch (error) {
          const name = (error as { name?: string }).name;
          if (
            attempt < 10 &&
            (name === "ThrottlingException" ||
              name === "ServiceUnavailableException" ||
              name === "ModelNotReadyException")
          ) {
            throttles++;
            await new Promise((r) =>
              setTimeout(r, Math.min(30_000, 2000 * 2 ** attempt)),
            );
            continue;
          }
          throw error;
        }
      }
    }) as never,
  };
}

async function runtime(model: string, reviewModel: string, calls: Call[]) {
  const dir = await mkdtemp(join(tmpdir(), "jude-model-bench-"));
  const config = settings({
    JUDE_DATA_DIR: dir,
    AI_PROVIDER: "bedrock",
    AWS_REGION: "ap-southeast-1",
    BEDROCK_MODEL: model,
    BEDROCK_REVIEW_MODEL: reviewModel,
  });
  const rt: Runtime = {
    config,
    db: await connectDatabase(config),
    fetch,
    tasks: new Set(),
    bedrock: recordingClient(calls),
  };
  return { rt, dir };
}

const data = new Uint8Array(await readFile(values.archive));
const { archive } = validateArchive(data);
const reference = new Map(archive.findings.map((f) => [f.segment_id, f]));
const question = (text: string) => /\?\s*$/.test(text.trim());
type Pick = { segment: (typeof archive.segments)[number]; expected: string };
function spread<T>(items: T[], n: number) {
  if (items.length <= n) return items;
  return Array.from(
    { length: n },
    (_, i) => items[Math.floor((i * items.length) / n)],
  );
}
const total = Number(values.sample);
const groups: [string, (typeof archive.segments)[number][], number][] = [
  [
    "supported",
    archive.segments.filter((s) => reference.get(s.id)?.status === "supported"),
    0.3,
  ],
  [
    "context_needed",
    archive.segments.filter(
      (s) => reference.get(s.id)?.status === "context_needed",
    ),
    0.25,
  ],
  [
    "insufficient_evidence",
    archive.segments.filter(
      (s) => reference.get(s.id)?.status === "insufficient_evidence",
    ),
    0.15,
  ],
  // Statements from the bench, counsel or prosecutor that are not questions by
  // punctuation: procedure, instructions, framing. They should not be "supported".
  // The archive's analysis left these turns unanalyzed, so the label is an assumption.
  [
    "not_checkable",
    archive.segments.filter(
      (s) =>
        /^(hakim|penasihat|penuntut)/i.test(s.speaker) &&
        !question(s.text) &&
        !reference.has(s.id) &&
        s.text.length > 40,
    ),
    0.2,
  ],
  [
    "failed_before",
    archive.segments.filter((s) => s.analysis_state === "failed"),
    0.1,
  ],
];
const sample: Pick[] = groups.flatMap(([expected, items, share]) =>
  spread(items, Math.round(total * share)).map((segment) => ({
    segment,
    expected,
  })),
);

const screenModels = values.models.split(",").filter(Boolean);
const results: Record<string, unknown>[] = [];
const reviewPackets: { from: string; payload: Record<string, unknown> }[] = [];
for (const failure of await Promise.allSettled(
  screenModels.map(async (model) => {
    const calls: Call[] = [];
    const { rt, dir } = await runtime(model, values["review-default"], calls);
    try {
      const user = await rt.db.insert("users", {
        email: "benchmark@example.invalid",
        name: "Benchmark",
        password_hash: "disabled",
      });
      const record = await importCase(rt, user, data);
      const segments = await rt.db.all("segments", "case_id=?", [record.id]);
      const rows = await Promise.all(
        sample.map(async (pick) => {
          const seg = segments.find(
            (s) =>
              s.created_at === pick.segment.created_at &&
              s.text === pick.segment.text,
          )!;
          await rt.db.remove("findings", "segment_id=?", [seg.id]);
          await investigate(rt, seg.id);
          const after = await rt.db.one("segments", "id=?", [seg.id]);
          const finding = await rt.db.one("findings", "segment_id=?", [seg.id]);
          const screen = calls.findLast(
            (c) => c.tier === "screen" && c.payload.testimony === seg.text,
          );
          const sources = (screen?.payload.sources ?? []) as {
            id: string;
            text: string;
          }[];
          // Some models return the array as a JSON string; that fails the schema anyway.
          let rawCitations = screen?.result?.citations ?? [];
          if (typeof rawCitations === "string")
            try {
              rawCitations = JSON.parse(rawCitations);
            } catch {
              rawCitations = [];
            }
          const citations = (
            (Array.isArray(rawCitations) ? rawCitations : []) as {
              chunk_id: string;
              quote: string;
            }[]
          ).map((c) => {
            const text = sources.find((s) => s.id === c.chunk_id)?.text;
            return {
              known_chunk: !!text,
              verbatim: !!text && !!exactSourceQuote(text, c.quote),
            };
          });
          // The exact schema the screen call must satisfy on its first try.
          const parsed = conclusionSchema
            .extend({ checkable: z.boolean() })
            .safeParse(screen?.result);
          if (screen?.result?.status === "potential_inconsistency")
            reviewPackets.push({ from: model, payload: screen.payload });
          const outcome = finding
            ? finding.status
            : after?.analysis_state === "skipped"
              ? "not_checkable"
              : `failed: ${after?.analysis_error ?? ""}`;
          return {
            speaker: pick.segment.speaker,
            text: pick.segment.text,
            expected: pick.expected,
            screen_status: screen?.result?.status ?? null,
            screen_checkable: screen?.result?.checkable ?? null,
            outcome,
            tool_valid: !!screen && screen.tool && !!parsed.success,
            schema_issues: parsed.success
              ? []
              : parsed.error.issues.map(
                  (i) => `${i.path.join(".")}: ${i.code}`,
                ),
            schema_failed: /could not be verified/.test(
              after?.analysis_error ?? "",
            ),
            citations,
            explanation: (screen?.result?.explanation as string) ?? "",
            indonesian: screen?.result?.explanation
              ? indonesian(String(screen.result.explanation))
              : null,
            quotes: finding?.citations.map((c) => c.quote) ?? [],
            ms: screen?.ms ?? null,
          };
        }),
      );
      const screens = calls.filter((c) => c.tier === "screen");
      const [pin, pout] = price(model);
      const cost = screens.reduce(
        (sum, c) => sum + (c.input * pin + c.output * pout) / 1e6,
        0,
      );
      const cits = rows.flatMap((r) => r.citations);
      const agree = rows.filter((r) =>
        r.expected === "failed_before"
          ? false
          : r.expected === r.outcome ||
            (r.expected === "not_checkable" &&
              ["not_checkable", "insufficient_evidence"].includes(r.outcome)),
      ).length;
      const scored = rows.filter((r) => r.expected !== "failed_before").length;
      const summary = {
        model,
        turns: rows.length,
        model_calls: screens.length,
        tool_valid_first_try: `${rows.filter((r) => r.tool_valid).length}/${screens.length}`,
        schema_failures: rows.filter((r) => r.schema_failed).length,
        citations: cits.length,
        verbatim_rate: cits.length
          ? +(cits.filter((c) => c.verbatim).length / cits.length).toFixed(3)
          : null,
        unknown_chunk_ids: cits.filter((c) => !c.known_chunk).length,
        findings_withheld: rows.filter(
          (r) => r.outcome.startsWith("failed") && !r.schema_failed,
        ).length,
        agreement: `${agree}/${scored}`,
        supported_on_not_checkable: rows.filter(
          (r) => r.expected === "not_checkable" && r.outcome === "supported",
        ).length,
        potential_inconsistency: rows.filter(
          (r) => r.screen_status === "potential_inconsistency",
        ).length,
        indonesian_explanations: `${rows.filter((r) => r.indonesian).length}/${rows.filter((r) => r.indonesian !== null).length}`,
        median_ms: median(screens.map((c) => c.ms)),
        p90_ms: percentile(
          screens.map((c) => c.ms),
          0.9,
        ),
        throttles: screens.reduce((s, c) => s + c.throttles, 0),
        avg_input_tokens: Math.round(
          screens.reduce((s, c) => s + c.input, 0) / (screens.length || 1),
        ),
        avg_output_tokens: Math.round(
          screens.reduce((s, c) => s + c.output, 0) / (screens.length || 1),
        ),
        usd_per_call: +(cost / (screens.length || 1)).toFixed(5),
        usd_per_360_turn_hearing: +(
          (cost / (screens.length || 1)) *
          360
        ).toFixed(3),
      };
      console.log(JSON.stringify(summary));
      results.push({ summary, rows });
      await writeFile(
        `${values.output}.${model.replace(/[^\w.-]/g, "_")}.json`,
        JSON.stringify({ summary, rows, calls }, null, 2),
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }),
))
  if (failure.status === "rejected") console.error(failure.reason);

/** Independent review: every candidate answers the same potential-inconsistency packets. */
const reviews: Record<string, unknown>[] = [];
const reviewModels = values["review-models"].split(",").filter(Boolean);
const packets = reviewPackets.filter(
  (p, i) =>
    reviewPackets.findIndex(
      (q) => q.payload.testimony === p.payload.testimony,
    ) === i,
);
await Promise.all(
  reviewModels.map(async (model) => {
    const calls: Call[] = [];
    const { rt, dir } = await runtime(model, model, calls);
    try {
      const rows = [];
      for (const packet of packets) {
        try {
          const out = await structured(
            rt,
            "Independent reviewer. You have not seen any earlier assessment. Decide whether the sources genuinely conflict with the testimony, or whether the difference can be explained by paraphrase, a different event or time, missing context, or a transcription error. List alternative explanations and missing context. Do not judge credibility.",
            packet.payload,
            assessmentSchema.extend({ conflict_confirmed: z.boolean() }),
            { tier: "review" },
          );
          rows.push({
            testimony: packet.payload.testimony,
            flagged_by: packet.from,
            conflict_confirmed: out.conflict_confirmed,
            summary: out.summary,
            indonesian: indonesian(out.summary),
          });
        } catch (error) {
          rows.push({
            testimony: packet.payload.testimony,
            flagged_by: packet.from,
            error: (error as Error).message,
          });
        }
      }
      const [pin, pout] = price(model);
      const cost = calls.reduce(
        (sum, c) => sum + (c.input * pin + c.output * pout) / 1e6,
        0,
      );
      const summary = {
        model,
        packets: packets.length,
        valid: rows.filter((r) => !("error" in r)).length,
        confirmed: rows.filter(
          (r) => "conflict_confirmed" in r && r.conflict_confirmed,
        ).length,
        indonesian: rows.filter((r) => "indonesian" in r && r.indonesian)
          .length,
        median_ms: median(calls.map((c) => c.ms)),
        usd_per_call: +(cost / (calls.length || 1)).toFixed(5),
      };
      console.log(JSON.stringify(summary));
      reviews.push({ summary, rows });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }),
);

function median(values: number[]) {
  return percentile(values, 0.5);
}
function percentile(values: number[], p: number) {
  if (!values.length) return null;
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}
await writeFile(
  values.output,
  JSON.stringify(
    {
      archive: values.archive,
      sample: sample.length,
      screens: results,
      reviews,
    },
    null,
    2,
  ),
);
