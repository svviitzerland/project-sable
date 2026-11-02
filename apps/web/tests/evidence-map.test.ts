import assert from "node:assert/strict";
import { test } from "node:test";
import {
  arcPath,
  crossPath,
  layoutEvidenceMap,
  type MapEdge,
  type MapNode,
} from "../src/lib/evidence-map";

const sizes = { row: 48, groupHead: 36, groupGap: 16 };

// Synthetic dense case: one long document name repeated on every passage.
const longName =
  "Putusan 796-Pid.B-2022-PN Jkt.Sel - kutipan hal. asli 202-214.pdf";
const passages: MapNode[] = Array.from({ length: 40 }, (_, i) => ({
  id: `p${i}`,
  kind: "passage",
  label: i < 30 ? longName : "sidang-bagian-1.txt",
  document_id: i < 30 ? "d1" : "d2",
  page: 40 - i,
}));
const statements: MapNode[] = Array.from({ length: 30 }, (_, i) => ({
  id: `s${i}`,
  kind: "statement",
  label: `Saksi ${i}`,
}));
const edges: MapEdge[] = [
  ...statements.map((s, i) => ({
    id: `e${i}`,
    source_id: s.id,
    target_id: `p${i % 12}`,
  })),
  { id: "arc", source_id: "p31", target_id: "p2" },
];

function assertNoOverlap(tops: number[], row: number) {
  const sorted = tops.toSorted((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++)
    assert.ok(sorted[i] - sorted[i - 1] >= row, `rows overlap at ${sorted[i]}`);
}

test("evidence map rows never overlap, even when dense", () => {
  const layout = layoutEvidenceMap([...passages, ...statements], edges, sizes);
  assertNoOverlap(
    layout.statements.map((s) => s.top),
    sizes.row,
  );
  const passageTops = layout.groups.flatMap((g) => g.rows.map((r) => r.top));
  assertNoOverlap(passageTops, sizes.row);
  for (const g of layout.groups)
    for (const r of g.rows) assert.ok(r.top >= g.top + sizes.groupHead);
  for (const s of layout.statements) {
    assert.ok(s.top >= 0);
    assert.ok(s.top + sizes.row <= layout.height);
  }
});

test("passages group under their document once, sorted by page, cited documents first", () => {
  const layout = layoutEvidenceMap([...passages, ...statements], edges, sizes);
  assert.deepEqual(
    layout.groups.map((g) => g.id),
    ["d1", "d2"],
  );
  const pages = layout.groups[0].rows.map((r) => r.node.page!);
  assert.deepEqual(
    pages,
    pages.toSorted((a, b) => a - b),
  );
  // Only connected passages are drawn; the rest are counted for the caption.
  assert.equal(layout.groups.flatMap((g) => g.rows).length, 13);
  assert.equal(layout.unlinked, 27);
  assert.equal(layout.cross.length, 30);
  assert.deepEqual(
    layout.arcs.map((e) => e.id),
    ["arc"],
  );
  assert.ok(layout.ports.arc.has("p31") && !layout.ports.arc.has("p0"));
});

test("an unconnected case still draws its passages, and paths stay inside the gutter", () => {
  const layout = layoutEvidenceMap(passages.slice(0, 3), [], sizes);
  assert.equal(layout.groups[0].rows.length, 3);
  assert.equal(layout.unlinked, 0);
  const linked = layoutEvidenceMap([...passages, ...statements], edges, sizes);
  const reversed = { id: "r", source_id: "p0", target_id: "s0" };
  assert.match(crossPath(linked, reversed), /^M0 [\d.]+ C50 .* 100 [\d.]+$/);
  assert.equal(
    crossPath(linked, reversed).split(" ")[1],
    String(linked.y.get("s0")),
  );
  assert.match(arcPath(linked, edges.at(-1)!), /^M0 .* 0 [\d.]+$/);
});
