/**
 * Structured evidence map layout: hearing statements in a left column,
 * document passages in a right column grouped under their document and sorted
 * by page. Every row has one fixed height, so labels cannot collide at any
 * density. Statement–passage links become curves between the columns, and
 * passage–passage links become arcs along the right edge.
 */
export type MapNode = {
  id: string;
  kind: "passage" | "statement";
  label: string;
  document_id?: string;
  page?: number;
};

export type MapEdge = { id: string; source_id: string; target_id: string };

export type MapSizes = { row: number; groupHead: number; groupGap: number };

export type MapLayout<N extends MapNode, E extends MapEdge> = {
  groups: {
    id: string;
    name: string;
    top: number;
    rows: { node: N; top: number }[];
  }[];
  statements: { node: N; top: number }[];
  height: number;
  /** Vertical centre of each drawn row. */
  y: ReadonlyMap<string, number>;
  cross: E[];
  arcs: E[];
  statementIds: ReadonlySet<string>;
  /** Ids with a curve (cross) or arc attached, so only real ports are drawn. */
  ports: { cross: ReadonlySet<string>; arc: ReadonlySet<string> };
  /** The longest arc, used to nest arcs by span. */
  span: number;
  /** Passages without any connection, left out of the drawing. */
  unlinked: number;
};

const documentKey = (n: MapNode) => n.document_id ?? n.label;

export function layoutEvidenceMap<N extends MapNode, E extends MapEdge>(
  nodes: N[],
  edges: E[],
  sizes: MapSizes,
): MapLayout<N, E> {
  const { row, groupHead, groupGap } = sizes;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const valid = edges.filter(
    (e) => byId.has(e.source_id) && byId.has(e.target_id),
  );
  const linked = new Set(valid.flatMap((e) => [e.source_id, e.target_id]));
  // With no connections yet, show every passage so the map is never blank.
  const drawn = nodes.filter((n) =>
    linked.size ? linked.has(n.id) : n.kind === "passage",
  );
  const unlinked = linked.size
    ? nodes.filter((n) => n.kind === "passage" && !linked.has(n.id)).length
    : 0;

  const byDocument = new Map<string, N[]>();
  for (const n of drawn) {
    if (n.kind !== "passage") continue;
    const key = documentKey(n);
    byDocument.set(key, [...(byDocument.get(key) ?? []), n]);
  }
  // Documents cited by hearing statements come first, so most curves stay short.
  const cited = new Map<string, number>();
  for (const e of valid) {
    const a = byId.get(e.source_id)!;
    const b = byId.get(e.target_id)!;
    if (a.kind === b.kind) continue;
    const key = documentKey(a.kind === "passage" ? a : b);
    cited.set(key, (cited.get(key) ?? 0) + 1);
  }
  const documents = [...byDocument].toSorted(
    ([a, x], [b, z]) =>
      (cited.get(b) ?? 0) - (cited.get(a) ?? 0) ||
      x[0].label.localeCompare(z[0].label),
  );

  const y = new Map<string, number>();
  const groups: MapLayout<N, E>["groups"] = [];
  let cursor = 0;
  for (const [id, items] of documents) {
    const top = cursor;
    cursor += groupHead;
    const rows = items
      .map((node, index) => ({ node, index }))
      .toSorted(
        (a, b) => (a.node.page ?? 0) - (b.node.page ?? 0) || a.index - b.index,
      )
      .map(({ node }) => {
        const placed = { node, top: cursor };
        y.set(node.id, cursor + row / 2);
        cursor += row;
        return placed;
      });
    groups.push({ id, name: items[0].label, top, rows });
    cursor += groupGap;
  }
  const passageHeight = Math.max(0, cursor - groupGap);

  // Statements sit level with the passages they cite, pushed apart by whole rows.
  const statements = drawn
    .filter((n) => n.kind === "statement")
    .map((node, index) => {
      const ends = valid
        .filter((e) => e.source_id === node.id || e.target_id === node.id)
        .map((e) => y.get(e.source_id === node.id ? e.target_id : e.source_id))
        .filter((v): v is number => v !== undefined);
      const centre = ends.length
        ? ends.reduce((a, b) => a + b, 0) / ends.length
        : passageHeight;
      return { node, index, desired: centre - row / 2, top: 0 };
    })
    .toSorted((a, b) => a.desired - b.desired || a.index - b.index);
  const height = Math.max(passageHeight, statements.length * row);
  let previous = -row;
  for (const s of statements) {
    s.top = Math.max(s.desired, previous + row, 0);
    previous = s.top;
  }
  let next = height;
  for (const s of statements.toReversed()) {
    s.top = Math.min(s.top, next - row);
    next = s.top;
  }
  for (const s of statements) y.set(s.node.id, s.top + row / 2);

  const cross: E[] = [];
  const arcs: E[] = [];
  for (const e of valid) {
    if (!y.has(e.source_id) || !y.has(e.target_id)) continue;
    const same = byId.get(e.source_id)!.kind === byId.get(e.target_id)!.kind;
    (same ? arcs : cross).push(e);
  }
  const span = Math.max(
    1,
    ...arcs.map((e) => Math.abs(y.get(e.source_id)! - y.get(e.target_id)!)),
  );
  return {
    groups,
    statements: statements.map(({ node, top }) => ({ node, top })),
    height,
    y,
    cross,
    arcs,
    statementIds: new Set(statements.map((s) => s.node.id)),
    ports: {
      cross: new Set(cross.flatMap((e) => [e.source_id, e.target_id])),
      arc: new Set(arcs.flatMap((e) => [e.source_id, e.target_id])),
    },
    span,
    unlinked,
  };
}

/** A curve across the gutter, in a 100-unit-wide viewBox; statements on the left. */
export function crossPath(layout: MapLayout<MapNode, MapEdge>, edge: MapEdge) {
  const left = layout.statementIds.has(edge.source_id)
    ? edge.source_id
    : edge.target_id;
  const right = left === edge.source_id ? edge.target_id : edge.source_id;
  const y1 = layout.y.get(left)!;
  const y2 = layout.y.get(right)!;
  return `M0 ${y1} C50 ${y1} 50 ${y2} 100 ${y2}`;
}

/** An arc along the right edge; wider spans reach further out, so arcs nest. */
export function arcPath(layout: MapLayout<MapNode, MapEdge>, edge: MapEdge) {
  const y1 = layout.y.get(edge.source_id)!;
  const y2 = layout.y.get(edge.target_id)!;
  const reach = 20 + (108 * Math.abs(y2 - y1)) / layout.span;
  return `M0 ${y1} C${reach} ${y1} ${reach} ${y2} 0 ${y2}`;
}
