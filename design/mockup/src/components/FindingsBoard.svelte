<script lang="ts">
  import { Check, Compass, Eraser, ExternalLink, FileText, GripVertical, LayoutDashboard, MessageSquare, Plus, X } from "@lucide/svelte";
  import { untrack } from "svelte";
  import {
    CARD_H,
    CARD_W,
    addToBoard,
    candidatesFor,
    clearBoard,
    getBoard,
    keyOf,
    moveCard,
    parseKey,
    pin,
    setDriver,
    startBoard,
    unpin,
    type BoardCard,
    type BoardRef,
    type Candidate,
  } from "../lib/board.svelte";
  import { fmtClock, l, t } from "../lib/i18n";
  import {
    connection,
    doc,
    finding,
    findingForStatement,
    hearing,
    inspect,
    openAssistant,
    passage,
    passagesOf,
    speaker,
    speakerName,
    statement,
  } from "../lib/store.svelte";
  import type { Citation, Status } from "../lib/types";
  import Avatar from "./Avatar.svelte";
  import Overlay from "./Overlay.svelte";
  import Quote from "./Quote.svelte";
  import RelationTag from "./RelationTag.svelte";
  import StatusChip from "./StatusChip.svelte";
  import ThingPicker from "./ThingPicker.svelte";

  /**
   * The findings board: a mood board the lawyer drives. Start from a finding (or a statement or
   * document), pin what Jude suggests behind it, arrange the cards, and ask about the result.
   */
  let { caseId, start }: { caseId: string; start?: string } = $props();

  let board = $derived(getBoard(caseId));
  let driver = $derived(parseKey(board.driver));
  let suggestions = $derived(driver ? candidatesFor(caseId, driver, true) : { related: [], maybe: [] });
  let width = $state(0);
  let wide = $derived(width >= 900);
  let showMaybe = $state(false);
  let picker = $state(false);
  let selected = $state<string | null>(null);

  // ?start=finding:f1 puts something on the board from elsewhere in the app, keeping the rest.
  $effect(() => {
    const key = start;
    untrack(() => {
      const ref = parseKey(key);
      if (ref && getBoard(caseId).driver !== key) addToBoard(caseId, ref);
    });
  });

  const pinned = (key: string) => board.cards.some((c) => c.key === key);
  const linkConfirmed = (link: { connectionId?: string; findingId?: string }) =>
    link.connectionId ? !!connection(link.connectionId)?.reviewed : link.findingId ? !!finding(link.findingId)?.reviewed : false;

  function info(ref: BoardRef): { text: string; meta: string; speakerId?: string; said?: string; status?: Status; who?: string } {
    if (ref.kind === "finding") {
      const f = finding(ref.id);
      const s = f ? statement(f.statementId) : undefined;
      const h = hearing(s?.hearingId);
      return {
        text: f ? l(f.title) : "",
        meta: s ? fmtClock(s.t) : "",
        status: f?.status,
        who: s && h ? `${speakerName(speaker(s.speakerId))} · ${t("common.hearingN", { n: h.number })}` : "",
      };
    }
    if (ref.kind === "statement") {
      const s = statement(ref.id);
      const h = hearing(s?.hearingId);
      return { text: s?.text ?? "", meta: s && h ? `${speakerName(speaker(s.speakerId))} · ${t("common.hearingN", { n: h.number })} · ${fmtClock(s.t)}` : "", speakerId: s?.speakerId, said: findingForStatement(ref.id)?.said };
    }
    if (ref.kind === "passage") {
      const p = passage(ref.id);
      return { text: p?.text ?? "", meta: p ? `${doc(p.docId)?.title} · ${t("common.page", { n: p.page })}` : "", speakerId: undefined, said: undefined };
    }
    const d = doc(ref.id);
    return { text: d ? `${l(d.kind)} · ${t("ev.pages", { n: d.pages })} · ${t("ev.passages", { n: passagesOf(d.id).length })}` : "", meta: d?.title ?? "", speakerId: undefined, said: undefined };
  }

  function open(ref: BoardRef) {
    if (ref.kind === "document") return;
    inspect({ kind: ref.kind, id: ref.id });
  }

  function explore(key: string) {
    setDriver(caseId, key);
    showMaybe = false;
    selected = key;
  }

  function begin(ref: BoardRef) {
    startBoard(caseId, ref);
    picker = false;
    selected = keyOf(ref);
    showMaybe = false;
  }

  function askBoard() {
    const refs: Citation[] = board.cards.slice(0, 6).map((c) => ({ kind: c.kind, id: c.id }));
    openAssistant({ kind: "case" }, undefined, refs);
  }

  // Drag cards by their handle; positions are kept per case.
  let drag: { key: string; dx: number; dy: number } | null = null;
  function grab(event: PointerEvent, card: BoardCard) {
    const plane = (event.currentTarget as HTMLElement).closest(".plane") as HTMLElement;
    const box = plane.getBoundingClientRect();
    drag = { key: card.key, dx: event.clientX - box.left - card.x, dy: event.clientY - box.top - card.y };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }
  function dragMove(event: PointerEvent) {
    if (!drag) return;
    const plane = (event.currentTarget as HTMLElement).closest(".plane") as HTMLElement;
    const box = plane.getBoundingClientRect();
    moveCard(caseId, drag.key, event.clientX - box.left - drag.dx, event.clientY - box.top - drag.dy);
  }
  function drop() {
    drag = null;
  }

  let planeSize = $derived({
    w: Math.max(900, ...board.cards.map((c) => c.x + CARD_W + 60)),
    h: Math.max(520, ...board.cards.map((c) => c.y + CARD_H + 60)),
  });

  function linkGeometry(fromKey: string, toKey: string) {
    const a = board.cards.find((c) => c.key === fromKey);
    const b = board.cards.find((c) => c.key === toKey);
    if (!a || !b) return null;
    const leftToRight = a.x <= b.x;
    const x1 = leftToRight ? a.x + CARD_W : a.x;
    const x2 = leftToRight ? b.x : b.x + CARD_W;
    const y1 = a.y + CARD_H / 2;
    const y2 = b.y + CARD_H / 2;
    const bend = Math.max(40, Math.abs(x2 - x1) / 2) * (leftToRight ? 1 : -1);
    return { d: `M${x1},${y1} C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}`, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 };
  }

</script>

{#snippet candidateRow(c: Candidate)}
  {@const i = info(c.ref)}
  {@const isPinned = pinned(c.key)}
  <li class="cand" class:pinned={isPinned}>
    <button class="cand-main" onclick={() => open(c.ref)}>
      <span class="cand-meta">
        {#if i.status}<StatusChip status={i.status} size="sm" />{:else if i.speakerId}<Avatar id={i.speakerId} size="xs" />{:else}<FileText size={13} />{/if}
        <span class="clamp-2">{i.meta}</span>
      </span>
      {#if i.status}
        <span class="cand-title clamp-2">{i.text}</span>
      {:else}
        <span class="cand-text clamp-3"><Quote text={i.text} mark={c.mark ?? i.said} /></span>
      {/if}
      <span class="cand-tags">
        <RelationTag relation={c.relation} reviewed={c.source === "words" ? false : undefined} />
        {#if c.source === "finding"}<span class="xsmall muted">{t("board.fromFinding")}</span>{/if}
        {#if c.via && passage(c.via)}<span class="xsmall muted">{t("board.via", { page: passage(c.via)!.page })}</span>{/if}
      </span>
    </button>
    <button class="btn btn-sm pin-btn" class:btn-primary={!isPinned} disabled={isPinned} onclick={() => pin(caseId, c)}>
      {#if isPinned}<Check size={14} />{t("board.pinned")}{:else}<Plus size={14} />{t("board.pin")}{/if}
    </button>
  </li>
{/snippet}

{#snippet suggestionsPanel()}
  {#if driver}
    {@const d = info(driver)}
    <div class="sugg-head">
      <span class="t-label">{t("board.relatedTo")}</span>
      <p class="sugg-driver clamp-2">{driver.kind === "document" ? d.meta : d.text}</p>
    </div>
    {#if suggestions.related.length}
      <ul class="cands">{#each suggestions.related as c (c.key)}{@render candidateRow(c)}{/each}</ul>
    {:else}
      <p class="small muted">{t("board.noRelated")}</p>
    {/if}
    {#if suggestions.maybe.length}
      {#if showMaybe}
        <h4 class="t-label maybe-title">{t("board.maybe")}</h4>
        <ul class="cands">{#each suggestions.maybe as c (c.key)}{@render candidateRow(c)}{/each}</ul>
      {:else}
        <button class="link-btn" onclick={() => (showMaybe = true)}>{t("board.showMaybe", { n: suggestions.maybe.length })}</button>
      {/if}
    {/if}
  {/if}
{/snippet}

{#snippet pickerBody()}
  <ThingPicker {caseId} kinds={["finding", "statement", "document"]} onpick={begin} />
{/snippet}

<div class="board" bind:clientWidth={width}>
  {#if !board.driver}
    <section class="empty card">
      <div class="empty-head">
        <span class="empty-icon"><LayoutDashboard size={22} /></span>
        <div>
          <h2 class="t-serif">{t("board.startTitle")}</h2>
          <p class="muted">{t("board.lead")}</p>
        </div>
      </div>
      {@render pickerBody()}
    </section>
  {:else}
    <div class="toolbar">
      <button class="btn" onclick={() => (picker = true)}><Compass size={15} />{t("board.start")}</button>
      <button class="btn" onclick={askBoard}><MessageSquare size={15} />{t("board.ask")}</button>
      <button class="btn btn-ghost" onclick={() => clearBoard(caseId)}><Eraser size={15} />{t("board.clear")}</button>
      <span class="xsmall muted hint">{t("board.cards", { n: board.cards.length })}{wide ? ` · ${t("board.dragHint")}` : ""}</span>
    </div>

    {#if wide}
      <div class="area">
        <div class="canvas">
          <div class="plane" style:width="{planeSize.w}px" style:height="{planeSize.h}px">
            <svg width={planeSize.w} height={planeSize.h} aria-hidden="true">
              {#each board.links as link (link.from + link.to)}
                {@const g = linkGeometry(link.from, link.to)}
                {#if g}<path class="wire" data-rel={link.relation} class:suggested={!linkConfirmed(link)} d={g.d} />{/if}
              {/each}
            </svg>
            {#each board.links as link (link.from + link.to + "label")}
              {@const g = linkGeometry(link.from, link.to)}
              {#if g}
                <button
                  class="wire-label"
                  style:left="{g.mx}px"
                  style:top="{g.my}px"
                  onclick={() => (link.connectionId ? inspect({ kind: "connection", id: link.connectionId }) : link.findingId ? inspect({ kind: "finding", id: link.findingId }) : undefined)}
                >
                  <RelationTag relation={link.relation} reviewed={linkConfirmed(link)} />
                </button>
              {/if}
            {/each}
            {#if board.cards.length === 1}
              {@const only = board.cards[0]}
              <div class="slot" style:left="{only.x + CARD_W + 90}px" style:top="{only.y}px" style:width="{CARD_W}px" style:height="{CARD_H}px">
                <Plus size={18} />
                <span>{t("board.slot")}</span>
              </div>
            {/if}
            {#each board.cards as card (card.key)}
              {@const i = info(card)}
              {@const isDriver = board.driver === card.key}
              <article
                class="bcard"
                class:driver={isDriver}
                class:selected={selected === card.key}
                style:left="{card.x}px"
                style:top="{card.y}px"
                style:width="{CARD_W}px"
              >
                <header
                  class="bcard-head"
                  onpointerdown={(e) => grab(e, card)}
                  onpointermove={dragMove}
                  onpointerup={drop}
                  onpointercancel={drop}
                  role="presentation"
                >
                  <GripVertical size={14} class="grip" />
                  {#if i.status}<StatusChip status={i.status} size="sm" />{:else if i.speakerId}<Avatar id={i.speakerId} size="xs" />{:else}<FileText size={13} />{/if}
                  <span class="bcard-meta">{i.meta}</span>
                  {#if isDriver}<span class="driver-tag">{t("board.driver")}</span>{/if}
                </header>
                <button class="bcard-body" class:finding={card.kind === "finding"} onclick={() => (selected = card.key)}>
                  {#if card.kind === "finding"}
                    <span class="bcard-title clamp-2">{i.text}</span>
                    {#if i.who}<span class="bcard-who">{i.who}</span>{/if}
                  {:else}
                    <span class="clamp-3">{card.kind === "document" ? i.text : ""}{#if card.kind !== "document"}<Quote text={i.text} mark={i.said} />{/if}</span>
                  {/if}
                </button>
                <footer class="bcard-actions">
                  {#if !isDriver}<button class="mini" onclick={() => explore(card.key)}><Compass size={13} />{t("board.explore")}</button>{/if}
                  {#if card.kind !== "document"}<button class="mini" onclick={() => open(card)}><ExternalLink size={13} />{t("attn.open")}</button>{/if}
                  <button class="mini" aria-label={t("board.remove")} title={t("board.remove")} onclick={() => unpin(caseId, card.key)}><X size={13} /></button>
                </footer>
              </article>
            {/each}
          </div>
        </div>
        <aside class="suggest" aria-label={t("board.suggestions")}>{@render suggestionsPanel()}</aside>
      </div>
    {:else}
      <div class="stack">
        {#each board.cards as card (card.key)}
          {@const i = info(card)}
          {@const isDriver = board.driver === card.key}
          {@const link = board.links.find((x) => x.to === card.key || x.from === card.key)}
          <article class="scard" class:driver={isDriver}>
            <div class="scard-meta">
              {#if i.status}<StatusChip status={i.status} size="sm" />{:else if i.speakerId}<Avatar id={i.speakerId} size="xs" />{:else}<FileText size={13} />{/if}
              <span class="clamp-2">{i.meta}</span>
              {#if isDriver}<span class="driver-tag">{t("board.driver")}</span>{:else if link}<RelationTag relation={link.relation} reviewed={linkConfirmed(link)} />{/if}
            </div>
            <p class="scard-text" class:finding={card.kind === "finding"}>{#if card.kind === "finding" || card.kind === "document"}{i.text}{:else}<Quote text={i.text} mark={i.said} />{/if}</p>
            {#if i.who}<p class="bcard-who">{i.who}</p>{/if}
            <div class="scard-actions">
              {#if !isDriver}<button class="mini" onclick={() => explore(card.key)}><Compass size={13} />{t("board.explore")}</button>{/if}
              {#if card.kind !== "document"}<button class="mini" onclick={() => open(card)}><ExternalLink size={13} />{t("attn.open")}</button>{/if}
              <button class="mini" onclick={() => unpin(caseId, card.key)}><X size={13} />{t("board.remove")}</button>
            </div>
          </article>
        {/each}
        <section class="suggest stacked">{@render suggestionsPanel()}</section>
      </div>
    {/if}
  {/if}
</div>

<Overlay open={picker} onclose={() => (picker = false)} variant={wide ? "dialog" : "sheet"} label={t("board.startTitle")} width={620}>
  <div class="pick-head">
    <h2 class="t-serif">{t("board.startTitle")}</h2>
    <button class="btn btn-ghost btn-icon" aria-label={t("common.close")} onclick={() => (picker = false)}><X size={18} /></button>
  </div>
  <div class="pick-body scroll-y">{@render pickerBody()}</div>
</Overlay>

<style>
  .board {
    display: grid;
    gap: 12px;
  }
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .hint {
    margin-left: auto;
  }
  .area {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
    gap: 14px;
    align-items: start;
  }
  .canvas {
    overflow: auto;
    max-height: calc(100dvh - var(--topbar-h) - 210px);
    min-height: 460px;
    border-radius: var(--radius-surface);
    border: 1px solid var(--line);
    background:
      radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--muted) 30%, transparent) 1px, transparent 0) 0 0 / 22px 22px,
      var(--surface-2);
  }
  .plane {
    position: relative;
  }
  svg {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .wire {
    fill: none;
    stroke-width: 2.2;
  }
  .wire.suggested {
    stroke-dasharray: 6 5;
  }
  .wire[data-rel="supports"] { stroke: var(--rel-supports); }
  .wire[data-rel="conflicts"] { stroke: var(--rel-conflicts); }
  .wire[data-rel="context"] { stroke: var(--rel-context); }
  .wire[data-rel="related"] { stroke: var(--rel-related); }
  .wire-label {
    position: absolute;
    transform: translate(-50%, -50%);
    padding: 3px 9px;
    border-radius: var(--radius-pill);
    background: var(--surface);
    border: 1px solid var(--line);
    box-shadow: 0 2px 6px rgb(20 40 30 / 0.08);
    z-index: 2;
  }
  .slot {
    position: absolute;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 6px;
    padding: 16px;
    border: 2px dashed var(--line-strong);
    border-radius: var(--radius-action);
    color: var(--muted);
    font-size: 12.5px;
    text-align: center;
  }
  .bcard {
    position: absolute;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto 1fr auto;
    min-height: 128px;
    background: var(--surface);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-action);
    box-shadow: 0 6px 16px rgb(20 40 30 / 0.08);
    z-index: 1;
  }
  .bcard.driver {
    border: 2px solid var(--ink-strong);
    box-shadow: 0 10px 26px rgb(20 40 30 / 0.16);
  }
  .bcard.selected {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }
  .bcard-head {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px 4px 6px;
    cursor: grab;
    touch-action: none;
    user-select: none;
  }
  .bcard-head:active {
    cursor: grabbing;
  }
  .bcard-head :global(.grip) {
    color: var(--muted);
  }
  .bcard-meta {
    flex: 1;
    min-width: 0;
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bcard .driver-tag {
    position: absolute;
    top: -10px;
    right: 10px;
  }
  .driver-tag {
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: var(--surface);
    background: var(--ink-strong);
    padding: 1px 6px;
    border-radius: 3px;
  }
  .bcard-body {
    display: grid;
    align-content: start;
    gap: 4px;
    min-width: 0;
    padding: 2px 12px 6px;
    text-align: left;
    font-size: 13px;
    line-height: 1.45;
    color: var(--ink-strong);
  }
  .bcard-actions,
  .scard-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    padding: 4px 6px 6px;
    border-top: 1px solid var(--line);
  }
  .mini {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 7px;
    border-radius: 4px;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--ink);
    min-height: 28px;
  }
  .mini:hover {
    background: var(--sunken);
  }
  .suggest {
    display: grid;
    gap: 10px;
    align-content: start;
    padding: 14px;
    border-radius: var(--radius-surface);
    border: 1px solid var(--line);
    background: var(--surface);
    max-height: calc(100dvh - var(--topbar-h) - 210px);
    overflow-y: auto;
  }
  .suggest.stacked {
    max-height: none;
  }
  .sugg-head {
    display: grid;
    gap: 4px;
  }
  .sugg-driver {
    font-family: var(--font-serif);
    font-size: 16px;
    line-height: 1.3;
    color: var(--ink-strong);
  }
  .cands {
    display: grid;
    gap: 8px;
  }
  .cand {
    display: grid;
    gap: 6px;
    padding: 10px;
    border-radius: var(--radius-action);
    border: 1px solid var(--line);
    background: var(--surface-2);
  }
  .cand.pinned {
    opacity: 0.65;
  }
  .cand-main {
    display: grid;
    gap: 5px;
    text-align: left;
  }
  .cand-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
  }
  .cand-text {
    font-size: 13px;
    line-height: 1.45;
    color: var(--ink-strong);
  }
  .cand-tags {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 10px;
  }
  .pin-btn {
    justify-self: start;
  }
  .maybe-title {
    margin-top: 6px;
  }
  .stack {
    display: grid;
    gap: 10px;
  }
  .scard {
    display: grid;
    gap: 6px;
    padding: 12px 12px 4px;
    border-radius: var(--radius-action);
    border: 1px solid var(--line-strong);
    background: var(--surface);
  }
  .scard.driver {
    border: 2px solid var(--ink-strong);
  }
  .scard-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--muted);
  }
  .scard-meta > span:nth-child(2) {
    flex: 1;
  }
  .scard-text {
    font-size: 14px;
    line-height: 1.5;
    color: var(--ink-strong);
  }
  .bcard-who {
    font-size: 11.5px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cand-title,
  .bcard-title {
    font-family: var(--font-serif);
    font-size: 15.5px;
    line-height: 1.3;
    color: var(--ink-strong);
  }
  .scard-text.finding {
    font-family: var(--font-serif);
    font-size: 17px;
    line-height: 1.3;
  }
  .empty {
    display: grid;
    gap: 14px;
    padding: 20px;
  }
  .empty-head {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }
  .empty-head h2 {
    font-size: 26px;
  }
  .empty-icon {
    display: grid;
    place-items: center;
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: var(--selected);
    color: var(--ink-strong);
    flex-shrink: 0;
  }
  .pick-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 12px 12px 20px;
    border-bottom: 1px solid var(--line);
  }
  .pick-head h2 {
    flex: 1;
    font-size: 22px;
  }
  .pick-body {
    display: grid;
    gap: 14px;
    padding: 16px 20px 20px;
    min-height: 0;
  }
</style>
