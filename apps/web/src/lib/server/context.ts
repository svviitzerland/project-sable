import type { Runtime } from "./runtime";
import type { Case, Chunk, Segment, ContextSource } from "./contracts";
import { assert } from "./errors";
import { retrieve, tokens } from "./retrieval";
export async function inventory(rt: Runtime, caseId: string) {
  return {
    documents: await rt.db.all(
      "documents",
      "case_id=?",
      [caseId],
      "ORDER BY created_at",
    ),
    hearings: await rt.db.all(
      "hearings",
      "case_id=?",
      [caseId],
      "ORDER BY created_at",
    ),
  };
}
export async function caseContext(
  rt: Runtime,
  record: Case,
  query: string,
  references: string[],
) {
  const { results: retrieved, mode } = await retrieve(rt, record.id, query),
    { documents, hearings } = await inventory(rt, record.id),
    names = new Map(documents.map((d) => [d.id, d.name])),
    hearingNames = new Map(hearings.map((h) => [h.id, h.title]));
  const chunks = await rt.db.all(
      "chunks",
      "case_id=?",
      [record.id],
      "ORDER BY document_id,page,id",
    ),
    segments = await rt.db.all(
      "segments",
      "case_id=?",
      [record.id],
      "ORDER BY created_at,id",
    ),
    chunkMap = new Map(chunks.map((c) => [c.id, c])),
    segmentMap = new Map(segments.map((s) => [s.id, s]));
  const chosen: ContextSource[] = [],
    queryTokens = tokens(query),
    rank = (text: string) =>
      [...tokens(text)].filter((t) => queryTokens.has(t)).length;
  const passage = (c: Chunk): ContextSource => ({
    chunk_id: c.id,
    kind: "document",
    title: names.get(c.document_id)!,
    text: c.text.slice(0, 2400),
    document_id: c.document_id,
    page: c.page,
    hearing_id: null,
  });
  const testimony = (s: Segment): ContextSource => ({
    chunk_id: `statement:${s.id}`,
    kind: "testimony",
    title: `${hearingNames.get(s.hearing_id || "") || "Hearing"} · ${record.speakers[s.speaker] || s.speaker}`,
    text: s.text.slice(0, 2400),
    document_id: null,
    page: null,
    hearing_id: s.hearing_id,
  });
  for (const ref of references) {
    const [kind, id] = ref.split(":");
    if (kind === "document" && names.has(id))
      chosen.push(
        ...chunks
          .filter((c) => c.document_id === id)
          .slice(0, 3)
          .map(passage),
      );
    else if (kind === "hearing" && hearingNames.has(id))
      chosen.push(
        ...segments
          .filter((s) => s.hearing_id === id)
          .sort((a, b) => rank(b.text) - rank(a.text))
          .slice(0, 4)
          .map(testimony),
      );
    else if (kind === "passage" && chunkMap.has(id))
      chosen.push(passage(chunkMap.get(id)!));
    else if (kind === "statement" && segmentMap.has(id))
      chosen.push(testimony(segmentMap.get(id)!));
    else
      assert(false, 404, "Referenced material does not belong to this case.");
  }
  chosen.push(
    ...retrieved
      .filter((s) => chunkMap.has(s.id))
      .map((s) => passage(chunkMap.get(s.id)!)),
    ...segments
      .toSorted((a, b) => rank(b.text) - rank(a.text))
      .slice(0, 8)
      .map(testimony),
  );
  const selected = new Set(chosen.map((s) => s.chunk_id)),
    links = (
      await rt.db.all("evidence_links", "case_id=? AND confirmed=?", [
        record.id,
        true,
      ])
    )
      .filter((l) => selected.has(l.source_id) || selected.has(l.target_id))
      .slice(0, 8);
  for (const link of links)
    for (const id of [link.source_id, link.target_id])
      if (chunkMap.has(id)) chosen.push(passage(chunkMap.get(id)!));
  for (const doc of documents) {
    const first = chunks.find((c) => c.document_id === doc.id);
    if (first) chosen.push(passage(first));
  }
  const seen = new Set<string>(),
    sources = chosen
      .filter((s) => {
        if (seen.has(s.chunk_id)) return false;
        seen.add(s.chunk_id);
        return true;
      })
      .slice(0, 20);
  const findings = await rt.db.all(
    "findings",
    "case_id=?",
    [record.id],
    "ORDER BY created_at DESC LIMIT 40",
  );
  return {
    context: {
      case: {
        title: record.title,
        reference: record.reference,
        description: record.description,
        synthetic: record.synthetic,
      },
      documents: documents.map((d) => ({
        id: d.id,
        name: d.name,
        pages: d.pages,
      })),
      hearings: hearings
        .slice(0, 100)
        .map((h) => ({ id: h.id, title: h.title, date: h.date })),
      findings_are_interpretations_not_facts: findings.map((f) => ({
        status: f.status,
        title: f.title,
        verification: f.verification,
        reviewed: f.reviewed,
      })),
      confirmed_connections_are_human_reviewed_not_proof: links.map((l) => ({
        source_id: l.source_id,
        target_id: l.target_id,
        relation: l.relation,
        explanation: l.explanation.slice(0, 600),
      })),
      sources,
    },
    notice: `Based on ${sources.length} source excerpt${sources.length === 1 ? "" : "s"}. Check the original context; this is not a review of the entire case.`,
    mode,
  };
}
