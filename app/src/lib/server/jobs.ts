import { Receiver } from "@upstash/qstash";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { Database } from "./database";
import { seconds } from "./database";
import type { Runtime } from "./runtime";
import { boundedBody, locked, schedule } from "./runtime";
import { assert, HttpError } from "./errors";
import { analysisState, investigate } from "./analysis";
import { cleanupTransfers } from "./transfers";
const CALLBACK = "/api/v1/internal/analysis";
export async function stageJob(db: Database, segmentId: string) {
  await db.query(
    "INSERT INTO jude_analysis_jobs (segment_id,status,attempts,dispatched_at,created_at) VALUES (?,'queued',0,0,?) ON CONFLICT(segment_id) DO UPDATE SET status='queued',attempts=0,dispatched_at=0 WHERE jude_analysis_jobs.status IN ('done','failed')",
    [segmentId, seconds()],
  );
}
export async function dispatch(rt: Runtime, id: string) {
  try {
    const response = await rt.fetch(
      `${rt.config.qstashUrl}/v2/publish/${rt.config.appUrl}${CALLBACK}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rt.config.qstashToken}`,
          "Content-Type": "application/json",
          "Upstash-Retries": "3",
          "Upstash-Timeout": "240s",
        },
        body: JSON.stringify({ segment_id: id }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) throw new Error();
    await rt.db.update(
      "analysis_jobs",
      { dispatched_at: seconds() },
      "segment_id=?",
      [id],
    );
    return true;
  } catch {
    await rt.db.update(
      "segments",
      {
        analysis_error:
          "Analysis delivery is delayed. The saved job will be retried.",
      },
      "id=? AND analysis_state=?",
      [id, "queued"],
    );
    return false;
  }
}
export async function enqueue(
  rt: Runtime,
  id: string,
  fixture?: string | null,
) {
  if (!rt.config.hosted) {
    schedule(rt, investigate(rt, id, fixture));
    return;
  }
  if (!rt.config.openrouterKey || !rt.config.model) {
    await analysisState(
      rt,
      id,
      "unavailable",
      "AI analysis is not connected. Configure OpenRouter, then retry this statement. Your transcript is saved.",
    );
    await rt.db.update("analysis_jobs", { status: "done" }, "segment_id=?", [
      id,
    ]);
    return;
  }
  await dispatch(rt, id);
}
export async function runJob(rt: Runtime, id: string) {
  return locked(rt, `analysis:${id}`, async () => {
    const job = await rt.db.one("analysis_jobs", "segment_id=?", [id]);
    if (!job || ["done", "failed"].includes(job.status))
      return { status: "already handled" };
    if (await rt.db.one("findings", "segment_id=?", [id])) {
      await rt.db.update("analysis_jobs", { status: "done" }, "segment_id=?", [
        id,
      ]);
      await analysisState(rt, id, "complete");
      return { status: "done" };
    }
    if (job.attempts >= 3) {
      await rt.db.update(
        "analysis_jobs",
        { status: "failed" },
        "segment_id=?",
        [id],
      );
      await analysisState(
        rt,
        id,
        "failed",
        "Analysis exhausted automatic retries. Retry this statement manually.",
      );
      return { status: "failed" };
    }
    await rt.db.update(
      "analysis_jobs",
      {
        status: "running",
        attempts: job.attempts + 1,
        dispatched_at: seconds(),
      },
      "segment_id=?",
      [id],
    );
    const deadline = AbortSignal.timeout(220000),
      worker = {
        ...rt,
        fetch: ((input, init) =>
          rt.fetch(input, {
            ...init,
            signal: AbortSignal.any([
              deadline,
              ...(init?.signal ? [init.signal] : []),
            ]),
          })) as typeof fetch,
      };
    await investigate(worker, id);
    const segment = await rt.db.one("segments", "id=?", [id]),
      failed =
        segment && ["failed", "interrupted"].includes(segment.analysis_state),
      status = failed ? (job.attempts + 1 >= 3 ? "failed" : "queued") : "done";
    await rt.db.update("analysis_jobs", { status }, "segment_id=?", [id]);
    if (status === "queued")
      throw new HttpError(503, "Analysis will be retried.");
    return { status };
  });
}
export async function deliver(rt: Runtime, request: Request) {
  assert(rt.config.hosted, 404, "Not found");
  const body = new TextDecoder().decode(await boundedBody(request, 4096));
  try {
    const valid = await new Receiver({
      currentSigningKey: rt.config.currentSigningKey,
      nextSigningKey: rt.config.nextSigningKey,
    }).verify({
      body,
      signature: request.headers.get("upstash-signature") || "",
      url: rt.config.appUrl + CALLBACK,
    });
    assert(valid, 401, "Invalid job signature");
  } catch {
    throw new HttpError(401, "Invalid job signature");
  }
  const job = z.strictObject({ segment_id: z.uuid() }).parse(JSON.parse(body));
  return runJob(rt, job.segment_id);
}
export async function recover(rt: Runtime, request: Request) {
  const expected = Buffer.from(`Bearer ${rt.config.cronSecret}`),
    actual = Buffer.from(request.headers.get("authorization") || "");
  assert(
    rt.config.hosted &&
      rt.config.cronSecret &&
      expected.length === actual.length &&
      timingSafeEqual(expected, actual),
    401,
    "Recovery authorization required",
  );
  const stale = await rt.db.all(
    "analysis_jobs",
    "status IN ('queued','running') AND dispatched_at<?",
    [seconds() - 360],
    "ORDER BY created_at LIMIT 20",
  );
  for (const table of [
    "socket_tickets",
    "runtime_rates",
    "runtime_leases",
  ] as const)
    await rt.db.remove(table, "expires<?", [seconds()]);
  await cleanupTransfers(rt);
  const results = await Promise.all(
    stale.map((job) => dispatch(rt, job.segment_id)),
  );
  return { dispatched: results.filter(Boolean).length };
}
