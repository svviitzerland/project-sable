<script lang="ts">
  import KindIcon from "./KindIcon.svelte";
  import type { Kind } from "../lib/kinds";
  import {
    ChevronLeft,
    ChevronRight,
    Download,
    Ellipsis,
    Keyboard,
    LogOut,
    MessageSquare,
    Search,
    Settings,
    UserRound,
  } from "@lucide/svelte";
  import { l, t } from "../lib/i18n";
  import { href, route } from "../lib/router.svelte";
  import { caseById, doc, finding, hearing, openAssistant, toastT, ui } from "../lib/store.svelte";
  import Menu, { type MenuItem } from "./Menu.svelte";

  let { caseId, phone, onsearch }: { caseId: string | null; phone: boolean; onsearch: () => void } = $props();

  let record = $derived(caseById(caseId));

  const sectionKey = {
    overview: "nav.overview",
    hearings: "nav.hearings",
    findings: "nav.findings",
    evidence: "nav.evidence",
  } as const;

  let crumbs = $derived.by(() => {
    const out: { label: string; path?: string; kind: Kind }[] = [];
    if (!record) return out;
    out.push({ label: record.title, path: `/case/${record.id}`, kind: "case" });
    const section = (route.parts[2] ?? "overview") as keyof typeof sectionKey;
    const sectionKind: Record<string, Kind> = { hearings: "hearing", findings: "finding", evidence: "document" };
    if (section !== "overview" && sectionKey[section]) {
      out.push({ label: t(sectionKey[section]), path: `/case/${record.id}/${section}`, kind: sectionKind[section] ?? "case" });
    }
    const sub = route.parts[3];
    if (section === "hearings" && sub) {
      const h = hearing(sub);
      if (h) out.push({ label: `${t("common.hearingN", { n: h.number })} · ${l(h.title)}`, kind: "hearing" });
    } else if (section === "findings" && sub) {
      const f = finding(sub);
      if (f) out.push({ label: l(f.title), kind: "finding" });
    } else if (section === "evidence" && sub === "doc" && route.parts[4]) {
      const d = doc(route.parts[4]);
      if (d) out.push({ label: d.title, kind: "document" });
    }
    return out;
  });

  let menuItems = $derived<MenuItem[]>([
    ...(record
      ? [
          { label: t("top.settings"), icon: Settings, run: () => (ui.modal = { kind: "settings", caseId: record!.id }) },
          { label: t("top.export"), icon: Download, run: () => toastT("toast.exported") },
        ]
      : []),
    { label: t("top.shortcuts"), icon: Keyboard, hint: "?", run: () => (ui.modal = { kind: "shortcuts" }) },
    ...(phone
      ? [
          { label: t("acc.title"), icon: UserRound, run: () => (ui.modal = { kind: "account" }) },
          { label: t("acc.signOut"), icon: LogOut, run: () => toastT("toast.signOut") },
        ]
      : []),
  ]);
</script>

<header class="topbar" class:phone>
  {#if phone}
    {#if record}
      <a class="btn btn-ghost btn-icon" href={href("/cases")} aria-label={t("top.backToCases")}><ChevronLeft size={20} /></a>
      <div class="phone-title">
        <span class="phone-case">{record.title}</span>
        <span class="phone-ref">{record.reference || t("label.synthetic")}</span>
      </div>
    {:else}
      <a class="wordmark" href={href("/cases")}>jude.</a>
      <div class="flex"></div>
    {/if}
  {:else}
    <nav class="crumbs" aria-label="Breadcrumb">
      {#if !record}
        <span class="crumb current">{t("nav.cases")}</span>
      {/if}
      {#each crumbs as crumb, i (i)}
        {#if i > 0}<ChevronRight size={14} class="sep" aria-hidden="true" />{/if}
        {#if crumb.path && i < crumbs.length - 1}
          <a class="crumb" href={href(crumb.path)}><KindIcon kind={crumb.kind} size={14} /><span class="crumb-text">{crumb.label}</span></a>
        {:else}
          <span class="crumb current" aria-current="page"><KindIcon kind={crumb.kind} size={14} /><span class="crumb-text">{crumb.label}</span></span>
        {/if}
      {/each}
    </nav>
  {/if}

  <div class="actions">
    <button class="btn btn-ghost search-btn" onclick={onsearch} aria-label={t("top.search")}>
      <Search size={17} />
      {#if !phone}<span class="search-label">{t("top.searchPlaceholder")}</span><span class="kbd">/</span>{/if}
    </button>
    {#if record && !phone}
      <button class="btn" aria-pressed={ui.assistantOpen} onclick={() => (ui.assistantOpen ? (ui.assistantOpen = false) : openAssistant())}>
        <MessageSquare size={16} />
        <span>{t("nav.assistant")}</span>
      </button>
    {/if}
    <Menu label={t("top.caseMenu")} items={menuItems}>
      {#snippet button()}
        <span class="btn btn-ghost btn-icon" aria-hidden="true"><Ellipsis size={18} /></span>
      {/snippet}
    </Menu>
  </div>
</header>

<style>
  .topbar {
    position: sticky;
    top: 0;
    z-index: 15;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: var(--topbar-h);
    padding: 8px clamp(12px, 2.4vw, 28px);
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--line);
  }
  .topbar.phone {
    padding: 6px 8px;
    gap: 4px;
  }
  .crumbs {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    flex: 1;
    font-size: var(--text-sm);
  }
  .crumbs :global(.sep) {
    color: var(--muted);
  }
  .crumb {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    color: var(--muted);
    text-decoration: none;
    max-width: 34ch;
  }
  .crumb :global(svg) {
    flex-shrink: 0;
  }
  .crumb-text {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  a.crumb:hover {
    color: var(--ink-strong);
    text-decoration: underline;
  }
  .crumb.current {
    color: var(--ink-strong);
    font-weight: 600;
  }
  .phone-title {
    display: grid;
    min-width: 0;
    flex: 1;
    line-height: 1.25;
  }
  .phone-case {
    font-family: var(--font-title);
    font-size: 17px;
    color: var(--ink-strong);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .phone-ref {
    font-size: 11px;
    color: var(--muted);
  }
  .wordmark {
    font-family: var(--font-title);
    font-size: 26px;
    color: var(--ink-strong);
    text-decoration: none;
    padding-left: 8px;
  }
  .flex {
    flex: 1;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .search-btn {
    color: var(--muted);
    border: 1px solid var(--line-strong);
    background: var(--surface);
    min-width: var(--hit);
  }
  .phone .search-btn {
    border-color: transparent;
    background: transparent;
  }
  .search-label {
    font-weight: 400;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  @media (max-width: 1100px) {
    .search-label {
      display: none;
    }
  }
</style>
