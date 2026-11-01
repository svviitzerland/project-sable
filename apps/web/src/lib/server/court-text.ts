/**
 * Text cleanup for decisions downloaded from the Direktori Putusan Mahkamah Agung
 * (putusan3.mahkamahagung.go.id), the format Indonesian lawyers usually receive.
 *
 * Every page of those PDFs carries a rotated "Direktori Putusan Mahkamah Agung Republik
 * Indonesia" watermark (which extracts as 1–20 letter fragments such as "ub", "ep", "R"),
 * a "putusan.mahkamahagung.go.id" header, a "Hal. X dari Y hal. Putusan Nomor ..." line
 * and a five-line "Disclaimer ... Kepaniteraan Mahkamah Agung ..." footer. None of it is
 * part of the decision, and it breaks retrieval and quote matching between pages.
 *
 * Only extracted text is cleaned; the stored original file is never modified.
 */
export const WATERMARK = "Direktori Putusan Mahkamah Agung Republik Indonesia";
const COMPACT_WATERMARK = WATERMARK.replace(/\s+/g, "");

/** Whether `text` is a non-empty fragment of the MA watermark phrase (spaces ignored). */
export function isWatermarkFragment(text: string) {
  const compact = text.replace(/\s+/g, "");
  return compact.length > 0 && COMPACT_WATERMARK.includes(compact);
}

/** Whether the text looks like a decision exported by the Direktori Putusan MA. */
export function isDirectoryDecision(text: string) {
  return /putusan\.mahkamahagung\.go\.id|Direktori Putusan Mahkamah Agung|Kepaniteraan Mahkamah Agung Republik Indonesia berusaha/i.test(
    text,
  );
}

const DISCLAIMER = [
  /^Disclaimer$/i,
  /^Kepaniteraan Mahkamah Agung Republik Indonesia berusaha untuk selalu\b/i,
  /^pelaksanaan fungsi peradilan\. Namun dalam hal-hal tertentu\b/i,
  /^Dalam hal Anda menemukan inakurasi informasi\b/i,
  /^Email\s*:\s*kepaniteraan@mahkamahagung\.go\.id\b/i,
];
const URL_PREFIX = /^putusan\.mahkamahagung\.go\.id\b\s*/i;
// "Hal. 2 dari 696 hal. Putusan Nomor 796/Pid.B/2022/PN Jkt.Sel." and "Halaman 2 dari 9".
const PAGE_LINE =
  /^Hal(?:aman|\.)?\s*\d+\s*dari\s*\d+(?:\s*hal(?:aman|\.)?)?\.?(?:\s*(?:Putusan\s+)?Nomor\b.*)?$/i;
const PAGE_NUMBER = /^Halaman\s+\d+$/i;
// Layout-mode text (e.g. pdftotext -layout) leaves watermark letters beside body text,
// separated from it by a wide run of spaces.
const LEADING_FRAGMENT = /^(\S{1,6}(?: \S{1,3})?)[ \t]{3,}/;
const TRAILING_FRAGMENT = /[ \t]{3,}(\S{1,6}(?: \S{1,3})?)[ \t]*$/;

function stripLayoutFragments(line: string) {
  for (let changed = true; changed; ) {
    changed = false;
    const lead = LEADING_FRAGMENT.exec(line);
    if (lead && isWatermarkFragment(lead[1])) {
      line = line.slice(lead[0].length);
      changed = true;
    }
    const trail = TRAILING_FRAGMENT.exec(line);
    if (trail && isWatermarkFragment(trail[1])) {
      line = line.slice(0, trail.index);
      changed = true;
    }
  }
  return line;
}

/** Collapse horizontal whitespace, trim lines and keep at most one blank line in a row. */
export function tidyText(text: string) {
  return text
    .replaceAll("\r\n", "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t\u00a0]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Remove Direktori Putusan MA watermark, header and footer lines from one page. */
export function cleanDirectoryPage(text: string) {
  const kept: string[] = [];
  for (const raw of text.replaceAll("\r\n", "\n").split("\n")) {
    let line = stripLayoutFragments(raw)
      .replace(/[ \t\u00a0]+/g, " ")
      .trim();
    if (URL_PREFIX.test(line)) line = line.replace(URL_PREFIX, "");
    if (
      line &&
      (isWatermarkFragment(line) ||
        PAGE_LINE.test(line) ||
        PAGE_NUMBER.test(line) ||
        DISCLAIMER.some((pattern) => pattern.test(line)))
    )
      continue;
    kept.push(line);
  }
  return tidyText(kept.join("\n"));
}

/** Clean every page when the document is a Direktori Putusan MA export; otherwise tidy only. */
export function cleanCourtPages<T extends [number, string]>(
  pages: T[],
  { tidy = true } = {},
): T[] {
  const directory = pages.some(([, text]) => isDirectoryDecision(text));
  if (!directory && !tidy) return pages;
  return pages.map(
    ([page, text]) =>
      [page, directory ? cleanDirectoryPage(text) : tidyText(text)] as T,
  );
}

type TextItem = {
  str: string;
  hasEOL?: boolean;
  transform?: number[];
  width?: number;
};

/**
 * Join PDF.js text items by position. PDF.js splits words at font changes ("p" + "ada"),
 * so a space is added only where the items are visibly apart. Rotated MA watermark
 * fragments are dropped.
 */
export function joinTextItems(items: readonly (TextItem | object)[]) {
  let out = "",
    prev: { end: number; y: number } | null = null;
  for (const raw of items) {
    if (!("str" in raw)) continue;
    const item = raw as TextItem,
      [a = 1, b = 0, c = 0, , x = 0, y = 0] = item.transform || [],
      rotated = Math.abs(b) > 1e-3 || Math.abs(c) > 1e-3;
    if (rotated && (!item.str.trim() || isWatermarkFragment(item.str))) {
      if (item.hasEOL && out && !out.endsWith("\n")) out += "\n";
      prev = null;
      continue;
    }
    if (item.str) {
      if (out && !/\s$/.test(out) && !/^\s/.test(item.str)) {
        const size = Math.abs(a) || 1;
        const adjacent =
          prev &&
          !rotated &&
          Math.abs(y - prev.y) < size * 0.5 &&
          x - prev.end < size * 0.12 &&
          x - prev.end > -size * 0.5;
        if (!adjacent) out += " ";
      }
      out += item.str;
      prev = rotated ? null : { end: x + (item.width || 0), y };
    }
    if (item.hasEOL) {
      out += "\n";
      prev = null;
    }
  }
  return out;
}
