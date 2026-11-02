import type { Citation } from "./contracts";
export interface Example {
  id: string;
  transcript: string;
  expected_status: string;
  sources: { id: string; text: string }[];
  reference_transcript?: string;
}
export interface Prediction {
  id: string;
  status: string;
  citations?: Citation[];
  elapsed_ms?: number;
  recognized_transcript?: string;
  unsupported_conclusion?: boolean;
  error?: string | null;
  explanation?: string;
  uncertainty?: string;
}
const statuses = [
  "supported",
  "potential_inconsistency",
  "context_needed",
  "insufficient_evidence",
  "skipped",
];
const ratio = (a: number, b: number) =>
  b ? Math.round((a / b) * 10000) / 10000 : null;
export function wordErrorRate(reference: string, hypothesis: string) {
  const words = (s: string) =>
    s.trim() ? s.toLowerCase().trim().split(/\s+/) : [];
  const expected = words(reference),
    actual = words(hypothesis);
  let previous = Array.from({ length: actual.length + 1 }, (_, i) => i);
  for (const [i, word] of expected.entries()) {
    const current = [i + 1];
    for (const [j, other] of actual.entries())
      current.push(
        Math.min(
          current[j] + 1,
          previous[j + 1] + 1,
          previous[j] + Number(word !== other),
        ),
      );
    previous = current;
  }
  return ratio(previous.at(-1)!, expected.length);
}
export function score(
  dataset: Example[],
  predictions: Prediction[],
  mode: "fixture" | "live" | "imported",
) {
  const ids = predictions.map((p) => p.id);
  if (
    new Set(ids).size !== ids.length ||
    ids.some((id) => !dataset.some((x) => x.id === id))
  )
    throw new Error("Predictions must have unique IDs drawn from the dataset");
  let tp = 0,
    fp = 0,
    fn = 0,
    valid = 0,
    citationCount = 0,
    ungrounded = 0;
  const annotations: boolean[] = [],
    latencies: number[] = [];
  const rows = dataset.map((item) => {
    const prediction = predictions.find((p) => p.id === item.id) || {
        id: item.id,
        status: "missing",
      },
      actual = prediction.status,
      expected = item.expected_status;
    tp += Number(actual === expected && actual === "potential_inconsistency");
    fp += Number(actual === "potential_inconsistency" && expected !== actual);
    fn += Number(expected === "potential_inconsistency" && actual !== expected);
    const citations = prediction.citations || [],
      verified = citations.filter(
        (c) =>
          c.quote.trim() &&
          item.sources.find((s) => s.id === c.chunk_id)?.text.includes(c.quote),
      );
    valid += verified.length;
    citationCount += citations.length;
    const required =
        actual === "supported"
          ? "supports"
          : actual === "potential_inconsistency"
            ? "conflicts"
            : null,
      grounded = required
        ? verified.some((c) => c.relation === required)
        : !!verified.length;
    ungrounded += Number(
      ["supported", "potential_inconsistency", "context_needed"].includes(
        actual,
      ) && !grounded,
    );
    if (typeof prediction.unsupported_conclusion === "boolean")
      annotations.push(prediction.unsupported_conclusion);
    if (prediction.elapsed_ms !== undefined)
      latencies.push(prediction.elapsed_ms);
    return {
      id: item.id,
      expected,
      actual,
      correct: actual === expected,
      citations_valid: verified.length === citations.length,
      ...(item.reference_transcript &&
      prediction.recognized_transcript !== undefined
        ? {
            word_error_rate: wordErrorRate(
              item.reference_transcript,
              prediction.recognized_transcript,
            ),
          }
        : {}),
    };
  });
  latencies.sort((a, b) => a - b);
  const mid = Math.floor(latencies.length / 2),
    median = latencies.length
      ? latencies.length % 2
        ? latencies[mid]
        : (latencies[mid - 1] + latencies[mid]) / 2
      : null;
  return {
    mode,
    notice:
      mode === "fixture"
        ? "Fixture scoring validates the harness only. It does not measure AI or transcription quality."
        : "Small synthetic evaluation. Not courtroom performance. Unsupported conclusions require independent human annotation.",
    examples: rows.length,
    status_accuracy: ratio(rows.filter((r) => r.correct).length, rows.length),
    inconsistency: {
      true_positives: tp,
      false_positives: fp,
      false_negatives: fn,
      precision: ratio(tp, tp + fp),
      recall: ratio(tp, tp + fn),
    },
    citation_validity: ratio(valid, citationCount),
    citation_count: citationCount,
    substantive_findings_without_required_citations: ungrounded,
    human_annotated_unsupported_conclusion_rate: ratio(
      annotations.filter(Boolean).length,
      annotations.length,
    ),
    human_annotated_count: annotations.length,
    missing_or_failed: rows.filter((r) => !statuses.includes(r.actual)).length,
    latency_ms: { median, max: latencies.at(-1) ?? null },
    per_status: Object.fromEntries(
      statuses.map((status) => [
        status,
        {
          expected: rows.filter((r) => r.expected === status).length,
          correct: rows.filter((r) => r.expected === status && r.correct)
            .length,
        },
      ]),
    ),
    examples_detail: rows,
  };
}
