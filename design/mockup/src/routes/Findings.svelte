<script lang="ts">
  import { LayoutDashboard, List, ListChecks, Search } from "@lucide/svelte";
  import { untrack } from "svelte";
  import AlertCard from "../components/AlertCard.svelte";
  import FindingDetail from "../components/FindingDetail.svelte";
  import FindingsBoard from "../components/FindingsBoard.svelte";
  import { getBoard } from "../lib/board.svelte";
  import { l, t } from "../lib/i18n";
  import { go, route } from "../lib/router.svelte";
  import { finding, findingsOfCase, hearing, hearingsOf, inspect, isMeaningful, setReviewed, statement, toastT, ui } from "../lib/store.svelte";

  /**
   * One queue for every hearing, split by what it asks of the lawyer: worth a look, already
   * checked, and others (supported or without enough evidence), which never ask for anything.
   * The board view is the lawyer's own arrangement of findings and what stands behind them.
   */
  let { caseId, selectedId }: { caseId: string; selectedId?: string } = $props();

  type Tab = "attention" | "checked" | "others";
  let width = $state(0);
  let wide = $derived(width >= 760);
  let query = $state("");
  let hearingFilter = $state("");
  // svelte-ignore state_referenced_locally
  let tab = $state<Tab>(route.query.tab === "checked" || route.query.tab === "others" ? route.query.tab : "attention");

  let view = $derived<"list" | "board">(route.query.view === "board" ? "board" : "list");
  let cards = $derived(getBoard(caseId).cards.length);
  let all = $derived(findingsOfCase(caseId));
  let groups = $derived({
    attention: all.filter((f) => isMeaningful(f) && !f.reviewed),
    checked: all.filter((f) => isMeaningful(f) && f.reviewed),
    others: all.filter((f) => !isMeaningful(f)),
  });
  let shown = $derived(
    groups[tab].filter((f) => {
      if (hearingFilter && f.hearingId !== hearingFilter) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return `${l(f.title)} ${statement(f.statementId)?.text ?? ""} ${f.note}`.toLowerCase().includes(q);
    }),
  );
  let queue = $derived(shown.map((f) => f.id));
  let selected = $derived(selectedId && finding(selectedId) ? selectedId : null);

  // Wide screens keep the first item open beside the list.
  $effect(() => {
    if (!wide || view === "board") return;
    const first = untrack(() => shown[0]);
    const current = untrack(() => selected);
    if (first && (!current || !queue.includes(current))) go(`/case/${caseId}/findings/${first.id}`);
  });

  function open(id: string) {
    if (wide) go(`/case/${caseId}/findings/${id}`);
    else inspect({ kind: "finding", id }, queue);
  }

  function step(delta: number) {
    const i = selected ? queue.indexOf(selected) : -1;
    const next = queue[Math.max(0, Math.min(queue.length - 1, i + delta))];
    if (next) open(next);
  }

  function onkeydown(event: KeyboardEvent) {
    if (view === "board") return;
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
      <h1>{view === "board" ? t("board.title") : t("fd.title")}</h1>
      <p>{view === "board" ? t("board.lead") : t("fd.lead2")}</p>
    </div>
    <div class="seg view-switch" role="tablist" aria-label={t("fd.title")}>
      <button role="tab" aria-selected={view === "list"} onclick={() => go(`/case/${caseId}/findings`)}><List size={15} />{t("board.list")}</button>
      <button role="tab" aria-selected={view === "board"} onclick={() => go(`/case/${caseId}/findings?view=board`)}><LayoutDashboard size={15} />{t("board.tab")} {#if cards}<span class="badge">{cards}</span>{/if}</button>
    </div>
  </header>

  {#if view === "board"}
    <FindingsBoard {caseId} start={route.query.start} />
  {:else}

  <div class="filters">
    <div class="seg" role="tablist" aria-label={t("fd.title")}>
      <button role="tab" aria-selected={tab === "attention"} onclick={() => (tab = "attention")}><span class="bang" aria-hidden="true">!</span>{t("attn.title")} <span class="badge" class:badge-amber={groups.attention.length > 0}>{groups.attention.length}</span></button>
      <button role="tab" aria-selected={tab === "checked"} onclick={() => (tab = "checked")}>{t("attn.done")} <span class="badge">{groups.checked.length}</span></button>
      <button role="tab" aria-selected={tab === "others"} onclick={() => (tab = "others")}>{t("attn.others")} <span class="badge">{groups.others.length}</span></button>
    </div>
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
  </div>
  {#if tab === "others"}<p class="notice others-hint">{t("attn.othersHint")}</p>{/if}

  <div class="body" class:wide>
    <section class="list" aria-label={t("fd.title")}>
      {#each shown as f, i (f.id)}
        {@const h = hearing(f.hearingId)}
        {#if i === 0 || shown[i - 1].hearingId !== f.hearingId}
          <h2 class="group">{h ? `${t("common.hearingN", { n: h.number })} · ${l(h.title)}` : ""}</h2>
        {/if}
        <div class="item" class:selected={wide && selected === f.id}>
          <AlertCard {f} mode="compact" onopen={() => open(f.id)} />
        </div>
      {:else}
        <div class="empty">
          <ListChecks size={22} />
          <p class="t-serif">{tab === "attention" ? t("attn.allChecked") : t("fd.emptyTitle")}</p>
          {#if query || hearingFilter}
            <button class="btn btn-sm" onclick={() => { query = ""; hearingFilter = ""; }}>{t("common.clearFilters")}</button>
          {/if}
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
  {/if}
</div>

<style>
  .findings {
    max-width: 1500px;
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 10px;
    margin-bottom: 12px;
  }
  .bang {
    display: inline-grid;
    place-items: center;
    width: 17px;
    height: 17px;
    border-radius: 50%;
    background: var(--alert);
    color: #fff;
    font-size: 11px;
    font-weight: 800;
  }
  .grow {
    flex: 1 1 220px;
  }
  .hearing-select {
    width: auto;
    flex: 0 1 280px;
  }
  .others-hint {
    margin-bottom: 12px;
  }
  .body {
    display: grid;
    gap: 14px;
  }
  .body.wide {
    grid-template-columns: minmax(280px, 380px) minmax(0, 1fr);
    align-items: start;
  }
  .list {
    display: grid;
    gap: 8px;
    align-content: start;
  }
  .wide .list,
  .detail {
    position: sticky;
    top: calc(var(--topbar-h) + 12px);
    max-height: calc(100dvh - var(--topbar-h) - 24px);
    overflow-y: auto;
  }
  .group {
    padding: 6px 2px 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
  }
  .item.selected :global(.compact) {
    border-color: var(--ink-strong);
    box-shadow: 0 0 0 1px var(--ink-strong);
    background: var(--selected);
  }
  .empty {
    display: grid;
    justify-items: start;
    gap: 8px;
    padding: 24px 4px;
  }
  .empty .t-serif {
    font-size: 20px;
  }
</style>
