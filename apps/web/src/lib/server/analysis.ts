import { aiConfigured } from "./config";
import { z } from "zod";
import type { Runtime } from "./runtime";
import { publish, safeError } from "./runtime";
import {
  conclusionSchema,
  assessmentSchema,
  type Conclusion,
  type Source,
  type Json,
  type Legal,
} from "./contracts";
import { ProviderError } from "./errors";
import { structured, legalSearch } from "./providers";
import { retrieve } from "./retrieval";
import { exactSourceQuote } from "./quotes";
export function validateCitations(
  conclusion: Conclusion,
  sources: Pick<Source, "id" | "text">[],
) {
  const known = new Map(sources.map((s) => [s.id, s.text]));
  if (
    conclusion.citations.some(
      (c) => !c.quote.trim() || !known.get(c.chunk_id)?.includes(c.quote),
    )
  )
    throw new ProviderError(
      "Citation verification failed. The finding was withheld because a quoted passage did not match the retrieved evidence.",
    );
  if (
    conclusion.status === "supported" &&
    !conclusion.citations.some((c) => c.relation === "supports")
  )
    throw new ProviderError(
      "A supported finding requires a verified supporting citation.",
    );
  if (
    conclusion.status === "potential_inconsistency" &&
    !conclusion.citations.some((c) => c.relation === "conflicts")
  )
    throw new ProviderError(
      "A potential inconsistency requires a verified conflicting citation.",
    );
  if (
    conclusion.status !== "insufficient_evidence" &&
    !conclusion.citations.length
  )
    throw new ProviderError("A substantive finding requires source citations.");
}
/**
 * Keep only citations whose quotes occur in their sources (whitespace-tolerant, mapped
 * back to the exact source text), then apply the status rules. Invented quotes are never
 * shown; a finding is withheld only when no verified citation supports its status.
 */
export function verifiedConclusion(
  conclusion: Conclusion,
  sources: Pick<Source, "id" | "text">[],
): Conclusion {
  const known = new Map(sources.map((s) => [s.id, s.text]));
  const citations = conclusion.citations.flatMap((c) => {
    const text = known.get(c.chunk_id);
    const quote = text ? exactSourceQuote(text, c.quote) : undefined;
    return quote ? [{ ...c, quote }] : [];
  });
  if (conclusion.citations.length && !citations.length)
    throw new ProviderError(
      "Citation verification failed. The finding was withheld because a quoted passage did not match the retrieved evidence.",
    );
  const verified = { ...conclusion, citations };
  validateCitations(verified, sources);
  return verified;
}
export async function analysisState(
  rt: Runtime,
  id: string,
  phase: string,
  error: string | null = null,
) {
  const [segment] = await rt.db.update(
    "segments",
    { analysis_state: phase, analysis_error: error },
    "id=?",
    [id],
  );
  if (segment)
    await publish(rt, segment.case_id, {
      type: "analysis",
      segment_id: id,
      phase,
    });
}
async function runInvestigation(rt: Runtime, id: string) {
  const start = performance.now(),
    segment = await rt.db.one("segments", "id=?", [id]);
  if (!segment || (await rt.db.one("findings", "segment_id=?", [id]))) return;
  const hearing = segment.hearing_id
    ? await rt.db.one("hearings", "id=?", [segment.hearing_id])
    : null;
  const context = (
    await rt.db.all(
      "segments",
      "case_id=? AND hearing_id=? AND created_at<?",
      [segment.case_id, segment.hearing_id, segment.created_at],
      "ORDER BY created_at DESC LIMIT 5",
    )
  )
    .reverse()
    .map((s) => ({ speaker: s.speaker, text: s.text }));
  try {
    let conclusion: Conclusion,
      review: Record<string, Json>,
      legal: Legal[] = [];
    if (!aiConfigured(rt.config)) {
      await analysisState(
        rt,
        id,
        "unavailable",
        "Automatic analysis is unavailable. Your transcript is saved; you can still review it alongside your documents.",
      );
      return;
    }
    // Questions (usually from the bench or counsel) assert nothing; skip them for free.
    if (/\?\s*$/.test(segment.text.trim())) {
      await analysisState(rt, id, "skipped");
      return;
    }
    // Cheap path first: retrieval runs in the database, then one default-tier call both
    // screens the statement and compares it with the sources. Only a potential
    // inconsistency pays for the independent review model.
    await analysisState(rt, id, "retrieving");
    const { results: sources, mode: method } = await retrieve(
      rt,
      segment.case_id,
      [...context.slice(-2).map((c) => c.text), segment.text].join(" "),
      8,
      hearing?.source_document_id,
    );
    if (!sources.length) {
      await analysisState(
        rt,
        id,
        "skipped",
        "No related passage was found in the case documents.",
      );
      return;
    }
    const packet = {
      testimony: segment.text,
      speaker: segment.speaker,
      preceding_context: context,
      sources,
    };
    await analysisState(rt, id, "analyzing");
    const screen = await structured(
      rt,
      "Evidence screen. First decide whether the testimony makes a checkable factual assertion; questions, greetings, procedure and fragments are not checkable (use preceding_context to read short answers). If checkable, compare it with the sources and return a calibrated finding: supported only with a supporting quote, potential_inconsistency only with a conflicting quote, context_needed when sources are related but do not settle it, insufficient_evidence when they say nothing. A difference in wording, a paraphrase or a possible transcription error is not a contradiction. Give a concrete verification step and one neutral follow-up question.",
      packet,
      conclusionSchema.extend({ checkable: z.boolean() }),
    );
    if (!screen.checkable) {
      await analysisState(rt, id, "skipped");
      return;
    }
    conclusion = conclusionSchema.parse(
      Object.fromEntries(
        Object.entries(screen).filter(([key]) => key !== "checkable"),
      ),
    );
    conclusion = verifiedConclusion(conclusion, sources);
    let legalNote = "";
    if (conclusion.status !== "insufficient_evidence" && rt.config.pasalKey)
      try {
        legal = await legalSearch(rt, conclusion.title.slice(0, 160));
      } catch {
        legalNote =
          "Legal discovery was unavailable; no legal reference was inferred.";
      }
    review = {
      summary: conclusion.explanation,
      alternative_explanations: [conclusion.uncertainty].filter(Boolean),
      missing_context: [],
      retrieval: method,
      legal_note: legalNote,
      reviewed_by: "screen",
    };
    if (conclusion.status === "potential_inconsistency") {
      await analysisState(rt, id, "reviewing");
      const reviewer = await structured(
        rt,
        "Independent reviewer. You have not seen any earlier assessment. Decide whether the sources genuinely conflict with the testimony, or whether the difference can be explained by paraphrase, a different event or time, missing context, or a transcription error. List alternative explanations and missing context. Do not judge credibility.",
        packet,
        assessmentSchema.extend({ conflict_confirmed: z.boolean() }),
        { tier: "review" },
      );
      if (!reviewer.conflict_confirmed)
        conclusion = {
          ...conclusion,
          status: "context_needed",
          uncertainty: [conclusion.uncertainty, reviewer.summary]
            .filter(Boolean)
            .join(" "),
        };
      review = {
        ...review,
        summary: reviewer.summary,
        alternative_explanations: reviewer.alternative_explanations,
        missing_context: reviewer.missing_context,
        screen_summary: conclusion.explanation,
        reviewed_by: "independent",
        conflict_confirmed: reviewer.conflict_confirmed,
      };
    }
    await rt.db.insert("findings", {
      case_id: segment.case_id,
      segment_id: id,
      ...conclusion,
      review,
      legal,
      mode: "ai",
      elapsed_ms: Math.round(performance.now() - start),
    });
    await analysisState(rt, id, "complete");
  } catch (error) {
    await analysisState(
      rt,
      id,
      "failed",
      safeError(
        error,
        "Analysis failed. Your transcript is saved; retry this statement.",
      ),
    );
  }
}

// One local process: bound provider concurrency and coalesce duplicate retries.
const localRuns = new WeakMap<
  Runtime,
  {
    active: number;
    waiting: (() => void)[];
    pending: Map<string, Promise<void>>;
  }
>();
export async function investigate(rt: Runtime, id: string): Promise<void> {
  let state = localRuns.get(rt);
  if (!state) {
    state = { active: 0, waiting: [], pending: new Map() };
    localRuns.set(rt, state);
  }
  const existing = state.pending.get(id);
  if (existing) return existing;
  if (state.pending.size >= 100) {
    await analysisState(
      rt,
      id,
      "interrupted",
      "Analysis queue is full. Your testimony is saved; retry when the queue clears.",
    );
    return;
  }
  const pool = state;
  const work = (async () => {
    if (pool.active >= 3)
      await new Promise<void>((resolve) => pool.waiting.push(resolve));
    else pool.active++;
    try {
      await runInvestigation(rt, id);
    } finally {
      const next = pool.waiting.shift();
      if (next) next();
      else pool.active--;
      pool.pending.delete(id);
    }
  })();
  pool.pending.set(id, work);
  return work;
}
