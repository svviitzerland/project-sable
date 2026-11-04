<script lang="ts">
  import { AudioLines, Mic, Plus, Search, ShieldCheck } from "@lucide/svelte";
  import HearingRow from "../components/HearingRow.svelte";
  import { l, t } from "../lib/i18n";
  import { findingsOf, hearingsOf, statementsOf, ui } from "../lib/store.svelte";

  let { caseId }: { caseId: string } = $props();

  let query = $state("");
  let needsReview = $state(false);
  let all = $derived(hearingsOf(caseId));

  // Search covers titles, dates and transcript phrases, like the product's hearing library.
  let rows = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((h) => !needsReview || findingsOf(h.id).some((f) => !f.reviewed))
      .map((h) => {
        if (!q) return { h, match: "" };
        if (`${l(h.title)} ${h.date}`.toLowerCase().includes(q)) return { h, match: "" };
        const s = statementsOf(h.id).find((x) => x.text.toLowerCase().includes(q));
        return s ? { h, match: s.text } : null;
      })
      .filter((x): x is { h: (typeof all)[number]; match: string } => !!x)
      .reverse();
  });
</script>

<div class="page">
  <header class="page-head">
    <div>
      <h1>{t("hearings.title")}</h1>
      <p>{t("hearings.lead")}</p>
    </div>
    <div class="toolbar">
      <button class="btn btn-live" onclick={() => (ui.modal = { kind: "newHearing", flow: "live" })}><Mic size={16} />{t("nh.live")}</button>
      <button class="btn btn-primary" onclick={() => (ui.modal = { kind: "newHearing" })}><Plus size={16} />{t("hearings.new")}</button>
    </div>
  </header>

  {#if all.length === 0}
    <section class="empty">
      <span class="empty-icon"><AudioLines size={22} /></span>
      <h2 class="t-serif">{t("hearings.emptyTitle")}</h2>
      <p class="muted">{t("hearings.emptyText")}</p>
      <button class="btn btn-primary" onclick={() => (ui.modal = { kind: "newHearing" })}><Plus size={16} />{t("hearings.new")}</button>
    </section>
  {:else}
    <div class="filters">
      <div class="search grow">
        <Search size={16} />
        <label class="sr-only" for="hearing-search">{t("hearings.search")}</label>
        <input id="hearing-search" class="field" type="search" placeholder={t("hearings.search")} bind:value={query} />
      </div>
      <button class="chip" aria-pressed={needsReview} onclick={() => (needsReview = !needsReview)}><ShieldCheck size={14} />{t("hearings.needsReview")}</button>
      <span class="small muted tabular" role="status">{t("hearings.shownOf", { shown: rows.length, total: all.length })}</span>
    </div>

    <div class="list">
      {#each rows as row (row.h.id)}
        <HearingRow h={row.h} match={row.match} />
      {:else}
        <div class="none">
          <p>{t("hearings.noMatch")}</p>
          <button class="btn btn-sm" onclick={() => { query = ""; needsReview = false; }}>{t("common.clearFilters")}</button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  .grow {
    flex: 1 1 280px;
  }
  .list {
    border-top: 1px solid var(--line);
  }
  .none {
    display: grid;
    justify-items: start;
    gap: 10px;
    padding: 28px 4px;
  }
  .empty {
    display: grid;
    justify-items: center;
    text-align: center;
    gap: 10px;
    padding: 48px 16px;
    border: 1.5px dashed var(--line-strong);
    border-radius: var(--radius-surface);
  }
  .empty h2 {
    font-size: 26px;
  }
  .empty-icon {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--selected);
  }
</style>
