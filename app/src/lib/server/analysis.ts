import type { Runtime } from "./runtime";
import { publish, safeError } from "./runtime";
import {
  conclusionSchema,
  claimSchema,
  assessmentSchema,
  type Conclusion,
  type Source,
  type Json,
  type Legal,
} from "./contracts";
import { ProviderError } from "./errors";
import { structured, legalSearch } from "./providers";
import { retrieve } from "./retrieval";
import simulation from "./simulation.json" with { type: "json" };
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
async function runInvestigation(
  rt: Runtime,
  id: string,
  fixture?: string | null,
) {
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
      legal: Legal[] = [],
      mode = "ai";
    if (segment.origin === "simulation") {
      if (!fixture) {
        await analysisState(rt, id, "skipped");
        return;
      }
      const expected =
        simulation.expected[fixture as keyof typeof simulation.expected];
      const chunk = (
        await rt.db.all("chunks", "case_id=?", [segment.case_id])
      ).find((c) => c.text.includes(expected.quote));
      if (!chunk)
        throw new ProviderError(
          "The synthetic source fixture is missing. Create a new demonstration case.",
        );
      const { quote, relation, ...rest } = expected;
      conclusion = conclusionSchema.parse({
        ...rest,
        citations: [{ chunk_id: chunk.id, quote, relation }],
      });
      review = {
        summary: "Scripted training example, not an AI investigation.",
        alternative_explanations: [conclusion.uncertainty],
        missing_context: [conclusion.verification],
      };
      mode = "simulation";
    } else {
      if (!rt.config.openrouterKey || !rt.config.model) {
        await analysisState(
          rt,
          id,
          "unavailable",
          "AI analysis is not connected. Configure OpenRouter, then retry this statement. Your transcript is saved.",
        );
        return;
      }
      await analysisState(rt, id, "extracting");
      const claim = await structured(
        rt,
        "Extract a single meaningful, checkable assertion. Mark questions, fragments and procedural statements not checkable. Do not expand or invent claims. legal_query is empty unless a legal issue is explicitly raised; use only generic legal keywords, no personal data.",
        { transcript: segment.text, preceding_context: context },
        claimSchema,
      );
      if (!claim.checkable) {
        await analysisState(rt, id, "skipped");
        return;
      }
      await analysisState(rt, id, "retrieving");
      const { results: sources, mode: method } = await retrieve(
        rt,
        segment.case_id,
        claim.search_query,
        8,
        hearing?.source_document_id,
      );
      let legalNote = "";
      if (claim.legal_query && rt.config.pasalKey)
        try {
          legal = await legalSearch(rt, claim.legal_query);
        } catch {
          legalNote =
            "Legal discovery was unavailable; no legal reference was inferred.";
        }
      const packet = {
        testimony: segment.text,
        context,
        claim: claim.assertion,
        sources,
        legal_discovery_metadata_only: legal,
      };
      await analysisState(rt, id, "analyzing");
      const analyst = await structured(
        rt,
        "Evidence Analyst: compare the assertion to source material. Identify support, conflicts and context without deciding credibility.",
        packet,
        assessmentSchema,
      );
      await analysisState(rt, id, "reviewing");
      const reviewer = await structured(
        rt,
        "Adversarial Reviewer: independently examine the original assertion and sources for alternative explanations and missing context. You do not receive the analyst response.",
        packet,
        assessmentSchema,
      );
      await analysisState(rt, id, "synthesizing");
      conclusion = await structured(
        rt,
        "Evidence Synthesizer: weigh the two assessments. Use calibrated status, exact citations, a concrete verification step, and a suggested question. If evidence is absent use insufficient_evidence. A difference alone does not establish contradiction.",
        { ...packet, analyst, reviewer },
        conclusionSchema,
      );
      validateCitations(conclusion, sources);
      review = {
        ...reviewer,
        analyst_summary: analyst.summary,
        retrieval: method,
        legal_note: legalNote,
      };
    }
    await rt.db.insert("findings", {
      case_id: segment.case_id,
      segment_id: id,
      ...conclusion,
      review,
      legal,
      mode,
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
export async function investigate(
  rt: Runtime,
  id: string,
  fixture?: string | null,
): Promise<void> {
  if (rt.config.hosted) return runInvestigation(rt, id, fixture);
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
      await runInvestigation(rt, id, fixture);
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
