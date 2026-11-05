<script lang="ts">
  import { ArrowLeft, Maximize2, Minus, Plus, Search } from "@lucide/svelte";
  import { untrack } from "svelte";
  import { idOf, kindOf, relations, whereOf, type EvidenceKind, type Pairing } from "../lib/evidence.svelte";
  import { fmtClock, l, t } from "../lib/i18n";
  import type { Kind } from "../lib/kinds";
  import { PanZoom, type Bounds } from "../lib/panzoom.svelte";
  import { shortName } from "../lib/people";
  import { go } from "../lib/router.svelte";
  import { docsOf, finding, findingsOfCase, hearingsOf, passage, passagesOf, speaker, speakerName, statement, statementsOf } from "../lib/store.svelte";
  import type { Relation, Status } from "../lib/types";
  import KindIcon from "./KindIcon.svelte";

  /**
   * Keterkaitan's map. All of the case's evidence by type: a column for each hearing (its lines,
   * in order), one for the findings, one for each document (its passages, in order). A line joins
   * each pairing, in the relation's colour, solid once confirmed and dashed while it is Jude's
   * suggestion. Evidence without a pairing stays a thin tick, so a column keeps the shape of its
   * hearing or document. Choosing a piece of evidence gathers its group: everything its pairings
   * reach glides together (lines, then findings, then passages) while the rest fades, and the
   * camera follows. Zooming is semantic: far out a face and a time or a page, closer who or where
   * and a line of the words, close up two lines.
   */
  let {
    caseId,
    selected,
    pairings,
    members,
    picked,
    hidden = $bindable([]),
    onpick,
  }: {
    caseId: string;
    selected?: string;
    pairings: Pairing[];
    members: Set<string>;
    picked: string[];
    hidden?: Relation[];
    onpick: () => void;
  } = $props();

  const COL_W = 188;
  const COL_W_QUIET = 84;
  const COL_GAP = 26;
  const GROUP_GAP = 96;
  const PAD = 32;
  const TOP = 18;
  const FULL_H = 68;
  const THIN_H = 14;
  const FULL_GAP = 10;
  const THIN_GAP = 4;
  const GROUP_COL_GAP = 64;
  const GROUP_ROW_GAP = 18;
  const GROUP_SIDE_GAP = 24;
  const GROUP_BAND_GAP = 76;
  const HEAD_H = 58;
  const MID = 0.7;
  const NEAR = 0.9;
  const motionOk = typeof matchMedia === "function" && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const statusRelation: Record<Status, Relation> = {
    potential_inconsistency: "conflicts",
    context_needed: "context",
    supported: "supports",
    insufficient_evidence: "related",
  };

  interface Cell {
    key: string;
    kind: EvidenceKind;
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    full: boolean;
    order: number;
  }
  interface Column {
    key: string;
    kind: "hearing" | "findings" | "document";
    id: string;
    x: number;
    w: number;
    name: string;
    short: string;
    live: boolean;
    count: number;
    cells: Cell[];
  }
  interface Pose {
    x: number;
    y: number;
    w: number;
    h: number;
    o: number;
  }

  let grouped = $derived(picked.length > 0);
  let linked = $derived(new Set(pairings.flatMap((p) => [p.a, p.b])));
  let shown = $derived(pairings.filter((p) => !hidden.includes(p.relation)));
  let relCounts = $derived(relations.map((r) => ({ r, n: pairings.filter((p) => p.relation === r).length })).filter((x) => x.n > 0));
  let shownBy = $derived.by(() => {
    const m = new Map<string, Pairing[]>();
    for (const p of shown) for (const k of [p.a, p.b]) m.set(k, [...(m.get(k) ?? []), p]);
    return m;
  });
  const strongest = (list: Pairing[] | undefined) => (list?.length ? relations.find((r) => list.some((p) => p.relation === r)) : undefined);

  // The overview: hearings, then findings, then documents, each in its own order.
  let layout = $derived.by(() => {
    const columns: Column[] = [];
    const cells = new Map<string, Cell>();
    let x = PAD;
    let bottom = TOP;
    let order = 0;
    const place = (kind: Column["kind"], id: string, name: string, short: string, live: boolean, items: { kind: EvidenceKind; id: string }[]) => {
      const keys = items.map((it) => `${it.kind}:${it.id}`);
      const w = keys.some((k) => linked.has(k)) ? COL_W : COL_W_QUIET;
      const col: Column = { key: `${kind}:${id}`, kind, id, x, w, name, short, live, count: 0, cells: [] };
      let y = TOP;
      items.forEach((it, i) => {
        const full = linked.has(keys[i]);
        const cell: Cell = { key: keys[i], kind: it.kind, id: it.id, x, y, w, h: full ? FULL_H : THIN_H, full, order: order++ };
        col.cells.push(cell);
        cells.set(cell.key, cell);
        y += cell.h + (full ? FULL_GAP : THIN_GAP);
      });
      const own = new Set(keys);
      col.count = pairings.filter((p) => own.has(p.a) || own.has(p.b)).length;
      columns.push(col);
      bottom = Math.max(bottom, y);
      x += w + COL_GAP;
    };
    const hearings = hearingsOf(caseId);
    for (const h of hearings) {
      place("hearing", h.id, t("common.hearingN", { n: h.number }), String(h.number), h.mode === "live", statementsOf(h.id).map((s) => ({ kind: "statement" as const, id: s.id })));
    }
    const found = findingsOfCase(caseId);
    if (found.length) {
      if (columns.length) x += GROUP_GAP - COL_GAP;
      place("findings", "all", t("nav.findings"), "", false, found.map((f) => ({ kind: "finding" as const, id: f.id })));
    }
    const docs = docsOf(caseId);
    if (columns.length && docs.length) x += GROUP_GAP - COL_GAP;
    for (const d of docs) place("document", d.id, d.title, "", false, passagesOf(d.id).map((p) => ({ kind: "passage" as const, id: p.id })));
    return { columns, cells, width: Math.max(x - COL_GAP + PAD, 1), height: bottom + PAD };
  });

  // The group: its evidence by kind (lines, findings, passages) around where it sits on the
  // overview, as columns or as rows, whichever this view shows larger.
  function arrange(bands: Cell[][], rows: boolean, cx: number, cy: number) {
    const poses = new Map<string, Pose>();
    const heads: { kind: EvidenceKind; x: number; y: number; n: number }[] = [];
    if (rows) {
      const tall = bands.length * FULL_H + (bands.length - 1) * GROUP_BAND_GAP;
      bands.forEach((band, i) => {
        const wide = band.length * COL_W + (band.length - 1) * GROUP_SIDE_GAP;
        const y = cy - tall / 2 + i * (FULL_H + GROUP_BAND_GAP);
        band.forEach((c, j) => poses.set(c.key, { x: cx - wide / 2 + j * (COL_W + GROUP_SIDE_GAP), y, w: COL_W, h: FULL_H, o: 1 }));
        heads.push({ kind: band[0].kind, x: cx - wide / 2, y, n: band.length });
      });
    } else {
      bands.forEach((band, i) => {
        const x = cx + (i - (bands.length - 1) / 2) * (COL_W + GROUP_COL_GAP) - COL_W / 2;
        const tall = band.length * FULL_H + (band.length - 1) * GROUP_ROW_GAP;
        band.forEach((c, j) => poses.set(c.key, { x, y: cy - tall / 2 + j * (FULL_H + GROUP_ROW_GAP), w: COL_W, h: FULL_H, o: 1 }));
        heads.push({ kind: band[0].kind, x, y: cy - tall / 2, n: band.length });
      });
    }
    const all = [...poses.values()];
    const bounds: Bounds = {
      x0: Math.min(...all.map((p) => p.x)) - 24,
      y0: Math.min(...all.map((p) => p.y)) - 52,
      x1: Math.max(...all.map((p) => p.x + p.w)) + 24,
      y1: Math.max(...all.map((p) => p.y + p.h)) + 24,
    };
    return { poses, heads, bounds, rows };
  }
  let gathered = $derived.by(() => {
    if (!grouped) return null;
    const cells = [...members].map((k) => layout.cells.get(k)).filter((c): c is Cell => !!c).sort((a, b) => a.order - b.order);
    if (!cells.length) return null;
    const kinds: EvidenceKind[] = ["statement", "finding", "passage"];
    const bands = kinds.map((k) => cells.filter((c) => c.kind === k)).filter((c) => c.length);
    // Each band after the first follows where its pairings point (the mean place of its partners
    // in the bands before it), so lines run straight rather than across one another.
    const place = new Map(bands[0].map((c, i) => [c.key, i]));
    for (const band of bands.slice(1)) {
      const at = (c: Cell) => {
        const ps = pairings.flatMap((pr) => (pr.a === c.key ? [pr.b] : pr.b === c.key ? [pr.a] : [])).map((k) => place.get(k)).filter((i): i is number => i !== undefined);
        return ps.length ? ps.reduce((x, y) => x + y, 0) / ps.length : Infinity;
      };
      band.sort((a, b) => at(a) - at(b) || a.order - b.order);
      band.forEach((c, i) => place.set(c.key, i));
    }
    const cx = (Math.min(...cells.map((c) => c.x)) + Math.max(...cells.map((c) => c.x + c.w))) / 2;
    const cy = (Math.min(...cells.map((c) => c.y)) + Math.max(...cells.map((c) => c.y + c.h))) / 2;
    const cols = arrange(bands, false, cx, cy);
    const rows = arrange(bands, true, cx, cy);
    const fit = (b: Bounds) => Math.min((pz.vw - 56) / (b.x1 - b.x0), (pz.vh - 56) / (b.y1 - b.y0));
    return fit(rows.bounds) > fit(cols.bounds) * 1.05 ? rows : cols;
  });

  // Where every cell should be: on the overview, or gathered (the rest fade where they are).
  let targets = $derived.by(() => {
    const out = new Map<string, Pose>();
    for (const c of layout.cells.values()) {
      const g = gathered?.poses.get(c.key);
      out.set(c.key, g ?? { x: c.x, y: c.y, w: c.w, h: c.h, o: gathered ? 0 : 1 });
    }
    return out;
  });

  // Cells glide from wherever they are to their targets; a change mid-way starts from there.
  let from = $state.raw(new Map<string, Pose>());
  let to = $state.raw(new Map<string, Pose>());
  let p = $state(1);
  let tween = 0;
  const ease = (x: number) => 1 - (1 - x) ** 3;
  function poseOf(key: string): Pose | undefined {
    const b = to.get(key);
    const a = from.get(key);
    if (!b || !a || p >= 1) return b;
    const e = ease(p);
    return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, w: a.w + (b.w - a.w) * e, h: a.h + (b.h - a.h) * e, o: a.o + (b.o - a.o) * e };
  }
  $effect(() => {
    const next = targets;
    untrack(() => {
      const now = new Map<string, Pose>();
      for (const k of next.keys()) {
        const cur = poseOf(k);
        if (cur) now.set(k, cur);
      }
      cancelAnimationFrame(tween);
      from = now;
      to = next;
      if (!motionOk || !now.size) {
        p = 1;
        return;
      }
      p = 0;
      const t0 = performance.now();
      const step = (time: number) => {
        p = Math.min(1, (time - t0) / 640);
        if (p < 1) tween = requestAnimationFrame(step);
      };
      tween = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(tween);
  });

  const pz = new PanZoom({ top: HEAD_H });
  $effect(() => {
    pz.top = grouped ? 0 : HEAD_H;
  });
  let zoom = $derived(pz.k < MID ? "far" : pz.k < NEAR ? "mid" : "near");

  function overview() {
    const f = pz.frame({ x0: 0, y0: 0, x1: layout.width, y1: layout.height }, pz.vw < 600 ? 0.3 : 0.2, 1);
    if (layout.width * f.k > pz.vw - 16) f.x = 0;
    if (layout.height * f.k > pz.vh - HEAD_H - 16) f.y = HEAD_H;
    return f;
  }
  const showAll = () => pz.flyTo(grouped && gathered ? pz.frame(gathered.bounds, 0.3, 1.2) : overview());

  // The camera follows the selection: the gathered group, or the whole case.
  $effect(() => {
    const key = selected;
    if (!pz.vw || !pz.vh) return;
    untrack(() => {
      void key;
      pz.flyTo(gathered ? pz.frame(gathered.bounds, 0.3, 1.2) : overview(), 640);
    });
  });

  let view: HTMLElement | undefined = $state();
  $effect(() => {
    if (!view) return;
    return pz.attach(view, { ignore: ".heads", noZoom: ".cell, .heads", onpan: () => (hovered = null) });
  });

  /** A pairing's line leaves from the sides the two cards face each other with. */
  function path(pr: Pairing) {
    const a = poseOf(pr.a);
    const b = poseOf(pr.b);
    if (!a || !b) return "";
    const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (overlapX > 0 && overlapY <= 0) {
      const [u, v] = a.y <= b.y ? [a, b] : [b, a];
      // Neighbours one above the other: straight down.
      if (v.y - (u.y + u.h) < FULL_H * 2) {
        const x = (Math.max(u.x, v.x) + Math.min(u.x + u.w, v.x + v.w)) / 2;
        return `M${x},${u.y + u.h} L${x},${v.y}`;
      }
      // Further apart: a bow on the outer side, clear of the cards between them.
      const uy = u.y + u.h / 2;
      const vy = v.y + v.h / 2;
      const bow = 44 + Math.abs(vy - uy) * 0.18;
      const outLeft = !!gathered && u.x + u.w / 2 < (gathered.bounds.x0 + gathered.bounds.x1) / 2;
      if (outLeft) {
        const sx = Math.min(u.x, v.x);
        return `M${u.x},${uy} C${sx - bow},${uy} ${sx - bow},${vy} ${v.x},${vy}`;
      }
      const sx = Math.max(u.x + u.w, v.x + v.w);
      return `M${u.x + u.w},${uy} C${sx + bow},${uy} ${sx + bow},${vy} ${v.x + v.w},${vy}`;
    }
    if (-overlapX >= -overlapY) {
      const [l, r] = a.x <= b.x ? [a, b] : [b, a];
      const ly = l.y + l.h / 2;
      const ry = r.y + r.h / 2;
      const sx = l.x + l.w;
      const dx = Math.max(36, (r.x - sx) * 0.5);
      return `M${sx},${ly} C${sx + dx},${ly} ${r.x - dx},${ry} ${r.x},${ry}`;
    }
    const [u, v] = a.y <= b.y ? [a, b] : [b, a];
    const ux = u.x + u.w / 2;
    const vx = v.x + v.w / 2;
    const sy = u.y + u.h;
    const dy = Math.max(30, (v.y - sy) * 0.5);
    return `M${ux},${sy} C${ux},${sy + dy} ${vx},${v.y - dy} ${vx},${v.y}`;
  }
  const seen = (pr: Pairing) => Math.min(poseOf(pr.a)?.o ?? 0, poseOf(pr.b)?.o ?? 0);

  function describe(c: Cell) {
    if (c.kind === "statement") {
      const s = statement(c.id);
      const sp = speaker(s?.speakerId ?? "");
      return { meta: s ? `${shortName(sp) || speakerName(sp)} · ${fmtClock(s.t)}` : "", glyph: s ? fmtClock(s.t) : "", text: s?.text ?? "", speakerId: s?.speakerId, icon: "statement" as Kind };
    }
    if (c.kind === "passage") {
      const pa = passage(c.id);
      return { meta: pa ? t("common.page", { n: pa.page }) : "", glyph: pa ? t("common.page", { n: pa.page }) : "", text: pa?.text ?? "", speakerId: undefined, icon: "passage" as Kind };
    }
    const f = finding(c.id);
    const s = f ? statement(f.statementId) : undefined;
    return { meta: f ? t(`status.${f.status}`) : "", glyph: s ? fmtClock(s.t) : "", text: l(f?.title), speakerId: undefined, icon: "finding" as Kind };
  }
  function relOf(c: Cell): Relation | undefined {
    if (c.kind === "finding") {
      const f = finding(c.id);
      return f ? statusRelation[f.status] : undefined;
    }
    return c.full || grouped ? strongest(shownBy.get(c.key)) : undefined;
  }
  function label(c: Cell) {
    const n = shownBy.get(c.key)?.length ?? 0;
    return `${whereOf(c.key)}: ${describe(c).text}${n ? ` · ${t("cx.map.count", { n })}` : ""}`;
  }

  // Keyboard: one tab stop; the arrow keys move to the nearest cell that way, Enter chooses it.
  let active = $state<string | null>(null);
  let hovered = $state<string | null>(null);
  let keyed = $state<string | null>(null);
  const buttons: Record<string, HTMLButtonElement> = {};
  const visible = (k: string) => (to.get(k)?.o ?? 0) > 0.5;
  let firstKey = $derived([...layout.cells.values()].find((c) => visible(c.key) && (c.full || grouped))?.key ?? null);
  let tabKey = $derived(active && visible(active) ? active : (picked.find(visible) ?? firstKey));
  function nearest(key: string, dir: string) {
    const a = to.get(key);
    if (!a) return undefined;
    const ax = a.x + a.w / 2;
    const ay = a.y + a.h / 2;
    let best: string | undefined;
    let score = Infinity;
    for (const [k, b] of to) {
      if (k === key || b.o < 0.5) continue;
      const dx = b.x + b.w / 2 - ax;
      const dy = b.y + b.h / 2 - ay;
      const along = dir === "ArrowDown" ? dy : dir === "ArrowUp" ? -dy : dir === "ArrowRight" ? dx : -dx;
      const across = dir === "ArrowDown" || dir === "ArrowUp" ? Math.abs(dx) : Math.abs(dy);
      if (along < 1) continue;
      const s = along + across * 2.5;
      if (s < score) {
        score = s;
        best = k;
      }
    }
    return best;
  }
  function oncellkey(e: KeyboardEvent, c: Cell) {
    if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      const n = nearest(c.key, e.key);
      if (!n) return;
      active = n;
      buttons[n]?.focus();
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      pz.zoomBy(1.35);
    } else if (e.key === "-") {
      e.preventDefault();
      pz.zoomBy(1 / 1.35);
    } else if (e.key === "0") {
      e.preventDefault();
      showAll();
    } else if (e.key === "Escape" && grouped) {
      e.preventDefault();
      go(`/case/${caseId}/connections`);
    }
  }
  function choose(c: Cell) {
    if (pz.dragged) return;
    active = c.key;
    go(`/case/${caseId}/connections?of=${c.key}`);
  }
  function onheader(col: Column) {
    if (col.kind === "document") go(`/case/${caseId}/connections?of=document:${col.id}`);
    else {
      const cs = col.cells;
      if (!cs.length) return;
      pz.flyTo(pz.frame({ x0: col.x - 20, y0: cs[0].y - 20, x1: col.x + col.w + 20, y1: cs[cs.length - 1].y + cs[cs.length - 1].h + 20 }, 0.3, 1.15));
    }
  }

  let preview = $derived(hovered ?? keyed);
  let lifted = $derived(
    grouped ? shown.filter((pr) => picked.includes(pr.a) || picked.includes(pr.b)) : preview ? shown.filter((pr) => pr.a === preview || pr.b === preview) : [],
  );
  let liftedKeys = $derived(new Set(lifted.map((pr) => pr.key)));
  let peek = $derived(!grouped && preview && pz.k < NEAR ? layout.cells.get(preview) : undefined);
  const typeName: Record<EvidenceKind, Parameters<typeof t>[0]> = { statement: "nav.hearings", finding: "nav.findings", passage: "nav.documents" };
  const typeIcon: Record<EvidenceKind, Kind> = { statement: "hearing", finding: "finding", passage: "document" };
</script>

<div class="map-wrap">
  <div class="bar">
    {#if grouped}
      <button class="btn btn-sm" onclick={() => go(`/case/${caseId}/connections`)}><ArrowLeft size={14} />{t("cx.map.all")}</button>
    {/if}
    <button class="btn btn-sm" onclick={onpick}><Search size={14} />{t("cx.map.pick")}</button>
    {#if relCounts.length}
      <div class="rels" role="group" aria-label={t("cx.map.relations")}>
        {#each relCounts as x (x.r)}
          <button class="chip rel" aria-pressed={!hidden.includes(x.r)} onclick={() => (hidden = hidden.includes(x.r) ? hidden.filter((r) => r !== x.r) : [...hidden, x.r])}>
            <i class="swatch" data-rel={x.r} aria-hidden="true"></i>{t(`rel.${x.r}`)} <span class="count">{x.n}</span>
          </button>
        {/each}
      </div>
      <p class="styles xsmall muted">
        <span><svg width="22" height="6" aria-hidden="true"><path d="M1,3 H21" /></svg>{t("cx.confirmed")}</span>
        <span><svg width="22" height="6" aria-hidden="true"><path class="dash" d="M1,3 H21" /></svg>{t("cx.suggested")}</span>
      </p>
    {/if}
    <div class="zoom">
      <button class="btn btn-sm btn-icon" aria-label={t("cx.map.zoomOut")} title={t("cx.map.zoomOut")} onclick={() => pz.zoomBy(1 / 1.35)}><Minus size={15} /></button>
      <button class="btn btn-sm btn-icon" aria-label={t("cx.map.zoomIn")} title={t("cx.map.zoomIn")} onclick={() => pz.zoomBy(1.35)}><Plus size={15} /></button>
      <button class="btn btn-sm fit" aria-label={t("cx.map.fit")} onclick={showAll}><Maximize2 size={14} /><span class="fit-label">{t("cx.map.fit")}</span></button>
    </div>
  </div>

  {#if !layout.columns.length}
    <p class="empty muted">{t("cx.map.empty")}</p>
  {:else}
    <p class="sr-only" id="cx-map-desc">{t("cx.map.desc")}</p>
    <div
      class="view {zoom}"
      class:grouped
      bind:this={view}
      bind:clientWidth={pz.vw}
      bind:clientHeight={pz.vh}
      role="group"
      aria-label={grouped ? t("cx.map.groupLabel") : t("cx.map.label")}
      aria-describedby="cx-map-desc"
    >
      <div class="world" class:moving={pz.moving || p < 1} style:transform="translate({pz.x}px, {pz.y}px) scale({pz.k})">
        <div class="dots" style:width="{layout.width + 2400}px" style:height="{layout.height + 2400}px"></div>
        <svg class="edges" width={layout.width} height={layout.height} aria-hidden="true">
          {#each shown as pr (pr.key)}
            {@const o = seen(pr)}
            {#if o > 0.02 && !liftedKeys.has(pr.key)}
              <path d={path(pr)} data-rel={pr.relation} class:suggested={!pr.confirmed} class:dim={!grouped && !!preview} style:opacity={grouped ? o : undefined} />
            {/if}
          {/each}
        </svg>
        {#each layout.columns as col (col.key)}
          {#each col.cells as c (c.key)}
            {@const ps = poseOf(c.key)}
            {@const d = describe(c)}
            {@const own = shownBy.get(c.key)}
            {@const card = c.full || (grouped && (ps?.o ?? 0) > 0.5)}
            {#if ps}
              <button
                class="cell"
                class:thin={!card}
                class:finding={c.kind === "finding"}
                class:subject={picked.includes(c.key)}
                class:previewed={preview === c.key}
                data-rel={card ? relOf(c) : undefined}
                style:transform="translate({ps.x}px, {ps.y}px)"
                style:width="{ps.w}px"
                style:height="{ps.h}px"
                style:opacity={ps.o < 1 ? ps.o : undefined}
                style:visibility={ps.o < 0.02 ? "hidden" : undefined}
                style:pointer-events={ps.o < 0.5 ? "none" : undefined}
                tabindex={tabKey === c.key ? 0 : -1}
                aria-label={label(c)}
                aria-current={picked.includes(c.key) ? "true" : undefined}
                bind:this={buttons[c.key]}
                onclick={() => choose(c)}
                onkeydown={(e) => oncellkey(e, c)}
                onfocus={() => {
                  active = c.key;
                  keyed = c.key;
                  const tp = to.get(c.key);
                  if (tp) pz.reveal({ x0: tp.x, y0: tp.y, x1: tp.x + tp.w, y1: tp.y + tp.h }, MID);
                }}
                onblur={() => keyed === c.key && (keyed = null)}
                onpointerenter={(e) => e.pointerType === "mouse" && !pz.dragged && (hovered = c.key)}
                onpointerleave={() => hovered === c.key && (hovered = null)}
              >
                {#if card}
                  <span class="glyph tabular" aria-hidden="true"><KindIcon kind={d.icon} speakerId={d.speakerId} size={c.kind === "statement" ? 30 : 22} /><span>{d.glyph}</span></span>
                  <span class="meta">
                    <KindIcon kind={d.icon} speakerId={d.speakerId} size={c.kind === "statement" ? 19 : 13} />
                    <span class="who">{grouped && c.kind !== "finding" ? whereOf(c.key) : d.meta}</span>
                    {#if own?.length}<span class="n tabular">{own.length}</span>{/if}
                  </span>
                  <span class="text clamp-2" class:doc-text={c.kind === "passage"} class:serif={c.kind === "finding"}>{d.text}</span>
                {:else}
                  <span class="line" class:doc-text={c.kind === "passage"}>{d.text}</span>
                {/if}
              </button>
            {/if}
          {/each}
        {/each}
        <svg class="edges lifted" width={layout.width} height={layout.height} aria-hidden="true">
          {#each lifted as pr (pr.key)}
            <path d={path(pr)} data-rel={pr.relation} class:suggested={!pr.confirmed} />
          {/each}
        </svg>
      </div>

      {#if grouped && gathered}
        {#each gathered.heads as h (h.kind)}
          <span class="type-tag" style:left="{pz.sx(h.x)}px" style:top="{pz.sy(h.y) - 34}px" style:opacity={p}>
            <KindIcon kind={typeIcon[h.kind]} size={14} />{t(typeName[h.kind])} <span class="tabular count">{h.n}</span>
          </span>
        {/each}
      {:else}
        <div class="heads">
          {#each layout.columns as col (col.key)}
            {@const w = col.w * pz.k}
            <button
              class="col-head"
              class:tight={w < 110}
              class:tiny={w < 58}
              class:on={selected === `document:${col.id}`}
              style:left="{pz.sx(col.x)}px"
              style:width="{Math.max(w, 30)}px"
              title={col.name}
              aria-label={col.kind === "document" ? t("cx.map.exploreDoc", { name: col.name }) : t("cx.map.zoomTo", { name: col.name })}
              tabindex="-1"
              onclick={() => onheader(col)}
            >
              <span class="name">
                <KindIcon kind={col.kind === "hearing" ? "hearing" : col.kind === "findings" ? "finding" : "document"} size={14} />
                <span class="label">{col.name}</span>
                {#if col.short}<span class="short tabular">{col.short}</span>{/if}
                {#if col.live}<span class="live-dot" aria-hidden="true"></span>{/if}
              </span>
              <span class="sub">{col.count ? t("cx.map.count", { n: col.count }) : t("cx.map.none")}</span>
            </button>
          {/each}
        </div>
      {/if}

      {#if peek}
        {@const d = describe(peek)}
        <div class="peek" style:left="{Math.min(Math.max(8, pz.sx(peek.x)), pz.vw - 296)}px" style:top="{Math.max(HEAD_H + 6, pz.sy(peek.y) - 74)}px">
          <span class="where"><KindIcon kind={d.icon} speakerId={d.speakerId} size={peek.kind === "statement" ? 16 : 12} />{whereOf(peek.key)}</span>
          <span class="clamp-2" class:doc-text={peek.kind === "passage"}>{d.text}</span>
        </div>
      {/if}
    </div>
    <p class="hint xsmall muted">{grouped ? t("cx.map.groupHint") : t("cx.map.hint")}</p>
  {/if}
</div>

<style>
  .map-wrap {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
    min-width: 0;
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
  }
  .rels {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .rel .swatch {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--rel-related);
  }
  .swatch[data-rel="conflicts"] {
    background: var(--rel-conflicts);
  }
  .swatch[data-rel="context"] {
    background: var(--rel-context);
  }
  .swatch[data-rel="supports"] {
    background: var(--rel-supports);
  }
  .rel[aria-pressed="false"] {
    color: var(--muted);
    text-decoration: line-through;
    text-decoration-color: var(--line-strong);
  }
  .rel[aria-pressed="false"] .swatch {
    opacity: 0.35;
  }
  .styles {
    display: flex;
    gap: 12px;
    margin: 0;
  }
  .styles span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .styles path {
    stroke: var(--muted);
    stroke-width: 2;
    fill: none;
  }
  .styles path.dash {
    stroke-dasharray: 5 4;
  }
  .zoom {
    display: flex;
    gap: 6px;
    margin-left: auto;
  }
  .empty {
    padding: 24px;
    border: 1px dashed var(--line-strong);
    border-radius: var(--radius-surface);
  }

  .view {
    position: relative;
    height: var(--map-h, clamp(420px, calc(100dvh - 300px), 860px));
    border: 1px solid var(--line);
    border-radius: var(--radius-surface);
    background: var(--surface-2);
    overflow: hidden;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    cursor: grab;
    contain: strict;
  }
  .view:active {
    cursor: grabbing;
  }
  .world {
    position: absolute;
    left: 0;
    top: 0;
    width: 0;
    height: 0;
    transform-origin: 0 0;
  }
  .world.moving {
    will-change: transform;
  }
  .dots {
    position: absolute;
    left: -1200px;
    top: -1200px;
    pointer-events: none;
    /* Literal colours: an image behind var() would be redrawn every time the camera moves. */
    background-image: radial-gradient(circle, rgb(118 130 118 / 0.3) 1px, transparent 1.3px);
    background-size: 26px 26px;
  }

  .edges {
    position: absolute;
    left: 0;
    top: 0;
    overflow: visible;
    pointer-events: none;
  }
  .edges path {
    fill: none;
    stroke: var(--rel-related);
    stroke-width: 1.75;
    stroke-linecap: round;
    vector-effect: non-scaling-stroke;
    transition: opacity 0.2s ease;
  }
  .edges path[data-rel="conflicts"] {
    stroke: var(--rel-conflicts);
  }
  .edges path[data-rel="context"] {
    stroke: var(--rel-context);
  }
  .edges path[data-rel="supports"] {
    stroke: var(--rel-supports);
  }
  .edges path.suggested {
    stroke-dasharray: 6 5;
  }
  .edges path.dim {
    opacity: 0.16;
  }
  .grouped .edges path {
    stroke-width: 2.25;
  }
  .edges.lifted {
    z-index: 3;
  }
  .edges.lifted path {
    stroke-width: 2.75;
  }

  .cell {
    position: absolute;
    left: 0;
    top: 0;
    display: grid;
    align-content: start;
    gap: 3px;
    padding: 8px 10px 0;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
    color: var(--ink);
    text-align: left;
    overflow: hidden;
    cursor: pointer;
    transition: box-shadow 0.2s ease;
  }
  .cell[data-rel="conflicts"] {
    background: color-mix(in srgb, var(--rel-conflicts) 13%, var(--surface));
    border-color: color-mix(in srgb, var(--rel-conflicts) 45%, var(--line));
  }
  .cell[data-rel="context"] {
    background: color-mix(in srgb, var(--rel-context) 13%, var(--surface));
    border-color: color-mix(in srgb, var(--rel-context) 45%, var(--line));
  }
  .cell[data-rel="supports"] {
    background: color-mix(in srgb, var(--rel-supports) 12%, var(--surface));
    border-color: color-mix(in srgb, var(--rel-supports) 42%, var(--line));
  }
  .cell[data-rel="related"] {
    border-color: var(--line-strong);
  }
  .cell.finding {
    border-width: 1.5px;
  }
  .cell.thin {
    padding: 0 6px;
    border: 0;
    border-radius: 3px;
    background: var(--sunken);
  }
  .cell:hover,
  .cell.previewed {
    z-index: 2;
    box-shadow: var(--shadow-float);
  }
  .cell.subject {
    z-index: 4;
    outline: 2px solid var(--ink-strong);
    outline-offset: 2px;
    box-shadow: var(--shadow-float);
  }
  .cell:focus-visible {
    z-index: 5;
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 12.5px;
    font-weight: 600;
    line-height: 20px;
    color: var(--ink-strong);
  }
  .who {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .n {
    padding: 0 6px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--ink-strong) 9%, transparent);
    font-size: 11px;
    line-height: 17px;
  }
  .text {
    font-size: 12.5px;
    line-height: 1.38;
    color: var(--ink);
  }
  .text.serif {
    font-family: var(--font-serif);
    font-size: 13.5px;
    line-height: 1.3;
    color: var(--ink-strong);
  }
  .line {
    display: none;
    font-size: 9.5px;
    line-height: 14px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .glyph {
    display: none;
    align-items: center;
    gap: 9px;
    font-size: 22px;
    font-weight: 600;
    color: var(--ink-strong);
  }
  /* Semantic zoom: far out a face and a time, or a page; closer, who or where and a line of the
     words; close up, two lines. */
  .far .cell:not(.thin) {
    align-content: center;
    padding: 0 12px;
  }
  .far .cell .meta,
  .far .cell .text {
    display: none;
  }
  .far .glyph {
    display: flex;
  }
  .mid .text {
    -webkit-line-clamp: 1;
    line-clamp: 1;
  }
  .near .line {
    display: block;
  }
  .far .cell[data-rel="conflicts"] {
    background: color-mix(in srgb, var(--rel-conflicts) 24%, var(--surface));
  }
  .far .cell[data-rel="context"] {
    background: color-mix(in srgb, var(--rel-context) 22%, var(--surface));
  }
  .far .cell[data-rel="supports"] {
    background: color-mix(in srgb, var(--rel-supports) 20%, var(--surface));
  }

  .heads {
    position: absolute;
    z-index: 6;
    left: 0;
    right: 0;
    top: 0;
    height: 58px;
    border-bottom: 1px solid var(--line);
    background: color-mix(in srgb, var(--surface) 94%, transparent);
    overflow: hidden;
    cursor: default;
  }
  .col-head {
    position: absolute;
    top: 8px;
    display: grid;
    gap: 1px;
    padding: 4px 8px;
    border-radius: var(--radius-control);
    text-align: left;
    color: var(--ink-strong);
    min-width: 0;
  }
  button.col-head:hover {
    background: var(--sunken);
  }
  .col-head.on {
    background: var(--selected);
  }
  .col-head .name {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 13px;
    font-weight: 600;
  }
  .col-head .label {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .col-head .sub {
    font-size: 11.5px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .col-head .short {
    display: none;
  }
  /* Narrow columns: the name wraps to two lines; narrower still, a hearing keeps its number. */
  .col-head.tight {
    padding: 4px 5px;
  }
  .col-head.tight .name {
    align-items: flex-start;
    font-size: 11.5px;
  }
  .col-head.tight .label {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    white-space: normal;
    line-height: 1.22;
  }
  .col-head.tight .sub {
    display: none;
  }
  .col-head.tiny .label {
    display: none;
  }
  .col-head.tiny .short {
    display: inline;
  }

  .type-tag {
    position: absolute;
    z-index: 5;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px 3px 8px;
    border: 1px solid var(--line);
    border-radius: 20px;
    background: var(--surface);
    font-size: 12.5px;
    font-weight: 600;
    color: var(--ink-strong);
    white-space: nowrap;
    pointer-events: none;
  }
  .type-tag .count {
    color: var(--muted);
    font-weight: 500;
  }
  .peek {
    position: absolute;
    z-index: 5;
    display: grid;
    gap: 4px;
    width: 288px;
    padding: 8px 10px;
    border: 1px solid var(--line);
    border-radius: 7px;
    background: var(--surface);
    box-shadow: var(--shadow-float);
    font-size: 12.5px;
    line-height: 1.4;
    color: var(--ink);
    pointer-events: none;
  }
  .peek .where {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: var(--ink-strong);
  }
  .hint {
    margin: 0;
  }
  @media (max-width: 699px) {
    .view {
      height: var(--map-h-phone, clamp(340px, 60dvh, 620px));
    }
    .styles,
    .fit-label {
      display: none;
    }
    /* One row of controls, the relations in a row of their own that scrolls sideways. */
    .rels {
      order: 3;
      flex: 1 0 100%;
      min-width: 0;
      flex-wrap: nowrap;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .rels .chip {
      flex-shrink: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .cell,
    .edges path {
      transition: none;
    }
  }
</style>
