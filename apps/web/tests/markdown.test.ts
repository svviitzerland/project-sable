import assert from "node:assert/strict";
import test from "node:test";
import { parseInline, parseMarkdown } from "../src/lib/markdown.ts";

test("assistant markdown becomes headings, lists and emphasis", () => {
  const blocks = parseMarkdown(
    [
      "Saya akan meringkas perkara.",
      "",
      "**Ringkasan Kasus:**",
      "",
      "1. **Pelaku dan Korban:**",
      "   - Terdakwa: Ferdi Sambo",
      "   - Korban: Yosua",
      "2. **Kejadian Utama:**",
      "",
      "## Hal yang belum pasti",
      "- Waktu *pasti* penembakan",
    ].join("\n"),
  );
  assert.deepEqual(
    blocks.map((b) => b.type),
    ["paragraph", "paragraph", "list", "heading", "list"],
  );
  const ordered = blocks[2];
  assert.ok(ordered.type === "list" && ordered.ordered);
  assert.equal(ordered.items.length, 2);
  assert.equal(ordered.items[0].children.length, 2);
  assert.deepEqual(ordered.items[0].content, [
    {
      type: "strong",
      children: [{ type: "text", text: "Pelaku dan Korban:" }],
    },
  ]);
  const bullets = blocks[4];
  assert.ok(bullets.type === "list" && !bullets.ordered);
  assert.deepEqual(bullets.items[0].content[1], {
    type: "em",
    children: [{ type: "text", text: "pasti" }],
  });
});

test("markup stays plain text and odd markers are left alone", () => {
  assert.deepEqual(parseInline("<script>alert(1)</script>"), [
    { type: "text", text: "<script>alert(1)</script>" },
  ]);
  assert.deepEqual(parseInline("file_name_v2 and 3 * 4"), [
    { type: "text", text: "file_name_v2 and 3 * 4" },
  ]);
  assert.deepEqual(parseInline("**tanpa penutup"), [
    { type: "text", text: "**tanpa penutup" },
  ]);
  assert.deepEqual(parseInline("pakai `kode`"), [
    { type: "text", text: "pakai " },
    { type: "code", text: "kode" },
  ]);
});
