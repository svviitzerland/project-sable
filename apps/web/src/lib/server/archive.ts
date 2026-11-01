import { zipSync, unzipSync, strToU8 } from "fflate";
import { z } from "zod";
import {
  caseInput,
  hearingInput,
  turnSchema,
  conclusionSchema,
  type Case,
  type User,
  type Json,
} from "./contracts";
import type { Runtime } from "./runtime";
import { hash } from "./runtime";
import { uid } from "./database";
import { assert, HttpError } from "./errors";
import { validateCitations } from "./analysis";
import { readFileData, saveFile, deleteFile } from "./providers";
import { MAX_BYTES } from "./documents";
export const MAX_ARCHIVE = 64 * 1024 * 1024,
  MAX_MANIFEST = 12 * 1024 * 1024;
const id = z.string().min(1).max(100),
  time = z.string().max(40);
export const caseOutput = caseInput.extend({
  id,
  synthetic: z.boolean(),
  status: z.string(),
  created_at: time,
  speakers: z.record(z.string().max(80), z.string().max(80)),
});
export const documentOutput = z.object({
  id,
  case_id: id,
  name: z.string().min(1).max(200),
  mime: z.string().min(1).max(100),
  pages: z.number().int().min(1),
  created_at: time,
});
export const sourceOutput = z.object({
  id,
  document_id: id,
  document_name: z.string(),
  page: z.number().int().min(1),
  section: z.string().max(100),
  text: z.string().max(10000),
  score: z.number().default(0),
});
export const hearingOutput = hearingInput.extend({
  id,
  case_id: id,
  kind: z.string(),
  status: z.string(),
  source_document_id: id.nullable(),
  created_at: time,
});
export const segmentOutput = turnSchema.extend({
  id,
  hearing_id: id.nullable(),
  confidence: z.number().nullable(),
  origin: z.string(),
  analysis_state: z.string(),
  analysis_error: z.string().nullable(),
  created_at: time,
});
export const findingOutput = conclusionSchema.extend({
  id,
  segment_id: id,
  review: z.record(z.string(), z.json()),
  legal: z.array(z.record(z.string(), z.json())),
  mode: z.string(),
  elapsed_ms: z.number().int(),
  reviewed: z.boolean(),
  note: z.string().max(4000),
  created_at: time,
});
export const linkOutput = z.object({
  id,
  source_id: id,
  target_id: id,
  relation: z.enum(["supports", "conflicts", "context", "related"]),
  explanation: z.string().max(2000),
  basis: z.string(),
  confirmed: z.boolean(),
  score: z.number().nullable(),
  source_quote: z.string().max(3000),
  target_quote: z.string().max(3000),
  created_at: time,
});
// Output projections strip database-only fields; imports reject extra top-level records.
const archiveSchema = z.strictObject({
  format: z.literal("jude"),
  version: z.literal(1),
  kind: z.literal("case"),
  case: caseOutput.strip(),
  documents: z
    .array(
      documentOutput.extend({
        file: z.string(),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
      }),
    )
    .max(40),
  sources: z.array(sourceOutput).max(14000),
  hearings: z.array(hearingOutput.strip()).max(100),
  segments: z.array(segmentOutput.strip()).max(2000),
  findings: z.array(findingOutput.strip()).max(2000),
  links: z.array(linkOutput).max(1000),
});
export function pack(
  manifest: unknown,
  files: Record<string, Uint8Array> = {},
) {
  const encoded = strToU8(JSON.stringify(manifest));
  assert(
    encoded.length <= MAX_MANIFEST &&
      Object.values(files).reduce((n, v) => n + v.length, encoded.length) <=
        MAX_ARCHIVE,
    413,
    "This case exceeds the 64 MB .jude archive limit.",
  );
  return zipSync({ "manifest.json": encoded, ...files }, { level: 6 });
}
export function unpack(data: Uint8Array) {
  assert(data.length <= MAX_ARCHIVE, 413, "Use a .jude archive up to 64 MB.");
  try {
    let total = 0;
    const names = new Set<string>();
    const contents = unzipSync(data, {
      filter: (file) => {
        assert(
          !names.has(file.name) &&
            names.size < 42 &&
            !file.name.startsWith("/") &&
            !/[\\\x00-\x1f]/.test(file.name) &&
            !file.name.split("/").includes(".."),
          422,
          "Invalid or duplicate archive entry.",
        );
        names.add(file.name);
        total += file.originalSize;
        assert(
          total <= MAX_ARCHIVE &&
            (file.name !== "manifest.json" ||
              file.originalSize <= MAX_MANIFEST),
          422,
          "Archive exceeds its expanded-size limit.",
        );
        return true;
      },
    });
    assert(contents["manifest.json"], 422, "Missing manifest.");
    const manifest = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        contents["manifest.json"],
      ),
    );
    assert(
      manifest?.format === "jude" && manifest.version === 1,
      422,
      "Unsupported .jude format/version; expected version 1.",
    );
    delete contents["manifest.json"];
    return { manifest, files: contents };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(422, "Cannot read this .jude archive.");
  }
}
export async function exportCase(rt: Runtime, record: Case) {
  const docs = await rt.db.all("documents", "case_id=?", [record.id]),
    chunks = await rt.db.all("chunks", "case_id=?", [record.id]),
    names = new Map(docs.map((d) => [d.id, d.name]));
  const files: Record<string, Uint8Array> = {},
    documents = [];
  let total = 0;
  for (const doc of docs) {
    const data = await readFileData(rt, doc),
      file = `originals/${doc.id}`;
    total += data.length;
    assert(
      total <= MAX_ARCHIVE,
      413,
      "This case exceeds the 64 MB archive limit.",
    );
    files[file] = data;
    documents.push({ ...documentOutput.parse(doc), file, sha256: hash(data) });
  }
  const manifest = {
    format: "jude",
    version: 1,
    kind: "case",
    case: caseOutput.strip().parse(record),
    documents,
    sources: chunks.map((c) =>
      sourceOutput.parse({
        ...c,
        document_name: names.get(c.document_id),
        score: 0,
      }),
    ),
    hearings: (await rt.db.all("hearings", "case_id=?", [record.id])).map((h) =>
      hearingOutput.strip().parse(h),
    ),
    segments: (await rt.db.all("segments", "case_id=?", [record.id])).map((s) =>
      segmentOutput.strip().parse(s),
    ),
    findings: (await rt.db.all("findings", "case_id=?", [record.id])).map((f) =>
      findingOutput.strip().parse(f),
    ),
    links: (await rt.db.all("evidence_links", "case_id=?", [record.id])).map(
      (l) => linkOutput.parse(l),
    ),
  };
  assert(
    archiveSchema.safeParse(manifest).success,
    413,
    "This case exceeds the version 1 archive record limits.",
  );
  return pack(manifest, files);
}
export function validateArchive(data: Uint8Array) {
  const { manifest, files } = unpack(data);
  const parsed = archiveSchema.safeParse(manifest);
  assert(parsed.success, 422, "Invalid .jude case manifest.");
  const archive = parsed.data;
  try {
    const groups = [
        archive.documents,
        archive.sources,
        archive.hearings,
        archive.segments,
        archive.findings,
        archive.links,
      ],
      ids = groups.flatMap((g) => g.map((x) => x.id));
    assert(new Set(ids).size === ids.length, 422, "Duplicate record IDs.");
    const docs = new Map(archive.documents.map((d) => [d.id, d])),
      sources = new Map(archive.sources.map((s) => [s.id, s])),
      hearings = new Map(archive.hearings.map((h) => [h.id, h])),
      segments = new Set(archive.segments.map((s) => s.id));
    assert(
      new Set(archive.documents.map((d) => d.sha256)).size === docs.size,
      422,
      "Duplicate original file contents.",
    );
    assert(
      new Set(archive.documents.map((d) => d.file)).size === docs.size &&
        Object.keys(files).length === docs.size,
      422,
      "Original files do not match the manifest.",
    );
    for (const d of docs.values())
      assert(
        d.case_id === archive.case.id &&
          files[d.file]?.length <= MAX_BYTES &&
          hash(files[d.file]) === d.sha256,
        422,
        "Original file integrity or ownership mismatch.",
      );
    for (const s of sources.values())
      assert(
        docs.has(s.document_id) && s.page <= docs.get(s.document_id)!.pages,
        422,
        "Invalid source provenance.",
      );
    for (const h of hearings.values())
      assert(
        h.case_id === archive.case.id &&
          (!h.source_document_id || docs.has(h.source_document_id)),
        422,
        "Invalid hearing provenance.",
      );
    for (const s of archive.segments)
      assert(
        (!s.hearing_id || hearings.has(s.hearing_id)) &&
          (!s.end || s.end >= s.start),
        422,
        "Invalid transcript provenance or timestamps.",
      );
    assert(
      new Set(archive.findings.map((f) => f.segment_id)).size ===
        archive.findings.length,
      422,
      "Duplicate findings for a statement.",
    );
    for (const f of archive.findings) {
      assert(
        segments.has(f.segment_id),
        422,
        "Finding refers to a missing statement.",
      );
      validateCitations(f, archive.sources);
    }
    const pairs = new Set<string>();
    for (const l of archive.links) {
      const pair = JSON.stringify([l.source_id, l.target_id]);
      assert(
        l.source_id !== l.target_id &&
          !pairs.has(pair) &&
          sources.has(l.source_id) &&
          sources.has(l.target_id) &&
          sources.get(l.source_id)!.text.includes(l.source_quote) &&
          sources.get(l.target_id)!.text.includes(l.target_quote),
        422,
        "Invalid evidence relationship.",
      );
      pairs.add(pair);
    }
    return { archive, files };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(422, "Invalid .jude case citations.");
  }
}
export async function importCase(rt: Runtime, user: User, data: Uint8Array) {
  const { archive, files } = validateArchive(data),
    mapping = new Map(
      [
        archive.documents,
        archive.sources,
        archive.hearings,
        archive.segments,
        archive.findings,
        archive.links,
      ].flatMap((group) => group.map((item) => [item.id, uid()] as const)),
    ),
    caseId = uid();
  const mapped = (id: string) => mapping.get(id)!;
  const saved: {
    doc: (typeof archive.documents)[number];
    key: string;
    storage: string;
  }[] = [];
  try {
    for (const doc of archive.documents) {
      const key = `${user.id}/${caseId}/${mapped(doc.id)}`,
        storage = await saveFile(rt, key, files[doc.file], doc.mime);
      saved.push({ doc, key, storage });
    }
    return await rt.db.transaction(async (db) => {
      const record = await db.insert("cases", {
        id: caseId,
        owner_id: user.id,
        title: archive.case.title,
        reference: archive.case.reference,
        description: archive.case.description,
        synthetic: archive.case.synthetic,
        speakers: archive.case.speakers,
      });
      for (const { doc, key, storage } of saved)
        await db.insert("documents", {
          id: mapped(doc.id),
          case_id: caseId,
          name: doc.name,
          mime: doc.mime,
          storage_key: key,
          storage,
          digest: doc.sha256,
          pages: doc.pages,
        });
      for (const s of archive.sources)
        await db.insert("chunks", {
          id: mapped(s.id),
          case_id: caseId,
          document_id: mapped(s.document_id),
          page: s.page,
          section: s.section,
          text: s.text,
        });
      for (const h of archive.hearings)
        await db.insert("hearings", {
          id: mapped(h.id),
          case_id: caseId,
          title: h.title,
          date: h.date,
          kind: "imported",
          status: "complete",
          source_document_id: h.source_document_id
            ? mapped(h.source_document_id)
            : null,
        });
      const fallback = archive.segments.some((s) => !s.hearing_id)
        ? await db.insert("hearings", {
            case_id: caseId,
            title: "Imported hearing",
            kind: "imported",
            status: "complete",
          })
        : null;
      for (const s of archive.segments)
        await db.insert("segments", {
          ...s,
          id: mapped(s.id),
          case_id: caseId,
          hearing_id: s.hearing_id ? mapped(s.hearing_id) : fallback!.id,
          origin: "imported",
          analysis_state: archive.findings.some((f) => f.segment_id === s.id)
            ? "complete"
            : "unavailable",
          analysis_error: null,
        });
      for (const f of archive.findings) {
        const review: Record<string, Json> = {};
        for (const key of [
          "summary",
          "analyst_summary",
          "legal_note",
          "retrieval",
        ])
          if (typeof f.review[key] === "string")
            review[key] = f.review[key].slice(0, 4000);
        for (const key of ["alternative_explanations", "missing_context"])
          if (Array.isArray(f.review[key]))
            review[key] = f.review[key]
              .filter((v): v is string => typeof v === "string")
              .slice(0, 20)
              .map((v) => v.slice(0, 2000));
        await db.insert("findings", {
          ...f,
          id: mapped(f.id),
          case_id: caseId,
          segment_id: mapped(f.segment_id),
          citations: f.citations.map((c) => ({
            ...c,
            chunk_id: mapped(c.chunk_id),
          })),
          mode: "imported",
          reviewed: false,
          legal: [],
          review,
        });
      }
      for (const l of archive.links)
        await db.insert("evidence_links", {
          ...l,
          id: mapped(l.id),
          case_id: caseId,
          source_id: mapped(l.source_id),
          target_id: mapped(l.target_id),
          basis: "imported",
          confirmed: false,
        });
      return record;
    });
  } catch (error) {
    for (const item of saved) await deleteFile(rt, item.key, item.storage);
    throw error;
  }
}
