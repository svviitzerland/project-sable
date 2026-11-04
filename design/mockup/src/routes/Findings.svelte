<script lang="ts">
  import { ListChecks, Search, ShieldCheck, SkipForward } from "@lucide/svelte";
  import { untrack } from "svelte";
  import FindingDetail from "../components/FindingDetail.svelte";
  import FindingRow from "../components/FindingRow.svelte";
  import { l, t } from "../lib/i18n";
  import { go, route } from "../lib/router.svelte";
  import { finding, findingsOfCase, hearing, hearingsOf, inspect, setReviewed, statement, toastT, ui } from "../lib/store.svelte";
  import type { Status } from "../lib/types";

  let { caseId, selectedId }: { caseId: string; selectedId?: string } = $props();

  const statuses: Status[] = ["potential_inconsistency", "context_needed", "insufficient_evidence", "supported"];

  let width = $state(0);
  let wide = $derived(width >= 760);
  let query = $state("");
  // svelte-ignore state_referenced_locally
  let needsReview = $state(route.query.review === "1");
  let statusFilter = $state<Status[]>([]);
  let hearingFilter = $state("");

  let all = $derived(findingsOfCase(caseId));
  let reviewed = $derived(all.filter((f) => f.reviewed).length);
  let shown = $derived(
    all.filter((f) => {
      if (needsReview && f.reviewed) return false;
      if (statusFilter.length && !statusFilter.includes(f.status)) return false;
      if (hearingFilter && f.hearingId !== hearingFilter) return false;
      const q = query.trim().toLowerCase();
      if (q) {
        const text = `${l(f.title)} ${l(f.explanation)} ${statement(f.statementId)?.text ?? ""} ${f.note}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    }),
  );
  let queue = $derived(shown.map((f) => f.id));
  let groups = $derived.by(() => {
    const out: { hearingId: string; items: typeof shown }[] = [];
    for (const f of shown) {
      const last = out.at(-1);
      if (last && last.hearingId === f.hearingId) last.items.push(f);
      else out.push({ hearingId: f.hearingId, items: [f] });
    }
    return out;
  });

  // Wide screens keep a finding selected beside the list; the route remembers it.
  let selected = $derived(selectedId && finding(selectedId) ? selectedId : null);
  $effect(() => {
    if (!wide || selected) return;
    const first = untrack(() => shown.find((f) => !f.reviewed) ?? shown[0]);
    if (first) go(`/case/${caseId}/findings/${first.id}${needsReview ? "?review=1" : ""}`);
  });

  function open(id: string) {
    if (wide) go(`/case/${caseId}/findings/${id}${needsReview ? "?review=1" : ""}`);
    else inspect({ kind: "finding", id }, queue);
  }

  function step(delta: number) {
    const i = selected ? queue.indexOf(selected) : -1;
    const next = queue[Math.max(0, Math.min(queue.length - 1, i + delta))];
    if (next) open(next);
  }

  function nextUnreviewed() {
    const start = selected ? all.findIndex((f) => f.id === selected) : -1;
    const ordered = [...all.slice(start + 1), ...all.slice(0, start + 1)];
    const next = ordered.find((f) => !f.reviewed);
    if (next) open(next.id);
  }

  function toggleStatus(s: Status) {
    statusFilter = statusFilter.includes(s) ? statusFilter.filter((x) => x !== s) : [...statusFilter, s];
  }

  function onkeydown(event: KeyboardEvent) {
    const el = event.target as HTMLElement;
    if (ui.modal || ui.inspector || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === "j") step(1);
    else if (key === "k") step(-1);
    else if (key === "r" && selected) {
      const f = finding(selected);
      if (f) setReviewed(f, !f.reviewed);
    } else if (key === "c" && selected) {
      void navigator.clipboard?.writeText(finding(selected)?.question ?? "").catch(() => {});
      toastT("toast.copied");
    } else return;
    event.preventDefault();
  }
</script>

<svelte:window {onkeydown} />

<div class="page findings" bind:clientWidth={width}>
  <header class="page-head">
    <div>
      <h1>{t("fd.title")}</h1>
      <p>{t("fd.lead")}</p>
    </div>
    <div class="progress">
      <span class="small tabular">{t("common.reviewedOf", { done: reviewed, total: all.length })}</span>
      <span class="meter" aria-hidden="true"><span style:width="{all.length ? (reviewed / all.length) * 100 : 0}%"></span></span>
      <button class="btn" disabled={reviewed === all.length} onclick={nextUnreviewed}><SkipForward size={15} />{t("hv.nextUnreviewed")}</button>
    </div>
  </header>

  <div class="filters">
    <div class="search grow">
      <Search size={16} />
      <label class="sr-only" for="f-search">{t("fd.search")}</label>
      <input id="f-search" class="field" type="search" placeholder={t("fd.search")} bind:value={query} />
    </div>
    <label class="sr-only" for="f-hearing">{t("fd.allHearings")}</label>
    <select id="f-hearing" class="field hearing-select" bind:value={hearingFilter}>
      <option value="">{t("fd.allHearings")}</option>
      {#each hearingsOf(caseId).filter((h) => all.some((f) => f.hearingId === h.id)) as h (h.id)}
        <option value={h.id}>{t("common.hearingN", { n: h.number })} · {l(h.title)}</option>
      {/each}
    </select>
    <button class="chip" aria-pressed={needsReview} onclick={() => (needsReview = !needsReview)}><ShieldCheck size={14} />{t("fd.needsReview")}</button>
  </div>
  <div class="status-filters" role="group" aria-label="Status">
    {#each statuses as s (s)}
      {@const n = all.filter((f) => f.status === s && (!needsReview || !f.reviewed)).length}
      <button class="chip status-chip" data-status={s} aria-pressed={statusFilter.includes(s)} onclick={() => toggleStatus(s)}>
        <span class="dot" aria-hidden="true"></span>{t(`status.${s}`)} <span class="count">{n}</span>
      </button>
    {/each}
    <span class="small muted tabular" role="status">{t("fd.shownOf", { shown: shown.length, total: all.length })}</span>
  </div>

  <div class="body" class:wide>
    <section class="pane list" aria-label={t("fd.title")}>
      {#each groups as g (g.hearingId)}
        {@const h = hearing(g.hearingId)}
        <h2 class="group">{h ? `${t("common.hearingN", { n: h.number })} · ${l(h.title)}` : ""}</h2>
        {#each g.items as f (f.id)}
          <FindingRow {f} showHearing={false} selected={wide && selected === f.id} onclick={() => open(f.id)} />
        {/each}
      {:else}
        <div class="empty">
          <ListChecks size={22} />
          <p class="t-serif">{all.length && reviewed === all.length && needsReview ? t("fd.queueDone") : t("fd.emptyTitle")}</p>
          <p class="small muted">{t("fd.emptyText")}</p>
          <button class="btn btn-sm" onclick={() => { query = ""; statusFilter = []; hearingFilter = ""; needsReview = false; }}>{t("common.clearFilters")}</button>
        </div>
      {/each}
    </section>
    {#if wide}
      <section class="pane detail scroll-y" aria-label={t("hv.findings")}>
        {#if selected}
          {@const i = queue.indexOf(selected)}
          <FindingDetail id={selected} nav={i >= 0 ? { index: i, total: queue.length, prev: () => step(-1), next: () => step(1) } : undefined} />
        {:else}
          <p class="empty small muted">{t("fd.select")}</p>
        {/if}
      </section>
    {/if}
  </div>
</div>

<style>
  .findings {
    max-width: 1500px;
  }
  .progress {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    min-width: min(100%, 360px);
  }
  .meter {
    flex: 1 1 80px;
    height: 6px;
    border-radius: 3px;
    background: var(--sunken);
    overflow: hidden;
  }
  .meter span {
    display: block;
    height: 100%;
    background: var(--st-supported-dot);
    transition: width 0.3s;
  }
  .filters,
  .status-filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }
  .grow {
    flex: 1 1 240px;
  }
  .hearing-select {
    width: auto;
    flex: 0 1 300px;
  }
  .status-chip .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }
  [data-status="potential_inconsistency"] .dot { background: var(--st-inconsistency-dot); border-radius: 1px; transform: rotate(45deg); }
  [data-status="supported"] .dot { background: var(--st-supported-dot); }
  [data-status="context_needed"] .dot { border: 2px solid var(--st-context-dot); }
  [data-status="insufficient_evidence"] .dot { background: var(--st-insufficient-dot); height: 2px; }
  .status-chip[aria-pressed="true"] .dot {
    background: currentColor;
    border-color: currentColor;
  }
  .body {
    display: grid;
    gap: 14px;
    margin-top: 6px;
  }
  .body.wide {
    grid-template-columns: minmax(280px, 380px) minmax(0, 1fr);
    align-items: start;
  }
  .list {
    overflow: hidden;
  }
  .wide .list,
  .detail {
    position: sticky;
    top: calc(var(--topbar-h) + 12px);
    max-height: calc(100dvh - var(--topbar-h) - 24px);
    overflow-y: auto;
  }
  .group {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 8px 14px;
    background: var(--surface-2);
    border-bottom: 1px solid var(--line);
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
  }
  .empty {
    display: grid;
    justify-items: start;
    gap: 8px;
    padding: 24px 16px;
  }
  .empty .t-serif {
    font-size: 20px;
  }
</style>
