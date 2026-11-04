<script lang="ts">
  import { Check, NotebookPen } from "@lucide/svelte";
  import { fmtClock, l, t } from "../lib/i18n";
  import { hearing, statement } from "../lib/store.svelte";
  import type { Finding } from "../lib/types";
  import StatusChip from "./StatusChip.svelte";

  let {
    f,
    selected = false,
    onclick,
    showHearing = true,
    quote = true,
  }: { f: Finding; selected?: boolean; onclick: () => void; showHearing?: boolean; quote?: boolean } = $props();

  let st = $derived(statement(f.statementId));
  let h = $derived(hearing(f.hearingId));
</script>

<button class="frow" class:selected class:reviewed={f.reviewed} class:fresh={f.isNew} aria-current={selected ? "true" : undefined} {onclick}>
  <span class="top">
    <StatusChip status={f.status} size="sm" />
    {#if f.isNew}<span class="new">{t("live.newFinding")}</span>{/if}
    <span class="meta tabular">
      {#if showHearing && h}{t("common.hearingN", { n: h.number })} · {/if}{st ? fmtClock(st.t) : ""}
    </span>
    {#if f.note}<span class="ind" title={t("fx.note")}><NotebookPen size={13} /></span>{/if}
    {#if f.reviewed}<span class="ind done" title={t("fx.reviewedByYou")}><Check size={14} /></span>{/if}
  </span>
  <span class="title clamp-2">{l(f.title)}</span>
  {#if quote && st}<span class="quote clamp-2">“{st.text}”</span>{/if}
</button>

<style>
  .frow {
    display: grid;
    gap: 6px;
    width: 100%;
    padding: var(--row-pad) 14px;
    text-align: left;
    border-bottom: 1px solid var(--line);
    border-radius: var(--radius-control);
    background: transparent;
  }
  .frow:hover {
    background: var(--surface-2);
  }
  .frow.selected {
    background: var(--selected);
  }
  .frow.fresh:not(.selected) {
    background: color-mix(in srgb, var(--st-inconsistency-bg) 35%, transparent);
  }
  .top {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .new {
    font-size: 10.5px;
    font-weight: 700;
    color: var(--live);
    letter-spacing: 0.02em;
  }
  .meta {
    margin-left: auto;
    font-size: 11.5px;
    color: var(--muted);
    white-space: nowrap;
  }
  .ind {
    display: grid;
    place-items: center;
    color: var(--muted);
  }
  .ind.done {
    color: var(--st-supported-ink);
  }
  .title {
    font-size: var(--text);
    font-weight: 500;
    color: var(--ink-strong);
    line-height: 1.4;
  }
  .reviewed .title {
    color: var(--ink);
    font-weight: 400;
  }
  .quote {
    font-size: 12.5px;
    color: var(--muted);
    font-style: italic;
  }
</style>
