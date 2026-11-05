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
  type Segment,
} from "./contracts";
import { ProviderError } from "./errors";
import { structured, legalSearch } from "./providers";
import { retrieve, tokens } from "./retrieval";
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
/** Specific facts whose values must agree: times, dates, places, objects, people, counts. */
const FACT_RULES =
  "Concrete specifics are the facts that matter: time of day, date, duration, place, object or weapon type, colour, quantity, the people present, and the order of events. When the testimony and a source state DIFFERENT values for the SAME specific (for example 'jam 8 pagi' versus 'jam 9 pagi', 'pistol' versus 'AK-47' or 'senapan', 'dua orang' versus 'tiga orang', 'di kamar' versus 'di ruang TV'), that is a potential_inconsistency even when the wording is otherwise different and even when an innocent explanation (memory, estimate, transcription) is possible: list that explanation as uncertainty instead of downgrading the status. A handgun and a rifle are different weapon types. A source of kind earlier_testimony is the same witness's (or another person's) earlier statement in the record: a conflict with it is a potential inconsistency within the testimony and must cite that earlier statement. Only a genuine paraphrase with the same values, or a difference about a clearly different event, moment or object, is not a conflict.";

export const SCREEN_ROLE =
  "Evidence screen. First decide whether the testimony makes a checkable factual assertion; questions, greetings, procedure, fragments, opinions, feelings and general remarks are not checkable (use preceding_context to read short answers, so 'Jam sembilan' answering 'Jam berapa Saudara datang?' asserts an arrival time). Turns by the judge (Hakim), prosecutor (Penuntut Umum, JPU) or counsel (Penasihat Hukum) are usually questions, summaries put to the witness, or procedure even without a question mark: they are not checkable unless the speaker states a fact as their own evidence. Never describe a different turn from preceding_context as this testimony. If checkable, compare it with every source and return a calibrated finding: supported only with a supporting quote, potential_inconsistency only with a conflicting quote, context_needed when sources are related but do not settle the specific, insufficient_evidence when they say nothing about it. " +
  FACT_RULES +
  " Name the differing values in the title (for example 'Waktu kedatangan: jam 9 di sidang, jam 8 di BAP'). Give a concrete verification step and one neutral follow-up question.";

const SCREEN_REPAIR =
  " Your previous answer quoted text that does not occur in its source. Copy every quote character for character as a short contiguous span of that source's text, with the chunk_id of the same source. If no quote supports the status, choose a weaker status.";

export const REVIEW_ROLE =
  "Independent reviewer. You have not seen any earlier assessment. passages_to_compare lists the source passages to check against the testimony. Decide whether they genuinely conflict with the testimony: conflict_confirmed=true when they state different values for the same specific fact; false only when the values actually agree, the difference is purely wording, or the passages plainly concern a different event, moment or object. " +
  FACT_RULES +
  " List alternative explanations and missing context. Do not judge credibility.";

const COURTESY = new Set(
  "ya iya yah he eh ehm oh ah mm heeh baik oke ok silakan silahkan terima kasih mohon izin maaf sebentar yang mulia majelis hakim pak bu ibu bapak saudara saudari sekalian cukup lanjut lanjutkan hm hmm eh em nah thank you yes okay please go ahead your honour honor".split(
    " ",
  ),
);

/** Questions and pure courtesy or procedure turns, which never need a model call. */
export function notCheckable(text: string) {
  const trimmed = text.trim();
  if (/\?\s*$/.test(trimmed)) return true;
  const words = trimmed.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return !words.length || words.every((word) => COURTESY.has(word));
}

/**
 * The closest earlier statements in this case, as citable sources (`statement:<id>`).
 * The same speaker's turns rank first; preceding_context already carries the last few turns.
 */
export async function priorTestimony(
  rt: Runtime,
  segment: Segment,
  query: string,
  limit = 6,
): Promise<Source[]> {
  const queryTokens = tokens(query);
  if (!queryTokens.size) return [];
  const hearings = new Map(
    (await rt.db.all("hearings", "case_id=?", [segment.case_id])).map((h) => [
      h.id,
      h.title,
    ]),
  );
  const earlier = await rt.db.all(
    "segments",
    "case_id=? AND id<>? AND (created_at<? OR (created_at=? AND start<?))",
    [
      segment.case_id,
      segment.id,
      segment.created_at,
      segment.created_at,
      segment.start,
    ],
    "ORDER BY created_at DESC LIMIT 2000",
  );
  return earlier
    .filter((s) => !notCheckable(s.text))
    .map((s) => {
      const overlap = [...tokens(s.text)].filter((t) =>
        queryTokens.has(t),
      ).length;
      const score =
        overlap / Math.max(1, queryTokens.size) +
        (overlap && s.speaker === segment.speaker ? 0.5 : 0);
      return { s, score };
    })
    .filter(({ score }) => score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ s, score }) => ({
      id: `statement:${s.id}`,
      document_id: "",
      document_name: `${hearings.get(s.hearing_id || "") || "Hearing"} · ${s.speaker}`,
      page: 1,
      section: "testimony",
      text: s.text,
      score: Math.round(score * 10000) / 10000,
    }));
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
      // One saved batch can share a timestamp; its timeline order still applies.
      "case_id=? AND hearing_id=? AND id<>? AND (created_at<? OR (created_at=? AND start<?))",
      [
        segment.case_id,
        segment.hearing_id,
        segment.id,
        segment.created_at,
        segment.created_at,
        segment.start,
      ],
      "ORDER BY created_at DESC, start DESC LIMIT 5",
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
        "Automatic analysis is unavailable. Your transcript is saved. You can still review it alongside your documents.",
      );
      return;
    }
    // Questions and courtesy turns ("Ya, silakan.") assert nothing; skip them for free.
    if (notCheckable(segment.text)) {
      await analysisState(rt, id, "skipped");
      return;
    }
    // Cheap path first: retrieval runs in the database, then one default-tier call both
    // screens the statement and compares it with the sources. Only a potential
    // inconsistency pays for the independent review model.
    await analysisState(rt, id, "retrieving");
    const query = [...context.slice(-2).map((c) => c.text), segment.text].join(
      " ",
    );
    const { results: documents, mode: method } = await retrieve(
      rt,
      segment.case_id,
      query,
      8,
      hearing?.source_document_id,
    );
    // Earlier testimony is evidence too: a witness who said "jam 8" and now says "jam 9"
    // contradicts their own statement even when no document mentions the time.
    const earlier = await priorTestimony(rt, segment, query);
    const sources = [...documents, ...earlier];
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
      sources: sources.map((source) => ({
        id: source.id,
        kind: source.id.startsWith("statement:")
          ? "earlier_testimony"
          : "document",
        title: source.document_name,
        page: source.page,
        text: source.text,
      })),
    };
    await analysisState(rt, id, "analyzing");
    const screenSchema = conclusionSchema.extend({ checkable: z.boolean() });
    const asConclusion = (value: z.output<typeof screenSchema>) =>
      conclusionSchema.parse(
        Object.fromEntries(
          Object.entries(value).filter(([key]) => key !== "checkable"),
        ),
      );
    const screen = await structured(rt, SCREEN_ROLE, packet, screenSchema);
    if (!screen.checkable) {
      await analysisState(rt, id, "skipped");
      return;
    }
    try {
      conclusion = verifiedConclusion(asConclusion(screen), sources);
    } catch (error) {
      if (!(error instanceof ProviderError)) throw error;
      // A quote that does not match is never shown. Only a difference or support is
      // worth one repair call; a weaker result is quietly left out.
      if (!["potential_inconsistency", "supported"].includes(screen.status)) {
        await analysisState(rt, id, "skipped");
        return;
      }
      const repaired = await structured(
        rt,
        SCREEN_ROLE + SCREEN_REPAIR,
        packet,
        screenSchema,
      );
      try {
        if (!repaired.checkable) throw new ProviderError("Not checkable.");
        conclusion = verifiedConclusion(asConclusion(repaired), sources);
      } catch {
        await analysisState(rt, id, "skipped");
        return;
      }
    }
    let legalNote = "";
    if (conclusion.status !== "insufficient_evidence" && rt.config.pasalKey)
      try {
        legal = await legalSearch(rt, conclusion.title.slice(0, 160));
      } catch {
        legalNote =
          "Legal discovery was unavailable. No legal reference was inferred.";
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
      // A potential inconsistency is shown only when the independent reviewer confirms
      // it. If the reviewer cannot answer, the finding falls back to context needed.
      const reviewer = await structured(
        rt,
        REVIEW_ROLE,
        {
          ...packet,
          // Only the passages in question, never the screen's reasoning or title.
          passages_to_compare: conclusion.citations
            .filter((c) => c.relation === "conflicts")
            .map((c) => ({ source_id: c.chunk_id, quote: c.quote })),
        },
        assessmentSchema.extend({ conflict_confirmed: z.boolean() }),
        { tier: "review" },
      ).catch(() => ({
        conflict_confirmed: false,
        summary:
          "The independent review could not be completed, so this difference is not shown as a conflict. Compare both passages yourself.",
        alternative_explanations: [] as string[],
        missing_context: [] as string[],
        unavailable: true,
      }));
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
        reviewed_by:
          "unavailable" in reviewer ? "review_unavailable" : "independent",
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
        "Analysis failed. Your transcript is saved. Retry this statement.",
      ),
    );
  }
}

// One local process: bound provider concurrency and coalesce duplicate retries.
export const ANALYSIS_CONCURRENCY = 3;
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
      "Analysis queue is full. Your testimony is saved. Retry when the queue clears.",
    );
    return;
  }
  const pool = state;
  const work = (async () => {
    if (pool.active >= ANALYSIS_CONCURRENCY)
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

/**
 * Analyze many statements through the shared pool, `ANALYSIS_CONCURRENCY` at a time.
 * Feeding one id per free slot keeps the pending queue short, so a long hearing never
 * hits the queue limit. Bedrock throttling is absorbed by the client's adaptive retries.
 */
export async function investigateAll(rt: Runtime, ids: string[]) {
  const queue = [...ids];
  await Promise.all(
    Array.from(
      { length: Math.min(ANALYSIS_CONCURRENCY, queue.length) },
      async () => {
        for (let id = queue.shift(); id; id = queue.shift())
          await investigate(rt, id);
      },
    ),
  );
}
