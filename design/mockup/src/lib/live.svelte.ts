import { altScript, liveScript, type ScriptLine } from "./data";
import { t } from "./i18n";
import { prefs } from "./prefs.svelte";
import { go, route } from "./router.svelte";
import { db, hearing, inspect, speaker, toast, ui } from "./store.svelte";
import type { Phase } from "./types";

/**
 * A simulated live transcription session (Amazon Transcribe streaming in the product).
 * It types provisional words, finalizes statements, runs the bounded analysis phases and
 * publishes findings, so the live screens can be judged with realistic timing.
 */
export const live = $state({
  hearingId: "h3" as string | null,
  status: "recording" as "connecting" | "recording" | "paused" | "idle",
  elapsed: 452,
  cursor: 0,
  partial: "",
  partialSpeaker: "",
  unseen: 0,
  script: "main" as "main" | "alt",
});

class Cancelled extends Error {}
let generation = 0;
let started = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Waits in stream time: paused sessions stand still and the speed control scales time. */
async function wait(ms: number, gen: number, respectPause = true) {
  let left = ms;
  while (left > 0) {
    await sleep(100);
    if (gen !== generation) throw new Cancelled();
    if (!respectPause || live.status === "recording") left -= 100 * prefs.liveSpeed;
  }
}

export const isLive = () => live.hearingId !== null && live.status !== "idle";

export function startEngine() {
  if (started) return;
  started = true;
  setInterval(() => {
    if (live.status === "recording") live.elapsed += 1;
  }, 1000);
  void pump(generation);
}

async function pump(gen: number) {
  const script = live.script === "main" ? liveScript : altScript;
  try {
    await wait(2200, gen);
    while (live.cursor < script.length) {
      const line = script[live.cursor];
      live.partialSpeaker = line.speakerId;
      const words = line.text.split(" ");
      for (let i = 1; i <= words.length; i++) {
        live.partial = words.slice(0, i).join(" ");
        await wait(140, gen);
      }
      await wait(420, gen);
      const id = `ls-${gen}-${live.cursor}`;
      db.statements.push({
        id,
        hearingId: live.hearingId!,
        speakerId: line.speakerId,
        t: live.elapsed,
        text: line.text,
        phase: "queued",
        legal: line.legal,
      });
      live.partial = "";
      live.partialSpeaker = "";
      void analyze(id, line, gen);
      live.cursor += 1;
      await wait(line.pause ?? 1700, gen);
    }
  } catch (error) {
    if (!(error instanceof Cancelled)) throw error;
  }
}

function setPhase(id: string, phase: Phase) {
  const s = db.statements.find((x) => x.id === id);
  if (s) s.phase = phase;
}

async function analyze(id: string, line: ScriptLine, gen: number) {
  const role = speaker(line.speakerId)?.role;
  // Only witness testimony is examined; everything else is simply saved.
  if (role !== "witness" && role !== "unknown") return setPhase(id, "saved");
  if (role === "unknown" && !line.finding) return setPhase(id, "saved");
  try {
    await wait(500, gen, false);
    setPhase(id, "retrieving");
    await wait(1100, gen, false);
    setPhase(id, "analyzing");
    await wait(1300, gen, false);
    if (line.finding?.status === "potential_inconsistency") {
      setPhase(id, "reviewing");
      await wait(1000, gen, false);
    }
    setPhase(id, "complete");
  } catch (error) {
    if (error instanceof Cancelled) return;
    throw error;
  }
  if (!line.finding) return;
  const findingId = `lf-${id}`;
  const hearingId = db.statements.find((x) => x.id === id)?.hearingId ?? live.hearingId!;
  db.findings.push({
    ...structuredClone(line.finding),
    id: findingId,
    hearingId,
    statementId: id,
    reviewed: false,
    note: "",
    isNew: true,
  });
  for (const [i, c] of (line.connections ?? []).entries()) {
    db.connections.push({ ...structuredClone(c), id: `lc-${id}-${i}`, from: { kind: "statement", id } });
  }
  const viewing = route.parts[2] === "hearings" && route.parts[3] === hearingId;
  // Brainstorm pages (feature map, moodboard, preview) stay quiet.
  const meta = ["map", "moodboard", "canvas"].includes(route.parts[0] ?? "");
  if (!viewing) live.unseen += 1;
  if (!meta && (!viewing || ui.vw < 900)) {
    // Several findings in quick succession share one notice instead of stacking up.
    const open = ui.toasts.find((x) => x.tone === "finding");
    if (open) {
      open.count = (open.count ?? 1) + 1;
      open.text = t("live.newFindings", { n: open.count });
      open.action = { label: t("toast.view"), run: () => go(`/case/${hearing(hearingId)?.caseId}/hearings/${hearingId}`) };
    } else {
      toast(t("toast.newFinding", { status: t(`status.${line.finding.status}`) }), {
        tone: "finding",
        action: { label: t("toast.view"), run: () => inspect({ kind: "finding", id: findingId }) },
      });
    }
  }
}

export function pause() {
  if (live.status === "recording") live.status = "paused";
}

export function resume() {
  if (live.status === "paused") live.status = "recording";
}

/** Ends recording: the hearing keeps its transcript and findings and becomes reviewable audio. */
export function endLive() {
  const h = hearing(live.hearingId);
  generation += 1;
  if (h) {
    h.mode = "recorded";
    h.duration = live.elapsed;
    for (const s of db.statements) {
      if (s.hearingId === h.id && s.phase && s.phase !== "complete" && s.phase !== "saved") s.phase = "saved";
    }
  }
  live.hearingId = null;
  live.status = "idle";
  live.partial = "";
  live.partialSpeaker = "";
  live.unseen = 0;
  return h;
}

/** Starts recording a hearing. Only one hearing records at a time, as in the product. */
export function startLive(hearingId: string) {
  if (isLive() && live.hearingId !== hearingId) return false;
  const h = hearing(hearingId);
  if (!h) return false;
  generation += 1;
  const gen = generation;
  h.mode = "live";
  live.hearingId = hearingId;
  live.script = hearingId === "h3" ? "main" : "alt";
  live.cursor = 0;
  live.elapsed = 0;
  live.unseen = 0;
  live.status = "connecting";
  setTimeout(() => {
    if (gen !== generation) return;
    live.status = "recording";
    void pump(gen);
  }, 1500);
  return true;
}

/** Restores hearing 3 to its opening minutes and streams it again. */
export function replayLive() {
  generation += 1;
  const gen = generation;
  db.statements = db.statements.filter((s) => !s.id.startsWith("ls-"));
  db.findings = db.findings.filter((f) => !f.id.startsWith("lf-"));
  db.connections = db.connections.filter((c) => !c.id.startsWith("lc-"));
  for (const h of db.hearings) {
    if (h.mode === "live" && h.id !== "h3") h.mode = h.duration ? "recorded" : "scheduled";
  }
  const h3 = hearing("h3");
  if (h3) {
    h3.mode = "live";
    delete h3.duration;
  }
  Object.assign(live, {
    hearingId: "h3",
    status: "recording",
    elapsed: 452,
    cursor: 0,
    partial: "",
    partialSpeaker: "",
    unseen: 0,
    script: "main",
  });
  void pump(gen);
}
