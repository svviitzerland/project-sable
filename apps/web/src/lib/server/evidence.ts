import { z } from "zod";
import {
  citationSchema,
  type Link,
  type Chunk,
  type Source,
  type Citation,
} from "./contracts";
import type { Runtime } from "./runtime";
import { assert, ProviderError } from "./errors";
import { embed, structured } from "./providers";
import { tokens, cosine, retrieve } from "./retrieval";
export const relationSchema = z.enum([
  "supports",
  "conflicts",
  "context",
  "related",
]);
export async function graph(rt: Runtime, caseId: string) {
  const docs = new Map(
    (
      await rt.db.all("documents", "case_id=?", [caseId], "ORDER BY created_at")
    ).map((d) => [d.id, d.name]),
  );
  const chunks = await rt.db.all(
      "chunks",
      "case_id=?",
      [caseId],
      "ORDER BY document_id,page",
    ),
    links = await rt.db.all(
      "evidence_links",
      "case_id=?",
      [caseId],
      "ORDER BY confirmed DESC,created_at DESC LIMIT 1000",
    ),
    findings = await rt.db.all(
      "findings",
      "case_id=?",
      [caseId],
      "ORDER BY created_at",
    ),
    segments = new Map(
      (await rt.db.all("segments", "case_id=?", [caseId])).map((s) => [
        s.id,
        s,
      ]),
    );
  const relevant = new Set([
    ...links.flatMap((l) => [l.source_id, l.target_id]),
    ...findings.flatMap((f) => f.citations.map((c) => c.chunk_id)),
  ]);
  const selected = chunks
      .toSorted(
        (a, b) => Number(!relevant.has(a.id)) - Number(!relevant.has(b.id)),
      )
      .slice(0, 60),
    ids = new Set(selected.map((c) => c.id));
  const nodes: Record<string, unknown>[] = selected.map((c) => ({
    id: c.id,
    kind: "passage",
    label: docs.get(c.document_id),
    detail: c.section || `Page ${c.page}`,
    text: c.text,
    document_id: c.document_id,
    page: c.page,
  }));
  const edges: Record<string, unknown>[] = links
    .filter((l) => ids.has(l.source_id) && ids.has(l.target_id))
    .map((l) => ({ ...l, kind: "evidence" }));
  for (const f of findings.slice(-20)) {
    const cited = f.citations.filter((c) => ids.has(c.chunk_id)),
      s = segments.get(f.segment_id);
    if (!cited.length || !s) continue;
    const id = `statement:${s.id}`;
    nodes.push({
      id,
      kind: "statement",
      label: s.speaker,
      detail: "Hearing statement",
      text: s.text,
      hearing_id: s.hearing_id,
      finding_id: f.id,
    });
    for (const c of cited)
      edges.push({
        id: `${f.id}:${c.chunk_id}`,
        source_id: id,
        target_id: c.chunk_id,
        relation: c.relation,
        explanation: f.explanation,
        basis: f.mode,
        confirmed: f.reviewed,
        score: null,
        source_quote: s.text,
        target_quote: c.quote,
        kind: "finding",
      });
  }
  return {
    nodes,
    edges,
    total_passages: chunks.length,
    shown_passages: selected.length,
    indexed_passages: chunks.filter(
      (c) => c.embedding && c.embedding_model === rt.config.embeddingModel,
    ).length,
    notice:
      "Similarity suggests a connection, not support or contradiction. Inspect both passages before confirming a link.",
  };
}
export function candidatePairs(chunks: Chunk[]) {
  const pairs: { score: number; a: Chunk; b: Chunk; basis: string }[] = [];
  for (const [i, a] of chunks.entries())
    for (const b of chunks.slice(i + 1)) {
      if (a.document_id === b.document_id) continue;
      const semantic = !!a.embedding && !!b.embedding,
        at = tokens(a.text),
        bt = tokens(b.text),
        score = semantic
          ? cosine(a.embedding!, b.embedding!)
          : [...at].filter((t) => bt.has(t)).length /
            Math.max(1, new Set([...at, ...bt]).size);
      if (score >= (semantic ? 0.68 : 0.12))
        pairs.push({ score, a, b, basis: semantic ? "semantic" : "keywords" });
    }
  return pairs.sort((a, b) => b.score - a.score).slice(0, 12);
}
export async function buildLinks(rt: Runtime, caseId: string) {
  const chunks = await rt.db.all(
    "chunks",
    "case_id=?",
    [caseId],
    "ORDER BY id LIMIT 300",
  );
  let notice = "";
  if (rt.config.openrouterKey) {
    const missing = chunks.filter(
      (c) => !c.embedding || c.embedding_model !== rt.config.embeddingModel,
    );
    try {
      for (let i = 0; i < missing.length; i += 24) {
        const batch = missing.slice(i, i + 24),
          vectors = await embed(
            rt,
            batch.map((c) => c.text),
          );
        if (!vectors) break;
        for (const [j, c] of batch.entries()) {
          c.embedding = vectors[j];
          c.embedding_model = rt.config.embeddingModel;
          await rt.db.update(
            "chunks",
            { embedding: c.embedding, embedding_model: c.embedding_model },
            "id=?",
            [c.id],
          );
        }
      }
    } catch {
      notice =
        "Some related passages may be missing. Review these suggestions or try again later.";
    }
  }
  for (const c of chunks)
    if (c.embedding_model !== rt.config.embeddingModel) c.embedding = null;
  const pairs = candidatePairs(chunks.slice(0, 120));
  let proposed: Partial<Link>[] = [];
  if (pairs.length && rt.config.openrouterKey && rt.config.model)
    try {
      const response = await structured(
        rt,
        "Compare only supplied evidence pairs. Suggest supports, conflicts, context, or related. Topical similarity is only related. A conflict requires incompatible claims about the same event and subject; consider dates and alternative explanations. Quote both sources exactly. Never infer dishonesty or guilt. All relationships remain suggestions for human review.",
        {
          candidate_pairs: pairs.map(({ a, b }) => ({
            source_id: a.id,
            target_id: b.id,
            source_text: a.text,
            target_text: b.text,
          })),
        },
        z.strictObject({
          links: z
            .array(
              z.strictObject({
                source_id: z.string(),
                target_id: z.string(),
                relation: relationSchema,
                explanation: z.string().min(1).max(1200),
                source_quote: z.string().min(1).max(1500),
                target_quote: z.string().min(1).max(1500),
              }),
            )
            .max(12),
        }),
      );
      proposed = response.links.map((link) => {
        const pair = pairs.find(
          (p) => p.a.id === link.source_id && p.b.id === link.target_id,
        );
        if (
          !pair ||
          !link.source_quote.trim() ||
          !link.target_quote.trim() ||
          !pair.a.text.includes(link.source_quote) ||
          !pair.b.text.includes(link.target_quote)
        )
          throw new ProviderError(
            "A suggested relationship failed source verification. No AI links were published.",
          );
        return { ...link, basis: "ai", score: pair.score };
      });
    } catch {
      notice +=
        " AI relationships could not be verified; similarity suggestions are shown.";
      proposed = [];
    }
  if (!proposed.length)
    proposed = pairs.map(({ score, a, b, basis }) => ({
      source_id: a.id,
      target_id: b.id,
      relation: "related",
      explanation:
        "Similar subject matter; inspect the passages to determine their relationship.",
      source_quote: a.text.slice(0, 300),
      target_quote: b.text.slice(0, 300),
      basis,
      score,
    }));
  let added = 0;
  await rt.db.transaction(async (db) => {
    for (const values of proposed) {
      if (
        await db.one(
          "evidence_links",
          "case_id=? AND source_id=? AND target_id=?",
          [caseId, values.source_id, values.target_id],
        )
      )
        continue;
      await db.insert("evidence_links", { case_id: caseId, ...values });
      added++;
    }
  });
  return {
    added,
    notice: notice.trim() || "Suggested links are ready to inspect.",
    scope:
      "Up to 300 passages indexed; cross-document suggestions use the first 120 passages. Natural-language search covers all case passages.",
  };
}
export async function askEvidence(rt: Runtime, caseId: string, query: string) {
  const { results: sources, mode: method } = await retrieve(
      rt,
      caseId,
      query,
      6,
    ),
    ids = new Set(sources.map((s) => s.id)),
    links = await rt.db.all("evidence_links", "case_id=? AND confirmed=?", [
      caseId,
      true,
    ]),
    neighbors = new Set(
      links
        .filter((l) => ids.has(l.source_id) || ids.has(l.target_id))
        .flatMap((l) => [l.source_id, l.target_id])
        .filter((id) => !ids.has(id)),
    );
  const docs = new Map(
    (await rt.db.all("documents", "case_id=?", [caseId])).map((d) => [
      d.id,
      d.name,
    ]),
  );
  const chunks = (
    await rt.db.all("chunks", "case_id=?", [caseId], "ORDER BY id")
  )
    .filter((c) => neighbors.has(c.id))
    .slice(0, 4);
  for (const c of chunks)
    sources.push({
      id: c.id,
      document_id: c.document_id,
      document_name: docs.get(c.document_id)!,
      page: c.page,
      section: c.section,
      text: c.text,
      score: 0,
    });
  const result: {
    answer: string | null;
    citations: Citation[];
    sources: Source[];
    method: string;
    notice: string;
  } = { answer: null, citations: [], sources, method, notice: "" };
  if (!sources.length)
    result.notice =
      "No relevant passages found. Try different wording or add evidence.";
  else if (!rt.config.openrouterKey || !rt.config.model)
    result.notice =
      "AI answers are unavailable. You can inspect the relevant passages below.";
  else {
    const answer = await structured(
      rt,
      "Answer the case question using only supplied passages. Distinguish source text, conflicts, and missing evidence. Do not determine credibility or guilt. Cite exact quotations for every substantive point. If these passages cannot answer the question, state what is missing without inventing facts.",
      { question: query, sources },
      z.strictObject({
        answer: z.string().min(1).max(4000),
        citations: z.array(citationSchema).max(8),
      }),
    );
    if (
      !answer.citations.length ||
      answer.citations.some(
        (c) =>
          !c.quote.trim() ||
          !sources.find((s) => s.id === c.chunk_id)?.text.includes(c.quote),
      )
    )
      throw new ProviderError(
        "The answer failed citation verification. Inspect the retrieved passages or try again.",
      );
    Object.assign(result, answer);
  }
  return result;
}
export async function checkedPair(
  rt: Runtime,
  caseId: string,
  sourceId: string,
  targetId: string,
) {
  assert(sourceId !== targetId, 422, "Choose two different passages.");
  const a = await rt.db.one("chunks", "case_id=? AND id=?", [caseId, sourceId]),
    b = await rt.db.one("chunks", "case_id=? AND id=?", [caseId, targetId]);
  assert(a && b, 404, "Both passages must belong to this case.");
  return [a, b] as const;
}
