<script lang="ts">
  import { fmtClock, t } from "../lib/i18n";
  import { connectionsOfCase, docsOf, hearing, hearingsOf, passage, speaker, speakerName, statement } from "../lib/store.svelte";
  import type { Connection, InspectTarget } from "../lib/types";

  let {
    caseId,
    selected,
    showSuggested,
    onselect,
  }: {
    caseId: string;
    selected: InspectTarget | null;
    showSuggested: boolean;
    onselect: (target: InspectTarget) => void;
  } = $props();

  // The canvas fills its pane and keeps a readable minimum width, scrolling sideways below it.
  const ROW = 72;
  const GAP = 150;
  const ARC = 56;
  let avail = $state(760);
  let WIDTH = $derived(Math.max(640, Math.floor(avail)));
  let LEFT_W = $derived(Math.floor((WIDTH - GAP - ARC) / 2));
  let RIGHT_W = $derived(LEFT_W);
  let RIGHT_X = $derived(LEFT_W + GAP);

  let links = $derived(connectionsOfCase(caseId).filter((c) => showSuggested || c.reviewed));

  let layout = $derived.by(() => {
    const statementIds = new Set<string>();
    const passageIds = new Set<string>();
    for (const c of links) {
      for (const end of [c.from, c.to]) (end.kind === "statement" ? statementIds : passageIds).add(end.id);
    }
    const order = new Map(hearingsOf(caseId).map((h) => [h.id, h.number]));
    const left = [...statementIds]
      .map((id) => statement(id)!)
      .filter(Boolean)
      .sort((a, b) => (order.get(a.hearingId) ?? 0) - (order.get(b.hearingId) ?? 0) || a.t - b.t)
      .map((s, i) => ({ s, y: 34 + i * ROW }));
    void WIDTH;
    const right: { kind: "doc"; title: string; y: number }[] = [];
    const passages: { id: string; page: number; text: string; y: number }[] = [];
    let y = 34;
    for (const d of docsOf(caseId)) {
      const ps = [...passageIds].map((id) => passage(id)!).filter((p) => p && p.docId === d.id).sort((a, b) => a.page - b.page);
      if (!ps.length) continue;
      right.push({ kind: "doc", title: d.title, y });
      y += 26;
      for (const p of ps) {
        passages.push({ id: p.id, page: p.page, text: p.text, y });
        y += ROW;
      }
      y += 8;
    }
    const height = Math.max(34 + left.length * ROW, y) + 10;
    const pos = new Map<string, number>();
    for (const l of left) pos.set(`statement:${l.s.id}`, l.y + 31);
    for (const p of passages) pos.set(`passage:${p.id}`, p.y + 31);
    return { left, right, passages, height, pos };
  });

  let hover = $state<string | null>(null);
  let focusKey = $derived(hover ?? (selected && selected.kind !== "connection" && selected.kind !== "legal" && selected.kind !== "finding" ? `${selected.kind}:${selected.id}` : null));

  const key = (end: { kind: string; id: string }) => `${end.kind}:${end.id}`;
  const touches = (c: Connection, k: string | null) => !!k && (key(c.from) === k || key(c.to) === k);

  function path(c: Connection) {
    const y1 = layout.pos.get(key(c.from));
    const y2 = layout.pos.get(key(c.to));
    if (y1 === undefined || y2 === undefined) return "";
    if (c.from.kind === "statement" && c.to.kind === "passage") {
      return `M${LEFT_W},${y1} C${LEFT_W + 85},${y1} ${RIGHT_X - 85},${y2} ${RIGHT_X},${y2}`;
    }
    if (c.from.kind === "passage" && c.to.kind === "passage") {
      const x = RIGHT_X + RIGHT_W;
      const bulge = 20 + Math.min(ARC - 22, Math.abs(y2 - y1) / 8);
      return `M${x},${y1} C${x + bulge},${y1} ${x + bulge},${y2} ${x},${y2}`;
    }
    return `M${RIGHT_X},${y1} C${RIGHT_X - 85},${y1} ${LEFT_W + 85},${y2} ${LEFT_W},${y2}`;
  }

  const isSelected = (k: string) => !!selected && `${selected.kind}:${selected.id}` === k;
</script>

<div class="map-scroll" bind:clientWidth={avail}>
  <div class="canvas" style:width="{WIDTH}px" style:height="{layout.height}px">
    <span class="col-label" style:left="0px">{t("ev.colStatements")}</span>
    <span class="col-label" style:left="{RIGHT_X}px">{t("ev.colPassages")}</span>
    <svg width={WIDTH} height={layout.height} aria-hidden="false" role="group" aria-label={t("ev.map")}>
      {#each links as c (c.id)}
        {@const d = path(c)}
        {#if d}
          {@const active = touches(c, focusKey) || (selected?.kind === "connection" && selected.id === c.id)}
          {@const dim = !!focusKey && !touches(c, focusKey)}
          <g class="edge" data-rel={c.relation} class:active class:dim class:suggested={!c.reviewed}>
            <path class="line" {d} />
            <path
              class="hit"
              {d}
              role="button"
              tabindex="0"
              aria-label={`${t(`rel.${c.relation}`)} · ${c.reviewed ? t("ix.confirmed") : t("ix.suggested")}`}
              onclick={() => onselect({ kind: "connection", id: c.id })}
              onkeydown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onselect({ kind: "connection", id: c.id }))}
            ><title>{t(`rel.${c.relation}`)}</title></path>
          </g>
        {/if}
      {/each}
    </svg>

    {#each layout.left as n (n.s.id)}
      {@const k = `statement:${n.s.id}`}
      {@const h = hearing(n.s.hearingId)}
      <button
        class="node left"
        class:selected={isSelected(k)}
        class:dim={!!focusKey && focusKey !== k && !links.some((c) => touches(c, focusKey) && touches(c, k))}
        style:top="{n.y}px"
        style:width="{LEFT_W}px"
        onmouseenter={() => (hover = k)}
        onmouseleave={() => (hover = null)}
        onfocus={() => (hover = k)}
        onblur={() => (hover = null)}
        onclick={() => onselect({ kind: "statement", id: n.s.id })}
      >
        <span class="node-meta">{speakerName(speaker(n.s.speakerId))} · {h ? t("common.hearingN", { n: h.number }) : ""} · <span class="tabular">{fmtClock(n.s.t)}</span></span>
        <span class="node-text">{n.s.text}</span>
      </button>
      <span class="dot left-dot" style:top="{n.y + 27}px" style:left="{LEFT_W - 4}px"></span>
    {/each}

    {#each layout.right as g (g.title)}
      <span class="doc-label" style:top="{g.y}px" style:left="{RIGHT_X}px" style:width="{RIGHT_W}px">{g.title}</span>
    {/each}
    {#each layout.passages as p (p.id)}
      {@const k = `passage:${p.id}`}
      <button
        class="node right"
        class:selected={isSelected(k)}
        class:dim={!!focusKey && focusKey !== k && !links.some((c) => touches(c, focusKey) && touches(c, k))}
        style:top="{p.y}px"
        style:left="{RIGHT_X}px"
        style:width="{RIGHT_W}px"
        onmouseenter={() => (hover = k)}
        onmouseleave={() => (hover = null)}
        onfocus={() => (hover = k)}
        onblur={() => (hover = null)}
        onclick={() => onselect({ kind: "passage", id: p.id })}
      >
        <span class="node-meta">{t("common.page", { n: p.page })}</span>
        <span class="node-text">{p.text}</span>
      </button>
      <span class="dot" style:top="{p.y + 27}px" style:left="{RIGHT_X - 4}px"></span>
    {/each}
  </div>
</div>

<style>
  .map-scroll {
    overflow-x: auto;
    overscroll-behavior-x: contain;
  }
  .canvas {
    position: relative;
    margin: 0 auto;
  }
  svg {
    position: absolute;
    inset: 0;
    overflow: visible;
  }
  .col-label {
    position: absolute;
    top: 4px;
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .doc-label {
    position: absolute;
    font-size: 11.5px;
    font-weight: 700;
    color: var(--ink-strong);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-left: 10px;
  }
  .edge .line {
    fill: none;
    stroke-width: 1.8;
    transition: opacity 0.15s, stroke-width 0.15s;
  }
  .edge.suggested .line {
    stroke-dasharray: 5 5;
  }
  .edge[data-rel="supports"] .line { stroke: var(--rel-supports); }
  .edge[data-rel="conflicts"] .line { stroke: var(--rel-conflicts); }
  .edge[data-rel="context"] .line { stroke: var(--rel-context); }
  .edge[data-rel="related"] .line { stroke: var(--rel-related); }
  .edge.active .line {
    stroke-width: 3.2;
  }
  .edge.dim .line {
    opacity: 0.18;
  }
  .hit {
    fill: none;
    stroke: transparent;
    stroke-width: 14;
    cursor: pointer;
    pointer-events: stroke;
  }
  .hit:focus-visible {
    outline: none;
    stroke: color-mix(in srgb, var(--focus) 40%, transparent);
  }
  .node {
    position: absolute;
    display: grid;
    gap: 2px;
    height: 62px;
    padding: 6px 10px;
    border: 1px solid var(--line);
    border-radius: var(--radius-control);
    background: var(--surface);
    text-align: left;
    overflow: hidden;
    transition: opacity 0.15s, border-color 0.15s;
  }
  .node.left {
    background: var(--surface-2);
  }
  .node:hover,
  .node:focus-visible {
    border-color: var(--ink-strong);
    z-index: 2;
  }
  .node.selected {
    border-color: var(--ink-strong);
    box-shadow: 0 0 0 1px var(--ink-strong);
    background: var(--selected);
  }
  .node.dim {
    opacity: 0.45;
  }
  .node-meta {
    font-size: 10.5px;
    font-weight: 600;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .node-text {
    font-size: 12px;
    line-height: 1.35;
    color: var(--ink-strong);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .dot {
    position: absolute;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--surface);
    border: 1.5px solid var(--muted);
    pointer-events: none;
  }
  .left-dot {
    background: var(--muted);
  }
</style>
