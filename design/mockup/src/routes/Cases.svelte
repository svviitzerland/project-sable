<script lang="ts">
  import KindIcon from "../components/KindIcon.svelte";
  import { ArrowRight, FlaskConical, Plus, Search } from "@lucide/svelte";
  import { fmtDate, l, t } from "../lib/i18n";
  import { live } from "../lib/live.svelte";
  import { go, href } from "../lib/router.svelte";
  import { db, docsOf, findingsOfCase, hearing, hearingsOf, ui } from "../lib/store.svelte";

  let query = $state("");
  let visible = $derived(
    db.cases.filter((c) => `${c.title} ${c.reference}`.toLowerCase().includes(query.trim().toLowerCase())),
  );
</script>

<div class="page">
  <div class="mock-banner">
    <FlaskConical size={16} />
    <span>{t("cases.mockNote")}</span>
    <button class="link-btn" onclick={() => go("/map")}>{t("nav.featureMap")}<ArrowRight size={14} /></button>
  </div>

  <header class="page-head">
    <div>
      <h1>{t("cases.title")}</h1>
      <p>{t("cases.lead")}</p>
    </div>
    <div class="toolbar">
      <div class="search">
        <Search size={16} />
        <label class="sr-only" for="case-search">{t("cases.search")}</label>
        <input id="case-search" class="field" type="search" placeholder={t("cases.search")} bind:value={query} />
      </div>
      <button class="btn btn-primary" onclick={() => (ui.modal = { kind: "newCase" })}><Plus size={16} />{t("nav.newCase")}</button>
    </div>
  </header>

  <ul class="grid">
    {#each visible as c (c.id)}
      {@const hs = hearingsOf(c.id).filter((h) => h.mode !== "scheduled")}
      {@const open = findingsOfCase(c.id).filter((f) => !f.reviewed).length}
      {@const docs = docsOf(c.id).length}
      {@const liveHere = hearing(live.hearingId)?.caseId === c.id && live.status !== "idle"}
      <li>
        <a class="card case" href={href(`/case/${c.id}`)}>
          <span class="top">
            <span class="case-kind"><KindIcon kind="case" size={18} /><span class="tag">{t(`label.${c.label}`)}</span></span>
            {#if liveHere}<span class="live"><span class="live-dot"></span>{t("cases.liveNow")}</span>{/if}
          </span>
          <span class="t-title name">{c.title}</span>
          <span class="ref small muted">{c.reference || "—"}</span>
          <span class="summary small clamp-2">{l(c.summary)}</span>
          <span class="stats">
            <span class="stat"><KindIcon kind="hearing" size={15} />{t("common.hearings", { n: hs.length })}</span>
            <span class="stat"><KindIcon kind="document" size={15} />{t("common.documents", { n: docs })}</span>
            {#if open}<span class="badge badge-amber stat"><KindIcon kind="finding" size={13} />{t("common.toReview", { n: open })}</span>{/if}
          </span>
          <span class="xsmall muted">{t("cases.updated", { date: fmtDate(c.updated) })}</span>
        </a>
      </li>
    {:else}
      <li class="muted">{t("cases.none")}</li>
    {/each}
  </ul>
</div>

<style>
  .mock-banner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    padding: 10px 14px;
    margin-bottom: 24px;
    border: 1px dashed #a99be0;
    border-radius: var(--radius-action);
    color: var(--ink);
    font-size: var(--text-sm);
    background: color-mix(in srgb, #a99be0 10%, transparent);
  }
  .mock-banner > span {
    flex: 1;
  }
  .grid {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
  }
  .case {
    display: grid;
    gap: 8px;
    padding: 18px;
    height: 100%;
    text-decoration: none;
    align-content: start;
    transition: border-color 0.15s, background-color 0.15s;
  }
  .case:hover {
    border-color: var(--line-strong);
    background: var(--surface-2);
  }
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .live {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    color: var(--live);
  }
  .name {
    font-size: 23px;
  }
  .ref {
    margin-top: -6px;
  }
  .summary {
    color: var(--ink);
  }
  .case-kind {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
  }
  .stat {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .stats :global(svg) {
    color: var(--muted);
  }
  .stats {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 14px;
    padding-top: 10px;
    border-top: 1px solid var(--line);
    font-size: var(--text-sm);
    color: var(--ink-strong);
  }
  .search {
    min-width: min(280px, 100%);
  }
</style>
