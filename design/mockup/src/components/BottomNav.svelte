<script lang="ts">
  import { kindIcon } from "../lib/kinds";
  import { t } from "../lib/i18n";
  import { live } from "../lib/live.svelte";
  import { href, route } from "../lib/router.svelte";
  import { findingsOfCase, hearing, needsLook } from "../lib/store.svelte";

  let { caseId }: { caseId: string } = $props();

  let section = $derived(route.parts[2] ?? "overview");
  let toReview = $derived(findingsOfCase(caseId).filter(needsLook).length);
  let liveHere = $derived(hearing(live.hearingId)?.caseId === caseId && live.status !== "idle");
  let items = $derived([
    { key: "overview", icon: kindIcon.overview, label: t("nav.overview"), path: `/case/${caseId}` },
    { key: "hearings", icon: kindIcon.hearing, label: t("nav.hearings"), path: `/case/${caseId}/hearings` },
    { key: "evidence", icon: kindIcon.document, label: t("nav.evidence"), path: `/case/${caseId}/evidence` },
    { key: "findings", icon: kindIcon.finding, label: t("nav.findings"), path: `/case/${caseId}/findings` },
    { key: "connections", icon: kindIcon.connection, label: t("nav.connections"), path: `/case/${caseId}/connections` },
  ]);
</script>

<!-- Phones: the five case sections sit under the thumb; the assistant is in the top bar. -->
<nav class="bottom" aria-label={t("nav.caseSections")}>
  {#each items as item (item.key)}
    <a class="tab" href={href(item.path)} aria-current={section === item.key ? "page" : undefined}>
      <span class="icon">
        <item.icon size={21} strokeWidth={1.75} />
        {#if item.key === "hearings" && liveHere}<span class="live-dot badge-pos"></span>{/if}
        {#if item.key === "findings" && toReview}<span class="count">{toReview}</span>{/if}
      </span>
      <span class="label">{item.label}</span>
    </a>
  {/each}
</nav>

<style>
  .bottom {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    height: calc(var(--bottomnav-h) + var(--safe-bottom));
    padding-bottom: var(--safe-bottom);
    background: var(--surface);
    border-top: 1px solid var(--line);
  }
  .tab {
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 3px;
    color: var(--muted);
    text-decoration: none;
    font-size: 11px;
    font-weight: 600;
    min-height: 44px;
  }
  .tab[aria-current="page"] {
    color: var(--ink-strong);
  }
  .tab[aria-current="page"] .icon {
    background: var(--selected);
  }
  .icon {
    position: relative;
    display: grid;
    place-items: center;
    width: 54px;
    height: 30px;
    border-radius: 15px;
  }
  .label {
    white-space: nowrap;
  }
  .count {
    position: absolute;
    top: -3px;
    right: 6px;
    min-width: 17px;
    height: 17px;
    padding: 0 4px;
    border-radius: 9px;
    background: var(--st-inconsistency-dot);
    color: #fff;
    font-size: 10px;
    display: grid;
    place-items: center;
  }
  .badge-pos {
    position: absolute;
    top: 3px;
    right: 12px;
  }
</style>
