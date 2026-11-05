<script lang="ts">
  import KindIcon from "../components/KindIcon.svelte";
  import { ChevronLeft, Download, MessageSquare } from "@lucide/svelte";
  import { tick } from "svelte";
  import PdfViewer from "../components/PdfViewer.svelte";
  import FindingLink from "../components/FindingLink.svelte";
  import { fmtDate, l, t } from "../lib/i18n";
  import { href, route } from "../lib/router.svelte";
  import { connectionsFor, doc, findingsCiting, inspect, openAssistant, passagesOf, toastT } from "../lib/store.svelte";

  let { caseId, docId }: { caseId: string; docId: string } = $props();

  let d = $derived(doc(docId));
  let passages = $derived(passagesOf(docId));
  let pages = $derived(Array.from({ length: d?.pages ?? 0 }, (_, i) => i + 1));
  let focus = $derived(route.query.p ?? null);
  let reader: HTMLElement | undefined = $state();
  // The original is the record; the extracted text reflows for small screens.
  let mode = $state<"pdf" | "text">("pdf");

  $effect(() => {
    const id = focus;
    if (!id) return;
    tick().then(() => reader?.querySelector(`[data-pid="${id}"]`)?.scrollIntoView({ block: "center" }));
  });

  function jump(page: number) {
    reader?.querySelector(`[data-page="${page}"]`)?.scrollIntoView({ block: "start", behavior: "smooth" });
  }
</script>

{#if d}
  <div class="page reader-page">
    <a class="back" href={href(`/case/${caseId}/evidence`)}><ChevronLeft size={16} />{t("ev.allDocuments")}</a>
    <header class="page-head">
      <div>
        <h1 class="doc-title"><span class="doc-icon"><KindIcon kind="document" size={24} /></span>{d.title}</h1>
        <p>{l(d.kind)} · {t("ev.pages", { n: d.pages })} · {d.file} · {d.size} · {t("ev.added", { date: fmtDate(d.added) })}</p>
      </div>
      <div class="toolbar">
        {#if d.pdf}
          <div class="seg" role="tablist" aria-label={t("pdf.viewLabel")}>
            <button role="tab" aria-selected={mode === "pdf"} onclick={() => (mode = "pdf")}>{t("pdf.original")}</button>
            <button role="tab" aria-selected={mode === "text"} onclick={() => (mode = "text")}>{t("pdf.text")}</button>
          </div>
        {/if}
        <button class="btn" onclick={() => openAssistant({ kind: "evidence" }, undefined, [{ kind: "document", id: d.id }])}><MessageSquare size={16} />{t("fx.ask")}</button>
        <button class="btn" onclick={() => toastT("toast.download")}><Download size={16} />{t("ev.download")}</button>
      </div>
    </header>

    {#if d.pdf && mode === "pdf"}
      {#key d.id}<PdfViewer {caseId} {d} focus={focus} />{/key}
    {:else}
    <p class="notice small text-only">{d.pdf ? t("pdf.extracted") : t("pdf.textOnly")}</p>
    <div class="layout">
      <nav class="index" aria-label={t("ev.reader")}>
        {#each pages as page (page)}
          {@const n = passages.filter((p) => p.page === page)}
          {@const cited = n.some((p) => findingsCiting(p.id).length)}
          <button class="index-item" onclick={() => jump(page)}>
            <span>{t("ev.pageN", { n: page })}</span>
            {#if cited}<span class="pip" title={t("ix.citedBy")}></span>{/if}
          </button>
        {/each}
      </nav>
      <div class="sheets" bind:this={reader}>
        {#each pages as page (page)}
          {@const here = passages.filter((p) => p.page === page)}
          <article class="sheet" data-page={page} aria-label={t("ev.pageN", { n: page })}>
            <header class="sheet-head"><span>{d.title}</span><span class="tabular">{t("ev.pageN", { n: page })} / {d.pages}</span></header>
            {#if here.length === 0}
              <div class="filler" aria-hidden="true">
                {#each [92, 86, 95, 70, 88, 64] as w, i (i)}<span style:width="{w}%"></span>{/each}
              </div>
            {/if}
            {#each here as p (p.id)}
              {@const cites = findingsCiting(p.id)}
              {@const links = connectionsFor({ kind: "passage", id: p.id })}
              <div class="passage" class:cited={cites.length > 0} class:focus={focus === p.id} data-pid={p.id}>
                <button class="passage-text" onclick={() => inspect({ kind: "passage", id: p.id })}>
                  {#if cites.length}<mark>{p.text}</mark>{:else}{p.text}{/if}
                </button>
                {#if cites.length || links.length}
                  <div class="refs">
                    {#each cites as f (f.id)}<FindingLink {f} variant="pill" />{/each}
                    {#if links.length}<a class="xsmall muted" href={href(`/case/${caseId}/connections?of=passage:${p.id}`)}>{t("ix.connections")}: {links.length}</a>{/if}
                  </div>
                {/if}
              </div>
            {/each}
          </article>
        {/each}
      </div>
    </div>
    {/if}
  </div>
{/if}

<style>
  .text-only {
    margin: 0 0 12px;
  }
  .back {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    font-weight: 500;
    color: var(--muted);
    text-decoration: none;
    margin-bottom: 10px;
  }
  .back:hover {
    color: var(--ink-strong);
  }
  .layout {
    display: grid;
    grid-template-columns: 180px minmax(0, 1fr);
    gap: 20px;
    align-items: start;
  }
  @container main (max-width: 760px) {
    .layout {
      grid-template-columns: 1fr;
    }
    .index {
      position: static !important;
      display: flex !important;
      overflow-x: auto;
      gap: 6px;
    }
    .index-item {
      flex: 0 0 auto;
      border: 1px solid var(--line);
    }
  }
  .index {
    position: sticky;
    top: calc(var(--topbar-h) + 16px);
    display: grid;
    gap: 2px;
  }
  .index-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: var(--hit);
    padding: 0 10px;
    border-radius: var(--radius-control);
    font-size: 13px;
    color: var(--ink);
  }
  .index-item:hover {
    background: var(--sunken);
  }
  .pip {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--st-inconsistency-dot);
  }
  .sheets {
    display: grid;
    gap: 18px;
    max-width: 760px;
  }
  .sheet {
    display: grid;
    gap: 14px;
    padding: clamp(18px, 4cqi, 40px);
    background: #fffdf6;
    color: #1f2a22;
    border: 1px solid var(--line);
    border-radius: 3px;
    box-shadow: 0 6px 18px rgb(40 53 32 / 0.06);
    min-height: 260px;
    scroll-margin-top: calc(var(--topbar-h) + 16px);
  }
  :global([data-theme="night"]) .sheet {
    background: #1a2620;
    color: var(--ink);
  }
  .sheet-head {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
    padding-bottom: 10px;
    border-bottom: 1px solid var(--line);
  }
  .filler {
    display: grid;
    gap: 10px;
  }
  .filler span {
    height: 8px;
    border-radius: 4px;
    background: color-mix(in srgb, var(--muted) 14%, transparent);
  }
  .passage {
    display: grid;
    gap: 6px;
    padding: 6px 8px;
    margin: 0 -8px;
    border-radius: 4px;
    scroll-margin-top: 120px;
  }
  .passage.focus {
    box-shadow: 0 0 0 2px var(--focus);
  }
  .passage-text {
    text-align: left;
    font-family: var(--font-doc);
    font-size: 14.5px;
    line-height: 1.75;
    color: inherit;
  }
  .passage-text:hover {
    text-decoration: underline;
    text-decoration-color: var(--line-strong);
  }
  .refs {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .doc-title {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .doc-icon {
    display: grid;
    flex-shrink: 0;
    color: var(--muted);
  }
</style>
