<script lang="ts">
  import { Check, FileText, Link2, List, LoaderCircle, MessageSquare, RotateCcw, Search, Sparkles, Upload, Waypoints } from "@lucide/svelte";
  import EvidenceMap from "../components/EvidenceMap.svelte";
  import NodeDetail from "../components/NodeDetail.svelte";
  import RelationTag from "../components/RelationTag.svelte";
  import { fmtClock, fmtDate, l, t } from "../lib/i18n";
  import { go, href, route } from "../lib/router.svelte";
  import { findConnections, uploadDocument } from "../lib/services";
  import {
    connectionsOfCase,
    doc,
    docsOf,
    findingsCiting,
    hearing,
    inspect,
    openAssistant,
    passage,
    passagesOf,
    passagesOfCase,
    setConnectionReviewed,
    statement,
    toast,
    ui,
  } from "../lib/store.svelte";
  import type { InspectTarget, NodeRef } from "../lib/types";

  let { caseId }: { caseId: string } = $props();

  type View = "documents" | "map" | "connections";
  let view = $derived<View>((["documents", "map", "connections"] as const).find((v) => v === route.query.view) ?? "documents");
  let width = $state(0);
  let wide = $derived(width >= 1100);
  let query = $state("");
  let selected = $state<InspectTarget | null>(null);
  let showSuggested = $state(true);
  let finding = $state(false);
  let uploading = $state(false);

  let docs = $derived(docsOf(caseId));
  let links = $derived(connectionsOfCase(caseId));
  let suggested = $derived(links.filter((c) => !c.reviewed));
  let confirmed = $derived(links.filter((c) => c.reviewed));
  let results = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return passagesOfCase(caseId).filter((p) => p.text.toLowerCase().includes(q));
  });

  // Deep link from a finding: ?focus=<statement> selects that statement on the map.
  $effect(() => {
    const focus = route.query.focus;
    if (focus && statement(focus)) selected = { kind: "statement", id: focus };
  });

  function setView(v: View) {
    go(`/case/${caseId}/evidence?view=${v}`);
  }

  function select(target: InspectTarget) {
    if (wide) selected = target;
    else inspect(target);
  }

  async function runFind() {
    finding = true;
    const n = await findConnections(caseId);
    finding = false;
    toast(t("ev.foundLinks", { n }));
  }

  async function upload(name = "") {
    uploading = true;
    const id = await uploadDocument(caseId, name);
    uploading = false;
    toast(t("ev.uploaded"), { action: { label: t("common.open"), run: () => go(`/case/${caseId}/evidence/doc/${id}`) } });
  }

  function label(ref: NodeRef) {
    if (ref.kind === "statement") {
      const s = statement(ref.id);
      const h = hearing(s?.hearingId);
      return { text: s?.text ?? "", meta: s && h ? `${t("common.hearingN", { n: h.number })} · ${fmtClock(s.t)}` : "" };
    }
    const p = passage(ref.id);
    return { text: p?.text ?? "", meta: p ? `${doc(p.docId)?.title} · ${t("common.page", { n: p.page })}` : "" };
  }

  function mark(text: string) {
    const q = query.trim();
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    return i < 0 ? [text, "", ""] : [text.slice(0, i), text.slice(i, i + q.length), text.slice(i + q.length)];
  }
</script>

<div class="page evidence" bind:clientWidth={width}>
  <header class="page-head">
    <div>
      <h1>{t("ev.title")}</h1>
      <p>{t("ev.lead")}</p>
    </div>
    <div class="toolbar">
      <label class="btn">
        {#if uploading}<LoaderCircle size={16} class="spin" />{t("ev.processing")}{:else}<Upload size={16} />{t("ev.upload")}{/if}
        <input class="sr-only" type="file" multiple accept=".pdf,.docx,.txt,.md" onchange={(e) => upload((e.currentTarget as HTMLInputElement).files?.[0]?.name.replace(/\.[^.]+$/, "") ?? "")} />
      </label>
      <button class="btn" onclick={runFind} disabled={finding}>
        {#if finding}<LoaderCircle size={16} class="spin" />{t("ev.findingLinks")}{:else}<Sparkles size={16} />{t("ev.findLinks")}{/if}
      </button>
    </div>
  </header>

  <div class="searchbar">
    <div class="search grow">
      <Search size={16} />
      <label class="sr-only" for="ev-search">{t("ev.search")}</label>
      <input id="ev-search" class="field" type="search" placeholder={t("ev.search")} bind:value={query} />
    </div>
    <button class="btn" disabled={!query.trim()} onclick={() => openAssistant({ kind: "evidence" }, query, undefined, true)}><MessageSquare size={16} />{t("ev.askInstead")}</button>
  </div>

  {#if query.trim().length >= 2}
    <section class="results card" aria-live="polite">
      <h2 class="t-label">{results.length ? t("ev.results", { n: results.length }) : t("ev.noResults")}</h2>
      <ul>
        {#each results as p (p.id)}
          {@const m = mark(p.text)}
          <li>
            <button class="result" onclick={() => select({ kind: "passage", id: p.id })}>
              <span class="xsmall muted">{doc(p.docId)?.title} · {t("common.page", { n: p.page })}</span>
              <span class="small">{m[0]}<mark>{m[1]}</mark>{m[2]}</span>
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <div class="viewbar">
    <div class="seg" role="tablist" aria-label={t("ev.title")}>
      <button role="tab" aria-selected={view === "documents"} onclick={() => setView("documents")}><FileText size={15} />{t("ev.documents")} <span class="badge">{docs.length}</span></button>
      <button role="tab" aria-selected={view === "map"} onclick={() => setView("map")}><Waypoints size={15} />{t("ev.map")}</button>
      <button role="tab" aria-selected={view === "connections"} onclick={() => setView("connections")}><List size={15} />{t("ev.connections")} <span class="badge" class:badge-amber={suggested.length > 0}>{links.length}</span></button>
    </div>
    {#if view !== "documents"}
      <div class="legend small">
        <RelationTag relation="supports" /><RelationTag relation="conflicts" /><RelationTag relation="context" /><RelationTag relation="related" />
        <label class="toggle"><input type="checkbox" bind:checked={showSuggested} />{t("ev.showSuggested")}</label>
      </div>
    {/if}
  </div>

  {#if view === "documents"}
    {#if docs.length === 0}
      <section class="empty">
        <h2 class="t-serif">{t("ev.emptyTitle")}</h2>
        <p class="muted">{t("ev.emptyText")}</p>
      </section>
    {/if}
    <label class="drop">
      <Upload size={18} />
      <span><strong>{t("ev.drop")}</strong><span class="xsmall muted"> · {t("ev.formats")}</span></span>
      <input class="sr-only" type="file" multiple accept=".pdf,.docx,.txt,.md" onchange={() => upload()} />
    </label>
    <ul class="docs">
      {#each docs as d (d.id)}
        {@const ps = passagesOf(d.id)}
        {@const cited = ps.filter((p) => findingsCiting(p.id).length).length}
        <li>
          <a class="doc card" href={href(`/case/${caseId}/evidence/doc/${d.id}`)}>
            <span class="file">{d.file}</span>
            <span class="doc-body">
              <span class="doc-title">{d.title}</span>
              <span class="xsmall muted">{l(d.kind)}</span>
              <span class="doc-stats xsmall">
                <span>{t("ev.pages", { n: d.pages })}</span>
                <span>{t("ev.passages", { n: ps.length })}</span>
                {#if cited}<span class="cited">{t("ev.cited", { n: cited })}</span>{/if}
              </span>
            </span>
            <span class="xsmall muted added">{t("ev.added", { date: fmtDate(d.added) })} · {d.size}</span>
          </a>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="workspace" class:wide>
      <section class="pane main-pane">
        {#if view === "map"}
          {#if links.length === 0}
            <p class="empty small muted">{t("ev.noLinks")}</p>
          {:else}
            <p class="hint xsmall muted">{t("ev.mapHint")} {t("ev.legendNote")}</p>
            <EvidenceMap {caseId} {selected} {showSuggested} onselect={select} />
            {#if !wide}<p class="hint xsmall muted">{t("ev.scrollHint")}</p>{/if}
          {/if}
        {:else}
          {#each [{ title: t("ev.suggestedN", { n: suggested.length }), list: suggested }, { title: t("ev.confirmedN", { n: confirmed.length }), list: confirmed }] as group (group.title)}
            {#if group.list.length && (showSuggested || group.list === confirmed)}
              <h2 class="group">{group.title}</h2>
              <ul class="conns">
                {#each group.list as c (c.id)}
                  {@const a = label(c.from)}
                  {@const b = label(c.to)}
                  <li class="conn" class:selected={selected?.kind === "connection" && selected.id === c.id}>
                    <button class="conn-main" onclick={() => select({ kind: "connection", id: c.id })}>
                      <span class="conn-rel"><RelationTag relation={c.relation} reviewed={c.reviewed} /><span class="xsmall muted">{t(`ix.basis.${c.basis}`)}</span></span>
                      <span class="pair">
                        <span class="end"><span class="xsmall muted">{a.meta}</span><span class="clamp-2 small">{a.text}</span></span>
                        <Link2 size={14} class="joiner" />
                        <span class="end"><span class="xsmall muted">{b.meta}</span><span class="clamp-2 small">{b.text}</span></span>
                      </span>
                    </button>
                    {#if c.reviewed}
                      <button class="btn btn-sm" onclick={() => setConnectionReviewed(c, false)}><RotateCcw size={14} />{t("ix.reopen")}</button>
                    {:else}
                      <button class="btn btn-sm btn-primary" onclick={() => setConnectionReviewed(c, true)}><Check size={14} />{t("ix.confirm")}</button>
                    {/if}
                  </li>
                {/each}
              </ul>
            {/if}
          {/each}
        {/if}
      </section>
      {#if wide}
        <section class="pane side scroll-y" aria-label={t("ix.connection")}>
          {#if selected && selected.kind !== "finding"}
            {#key selected}
              <NodeDetail target={selected} />
            {/key}
          {:else}
            <p class="empty small muted">{t("ev.inspectorEmpty")}</p>
          {/if}
        </section>
      {/if}
    </div>
  {/if}
</div>

<style>
  .evidence {
    max-width: 1500px;
  }
  .toolbar :global(.spin) {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .searchbar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
  }
  .grow {
    flex: 1 1 260px;
  }
  .results {
    padding: 12px;
    margin-bottom: 14px;
    display: grid;
    gap: 8px;
  }
  .results ul {
    display: grid;
    gap: 2px;
    max-height: 280px;
    overflow-y: auto;
  }
  .result {
    display: grid;
    gap: 2px;
    width: 100%;
    padding: 8px;
    border-radius: var(--radius-control);
    text-align: left;
  }
  .result:hover {
    background: var(--sunken);
  }
  .viewbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 12px;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 14px;
  }
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .toggle input {
    accent-color: var(--primary);
  }
  .drop {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    margin-bottom: 14px;
    border: 1.5px dashed var(--line-strong);
    border-radius: var(--radius-action);
    background: var(--surface-2);
    cursor: pointer;
  }
  .drop:hover,
  .drop:focus-within {
    border-color: var(--ink-strong);
  }
  .docs {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
  }
  .doc {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 4px 12px;
    padding: 14px;
    text-decoration: none;
    height: 100%;
  }
  .doc:hover {
    border-color: var(--line-strong);
    background: var(--surface-2);
  }
  .file {
    grid-row: span 2;
    display: grid;
    place-items: center;
    width: 40px;
    height: 48px;
    border-radius: 4px;
    border: 1px solid var(--line-strong);
    background: var(--surface-2);
    font-size: 10px;
    font-weight: 700;
    color: var(--muted);
  }
  .doc-body {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .doc-title {
    font-weight: 600;
    color: var(--ink-strong);
    line-height: 1.35;
  }
  .doc-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    margin-top: 4px;
  }
  .cited {
    color: var(--st-inconsistency-ink);
    font-weight: 600;
  }
  .added {
    grid-column: 2;
  }
  .workspace {
    display: grid;
    gap: 14px;
  }
  .workspace.wide {
    grid-template-columns: minmax(0, 1fr) minmax(340px, 420px);
    align-items: start;
  }
  .main-pane {
    padding: 12px;
  }
  .side {
    position: sticky;
    top: calc(var(--topbar-h) + 12px);
    max-height: calc(100dvh - var(--topbar-h) - 24px);
  }
  .hint {
    padding: 2px 4px 10px;
  }
  .group {
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
    padding: 10px 4px 6px;
  }
  .conns {
    display: grid;
    gap: 6px;
    margin-bottom: 8px;
  }
  .conn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 8px 6px 6px;
    border: 1px solid var(--line);
    border-radius: var(--radius-control);
  }
  .conn.selected {
    border-color: var(--ink-strong);
    background: var(--selected);
  }
  .conn-main {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 6px;
    padding: 6px;
    text-align: left;
    border-radius: var(--radius-control);
  }
  .conn-rel {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .pair {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    gap: 10px;
    align-items: center;
  }
  .pair :global(.joiner) {
    color: var(--muted);
  }
  .end {
    display: grid;
    gap: 2px;
  }
  @container main (max-width: 640px) {
    .pair {
      grid-template-columns: 1fr;
    }
    .pair :global(.joiner) {
      display: none;
    }
    .conn {
      flex-direction: column;
      align-items: stretch;
    }
  }
  .empty {
    padding: 18px 8px;
    display: grid;
    gap: 6px;
  }
  .empty h2 {
    font-size: 24px;
  }
</style>
