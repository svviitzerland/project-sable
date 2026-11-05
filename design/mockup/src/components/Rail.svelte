<script lang="ts">
  import { PanelLeftClose, PanelLeftOpen } from "@lucide/svelte";
  import { kindIcon } from "../lib/kinds";
  import KindIcon from "./KindIcon.svelte";
  import { t } from "../lib/i18n";
  import { live } from "../lib/live.svelte";
  import { prefs } from "../lib/prefs.svelte";
  import { href, route } from "../lib/router.svelte";
  import { caseById, db, docsOf, findingsOfCase, hearing, needsLook, openAssistant, ui } from "../lib/store.svelte";

  let { caseId, collapsed, canCollapse }: { caseId: string | null; collapsed: boolean; canCollapse: boolean } = $props();

  let record = $derived(caseById(caseId));
  let section = $derived(route.parts[0] === "case" ? (route.parts[2] ?? "overview") : "cases");
  let toReview = $derived(caseId ? findingsOfCase(caseId).filter(needsLook).length : 0);
  let liveHere = $derived(!!caseId && hearing(live.hearingId)?.caseId === caseId && live.status !== "idle");

  let items = $derived(
    caseId
      ? [
          { key: "overview", icon: kindIcon.overview, label: t("nav.overview"), path: `/case/${caseId}`, badge: "" },
          { key: "hearings", icon: kindIcon.hearing, label: t("nav.hearings"), path: `/case/${caseId}/hearings`, badge: "" },
          { key: "documents", icon: kindIcon.document, label: t("nav.documents"), path: `/case/${caseId}/documents`, badge: String(docsOf(caseId).length || "") },
          { key: "findings", icon: kindIcon.finding, label: t("nav.findings"), path: `/case/${caseId}/findings`, badge: toReview ? String(toReview) : "" },
          { key: "connections", icon: kindIcon.connection, label: t("nav.connections"), path: `/case/${caseId}/connections`, badge: "" },
        ]
      : [],
  );
</script>

<nav class="rail" class:collapsed aria-label={t("nav.caseSections")}>
  <a class="brand" href={href("/cases")} aria-label="Jude">
    <span class="wordmark">{collapsed ? "j." : "jude."}</span>
  </a>

  {#if record}
    <a class="case" href={href("/cases")} title={t("top.backToCases")}>
      <span class="avatar" aria-hidden="true"><KindIcon kind="case" size={18} /></span>
      {#if !collapsed}
        <span class="case-text">
          <span class="case-title">{record.title}</span>
          <span class="case-ref">{record.reference || t("label.synthetic")}</span>
        </span>
      {/if}
    </a>
    <ul class="items">
      {#each items as item (item.key)}
        <li>
          <a
            class="item"
            href={href(item.path)}
            aria-current={section === item.key ? "page" : undefined}
            title={collapsed ? item.label : undefined}
          >
            <span class="icon"><item.icon size={19} strokeWidth={1.75} /></span>
            <span class="label">{item.label}</span>
            {#if item.key === "hearings" && liveHere}
              <span class="live-dot" aria-label={t("live.badge")}></span>
            {:else if item.badge && !collapsed}
              <span class="count" class:amber={item.key === "findings"}>{item.badge}</span>
            {:else if item.badge && item.key === "findings"}
              <span class="pip" aria-hidden="true"></span>
            {/if}
          </a>
        </li>
      {/each}
      <li>
        <button class="item" aria-pressed={ui.assistantOpen} onclick={() => (ui.assistantOpen ? (ui.assistantOpen = false) : openAssistant())} title={collapsed ? t("nav.assistant") : undefined}>
          <span class="icon"><KindIcon kind="assistant" size={19} /></span>
          <span class="label">{t("nav.assistant")}</span>
          {#if !collapsed}<span class="kbd-hint" aria-hidden="true">A</span>{/if}
        </button>
      </li>
    </ul>
  {:else}
    <ul class="items">
      <li>
        <a class="item" href={href("/cases")} aria-current={section === "cases" ? "page" : undefined} title={collapsed ? t("nav.cases") : undefined}>
          <span class="icon"><KindIcon kind="case" size={19} /></span>
          <span class="label">{t("nav.cases")}</span>
          {#if !collapsed}<span class="count">{db.cases.length}</span>{/if}
        </a>
      </li>
    </ul>
  {/if}

  <div class="spacer"></div>

  {#if canCollapse}
    <button
      class="item collapse"
      onclick={() => (prefs.railCollapsed = !prefs.railCollapsed)}
      aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
      title={collapsed ? t("nav.expand") : t("nav.collapse")}
    >
      <span class="icon">{#if collapsed}<PanelLeftOpen size={18} />{:else}<PanelLeftClose size={18} />{/if}</span>
      <span class="label">{t("nav.collapse")}</span>
    </button>
  {/if}
  <button class="account" onclick={() => (ui.modal = { kind: "account" })} aria-label={t("acc.title")}>
    <span class="avatar me" aria-hidden="true">A</span>
    {#if !collapsed}
      <span class="case-text">
        <span class="case-title">Advokat Contoh</span>
        <span class="case-ref">Advokat Pro</span>
      </span>
    {/if}
  </button>
</nav>

<style>
  .rail {
    position: sticky;
    top: 0;
    height: 100dvh;
    width: var(--rail-w);
    background: var(--nav);
    color: var(--nav-ink);
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 12px;
    overflow-y: auto;
    scrollbar-width: none;
    z-index: 20;
  }
  .rail.collapsed {
    width: var(--rail-w-collapsed);
    padding-inline: 10px;
    align-items: stretch;
  }
  .brand {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 2px 8px 12px;
    text-decoration: none;
  }
  .collapsed .brand {
    justify-content: center;
    padding-inline: 0;
  }
  .wordmark {
    font-family: var(--font-title);
    font-size: 34px;
    line-height: 1;
  }
  .case,
  .account {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    border-radius: var(--radius-action);
    text-decoration: none;
    text-align: left;
    color: inherit;
    min-width: 0;
  }
  .case {
    background: color-mix(in srgb, var(--nav-ink) 8%, transparent);
    margin-bottom: 8px;
  }
  .case:hover,
  .account:hover {
    background: var(--nav-hover);
  }
  .collapsed .case,
  .collapsed .account {
    justify-content: center;
    padding-inline: 0;
  }
  .avatar {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border-radius: 6px;
    background: var(--nav-ink);
    color: var(--nav);
    font-family: var(--font-title);
    font-size: 17px;
  }
  .avatar.me {
    border-radius: 50%;
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 600;
  }
  .case-text {
    display: grid;
    min-width: 0;
  }
  .case-title {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .case-ref {
    font-size: 11px;
    color: var(--nav-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .items {
    display: grid;
    gap: 2px;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 40px;
    padding: 0 10px;
    border-radius: var(--radius-control);
    color: var(--nav-muted);
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    position: relative;
  }
  .item:hover {
    background: var(--nav-hover);
    color: var(--nav-ink);
  }
  .item[aria-current="page"],
  .item[aria-pressed="true"] {
    background: var(--nav-ink);
    color: var(--nav);
  }
  .icon {
    display: grid;
    place-items: center;
    width: 22px;
  }
  .label {
    flex: 1;
    white-space: nowrap;
  }
  .collapsed .item {
    justify-content: center;
    padding: 0;
    min-height: 46px;
  }
  .collapsed .label {
    display: none;
  }
  .count {
    font-size: 11px;
    font-weight: 600;
    padding: 1px 7px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--nav-ink) 14%, transparent);
    color: inherit;
  }
  .count.amber {
    background: var(--st-inconsistency-bg);
    color: var(--st-inconsistency-ink);
  }
  .pip {
    position: absolute;
    top: 9px;
    right: 13px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--st-inconsistency-dot);
  }
  .collapsed .live-dot {
    position: absolute;
    top: 9px;
    right: 11px;
  }
  .kbd-hint {
    font-size: 10px;
    font-weight: 600;
    opacity: 0.6;
    border: 1px solid currentColor;
    border-radius: 3px;
    padding: 0 4px;
  }
  .spacer {
    flex: 1;
  }
  .collapse {
    color: var(--nav-muted);
  }
  .account {
    border-top: 1px solid var(--nav-line);
    border-radius: 0;
    padding-top: 12px;
    margin-top: 4px;
  }
</style>
