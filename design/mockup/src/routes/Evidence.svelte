<script lang="ts">
  import KindIcon from "../components/KindIcon.svelte";
  import { LoaderCircle, MessageSquare, Search, Upload } from "@lucide/svelte";
  import { fmtDate, l, t } from "../lib/i18n";
  import { go, href, redirect, route } from "../lib/router.svelte";
  import { uploadDocument } from "../lib/services";
  import { doc, docsOf, findingsCiting, findingsPath, inspect, openAssistant, passagesOf, passagesOfCase, toast } from "../lib/store.svelte";

  let { caseId }: { caseId: string } = $props();

  // Bukti holds the case files only. Older links to its Connections, map or board views land on
  // the Keterkaitan page, which now stands on its own.
  $effect(() => {
    if (!["connections", "map", "board"].includes(route.query.view ?? "")) return;
    const of = route.query.of ?? route.query.start;
    redirect(`/case/${caseId}/connections${of ? `?of=${of}` : ""}`);
  });
  let query = $state("");
  let uploading = $state(false);

  let docs = $derived(docsOf(caseId));
  let results = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return passagesOfCase(caseId).filter((p) => p.text.toLowerCase().includes(q));
  });

  async function upload(name = "") {
    uploading = true;
    const id = await uploadDocument(caseId, name);
    uploading = false;
    toast(t("ev.uploaded"), { action: { label: t("common.open"), run: () => go(`/case/${caseId}/evidence/doc/${id}`) } });
  }

  function mark(text: string) {
    const q = query.trim();
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    return i < 0 ? [text, "", ""] : [text.slice(0, i), text.slice(i, i + q.length), text.slice(i + q.length)];
  }
</script>

<div class="page evidence">
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
    </div>
  </header>

  <div class="viewbar">
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
              <button class="result" onclick={() => inspect({ kind: "passage", id: p.id })}>
                <span class="xsmall muted">{doc(p.docId)?.title} · {t("common.page", { n: p.page })}</span>
                <span class="small doc-text">{m[0]}<mark>{m[1]}</mark>{m[2]}</span>
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
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
        <li class="doc card">
          <span class="file"><KindIcon kind="document" size={20} /><span class="fmt">{d.file}</span></span>
          <span class="doc-body">
            <a class="doc-title" href={href(`/case/${caseId}/evidence/doc/${d.id}`)}>{d.title}</a>
            <span class="xsmall muted">{l(d.kind)}</span>
            <span class="doc-stats xsmall">
              <span>{t("ev.pages", { n: d.pages })}</span>
              <span>{t("ev.passages", { n: ps.length })}</span>
              {#if cited}<a class="cited" href={href(findingsPath(caseId, { doc: d.id }))} title={t("fl.open")}>{t("ev.cited", { n: cited })}</a>{/if}
            </span>
          </span>
          <span class="xsmall muted added">{t("ev.added", { date: fmtDate(d.added) })} · {d.size}</span>
        </li>
      {/each}
    </ul>
</div>

<style>
  .evidence {
    max-width: 1560px;
  }
  .toolbar :global(.spin) {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .viewbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }
  .grow {
    flex: 1 1 240px;
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
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 4px 12px;
    padding: 14px;
    height: 100%;
  }
  .doc:hover {
    border-color: var(--line-strong);
    background: var(--surface-2);
  }
  /* The title's link covers the whole card; the cited count sits above it as its own link. */
  .doc-title::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
  }
  .file {
    grid-row: span 2;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 2px;
    width: 40px;
    height: 48px;
    border-radius: 4px;
    border: 1px solid var(--line-strong);
    background: var(--surface-2);
    color: var(--ink);
  }
  .fmt {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.03em;
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
    text-decoration: none;
  }
  .doc-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    margin-top: 4px;
  }
  .cited {
    position: relative;
    z-index: 1;
    color: var(--st-inconsistency-ink);
    font-weight: 600;
    text-decoration: underline;
    text-decoration-color: color-mix(in srgb, currentColor 40%, transparent);
    text-underline-offset: 3px;
  }
  .cited:hover {
    text-decoration-color: currentColor;
  }
  .added {
    grid-column: 2;
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
