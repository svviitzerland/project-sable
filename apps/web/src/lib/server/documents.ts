import { basename, extname } from "node:path";
import { unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";
import type { Runtime } from "./runtime";
import { hash, locked } from "./runtime";
import { uid } from "./database";
import type { Case } from "./contracts";
import { assert, HttpError } from "./errors";
import { saveFile, deleteFile } from "./providers";
import { cleanCourtPages, joinTextItems } from "./court-text";
// A full Direktori Putusan MA decision runs to several hundred pages (the 696-page
// 796/Pid.B/2022/PN Jkt.Sel is 4.2 MB and ~2.4 million characters).
export const MAX_BYTES = 25 * 1024 * 1024,
  MAX_PAGES = 1500,
  MAX_CHARS = 3_000_000;
const tooLong = `Document exceeds ${MAX_CHARS.toLocaleString("en")} extracted characters. Split it into smaller files.`;
export type Pages = [number, string][];
export const cleanName = (name: string) =>
  basename(name.replaceAll("\\", "/"))
    .replace(/[\x00-\x1f]/g, "")
    .slice(0, 200) || "document.txt";
export function decode(data: Uint8Array) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(data);
  } catch {
    throw new HttpError(422, "Use a UTF-8 text file.");
  }
}
export async function extractPages(
  name: string,
  data: Uint8Array,
): Promise<{ pages: Pages; mime: string }> {
  let pages: Pages = [],
    mime = "text/plain";
  try {
    switch (extname(name).toLowerCase()) {
      case ".pdf": {
        const canvas = await import("@napi-rs/canvas");
        for (const name of ["DOMMatrix", "ImageData", "Path2D"] as const) {
          if (!(name in globalThis))
            Object.defineProperty(globalThis, name, {
              value: canvas[name],
              configurable: true,
            });
        }
        // Static imports keep PDF.js's worker and native polyfills in the server bundle.
        await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
        const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
        const task = getDocument({
          data: new Uint8Array(data),
          useSystemFonts: true,
        });
        const pdf = await task.promise;
        try {
          assert(
            pdf.numPages <= MAX_PAGES,
            422,
            `Use an unencrypted PDF with at most ${MAX_PAGES} pages.`,
          );
          let total = 0;
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const text = joinTextItems(content.items);
            total += text.length;
            assert(total <= MAX_CHARS * 1.5, 422, tooLong);
            pages.push([i, text]);
            page.cleanup();
            // Release cached fonts and page objects so long decisions stay bounded.
            if (i % 50 === 0) await pdf.cleanup();
          }
        } finally {
          await task.destroy();
        }
        mime = "application/pdf";
        break;
      }
      case ".docx": {
        const files = unzipSync(data, {
          filter: (file) => {
            if (file.name !== "word/document.xml") return false;
            assert(
              file.originalSize <= 40_000_000,
              422,
              "Document is too large after decompression.",
            );
            return true;
          },
        });
        assert(
          files["word/document.xml"],
          422,
          "This DOCX has no document text.",
        );
        const xml = decode(files["word/document.xml"]);
        assert(
          !/<!DOCTYPE|<!ENTITY/i.test(xml),
          422,
          "Document XML entities are unsupported.",
        );
        const parser = new XMLParser({
          ignoreAttributes: true,
          preserveOrder: true,
          processEntities: true,
          trimValues: false,
        });
        const parsed = parser.parse(xml) as Record<string, unknown>[];
        const paragraphs: string[] = [];
        const content = (nodes: unknown): string =>
          Array.isArray(nodes)
            ? nodes
                .map((node) =>
                  Object.entries(node)
                    .map(([key, value]) =>
                      key === "#text"
                        ? String(value)
                        : key === "w:tab"
                          ? "\t"
                          : key === "w:br"
                            ? "\n"
                            : content(value),
                    )
                    .join(""),
                )
                .join("")
            : "";
        const walk = (nodes: unknown) => {
          if (Array.isArray(nodes))
            for (const node of nodes)
              for (const [key, value] of Object.entries(node)) {
                if (key === "w:p") paragraphs.push(content(value));
                else walk(value);
              }
        };
        walk(parsed);
        pages = [[1, paragraphs.join("\n")]];
        mime =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        break;
      }
      case ".txt":
      case ".md":
        pages = decode(data)
          .split("\f")
          .map((text, i) => [i + 1, text]);
        break;
      default:
        throw new HttpError(422, "Upload PDF, DOCX, TXT, or Markdown files.");
    }
    // Direktori Putusan MA watermark/header/footer noise is removed from every format;
    // PDF line spacing is also normalized. Raw extraction may exceed the limit by the
    // noise it carries, so the limit applies to the cleaned text.
    pages = cleanCourtPages(
      pages.map(([p, text]) => [p, text.replaceAll("\x00", "")]),
      { tidy: mime === "application/pdf" },
    );
    assert(
      pages.reduce((n, p) => n + p[1].length, 0) <= MAX_CHARS,
      422,
      tooLong,
    );
    assert(
      pages.some((p) => p[1].trim()),
      422,
      "No readable text found. Scanned PDFs need OCR before upload.",
    );
    return {
      pages: pages.map(([p, text]) => [p, text.trim()]),
      mime,
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      422,
      "This document could not be read. Export an unencrypted text-based PDF or UTF-8 text file.",
    );
  }
}
export function chunkPages(pages: Pages) {
  const chunks: Pages = [];
  for (const [page, content] of pages)
    for (let start = 0; start < content.length; start += 1200) {
      const text = content.slice(start, start + 1450).trim();
      if (text) chunks.push([page, text]);
    }
  return chunks;
}
export async function ingest(
  rt: Runtime,
  record: Case,
  filename: string,
  data: Uint8Array,
  extracted?: { pages: Pages; mime: string },
) {
  return locked(rt, `documents:${record.id}`, async () => {
    assert(
      data.length > 0 && data.length <= MAX_BYTES,
      413,
      `Upload a non-empty file up to ${MAX_BYTES / 1024 / 1024} MB.`,
    );
    const name = cleanName(filename),
      digest = hash(data);
    const existing = await rt.db.one("documents", "case_id=? AND digest=?", [
      record.id,
      digest,
    ]);
    if (existing) return existing;
    assert(
      (await rt.db.all("documents", "case_id=?", [record.id])).length < 40,
      422,
      "This MVP supports up to 40 documents per case.",
    );
    const { pages, mime } = extracted || (await extractPages(name, data)),
      slices = chunkPages(pages);
    const id = uid(),
      key = `${record.owner_id}/${record.id}/${id}${extname(name).toLowerCase()}`,
      storage = await saveFile(rt, key, data, mime);
    try {
      return await rt.db.transaction(async (db) => {
        const doc = await db.insert("documents", {
          id,
          case_id: record.id,
          name,
          mime,
          storage_key: key,
          storage,
          digest,
          pages: pages.length,
        });
        for (const [page, text] of slices)
          await db.insert("chunks", {
            case_id: record.id,
            document_id: id,
            page,
            text,
            section:
              extname(name).toLowerCase() === ".docx" ? "Text section" : "",
          });
        return doc;
      });
    } catch (error) {
      await deleteFile(rt, key, storage);
      throw error;
    }
  });
}
