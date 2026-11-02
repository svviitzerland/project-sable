import type { Runtime } from "./runtime";
import type { Source } from "./contracts";
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
export async function retrieve(
  rt: Runtime,
  caseId: string,
  query: string,
  limit = 8,
  excludeDocumentId?: string | null,
): Promise<{ results: Source[]; mode: string }> {
  const docs = new Map(
    (await rt.db.all("documents", "case_id=?", [caseId])).map((d) => [
      d.id,
      d.name,
    ]),
  );
  const chunks = (await rt.db.all("chunks", "case_id=?", [caseId])).filter(
    (c) => c.document_id !== excludeDocumentId,
  );
  const queryTokens = tokens(query);
  const results: Source[] = [];
  for (const chunk of chunks) {
    const score =
      [...tokens(chunk.text)].filter((t) => queryTokens.has(t)).length /
      Math.max(1, queryTokens.size);
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
    mode: "keyword",
  };
}
