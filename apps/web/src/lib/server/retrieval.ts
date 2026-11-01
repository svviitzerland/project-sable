import type { Runtime } from "./runtime";
import type { Source } from "./contracts";
import { embed } from "./providers";
const stop = new Set(
  "the a i at and to of is in was saya di dan itu yang pada ke dari dengan".split(
    " ",
  ),
);
export const tokens = (text: string) =>
  new Set(
    (text.toLowerCase().match(/[\p{L}\p{N}_]+/gu) || []).filter(
      (t) => !stop.has(t),
    ),
  );
export function cosine(a: number[], b: number[]) {
  if (a.length !== b.length) return 0;
  const denom = Math.sqrt(
    a.reduce((s, x) => s + x * x, 0) * b.reduce((s, x) => s + x * x, 0),
  );
  return denom ? a.reduce((s, x, i) => s + x * b[i], 0) / denom : 0;
}
export async function retrieve(
  rt: Runtime,
  caseId: string,
  query: string,
  limit = 8,
  excludeDocumentId?: string | null,
): Promise<{ results: Source[]; mode: string }> {
  let vector: number[] | null = null;
  try {
    vector = (await embed(rt, [query]))?.[0] || null;
  } catch {
    /* Keyword search remains available when embeddings fail. */
  }
  const docs = new Map(
    (await rt.db.all("documents", "case_id=?", [caseId])).map((d) => [
      d.id,
      d.name,
    ]),
  );
  const chunks = (await rt.db.all("chunks", "case_id=?", [caseId])).filter(
    (c) => c.document_id !== excludeDocumentId,
  );
  const queryTokens = tokens(query),
    hasVectors =
      !!vector &&
      chunks.some(
        (c) => c.embedding && c.embedding_model === rt.config.embeddingModel,
      );
  const pgScores = new Map<string, number>();
  if (vector && rt.db.postgres) {
    try {
      const rows = await rt.db.query<{ id: string; score: number }>(
        "SELECT id, 1 - (embedding_vector OPERATOR(extensions.<=>) CAST(? AS extensions.vector)) AS score FROM jude_chunks WHERE case_id=? AND embedding_model=? AND embedding_vector IS NOT NULL ORDER BY embedding_vector OPERATOR(extensions.<=>) CAST(? AS extensions.vector) LIMIT 50",
        [
          JSON.stringify(vector),
          caseId,
          rt.config.embeddingModel,
          JSON.stringify(vector),
        ],
      );
      for (const row of rows)
        if (Number.isFinite(row.score)) pgScores.set(row.id, row.score);
    } catch {
      /* Existing pre-vector installations use the same cosine fallback. */
    }
  }
  const results: Source[] = [];
  for (const chunk of chunks) {
    const overlap =
        [...tokens(chunk.text)].filter((t) => queryTokens.has(t)).length /
        Math.max(1, queryTokens.size),
      similarity =
        vector &&
        chunk.embedding &&
        chunk.embedding_model === rt.config.embeddingModel
          ? (pgScores.get(chunk.id) ?? cosine(vector, chunk.embedding))
          : 0;
    const score = hasVectors
      ? 0.45 * overlap + 0.55 * Math.max(0, similarity)
      : overlap;
    if (score > 0.015)
      results.push({
        id: chunk.id,
        document_id: chunk.document_id,
        document_name: docs.get(chunk.document_id) || "",
        page: chunk.page,
        section: chunk.section,
        text: chunk.text,
        score: Math.round(score * 10000) / 10000,
      });
  }
  return {
    results: results.sort((a, b) => b.score - a.score).slice(0, limit),
    mode: hasVectors ? "hybrid" : "keyword",
  };
}
