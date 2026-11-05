<script lang="ts">
  import KindIcon from "./KindIcon.svelte";
  import { ChevronRight, Compass, ExternalLink, LayoutDashboard, MessageSquare, Waypoints, X } from "@lucide/svelte";
  import { untrack } from "svelte";
  import { candidatesFor, keyOf, parseKey, type BoardRef, type Candidate } from "../lib/board.svelte";
  import { fmtClock, l, t } from "../lib/i18n";
  import { shortName } from "../lib/people";
  import { go } from "../lib/router.svelte";
  import {
    connection,
    doc,
    finding,
    findingForStatement,
    findingsCiting,
    hearing,
    inspect,
    isMeaningful,
    openAssistant,
    passage,
    passagesOf,
    speaker,
    speakerName,
    statement,
  } from "../lib/store.svelte";
  import type { Relation } from "../lib/types";
  import Overlay from "./Overlay.svelte";
  import Quote from "./Quote.svelte";
  import RelationTag from "./RelationTag.svelte";
  import ThingPicker from "./ThingPicker.svelte";

  /**
   * Connections: pick one thing in the case and see what else may relate to it, strongest first.
   * A ranked list rather than a map: each row says how it relates, and any row can become the
   * next starting point. The trail keeps every step one click away.
   */
  let { caseId, of }: { caseId: string; of?: string } = $props();

  let subject = $derived(parseKey(of));
  let width = $state(0);
  let wide = $derived(width >= 880);
  let picker = $state(false);
  let showMaybe = $state(false);
  let filter = $state<Relation | "all">("all");
  let trail = $state<string[]>([]);

  $effect(() => {
    const key = of;
    untrack(() => {
      filter = "all";
      showMaybe = false;
      if (!key || !parseKey(key)) {
        trail = [];
        return;
      }
      const i = trail.indexOf(key);
      trail = i >= 0 ? trail.slice(0, i + 1) : [...trail, key];
    });
  });

  // Confirmed links before Jude's suggestions; within each, differences before support.
  const relOrder: Record<Relation, number> = { conflicts: 0, context: 1, supports: 2, related: 3 };
  const confirmed = (c: Candidate) =>
    c.connectionId ? !!connection(c.connectionId)?.reviewed : c.findingId ? !!finding(c.findingId)?.reviewed : false;
  let found = $derived(subject ? candidatesFor(caseId, subject) : { related: [], maybe: [] });
  let ranked = $derived(
    [...found.related].sort((a, b) => Number(confirmed(b)) - Number(confirmed(a)) || relOrder[a.relation] - relOrder[b.relation]),
  );
  let counts = $derived(
    (Object.keys(relOrder) as Relation[])
      .map((r) => ({ r, n: ranked.filter((c) => c.relation === r).length }))
      .filter((x) => x.n > 0),
  );
  let visible = $derived(filter === "all" ? ranked : ranked.filter((c) => c.relation === filter));

  function show(ref: BoardRef) {
    picker = false;
    go(`/case/${caseId}/evidence?view=connections&of=${keyOf(ref)}`);
  }

  function openRef(ref: BoardRef) {
    if (ref.kind === "document") go(`/case/${caseId}/evidence/doc/${ref.id}`);
    else inspect({ kind: ref.kind, id: ref.id });
  }

  function describe(ref: BoardRef): { kind: string; meta: string; text: string; speakerId?: string } {
    if (ref.kind === "statement") {
      const s = statement(ref.id);
      const h = hearing(s?.hearingId);
      return {
        kind: t("board.kind.statement"),
        meta: s && h ? `${speakerName(speaker(s.speakerId))} · ${t("common.hearingN", { n: h.number })} · ${fmtClock(s.t)}` : "",
        text: s?.text ?? "",
        speakerId: s?.speakerId,
      };
    }
    if (ref.kind === "passage") {
      const p = passage(ref.id);
      return { kind: t("board.kind.passage"), meta: p ? `${doc(p.docId)?.title} · ${t("common.page", { n: p.page })}` : "", text: p?.text ?? "" };
    }
    if (ref.kind === "finding") {
      const f = finding(ref.id);
      return { kind: t("board.kind.finding"), meta: f ? t(`status.${f.status}`) : "", text: f ? l(f.title) : "" };
    }
    const d = doc(ref.id);
    return { kind: t("board.kind.document"), meta: d ? `${l(d.kind)} · ${t("ev.pages", { n: d.pages })}` : "", text: d?.title ?? "" };
  }

  function crumb(ref: BoardRef) {
    if (ref.kind === "statement") {
      const s = statement(ref.id);
      return s ? `${shortName(speaker(s.speakerId)) || speakerName(speaker(s.speakerId))} ${fmtClock(s.t)}` : "";
    }
    if (ref.kind === "passage") {
      const p = passage(ref.id);
      return p ? `${doc(p.docId)?.title} · ${t("common.page", { n: p.page })}` : "";
    }
    return describe(ref).text;
  }

  // Findings already raised about the subject, shown as plain notes rather than as connections.
  let notes = $derived.by(() => {
    if (!subject) return [];
    if (subject.kind === "statement") {
      const f = findingForStatement(subject.id);
      return f && isMeaningful(f) ? [f] : [];
    }
    if (subject.kind === "passage") return findingsCiting(subject.id).filter(isMeaningful);
    return [];
  });
</script>

{#snippet row(c: Candidate, rank: number | null)}
  {@const d = describe(c.ref)}
  {@const ok = confirmed(c)}
  <li class="row">
    {#if rank !== null}<span class="rank tabular" aria-label={t("cx.rank", { n: rank })}>{rank}</span>{:else}<span class="rank"></span>{/if}
    <div class="row-main">
      <div class="meta">
        <KindIcon kind={c.ref.kind} speakerId={d.speakerId} size={c.ref.kind === "statement" ? 20 : 15} />
        <span>{d.meta}</span>
      </div>
      <p class="text" class:doc-text={c.ref.kind === "passage"}><Quote text={d.text} mark={c.mark} /></p>
      <p class="why">
        <RelationTag relation={c.relation} reviewed={c.source === "words" ? false : ok} />
        {#if c.source !== "words"}<span>{ok ? t("cx.confirmed") : t("cx.suggested")}</span>{/if}
        {#if c.why}<span class="why-text">{typeof c.why === "string" ? c.why : l(c.why)}</span>{/if}
        {#if c.via && passage(c.via)}<span>{t("board.via", { page: passage(c.via)!.page })}</span>{/if}
      </p>
    </div>
    <div class="row-actions">
      <button class="btn btn-sm" onclick={() => show(c.ref)}><Waypoints size={14} />{t("cx.follow")}</button>
      <button class="btn btn-sm btn-ghost" onclick={() => openRef(c.ref)}><ExternalLink size={14} />{t("attn.open")}</button>
    </div>
  </li>
{/snippet}

<div class="cx" bind:clientWidth={width}>
  {#if !subject}
    <section class="start">
      <div class="start-head">
        <Waypoints size={20} />
        <div>
          <h2 class="t-serif">{t("cx.pickTitle")}</h2>
          <p class="muted">{t("cx.lead")}</p>
        </div>
      </div>
      <ThingPicker {caseId} kinds={["statement", "document"]} onpick={show} />
    </section>
  {:else}
    {@const s = describe(subject)}
    <div class="topline">
      <nav class="trail" aria-label={t("cx.trail")}>
        {#each trail as key, i (key)}
          {@const r = parseKey(key)}
          {#if r}
            {#if i > 0}<ChevronRight size={14} aria-hidden="true" />{/if}
            <button class="crumb" aria-current={key === of ? "location" : undefined} onclick={() => show(r)}>{crumb(r)}</button>
          {/if}
        {/each}
      </nav>
      <button class="btn btn-sm" onclick={() => (picker = true)}><Compass size={14} />{t("cx.change")}</button>
    </div>

    <div class="layout" class:wide>
      <article class="subject" aria-label={s.kind}>
        <p class="meta">
          <KindIcon kind={subject.kind} speakerId={s.speakerId} size={subject.kind === "statement" ? 28 : 17} />
          <span><strong>{s.kind}</strong>{s.meta ? ` · ${s.meta}` : ""}</span>
        </p>
        {#if subject.kind === "document"}
          <h2 class="t-serif doc-title">{s.text}</h2>
          <div class="passages">
            <h3 class="small-head">{t("cx.passages")}</h3>
            <ul>
              {#each passagesOf(subject.id) as p (p.id)}
                <li><button onclick={() => show({ kind: "passage", id: p.id })}><span class="tabular">{t("common.page", { n: p.page })}</span><span class="clamp-2 doc-text">{p.text}</span></button></li>
              {/each}
            </ul>
          </div>
        {:else}
          <blockquote class="quote" class:doc-text={subject.kind === "passage"}>“{s.text}”</blockquote>
        {/if}
        {#each notes as f (f.id)}
          <button class="note" class:loud={f.status === "potential_inconsistency"} onclick={() => inspect({ kind: "finding", id: f.id })}>
            {t("cx.hasFinding", { title: l(f.title) })}
          </button>
        {/each}
        <div class="subject-actions">
          <button class="btn btn-sm" onclick={() => openRef(subject!)}><ExternalLink size={14} />{t("attn.open")}</button>
          <button class="btn btn-sm" onclick={() => openAssistant({ kind: "evidence" }, undefined, [{ kind: subject!.kind, id: subject!.id }])}><MessageSquare size={14} />{t("top.ask")}</button>
          <button class="btn btn-sm" onclick={() => go(`/case/${caseId}/findings?view=board&start=${keyOf(subject!)}`)}><LayoutDashboard size={14} />{t("fx.board")}</button>
        </div>
      </article>

      <section class="results" aria-label={t("cx.most")}>
        <header class="results-head">
          <h2>{t("cx.most")}</h2>
          <span class="count tabular">{ranked.length}</span>
        </header>
        {#if counts.length > 1}
          <div class="filters" role="group" aria-label={t("cx.most")}>
            <button class="chip" aria-pressed={filter === "all"} onclick={() => (filter = "all")}>{t("cx.all")} <span class="tabular">{ranked.length}</span></button>
            {#each counts as x (x.r)}
              <button class="chip" aria-pressed={filter === x.r} onclick={() => (filter = x.r)}>{t(`rel.${x.r}`)} <span class="tabular">{x.n}</span></button>
            {/each}
          </div>
        {/if}
        {#if visible.length}
          <ol class="rows">
            {#each visible as c, i (c.key)}{@render row(c, i + 1)}{/each}
          </ol>
        {:else}
          <p class="empty muted">{t("cx.none")}</p>
        {/if}
        {#if found.maybe.length}
          {#if showMaybe}
            <h3 class="small-head maybe-head">{t("board.maybe")}</h3>
            <ol class="rows maybe">
              {#each found.maybe as c (c.key)}{@render row(c, null)}{/each}
            </ol>
          {:else}
            <button class="link-btn more" onclick={() => (showMaybe = true)}>{t("board.showMaybe", { n: found.maybe.length })}</button>
          {/if}
        {/if}
      </section>
    </div>
  {/if}
</div>

<Overlay open={picker} onclose={() => (picker = false)} variant={wide ? "dialog" : "sheet"} label={t("cx.pickTitle")} width={620}>
  <div class="pick-head">
    <h2 class="t-serif">{t("cx.pickTitle")}</h2>
    <button class="btn btn-ghost btn-icon" aria-label={t("common.close")} onclick={() => (picker = false)}><X size={18} /></button>
  </div>
  <div class="pick-body scroll-y"><ThingPicker {caseId} kinds={["statement", "document"]} onpick={show} /></div>
</Overlay>

<style>
  .cx {
    display: grid;
    gap: 14px;
  }
  .start {
    display: grid;
    gap: 14px;
    padding: 20px;
    border: 1px solid var(--line);
    border-radius: var(--radius-surface);
    background: var(--surface);
    max-width: 760px;
  }
  .start-head {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    color: var(--ink-strong);
  }
  .start-head h2 {
    font-size: 24px;
    line-height: 1.2;
  }
  .topline {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 12px;
  }
  .trail {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 4px;
    min-width: 0;
    color: var(--muted);
  }
  .crumb {
    max-width: 240px;
    padding: 4px 8px;
    border-radius: var(--radius-control);
    font-size: 13px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .crumb:hover {
    background: var(--sunken);
    color: var(--ink-strong);
  }
  .crumb[aria-current="location"] {
    color: var(--ink-strong);
    font-weight: 600;
  }
  .layout {
    display: grid;
    gap: 16px;
    align-items: start;
  }
  .layout.wide {
    grid-template-columns: minmax(280px, 380px) minmax(0, 1fr);
  }
  .subject {
    display: grid;
    gap: 12px;
    padding: 18px;
    border: 1px solid var(--line);
    border-radius: var(--radius-surface);
    background: var(--surface-2);
  }
  .wide .subject {
    position: sticky;
    top: calc(var(--topbar-h) + 12px);
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
    color: var(--muted);
    min-width: 0;
  }
  .meta strong {
    font-weight: 600;
    color: var(--ink);
  }
  .quote {
    font-size: 18px;
    font-weight: 500;
    line-height: 1.45;
    margin: 0;
    color: var(--ink-strong);
  }
  .quote.doc-text {
    font-weight: 400;
  }
  .doc-title {
    font-size: 24px;
    line-height: 1.2;
  }
  .small-head {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--muted);
  }
  .passages ul {
    display: grid;
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
    border-top: 1px solid var(--line);
  }
  .passages li button {
    display: grid;
    grid-template-columns: 52px minmax(0, 1fr);
    gap: 8px;
    width: 100%;
    padding: 8px 2px;
    border-bottom: 1px solid var(--line);
    text-align: left;
    font-size: 13px;
    color: var(--ink-strong);
  }
  .passages li button:hover {
    background: var(--sunken);
  }
  .passages .tabular {
    color: var(--muted);
  }
  .note {
    padding: 8px 10px;
    border-radius: var(--radius-control);
    background: var(--st-context-bg, var(--sunken));
    border: 1px solid var(--line);
    font-size: 13px;
    text-align: left;
    color: var(--ink-strong);
  }
  .note.loud {
    background: color-mix(in srgb, var(--alert) 12%, var(--surface));
    border-color: color-mix(in srgb, var(--alert) 35%, var(--line));
  }
  .subject-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .results {
    display: grid;
    gap: 10px;
    min-width: 0;
  }
  .results-head {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .results-head h2 {
    font-size: 15px;
    font-weight: 600;
    color: var(--ink-strong);
  }
  .count {
    font-size: 13px;
    color: var(--muted);
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .rows {
    display: grid;
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--line);
  }
  .row {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr) auto;
    gap: 6px 12px;
    align-items: start;
    padding: 14px 4px;
    border-bottom: 1px solid var(--line);
  }
  .rank {
    font-family: var(--font-serif);
    font-size: 20px;
    line-height: 1.1;
    color: var(--muted);
    text-align: right;
  }
  .row-main {
    display: grid;
    gap: 6px;
    min-width: 0;
  }
  .text {
    font-size: 14.5px;
    line-height: 1.55;
    color: var(--ink-strong);
  }
  .why {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 10px;
    font-size: 12.5px;
    color: var(--muted);
  }
  .why-text {
    min-width: 0;
  }
  .row-actions {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }
  @container main (max-width: 700px) {
    .row {
      grid-template-columns: 24px minmax(0, 1fr);
    }
    .row-actions {
      grid-column: 2;
      flex-direction: row;
      flex-wrap: wrap;
    }
  }
  /* On narrow screens the subject stays compact so the ranked list starts sooner. */
  .layout:not(.wide) .subject {
    gap: 10px;
    padding: 14px;
  }
  .layout:not(.wide) .quote {
    font-size: 17px;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .layout:not(.wide) .note {
    padding: 6px 10px;
  }
  .maybe-head {
    margin-top: 6px;
  }
  .rows.maybe .row {
    opacity: 0.92;
  }
  .more {
    justify-self: start;
  }
  .empty {
    padding: 14px 4px;
    font-size: 13.5px;
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
