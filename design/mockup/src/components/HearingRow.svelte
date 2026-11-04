<script lang="ts">
  import { ArrowRight, AudioLines, CalendarClock, FileText, Mic } from "@lucide/svelte";
  import { fmtClock, fmtDate, fmtDuration, l, t } from "../lib/i18n";
  import { live } from "../lib/live.svelte";
  import { href } from "../lib/router.svelte";
  import { findingsOf, statementsOf, ui } from "../lib/store.svelte";
  import type { Hearing } from "../lib/types";

  let { h, compact = false, match = "" }: { h: Hearing; compact?: boolean; match?: string } = $props();

  let findings = $derived(findingsOf(h.id));
  let open = $derived(findings.filter((f) => !f.reviewed).length);
  let count = $derived(statementsOf(h.id).length);
  let isLiveNow = $derived(h.mode === "live" && live.hearingId === h.id && live.status !== "idle");
  const icons = { live: Mic, recorded: AudioLines, imported: FileText, scheduled: CalendarClock };
  let Icon = $derived(icons[h.mode]);
</script>

<div class="hrow" class:compact class:live={isLiveNow}>
  <span class="icon" class:live-icon={isLiveNow} aria-hidden="true"><Icon size={18} strokeWidth={1.75} /></span>
  <a class="main" href={href(`/case/${h.caseId}/hearings/${h.id}`)}>
    <span class="title">
      <span class="num">{t("common.hearingN", { n: h.number })}</span>
      <span class="t-serif name">{l(h.title)}</span>
    </span>
    <span class="meta">
      {#if isLiveNow}
        <span class="live-tag"><span class="live-dot"></span>{t("live.badge")} · <span class="tabular">{fmtClock(live.elapsed)}</span></span>
      {:else}
        <span>{fmtDate(h.date)}{h.time ? ` · ${h.time}` : ""}</span>
        <span>· {t(`mode.${h.mode}`)}</span>
      {/if}
      {#if h.duration && !isLiveNow}<span>· {fmtDuration(h.duration)}</span>{/if}
      {#if count}<span>· {t("common.statements", { n: count })}</span>{/if}
    </span>
    {#if match}<span class="match clamp-2">{t("hearings.matchIn", { text: match })}</span>{/if}
  </a>
  <span class="status">
    {#if h.mode === "scheduled"}
      {#if !compact}
        <button class="btn btn-sm" onclick={() => (ui.modal = { kind: "newHearing", flow: "live", hearingId: h.id })}><Mic size={14} />{t("hearings.startNow")}</button>
      {/if}
    {:else if isLiveNow}
      <a class="btn btn-sm btn-live" href={href(`/case/${h.caseId}/hearings/${h.id}`)}>{t("hearings.returnLive")}<ArrowRight size={14} /></a>
    {:else if findings.length === 0}
      <span class="tag">{t("hearings.noFindings")}</span>
    {:else if open}
      <span class="badge badge-amber">{t("common.toReview", { n: open })}</span>
    {:else}
      <span class="tag">{t("hearings.allReviewed")}</span>
    {/if}
  </span>
</div>

<style>
  .hrow {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    padding: 14px 4px;
    border-bottom: 1px solid var(--line);
  }
  .hrow.compact {
    padding: 10px 0;
    gap: 10px;
  }
  .icon {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--sunken);
    color: var(--muted);
  }
  .live-icon {
    background: var(--live-soft);
    color: var(--live);
  }
  .main {
    display: grid;
    gap: 3px;
    text-decoration: none;
    min-width: 0;
  }
  .main:hover .name {
    text-decoration: underline;
    text-decoration-color: var(--line-strong);
  }
  .title {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 10px;
  }
  .num {
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
    white-space: nowrap;
  }
  .name {
    font-size: 19px;
    line-height: 1.25;
  }
  .compact .name {
    font-size: 16px;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0 5px;
    font-size: 12px;
    color: var(--muted);
  }
  .live-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    color: var(--live);
  }
  .match {
    font-size: 12px;
    color: var(--ink);
    background: var(--mark);
    padding: 2px 6px;
    border-radius: 3px;
    width: fit-content;
  }
  .status {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }
  @container main (max-width: 520px) {
    .hrow {
      grid-template-columns: auto minmax(0, 1fr);
    }
    .status {
      grid-column: 2;
      justify-content: flex-start;
    }
  }
</style>
