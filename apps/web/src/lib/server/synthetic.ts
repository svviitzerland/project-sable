import { setTimeout as delay } from "node:timers/promises";
import type { Runtime } from "./runtime";
import { publish, schedule, hearingFor } from "./runtime";
import type { User, Case } from "./contracts";
import { assert } from "./errors";
import { ingest } from "./documents";
import { investigate } from "./analysis";
import simulation from "./simulation.json" with { type: "json" };
export async function seedCase(rt: Runtime, user: User) {
  const record = await rt.db.insert("cases", {
    owner_id: user.id,
    title: "The warehouse hearing",
    reference: "SIM / 2026 / 001",
    description:
      "Synthetic criminal-hearing exercise. Compare four witness assertions with two prepared case documents. No real persons or proceedings.",
    synthetic: true,
    speakers: { Counsel: "Counsel · scripted", Witness: "Witness · scripted" },
  });
  await rt.db.insert("hearings", {
    case_id: record.id,
    title: "The warehouse examination",
    kind: "simulation",
  });
  for (const [name, text] of simulation.documents)
    await ingest(rt, record, name, new TextEncoder().encode(text));
  return record;
}
export async function simulate(
  rt: Runtime,
  record: Case,
  hearingId?: string | null,
) {
  assert(
    record.synthetic && rt.config.demo,
    400,
    "Simulation is available only for synthetic demonstration cases.",
  );
  const hearing = await hearingFor(rt, record.id, hearingId);
  assert(
    hearing.kind === "simulation",
    400,
    "Choose the synthetic demonstration hearing.",
  );
  assert(
    hearing.status !== "complete",
    409,
    "This simulation is complete. Create another synthetic case to repeat it.",
  );
  assert(!rt.simulations.has(record.id), 409, "A hearing is already running.");
  const controller = new AbortController();
  rt.simulations.set(record.id, controller);
  await rt.db.update("cases", { status: "simulation" }, "id=?", [record.id]);
  await rt.db.update("hearings", { status: "simulation" }, "id=?", [
    hearing.id,
  ]);
  schedule(
    rt,
    (async () => {
      try {
        const offset = (
          await rt.db.all("segments", "hearing_id=? AND origin=?", [
            hearing.id,
            "simulation",
          ])
        ).length;
        for (const row of simulation.script.slice(offset)) {
          await delay(rt.config.simulationDelay, undefined, {
            signal: controller.signal,
          });
          const [speaker, text, start, fixture] = row as [
              string,
              string,
              number,
              string | null,
            ],
            segment = await rt.db.insert("segments", {
              case_id: record.id,
              hearing_id: hearing.id,
              text,
              speaker,
              start,
              end: start + 4,
              origin: "simulation",
            });
          await publish(rt, record.id, { type: "transcript" });
          await investigate(rt, segment.id, fixture);
        }
      } catch (error) {
        if (!controller.signal.aborted) throw error;
      } finally {
        const count = (
            await rt.db.all("segments", "hearing_id=? AND origin=?", [
              hearing.id,
              "simulation",
            ])
          ).length,
          status = count === simulation.script.length ? "complete" : "paused";
        await rt.db.update("cases", { status }, "id=?", [record.id]);
        await rt.db.update("hearings", { status }, "id=?", [hearing.id]);
        rt.simulations.delete(record.id);
        await publish(rt, record.id, { type: "session" });
      }
    })(),
  );
  return { message: "Synthetic hearing started" };
}
