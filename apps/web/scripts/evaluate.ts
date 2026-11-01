import { parseArgs } from "node:util";
import { readFile, writeFile, mkdtemp, rm, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import {
  score,
  type Example,
  type Prediction,
} from "../src/lib/server/evaluation";
import { settings } from "../src/lib/server/config";
import { connectDatabase } from "../src/lib/server/database";
import type { Runtime } from "../src/lib/server/runtime";
import { ingest } from "../src/lib/server/documents";
import { investigate } from "../src/lib/server/analysis";
const { values } = parseArgs({
  options: {
    dataset: { type: "string", default: "evaluation/cases.json" },
    predictions: { type: "string" },
    live: { type: "boolean" },
    fixture: { type: "boolean" },
    output: { type: "string" },
  },
});
if (
  !values.output ||
  !!values.live === !!values.predictions ||
  (values.live && values.fixture)
)
  throw new Error(
    "Use --predictions path.json [--fixture] OR --live, and --output path.json.",
  );
const dataset: Example[] = JSON.parse(await readFile(values.dataset, "utf8"));
let predictions: Prediction[] = [];
if (values.live) {
  const dir = await mkdtemp(join(tmpdir(), "jude-evaluation-"));
  const config = settings({
    ...process.env,
    DATABASE_URL: "",
    JUDE_DATA_DIR: dir,
    S3_BUCKET: "",
    PASAL_API_KEY: "",
  });
  if (!config.openrouterKey || !config.model)
    throw new Error(
      "Live evaluation requires OPENROUTER_API_KEY and OPENROUTER_MODEL.",
    );
  const rt: Runtime = {
    config,
    db: await connectDatabase(config),
    fetch,
    tasks: new Set(),
    simulations: new Map(),
  };
  try {
    const user = await rt.db.insert("users", {
      email: "evaluation@example.invalid",
      name: "Evaluation",
      password_hash: "disabled",
    });
    for (const item of dataset) {
      const record = await rt.db.insert("cases", {
          owner_id: user.id,
          title: item.id,
        }),
        sourceIds = new Map<string, string>();
      for (const source of item.sources) {
        const doc = await ingest(
          rt,
          record,
          source.id + ".txt",
          new TextEncoder().encode(source.text),
        );
        for (const chunk of await rt.db.all("chunks", "document_id=?", [
          doc.id,
        ]))
          sourceIds.set(chunk.id, source.id);
      }
      const segment = await rt.db.insert("segments", {
        case_id: record.id,
        text: item.transcript,
        speaker: "S1",
      });
      await investigate(rt, segment.id);
      const saved = await rt.db.one("segments", "id=?", [segment.id]),
        finding = await rt.db.one("findings", "segment_id=?", [segment.id]);
      predictions.push({
        id: item.id,
        status: finding?.status || saved!.analysis_state,
        error: saved!.analysis_error,
        ...(finding
          ? {
              citations: finding.citations.map((c) => ({
                ...c,
                chunk_id: sourceIds.get(c.chunk_id)!,
              })),
              elapsed_ms: finding.elapsed_ms,
              explanation: finding.explanation,
              uncertainty: finding.uncertainty,
            }
          : {}),
      });
    }
  } finally {
    await rt.db.close();
    await rm(dir, { recursive: true, force: true });
  }
} else predictions = JSON.parse(await readFile(values.predictions!, "utf8"));
const report = score(
  dataset,
  predictions,
  values.live ? "live" : values.fixture ? "fixture" : "imported",
);
await mkdir(dirname(values.output), { recursive: true });
await writeFile(
  values.output,
  JSON.stringify({ ...report, predictions }, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
